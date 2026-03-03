import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFunctionModeRunnable,
  parseHarnessCasesFromStdout,
  validateFunctionSignature,
} from '../src/lib/functionMode'
import { runCodeLocally } from '../server/runnerLocal'

const helloCase = {
  input: '',
  expectedText: 'Hello, Pebble!',
  args: [],
  expectedValue: 'Hello, Pebble!',
}

const emptyCase = {
  input: '',
  expectedText: '',
  args: [],
  expectedValue: '',
}

test('python signature: accepts class Solution + solve(self) -> str', () => {
  const userCode = `class Solution:\n    def solve(self) -> str:\n        return "Hello, Pebble!"\n`
  const result = validateFunctionSignature({
    language: 'python',
    userCode,
    methodName: 'solve',
    signatureLabel: 'Solution.solve() -> str',
  })

  assert.deepEqual(result, { ok: true })
})

test('python signature: accepts -> string with extra spaces', () => {
  const userCode = `class Solution:\n    def solve ( self ) -> string :\n        return "Hello, Pebble!"\n`
  const result = validateFunctionSignature({
    language: 'python',
    userCode,
    methodName: 'solve',
    signatureLabel: 'Solution.solve() -> str',
  })

  assert.deepEqual(result, { ok: true })
})

test('python signature: accepts tabs + no return type hint', () => {
  const userCode = `class Solution:\n\tdef solve(self):\n\t\treturn "Hello, Pebble!"\n`
  const result = validateFunctionSignature({
    language: 'python',
    userCode,
    methodName: 'solve',
    signatureLabel: 'Solution.solve() -> str',
  })

  assert.deepEqual(result, { ok: true })
})

test('python signature: accepts multiline solve signature', () => {
  const userCode = `class Solution:\n    def solve(\n        self,\n    ) -> str:\n        return "Hello, Pebble!"\n`
  const result = validateFunctionSignature({
    language: 'python',
    userCode,
    methodName: 'solve',
    signatureLabel: 'Solution.solve() -> str',
  })

  assert.deepEqual(result, { ok: true })
})

test('python signature: fails with missing Solution class', () => {
  const userCode = `def solve(self) -> str:\n    return "Hello, Pebble!"\n`
  const result = validateFunctionSignature({
    language: 'python',
    userCode,
    methodName: 'solve',
    signatureLabel: 'Solution.solve() -> str',
  })

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.reason, 'missing_class')
  }
})

test('python signature: ignores top-level solve when class method is missing', () => {
  const userCode = `class Solution:\n    def helper(self) -> str:\n        return "x"\n\ndef solve() -> str:\n    return "Hello, Pebble!"\n`
  const result = validateFunctionSignature({
    language: 'python',
    userCode,
    methodName: 'solve',
    signatureLabel: 'Solution.solve() -> str',
  })

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.reason, 'missing_method')
  }
})

test('python function-mode execution: executes Solution().solve() for -> string', async (t: TestContext) => {
  const userCode = `class Solution:\n    def solve(self) -> string:\n        return "Hello, Pebble!"\n`
  const runnable = buildFunctionModeRunnable({
    language: 'python',
    userCode,
    methodName: 'solve',
    cases: [helloCase],
  })

  assert.ok(runnable)
  const run = await runCodeLocally({
    language: 'python',
    code: runnable!.code,
    stdin: '',
    timeoutMs: 4000,
  })

  if (run.status === 'toolchain_unavailable') {
    t.skip(`python3 unavailable: ${run.stderr}`)
    return
  }

  assert.equal(run.status, 'ok')
  const parsed = parseHarnessCasesFromStdout(run.stdout)
  assert.ok(parsed)
  assert.equal(parsed![0]?.actual, 'Hello, Pebble!')
  assert.equal(parsed![0]?.passed, true)
})

test('python function-mode execution: treats None return as empty string', async (t: TestContext) => {
  const userCode = `class Solution:\n    def solve(self):\n        return None\n`
  const runnable = buildFunctionModeRunnable({
    language: 'python',
    userCode,
    methodName: 'solve',
    cases: [emptyCase],
  })

  assert.ok(runnable)
  const run = await runCodeLocally({
    language: 'python',
    code: runnable!.code,
    stdin: '',
    timeoutMs: 4000,
  })

  if (run.status === 'toolchain_unavailable') {
    t.skip(`python3 unavailable: ${run.stderr}`)
    return
  }

  assert.equal(run.status, 'ok')
  const parsed = parseHarnessCasesFromStdout(run.stdout)
  assert.ok(parsed)
  assert.equal(parsed![0]?.actual, '')
  assert.equal(parsed![0]?.passed, true)
})

