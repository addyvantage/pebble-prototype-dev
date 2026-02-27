import type { TaskRunResult } from '../utils/taskHarness'
import type { TaskDefinition } from './types'

const starterCode = `function isPalindrome(s: string): boolean {
  return false
}`

const solutionCode = `function isPalindrome(s: string): boolean {
  const normalized = s.toLowerCase().replace(/[^a-z0-9]/g, '')
  let left = 0
  let right = normalized.length - 1

  while (left < right) {
    if (normalized[left] !== normalized[right]) {
      return false
    }
    left += 1
    right -= 1
  }

  return true
}`

function normalizeCode(codeText: string) {
  return codeText.replace(/\s+/g, ' ').trim()
}

function hasCaseNormalization(normalizedCode: string) {
  return /\.toLowerCase\(\)/.test(normalizedCode)
}

function hasAlphanumericFilter(normalizedCode: string) {
  return /replace\(\s*\/\[\^a-z0-9\]\/g\s*,\s*['"]{2}\s*\)/.test(normalizedCode)
}

function hasTwoPointers(normalizedCode: string) {
  const hasPointers =
    /let left\s*=\s*0/.test(normalizedCode) &&
    /let right\s*=\s*\w+\.length\s*-\s*1/.test(normalizedCode)
  const hasLoop = /while\s*\(\s*left\s*<\s*right\s*\)/.test(normalizedCode)
  const hasMismatchReturn = /!==/.test(normalizedCode) && /return\s+false/.test(normalizedCode)
  const hasPointerMoves = /left\s*\+=\s*1/.test(normalizedCode) && /right\s*-=\s*1/.test(normalizedCode)
  const hasSuccessReturn = /return\s+true/.test(normalizedCode)
  return hasPointers && hasLoop && hasMismatchReturn && hasPointerMoves && hasSuccessReturn
}

function runTask6(codeText: string): TaskRunResult {
  const normalizedCode = normalizeCode(codeText)

  if (!hasCaseNormalization(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'CASE_NOT_NORMALIZED',
      message: 'Run failed: normalize letter casing before palindrome comparison.',
    }
  }

  if (!hasAlphanumericFilter(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'NON_ALPHANUMERIC_NOT_FILTERED',
      message: 'Run failed: strip non-alphanumeric characters before pointer checks.',
    }
  }

  if (!hasTwoPointers(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'OUTPUT_MISMATCH',
      message: 'Run failed: use two pointers and return false immediately on mismatch.',
    }
  }

  return {
    status: 'success',
    message: 'Run succeeded. Palindrome normalization and two-pointer logic are stable.',
  }
}

function applyPalindromePatch(codeText: string) {
  if (codeText.includes('function isPalindrome')) {
    return solutionCode
  }
  return `${codeText.trim()}\n\n${solutionCode}`
}

const lesson: NonNullable<TaskDefinition['lesson']> = {
  objectives: [
    'Normalize case before comparison.',
    'Remove non-alphanumeric characters.',
    'Use two pointers moving inward from both ends.',
    'Return false on first mismatch, true otherwise.',
  ],
  constraints: [
    'Compare normalized content only.',
    'Keep pointer movement deterministic and symmetric.',
  ],
  hints: [
    'Prepare a clean string once, then compare on that string.',
    'Initialize `left = 0` and `right = normalized.length - 1`.',
    'Increment/decrement pointers only after a successful comparison.',
  ],
  commonMistakes: [
    'Comparing raw input without lowercasing.',
    'Ignoring punctuation and spaces in palindrome checks.',
    'Forgetting to move both pointers in the loop.',
  ],
}

export const task6Palindrome: TaskDefinition = {
  id: '6',
  title: 'Palindrome Check',
  description: 'Normalize input and compare with two pointers from both ends.',
  topic: 'Normalization + two pointers',
  difficulty: 'easy',
  module: 'Strings',
  lesson,
  starterCode,
  solutionCode,
  languageRuntime: 'javascript_sim',
  run: runTask6,
  errorKeyConfig: {
    CASE_NOT_NORMALIZED: {
      nudgeCopy: 'Normalize to lowercase first so character comparison is case-insensitive.',
      guidedSteps: [
        {
          title: 'Lowercase the input',
          detail: 'Use toLowerCase() before any palindrome checks.',
          runMessage: 'Step 1/3: adding case normalization.',
          highlightedLines: [2],
          proposedLines: [2],
        },
        {
          title: 'Use normalized text consistently',
          detail: 'Point left/right pointers to the normalized string.',
          runMessage: 'Step 2/3: wiring normalized string.',
          highlightedLines: [2, 4],
          proposedLines: [2, 4],
        },
        {
          title: 'Keep comparisons case-safe',
          detail: 'All comparisons should now use normalized casing.',
          runMessage: 'Step 3/3: case normalization complete.',
          highlightedLines: [7],
          proposedLines: [7],
        },
      ],
      applyPatch: applyPalindromePatch,
    },
    NON_ALPHANUMERIC_NOT_FILTERED: {
      nudgeCopy:
        'Remove non-alphanumeric characters so punctuation and spaces do not break valid palindromes.',
      guidedSteps: [
        {
          title: 'Filter non-alphanumeric chars',
          detail: "Apply replace(/[^a-z0-9]/g, '') after lowercasing.",
          runMessage: 'Step 1/3: applying character filter.',
          highlightedLines: [2],
          proposedLines: [2],
        },
        {
          title: 'Check filtered length boundaries',
          detail: 'Initialize pointers from filtered string boundaries.',
          runMessage: 'Step 2/3: aligning pointer boundaries.',
          highlightedLines: [3, 4],
          proposedLines: [3, 4],
        },
        {
          title: 'Compare filtered characters only',
          detail: 'Two-pointer comparisons should use filtered text exclusively.',
          runMessage: 'Step 3/3: filtered comparison ready.',
          highlightedLines: [7],
          proposedLines: [7],
        },
      ],
      applyPatch: applyPalindromePatch,
    },
    OUTPUT_MISMATCH: {
      nudgeCopy:
        'Use two pointers: compare ends, return false on mismatch, move inward until pointers meet.',
      guidedSteps: [
        {
          title: 'Initialize left and right pointers',
          detail: 'Set left = 0 and right = normalized.length - 1.',
          runMessage: 'Step 1/3: initializing pointers.',
          highlightedLines: [3, 4],
          proposedLines: [3, 4],
        },
        {
          title: 'Compare and fail fast',
          detail: 'Inside while loop, return false immediately on mismatch.',
          runMessage: 'Step 2/3: adding mismatch return.',
          highlightedLines: [6, 7, 8],
          proposedLines: [7, 8],
        },
        {
          title: 'Advance pointers and finish',
          detail: 'Move pointers inward and return true after full pass.',
          runMessage: 'Step 3/3: completing pointer traversal.',
          highlightedLines: [10, 11, 14],
          proposedLines: [10, 11, 14],
        },
      ],
      applyPatch: applyPalindromePatch,
    },
  },
}
