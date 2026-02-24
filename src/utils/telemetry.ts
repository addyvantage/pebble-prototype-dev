export type TelemetrySnapshot = {
  keysPerSecond: number
  idleSeconds: number
  backspaceBurstCount: number
  runAttempts: number
  repeatErrorCount: number
}

type StruggleContext = {
  runStatus: 'idle' | 'error' | 'success'
  phase: 'struggle' | 'recovery' | 'complete'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function computeStruggleScore(
  snapshot: TelemetrySnapshot,
  context: StruggleContext,
) {
  let score = 18

  score += Math.min(30, snapshot.idleSeconds * 2.4)
  score += Math.min(26, snapshot.backspaceBurstCount * 6)
  score += Math.min(24, snapshot.repeatErrorCount * 10)

  if (snapshot.keysPerSecond < 1.1) {
    score += (1.1 - snapshot.keysPerSecond) * 18
  }

  if (snapshot.keysPerSecond > 2) {
    score -= Math.min(14, (snapshot.keysPerSecond - 2) * 8)
  }

  if (context.phase === 'recovery') {
    score -= 14
  }

  if (context.runStatus === 'success') {
    score -= 26
  }

  if (context.runStatus === 'error' && snapshot.runAttempts > 1) {
    score += 8
  }

  return clamp(Math.round(score), 0, 100)
}
