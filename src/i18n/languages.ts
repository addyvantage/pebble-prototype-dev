export const CHAT_LANGUAGE_STORAGE_KEY = 'pebble.chatLanguage.v1'

export type LanguageCode =
  | 'en'
  | 'hi'
  | 'bn'
  | 'te'
  | 'mr'
  | 'ta'
  | 'ur'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'or'
  | 'pa'
  | 'as'

export type LanguageOption = {
  code: LanguageCode
  nativeName: string
  romanizedName: string
  direction: 'ltr' | 'rtl'
  locale: string
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', romanizedName: 'English', direction: 'ltr', locale: 'en-US' },
  { code: 'hi', nativeName: 'हिन्दी', romanizedName: 'Hindi', direction: 'ltr', locale: 'hi-IN' },
  { code: 'bn', nativeName: 'বাংলা', romanizedName: 'Bengali', direction: 'ltr', locale: 'bn-IN' },
  { code: 'te', nativeName: 'తెలుగు', romanizedName: 'Telugu', direction: 'ltr', locale: 'te-IN' },
  { code: 'mr', nativeName: 'मराठी', romanizedName: 'Marathi', direction: 'ltr', locale: 'mr-IN' },
  { code: 'ta', nativeName: 'தமிழ்', romanizedName: 'Tamil', direction: 'ltr', locale: 'ta-IN' },
  { code: 'ur', nativeName: 'اردو', romanizedName: 'Urdu', direction: 'rtl', locale: 'ur-IN' },
  { code: 'gu', nativeName: 'ગુજરાતી', romanizedName: 'Gujarati', direction: 'ltr', locale: 'gu-IN' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', romanizedName: 'Kannada', direction: 'ltr', locale: 'kn-IN' },
  { code: 'ml', nativeName: 'മലയാളം', romanizedName: 'Malayalam', direction: 'ltr', locale: 'ml-IN' },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', romanizedName: 'Odia', direction: 'ltr', locale: 'or-IN' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', romanizedName: 'Punjabi', direction: 'ltr', locale: 'pa-IN' },
  { code: 'as', nativeName: 'অসমীয়া', romanizedName: 'Assamese', direction: 'ltr', locale: 'as-IN' },
]

const LEGACY_LANGUAGE_MAP: Record<string, LanguageCode> = {
  English: 'en',
  Hindi: 'hi',
  Bengali: 'bn',
  Telugu: 'te',
  Marathi: 'mr',
  Tamil: 'ta',
  Urdu: 'ur',
  Gujarati: 'gu',
  Kannada: 'kn',
  Malayalam: 'ml',
  Odia: 'or',
  Punjabi: 'pa',
  Assamese: 'as',
}

export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code)

export function isLanguageCode(value: string | null): value is LanguageCode {
  return LANGUAGE_CODES.includes((value ?? '') as LanguageCode)
}

export function resolveLanguageCode(value: string | null | undefined): LanguageCode {
  const normalized = value ?? null
  if (isLanguageCode(normalized)) {
    return normalized
  }

  if (value && LEGACY_LANGUAGE_MAP[value]) {
    return LEGACY_LANGUAGE_MAP[value]
  }

  return 'en'
}

export function getLanguageOption(code: LanguageCode): LanguageOption {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0]
}
