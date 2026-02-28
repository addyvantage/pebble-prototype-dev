import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { NormalizedRunRequest, RunnerResponse } from './runnerShared.js'

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

function timedOutResult(startedAt: number, timeoutMs: number, stdout = '', stderr = ''): RunnerResponse {
  const timeoutMessage = stderr.trim() ? stderr : `Execution timed out after ${timeoutMs}ms.`
  return {
    ok: false,
    exitCode: null,
    stdout: trimOutput(stdout, MAX_STDOUT_CHARS),
    stderr: trimOutput(timeoutMessage, MAX_STDERR_CHARS),
    timedOut: true,
    durationMs: Date.now() - startedAt,
  }
}

function buildResult(startedAt: number, processResult: ProcessResult): RunnerResponse {
  const ok = !processResult.timedOut && processResult.exitCode === 0
  const stderr = processResult.timedOut && !processResult.stderr.trim()
    ? 'Execution timed out.'
    : processResult.stderr

  return {
    ok,
    exitCode: processResult.exitCode,
    stdout: trimOutput(processResult.stdout, MAX_STDOUT_CHARS),
    stderr: trimOutput(stderr, MAX_STDERR_CHARS),
    timedOut: processResult.timedOut,
    durationMs: Date.now() - startedAt,
  }
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

  return buildResult(startedAt, processResult)
}

async function runJavaScript(runDir: string, code: string, stdin: string, timeoutMs: number, startedAt: number) {
  const sourcePath = path.join(runDir, 'main.js')
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

  return buildResult(startedAt, processResult)
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
    return buildResult(startedAt, compileResult)
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

  return buildResult(startedAt, withStepOutput(compileResult, runResult))
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
    return buildResult(startedAt, compileResult)
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

  return buildResult(startedAt, withStepOutput(compileResult, runResult))
}

export async function runCodeLocally(input: NormalizedRunRequest): Promise<RunnerResponse> {
  const startedAt = Date.now()
  const runId = `${Date.now()}-${randomUUID()}`
  const runDir = path.join(TMP_ROOT, runId)

  await fs.mkdir(runDir, { recursive: true })

  try {
    if (input.language === 'python') {
      return await runPython(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
    }
    if (input.language === 'javascript') {
      return await runJavaScript(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
    }
    if (input.language === 'cpp') {
      return await runCpp(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
    }
    return await runJava(runDir, input.code, input.stdin, input.timeoutMs, startedAt)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local runner crashed.'
    return {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: trimOutput(`Runner crashed: ${message}`, MAX_STDERR_CHARS),
      timedOut: false,
      durationMs: Date.now() - startedAt,
    }
  } finally {
    await fs.rm(runDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
