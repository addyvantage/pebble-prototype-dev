import type { PlacementLanguage } from '../data/onboardingData'

export type CurriculumTestCase = {
  input: string
  expected: string
}

export type CurriculumUnit = {
  id: string
  title: string
  concept: string
  prompt: string
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

  return {
    id,
    title,
    concept,
    prompt,
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
