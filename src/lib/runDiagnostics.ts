import type { RunnableBuildResult } from './functionMode'
import type { RunApiResponse, RunStatus } from './runApi'

export type RunDiagnosticLocationKind = 'user_code' | 'runner_wrapper' | 'unknown'

export type RunFailureDiagnostic = {
  status: Exclude<RunStatus, 'ok'>
  details: string
  locationKind: RunDiagnosticLocationKind
  compilerLine: number | null
  editorLine: number | null
}

const COMPILER_LINE_PATTERNS: ReadonlyArray<RegExp> = [
  /([^\s:][^:\n]*\.(?:cpp|cc|cxx|c|java|js|py)):(\d+)(?::(\d+))?/i,
  /File\s+"([^"]+)",\s+line\s+(\d+)/i,
  /(Main\.java):(\d+):/i,
  /(main\.(?:cpp|js|py)):(\d+)(?::(\d+))?/i,
]

function compactDetails(value: string) {
  return value.trim().replace(/\r\n/g, '\n')
}

function parseCompilerLocation(stderr: string) {
  for (const pattern of COMPILER_LINE_PATTERNS) {
    const match = stderr.match(pattern)
    if (!match) {
      continue
    }

    const file = match[1] ?? ''
    const lineRaw = match[2] ?? ''
    const columnRaw = match[3] ?? ''
    const line = Number.parseInt(lineRaw, 10)
    const column = Number.parseInt(columnRaw, 10)

    if (Number.isFinite(line)) {
      return {
        file,
        line,
        column: Number.isFinite(column) ? column : null,
      }
    }
  }

  return null
}

function inferStatus(result: RunApiResponse): Exclude<RunStatus, 'ok'> {
  if (result.status !== 'ok') {
    return result.status
  }

  if (result.timedOut) {
    return 'timeout'
  }

  const stderr = result.stderr.toLowerCase()
  if (stderr.includes('language runtime not available')) {
    return 'toolchain_unavailable'
  }
  if (
    stderr.includes('error:')
    || stderr.includes('syntaxerror')
    || stderr.includes('javac')
    || stderr.includes('no matching function')
  ) {
    return 'compile_error'
  }

  return 'runtime_error'
}

function mapLocation(input: {
  compilerLine: number
  sourceMap?: RunnableBuildResult['sourceMap'] | null
}) {
  const map = input.sourceMap
  if (!map) {
    return {
      locationKind: 'unknown' as const,
      editorLine: null,
    }
  }

  if (input.compilerLine >= map.userStartLine && input.compilerLine <= map.userEndLine) {
    return {
      locationKind: 'user_code' as const,
      editorLine: input.compilerLine - map.userStartLine + 1,
    }
  }

  return {
    locationKind: 'runner_wrapper' as const,
    editorLine: null,
  }
}

export function buildRunFailureDiagnostic(input: {
  result: RunApiResponse
  sourceMap?: RunnableBuildResult['sourceMap'] | null
}): RunFailureDiagnostic | null {
  if (input.result.ok && input.result.status === 'ok') {
    return null
  }

  const status = inferStatus(input.result)
  const details = compactDetails(input.result.stderr)
  const locationRaw = parseCompilerLocation(details)

  let compilerLine: number | null = null
  let locationKind: RunDiagnosticLocationKind = 'unknown'
  let editorLine: number | null = null

  if (locationRaw && Number.isFinite(locationRaw.line)) {
    compilerLine = locationRaw.line
    const mapped = mapLocation({
      compilerLine: locationRaw.line,
      sourceMap: input.sourceMap,
    })
    locationKind = mapped.locationKind
    editorLine = mapped.editorLine
  }

  return {
    status,
    details,
    locationKind,
    compilerLine,
    editorLine,
  }
}

export function formatDiagnosticLocationText(diagnostic: RunFailureDiagnostic): string {
  if (diagnostic.locationKind === 'user_code' && diagnostic.editorLine) {
    return `Your code line ${diagnostic.editorLine}`
  }
  if (diagnostic.locationKind === 'runner_wrapper') {
    return 'Runner wrapper'
  }
  if (diagnostic.compilerLine) {
    return `Compiler line ${diagnostic.compilerLine}`
  }
  return 'Unknown'
}
