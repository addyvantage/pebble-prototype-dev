import type { TaskRunResult } from '../utils/taskHarness'
import type { TaskDefinition } from './types'

const starterCode = `function lengthOfLongestSubstring(s: string): number {
  return 0
}`

const solutionCode = `function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>()
  let left = 0
  let maxLength = 0

  for (let right = 0; right < s.length; right += 1) {
    const char = s[right]
    const seenAt = lastSeen.get(char)
    if (seenAt !== undefined) {
      left = Math.max(left, seenAt + 1)
    }

    lastSeen.set(char, right)
    maxLength = Math.max(maxLength, right - left + 1)
  }

  return maxLength
}`

function normalizeCode(codeText: string) {
  return codeText.replace(/\s+/g, ' ').trim()
}

function hasSlidingWindowStore(normalizedCode: string) {
  return /new Map<\s*string\s*,\s*number\s*>/.test(normalizedCode) || /new Map\(\)/.test(normalizedCode)
}

function hasWindowPointers(normalizedCode: string) {
  const hasLeft = /let left\s*=\s*0/.test(normalizedCode)
  const hasRightLoop = /for\s*\(\s*let right\s*=\s*0\s*;\s*right\s*<\s*s\.length/.test(normalizedCode)
  return hasLeft && hasRightLoop
}

function hasWindowUpdate(normalizedCode: string) {
  const hasLeftUpdate =
    /left\s*=\s*Math\.max\(\s*left\s*,\s*seenAt\s*\+\s*1\s*\)/.test(normalizedCode) ||
    /left\s*=\s*Math\.max\(\s*left\s*,\s*lastSeen\.get\(\s*char\s*\)\s*!\s*\+\s*1\s*\)/.test(normalizedCode)
  const hasSetUpdate = /lastSeen\.set\(\s*char\s*,\s*right\s*\)/.test(normalizedCode)
  return hasLeftUpdate && hasSetUpdate
}

function hasMaxLengthUpdate(normalizedCode: string) {
  const hasMaxInit = /let maxLength\s*=\s*0/.test(normalizedCode)
  const hasMaxMath = /maxLength\s*=\s*Math\.max\(\s*maxLength\s*,\s*right\s*-\s*left\s*\+\s*1\s*\)/.test(
    normalizedCode,
  )
  const hasReturn = /return\s+maxLength/.test(normalizedCode)
  return hasMaxInit && hasMaxMath && hasReturn
}

function runTask4(codeText: string): TaskRunResult {
  const normalizedCode = normalizeCode(codeText)

  if (!hasSlidingWindowStore(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'MISSING_SLIDING_WINDOW',
      message: 'Run failed: use a map/set to track characters currently in the sliding window.',
    }
  }

  if (!hasWindowPointers(normalizedCode) || !hasWindowUpdate(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'WRONG_WINDOW_UPDATE',
      message: 'Run failed: update the left pointer correctly when a repeated character is encountered.',
    }
  }

  if (!hasMaxLengthUpdate(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'OUTPUT_MISMATCH',
      message: 'Run failed: update and return maxLength from each valid window.',
    }
  }

  return {
    status: 'success',
    message: 'Run succeeded. Sliding-window logic matches expected longest-unique-substring behavior.',
  }
}

function applyLongestSubstringPatch(codeText: string) {
  if (codeText.includes('function lengthOfLongestSubstring')) {
    return solutionCode
  }
  return `${codeText.trim()}\n\n${solutionCode}`
}

export const task4LongestSubstring: TaskDefinition = {
  id: '4',
  title: 'Longest Substring Without Repeating Characters',
  description: 'Use a sliding window and seen-index map to track the maximum unique span.',
  topic: 'Sliding window',
  difficulty: 'medium',
  module: 'Strings',
  starterCode,
  solutionCode,
  languageRuntime: 'javascript_sim',
  run: runTask4,
  errorKeyConfig: {
    MISSING_SLIDING_WINDOW: {
      nudgeCopy:
        'Track seen characters with a map so you can update the window deterministically.',
      guidedSteps: [
        {
          title: 'Create seen-character map',
          detail: 'Initialize a map for character -> latest index.',
          runMessage: 'Step 1/3: initializing seen map.',
          highlightedLines: [2],
          proposedLines: [2],
        },
        {
          title: 'Initialize pointers',
          detail: 'Start with left pointer and iterate right pointer through s.',
          runMessage: 'Step 2/3: preparing window pointers.',
          highlightedLines: [3, 6],
          proposedLines: [3, 6],
        },
        {
          title: 'Store current index',
          detail: 'Update map with the latest index for each character.',
          runMessage: 'Step 3/3: enabling window state updates.',
          highlightedLines: [13],
          proposedLines: [13],
        },
      ],
      applyPatch: applyLongestSubstringPatch,
    },
    WRONG_WINDOW_UPDATE: {
      nudgeCopy:
        'When a duplicate appears, move left to max(left, lastSeen[char] + 1) to avoid shrinking backward.',
      guidedSteps: [
        {
          title: 'Read prior character index',
          detail: 'Pull the previous index from the seen map.',
          runMessage: 'Step 1/3: loading prior index.',
          highlightedLines: [8],
          proposedLines: [8],
        },
        {
          title: 'Advance left safely',
          detail: 'Only move left forward using Math.max.',
          runMessage: 'Step 2/3: fixing left pointer update.',
          highlightedLines: [10],
          proposedLines: [10],
        },
        {
          title: 'Recompute window size',
          detail: 'Use right - left + 1 after pointer updates.',
          runMessage: 'Step 3/3: validating window width.',
          highlightedLines: [14],
          proposedLines: [14],
        },
      ],
      applyPatch: applyLongestSubstringPatch,
    },
    OUTPUT_MISMATCH: {
      nudgeCopy: 'Update maxLength at every step and return it after the loop.',
      guidedSteps: [
        {
          title: 'Initialize max length',
          detail: 'Start maxLength at zero before scanning.',
          runMessage: 'Step 1/3: initializing maxLength.',
          highlightedLines: [4],
          proposedLines: [4],
        },
        {
          title: 'Update max each iteration',
          detail: 'Take the max of current maxLength and active window size.',
          runMessage: 'Step 2/3: fixing max update.',
          highlightedLines: [14],
          proposedLines: [14],
        },
        {
          title: 'Return final max length',
          detail: 'The result should be maxLength after processing all chars.',
          runMessage: 'Step 3/3: finalizing output.',
          highlightedLines: [17],
          proposedLines: [17],
        },
      ],
      applyPatch: applyLongestSubstringPatch,
    },
  },
}
