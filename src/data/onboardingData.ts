export type PlacementLevel = 'beginner' | 'intermediate' | 'pro'
export type PlacementLanguage = 'python' | 'javascript' | 'cpp' | 'java' | 'c'
export type StartUnit = '1' | 'mid' | 'advanced'

export type LanguageMetadata = {
  id: PlacementLanguage
  label: string
  purpose: string
}

export const languageMetadata: LanguageMetadata[] = [
  {
    id: 'python',
    label: 'Python',
    purpose: 'AI/ML, automation, backend',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    purpose: 'web frontend + Node',
  },
  {
    id: 'cpp',
    label: 'C++',
    purpose: 'performance + DSA + systems',
  },
  {
    id: 'java',
    label: 'Java',
    purpose: 'backend, Android, interviews',
  },
  {
    id: 'c',
    label: 'C (GNU)',
    purpose: 'systems basics + low-level foundations',
  },
]

export function isPlacementLevel(value: string | null): value is PlacementLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'pro'
}

export function isPlacementLanguage(value: string | null): value is PlacementLanguage {
  return value === 'python' || value === 'javascript' || value === 'cpp' || value === 'java' || value === 'c'
}

export function getLanguageMetadata(language: PlacementLanguage) {
  return languageMetadata.find((item) => item.id === language) ?? languageMetadata[0]
}

export function scoreToStartUnit(score: number): StartUnit {
  if (score >= 8) {
    return 'advanced'
  }
  if (score >= 4) {
    return 'mid'
  }
  return '1'
}

export function getUnitIndexFromStartUnit(startUnit: StartUnit, totalUnits: number) {
  if (totalUnits <= 0) {
    return 0
  }

  if (startUnit === 'advanced') {
    return Math.max(totalUnits - 2, 0)
  }

  if (startUnit === 'mid') {
    return Math.floor(totalUnits / 2)
  }

  return 0
}
