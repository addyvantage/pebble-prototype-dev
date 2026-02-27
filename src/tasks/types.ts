import type { RunErrorKey, TaskRunResult } from '../utils/taskHarness'

export type TaskId = string

export type GuidedStep = {
  title: string
  detail: string
  runMessage: string
  highlightedLines: number[]
  proposedLines: number[]
}

export type TaskErrorConfig = {
  nudgeCopy: string
  guidedSteps: GuidedStep[]
  applyPatch?: (codeText: string) => string
}

export type TaskLesson = {
  objectives: string[]
  constraints?: string[]
  hints: string[]
  commonMistakes: string[]
}

export type TaskDefinition = {
  id: TaskId
  title: string
  description: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  module: string
  lesson?: TaskLesson
  starterCode: string
  solutionCode: string
  languageRuntime: 'javascript_sim'
  run: (codeText: string) => TaskRunResult
  errorKeyConfig: Partial<Record<RunErrorKey, TaskErrorConfig>>
  demoScript?: {
    partialFixCode?: string
  }
}
