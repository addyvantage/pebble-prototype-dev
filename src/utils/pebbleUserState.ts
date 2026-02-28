import type { PlacementLanguage, PlacementLevel, StartUnit } from '../data/onboardingData'

const PEBBLE_USER_STATE_KEY = 'pebbleUserState'

export type PebbleOnboardingState = {
  language: PlacementLanguage
  level: PlacementLevel
  updatedAt: string
}

export type PebblePlacementState = {
  language: PlacementLanguage
  level: PlacementLevel
  score: number
  startUnit: StartUnit
  startUnitIndex?: number
  answers: number[]
  weekBucket?: number
  questionIds?: string[]
  completedAt: string
}

export type PebbleUserState = {
  onboarding?: PebbleOnboardingState
  placement?: PebblePlacementState
  curriculum?: {
    selectedLanguage: PlacementLanguage
    selectedLevel: PlacementLevel
    currentUnitId: string
    recentChatSummary: string
    completedUnitIds: string[]
    updatedAt: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getPebbleUserState(): PebbleUserState {
  if (typeof window === 'undefined') {
    return {}
  }

  const raw = window.localStorage.getItem(PEBBLE_USER_STATE_KEY)
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return {}
    }
    return parsed as PebbleUserState
  } catch {
    return {}
  }
}

export function savePebbleOnboarding(input: { language: PlacementLanguage; level: PlacementLevel }) {
  if (typeof window === 'undefined') {
    return
  }

  const previous = getPebbleUserState()
  const next: PebbleUserState = {
    ...previous,
    onboarding: {
      language: input.language,
      level: input.level,
      updatedAt: new Date().toISOString(),
    },
  }

  window.localStorage.setItem(PEBBLE_USER_STATE_KEY, JSON.stringify(next))
}

export function savePebblePlacement(input: {
  language: PlacementLanguage
  level: PlacementLevel
  score: number
  startUnit: StartUnit
  startUnitIndex?: number
  answers: number[]
  weekBucket?: number
  questionIds?: string[]
}) {
  if (typeof window === 'undefined') {
    return
  }

  const previous = getPebbleUserState()
  const next: PebbleUserState = {
    ...previous,
    placement: {
      language: input.language,
      level: input.level,
      score: input.score,
      startUnit: input.startUnit,
      startUnitIndex: input.startUnitIndex,
      answers: input.answers,
      weekBucket: input.weekBucket,
      questionIds: input.questionIds,
      completedAt: new Date().toISOString(),
    },
  }

  window.localStorage.setItem(PEBBLE_USER_STATE_KEY, JSON.stringify(next))
}

export function savePebbleCurriculumProgress(input: {
  selectedLanguage: PlacementLanguage
  selectedLevel: PlacementLevel
  currentUnitId: string
  recentChatSummary?: string
  completedUnitIds?: string[]
}) {
  if (typeof window === 'undefined') {
    return
  }

  const previous = getPebbleUserState()
  const previousCurriculum = previous.curriculum
  const next: PebbleUserState = {
    ...previous,
    curriculum: {
      selectedLanguage: input.selectedLanguage,
      selectedLevel: input.selectedLevel,
      currentUnitId: input.currentUnitId,
      recentChatSummary: input.recentChatSummary ?? previousCurriculum?.recentChatSummary ?? '',
      completedUnitIds: input.completedUnitIds ?? previousCurriculum?.completedUnitIds ?? [],
      updatedAt: new Date().toISOString(),
    },
  }

  window.localStorage.setItem(PEBBLE_USER_STATE_KEY, JSON.stringify(next))
}
