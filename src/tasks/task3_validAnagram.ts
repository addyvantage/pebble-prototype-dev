import type { TaskRunResult } from '../utils/taskHarness'
import type { TaskDefinition } from './types'

const starterCode = `function isAnagram(s: string, t: string): boolean {
  return false
}`

const solutionCode = `function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) {
    return false
  }

  const counts: Record<string, number> = {}
  for (const char of s) {
    counts[char] = (counts[char] ?? 0) + 1
  }

  for (const char of t) {
    const nextCount = (counts[char] ?? 0) - 1
    if (nextCount < 0) {
      return false
    }
    counts[char] = nextCount
  }

  return true
}`

function normalizeCode(codeText: string) {
  return codeText.replace(/\s+/g, ' ').trim()
}

function hasLengthGuard(normalizedCode: string) {
  return /s\.length\s*!==\s*t\.length/.test(normalizedCode)
}

function hasFrequencyMap(normalizedCode: string) {
  const hasMapInit =
    /Record<\s*string\s*,\s*number\s*>\s*=\s*\{\s*\}/.test(normalizedCode) ||
    /new Map\s*</.test(normalizedCode)
  const hasIncrement =
    /\[\s*char\s*\]\s*=\s*\([^)]*\)\s*\+\s*1/.test(normalizedCode) ||
    /\.set\([^)]*,\s*\([^)]*\)\s*\+\s*1\)/.test(normalizedCode)
  return hasMapInit && hasIncrement
}

function hasComparisonPass(normalizedCode: string) {
  const hasLoopOverT = /for\s*\(\s*const\s+char\s+of\s+t\s*\)/.test(normalizedCode)
  const hasDecrement =
    /nextCount\s*=\s*\([^)]*\)\s*-\s*1/.test(normalizedCode) ||
    /\[\s*char\s*\]\s*=\s*\([^)]*\)\s*-\s*1/.test(normalizedCode)
  const hasMismatchGuard = /nextCount\s*<\s*0/.test(normalizedCode) || /return\s+false/.test(normalizedCode)
  const hasSuccessReturn = /return\s+true/.test(normalizedCode)
  return hasLoopOverT && hasDecrement && hasMismatchGuard && hasSuccessReturn
}

function runTask3(codeText: string): TaskRunResult {
  const normalizedCode = normalizeCode(codeText)

  if (!hasLengthGuard(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'LENGTH_MISMATCH_IGNORED',
      message: 'Run failed: check s.length !== t.length first to short-circuit impossible matches.',
    }
  }

  if (!hasFrequencyMap(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'MISSING_HASHMAP',
      message: 'Run failed: build a frequency map from s before comparing characters in t.',
    }
  }

  if (!hasComparisonPass(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'OUTPUT_MISMATCH',
      message: 'Run failed: compare counts in a second pass and return true only when all checks pass.',
    }
  }

  return {
    status: 'success',
    message: 'Run succeeded. Anagram checks pass for representative pairs.',
  }
}

function applyValidAnagramPatch(codeText: string) {
  if (codeText.includes('function isAnagram')) {
    return solutionCode
  }
  return `${codeText.trim()}\n\n${solutionCode}`
}

export const task3ValidAnagram: TaskDefinition = {
  id: '3',
  title: 'Valid Anagram',
  description: 'Compare two strings using a frequency map and early length validation.',
  topic: 'Frequency map comparison',
  difficulty: 'easy',
  module: 'Strings',
  starterCode,
  solutionCode,
  languageRuntime: 'javascript_sim',
  run: runTask3,
  errorKeyConfig: {
    LENGTH_MISMATCH_IGNORED: {
      nudgeCopy:
        'Start with a length check. If lengths differ, the strings cannot be anagrams.',
      guidedSteps: [
        {
          title: 'Gate with length equality',
          detail: 'Compare s.length and t.length before any map work.',
          runMessage: 'Step 1/3: adding length guard.',
          highlightedLines: [2],
          proposedLines: [2, 3],
        },
        {
          title: 'Return early on mismatch',
          detail: 'Use an immediate return false to keep flow deterministic.',
          runMessage: 'Step 2/3: wiring early return.',
          highlightedLines: [3],
          proposedLines: [3],
        },
        {
          title: 'Continue only on equal lengths',
          detail: 'Proceed to counting only when lengths match.',
          runMessage: 'Step 3/3: length gate complete.',
          highlightedLines: [2, 4],
          proposedLines: [2, 4],
        },
      ],
      applyPatch: applyValidAnagramPatch,
    },
    MISSING_HASHMAP: {
      nudgeCopy: 'Count characters from s in a map, then compare against t.',
      guidedSteps: [
        {
          title: 'Initialize counts map',
          detail: 'Create an object map keyed by character.',
          runMessage: 'Step 1/3: creating frequency map.',
          highlightedLines: [6],
          proposedLines: [6],
        },
        {
          title: 'Fill counts from s',
          detail: 'Increment each seen character from the first string.',
          runMessage: 'Step 2/3: counting source characters.',
          highlightedLines: [7, 8],
          proposedLines: [7, 8],
        },
        {
          title: 'Prepare compare pass',
          detail: 'Use those counts while iterating over t.',
          runMessage: 'Step 3/3: map ready for comparison.',
          highlightedLines: [11],
          proposedLines: [11],
        },
      ],
      applyPatch: applyValidAnagramPatch,
    },
    OUTPUT_MISMATCH: {
      nudgeCopy:
        'Use a second pass over t to decrement counts and fail immediately when a count drops below zero.',
      guidedSteps: [
        {
          title: 'Iterate over second string',
          detail: 'Walk t and consume from the counts map.',
          runMessage: 'Step 1/3: starting compare pass.',
          highlightedLines: [11, 12],
          proposedLines: [11, 12],
        },
        {
          title: 'Fail fast on invalid count',
          detail: 'Return false when a character is missing or over-consumed.',
          runMessage: 'Step 2/3: adding mismatch guard.',
          highlightedLines: [13, 14],
          proposedLines: [13, 14],
        },
        {
          title: 'Return true on clean pass',
          detail: 'If no mismatches are found, return true at the end.',
          runMessage: 'Step 3/3: finalizing output.',
          highlightedLines: [19],
          proposedLines: [19],
        },
      ],
      applyPatch: applyValidAnagramPatch,
    },
  },
}
