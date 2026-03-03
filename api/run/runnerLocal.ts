import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { NormalizedRunRequest, RunnerResponse, RunnerStatus, RunLanguage } from './runnerShared.js'

const TMP_ROOT = path.resolve(process.cwd(), '.pebble_tmp')
const MAX_STDOUT_CHARS = 16_000
const MAX_STDERR_CHARS = 16_000

function trimOutput(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value
  }
  return `${value.slice(0, maxChars)}\n...[truncated]`
}

function isNodeErrnoException(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error
}

function executableInstallHint(command: string) {
  if (command === 'python3') {
    return "Missing executable 'python3'. Install Python 3 and ensure 'python3' is on PATH."
  }
  if (command === 'node') {
    return "Missing executable 'node'. Install Node.js and ensure 'node' is on PATH."
  }
  if (command === 'g++') {
    return "Missing executable 'g++'. Install g++ (build-essential on Linux or Xcode Command Line Tools on macOS)."
  }
  if (command === 'gcc') {
    return "Missing executable 'gcc'. Install gcc (build-essential on Linux or Xcode Command Line Tools on macOS)."
  }
  if (command === 'javac' || command === 'java') {
    return "Missing executable 'javac/java'. Install a JDK (OpenJDK 17+) and ensure both are on PATH."
  }
  return `Missing executable '${command}'. Install it and ensure it is on PATH.`
}

type ProcessResult = {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

type ToolchainProbe = {
  command: string
  args: string[]
}

type ToolchainResult = {
  ok: boolean
  message: string
}

const TOOLCHAIN_BY_LANGUAGE: Record<RunLanguage, ToolchainProbe[]> = {
  python: [{ command: 'python3', args: ['--version'] }],
  javascript: [{ command: 'node', args: ['-v'] }],
  cpp: [{ command: 'g++', args: ['--version'] }],
  c: [{ command: 'gcc', args: ['--version'] }],
  java: [
    { command: 'javac', args: ['-version'] },
    { command: 'java', args: ['-version'] },
  ],
}

const toolchainProbeCache = new Map<string, ToolchainResult>()

async function runProcess(input: {
  command: string
  args: string[]
  cwd: string
  stdin: string
  timeoutMs: number
}): Promise<ProcessResult> {
  const { command, args, cwd, stdin, timeoutMs } = input

  return await new Promise<ProcessResult>((resolve) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    let timeoutHandle: NodeJS.Timeout | null = null

    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    })

    const finalize = (result: ProcessResult) => {
      if (settled) {
        return
      }
      settled = true
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
        timeoutHandle = null
      }
      resolve({
        ...result,
        stdout: trimOutput(result.stdout, MAX_STDOUT_CHARS),
        stderr: trimOutput(result.stderr, MAX_STDERR_CHARS),
      })
    }

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (chunk: string) => {
      stdout = trimOutput(`${stdout}${chunk}`, MAX_STDOUT_CHARS)
    })

    child.stderr.on('data', (chunk: string) => {
      stderr = trimOutput(`${stderr}${chunk}`, MAX_STDERR_CHARS)
    })

    child.on('error', (error) => {
      if (isNodeErrnoException(error) && error.code === 'ENOENT') {
        stderr = trimOutput(`${stderr}${executableInstallHint(command)}`, MAX_STDERR_CHARS)
      } else {
        const message = error instanceof Error ? error.message : 'Unknown process spawn error.'
        stderr = trimOutput(`${stderr}${message}`, MAX_STDERR_CHARS)
      }
      finalize({
        exitCode: null,
        stdout,
        stderr,
        timedOut: false,
      })
    })

    child.on('close', (exitCode) => {
      finalize({
        exitCode,
        stdout,
        stderr,
        timedOut,
      })
    })

    timeoutHandle = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    if (stdin) {
      child.stdin.write(stdin)
    }
    child.stdin.end()
  })
}

function createRunnerResponse(
  status: RunnerStatus,
  startedAt: number,
  input: {
    exitCode: number | null
    stdout: string
    stderr: string
    timedOut: boolean
  },
): RunnerResponse {
  return {
    ok: status === 'ok',
    status,
    exitCode: input.exitCode,
    stdout: trimOutput(input.stdout, MAX_STDOUT_CHARS),
    stderr: trimOutput(input.stderr, MAX_STDERR_CHARS),
    timedOut: input.timedOut,
    durationMs: Date.now() - startedAt,
  }
}

function timedOutResult(startedAt: number, timeoutMs: number, stdout = '', stderr = ''): RunnerResponse {
  const timeoutMessage = stderr.trim() ? stderr : `Execution timed out after ${timeoutMs}ms.`
  return createRunnerResponse('timeout', startedAt, {
    exitCode: null,
    stdout,
    stderr: timeoutMessage,
    timedOut: true,
  })
}

function buildResult(
  startedAt: number,
  processResult: ProcessResult,
  failureStatus: Exclude<RunnerStatus, 'ok' | 'timeout'> = 'runtime_error',
): RunnerResponse {
  const ok = !processResult.timedOut && processResult.exitCode === 0
  const stderr = processResult.timedOut && !processResult.stderr.trim()
    ? 'Execution timed out.'
    : processResult.stderr
  const status: RunnerStatus = processResult.timedOut ? 'timeout' : ok ? 'ok' : failureStatus
  return createRunnerResponse(status, startedAt, {
    exitCode: processResult.exitCode,
    stdout: processResult.stdout,
    stderr,
    timedOut: processResult.timedOut,
  })
}

function remainingTimeMs(startedAt: number, timeoutMs: number) {
  return timeoutMs - (Date.now() - startedAt)
}

function withStepOutput(base: ProcessResult, step: ProcessResult): ProcessResult {
  return {
    exitCode: step.exitCode,
    timedOut: step.timedOut,
    stdout: trimOutput(`${base.stdout}${step.stdout}`, MAX_STDOUT_CHARS),
    stderr: trimOutput(`${base.stderr}${step.stderr}`, MAX_STDERR_CHARS),
  }
}

async function probeExecutable(command: string, args: string[]): Promise<ToolchainResult> {
  const cacheKey = `${command} ${args.join(' ')}`
  const cached = toolchainProbeCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const probeResult = await runProcess({
    command,
    args,
    cwd: process.cwd(),
    stdin: '',
    timeoutMs: 1_800,
  })

  if (probeResult.timedOut) {
    const message = `Language runtime probe timed out while checking '${command}'.`
    const output = { ok: false, message }
    toolchainProbeCache.set(cacheKey, output)
    return output
  }

  if (probeResult.exitCode === 0) {
    const output = { ok: true, message: '' }
    toolchainProbeCache.set(cacheKey, output)
    return output
  }

  let message = probeResult.stderr.trim()
  if (!message) {
    message = executableInstallHint(command)
  }
  const output = { ok: false, message }
  toolchainProbeCache.set(cacheKey, output)
  return output
}

async function ensureLanguageToolchain(language: RunLanguage): Promise<ToolchainResult> {
  const probes = TOOLCHAIN_BY_LANGUAGE[language] ?? []
  for (const probe of probes) {
    const probeResult = await probeExecutable(probe.command, probe.args)
    if (!probeResult.ok) {
      const detail = probeResult.message || executableInstallHint(probe.command)
      const message = `Language runtime not available on this environment. ${detail}`
      return { ok: false, message }
    }
  }
  return { ok: true, message: '' }
}

function inferInterpretedFailureStatus(language: 'python' | 'javascript', stderr: string): RunnerStatus {
  const normalized = stderr.toLowerCase()
  if (language === 'python') {
    if (normalized.includes('syntaxerror') || normalized.includes('indentationerror')) {
      return 'compile_error'
    }
  }
  if (language === 'javascript') {
    if (normalized.includes('syntaxerror') || normalized.includes('unexpected token')) {
      return 'compile_error'
    }
  }
  return 'runtime_error'
}

async function runPython(runDir: string, code: string, stdin: string, timeoutMs: number, startedAt: number) {
  const sourcePath = path.join(runDir, 'main.py')
  await fs.writeFile(sourcePath, code, 'utf8')

  const remaining = remainingTimeMs(startedAt, timeoutMs)
  if (remaining <= 0) {
    return timedOutResult(startedAt, timeoutMs)
  }

  const processResult = await runProcess({
    command: 'python3',
    args: [sourcePath],
    cwd: runDir,
    stdin,
    timeoutMs: remaining,
  })

  if (processResult.timedOut && !processResult.stderr.trim()) {
    processResult.stderr = `Execution timed out after ${timeoutMs}ms.`
  }

  return buildResult(startedAt, processResult, inferInterpretedFailureStatus('python', processResult.stderr))
}

async function runJavaScript(runDir: string, code: string, stdin: string, timeoutMs: number, startedAt: number) {
  const sourcePath = path.join(runDir, 'main.cjs')
  await fs.writeFile(sourcePath, code, 'utf8')

  const remaining = remainingTimeMs(startedAt, timeoutMs)
  if (remaining <= 0) {
    return timedOutResult(startedAt, timeoutMs)
  }

  const processResult = await runProcess({
    command: 'node',
    args: [sourcePath],
    cwd: runDir,
    stdin,
    timeoutMs: remaining,
  })

  if (processResult.timedOut && !processResult.stderr.trim()) {
    processResult.stderr = `Execution timed out after ${timeoutMs}ms.`
  }

  return buildResult(startedAt, processResult, inferInterpretedFailureStatus('javascript', processResult.stderr))
}

async function runCpp(runDir: string, code: string, stdin: string, timeoutMs: number, startedAt: number) {
  const sourcePath = path.join(runDir, 'main.cpp')
  const outputPath = path.join(runDir, 'main.out')
  await fs.writeFile(sourcePath, code, 'utf8')

  const compileRemaining = remainingTimeMs(startedAt, timeoutMs)
  if (compileRemaining <= 0) {
    return timedOutResult(startedAt, timeoutMs)
  }

  const compileResult = await runProcess({
    command: 'g++',
    args: ['-std=c++17', '-O2', sourcePath, '-o', outputPath],
    cwd: runDir,
    stdin: '',
    timeoutMs: compileRemaining,
  })

  if (compileResult.timedOut) {
    return timedOutResult(startedAt, timeoutMs, compileResult.stdout, compileResult.stderr)
  }

  if (compileResult.exitCode !== 0) {
    return buildResult(startedAt, compileResult, 'compile_error')
  }

  const runRemaining = remainingTimeMs(startedAt, timeoutMs)
  if (runRemaining <= 0) {
    return timedOutResult(startedAt, timeoutMs, compileResult.stdout, compileResult.stderr)
  }

  const runResult = await runProcess({
    command: outputPath,
    args: [],
    cwd: runDir,
    stdin,
    timeoutMs: runRemaining,
  })

  if (runResult.timedOut && !runResult.stderr.trim()) {
    runResult.stderr = `Execution timed out after ${timeoutMs}ms.`
  }

  return buildResult(startedAt, withStepOutput(compileResult, runResult), 'runtime_error')
}

async function runC(runDir: string, code: string, stdin: string, timeoutMs: number, startedAt: number) {
  const sourcePath = path.join(runDir, 'main.c')
  const outputPath = path.join(runDir, 'main.out')
  await fs.writeFile(sourcePath, code, 'utf8')

  const compileRemaining = remainingTimeMs(startedAt, timeoutMs)
  if (compileRemaining <= 0) {
    return timedOutResult(startedAt, timeoutMs)
  }

  const compileResult = await runProcess({
    command: 'gcc',
    args: ['-std=gnu11', '-O2', '-Wall', '-Wextra', sourcePath, '-o', outputPath, '-lm'],
    cwd: runDir,
    stdin: '',
    timeoutMs: compileRemaining,
  })

  if (compileResult.timedOut) {
    return timedOutResult(startedAt, timeoutMs, compileResult.stdout, compileResult.stderr)
  }

  if (compileResult.exitCode !== 0) {
    return buildResult(startedAt, compileResult, 'compile_error')
  }

  const runRemaining = remainingTimeMs(startedAt, timeoutMs)
  if (runRemaining <= 0) {
    return timedOutResult(startedAt, timeoutMs, compileResult.stdout, compileResult.stderr)
  }

  const runResult = await runProcess({
    command: outputPath,
    args: [],
    cwd: runDir,
    stdin,
    timeoutMs: runRemaining,
  })

  if (runResult.timedOut && !runResult.stderr.trim()) {
    runResult.stderr = `Execution timed out after ${timeoutMs}ms.`
  }

  return buildResult(startedAt, withStepOutput(compileResult, runResult), 'runtime_error')
}

async function runJava(runDir: string, code: string, stdin: string, timeoutMs: number, startedAt: number) {
  const sourcePath = path.join(runDir, 'Main.java')
  await fs.writeFile(sourcePath, code, 'utf8')

  const compileRemaining = remainingTimeMs(startedAt, timeoutMs)
  if (compileRemaining <= 0) {
    return timedOutResult(startedAt, timeoutMs)
  }

  const compileResult = await runProcess({
    command: 'javac',
    args: [sourcePath],
    cwd: runDir,
    stdin: '',
    timeoutMs: compileRemaining,
  })

  if (compileResult.timedOut) {
    return timedOutResult(startedAt, timeoutMs, compileResult.stdout, compileResult.stderr)
  }

  if (compileResult.exitCode !== 0) {
    return buildResult(startedAt, compileResult, 'compile_error')
  }

  const runRemaining = remainingTimeMs(startedAt, timeoutMs)
  if (runRemaining <= 0) {
    return timedOutResult(startedAt, timeoutMs, compileResult.stdout, compileResult.stderr)
  }

  const runResult = await runProcess({
    command: 'java',
    args: ['-cp', runDir, 'Main'],
    cwd: runDir,
    stdin,
    timeoutMs: runRemaining,
  })

  if (runResult.timedOut && !runResult.stderr.trim()) {
    runResult.stderr = `Execution timed out after ${timeoutMs}ms.`
  }

  return buildResult(startedAt, withStepOutput(compileResult, runResult), 'runtime_error')
}

export async function runCodeLocally(input: NormalizedRunRequest): Promise<RunnerResponse> {
  const startedAt = Date.now()
  const runId = `${Date.now()}-${randomUUID()}`
  const runDir = path.join(TMP_ROOT, runId)

  await fs.mkdir(runDir, { recursive: true })

  try {
    const toolchain = await ensureLanguageToolchain(input.language)
    if (!toolchain.ok) {
      return createRunnerResponse('toolchain_unavailable', startedAt, {
        exitCode: null,
        stdout: '',
        stderr: toolchain.message,
        timedOut: false,
      })
    }

    if (input.language === 'python') {
      return await runPython(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
    }
    if (input.language === 'javascript') {
      return await runJavaScript(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
    }
    if (input.language === 'cpp') {
      return await runCpp(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
    }
    if (input.language === 'c') {
      return await runC(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
    }
    return await runJava(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local runner crashed.'
    return createRunnerResponse('internal_error', startedAt, {
      exitCode: null,
      stdout: '',
      stderr: `Runner crashed: ${message}`,
      timedOut: false,
    })
  } finally {
    await fs.rm(runDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
