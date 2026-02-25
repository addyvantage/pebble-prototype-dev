import { storageKeys } from './storageKeys'

export type UserSkillLevel = 'Newbie' | 'Beginner' | 'Intermediate' | 'Professional'
export type UserGoal =
  | 'Learn programming fundamentals'
  | 'Interview prep'
  | 'Data analysis'
  | 'Web dev'
  | 'Automation/scripting'
export type UserBackground = 'Student' | 'Working professional' | 'Career switcher'
export type UserRuntimeLanguage = 'javascript_sim'
export type UserRequestedLanguage = 'python' | 'cpp' | 'java'
export type UserLanguageSelection = UserRuntimeLanguage | UserRequestedLanguage

export type UserLanguageOption = {
  id: UserLanguageSelection
  label: string
  isActiveRuntime: boolean
}

export type UserProfile = {
  skillLevel: UserSkillLevel
  goal: UserGoal
  background: UserBackground
  primaryLanguage: UserRuntimeLanguage
  requestedLanguage?: UserRequestedLanguage
}

export type UserProfileInput = {
  skillLevel: UserSkillLevel
  goal: UserGoal
  background: UserBackground
  primaryLanguage: UserLanguageSelection
}

export const userSkillLevels: UserSkillLevel[] = [
  'Newbie',
  'Beginner',
  'Intermediate',
  'Professional',
]

export const userGoals: UserGoal[] = [
  'Learn programming fundamentals',
  'Interview prep',
  'Data analysis',
  'Web dev',
  'Automation/scripting',
]

export const userBackgrounds: UserBackground[] = [
  'Student',
  'Working professional',
  'Career switcher',
]

export const userLanguageOptions: UserLanguageOption[] = [
  {
    id: 'javascript_sim',
    label: 'JavaScript (Simulated)',
    isActiveRuntime: true,
  },
  {
    id: 'python',
    label: 'Python (coming soon)',
    isActiveRuntime: false,
  },
  {
    id: 'cpp',
    label: 'C++ (coming soon)',
    isActiveRuntime: false,
  },
  {
    id: 'java',
    label: 'Java (coming soon)',
    isActiveRuntime: false,
  },
]

const legacyLanguageToSelection = {
  Python: 'python',
  JavaScript: 'javascript_sim',
  'C++': 'cpp',
  Java: 'java',
} as const

function isSkillLevel(value: unknown): value is UserSkillLevel {
  return typeof value === 'string' && userSkillLevels.includes(value as UserSkillLevel)
}

function isGoal(value: unknown): value is UserGoal {
  return typeof value === 'string' && userGoals.includes(value as UserGoal)
}

function isBackground(value: unknown): value is UserBackground {
  return typeof value === 'string' && userBackgrounds.includes(value as UserBackground)
}

function isRequestedLanguage(value: unknown): value is UserRequestedLanguage {
  return (
    typeof value === 'string' &&
    userLanguageOptions.some(
      (option) => option.id === value && !option.isActiveRuntime,
    )
  )
}

function isLanguageSelection(value: unknown): value is UserLanguageSelection {
  return typeof value === 'string' && userLanguageOptions.some((option) => option.id === value)
}

function normalizeLanguageSelection(value: unknown): {
  primaryLanguage: UserRuntimeLanguage
  requestedLanguage?: UserRequestedLanguage
} {
  if (typeof value !== 'string') {
    return { primaryLanguage: 'javascript_sim' }
  }

  const legacySelection =
    legacyLanguageToSelection[value as keyof typeof legacyLanguageToSelection]
  const selection = legacySelection ?? (isLanguageSelection(value) ? value : 'javascript_sim')

  if (selection === 'javascript_sim') {
    return { primaryLanguage: 'javascript_sim' }
  }

  return {
    primaryLanguage: 'javascript_sim',
    requestedLanguage: selection,
  }
}

function normalizeUserProfile(value: unknown): UserProfile | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Partial<
    UserProfile & {
      primaryLanguage: unknown
      requestedLanguage: unknown
    }
  >

  if (
    !isSkillLevel(candidate.skillLevel) ||
    !isGoal(candidate.goal) ||
    !isBackground(candidate.background)
  ) {
    return null
  }

  const language = normalizeLanguageSelection(candidate.primaryLanguage)
  const requestedLanguage = isRequestedLanguage(candidate.requestedLanguage)
    ? candidate.requestedLanguage
    : language.requestedLanguage

  return {
    skillLevel: candidate.skillLevel,
    goal: candidate.goal,
    background: candidate.background,
    primaryLanguage: 'javascript_sim',
    ...(requestedLanguage ? { requestedLanguage } : {}),
  }
}

export function getUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(storageKeys.userProfile)
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    const normalizedProfile = normalizeUserProfile(parsed)
    if (!normalizedProfile) {
      return null
    }

    const normalizedRaw = JSON.stringify(normalizedProfile)
    if (normalizedRaw !== raw) {
      window.localStorage.setItem(storageKeys.userProfile, normalizedRaw)
    }

    return normalizedProfile
  } catch {
    return null
  }
}

export function setUserProfile(profile: UserProfileInput) {
  if (typeof window === 'undefined') {
    return
  }

  const language = normalizeLanguageSelection(profile.primaryLanguage)
  const normalizedProfile: UserProfile = {
    skillLevel: profile.skillLevel,
    goal: profile.goal,
    background: profile.background,
    primaryLanguage: 'javascript_sim',
    ...(language.requestedLanguage ? { requestedLanguage: language.requestedLanguage } : {}),
  }

  window.localStorage.setItem(storageKeys.userProfile, JSON.stringify(normalizedProfile))
}

export function clearUserProfile() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(storageKeys.userProfile)
}

export function getLanguageSelectionForProfile(profile: UserProfile | null): UserLanguageSelection {
  if (!profile) {
    return 'javascript_sim'
  }

  return profile.requestedLanguage ?? profile.primaryLanguage
}

export function getLanguageLabel(language: UserLanguageSelection) {
  return (
    userLanguageOptions.find((option) => option.id === language)?.label ??
    'JavaScript (Simulated)'
  )
}

export function getRuntimeLanguageLabel() {
  return getLanguageLabel('javascript_sim')
}

export function getRequestedLanguageLabel(profile: UserProfile | null) {
  if (!profile?.requestedLanguage) {
    return null
  }

  return getLanguageLabel(profile.requestedLanguage)
}
