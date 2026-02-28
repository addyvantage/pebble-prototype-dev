import type { I18nKey } from './strings'

type TranslateFn = (key: I18nKey, vars?: Record<string, string | number>) => string

export type I18nFormatters = {
  formatRuntime: (durationMs: number) => string
  formatExit: (exitCode: number | null) => string
  formatPassed: (passed: number, total: number) => string
  formatRunCount: (runCount: number, total: number) => string
  formatTestsSummary: (input: {
    passed: number
    total: number
    runCount: number
    durationMs?: number
    exitCode?: number | null
  }) => string
}

export function createFormatters(t: TranslateFn): I18nFormatters {
  function formatRuntime(durationMs: number) {
    return `${durationMs}ms`
  }

  function formatExit(exitCode: number | null) {
    return `${t('summary.exitLabel')} ${exitCode ?? 'null'}`
  }

  function formatPassed(passed: number, total: number) {
    return `${passed}/${total} ${t('summary.passedWord')}`
  }

  function formatRunCount(runCount: number, total: number) {
    return `${runCount}/${total} ${t('summary.runWord')}`
  }

  function formatTestsSummary(input: {
    passed: number
    total: number
    runCount: number
    durationMs?: number
    exitCode?: number | null
  }) {
    const parts = [formatPassed(input.passed, input.total), formatRunCount(input.runCount, input.total)]
    if (typeof input.durationMs === 'number' && input.durationMs > 0) {
      parts.push(formatRuntime(input.durationMs))
    }
    if (typeof input.exitCode === 'number') {
      parts.push(formatExit(input.exitCode))
    }
    return parts.join(' • ')
  }

  return {
    formatRuntime,
    formatExit,
    formatPassed,
    formatRunCount,
    formatTestsSummary,
  }
}
