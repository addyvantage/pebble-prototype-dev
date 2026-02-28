import type { PlacementLanguage } from './onboardingData'
import type { LanguageCode } from '../i18n/languages'
import { SOLUTION_COPY, type LocalizedSolutionCopy } from '../i18n/solutionCopy'

export type UnitSolution = {
  unitId: string
  title: string
  intuition: string
  approach: string[]
  complexity: {
    time: string
    space: string
  }
  implementations: Partial<Record<PlacementLanguage, string>>
  localized?: Partial<Record<LanguageCode, LocalizedSolutionCopy>>
}

const solutions: UnitSolution[] = [
  {
    unitId: 'hello-world',
    title: 'How to solve',
    intuition: 'This is a warm-up: return one exact string with punctuation intact.',
    approach: [
      'Implement `solve` with no inputs.',
      'Return the exact target text.',
      'Avoid extra spaces or line breaks.',
    ],
    complexity: { time: 'O(1)', space: 'O(1)' },
    implementations: {
      python: `class Solution:\n    def solve(self) -> str:\n        return "Hello, Pebble!"`,
    },
  },
  {
    unitId: 'variables-sum',
    title: 'How to solve',
    intuition: 'Add two numbers directly and return the result.',
    approach: ['Receive `a` and `b` as integers.', 'Compute `a + b`.', 'Return the sum.'],
    complexity: { time: 'O(1)', space: 'O(1)' },
    implementations: {
      python: `class Solution:\n    def solve(self, a: int, b: int) -> int:\n        return a + b`,
    },
  },
  {
    unitId: 'conditional-max',
    title: 'How to solve',
    intuition: 'You only need to compare two values once.',
    approach: [
      'Check whether `a` is greater than `b`.',
      'Return `a` if true, otherwise return `b`.',
      'Built-in max also works.',
    ],
    complexity: { time: 'O(1)', space: 'O(1)' },
    implementations: {
      python: `class Solution:\n    def maxOfTwo(self, a: int, b: int) -> int:\n        return a if a > b else b`,
    },
  },
  {
    unitId: 'loops-sum-n',
    title: 'How to solve',
    intuition: 'Accumulate values from 1 to n with a running total.',
    approach: [
      'Initialize `total = 0`.',
      'Loop `value` from 1 through `n` inclusive.',
      'Add each `value` to `total` and return `total`.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)' },
    implementations: {
      python: `class Solution:\n    def sumToN(self, n: int) -> int:\n        total = 0\n        for value in range(1, n + 1):\n            total += value\n        return total`,
    },
  },
  {
    unitId: 'arrays-max',
    title: 'How to solve',
    intuition: 'Track the best value seen as you scan the array.',
    approach: [
      'Start with the first element as current maximum.',
      'Iterate through all numbers and update max when needed.',
      'Return the final maximum.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)' },
    implementations: {
      python: `from typing import List\n\nclass Solution:\n    def maxValue(self, nums: List[int]) -> int:\n        best = nums[0]\n        for value in nums:\n            if value > best:\n                best = value\n        return best`,
    },
  },
  {
    unitId: 'strings-reverse',
    title: 'How to solve',
    intuition: 'Python slicing can reverse a string in one operation.',
    approach: [
      'Receive the input string.',
      'Use reverse slicing with `[::-1]`.',
      'Return the reversed string.',
    ],
    complexity: { time: 'O(n)', space: 'O(n)' },
    implementations: {
      python: `class Solution:\n    def reverseText(self, text: str) -> str:\n        return text[::-1]`,
    },
  },
  {
    unitId: 'dsa-two-sum',
    title: 'How to solve',
    intuition: 'A hash map lets you find complements in one pass.',
    approach: [
      'Iterate through numbers once.',
      'For each value, compute `target - value`.',
      'If complement exists in map, return stored index and current index.',
      'Otherwise store current value and index.',
    ],
    complexity: { time: 'O(n)', space: 'O(n)' },
    implementations: {
      python: `from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for idx, value in enumerate(nums):\n            need = target - value\n            if need in seen:\n                return [seen[need], idx]\n            seen[value] = idx\n        return []`,
      javascript: `class Solution {\n  twoSum(nums, target) {\n    const seen = new Map()\n    for (let i = 0; i < nums.length; i += 1) {\n      const need = target - nums[i]\n      if (seen.has(need)) return [seen.get(need), i]\n      seen.set(nums[i], i)\n    }\n    return []\n  }\n}`,
      cpp: `#include <unordered_map>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n  vector<int> twoSum(const vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < static_cast<int>(nums.size()); i++) {\n      int need = target - nums[i];\n      auto it = seen.find(need);\n      if (it != seen.end()) return {it->second, i};\n      seen[nums[i]] = i;\n    }\n    return {};\n  }\n};`,
      java: `import java.util.HashMap;\nimport java.util.Map;\n\nclass Solution {\n  public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> seen = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n      int need = target - nums[i];\n      if (seen.containsKey(need)) return new int[]{seen.get(need), i};\n      seen.put(nums[i], i);\n    }\n    return new int[0];\n  }\n}`,
      c: `/* C track currently uses the C++ runtime wrapper. */\n#include <unordered_map>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n  vector<int> twoSum(const vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < (int)nums.size(); i++) {\n      int need = target - nums[i];\n      if (seen.count(need)) return {seen[need], i};\n      seen[nums[i]] = i;\n    }\n    return {};\n  }\n};`,
    },
  },
  {
    unitId: 'dsa-palindrome',
    title: 'How to solve',
    intuition: 'Compare characters from both ends moving inward.',
    approach: [
      'Initialize two pointers: `left = 0`, `right = len(text)-1`.',
      'While left < right, compare characters.',
      'If mismatch found return false; otherwise move inward.',
      'Return true if loop completes.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)' },
    implementations: {
      python: `class Solution:\n    def isPalindrome(self, text: str) -> bool:\n        left, right = 0, len(text) - 1\n        while left < right:\n            if text[left] != text[right]:\n                return False\n            left += 1\n            right -= 1\n        return True`,
    },
  },
  {
    unitId: 'prefix-sum-range',
    title: 'How to solve',
    intuition: 'Prefix sums let each range query run in O(1).',
    approach: [
      'Build prefix array where prefix[i+1] = prefix[i] + nums[i].',
      'Range sum from l to r is `prefix[r+1] - prefix[l]`.',
      'Return that value.',
    ],
    complexity: { time: 'O(n)', space: 'O(n)' },
    implementations: {
      python: `from typing import List\n\nclass Solution:\n    def rangeSum(self, nums: List[int], l: int, r: int) -> int:\n        prefix = [0]\n        for value in nums:\n            prefix.append(prefix[-1] + value)\n        return prefix[r + 1] - prefix[l]`,
    },
  },
  {
    unitId: 'sliding-window-max-sum-k',
    title: 'How to solve',
    intuition: 'Reuse previous window sum instead of recomputing from scratch.',
    approach: [
      'Compute sum of first k elements as initial window.',
      'Slide window one step at a time.',
      'Add incoming value and remove outgoing value.',
      'Track maximum window sum.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)' },
    implementations: {
      python: `from typing import List\n\nclass Solution:\n    def maxWindowSum(self, nums: List[int], k: int) -> int:\n        window = sum(nums[:k])\n        best = window\n        for idx in range(k, len(nums)):\n            window += nums[idx] - nums[idx - k]\n            if window > best:\n                best = window\n        return best`,
    },
  },
  {
    unitId: 'recursion-factorial',
    title: 'How to solve',
    intuition: 'Factorial naturally decomposes to n * factorial(n-1).',
    approach: [
      'Define base case: factorial(0) = 1 and factorial(1) = 1.',
      'For n > 1 return n * factorial(n - 1).',
      'Return computed value.',
    ],
    complexity: { time: 'O(n)', space: 'O(n) recursion stack' },
    implementations: {
      python: `class Solution:\n    def factorial(self, n: int) -> int:\n        if n <= 1:\n            return 1\n        return n * self.factorial(n - 1)`,
    },
  },
  {
    unitId: 'dp-climb-stairs',
    title: 'How to solve',
    intuition: 'Ways to reach step i come from i-1 and i-2.',
    approach: [
      'Handle small n directly.',
      'Use two rolling variables for previous two states.',
      'Iterate from 3 to n and update current ways.',
      'Return final count.',
    ],
    complexity: { time: 'O(n)', space: 'O(1)' },
    implementations: {
      python: `class Solution:\n    def climbStairs(self, n: int) -> int:\n        if n <= 2:\n            return n\n        a, b = 1, 2\n        for _ in range(3, n + 1):\n            a, b = b, a + b\n        return b`,
    },
  },
]

const solutionByUnitId = new Map(solutions.map((solution) => [solution.unitId, solution]))
const warnedMissingSolutionCopy = new Set<string>()

export function getUnitSolution(unitId: string) {
  return solutionByUnitId.get(unitId) ?? null
}

export function getLocalizedUnitSolution(unitId: string, lang: LanguageCode) {
  const solution = getUnitSolution(unitId)
  if (!solution) {
    return null
  }

  const localized = solution.localized?.[lang] ?? SOLUTION_COPY[lang]?.[unitId]
  if (import.meta.env.DEV && lang !== 'en' && !localized) {
    const warningId = `${lang}:${unitId}`
    if (!warnedMissingSolutionCopy.has(warningId)) {
      warnedMissingSolutionCopy.add(warningId)
      console.warn(`[i18n] Missing solution prose for "${unitId}" in "${lang}". Falling back to English.`)
    }
  }
  if (!localized) {
    return solution
  }

  return {
    ...solution,
    title: localized.title ?? solution.title,
    intuition: localized.intuition ?? solution.intuition,
    approach: localized.approach ?? solution.approach,
  }
}
