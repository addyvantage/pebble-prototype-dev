export type TrendPoint = {
  day: string
  value: number
}

export type RecoveryGroup = {
  issue: 'Syntax errors' | 'API failures' | 'Logic issues'
  avgRecoverySec: number
  autonomousRecoveryRate: number
}

export type LedgerStatus = 'resolved' | 'guided' | 'stabilized'

export type LedgerEntry = {
  id: string
  timestamp: string
  note: string
  impact: string
  status: LedgerStatus
  breakpointsResolved: number
}

const dayLabels = [
  'Jan 26',
  'Jan 27',
  'Jan 28',
  'Jan 29',
  'Jan 30',
  'Jan 31',
  'Feb 01',
  'Feb 02',
  'Feb 03',
  'Feb 04',
  'Feb 05',
  'Feb 06',
  'Feb 07',
  'Feb 08',
  'Feb 09',
  'Feb 10',
  'Feb 11',
  'Feb 12',
  'Feb 13',
  'Feb 14',
  'Feb 15',
  'Feb 16',
  'Feb 17',
  'Feb 18',
  'Feb 19',
  'Feb 20',
  'Feb 21',
  'Feb 22',
  'Feb 23',
  'Feb 24',
]

const flowValues = [
  66, 67, 68, 67, 69, 70, 71, 70, 72, 73, 72, 74, 75, 74, 76, 77, 78, 77, 79,
  80, 79, 81, 82, 81, 82, 83, 84, 83, 84, 85,
]

const cognitiveLoadValues = [
  63, 62, 61, 62, 60, 59, 58, 59, 57, 56, 57, 55, 54, 55, 53, 52, 51, 52, 50,
  49, 50, 48, 47, 46, 47, 45, 44, 43, 42, 41,
]

export const summaryMetrics = {
  flowStability: {
    value: 85,
    trend: '+9%',
    description: 'Steadier concentration across the last 30 days',
  },
  recoveryTime: {
    value: 74,
    trend: '-18s',
    description: 'Average time from breakpoint to stable progress',
  },
  breakpoints: {
    value: 21,
    trend: '-6',
    description: 'Total cognitive breakpoints this month',
  },
  hintDependency: {
    value: 32,
    trend: '-11pp',
    description: 'Hints needed before autonomous recovery',
  },
}

export const flowTrend30d: TrendPoint[] = dayLabels.map((day, index) => ({
  day,
  value: flowValues[index],
}))

export const cognitiveLoadTrend30d: TrendPoint[] = dayLabels.map((day, index) => ({
  day,
  value: cognitiveLoadValues[index],
}))

export const recoveryByIssue: RecoveryGroup[] = [
  {
    issue: 'Syntax errors',
    avgRecoverySec: 52,
    autonomousRecoveryRate: 0.79,
  },
  {
    issue: 'API failures',
    avgRecoverySec: 86,
    autonomousRecoveryRate: 0.63,
  },
  {
    issue: 'Logic issues',
    avgRecoverySec: 104,
    autonomousRecoveryRate: 0.58,
  },
]

export const activityLedger: LedgerEntry[] = [
  {
    id: 'ledger-1',
    timestamp: '2026-02-24T09:42:00Z',
    note: 'Recovered faster on loop parity task',
    impact: 'Recovery improved by 14s',
    status: 'resolved',
    breakpointsResolved: 4,
  },
  {
    id: 'ledger-2',
    timestamp: '2026-02-23T14:10:00Z',
    note: 'Reduced API retry confusion in async challenge',
    impact: 'Hint dependency dropped 9%',
    status: 'guided',
    breakpointsResolved: 3,
  },
  {
    id: 'ledger-3',
    timestamp: '2026-02-22T17:28:00Z',
    note: 'Stabilized cadence during edge-case debugging',
    impact: 'Flow stability rose 4 points',
    status: 'stabilized',
    breakpointsResolved: 2,
  },
  {
    id: 'ledger-4',
    timestamp: '2026-02-20T11:05:00Z',
    note: 'Autonomous recovery after repeated run errors',
    impact: 'Recovered without explicit snippet',
    status: 'resolved',
    breakpointsResolved: 3,
  },
  {
    id: 'ledger-5',
    timestamp: '2026-02-18T16:33:00Z',
    note: 'Shorter idle period before re-attempt',
    impact: 'Idle time dropped by 22%',
    status: 'stabilized',
    breakpointsResolved: 1,
  },
  {
    id: 'ledger-6',
    timestamp: '2026-02-16T08:57:00Z',
    note: 'Handled API schema mismatch with one hint',
    impact: 'Recovery time improved by 11s',
    status: 'guided',
    breakpointsResolved: 2,
  },
  {
    id: 'ledger-7',
    timestamp: '2026-02-14T13:46:00Z',
    note: 'Recovered from logic branch confusion',
    impact: 'Autonomous recovery rate up 6%',
    status: 'resolved',
    breakpointsResolved: 4,
  },
  {
    id: 'ledger-8',
    timestamp: '2026-02-12T19:12:00Z',
    note: 'Maintained flow after failed run sequence',
    impact: 'Breakpoints reduced in second attempt',
    status: 'resolved',
    breakpointsResolved: 2,
  },
]
