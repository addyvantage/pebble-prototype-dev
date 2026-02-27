import { runTask } from '../utils/taskHarness'
import type { TaskDefinition } from './types'

const starterCode = `function sumEven(nums: number[]) {
  let total = 0;
  for (const n of nums) {
    if (n % 2 = 0) {
      total += nums;
    }
  }
  return total
}`

const solutionCode = `function sumEven(nums: number[]) {
  let total = 0;
  for (const n of nums) {
    if (n % 2 === 0) {
      total += n;
    }
  }
  return total;
}`

const demoPartialFixCode = `function sumEven(nums: number[]) {
  let total = 0;
  for (const n of nums) {
    if (n % 2 == 0) {
      total += nums;
    }
  }
  return total;
}`

function applySumEvenPatch(codeText: string) {
  const lines = codeText.split('\n')
  const nextLines = [...lines]

  let parityPatched = false
  let accumulatorPatched = false

  for (let index = 0; index < nextLines.length; index += 1) {
    const line = nextLines[index]

    if (!parityPatched && line.includes('if') && line.includes('%') && line.includes('2')) {
      const indent = line.match(/^\s*/)?.[0] ?? ''
      nextLines[index] = `${indent}if (n % 2 === 0) {`
      parityPatched = true
      continue
    }

    if (!accumulatorPatched && line.includes('total') && line.includes('+=')) {
      const indent = line.match(/^\s*/)?.[0] ?? ''
      nextLines[index] = `${indent}total += n;`
      accumulatorPatched = true
    }
  }

  const returnLineIndex = nextLines.findIndex((line) => line.trimStart().startsWith('return total'))
  if (returnLineIndex >= 0) {
    const indent = nextLines[returnLineIndex].match(/^\s*/)?.[0] ?? ''
    nextLines[returnLineIndex] = `${indent}return total;`
  }

  if (!parityPatched || !accumulatorPatched) {
    return solutionCode
  }

  return nextLines.join('\n')
}

const errorKeyConfig: TaskDefinition['errorKeyConfig'] = {
  PARITY_CHECK: {
    nudgeCopy:
      'Parity validation is unstable. Lock the condition to n % 2 === 0 before accumulating.',
    guidedSteps: [
      {
        title: 'Stabilize parity condition',
        detail: 'Your branch condition needs strict equality to filter only even values.',
        runMessage: 'Step 1/3: verifying parity condition syntax.',
        highlightedLines: [4],
        proposedLines: [4],
      },
      {
        title: 'Confirm branch intent',
        detail: 'This branch should run only when the number is even.',
        runMessage: 'Step 2/3: confirming branch behavior.',
        highlightedLines: [4],
        proposedLines: [4],
      },
      {
        title: 'Apply strict parity check',
        detail: 'Apply the minimal operator fix and rerun.',
        runMessage: 'Step 3/3: ready to apply parity correction.',
        highlightedLines: [4],
        proposedLines: [4],
      },
    ],
    applyPatch: applySumEvenPatch,
  },
  ACCUMULATOR_TARGET: {
    nudgeCopy: 'Accumulator target is off. Add the current value n, not the source collection.',
    guidedSteps: [
      {
        title: 'Trace accumulation line',
        detail: 'The total update line is pulling from the wrong source.',
        runMessage: 'Step 1/3: locating accumulator target.',
        highlightedLines: [5],
        proposedLines: [5],
      },
      {
        title: 'Align accumulation intent',
        detail: 'Only the current loop value should be added to total.',
        runMessage: 'Step 2/3: validating accumulator logic.',
        highlightedLines: [5],
        proposedLines: [5],
      },
      {
        title: 'Apply accumulator correction',
        detail: 'Swap accumulator input to n and rerun.',
        runMessage: 'Step 3/3: ready to apply accumulator fix.',
        highlightedLines: [5],
        proposedLines: [5],
      },
    ],
    applyPatch: applySumEvenPatch,
  },
  OUTPUT_MISMATCH: {
    nudgeCopy: 'Output still mismatches. Tighten the final return path after parity and accumulation.',
    guidedSteps: [
      {
        title: 'Re-check output path',
        detail: 'Final output needs to return the stabilized total.',
        runMessage: 'Step 1/3: checking output path.',
        highlightedLines: [8],
        proposedLines: [8],
      },
      {
        title: 'Validate full function flow',
        detail: 'Parity branch + accumulation should feed directly into return total.',
        runMessage: 'Step 2/3: validating full flow.',
        highlightedLines: [4, 5, 8],
        proposedLines: [8],
      },
      {
        title: 'Apply output-safe cleanup',
        detail: 'Apply the minimal return cleanup and rerun.',
        runMessage: 'Step 3/3: ready to apply output correction.',
        highlightedLines: [8],
        proposedLines: [8],
      },
    ],
    applyPatch: applySumEvenPatch,
  },
}

const lesson: NonNullable<TaskDefinition['lesson']> = {
  objectives: [
    'Filter only even numbers with a strict parity check.',
    'Accumulate the current value, not the full array.',
    'Return the final numeric total cleanly.',
  ],
  constraints: [
    'Keep a single pass through the array.',
    'Avoid mutating the input array.',
    'Use lightweight loop logic with no extra helpers.',
  ],
  hints: [
    'Look at the condition line first: parity should be a boolean expression.',
    'Inside the branch, add `n` because `n` is the current loop value.',
    'A tiny operator fix often resolves the main bug quickly.',
  ],
  commonMistakes: [
    'Using `=` instead of `===` in the parity condition.',
    'Adding `nums` instead of `n` in the accumulator.',
    'Forgetting the semicolon or return cleanup after edits.',
  ],
}

export const task1SumEven: TaskDefinition = {
  id: '1',
  title: 'Sum Even Numbers',
  description: 'Fix parity and accumulator logic so only even values contribute to the total.',
  topic: 'Arrays & loops',
  difficulty: 'easy',
  module: 'Strings',
  lesson,
  starterCode,
  solutionCode,
  languageRuntime: 'javascript_sim',
  run: runTask,
  errorKeyConfig,
  demoScript: {
    partialFixCode: demoPartialFixCode,
  },
}
