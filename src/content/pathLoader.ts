import type { PlacementLanguage } from '../data/onboardingData'
import type { LanguageCode } from '../i18n/languages'

export type CurriculumTestCase = {
  input: string
  expected: string
}

export type CurriculumUnit = {
  id: string
  title: string
  concept: string
  prompt: string
  title_i18n?: Partial<Record<LanguageCode | 'en', string>>
  statement_i18n?: Partial<Record<LanguageCode | 'en', string>>
  localized?: Partial<Record<LanguageCode | 'en', {
    title?: string
    concept?: string
    prompt?: string
    description?: string
  }>>
  starterCode: string
  tests: CurriculumTestCase[]
  hints: string[]
}

type CurriculumPath = {
  units: CurriculumUnit[]
}

const pathUrls: Record<PlacementLanguage, string> = {
  python: new URL('./paths/python.json', import.meta.url).href,
  javascript: new URL('./paths/javascript.json', import.meta.url).href,
  cpp: new URL('./paths/cpp.json', import.meta.url).href,
  java: new URL('./paths/java.json', import.meta.url).href,
  c: new URL('./paths/c.json', import.meta.url).href,
}

const pathCache = new Map<PlacementLanguage, CurriculumUnit[]>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeUnit(value: unknown): CurriculumUnit | null {
  if (!isRecord(value)) {
    return null
  }

  const id = value.id
  const title = value.title
  const concept = value.concept
  const prompt = value.prompt
  const starterCode = value.starterCode
  const tests = value.tests
  const hints = value.hints
  const localized = value.localized
  const titleI18n = value.title_i18n
  const statementI18n = value.statement_i18n

  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    typeof concept !== 'string' ||
    typeof prompt !== 'string' ||
    typeof starterCode !== 'string'
  ) {
    return null
  }

  if (!Array.isArray(tests) || !Array.isArray(hints)) {
    return null
  }

  const normalizedTests = tests
    .map((test) => {
      if (!isRecord(test) || typeof test.input !== 'string' || typeof test.expected !== 'string') {
        return null
      }
      return { input: test.input, expected: test.expected }
    })
    .filter((test): test is CurriculumTestCase => test !== null)

  const normalizedHints = hints.filter((hint): hint is string => typeof hint === 'string')

  let normalizedLocalized: CurriculumUnit['localized'] = undefined
  if (isRecord(localized)) {
    const nextLocalized: NonNullable<CurriculumUnit['localized']> = {}
    for (const [key, item] of Object.entries(localized)) {
      if (!isRecord(item)) {
        continue
      }
      const titleValue = typeof item.title === 'string' ? item.title : undefined
      const conceptValue = typeof item.concept === 'string' ? item.concept : undefined
      const promptValue = typeof item.prompt === 'string' ? item.prompt : undefined
      const descriptionValue = typeof item.description === 'string' ? item.description : undefined

      if (!titleValue && !conceptValue && !promptValue && !descriptionValue) {
        continue
      }

      nextLocalized[key as LanguageCode | 'en'] = {
        title: titleValue,
        concept: conceptValue,
        prompt: promptValue,
        description: descriptionValue,
      }
    }
    if (Object.keys(nextLocalized).length > 0) {
      normalizedLocalized = nextLocalized
    }
  }

  const normalizedTitleI18n: CurriculumUnit['title_i18n'] = isRecord(titleI18n)
    ? Object.fromEntries(
        Object.entries(titleI18n)
          .filter(([, translated]) => typeof translated === 'string')
          .map(([language, translated]) => [language, translated as string]),
      )
    : undefined

  const normalizedStatementI18n: CurriculumUnit['statement_i18n'] = isRecord(statementI18n)
    ? Object.fromEntries(
        Object.entries(statementI18n)
          .filter(([, translated]) => typeof translated === 'string')
          .map(([language, translated]) => [language, translated as string]),
      )
    : undefined

  return {
    id,
    title,
    concept,
    prompt,
    title_i18n:
      normalizedTitleI18n && Object.keys(normalizedTitleI18n).length > 0
        ? normalizedTitleI18n
        : undefined,
    statement_i18n:
      normalizedStatementI18n && Object.keys(normalizedStatementI18n).length > 0
        ? normalizedStatementI18n
        : undefined,
    localized: normalizedLocalized,
    starterCode,
    tests: normalizedTests,
    hints: normalizedHints,
  }
}

export async function loadCurriculumPath(language: PlacementLanguage): Promise<CurriculumUnit[]> {
  const cached = pathCache.get(language)
  if (cached) {
    return cached
  }

  const response = await fetch(pathUrls[language])
  if (!response.ok) {
    throw new Error(`Failed to load curriculum path for ${language}. HTTP ${response.status}.`)
  }

  const payload = (await response.json()) as unknown
  if (!isRecord(payload) || !Array.isArray(payload.units)) {
    throw new Error(`Invalid curriculum payload for ${language}.`)
  }

  const units = payload.units
    .map(normalizeUnit)
    .filter((unit): unit is CurriculumUnit => unit !== null)

  if (units.length === 0) {
    throw new Error(`No valid units found for ${language}.`)
  }

  pathCache.set(language, units)
  return units
}

export type { CurriculumPath }
