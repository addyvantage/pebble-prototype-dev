import type { TaskRunResult } from '../utils/taskHarness'
import type { TaskDefinition } from './types'

const starterCode = `function reverseWords(s: string): string {
  return ""
}`

const solutionCode = `function reverseWords(s: string): string {
  return s
    .trim()
    .split(/\\s+/)
    .reverse()
    .join(' ')
}`

function normalizeCode(codeText: string) {
  return codeText.replace(/\s+/g, ' ').trim()
}

function hasTrim(normalizedCode: string) {
  return /\.trim\(\)/.test(normalizedCode)
}

function hasWhitespaceSplit(normalizedCode: string) {
  return /\.split\(\s*\/\\s\+\/\s*\)/.test(normalizedCode) || /\.split\(\s*["']\s+["']\s*\)/.test(normalizedCode)
}

function hasReverse(normalizedCode: string) {
  return /\.reverse\(\)/.test(normalizedCode)
}

function hasSingleSpaceJoin(normalizedCode: string) {
  return /\.join\(\s*["']\s["']\s*\)/.test(normalizedCode)
}

function runTask5(codeText: string): TaskRunResult {
  const normalizedCode = normalizeCode(codeText)

  if (!hasTrim(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'TRIM_NOT_HANDLED',
      message: 'Run failed: trim outer whitespace before splitting words.',
    }
  }

  if (!hasSingleSpaceJoin(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'WRONG_JOIN',
      message: 'Run failed: join words with a single space in the final output.',
    }
  }

  if (!hasWhitespaceSplit(normalizedCode) || !hasReverse(normalizedCode)) {
    return {
      status: 'error',
      errorKey: 'OUTPUT_MISMATCH',
      message: 'Run failed: split by whitespace, reverse the words array, then join.',
    }
  }

  return {
    status: 'success',
    message: 'Run succeeded. Word order reversal handles spacing correctly.',
  }
}

function applyReverseWordsPatch(codeText: string) {
  if (codeText.includes('function reverseWords')) {
    return solutionCode
  }
  return `${codeText.trim()}\n\n${solutionCode}`
}

const lesson: NonNullable<TaskDefinition['lesson']> = {
  objectives: [
    'Trim outer whitespace first.',
    'Split words using whitespace-aware parsing.',
    'Reverse word order, then join with a single space.',
  ],
  constraints: [
    'Preserve word content, only change word order.',
    'Normalize repeated spaces into single separators.',
  ],
  hints: [
    'A chained transform is enough: `trim -> split -> reverse -> join`.',
    'Regex `/\\s+/` handles multiple spaces cleanly.',
    "The join separator should be exactly `' '`.",
  ],
  commonMistakes: [
    'Skipping `trim()` and keeping stray leading/trailing spaces.',
    'Using default join (comma) instead of a single space.',
    'Reversing characters instead of whole words.',
  ],
}

export const task5ReverseWords: TaskDefinition = {
  id: '5',
  title: 'Reverse Words in a String',
  description: 'Trim, split, reverse, and re-join words with stable spacing.',
  topic: 'Trim / split / reverse / join',
  difficulty: 'easy',
  module: 'Strings',
  lesson,
  starterCode,
  solutionCode,
  languageRuntime: 'javascript_sim',
  run: runTask5,
  errorKeyConfig: {
    TRIM_NOT_HANDLED: {
      nudgeCopy: 'Trim input first so leading and trailing spaces do not corrupt output.',
      guidedSteps: [
        {
          title: 'Normalize outer spaces',
          detail: 'Call trim() before processing words.',
          runMessage: 'Step 1/4: adding trim.',
          highlightedLines: [3],
          proposedLines: [3],
        },
        {
          title: 'Preserve only word content',
          detail: 'Trimmed input makes split/reverse deterministic.',
          runMessage: 'Step 2/4: validating normalized input.',
          highlightedLines: [2, 3],
          proposedLines: [3],
        },
        {
          title: 'Continue through transform chain',
          detail: 'After trim, split and reverse will behave consistently.',
          runMessage: 'Step 3/4: preparing transform chain.',
          highlightedLines: [4, 5],
          proposedLines: [4, 5],
        },
        {
          title: 'Return cleaned reversed output',
          detail: 'Final return should use normalized words only.',
          runMessage: 'Step 4/4: trim step complete.',
          highlightedLines: [6],
          proposedLines: [6],
        },
      ],
      applyPatch: applyReverseWordsPatch,
    },
    WRONG_JOIN: {
      nudgeCopy:
        'Join with exactly one space to collapse repeated whitespace between words.',
      guidedSteps: [
        {
          title: 'Keep words array',
          detail: 'Maintain transformed words as an array before final string output.',
          runMessage: 'Step 1/4: checking words array flow.',
          highlightedLines: [4, 5],
          proposedLines: [4, 5],
        },
        {
          title: 'Use single-space join',
          detail: "The join separator should be exactly ' '.",
          runMessage: 'Step 2/4: fixing join separator.',
          highlightedLines: [6],
          proposedLines: [6],
        },
        {
          title: 'Avoid commas or multi-space join',
          detail: 'Any other separator will fail expected output formatting.',
          runMessage: 'Step 3/4: validating output format.',
          highlightedLines: [6],
          proposedLines: [6],
        },
        {
          title: 'Return final string',
          detail: 'Return the joined reversed words directly.',
          runMessage: 'Step 4/4: output formatting fixed.',
          highlightedLines: [6],
          proposedLines: [6],
        },
      ],
      applyPatch: applyReverseWordsPatch,
    },
    OUTPUT_MISMATCH: {
      nudgeCopy:
        'Use the full pipeline: trim -> split by whitespace -> reverse -> join with single spaces.',
      guidedSteps: [
        {
          title: 'Split on whitespace',
          detail: 'Use a whitespace regex so multiple spaces collapse safely.',
          runMessage: 'Step 1/4: correcting split.',
          highlightedLines: [4],
          proposedLines: [4],
        },
        {
          title: 'Reverse word order',
          detail: 'Reverse the array, not characters in each word.',
          runMessage: 'Step 2/4: applying reverse.',
          highlightedLines: [5],
          proposedLines: [5],
        },
        {
          title: 'Join words with one space',
          detail: 'Finalize with join(" ") for expected formatting.',
          runMessage: 'Step 3/4: finalizing join.',
          highlightedLines: [6],
          proposedLines: [6],
        },
        {
          title: 'Return transformed result',
          detail: 'Ensure the pipeline result is returned from the function.',
          runMessage: 'Step 4/4: output path complete.',
          highlightedLines: [2, 6],
          proposedLines: [6],
        },
      ],
      applyPatch: applyReverseWordsPatch,
    },
  },
}
