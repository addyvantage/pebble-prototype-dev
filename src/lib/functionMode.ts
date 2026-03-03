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

function normalizeSourceText(value: string) {
  return value.replace(/\r\n?/g, '\n')
}

function stripCommentsAndStrings(source: string) {
  let output = ''
  let index = 0
  let state: 'normal' | 'line_comment' | 'block_comment' | 'single_quote' | 'double_quote' | 'template' = 'normal'

  while (index < source.length) {
    const current = source[index]
    const next = source[index + 1] ?? ''

    if (state === 'line_comment') {
      if (current === '\n') {
        output += '\n'
        state = 'normal'
      } else {
        output += ' '
      }
      index += 1
      continue
    }

    if (state === 'block_comment') {
      if (current === '*' && next === '/') {
        output += '  '
        index += 2
        state = 'normal'
        continue
      }
      output += current === '\n' ? '\n' : ' '
      index += 1
      continue
    }

    if (state === 'single_quote') {
      if (current === '\\' && next) {
        output += '  '
        index += 2
        continue
      }
      output += current === '\n' ? '\n' : ' '
      if (current === '\'') {
        state = 'normal'
      }
      index += 1
      continue
    }

    if (state === 'double_quote') {
      if (current === '\\' && next) {
        output += '  '
        index += 2
        continue
      }
      output += current === '\n' ? '\n' : ' '
      if (current === '"') {
        state = 'normal'
      }
      index += 1
      continue
    }

    if (state === 'template') {
      if (current === '\\' && next) {
        output += '  '
        index += 2
        continue
      }
      output += current === '\n' ? '\n' : ' '
      if (current === '`') {
        state = 'normal'
      }
      index += 1
      continue
    }

    if (current === '/' && next === '/') {
      output += '  '
      index += 2
      state = 'line_comment'
      continue
    }

    if (current === '/' && next === '*') {
      output += '  '
      index += 2
      state = 'block_comment'
      continue
    }

    if (current === '\'') {
      output += ' '
      index += 1
      state = 'single_quote'
      continue
    }

    if (current === '"') {
      output += ' '
      index += 1
      state = 'double_quote'
      continue
    }

    if (current === '`') {
      output += ' '
      index += 1
      state = 'template'
      continue
    }

    output += current
    index += 1
  }

  return output
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

function findMatching(source: string, openIndex: number, open: string, close: string) {
  let depth = 0
  for (let cursor = openIndex; cursor < source.length; cursor += 1) {
    const char = source[cursor]
    if (char === open) {
      depth += 1
      continue
    }
    if (char === close) {
      depth -= 1
      if (depth === 0) {
        return cursor
      }
    }
  }
  return -1
}

function findClassBodyRange(sanitizedCode: string, className: string) {
  const classPattern = new RegExp(`\\bclass\\s+${escapeRegExp(className)}\\b`, 'm')
  const classMatch = classPattern.exec(sanitizedCode)
  if (!classMatch || classMatch.index < 0) {
    return null
  }

  const braceIndex = sanitizedCode.indexOf('{', classMatch.index + classMatch[0].length)
  if (braceIndex < 0) {
    return null
  }

  const braceEndIndex = findMatching(sanitizedCode, braceIndex, '{', '}')
  if (braceEndIndex < 0) {
    return null
  }

  return {
    start: braceIndex + 1,
    end: braceEndIndex,
  }
}

function isIdentifierChar(value: string) {
  return /[A-Za-z0-9_]/.test(value)
}

function skipWhitespace(source: string, start: number) {
  let cursor = start
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1
  }
  return cursor
}

function skipTrailingModifiers(source: string, start: number) {
  let cursor = skipWhitespace(source, start)

  while (cursor < source.length) {
    if (source.startsWith('const', cursor) && !isIdentifierChar(source[cursor + 5] ?? '')) {
      cursor = skipWhitespace(source, cursor + 5)
      continue
    }
    if (source.startsWith('noexcept', cursor) && !isIdentifierChar(source[cursor + 8] ?? '')) {
      cursor = skipWhitespace(source, cursor + 8)
      continue
    }
    if (source.startsWith('override', cursor) && !isIdentifierChar(source[cursor + 8] ?? '')) {
      cursor = skipWhitespace(source, cursor + 8)
      continue
    }
    if (source.startsWith('final', cursor) && !isIdentifierChar(source[cursor + 5] ?? '')) {
      cursor = skipWhitespace(source, cursor + 5)
      continue
    }
    if (source.startsWith('throws', cursor) && !isIdentifierChar(source[cursor + 6] ?? '')) {
      cursor += 6
      while (cursor < source.length && source[cursor] !== '{' && source[cursor] !== ';') {
        cursor += 1
      }
      cursor = skipWhitespace(source, cursor)
      continue
    }
    if (source[cursor] === '-' && source[cursor + 1] === '>') {
      cursor += 2
      while (cursor < source.length && source[cursor] !== '{' && source[cursor] !== ';') {
        cursor += 1
      }
      cursor = skipWhitespace(source, cursor)
      continue
    }
    break
  }

  return cursor
}

const NON_METHOD_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'sizeof', 'typeof'])

function extractClassMethodSignatures(input: {
  language: PlacementLanguage
  userCode: string
  className: string
  methodName: string
}) {
  const normalizedCode = normalizeSourceText(input.userCode)
  const sanitizedCode = stripCommentsAndStrings(normalizedCode)
  const classRange = findClassBodyRange(sanitizedCode, input.className)
  if (!classRange) {
    return null
  }

  const classBodySanitized = sanitizedCode.slice(classRange.start, classRange.end)
  const classBodyRaw = normalizedCode.slice(classRange.start, classRange.end)
  let fallbackInClass: { methodName: string; params: string[] } | null = null

  let braceDepth = 0
  for (let index = 0; index < classBodySanitized.length; index += 1) {
    const char = classBodySanitized[index]
    if (char === '{') {
      braceDepth += 1
      continue
    }
    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1)
      continue
    }
    if (braceDepth !== 0 || char !== '(') {
      continue
    }

    const paramsEnd = findMatching(classBodySanitized, index, '(', ')')
    if (paramsEnd < 0) {
      continue
    }

    let nameEnd = index - 1
    while (nameEnd >= 0 && /\s/.test(classBodySanitized[nameEnd])) {
      nameEnd -= 1
    }
    if (nameEnd < 0 || !(isIdentifierChar(classBodySanitized[nameEnd]) || classBodySanitized[nameEnd] === '~')) {
      continue
    }

    let nameStart = nameEnd
    while (
      nameStart >= 0
      && (isIdentifierChar(classBodySanitized[nameStart]) || classBodySanitized[nameStart] === '~')
    ) {
      nameStart -= 1
    }
    const parsedName = classBodySanitized.slice(nameStart + 1, nameEnd + 1).trim()
    if (!parsedName || NON_METHOD_KEYWORDS.has(parsedName)) {
      continue
    }

    const afterModifiers = skipTrailingModifiers(classBodySanitized, paramsEnd + 1)
    if (classBodySanitized[afterModifiers] !== '{') {
      continue
    }

    const rawParams = classBodyRaw.slice(index + 1, paramsEnd)
    const parsedParams = normalizeParams(input.language, rawParams)
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

    index = afterModifiers
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

function extractMethodSignature(input: {
  language: PlacementLanguage
  userCode: string
  methodName: string
}) {
  const code = normalizeSourceText(input.userCode)

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

  return extractClassMethodSignatures({
    language: input.language,
    userCode: code,
    className: 'Solution',
    methodName: input.methodName,
  })
}

function getClassCheckRegex(language: PlacementLanguage) {
  if (language === 'python') {
    return /^\s*class\s+Solution\b/m
  }
  return /\bclass\s+Solution\b/m
}

export function validateFunctionSignature(input: {
  language: PlacementLanguage
  userCode: string
  methodName: string
  signatureLabel: string
}): SignatureValidationResult {
  const normalizedUserCode = normalizeSourceText(input.userCode)
  const classRegex = getClassCheckRegex(input.language)
  if (!classRegex.test(stripCommentsAndStrings(normalizedUserCode))) {
    return {
      ok: false,
      requiredSignature: input.signatureLabel,
      detectedSignature: 'Solution class not found.',
      reason: 'missing_class',
    }
  }

  const extracted = extractMethodSignature({
    language: input.language,
    userCode: normalizedUserCode,
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
  return toRunnableResult(code, input.userCode, 'main.cjs')
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

static void __pebblePrint(const vector<int>& values) {
  __pebblePrintVector(values);
}

static void __pebblePrint(bool value) {
  cout << (value ? "true" : "false");
}

template <typename T>
static void __pebblePrint(const T& value) {
  cout << value;
}

int main() {
  Solution __solver;
  auto __result = __solver.${input.methodName}(${literalArgs.join(', ')});
  __pebblePrint(__result);
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

  if (input.language === 'cpp') {
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
