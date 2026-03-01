import type { ProblemDefinition } from '../data/problemsBank'
import type { LanguageCode } from './languages'
import {
  applyPhraseDictionary,
  detectLatinWords,
  isMixedScriptLeakage,
  protectTokens,
  restoreTokens,
  splitIntoSentences,
  type PhraseEntry,
} from './noMixText'
import { getBoilerplateDict } from './problemBoilerplate'
import { getProblemPhraseDict } from './problemPhraseDict'
import { getTopicPhraseEntries } from './topicCatalog'

function mergeDictionaries(lang: LanguageCode) {
  const merged: PhraseEntry[] = [
    ...getBoilerplateDict(lang),
    ...getProblemPhraseDict(lang),
    ...getTopicPhraseEntries(lang),
  ]

  const seen = new Set<string>()
  const deduped: PhraseEntry[] = []
  for (const [source, target] of merged) {
    const key = `${source.toLowerCase()}::${target}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push([source, target])
  }

  return deduped.sort((left, right) => right[0].length - left[0].length)
}

function translateSentenceInternal(text: string, lang: LanguageCode, dictionary: readonly PhraseEntry[]) {
  if (!text.trim() || lang === 'en') {
    return text
  }

  const original = text
  const rawDictionary = dictionary.filter(([source]) => source.length >= 24 && source.includes(' '))
  let translated = applyPhraseDictionary(original, rawDictionary)
  const { protectedText, map } = protectTokens(translated)

  translated = applyPhraseDictionary(protectedText, dictionary)
  translated = applyPhraseDictionary(translated, dictionary)

  if (detectLatinWords(translated, { skipTokenProtection: true })) {
    return original
  }

  const restored = restoreTokens(translated, map)
  if (isMixedScriptLeakage(restored)) {
    return original
  }

  return restored
}

export function translateSentence(text: string, lang: LanguageCode): string {
  if (lang === 'en') {
    return text
  }
  const dictionary = mergeDictionaries(lang)
  return translateSentenceInternal(text, lang, dictionary)
}

export function translateParagraph(text: string, lang: LanguageCode): string {
  if (!text || lang === 'en') {
    return text
  }

  const dictionary = mergeDictionaries(lang)
  const segments = splitIntoSentences(text)
  const joined = segments
    .map((segment) => {
      if (!segment.trim()) {
        return segment
      }
      return translateSentenceInternal(segment, lang, dictionary)
    })
    .join('')

  if (isMixedScriptLeakage(joined)) {
    return text
  }

  return joined
}

export function translateProse(text: string, lang: LanguageCode): string {
  return translateParagraph(text, lang)
}

function looksMathyConstraint(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  if (/[<>]=?|==|!=|\^/.test(trimmed) && /\d/.test(trimmed)) {
    return true
  }

  return false
}

export function translateConstraints(items: string[], lang: LanguageCode): string[] {
  if (items.length === 0 || lang === 'en') {
    return items
  }

  return items.map((item) => {
    if (looksMathyConstraint(item)) {
      return item
    }
    return translateSentence(item, lang)
  })
}

export function translateStatementBlock(
  statement: ProblemDefinition['statement'],
  lang: LanguageCode,
): ProblemDefinition['statement'] {
  if (lang === 'en') {
    return statement
  }

  return {
    ...statement,
    summary: translateParagraph(statement.summary, lang),
    description: translateParagraph(statement.description, lang),
    input: translateParagraph(statement.input, lang),
    output: translateParagraph(statement.output, lang),
    constraints: translateConstraints(statement.constraints, lang),
    schemaText: statement.schemaText ? translateParagraph(statement.schemaText, lang) : statement.schemaText,
  }
}
