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

export type RunnerSourceMap = {
  fileName: string
  userStartLine: number
  userEndLine: number
}

export type RunnableBuildResult = {
  code: string
  sourceMap: RunnerSourceMap
}

export type SignatureValidationResult =
  | { ok: true }
  | {
      ok: false
      requiredSignature: string
      detectedSignature: string
      reason: 'missing_class' | 'missing_method' | 'param_count_mismatch'
    }

export function getUnitFunctionMode(language: PlacementLanguage, unitId: string) {
  return getFunctionModeTemplate(language, unitId)
}

export function buildFunctionModeRunnable(input: {
  language: PlacementLanguage
  userCode: string
  methodName: string
  cases: FunctionHarnessCase[]
}) {
  const code = buildHarnessRunnableCode(input)
  if (!code) {
    return null
  }
  return toRunnableResult(code, input.userCode, 'main.py')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeParams(language: PlacementLanguage, rawParams: string) {
  if (language === 'python') {
    const cleaned = rawParams
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*$/g, ''))
      .join(' ')

    const parts = cleaned
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/\s*=.*$/g, '').trim())
      .map((item) => item.replace(/\s*:.*$/g, '').trim())
      .filter((item) => item !== '/' && item !== '*')

    if (parts.length > 0 && parts[0] === 'self') {
      return parts.slice(1)
    }
    return parts
  }

  const parts = rawParams
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return parts
}

function countExpectedParams(signatureLabel: string) {
  const match = signatureLabel.match(/\(([^)]*)\)/)
  if (!match) {
    return 0
  }
  return match[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean).length
}

function extractMethodSignature(input: {
  language: PlacementLanguage
  userCode: string
  methodName: string
}) {
  const method = escapeRegExp(input.methodName)
  const code = input.userCode

  if (input.language === 'python') {
    const lines = code.split(/\r?\n/)
    const classStartIndex = lines.findIndex((line) => /^\s*class\s+Solution\b[^\n]*:\s*(?:#.*)?$/.test(line))
    if (classStartIndex < 0) {
      return null
    }

    const classIndentMatch = lines[classStartIndex].match(/^(\s*)/)
    const classIndent = classIndentMatch ? classIndentMatch[1] : ''
    let fallbackInClass: { methodName: string; params: string[] } | null = null

    const readPythonMethodSignature = (startIndex: number) => {
      const chunk: string[] = []
      let parenDepth = 0
      let started = false

      for (let cursor = startIndex; cursor < lines.length; cursor += 1) {
        const line = lines[cursor]
        const trimmed = line.trim()

        if (!started) {
          if (!trimmed || trimmed.startsWith('#')) {
            continue
          }
          started = true
        }

        chunk.push(trimmed)
        for (const ch of trimmed) {
          if (ch === '(') parenDepth += 1
          if (ch === ')') parenDepth -= 1
        }

        if (parenDepth <= 0 && /:\s*(?:#.*)?$/.test(trimmed)) {
          return chunk.join(' ')
        }
      }

      return chunk.join(' ')
    }

    for (let index = classStartIndex + 1; index < lines.length; index += 1) {
      const line = lines[index]
      const trimmed = line.trim()

      if (!trimmed) {
        continue
      }

      const leadingWhitespace = line.match(/^(\s*)/)?.[1] ?? ''
      const lineIsComment = trimmed.startsWith('#')
      if (
        !lineIsComment
        && leadingWhitespace.length <= classIndent.length
      ) {
        break
      }

      if (lineIsComment) {
        continue
      }

      if (!/^\s*def\s+[A-Za-z_]\w*\s*\(/.test(line)) {
        continue
      }

      const signatureText = readPythonMethodSignature(index)
      const parsed = signatureText.match(/^def\s+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)\s*(?:->\s*[\s\S]*?)?\s*:\s*(?:#.*)?$/)
      if (!parsed) {
        continue
      }

      const parsedName = parsed[1]
      const parsedParams = normalizeParams(input.language, parsed[2])
      if (parsedName === input.methodName) {
        return {
          found: true,
          methodName: input.methodName,
          params: parsedParams,
        }
      }

      if (!fallbackInClass) {
        fallbackInClass = {
          methodName: parsedName,
          params: parsedParams,
        }
      }
    }

    if (fallbackInClass) {
      return {
        found: false,
        methodName: fallbackInClass.methodName,
        params: fallbackInClass.params,
      }
    }
    return null
  }

  if (input.language === 'javascript') {
    const exact = new RegExp(`\\b${method}\\s*\\(([^)]*)\\)\\s*\\{`, 'm')
    const fallback = /\b([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/m
    const match = code.match(exact)
    if (match) {
      return {
        found: true,
        methodName: input.methodName,
        params: normalizeParams(input.language, match[1]),
      }
    }
    const fallbackMatch = code.match(fallback)
    if (fallbackMatch) {
      return {
        found: false,
        methodName: fallbackMatch[1],
        params: normalizeParams(input.language, fallbackMatch[2]),
      }
    }
    return null
  }

  if (input.language === 'java') {
    const exact = new RegExp(
      `(?:public|private|protected)?\\s*(?:static\\s+)?[\\w<>,\\[\\]\\s]+\\b${method}\\s*\\(([^)]*)\\)\\s*\\{`,
      'm',
    )
    const fallback =
      /(?:public|private|protected)?\s*(?:static\s+)?[\w<>,\[\]\s]+\b([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/m
    const match = code.match(exact)
    if (match) {
      return {
        found: true,
        methodName: input.methodName,
        params: normalizeParams(input.language, match[1]),
      }
    }
    const fallbackMatch = code.match(fallback)
    if (fallbackMatch) {
      return {
        found: false,
        methodName: fallbackMatch[1],
        params: normalizeParams(input.language, fallbackMatch[2]),
      }
    }
    return null
  }

  const exact = new RegExp(
    `[\\w:<>,\\[\\]&*\\s]+\\b${method}\\s*\\(([^)]*)\\)\\s*(?:const\\s*)?\\{`,
    'm',
  )
  const fallback = /[\w:<>,\[\]&*\s]+\b([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:const\s*)?\{/m
  const match = code.match(exact)
  if (match) {
    return {
      found: true,
      methodName: input.methodName,
      params: normalizeParams(input.language, match[1]),
    }
  }
  const fallbackMatch = code.match(fallback)
  if (fallbackMatch) {
    return {
      found: false,
      methodName: fallbackMatch[1],
      params: normalizeParams(input.language, fallbackMatch[2]),
    }
  }
  return null
}

function getClassCheckRegex(language: PlacementLanguage) {
  if (language === 'python') {
    return /class\s+Solution\b/m
  }
  return /\bclass\s+Solution\b/m
}

export function validateFunctionSignature(input: {
  language: PlacementLanguage
  userCode: string
  methodName: string
  signatureLabel: string
}): SignatureValidationResult {
  const classRegex = getClassCheckRegex(input.language)
  if (!classRegex.test(input.userCode)) {
    return {
      ok: false,
      requiredSignature: input.signatureLabel,
      detectedSignature: 'Solution class not found.',
      reason: 'missing_class',
    }
  }

  const extracted = extractMethodSignature({
    language: input.language,
    userCode: input.userCode,
    methodName: input.methodName,
  })

  if (!extracted || !extracted.found) {
    const detected = extracted
      ? `Found ${extracted.methodName}(${extracted.params.join(', ')})`
      : 'No method definition found.'
    return {
      ok: false,
      requiredSignature: input.signatureLabel,
      detectedSignature: detected,
      reason: 'missing_method',
    }
  }

  const expectedParamCount = countExpectedParams(input.signatureLabel)
  if (extracted.params.length !== expectedParamCount) {
    return {
      ok: false,
      requiredSignature: input.signatureLabel,
      detectedSignature: `${extracted.methodName}(${extracted.params.join(', ')})`,
      reason: 'param_count_mismatch',
    }
  }

  return { ok: true }
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

  const code = `${input.userCode}

const __solver = new Solution()
const __result = __solver.${input.methodName}(${literalArgs.join(', ')})
${formatJsOutput('__result')}
`
  return toRunnableResult(code, input.userCode, 'main.js')
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

  const code = `#include <iostream>
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
  return toRunnableResult(code, input.userCode, 'main.cpp')
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

  const code = `import java.util.*;

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
  return toRunnableResult(code, input.userCode, 'Main.java')
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

function toRunnableResult(code: string, userCode: string, fileName: string): RunnableBuildResult | null {
  const userStartIndex = code.indexOf(userCode)
  if (userStartIndex < 0) {
    return null
  }
  const prefix = code.slice(0, userStartIndex)
  const userStartLine = prefix.split(/\r?\n/).length
  const userLineCount = Math.max(1, userCode.split(/\r?\n/).length)
  return {
    code,
    sourceMap: {
      fileName,
      userStartLine,
      userEndLine: userStartLine + userLineCount - 1,
    },
  }
}

export { parseHarnessCasesFromStdout }
