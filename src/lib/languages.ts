export type PebbleLanguageId = 'python' | 'javascript' | 'cpp' | 'java' | 'c' | 'sql'

export type PebbleLanguage = {
  id: PebbleLanguageId
  label: string
  monacoLanguage?: string
  fileExt: string
  runnerId: 'python' | 'javascript' | 'cpp' | 'java' | 'c' | 'sql'
  defaultFunctionMode?: boolean
}

export const SUPPORTED_LANGUAGES: PebbleLanguage[] = [
  {
    id: 'python',
    label: 'Python 3',
    monacoLanguage: 'python',
    fileExt: '.py',
    runnerId: 'python',
    defaultFunctionMode: true,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    monacoLanguage: 'javascript',
    fileExt: '.js',
    runnerId: 'javascript',
    defaultFunctionMode: true,
  },
  {
    id: 'cpp',
    label: 'C++17',
    monacoLanguage: 'cpp',
    fileExt: '.cpp',
    runnerId: 'cpp',
    defaultFunctionMode: true,
  },
  {
    id: 'java',
    label: 'Java 17',
    monacoLanguage: 'java',
    fileExt: '.java',
    runnerId: 'java',
    defaultFunctionMode: true,
  },
  {
    id: 'c',
    label: 'C (GNU)',
    monacoLanguage: 'c',
    fileExt: '.c',
    runnerId: 'c',
    defaultFunctionMode: true,
  },
  {
    id: 'sql',
    label: 'SQL (Simulated)',
    monacoLanguage: 'plaintext',
    fileExt: '.sql',
    runnerId: 'sql',
    defaultFunctionMode: false,
  },
]

export const DEFAULT_LANGUAGE: PebbleLanguageId = 'python'

const BY_ID = new Map(SUPPORTED_LANGUAGES.map((language) => [language.id, language] as const))

export function isPebbleLanguageId(value: string | null | undefined): value is PebbleLanguageId {
  return typeof value === 'string' && BY_ID.has(value as PebbleLanguageId)
}

export function getPebbleLanguageById(id: PebbleLanguageId) {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_LANGUAGE)!
}

export function getMonacoLanguage(id: PebbleLanguageId) {
  return getPebbleLanguageById(id).monacoLanguage ?? 'plaintext'
}

export function getRuntimeLabel(id: PebbleLanguageId) {
  return getPebbleLanguageById(id).label
}
