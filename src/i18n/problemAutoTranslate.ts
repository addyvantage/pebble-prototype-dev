import type { ProblemDefinition } from '../data/problemsBank'
import type { LanguageCode } from './languages'
import { getProblemPhraseDict } from './problemPhraseDict'

const MASK_PREFIX = '__PEBBLE_MASK_'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function makeMaskToken(index: number) {
  return `${MASK_PREFIX}${index}__`
}

function applyMask(input: string, expression: RegExp, masks: string[]) {
  return input.replace(expression, (segment) => {
    const index = masks.length
    masks.push(segment)
    return makeMaskToken(index)
  })
}

function protectCodeAndIdentifierSegments(text: string) {
  const masks: string[] = []

  let next = text
  next = applyMask(next, /```[\s\S]*?```/g, masks)
  next = applyMask(next, /`[^`\n]+`/g, masks)
  next = applyMask(next, /\b[A-Z][a-z]+(?:[A-Z][A-Za-z0-9]+)+\b/g, masks)
  next = applyMask(next, /\b[A-Za-z_][A-Za-z0-9_]*\s*\([^\)\n]*\)/g, masks)
  next = applyMask(next, /\b[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+\b/g, masks)

  return {
    text: next,
    masks,
  }
}

function restoreMaskedSegments(text: string, masks: string[]) {
  return text.replace(new RegExp(`${MASK_PREFIX}(\\d+)__`, 'g'), (_, index) => {
    const position = Number(index)
    return masks[position] ?? ''
  })
}

function hasWordBoundary(whole: string, start: number, end: number) {
  const before = whole[start - 1] ?? ''
  const after = whole[end] ?? ''
  if (/[A-Za-z0-9_]/.test(before)) {
    return false
  }
  if (/[A-Za-z0-9_]/.test(after)) {
    return false
  }
  return true
}

function replaceWithBoundaries(text: string, source: string, target: string) {
  if (!source) {
    return text
  }

  const expression = new RegExp(escapeRegExp(source), 'gi')
  return text.replace(expression, (match, offset: number, whole: string) => {
    const start = offset
    const end = start + match.length
    if (!hasWordBoundary(whole, start, end)) {
      return match
    }
    return target
  })
}

export function translateProse(text: string, lang: LanguageCode): string {
  if (!text || lang === 'en') {
    return text
  }

  const dictionary = getProblemPhraseDict(lang)
  if (dictionary.length === 0) {
    return text
  }

  const { text: maskedText, masks } = protectCodeAndIdentifierSegments(text)
  let translated = maskedText

  for (const [source, target] of dictionary) {
    translated = replaceWithBoundaries(translated, source, target)
  }

  return restoreMaskedSegments(translated, masks)
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
    return translateProse(item, lang)
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
    summary: translateProse(statement.summary, lang),
    description: translateProse(statement.description, lang),
    input: translateProse(statement.input, lang),
    output: translateProse(statement.output, lang),
    constraints: translateConstraints(statement.constraints, lang),
    schemaText: statement.schemaText ? translateProse(statement.schemaText, lang) : statement.schemaText,
  }
}
