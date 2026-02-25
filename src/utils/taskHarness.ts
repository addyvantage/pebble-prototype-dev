export type RunErrorKey =
  | 'PARITY_CHECK'
  | 'ACCUMULATOR_TARGET'
  | 'OUTPUT_MISMATCH'
  | 'MISSING_HASHMAP'
  | 'WRONG_RETURN'
  | 'LENGTH_MISMATCH_IGNORED'
  | 'MISSING_SLIDING_WINDOW'
  | 'WRONG_WINDOW_UPDATE'
  | 'TRIM_NOT_HANDLED'
  | 'WRONG_JOIN'
  | 'CASE_NOT_NORMALIZED'
  | 'NON_ALPHANUMERIC_NOT_FILTERED'

export type TaskRunResult = {
  status: 'success' | 'error'
  message: string
  errorKey?: RunErrorKey
}

function normalizeCode(codeText: string) {
  return codeText.replace(/\s+/g, ' ').trim()
}

function hasStrictParityCheck(normalizedCode: string) {
  return /n\s*%\s*2\s*===\s*0/.test(normalizedCode)
}

function usesAccumulatorTargetN(normalizedCode: string) {
  return /total\s*\+=\s*n\b/.test(normalizedCode)
}

function hasReturnTotal(normalizedCode: string) {
  return /return\s+total\b/.test(normalizedCode)
}

export function runTask(codeText: string): TaskRunResult {
  const normalizedCode = normalizeCode(codeText)

  if (!hasStrictParityCheck(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'PARITY_CHECK',
      message: 'Run failed: parity check must use n % 2 === 0 before accumulation.',
    }
  }

  if (!usesAccumulatorTargetN(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'ACCUMULATOR_TARGET',
      message: 'Run failed: accumulator should add n, not the source collection.',
    }
  }

  if (!hasReturnTotal(normalizedCode) || /\bNaN\b/.test(codeText)) {
    return {
      status: 'error',
      errorKey: 'OUTPUT_MISMATCH',
      message: 'Run failed: expected even sum 12, received NaN.',
    }
  }

  return {
    status: 'success',
    message: 'Run succeeded. Even sum matches expected output.',
  }
}
