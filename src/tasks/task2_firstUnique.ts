import type { TaskRunResult } from '../utils/taskHarness'
import type { TaskDefinition } from './types'

const starterCode = `function firstUnique(s: string): number {
  return -1
}`

const solutionCode = `function firstUnique(s: string): number {
  const counts: Record<string, number> = {}

  for (const char of s) {
    counts[char] = (counts[char] ?? 0) + 1
  }

  for (let i = 0; i < s.length; i += 1) {
    if ((counts[s[i]] ?? 0) === 1) {
      return i
    }
  }

  return -1
}`

const demoPartialFixCode = `function firstUnique(s: string): number {
  const counts: Record<string, number> = {}

  for (const char of s) {
    counts[char] = (counts[char] ?? 0) + 1
  }

  return -1
}`

function normalizeCode(codeText: string) {
  return codeText.replace(/\s+/g, ' ').trim()
}

function hasFrequencyMapLogic(normalizedCode: string) {
  const hasMapInit =
    /\b(?:const|let)\s+\w+\s*:\s*Record<\s*string\s*,\s*number\s*>\s*=\s*\{\s*\}/.test(
      normalizedCode,
    ) ||
    /\b(?:const|let)\s+\w+\s*=\s*new\s+Map\s*</.test(normalizedCode)

  const hasCounterIncrement =
    /\[\s*\w+\s*\]\s*=\s*\([^)]*\)\s*\+\s*1/.test(normalizedCode) ||
    /\.set\s*\(\s*\w+\s*,\s*\([^)]*\)\s*\+\s*1\s*\)/.test(normalizedCode)

  return hasMapInit && hasCounterIncrement
}

function hasUniqueSearchPass(normalizedCode: string) {
  return (
    /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*s\.length\s*;/.test(normalizedCode) ||
    /for\s*\(\s*const\s+\w+\s+of\s+s\s*\)/.test(normalizedCode)
  )
}

function hasIndexReturn(normalizedCode: string) {
  return /\breturn\s+(?:i|idx|index)\b/.test(normalizedCode)
}

function hasMinusOneFallback(normalizedCode: string) {
  return /\breturn\s+-1\b/.test(normalizedCode)
}

function runTask2(codeText: string): TaskRunResult {
  const normalizedCode = normalizeCode(codeText)

  if (!hasFrequencyMapLogic(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'MISSING_HASHMAP',
      message: 'Run failed: build a frequency map before scanning for the first unique character.',
    }
  }

  if (!hasIndexReturn(normalizedCode) || !hasMinusOneFallback(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'WRONG_RETURN',
      message: 'Run failed: return the index of the first unique character, or -1 when none exists.',
    }
  }

  if (!hasUniqueSearchPass(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'OUTPUT_MISMATCH',
      message: 'Run failed: output mismatch. Add a second pass that checks counts and returns the first index.',
    }
  }

  return {
    status: 'success',
    message: 'Run succeeded. First non-repeating character index matches expected output.',
  }
}

function applyFirstUniquePatch(codeText: string) {
  if (codeText.includes('function firstUnique')) {
    return solutionCode
  }

  return `${codeText.trim()}\n\n${solutionCode}`
}

export const task2FirstUnique: TaskDefinition = {
  id: '2',
  title: 'First Non-Repeating Character',
  description: 'Use a hash map and two-pass scan to find the first unique character index.',
  topic: 'Strings + hash map',
  difficulty: 'medium',
  module: 'Foundations',
  starterCode,
  solutionCode,
  languageRuntime: 'javascript_sim',
  run: runTask2,
  errorKeyConfig: {
    MISSING_HASHMAP: {
      nudgeCopy: 'Start by counting each character frequency with a hash map before deciding on the answer.',
      guidedSteps: [
        {
          title: 'Create a frequency map',
          detail: 'Initialize a dictionary keyed by character with numeric counts.',
          runMessage: 'Step 1/3: preparing frequency map.',
          highlightedLines: [2],
          proposedLines: [2],
        },
        {
          title: 'Fill counts in first pass',
          detail: 'Loop through the string and increment the count for each character.',
          runMessage: 'Step 2/3: counting character frequency.',
          highlightedLines: [4, 5],
          proposedLines: [4, 5],
        },
        {
          title: 'Prepare for unique scan',
          detail: 'Once counts are ready, use them to evaluate uniqueness in a second pass.',
          runMessage: 'Step 3/3: map ready for unique check.',
          highlightedLines: [7],
          proposedLines: [7],
        },
      ],
      applyPatch: applyFirstUniquePatch,
    },
    WRONG_RETURN: {
      nudgeCopy:
        'The function should return the index of the first unique character, and -1 only if no unique character exists.',
      guidedSteps: [
        {
          title: 'Return the index, not the character',
          detail: 'In the second pass, return the current index when a count is exactly one.',
          runMessage: 'Step 1/3: validating return target.',
          highlightedLines: [8, 9],
          proposedLines: [9],
        },
        {
          title: 'Handle no-unique fallback',
          detail: 'If no unique character is found, the final fallback should return -1.',
          runMessage: 'Step 2/3: validating fallback return.',
          highlightedLines: [12],
          proposedLines: [12],
        },
        {
          title: 'Rerun with corrected returns',
          detail: 'Keep both return paths explicit to make output deterministic.',
          runMessage: 'Step 3/3: return paths are ready.',
          highlightedLines: [9, 12],
          proposedLines: [9, 12],
        },
      ],
      applyPatch: applyFirstUniquePatch,
    },
    OUTPUT_MISMATCH: {
      nudgeCopy:
        'You are close. Keep the two-pass flow: count characters first, then scan indices for the first count of one.',
      guidedSteps: [
        {
          title: 'Verify two-pass structure',
          detail: 'First pass computes counts. Second pass checks each index in order.',
          runMessage: 'Step 1/3: validating pass structure.',
          highlightedLines: [4, 8],
          proposedLines: [4, 8],
        },
        {
          title: 'Check uniqueness condition',
          detail: 'Use count === 1 as the unique condition in the second pass.',
          runMessage: 'Step 2/3: validating uniqueness condition.',
          highlightedLines: [9],
          proposedLines: [9],
        },
        {
          title: 'Finalize deterministic output',
          detail: 'Return first matching index, otherwise -1 at the end.',
          runMessage: 'Step 3/3: finalizing output logic.',
          highlightedLines: [9, 12],
          proposedLines: [9, 12],
        },
      ],
      applyPatch: applyFirstUniquePatch,
    },
  },
  demoScript: {
    partialFixCode: demoPartialFixCode,
  },
}
