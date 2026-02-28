import type { PlacementLanguage } from './onboardingData'
import type { CurriculumTestCase } from '../content/pathLoader'

export type FunctionHarnessCase = {
  input: string
  expectedText: string
  args: unknown[]
  expectedValue: unknown
}

export type FunctionModeTemplate = {
  unitId: string
  language: PlacementLanguage
  evalMode: 'function'
  signatureLabel: string
  methodName: string
  starterStub: string
  parseTestCase: (test: CurriculumTestCase) => FunctionHarnessCase | null
}

type UnitFunctionDefinition = {
  unitId: string
  parseTestCase: (test: CurriculumTestCase) => FunctionHarnessCase | null
  methodNameByLanguage: Record<PlacementLanguage, string>
  signatureByLanguage: Record<PlacementLanguage, string>
  starterStubByLanguage: Record<PlacementLanguage, string>
}

const FUNCTION_LANGUAGES: PlacementLanguage[] = ['python', 'javascript', 'cpp', 'java', 'c']

function tokensToInts(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isFinite(value))
}

function parseHelloWorldCase(test: CurriculumTestCase): FunctionHarnessCase {
  return {
    input: test.input,
    expectedText: test.expected.trim(),
    args: [],
    expectedValue: test.expected.trim(),
  }
}

function parseVariablesSumCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const values = tokensToInts(test.input)
  if (values.length < 2) {
    return null
  }

  const expectedValue = Number.parseInt(test.expected.trim(), 10)
  if (!Number.isFinite(expectedValue)) {
    return null
  }

  return {
    input: test.input,
    expectedText: String(expectedValue),
    args: [values[0], values[1]],
    expectedValue,
  }
}

function parseConditionalMaxCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  return parseVariablesSumCase(test)
}

function parseSumToNCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const values = tokensToInts(test.input)
  if (values.length < 1) {
    return null
  }

  const expectedValue = Number.parseInt(test.expected.trim(), 10)
  if (!Number.isFinite(expectedValue)) {
    return null
  }

  return {
    input: test.input,
    expectedText: String(expectedValue),
    args: [values[0]],
    expectedValue,
  }
}

function parseArraysMaxCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const nums = tokensToInts(test.input)
  const expectedValue = Number.parseInt(test.expected.trim(), 10)
  if (!Number.isFinite(expectedValue)) {
    return null
  }

  return {
    input: test.input,
    expectedText: String(expectedValue),
    args: [nums],
    expectedValue,
  }
}

function parseReverseStringCase(test: CurriculumTestCase): FunctionHarnessCase {
  const text = test.input.replace(/\r?\n$/, '')
  return {
    input: test.input,
    expectedText: test.expected.trim(),
    args: [text],
    expectedValue: test.expected.trim(),
  }
}

function parseTwoSumCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const lines = test.input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return null
  }

  const nums = lines[0]
    .split(/\s+/)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isFinite(value))

  const target = Number.parseInt(lines[1], 10)
  if (!Number.isFinite(target)) {
    return null
  }

  const expectedValue = test.expected
    .trim()
    .split(/\s+/)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isFinite(value))

  return {
    input: test.input,
    expectedText: test.expected.trim(),
    args: [nums, target],
    expectedValue,
  }
}

function parseBooleanTextCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const normalizedExpected = test.expected.trim().toLowerCase()
  if (normalizedExpected !== 'true' && normalizedExpected !== 'false') {
    return null
  }

  return {
    input: test.input,
    expectedText: normalizedExpected,
    args: [test.input.replace(/\r?\n$/, '')],
    expectedValue: normalizedExpected === 'true',
  }
}

function parsePrefixRangeCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const lines = test.input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return null
  }

  const nums = lines[0]
    .split(/\s+/)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isFinite(value))

  const [left, right] = lines[1]
    .split(/\s+/)
    .map((token) => Number.parseInt(token, 10))

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null
  }

  const expectedValue = Number.parseInt(test.expected.trim(), 10)
  if (!Number.isFinite(expectedValue)) {
    return null
  }

  return {
    input: test.input,
    expectedText: String(expectedValue),
    args: [nums, left, right],
    expectedValue,
  }
}

function parseSlidingWindowCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const lines = test.input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return null
  }

  const nums = lines[0]
    .split(/\s+/)
    .map((token) => Number.parseInt(token, 10))
    .filter((value) => Number.isFinite(value))

  const k = Number.parseInt(lines[1], 10)
  const expectedValue = Number.parseInt(test.expected.trim(), 10)

  if (!Number.isFinite(k) || !Number.isFinite(expectedValue)) {
    return null
  }

  return {
    input: test.input,
    expectedText: String(expectedValue),
    args: [nums, k],
    expectedValue,
  }
}

function parseSingleIntCase(test: CurriculumTestCase): FunctionHarnessCase | null {
  const value = Number.parseInt(test.input.trim(), 10)
  const expectedValue = Number.parseInt(test.expected.trim(), 10)

  if (!Number.isFinite(value) || !Number.isFinite(expectedValue)) {
    return null
  }

  return {
    input: test.input,
    expectedText: String(expectedValue),
    args: [value],
    expectedValue,
  }
}

const cppClassPrefix = 'class Solution {\npublic:\n'
const cppClassSuffix = '\n};\n'

const UNIT_FUNCTION_DEFINITIONS: UnitFunctionDefinition[] = [
  {
    unitId: 'hello-world',
    parseTestCase: parseHelloWorldCase,
    methodNameByLanguage: {
      python: 'solve',
      javascript: 'solve',
      cpp: 'solve',
      java: 'solve',
      c: 'solve',
    },
    signatureByLanguage: {
      python: 'Solution.solve() -> str',
      javascript: 'Solution.solve() => string',
      cpp: 'Solution::solve() -> string',
      java: 'Solution.solve() -> String',
      c: 'Solution::solve() -> string',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def solve(self) -> str:\n        return ""\n`,
      javascript: `class Solution {\n  solve() {\n    return ''\n  }\n}\n`,
      cpp: `#include <string>\nusing namespace std;\n\n${cppClassPrefix}  string solve() {\n    return \"\";\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public String solve() {\n    return \"\";\n  }\n}\n`,
      c: `#include <string>\nusing namespace std;\n\n${cppClassPrefix}  string solve() {\n    return \"\";\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'variables-sum',
    parseTestCase: parseVariablesSumCase,
    methodNameByLanguage: {
      python: 'solve', javascript: 'solve', cpp: 'solve', java: 'solve', c: 'solve',
    },
    signatureByLanguage: {
      python: 'Solution.solve(a: int, b: int) -> int',
      javascript: 'Solution.solve(a, b) => number',
      cpp: 'Solution::solve(int a, int b) -> int',
      java: 'Solution.solve(int a, int b) -> int',
      c: 'Solution::solve(int a, int b) -> int',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def solve(self, a: int, b: int) -> int:\n        return 0\n`,
      javascript: `class Solution {\n  solve(a, b) {\n    return 0\n  }\n}\n`,
      cpp: `${cppClassPrefix}  int solve(int a, int b) {\n    return 0;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int solve(int a, int b) {\n    return 0;\n  }\n}\n`,
      c: `${cppClassPrefix}  int solve(int a, int b) {\n    return 0;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'conditional-max',
    parseTestCase: parseConditionalMaxCase,
    methodNameByLanguage: { python: 'maxOfTwo', javascript: 'maxOfTwo', cpp: 'maxOfTwo', java: 'maxOfTwo', c: 'maxOfTwo' },
    signatureByLanguage: {
      python: 'Solution.maxOfTwo(a: int, b: int) -> int',
      javascript: 'Solution.maxOfTwo(a, b) => number',
      cpp: 'Solution::maxOfTwo(int a, int b) -> int',
      java: 'Solution.maxOfTwo(int a, int b) -> int',
      c: 'Solution::maxOfTwo(int a, int b) -> int',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def maxOfTwo(self, a: int, b: int) -> int:\n        return 0\n`,
      javascript: `class Solution {\n  maxOfTwo(a, b) {\n    return 0\n  }\n}\n`,
      cpp: `${cppClassPrefix}  int maxOfTwo(int a, int b) {\n    return 0;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int maxOfTwo(int a, int b) {\n    return 0;\n  }\n}\n`,
      c: `${cppClassPrefix}  int maxOfTwo(int a, int b) {\n    return 0;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'loops-sum-n',
    parseTestCase: parseSumToNCase,
    methodNameByLanguage: { python: 'sumToN', javascript: 'sumToN', cpp: 'sumToN', java: 'sumToN', c: 'sumToN' },
    signatureByLanguage: {
      python: 'Solution.sumToN(n: int) -> int',
      javascript: 'Solution.sumToN(n) => number',
      cpp: 'Solution::sumToN(int n) -> int',
      java: 'Solution.sumToN(int n) -> int',
      c: 'Solution::sumToN(int n) -> int',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def sumToN(self, n: int) -> int:\n        return 0\n`,
      javascript: `class Solution {\n  sumToN(n) {\n    return 0\n  }\n}\n`,
      cpp: `${cppClassPrefix}  int sumToN(int n) {\n    return 0;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int sumToN(int n) {\n    return 0;\n  }\n}\n`,
      c: `${cppClassPrefix}  int sumToN(int n) {\n    return 0;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'arrays-max',
    parseTestCase: parseArraysMaxCase,
    methodNameByLanguage: { python: 'maxValue', javascript: 'maxValue', cpp: 'maxValue', java: 'maxValue', c: 'maxValue' },
    signatureByLanguage: {
      python: 'Solution.maxValue(nums: List[int]) -> int',
      javascript: 'Solution.maxValue(nums) => number',
      cpp: 'Solution::maxValue(const vector<int>& nums) -> int',
      java: 'Solution.maxValue(int[] nums) -> int',
      c: 'Solution::maxValue(const vector<int>& nums) -> int',
    },
    starterStubByLanguage: {
      python: `from typing import List\n\nclass Solution:\n    def maxValue(self, nums: List[int]) -> int:\n        return 0\n`,
      javascript: `class Solution {\n  maxValue(nums) {\n    return 0\n  }\n}\n`,
      cpp: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  int maxValue(const vector<int>& nums) {\n    return 0;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int maxValue(int[] nums) {\n    return 0;\n  }\n}\n`,
      c: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  int maxValue(const vector<int>& nums) {\n    return 0;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'strings-reverse',
    parseTestCase: parseReverseStringCase,
    methodNameByLanguage: { python: 'reverseText', javascript: 'reverseText', cpp: 'reverseText', java: 'reverseText', c: 'reverseText' },
    signatureByLanguage: {
      python: 'Solution.reverseText(text: str) -> str',
      javascript: 'Solution.reverseText(text) => string',
      cpp: 'Solution::reverseText(const string& text) -> string',
      java: 'Solution.reverseText(String text) -> String',
      c: 'Solution::reverseText(const string& text) -> string',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def reverseText(self, text: str) -> str:\n        return \"\"\n`,
      javascript: `class Solution {\n  reverseText(text) {\n    return ''\n  }\n}\n`,
      cpp: `#include <string>\nusing namespace std;\n\n${cppClassPrefix}  string reverseText(const string& text) {\n    return \"\";\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public String reverseText(String text) {\n    return \"\";\n  }\n}\n`,
      c: `#include <string>\nusing namespace std;\n\n${cppClassPrefix}  string reverseText(const string& text) {\n    return \"\";\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'dsa-two-sum',
    parseTestCase: parseTwoSumCase,
    methodNameByLanguage: { python: 'twoSum', javascript: 'twoSum', cpp: 'twoSum', java: 'twoSum', c: 'twoSum' },
    signatureByLanguage: {
      python: 'Solution.twoSum(nums: List[int], target: int) -> List[int]',
      javascript: 'Solution.twoSum(nums, target) => number[]',
      cpp: 'Solution::twoSum(const vector<int>& nums, int target) -> vector<int>',
      java: 'Solution.twoSum(int[] nums, int target) -> int[]',
      c: 'Solution::twoSum(const vector<int>& nums, int target) -> vector<int>',
    },
    starterStubByLanguage: {
      python: `from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        return []\n`,
      javascript: `class Solution {\n  twoSum(nums, target) {\n    return []\n  }\n}\n`,
      cpp: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  vector<int> twoSum(const vector<int>& nums, int target) {\n    return {};\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int[] twoSum(int[] nums, int target) {\n    return new int[0];\n  }\n}\n`,
      c: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  vector<int> twoSum(const vector<int>& nums, int target) {\n    return {};\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'dsa-palindrome',
    parseTestCase: parseBooleanTextCase,
    methodNameByLanguage: { python: 'isPalindrome', javascript: 'isPalindrome', cpp: 'isPalindrome', java: 'isPalindrome', c: 'isPalindrome' },
    signatureByLanguage: {
      python: 'Solution.isPalindrome(text: str) -> bool',
      javascript: 'Solution.isPalindrome(text) => boolean',
      cpp: 'Solution::isPalindrome(const string& text) -> bool',
      java: 'Solution.isPalindrome(String text) -> boolean',
      c: 'Solution::isPalindrome(const string& text) -> bool',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def isPalindrome(self, text: str) -> bool:\n        return False\n`,
      javascript: `class Solution {\n  isPalindrome(text) {\n    return false\n  }\n}\n`,
      cpp: `#include <string>\nusing namespace std;\n\n${cppClassPrefix}  bool isPalindrome(const string& text) {\n    return false;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public boolean isPalindrome(String text) {\n    return false;\n  }\n}\n`,
      c: `#include <string>\nusing namespace std;\n\n${cppClassPrefix}  bool isPalindrome(const string& text) {\n    return false;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'prefix-sum-range',
    parseTestCase: parsePrefixRangeCase,
    methodNameByLanguage: { python: 'rangeSum', javascript: 'rangeSum', cpp: 'rangeSum', java: 'rangeSum', c: 'rangeSum' },
    signatureByLanguage: {
      python: 'Solution.rangeSum(nums: List[int], l: int, r: int) -> int',
      javascript: 'Solution.rangeSum(nums, l, r) => number',
      cpp: 'Solution::rangeSum(const vector<int>& nums, int l, int r) -> int',
      java: 'Solution.rangeSum(int[] nums, int l, int r) -> int',
      c: 'Solution::rangeSum(const vector<int>& nums, int l, int r) -> int',
    },
    starterStubByLanguage: {
      python: `from typing import List\n\nclass Solution:\n    def rangeSum(self, nums: List[int], l: int, r: int) -> int:\n        return 0\n`,
      javascript: `class Solution {\n  rangeSum(nums, l, r) {\n    return 0\n  }\n}\n`,
      cpp: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  int rangeSum(const vector<int>& nums, int l, int r) {\n    return 0;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int rangeSum(int[] nums, int l, int r) {\n    return 0;\n  }\n}\n`,
      c: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  int rangeSum(const vector<int>& nums, int l, int r) {\n    return 0;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'sliding-window-max-sum-k',
    parseTestCase: parseSlidingWindowCase,
    methodNameByLanguage: { python: 'maxWindowSum', javascript: 'maxWindowSum', cpp: 'maxWindowSum', java: 'maxWindowSum', c: 'maxWindowSum' },
    signatureByLanguage: {
      python: 'Solution.maxWindowSum(nums: List[int], k: int) -> int',
      javascript: 'Solution.maxWindowSum(nums, k) => number',
      cpp: 'Solution::maxWindowSum(const vector<int>& nums, int k) -> int',
      java: 'Solution.maxWindowSum(int[] nums, int k) -> int',
      c: 'Solution::maxWindowSum(const vector<int>& nums, int k) -> int',
    },
    starterStubByLanguage: {
      python: `from typing import List\n\nclass Solution:\n    def maxWindowSum(self, nums: List[int], k: int) -> int:\n        return 0\n`,
      javascript: `class Solution {\n  maxWindowSum(nums, k) {\n    return 0\n  }\n}\n`,
      cpp: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  int maxWindowSum(const vector<int>& nums, int k) {\n    return 0;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int maxWindowSum(int[] nums, int k) {\n    return 0;\n  }\n}\n`,
      c: `#include <vector>\nusing namespace std;\n\n${cppClassPrefix}  int maxWindowSum(const vector<int>& nums, int k) {\n    return 0;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'recursion-factorial',
    parseTestCase: parseSingleIntCase,
    methodNameByLanguage: { python: 'factorial', javascript: 'factorial', cpp: 'factorial', java: 'factorial', c: 'factorial' },
    signatureByLanguage: {
      python: 'Solution.factorial(n: int) -> int',
      javascript: 'Solution.factorial(n) => number',
      cpp: 'Solution::factorial(int n) -> int',
      java: 'Solution.factorial(int n) -> int',
      c: 'Solution::factorial(int n) -> int',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def factorial(self, n: int) -> int:\n        return 1\n`,
      javascript: `class Solution {\n  factorial(n) {\n    return 1\n  }\n}\n`,
      cpp: `${cppClassPrefix}  int factorial(int n) {\n    return 1;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int factorial(int n) {\n    return 1;\n  }\n}\n`,
      c: `${cppClassPrefix}  int factorial(int n) {\n    return 1;\n  }${cppClassSuffix}`,
    },
  },
  {
    unitId: 'dp-climb-stairs',
    parseTestCase: parseSingleIntCase,
    methodNameByLanguage: { python: 'climbStairs', javascript: 'climbStairs', cpp: 'climbStairs', java: 'climbStairs', c: 'climbStairs' },
    signatureByLanguage: {
      python: 'Solution.climbStairs(n: int) -> int',
      javascript: 'Solution.climbStairs(n) => number',
      cpp: 'Solution::climbStairs(int n) -> int',
      java: 'Solution.climbStairs(int n) -> int',
      c: 'Solution::climbStairs(int n) -> int',
    },
    starterStubByLanguage: {
      python: `class Solution:\n    def climbStairs(self, n: int) -> int:\n        return 0\n`,
      javascript: `class Solution {\n  climbStairs(n) {\n    return 0\n  }\n}\n`,
      cpp: `${cppClassPrefix}  int climbStairs(int n) {\n    return 0;\n  }${cppClassSuffix}`,
      java: `class Solution {\n  public int climbStairs(int n) {\n    return 0;\n  }\n}\n`,
      c: `${cppClassPrefix}  int climbStairs(int n) {\n    return 0;\n  }${cppClassSuffix}`,
    },
  },
]

const FUNCTION_MODE_TEMPLATES: FunctionModeTemplate[] = UNIT_FUNCTION_DEFINITIONS.flatMap((definition) =>
  FUNCTION_LANGUAGES.map((language) => ({
    unitId: definition.unitId,
    language,
    evalMode: 'function' as const,
    signatureLabel: definition.signatureByLanguage[language],
    methodName: definition.methodNameByLanguage[language],
    starterStub: definition.starterStubByLanguage[language],
    parseTestCase: definition.parseTestCase,
  })),
)

export function getFunctionModeTemplate(language: PlacementLanguage, unitId: string) {
  return FUNCTION_MODE_TEMPLATES.find(
    (config) => config.language === language && config.unitId === unitId,
  ) ?? null
}
