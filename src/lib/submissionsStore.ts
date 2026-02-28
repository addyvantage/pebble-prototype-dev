import type { PlacementLanguage } from '../data/onboardingData'
import type { ProblemLanguage } from '../data/problemsBank'

const SUBMISSIONS_KEY = 'pebble.submissions.v1'
const MAX_SUBMISSIONS_PER_UNIT = 20

export type SubmissionStatus = 'accepted' | 'failed'

export type UnitSubmission = {
  id: string
  unitId: string
  status: SubmissionStatus
  language: PlacementLanguage | ProblemLanguage
  timestamp: number
  runtimeMs: number
  passCount: number
  totalCount: number
  exitCode: number | null
  code: string
}

export type SubmissionsByUnit = Record<string, UnitSubmission[]>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function loadSubmissions(): SubmissionsByUnit {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(SUBMISSIONS_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return {}
    }

    const normalized: SubmissionsByUnit = {}
    for (const [unitId, maybeRows] of Object.entries(parsed)) {
      if (!Array.isArray(maybeRows)) {
        continue
      }

      const rows: UnitSubmission[] = []
      for (const row of maybeRows) {
        if (!isRecord(row)) {
          continue
        }

        if (
          typeof row.id !== 'string' ||
          (row.status !== 'accepted' && row.status !== 'failed') ||
          typeof row.language !== 'string' ||
          typeof row.timestamp !== 'number' ||
          typeof row.runtimeMs !== 'number' ||
          typeof row.passCount !== 'number' ||
          typeof row.totalCount !== 'number' ||
          typeof row.code !== 'string'
        ) {
          continue
        }

        rows.push({
          id: row.id,
          unitId,
          status: row.status,
          language: row.language as PlacementLanguage | ProblemLanguage,
          timestamp: row.timestamp,
          runtimeMs: row.runtimeMs,
          passCount: row.passCount,
          totalCount: row.totalCount,
          exitCode: typeof row.exitCode === 'number' || row.exitCode === null ? row.exitCode : null,
          code: row.code,
        })
      }

      if (rows.length > 0) {
        normalized[unitId] = rows
      }
    }

    return normalized
  } catch {
    return {}
  }
}

export function saveSubmissions(submissions: SubmissionsByUnit) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions))
  } catch {
    // Ignore quota and serialization issues in local demo mode.
  }
}

export function appendSubmission(
  current: SubmissionsByUnit,
  submission: Omit<UnitSubmission, 'id' | 'timestamp'> & Partial<Pick<UnitSubmission, 'id' | 'timestamp'>>,
) {
  const nextItem: UnitSubmission = {
    ...submission,
    id: submission.id ?? `${submission.unitId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: submission.timestamp ?? Date.now(),
  }

  const existing = current[nextItem.unitId] ?? []
  const nextRows = [nextItem, ...existing].slice(0, MAX_SUBMISSIONS_PER_UNIT)

  return {
    ...current,
    [nextItem.unitId]: nextRows,
  } satisfies SubmissionsByUnit
}
