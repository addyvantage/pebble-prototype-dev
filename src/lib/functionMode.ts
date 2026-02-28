import type { PlacementLanguage } from '../data/onboardingData'
import {
  getFunctionModeTemplate,
  type FunctionHarnessCase,
  type FunctionModeTemplate,
} from '../data/functionModeTemplates'
import {
  buildRunnableCode as buildHarnessRunnableCode,
  parseHarnessCasesFromStdout,
  type ParsedHarnessCase,
} from '../utils/harness'

export type { FunctionModeTemplate, FunctionHarnessCase, ParsedHarnessCase }

export function getUnitFunctionMode(language: PlacementLanguage, unitId: string) {
  return getFunctionModeTemplate(language, unitId)
}

export function buildFunctionModeRunnable(input: {
  language: PlacementLanguage
  userCode: string
  methodName: string
  cases: FunctionHarnessCase[]
}) {
  return buildHarnessRunnableCode(input)
}

function escapeCppString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function escapeJavaString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

function toJsLiteral(value: unknown): string | null {
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function toCppLiteral(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'string') {
    return `"${escapeCppString(value)}"`
  }

  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  ) {
    return `std::vector<int>{${value.map((item) => String(Math.trunc(item))).join(', ')}}`
  }

  return null
}

function toJavaLiteral(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'string') {
    return `"${escapeJavaString(value)}"`
  }

  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  ) {
    return `new int[]{${value.map((item) => String(Math.trunc(item))).join(', ')}}`
  }

  return null
}

function formatJsOutput(valueName: string) {
  return `if (Array.isArray(${valueName})) {
  process.stdout.write(${valueName}.join(' '))
} else if (typeof ${valueName} === 'boolean') {
  process.stdout.write(${valueName} ? 'true' : 'false')
} else if (typeof ${valueName} === 'string') {
  process.stdout.write(${valueName})
} else {
  process.stdout.write(String(${valueName}))
}`
}

function buildJavascriptSingleCase(input: {
  userCode: string
  methodName: string
  args: unknown[]
}) {
  const literalArgs = input.args.map((arg) => toJsLiteral(arg))
  if (literalArgs.some((arg) => arg === null)) {
    return null
  }

  return `${input.userCode}

const __solver = new Solution()
const __result = __solver.${input.methodName}(${literalArgs.join(', ')})
${formatJsOutput('__result')}
`
}

function buildCppSingleCase(input: {
  userCode: string
  methodName: string
  args: unknown[]
}) {
  const literalArgs = input.args.map((arg) => toCppLiteral(arg))
  if (literalArgs.some((arg) => arg === null)) {
    return null
  }

  return `#include <iostream>
#include <string>
#include <vector>
#include <type_traits>

using namespace std;

${input.userCode}

static void __pebblePrintVector(const vector<int>& values) {
  for (size_t i = 0; i < values.size(); i += 1) {
    if (i > 0) {
      cout << ' ';
    }
    cout << values[i];
  }
}

int main() {
  Solution __solver;
  auto __result = __solver.${input.methodName}(${literalArgs.join(', ')});
  using __ResultType = decay_t<decltype(__result)>;

  if constexpr (is_same_v<__ResultType, vector<int>>) {
    __pebblePrintVector(__result);
  } else if constexpr (is_same_v<__ResultType, bool>) {
    cout << (__result ? "true" : "false");
  } else {
    cout << __result;
  }

  return 0;
}
`
}

function buildJavaSingleCase(input: {
  userCode: string
  methodName: string
  args: unknown[]
}) {
  const literalArgs = input.args.map((arg) => toJavaLiteral(arg))
  if (literalArgs.some((arg) => arg === null)) {
    return null
  }

  return `import java.util.*;

${input.userCode}

public class Main {
  private static String __formatResult(Object value) {
    if (value instanceof int[]) {
      int[] arr = (int[]) value;
      StringBuilder out = new StringBuilder();
      for (int i = 0; i < arr.length; i++) {
        if (i > 0) out.append(' ');
        out.append(arr[i]);
      }
      return out.toString();
    }

    if (value instanceof Boolean) {
      return ((Boolean) value) ? "true" : "false";
    }

    return String.valueOf(value);
  }

  public static void main(String[] args) {
    Solution solver = new Solution();
    Object result = solver.${input.methodName}(${literalArgs.join(', ')});
    System.out.print(__formatResult(result));
  }
}
`
}

export function buildSingleCaseFunctionModeRunnable(input: {
  language: PlacementLanguage
  userCode: string
  methodName: string
  args: unknown[]
}) {
  if (input.language === 'javascript') {
    return buildJavascriptSingleCase(input)
  }

  if (input.language === 'cpp' || input.language === 'c') {
    return buildCppSingleCase(input)
  }

  if (input.language === 'java') {
    return buildJavaSingleCase(input)
  }

  return null
}

export { parseHarnessCasesFromStdout }
