import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CHAT_LANGUAGE_STORAGE_KEY,
  getLanguageOption,
  resolveLanguageCode,
  type LanguageCode,
  type LanguageOption,
} from './languages'
import { EN_STRINGS, STRINGS, type I18nKey } from './strings'
import { createFormatters, type I18nFormatters } from './formatters'

type TranslateVars = Record<string, string | number>

type I18nContextValue = {
  lang: LanguageCode
  language: LanguageOption
  isRTL: boolean
  setLang: (lang: LanguageCode) => void
  t: (key: I18nKey, vars?: TranslateVars) => string
  format: I18nFormatters
}

export const I18nContext = createContext<I18nContextValue | null>(null)

const warnedMissingKeys = new Set<string>()

function formatTemplate(template: string, vars?: TranslateVars) {
  if (!vars) {
    return template
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    if (!(key in vars)) {
      return `{${key}}`
    }
    return String(vars[key])
  })
}

function resolveInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const stored = window.localStorage.getItem(CHAT_LANGUAGE_STORAGE_KEY)
  return resolveLanguageCode(stored)
}

const INITIAL_LANGUAGE = resolveInitialLanguage()

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('lang', INITIAL_LANGUAGE)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(INITIAL_LANGUAGE)
  const language = useMemo(() => getLanguageOption(lang), [lang])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(CHAT_LANGUAGE_STORAGE_KEY, lang)
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const setLang = useCallback((nextLang: LanguageCode) => {
    setLangState(nextLang)
  }, [])

  const t = useCallback(
    (key: I18nKey, vars?: TranslateVars) => {
      const currentLanguageStrings = STRINGS[lang]
      const template = currentLanguageStrings[key] ?? EN_STRINGS[key]

      if (import.meta.env.DEV && !(key in currentLanguageStrings)) {
        const warningId = `${lang}:${key}`
        if (!warnedMissingKeys.has(warningId)) {
          warnedMissingKeys.add(warningId)
          console.warn(`[i18n] Missing key "${key}" for "${lang}". Falling back to English.`)
        }
      }

      return formatTemplate(template, vars)
    },
    [lang],
  )

  const value = useMemo(
    () => ({
      lang,
      language,
      isRTL: language.direction === 'rtl',
      setLang,
      t,
      format: createFormatters(t),
    }),
    [lang, language, setLang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
