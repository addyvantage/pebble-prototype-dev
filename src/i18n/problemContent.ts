import {
  getProblemStarterCode,
  type ProblemDefinition,
  type ProblemExample,
} from '../data/problemsBank'
import type { LanguageCode } from './languages'
import { translateProse, translateStatementBlock } from './problemAutoTranslate'
import { localizeTopicLabels } from './topicCatalog'
import enRaw from './problemCopy/en.json'
import hiRaw from './problemCopy/hi.json'
import urRaw from './problemCopy/ur.json'
import bnRaw from './problemCopy/bn.json'
import teRaw from './problemCopy/te.json'
import mrRaw from './problemCopy/mr.json'
import taRaw from './problemCopy/ta.json'
import guRaw from './problemCopy/gu.json'
import knRaw from './problemCopy/kn.json'
import mlRaw from './problemCopy/ml.json'
import orRaw from './problemCopy/or.json'
import paRaw from './problemCopy/pa.json'
import asRaw from './problemCopy/as.json'

type LocalizedProblemText = {
  title?: string
  topics?: string[]
  keySkills?: string[]
  starterCodeComment?: string
  statement?: {
    summary?: string
    description?: string
    input?: string
    output?: string
    constraints?: string[]
    examples?: Array<Partial<ProblemExample>>
    schemaText?: string
  }
}

type ProblemCopyDictionary = Record<string, LocalizedProblemText>

const enCopy = enRaw as ProblemCopyDictionary
const hiCopy = hiRaw as ProblemCopyDictionary
const urCopy = urRaw as ProblemCopyDictionary
const bnCopy = bnRaw as ProblemCopyDictionary
const teCopy = teRaw as ProblemCopyDictionary
const mrCopy = mrRaw as ProblemCopyDictionary
const taCopy = taRaw as ProblemCopyDictionary
const guCopy = guRaw as ProblemCopyDictionary
const knCopy = knRaw as ProblemCopyDictionary
const mlCopy = mlRaw as ProblemCopyDictionary
const orCopy = orRaw as ProblemCopyDictionary
const paCopy = paRaw as ProblemCopyDictionary
const asCopy = asRaw as ProblemCopyDictionary

const PROBLEM_COPY_BY_LANG: Record<LanguageCode, ProblemCopyDictionary> = {
  en: enCopy,
  hi: hiCopy,
  bn: bnCopy,
  te: teCopy,
  mr: mrCopy,
  ta: taCopy,
  ur: urCopy,
  gu: guCopy,
  kn: knCopy,
  ml: mlCopy,
  or: orCopy,
  pa: paCopy,
  as: asCopy,
}

function hasNonLatinCharacters(value: string) {
  return /[^\u0000-\u024f]/.test(value)
}

function looksLikeIdentifierSnippet(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    return true
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*\([^\)\n]*\)$/.test(trimmed)) {
    return true
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(trimmed)) {
    return true
  }
  return false
}

function shouldTranslateField(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  if (hasNonLatinCharacters(trimmed)) {
    return false
  }
  if (looksLikeIdentifierSnippet(trimmed)) {
    return false
  }
  if (!/\s/.test(trimmed)) {
    return false
  }
  const letters = (trimmed.match(/[A-Za-z]/g) ?? []).length
  return letters >= 4
}

function localizeStringList(
  fallbackValues: string[],
  englishValues?: string[],
  localizedValues?: string[],
): string[] {
  const withEnglish = englishValues && englishValues.length > 0
    ? fallbackValues.map((value, index) => englishValues[index] ?? value)
    : fallbackValues

  if (!localizedValues || localizedValues.length === 0) {
    return withEnglish
  }

  return withEnglish.map((value, index) => localizedValues[index] ?? value)
}

function localizeExamples(
  fallbackExamples: ProblemExample[],
  englishExamples?: Array<Partial<ProblemExample>>,
  localizedExamples?: Array<Partial<ProblemExample>>,
): ProblemExample[] {
  const withEnglish = (!englishExamples || englishExamples.length === 0)
    ? fallbackExamples
    : fallbackExamples.map((example, index) => {
      const english = englishExamples[index]
      if (!english) {
        return example
      }
      return {
        input: english.input ?? example.input,
        output: english.output ?? example.output,
        explanation: english.explanation ?? example.explanation,
      }
    })

  if (!localizedExamples || localizedExamples.length === 0) {
    return withEnglish
  }

  return withEnglish.map((example, index) => {
    const localized = localizedExamples[index]
    if (!localized) {
      return example
    }
    return {
      input: localized.input ?? example.input,
      output: localized.output ?? example.output,
      explanation: localized.explanation ?? example.explanation,
    }
  })
}

function replaceSqlStarterComment(starterCode: string, commentText: string) {
  const safeComment = commentText.trim()
  if (!safeComment) {
    return starterCode
  }

  const nextFirstLine = `-- ${safeComment}`
  const firstLineBreak = starterCode.indexOf('\n')
  if (firstLineBreak === -1) {
    return nextFirstLine
  }

  const firstLine = starterCode.slice(0, firstLineBreak)
  if (firstLine.trimStart().startsWith('--')) {
    return `${nextFirstLine}${starterCode.slice(firstLineBreak)}`
  }

  return `${nextFirstLine}\n${starterCode}`
}

function applyAutoTranslation(problem: ProblemDefinition, lang: LanguageCode): ProblemDefinition {
  if (lang === 'en') {
    return problem
  }

  const statement = translateStatementBlock(problem.statement, lang)
  const translatedExamples = statement.examples.map((example) => ({
    ...example,
    explanation: example.explanation && shouldTranslateField(example.explanation)
      ? translateProse(example.explanation, lang)
      : example.explanation,
  }))

  return {
    ...problem,
    title: shouldTranslateField(problem.title) ? translateProse(problem.title, lang) : problem.title,
    topics: localizeTopicLabels(problem.topics, lang),
    keySkills: problem.keySkills.map((skill) => translateProse(skill, lang)),
    statement: {
      ...statement,
      examples: translatedExamples,
    },
  }
}

export function getLocalizedProblem(problem: ProblemDefinition, lang: LanguageCode): ProblemDefinition {
  const localized = PROBLEM_COPY_BY_LANG[lang]?.[problem.id]
  const englishOverride = enCopy[problem.id]
  if (!localized && !englishOverride) {
    return applyAutoTranslation(problem, lang)
  }

  const englishStatement = englishOverride?.statement
  const localizedStatement = localized?.statement
  const merged: ProblemDefinition = {
    ...problem,
    title: localized?.title ?? englishOverride?.title ?? problem.title,
    topics: localized?.topics ?? englishOverride?.topics ?? problem.topics,
    keySkills: localized?.keySkills ?? englishOverride?.keySkills ?? problem.keySkills,
    statement: {
      ...problem.statement,
      summary: localizedStatement?.summary ?? englishStatement?.summary ?? problem.statement.summary,
      description: localizedStatement?.description ?? englishStatement?.description ?? problem.statement.description,
      input: localizedStatement?.input ?? englishStatement?.input ?? problem.statement.input,
      output: localizedStatement?.output ?? englishStatement?.output ?? problem.statement.output,
      constraints: localizeStringList(
        problem.statement.constraints,
        englishStatement?.constraints,
        localizedStatement?.constraints,
      ),
      examples: localizeExamples(
        problem.statement.examples,
        englishStatement?.examples,
        localizedStatement?.examples,
      ),
      schemaText: localizedStatement?.schemaText ?? englishStatement?.schemaText ?? problem.statement.schemaText,
    },
  }
  return applyAutoTranslation(merged, lang)
}

export function getLocalizedStarter(problem: ProblemDefinition, lang: LanguageCode): string | null {
  if (problem.kind !== 'sql') {
    return null
  }

  const localizedComment = PROBLEM_COPY_BY_LANG[lang]?.[problem.id]?.starterCodeComment
    ?? enCopy[problem.id]?.starterCodeComment
  if (!localizedComment) {
    return null
  }

  const baseStarter = getProblemStarterCode(problem, 'sql')
  return replaceSqlStarterComment(baseStarter, localizedComment)
}

export function applySqlStarterComment(starterCode: string, commentText: string): string {
  return replaceSqlStarterComment(starterCode, commentText)
}
