import type { PlacementLanguage } from './onboardingData'
import type { ProblemLanguage } from './problemsBank'
import type { LanguageCode } from '../i18n/languages'
import { SOLUTION_COPY, type LocalizedSolutionCopy } from '../i18n/solutionCopy'

export type SolutionLanguage = ProblemLanguage

export type UnitSolution = {
  unitId: string
  title: string
  intuition: string
  approach: string[]
  complexity: {
    time: string
    space: string
  }
  implementations: Partial<Record<SolutionLanguage, string>>
  localized?: Partial<Record<LanguageCode, LocalizedSolutionCopy>>
}

export type ResolvedUnitSolutionImplementation = {
  code: string | null
  codeLanguage: SolutionLanguage | null
  usedFallback: boolean
}

export const SOLUTION_LANGUAGE_ORDER: SolutionLanguage[] = ['python', 'javascript', 'cpp', 'java', 'c', 'sql']

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
      javascript: `class Solution {\n  solve() {\n    return 'Hello, Pebble!'\n  }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n  string solve() {\n    return "Hello, Pebble!";\n  }\n};`,
      java: `class Solution {\n  public String solve() {\n    return "Hello, Pebble!";\n  }\n}`,
      c: `#include <stdlib.h>\n#include <string.h>\n\nchar* solve() {\n  const char* msg = "Hello, Pebble!";\n  char* out = (char*)malloc(strlen(msg) + 1);\n  strcpy(out, msg);\n  return out;\n}`,
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
      javascript: `class Solution {\n  solve(a, b) {\n    return a + b\n  }\n}`,
      cpp: `class Solution {\npublic:\n  int solve(int a, int b) {\n    return a + b;\n  }\n};`,
      java: `class Solution {\n  public int solve(int a, int b) {\n    return a + b;\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* solve(const char* input) {\n  int a = 0;\n  int b = 0;\n  sscanf(input, "%d %d", &a, &b);\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), "%d", a + b);\n\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  maxOfTwo(a, b) {\n    return a > b ? a : b\n  }\n}`,
      cpp: `class Solution {\npublic:\n  int maxOfTwo(int a, int b) {\n    return (a > b) ? a : b;\n  }\n};`,
      java: `class Solution {\n  public int maxOfTwo(int a, int b) {\n    return (a > b) ? a : b;\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* maxOfTwo(const char* input) {\n  int a = 0;\n  int b = 0;\n  sscanf(input, "%d %d", &a, &b);\n  int ans = (a > b) ? a : b;\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), "%d", ans);\n\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  sumToN(n) {\n    let total = 0\n    for (let value = 1; value <= n; value += 1) {\n      total += value\n    }\n    return total\n  }\n}`,
      cpp: `class Solution {\npublic:\n  int sumToN(int n) {\n    int total = 0;\n    for (int value = 1; value <= n; value++) {\n      total += value;\n    }\n    return total;\n  }\n};`,
      java: `class Solution {\n  public int sumToN(int n) {\n    int total = 0;\n    for (int value = 1; value <= n; value++) {\n      total += value;\n    }\n    return total;\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* sumToN(const char* input) {\n  int n = atoi(input);\n  long long total = 0;\n  for (int value = 1; value <= n; value++) {\n    total += value;\n  }\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), "%lld", total);\n\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  maxValue(nums) {\n    let best = nums[0]\n    for (const value of nums) {\n      if (value > best) best = value\n    }\n    return best\n  }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n  int maxValue(const vector<int>& nums) {\n    int best = nums[0];\n    for (int value : nums) {\n      if (value > best) best = value;\n    }\n    return best;\n  }\n};`,
      java: `class Solution {\n  public int maxValue(int[] nums) {\n    int best = nums[0];\n    for (int value : nums) {\n      if (value > best) best = value;\n    }\n    return best;\n  }\n}`,
      c: `#include <limits.h>\n#include <stdlib.h>\n#include <string.h>\n#include <stdio.h>\n\nchar* maxValue(const char* input) {\n  const char* cursor = input;\n  char* end = NULL;\n  long best = LONG_MIN;\n  int found = 0;\n\n  while (1) {\n    long value = strtol(cursor, &end, 10);\n    if (cursor == end) break;\n    if (!found || value > best) {\n      best = value;\n      found = 1;\n    }\n    cursor = end;\n  }\n\n  if (!found) best = 0;\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), "%ld", best);\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  reverseText(text) {\n    return text.split('').reverse().join('')\n  }\n}`,
      cpp: `#include <algorithm>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n  string reverseText(const string& text) {\n    string out = text;\n    reverse(out.begin(), out.end());\n    return out;\n  }\n};`,
      java: `class Solution {\n  public String reverseText(String text) {\n    return new StringBuilder(text).reverse().toString();\n  }\n}`,
      c: `#include <stdlib.h>\n#include <string.h>\n\nchar* reverseText(const char* input) {\n  size_t len = strlen(input);\n  while (len > 0 && (input[len - 1] == '\\n' || input[len - 1] == '\\r')) {\n    len--;\n  }\n\n  char* out = (char*)malloc(len + 1);\n  for (size_t i = 0; i < len; i++) {\n    out[i] = input[len - 1 - i];\n  }\n  out[len] = '\\0';\n  return out;\n}`,
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
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* twoSum(const char* input) {\n  char* owned = (char*)malloc(strlen(input) + 1);\n  strcpy(owned, input);\n\n  char* save = NULL;\n  char* numsLine = strtok_r(owned, "\\n", &save);\n  char* targetLine = strtok_r(NULL, "\\n", &save);\n\n  int nums[256];\n  int count = 0;\n  if (numsLine) {\n    char* walk = numsLine;\n    char* end = NULL;\n    while (1) {\n      long value = strtol(walk, &end, 10);\n      if (walk == end) break;\n      nums[count++] = (int)value;\n      walk = end;\n      if (count >= 256) break;\n    }\n  }\n\n  int target = targetLine ? atoi(targetLine) : 0;\n  int left = -1;\n  int right = -1;\n  for (int i = 0; i < count && left < 0; i++) {\n    for (int j = i + 1; j < count; j++) {\n      if (nums[i] + nums[j] == target) {\n        left = i;\n        right = j;\n        break;\n      }\n    }\n  }\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), \"%d %d\", left, right);\n\n  free(owned);\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  isPalindrome(text) {\n    let left = 0\n    let right = text.length - 1\n    while (left < right) {\n      if (text[left] !== text[right]) return false\n      left += 1\n      right -= 1\n    }\n    return true\n  }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n  bool isPalindrome(const string& text) {\n    int left = 0;\n    int right = static_cast<int>(text.size()) - 1;\n    while (left < right) {\n      if (text[left] != text[right]) return false;\n      left++;\n      right--;\n    }\n    return true;\n  }\n};`,
      java: `class Solution {\n  public boolean isPalindrome(String text) {\n    int left = 0;\n    int right = text.length() - 1;\n    while (left < right) {\n      if (text.charAt(left) != text.charAt(right)) return false;\n      left++;\n      right--;\n    }\n    return true;\n  }\n}`,
      c: `#include <stdlib.h>\n#include <string.h>\n\nchar* isPalindrome(const char* input) {\n  size_t len = strlen(input);\n  while (len > 0 && (input[len - 1] == '\\n' || input[len - 1] == '\\r')) {\n    len--;\n  }\n\n  int left = 0;\n  int right = (int)len - 1;\n  int ok = 1;\n  while (left < right) {\n    if (input[left] != input[right]) {\n      ok = 0;\n      break;\n    }\n    left++;\n    right--;\n  }\n\n  const char* ans = ok ? \"true\" : \"false\";\n  char* out = (char*)malloc(strlen(ans) + 1);\n  strcpy(out, ans);\n  return out;\n}`,
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
      javascript: `class Solution {\n  rangeSum(nums, l, r) {\n    const prefix = [0]\n    for (const value of nums) {\n      prefix.push(prefix[prefix.length - 1] + value)\n    }\n    return prefix[r + 1] - prefix[l]\n  }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n  int rangeSum(const vector<int>& nums, int l, int r) {\n    vector<int> prefix(nums.size() + 1, 0);\n    for (int i = 0; i < static_cast<int>(nums.size()); i++) {\n      prefix[i + 1] = prefix[i] + nums[i];\n    }\n    return prefix[r + 1] - prefix[l];\n  }\n};`,
      java: `class Solution {\n  public int rangeSum(int[] nums, int l, int r) {\n    int[] prefix = new int[nums.length + 1];\n    for (int i = 0; i < nums.length; i++) {\n      prefix[i + 1] = prefix[i] + nums[i];\n    }\n    return prefix[r + 1] - prefix[l];\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* rangeSum(const char* input) {\n  char* owned = (char*)malloc(strlen(input) + 1);\n  strcpy(owned, input);\n\n  char* save = NULL;\n  char* numsLine = strtok_r(owned, \"\\n\", &save);\n  char* rangeLine = strtok_r(NULL, \"\\n\", &save);\n\n  int nums[256];\n  int count = 0;\n  if (numsLine) {\n    char* walk = numsLine;\n    char* end = NULL;\n    while (1) {\n      long value = strtol(walk, &end, 10);\n      if (walk == end) break;\n      nums[count++] = (int)value;\n      walk = end;\n      if (count >= 256) break;\n    }\n  }\n\n  int l = 0;\n  int r = 0;\n  if (rangeLine) sscanf(rangeLine, \"%d %d\", &l, &r);\n\n  long long total = 0;\n  if (l < 0) l = 0;\n  if (r >= count) r = count - 1;\n  for (int i = l; i <= r && i < count; i++) {\n    total += nums[i];\n  }\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), \"%lld\", total);\n\n  free(owned);\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  maxWindowSum(nums, k) {\n    let window = 0\n    for (let i = 0; i < k; i += 1) {\n      window += nums[i]\n    }\n    let best = window\n    for (let i = k; i < nums.length; i += 1) {\n      window += nums[i] - nums[i - k]\n      if (window > best) best = window\n    }\n    return best\n  }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n  int maxWindowSum(const vector<int>& nums, int k) {\n    int window = 0;\n    for (int i = 0; i < k; i++) {\n      window += nums[i];\n    }\n    int best = window;\n    for (int i = k; i < static_cast<int>(nums.size()); i++) {\n      window += nums[i] - nums[i - k];\n      if (window > best) best = window;\n    }\n    return best;\n  }\n};`,
      java: `class Solution {\n  public int maxWindowSum(int[] nums, int k) {\n    int window = 0;\n    for (int i = 0; i < k; i++) {\n      window += nums[i];\n    }\n    int best = window;\n    for (int i = k; i < nums.length; i++) {\n      window += nums[i] - nums[i - k];\n      if (window > best) best = window;\n    }\n    return best;\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* maxWindowSum(const char* input) {\n  char* owned = (char*)malloc(strlen(input) + 1);\n  strcpy(owned, input);\n\n  char* save = NULL;\n  char* numsLine = strtok_r(owned, \"\\n\", &save);\n  char* kLine = strtok_r(NULL, \"\\n\", &save);\n\n  int nums[256];\n  int count = 0;\n  if (numsLine) {\n    char* walk = numsLine;\n    char* end = NULL;\n    while (1) {\n      long value = strtol(walk, &end, 10);\n      if (walk == end) break;\n      nums[count++] = (int)value;\n      walk = end;\n      if (count >= 256) break;\n    }\n  }\n\n  int k = kLine ? atoi(kLine) : 0;\n  long long best = 0;\n  if (k > 0 && k <= count) {\n    long long window = 0;\n    for (int i = 0; i < k; i++) {\n      window += nums[i];\n    }\n    best = window;\n    for (int i = k; i < count; i++) {\n      window += nums[i] - nums[i - k];\n      if (window > best) best = window;\n    }\n  }\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), \"%lld\", best);\n\n  free(owned);\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  factorial(n) {\n    if (n <= 1) return 1\n    return n * this.factorial(n - 1)\n  }\n}`,
      cpp: `class Solution {\npublic:\n  int factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n  }\n};`,
      java: `class Solution {\n  public int factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nstatic long long factorialValue(int n) {\n  if (n <= 1) return 1;\n  return (long long)n * factorialValue(n - 1);\n}\n\nchar* factorial(const char* input) {\n  int n = atoi(input);\n  long long ans = factorialValue(n);\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), \"%lld\", ans);\n\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
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
      javascript: `class Solution {\n  climbStairs(n) {\n    if (n <= 2) return n\n    let a = 1\n    let b = 2\n    for (let step = 3; step <= n; step += 1) {\n      const next = a + b\n      a = b\n      b = next\n    }\n    return b\n  }\n}`,
      cpp: `class Solution {\npublic:\n  int climbStairs(int n) {\n    if (n <= 2) return n;\n    int a = 1;\n    int b = 2;\n    for (int step = 3; step <= n; step++) {\n      int next = a + b;\n      a = b;\n      b = next;\n    }\n    return b;\n  }\n};`,
      java: `class Solution {\n  public int climbStairs(int n) {\n    if (n <= 2) return n;\n    int a = 1;\n    int b = 2;\n    for (int step = 3; step <= n; step++) {\n      int next = a + b;\n      a = b;\n      b = next;\n    }\n    return b;\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nchar* climbStairs(const char* input) {\n  int n = atoi(input);\n  long long ans;\n  if (n <= 2) {\n    ans = n;\n  } else {\n    long long a = 1;\n    long long b = 2;\n    for (int step = 3; step <= n; step++) {\n      long long next = a + b;\n      a = b;\n      b = next;\n    }\n    ans = b;\n  }\n\n  char buffer[64];\n  snprintf(buffer, sizeof(buffer), \"%lld\", ans);\n\n  char* out = (char*)malloc(strlen(buffer) + 1);\n  strcpy(out, buffer);\n  return out;\n}`,
    },
  },
  {
    unitId: 'p-two-sum',
    title: 'How to solve',
    intuition: 'Use a hash map to find the complement in one pass.',
    approach: [
      'Scan numbers from left to right.',
      'For each number, compute the needed complement.',
      'If complement is already seen, print those two indices.',
      'Otherwise store the current number and index.',
    ],
    complexity: { time: 'O(n)', space: 'O(n)' },
    implementations: {
      python: `def solve():\n    import sys\n\n    data = sys.stdin.read().strip().split()\n    if not data:\n        return\n\n    n = int(data[0])\n    nums = list(map(int, data[1:1 + n]))\n    target = int(data[1 + n])\n\n    seen = {}\n    for idx, value in enumerate(nums):\n      need = target - value\n      if need in seen:\n        print(seen[need], idx)\n        return\n      seen[value] = idx\n\n    print(-1, -1)\n\n\nif __name__ == \"__main__\":\n    solve()`,
      javascript: `function solve(input) {\n  const data = input.trim().split(/\\s+/).map(Number)\n  if (!data.length) return '-1 -1'\n\n  const n = data[0]\n  const nums = data.slice(1, 1 + n)\n  const target = data[1 + n]\n\n  const seen = new Map()\n  for (let i = 0; i < nums.length; i += 1) {\n    const need = target - nums[i]\n    if (seen.has(need)) {\n      return \`\${seen.get(need)} \${i}\`\n    }\n    seen.set(nums[i], i)\n  }\n\n  return '-1 -1'\n}\n\nconst fs = require('fs')\nconst input = fs.readFileSync(0, 'utf8')\nprocess.stdout.write(String(solve(input)))`,
      cpp: `#include <iostream>\n#include <unordered_map>\n#include <vector>\nusing namespace std;\n\nint main() {\n  int n;\n  cin >> n;\n  vector<int> nums(n);\n  for (int i = 0; i < n; i++) cin >> nums[i];\n  int target;\n  cin >> target;\n\n  unordered_map<int, int> seen;\n  for (int i = 0; i < n; i++) {\n    int need = target - nums[i];\n    auto it = seen.find(need);\n    if (it != seen.end()) {\n      cout << it->second << ' ' << i;\n      return 0;\n    }\n    seen[nums[i]] = i;\n  }\n\n  cout << \"-1 -1\";\n  return 0;\n}`,
      java: `import java.io.BufferedInputStream;\nimport java.util.HashMap;\nimport java.util.Map;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    FastScanner fs = new FastScanner();\n    int n = fs.nextInt();\n    int[] nums = new int[n];\n    for (int i = 0; i < n; i++) nums[i] = fs.nextInt();\n    int target = fs.nextInt();\n\n    Map<Integer, Integer> seen = new HashMap<>();\n    for (int i = 0; i < n; i++) {\n      int need = target - nums[i];\n      if (seen.containsKey(need)) {\n        System.out.print(seen.get(need) + \" \" + i);\n        return;\n      }\n      seen.put(nums[i], i);\n    }\n\n    System.out.print(\"-1 -1\");\n  }\n\n  private static final class FastScanner {\n    private final BufferedInputStream in = new BufferedInputStream(System.in);\n    private final byte[] buffer = new byte[1 << 16];\n    private int ptr = 0;\n    private int len = 0;\n\n    private int read() throws Exception {\n      if (ptr >= len) {\n        len = in.read(buffer);\n        ptr = 0;\n        if (len <= 0) return -1;\n      }\n      return buffer[ptr++];\n    }\n\n    int nextInt() throws Exception {\n      int c;\n      do {\n        c = read();\n      } while (c <= ' ' && c != -1);\n\n      int sign = 1;\n      if (c == '-') {\n        sign = -1;\n        c = read();\n      }\n\n      int value = 0;\n      while (c > ' ') {\n        value = value * 10 + (c - '0');\n        c = read();\n      }\n      return value * sign;\n    }\n  }\n}`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n  int n = 0;\n  if (scanf(\"%d\", &n) != 1) {\n    return 0;\n  }\n\n  int* nums = (int*)malloc((size_t)n * sizeof(int));\n  for (int i = 0; i < n; i++) {\n    scanf(\"%d\", &nums[i]);\n  }\n\n  int target = 0;\n  scanf(\"%d\", &target);\n\n  for (int i = 0; i < n; i++) {\n    for (int j = i + 1; j < n; j++) {\n      if (nums[i] + nums[j] == target) {\n        printf(\"%d %d\", i, j);\n        free(nums);\n        return 0;\n      }\n    }\n  }\n\n  printf(\"-1 -1\");\n  free(nums);\n  return 0;\n}`,
    },
  },
  {
    unitId: 'p-valid-anagram',
    title: 'How to solve',
    intuition: 'Count each character and ensure both strings have identical frequencies.',
    approach: [
      'If lengths differ, return false immediately.',
      'Count characters from the first string.',
      'Subtract while scanning the second string.',
      'If any count goes negative, it is not an anagram.',
    ],
    complexity: { time: 'O(n)', space: 'O(1) for fixed alphabet' },
    implementations: {
      python: `def solve():\n    import sys\n\n    lines = [line.rstrip('\\n') for line in sys.stdin.read().splitlines()]\n    if len(lines) < 2:\n        print(\"false\")\n        return\n\n    s = lines[0]\n    t = lines[1]\n\n    if len(s) != len(t):\n        print(\"false\")\n        return\n\n    freq = {}\n    for ch in s:\n        freq[ch] = freq.get(ch, 0) + 1\n\n    for ch in t:\n        if ch not in freq:\n            print(\"false\")\n            return\n        freq[ch] -= 1\n        if freq[ch] < 0:\n            print(\"false\")\n            return\n\n    print(\"true\")\n\n\nif __name__ == \"__main__\":\n    solve()`,
      javascript: `function solve(input) {\n  const lines = input.trim().split(/\\r?\\n/)\n  if (lines.length < 2) return 'false'\n\n  const s = lines[0]\n  const t = lines[1]\n  if (s.length !== t.length) return 'false'\n\n  const freq = new Map()\n  for (const ch of s) {\n    freq.set(ch, (freq.get(ch) ?? 0) + 1)\n  }\n\n  for (const ch of t) {\n    if (!freq.has(ch)) return 'false'\n    const next = (freq.get(ch) ?? 0) - 1\n    if (next < 0) return 'false'\n    freq.set(ch, next)\n  }\n\n  return 'true'\n}\n\nconst fs = require('fs')\nconst input = fs.readFileSync(0, 'utf8')\nprocess.stdout.write(String(solve(input)))`,
      cpp: `#include <algorithm>\n#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string s;\n  string t;\n  getline(cin, s);\n  getline(cin, t);\n\n  if (s.size() != t.size()) {\n    cout << \"false\";\n    return 0;\n  }\n\n  sort(s.begin(), s.end());\n  sort(t.begin(), t.end());\n  cout << (s == t ? \"true\" : \"false\");\n  return 0;\n}`,
      java: `import java.io.BufferedReader;\nimport java.io.InputStreamReader;\nimport java.util.Arrays;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    String s = br.readLine();\n    String t = br.readLine();\n\n    if (s == null || t == null || s.length() != t.length()) {\n      System.out.print(\"false\");\n      return;\n    }\n\n    char[] a = s.toCharArray();\n    char[] b = t.toCharArray();\n    Arrays.sort(a);\n    Arrays.sort(b);\n    System.out.print(Arrays.equals(a, b) ? \"true\" : \"false\");\n  }\n}`,
      c: `#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n  char s[100005];\n  char t[100005];\n\n  if (!fgets(s, sizeof(s), stdin)) {\n    printf(\"false\");\n    return 0;\n  }\n  if (!fgets(t, sizeof(t), stdin)) {\n    printf(\"false\");\n    return 0;\n  }\n\n  s[strcspn(s, \"\\r\\n\")] = '\\0';\n  t[strcspn(t, \"\\r\\n\")] = '\\0';\n\n  if (strlen(s) != strlen(t)) {\n    printf(\"false\");\n    return 0;\n  }\n\n  int freq[256] = {0};\n  for (size_t i = 0; s[i]; i++) freq[(unsigned char)s[i]]++;\n  for (size_t i = 0; t[i]; i++) {\n    freq[(unsigned char)t[i]]--;\n    if (freq[(unsigned char)t[i]] < 0) {\n      printf(\"false\");\n      return 0;\n    }\n  }\n\n  printf(\"true\");\n  return 0;\n}`,
    },
  },
]

const solutionByUnitId = new Map(solutions.map((solution) => [solution.unitId, solution]))
const warnedMissingSolutionCopy = new Set<string>()

export function getUnitSolution(unitId: string) {
  return solutionByUnitId.get(unitId) ?? null
}

export function getAvailableSolutionLanguages(solution: UnitSolution | null) {
  if (!solution) {
    return [] as SolutionLanguage[]
  }
  return SOLUTION_LANGUAGE_ORDER.filter((language) => Boolean(solution.implementations[language]?.trim()))
}

export function resolveUnitSolutionImplementation(input: {
  solution: UnitSolution | null
  requestedLanguage: SolutionLanguage
  fallbackLanguage?: PlacementLanguage | null
}) {
  const { solution, requestedLanguage, fallbackLanguage = null } = input
  if (!solution) {
    return {
      code: null,
      codeLanguage: null,
      usedFallback: false,
    } satisfies ResolvedUnitSolutionImplementation
  }

  const requestedCode = solution.implementations[requestedLanguage]?.trim()
  if (requestedCode) {
    return {
      code: requestedCode,
      codeLanguage: requestedLanguage,
      usedFallback: false,
    } satisfies ResolvedUnitSolutionImplementation
  }

  const normalizedFallback = fallbackLanguage ?? null
  const fallbackCode = normalizedFallback ? solution.implementations[normalizedFallback]?.trim() : null
  if (fallbackCode) {
    return {
      code: fallbackCode,
      codeLanguage: normalizedFallback,
      usedFallback: true,
    } satisfies ResolvedUnitSolutionImplementation
  }

  const availableLanguage = getAvailableSolutionLanguages(solution)[0] ?? null
  const availableCode = availableLanguage ? solution.implementations[availableLanguage]?.trim() ?? null : null
  return {
    code: availableCode || null,
    codeLanguage: availableLanguage,
    usedFallback: Boolean(availableCode && availableLanguage && availableLanguage !== requestedLanguage),
  } satisfies ResolvedUnitSolutionImplementation
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
