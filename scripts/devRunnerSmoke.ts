import { runCodeLocally } from '../server/runnerLocal.ts'
import type { RunLanguage } from '../server/runnerShared.ts'

type CaseDef = {
  language: RunLanguage
  name: string
  code: string
  stdin: string
  expected: string
}

const CASES: CaseDef[] = [
  {
    language: 'python',
    name: 'hello-python',
    code: "print('Hello, Pebble!')\n",
    stdin: '',
    expected: 'Hello, Pebble!',
  },
  {
    language: 'javascript',
    name: 'hello-js',
    code: "process.stdout.write('Hello, Pebble!')\n",
    stdin: '',
    expected: 'Hello, Pebble!',
  },
  {
    language: 'cpp',
    name: 'hello-cpp',
    code: '#include <iostream>\nint main(){ std::cout << "Hello, Pebble!"; return 0; }\n',
    stdin: '',
    expected: 'Hello, Pebble!',
  },
  {
    language: 'java',
    name: 'hello-java',
    code: 'class Main { public static void main(String[] args){ System.out.print("Hello, Pebble!"); }}\n',
    stdin: '',
    expected: 'Hello, Pebble!',
  },
  {
    language: 'c',
    name: 'hello-c',
    code: '#include <stdio.h>\nint main(void){ printf("Hello, Pebble!"); return 0; }\n',
    stdin: '',
    expected: 'Hello, Pebble!',
  },
]

async function main() {
  const failures: string[] = []

  for (const item of CASES) {
    const result = await runCodeLocally({
      language: item.language,
      code: item.code,
      stdin: item.stdin,
      timeoutMs: 4000,
    })

    if (result.status === 'toolchain_unavailable') {
      console.log(`[skip] ${item.name} (${item.language}): ${result.stderr}`)
      continue
    }

    const actual = result.stdout.trim()
    const pass = result.ok && actual === item.expected
    if (!pass) {
      failures.push(item.name)
      console.log(`[fail] ${item.name} (${item.language}) status=${result.status} exit=${result.exitCode}`)
      console.log(`  stdout=${JSON.stringify(actual)}`)
      console.log(`  stderr=${JSON.stringify(result.stderr)}`)
      continue
    }

    console.log(`[pass] ${item.name} (${item.language}) duration=${result.durationMs}ms`)
  }

  if (failures.length > 0) {
    console.error(`Runner smoke failed: ${failures.join(', ')}`)
    process.exitCode = 1
    return
  }

  console.log('Runner smoke passed.')
}

void main()
