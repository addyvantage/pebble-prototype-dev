import { runCodeLocally } from '../server/runnerLocal.ts'
import type { RunLanguage } from '../server/runnerShared.ts'
import {
  buildFunctionModeRunnable,
  buildSingleCaseFunctionModeRunnable,
  getUnitFunctionMode,
  parseHarnessCasesFromStdout,
} from '../src/lib/functionMode.ts'
import { getProblemById } from '../src/data/problemsBank.ts'

type SmokeFailure = {
  name: string
  detail: string
}

const failures: SmokeFailure[] = []
const skipped: string[] = []

function fail(name: string, detail: string) {
  failures.push({ name, detail })
  console.error(`[fail] ${name}: ${detail}`)
}

function pass(name: string, detail: string) {
  console.log(`[pass] ${name}: ${detail}`)
}

function skip(name: string, detail: string) {
  skipped.push(name)
  console.log(`[skip] ${name}: ${detail}`)
}

const FUNCTION_CORRECT: Record<'python' | 'javascript' | 'cpp' | 'java', string> = {
  python: 'class Solution:\n    def solve(self) -> str:\n        return "Hello, Pebble!"\n',
  javascript: 'class Solution {\n  solve() {\n    return "Hello, Pebble!"\n  }\n}\n',
  cpp: '#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n  string solve() {\n    return "Hello, Pebble!";\n  }\n};\n',
  java: 'class Solution {\n  public String solve() {\n    return "Hello, Pebble!";\n  }\n}\n',
}

const FUNCTION_WRONG: Record<'python' | 'javascript' | 'cpp' | 'java', string> = {
  python: 'class Solution:\n    def solve(self):\n        return "Nope"\n',
  javascript: 'class Solution {\n  solve() {\n    return "Nope"\n  }\n}\n',
  cpp: '#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n  string solve() {\n    return "Nope";\n  }\n};\n',
  java: 'class Solution {\n  public String solve() {\n    return "Nope";\n  }\n}\n',
}

const PROBLEM_CORRECT: Record<Exclude<RunLanguage, never>, string> = {
  python: `import sys\n\ndef solve():\n    data = sys.stdin.read().strip().split()\n    if not data:\n      return\n    n = int(data[0])\n    nums = list(map(int, data[1:1+n]))\n    target = int(data[1+n])\n    seen = {}\n    for i, x in enumerate(nums):\n      need = target - x\n      if need in seen:\n        print(seen[need], i)\n        return\n      seen[x] = i\n    print(-1, -1)\n\nif __name__ == "__main__":\n    solve()\n`,
  javascript: `function solve(input) {\n  const data = input.trim().split(/\\s+/).map(Number);\n  if (data.length === 0 || Number.isNaN(data[0])) return '-1 -1';\n  const n = data[0];\n  const nums = data.slice(1, 1 + n);\n  const target = data[1 + n];\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i += 1) {\n    const x = nums[i];\n    const need = target - x;\n    if (seen.has(need)) {\n      return String(seen.get(need)) + ' ' + String(i);\n    }\n    seen.set(x, i);\n  }\n  return '-1 -1';\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\nprocess.stdout.write(String(solve(input)));\n`,
  cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n\n  int n;\n  if (!(cin >> n)) return 0;\n  vector<int> nums(n);\n  for (int i = 0; i < n; i += 1) cin >> nums[i];\n  int target;\n  cin >> target;\n\n  unordered_map<int, int> seen;\n  for (int i = 0; i < n; i += 1) {\n    int need = target - nums[i];\n    auto it = seen.find(need);\n    if (it != seen.end()) {\n      cout << it->second << ' ' << i;\n      return 0;\n    }\n    seen[nums[i]] = i;\n  }\n\n  cout << "-1 -1";\n  return 0;\n}\n`,
  java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    List<Integer> vals = new ArrayList<>();\n    String line;\n    while ((line = br.readLine()) != null) {\n      line = line.trim();\n      if (line.isEmpty()) continue;\n      for (String token : line.split("\\\\s+")) vals.add(Integer.parseInt(token));\n    }\n    if (vals.isEmpty()) return;\n\n    int idx = 0;\n    int n = vals.get(idx++);\n    int[] nums = new int[n];\n    for (int i = 0; i < n; i += 1) nums[i] = vals.get(idx++);\n    int target = vals.get(idx);\n\n    Map<Integer, Integer> seen = new HashMap<>();\n    for (int i = 0; i < n; i += 1) {\n      int need = target - nums[i];\n      if (seen.containsKey(need)) {\n        System.out.print(seen.get(need) + " " + i);\n        return;\n      }\n      seen.put(nums[i], i);\n    }\n\n    System.out.print("-1 -1");\n  }\n}\n`,
  c: `#include <stdio.h>\n\nint main(void) {\n  int n;\n  if (scanf("%d", &n) != 1) return 0;\n\n  int nums[10000];\n  for (int i = 0; i < n; i += 1) {\n    if (scanf("%d", &nums[i]) != 1) return 0;\n  }\n\n  int target;\n  if (scanf("%d", &target) != 1) return 0;\n\n  for (int i = 0; i < n; i += 1) {\n    for (int j = i + 1; j < n; j += 1) {\n      if (nums[i] + nums[j] == target) {\n        printf("%d %d", i, j);\n        return 0;\n      }\n    }\n  }\n\n  printf("-1 -1");\n  return 0;\n}\n`,
}

const PROBLEM_WRONG: Record<Exclude<RunLanguage, never>, string> = {
  python: 'print("-1 -1")\n',
  javascript: 'process.stdout.write("-1 -1")\n',
  cpp: '#include <iostream>\nint main(){ std::cout << "-1 -1"; return 0; }\n',
  java: 'class Main { public static void main(String[] args){ System.out.print("-1 -1"); }}\n',
  c: '#include <stdio.h>\nint main(void){ printf("-1 -1"); return 0; }\n',
}

async function runFunctionModeFor(language: 'python' | 'javascript' | 'cpp' | 'java') {
  const config = getUnitFunctionMode(language, 'hello-world')
  if (!config) {
    fail(`function-${language}-config`, 'Missing function mode config for hello-world.')
    return
  }

  const expected = 'Hello, Pebble!'

  for (const variant of ['correct', 'wrong'] as const) {
    const userCode = variant === 'correct' ? FUNCTION_CORRECT[language] : FUNCTION_WRONG[language]
    const caseName = `function-${language}-${variant}`

    if (language === 'python') {
      const runnable = buildFunctionModeRunnable({
        language,
        userCode,
        methodName: config.methodName,
        cases: [{ input: '', expectedText: expected, args: [], expectedValue: expected }],
      })
      if (!runnable) {
        fail(caseName, 'Failed to build python function-mode harness.')
        continue
      }

      const run = await runCodeLocally({ language, code: runnable.code, stdin: '', timeoutMs: 4000 })
      if (run.status === 'toolchain_unavailable') {
        skip(caseName, run.stderr)
        continue
      }
      if (!run.ok) {
        fail(caseName, `Runner failed: ${run.status} ${run.stderr}`)
        continue
      }

      const parsed = parseHarnessCasesFromStdout(run.stdout)
      if (!parsed || parsed.length === 0) {
        fail(caseName, 'Harness output was not parseable.')
        continue
      }
      const passed = parsed[0]?.passed === true
      if (variant === 'correct' && passed) {
        pass(caseName, 'Passed expected harness case.')
      } else if (variant === 'wrong' && !passed) {
        pass(caseName, 'Wrong solution correctly failed harness case.')
      } else {
        fail(caseName, `Unexpected harness verdict. passed=${String(passed)} actual=${parsed[0]?.actual ?? ''}`)
      }
      continue
    }

    const runnable = buildSingleCaseFunctionModeRunnable({
      language,
      userCode,
      methodName: config.methodName,
      args: [],
    })
    if (!runnable) {
      fail(caseName, 'Failed to build single-case wrapper.')
      continue
    }

    const run = await runCodeLocally({ language, code: runnable.code, stdin: '', timeoutMs: 4000 })
    if (run.status === 'toolchain_unavailable') {
      skip(caseName, run.stderr)
      continue
    }

    const actual = run.stdout.trim()
    const matched = run.ok && actual === expected
    if (variant === 'correct' && matched) {
      pass(caseName, `${run.status} output=${JSON.stringify(actual)}`)
    } else if (variant === 'wrong' && !matched) {
      pass(caseName, 'Wrong solution failed as expected.')
    } else {
      fail(caseName, `Unexpected verdict. status=${run.status} output=${JSON.stringify(actual)} stderr=${run.stderr}`)
    }
  }
}

async function runProblemModeFor(language: RunLanguage) {
  const problem = getProblemById('p-two-sum')
  if (!problem) {
    fail('problem-load', 'Missing p-two-sum from problems bank.')
    return
  }
  const testcase = problem.tests[0]
  if (!testcase) {
    fail('problem-load', 'Missing testcase for p-two-sum.')
    return
  }

  for (const variant of ['correct', 'wrong'] as const) {
    const code = variant === 'correct' ? PROBLEM_CORRECT[language] : PROBLEM_WRONG[language]
    const caseName = `problem-${language}-${variant}`

    const run = await runCodeLocally({
      language,
      code,
      stdin: testcase.input,
      timeoutMs: 4000,
    })

    if (run.status === 'toolchain_unavailable') {
      skip(caseName, run.stderr)
      continue
    }

    const actual = run.stdout.trim()
    const expected = testcase.expected.trim()
    const matched = run.ok && actual === expected

    if (variant === 'correct' && matched) {
      pass(caseName, `${run.status} output=${JSON.stringify(actual)}`)
    } else if (variant === 'wrong' && !matched) {
      pass(caseName, `Wrong output captured (${JSON.stringify(actual)})`)
    } else {
      fail(caseName, `Unexpected verdict. status=${run.status} output=${JSON.stringify(actual)} expected=${JSON.stringify(expected)} stderr=${run.stderr}`)
    }
  }
}

async function main() {
  if (getUnitFunctionMode('c', 'hello-world') !== null) {
    fail('function-c-disabled', 'C should be disabled for function mode but template is present.')
  } else {
    pass('function-c-disabled', 'C is disabled for function mode by template source-of-truth.')
  }

  for (const language of ['python', 'javascript', 'cpp', 'java'] as const) {
    await runFunctionModeFor(language)
  }

  for (const language of ['python', 'javascript', 'cpp', 'java', 'c'] as const) {
    await runProblemModeFor(language)
  }

  console.log(`\nSmoke summary: ${failures.length} failed, ${skipped.length} skipped.`)
  if (failures.length > 0) {
    console.error('\nFailures:')
    for (const entry of failures) {
      console.error(`- ${entry.name}: ${entry.detail}`)
    }
    process.exitCode = 1
    return
  }

  console.log('Runner mode smoke passed.')
}

void main()
