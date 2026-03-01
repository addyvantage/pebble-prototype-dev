import { safeGetJSON, safeSetJSON } from './safeStorage'
import { DEFAULT_LANGUAGE, isPebbleLanguageId, type PebbleLanguageId } from './languages'

export const DEFAULT_LANGUAGE_STORAGE_KEY = 'pebble.defaultLanguage.v1'
export const PROBLEM_CODE_BY_LANG_STORAGE_KEY = 'pebble.problemCodeByLang.v1'

export type ProblemCodeByLangEntry = {
  selectedLanguage: PebbleLanguageId
  codeByLanguage: Partial<Record<PebbleLanguageId, string>>
  updatedAt: number
}

export type ProblemCodeByLang = Record<string, ProblemCodeByLangEntry>

export function loadProblemCodeByLang(): ProblemCodeByLang {
  const raw = safeGetJSON<Record<string, unknown>>(PROBLEM_CODE_BY_LANG_STORAGE_KEY, {})
  const next: ProblemCodeByLang = {}

  for (const [problemId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const selectedLanguageRaw = (entry as { selectedLanguage?: unknown }).selectedLanguage
    const selectedLanguageStr = typeof selectedLanguageRaw === 'string' ? selectedLanguageRaw : null
    const selectedLanguage = isPebbleLanguageId(selectedLanguageStr) ? selectedLanguageStr : DEFAULT_LANGUAGE

    const codeByLanguageRaw = (entry as { codeByLanguage?: unknown }).codeByLanguage
    const codeByLanguage: Partial<Record<PebbleLanguageId, string>> = {}
    if (codeByLanguageRaw && typeof codeByLanguageRaw === 'object') {
      for (const [languageId, code] of Object.entries(codeByLanguageRaw as Record<string, unknown>)) {
        if (!isPebbleLanguageId(languageId) || typeof code !== 'string') {
          continue
        }
        codeByLanguage[languageId] = code
      }
    }

    const updatedAtRaw = (entry as { updatedAt?: unknown }).updatedAt
    const updatedAt = typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)
      ? updatedAtRaw
      : Date.now()

    next[problemId] = {
      selectedLanguage,
      codeByLanguage,
      updatedAt,
    }
  }

  return next
}

export function saveProblemCodeByLang(state: ProblemCodeByLang) {
  safeSetJSON(PROBLEM_CODE_BY_LANG_STORAGE_KEY, state, {
    maxBytes: 500 * 1024,
    silent: true,
  })
}

export function getGlobalDefaultLanguage() {
  const value = safeGetJSON<string>(DEFAULT_LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE)
  return isPebbleLanguageId(value) ? value : DEFAULT_LANGUAGE
}

export function setGlobalDefaultLanguage(languageId: PebbleLanguageId) {
  safeSetJSON(DEFAULT_LANGUAGE_STORAGE_KEY, languageId, {
    maxBytes: 64,
    silent: true,
  })
}
