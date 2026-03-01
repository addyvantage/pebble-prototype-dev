import type { CurriculumUnit } from '../content/pathLoader'
import {
  getProblemStarterCode,
  type ProblemDefinition,
  type ProblemLanguage,
} from '../data/problemsBank'
import type { PlacementLanguage } from '../data/onboardingData'
import { getUnitFunctionMode } from './functionMode'
import type { PebbleLanguageId } from './languages'

function isProblemLanguage(language: PebbleLanguageId): language is ProblemLanguage {
  return language === 'python' || language === 'javascript' || language === 'cpp' || language === 'java' || language === 'sql'
}

function isPlacementLanguage(language: PebbleLanguageId): language is PlacementLanguage {
  return language === 'python' || language === 'javascript' || language === 'cpp' || language === 'java' || language === 'c'
}

export function getProblemBoilerplate(problem: ProblemDefinition, language: PebbleLanguageId) {
  if (!isProblemLanguage(language)) {
    return null
  }
  return getProblemStarterCode(problem, language)
}

export function getCurriculumBoilerplate(unit: CurriculumUnit, language: PebbleLanguageId) {
  if (!isPlacementLanguage(language)) {
    return unit.starterCode
  }

  const functionMode = getUnitFunctionMode(language, unit.id)
  return functionMode?.starterStub ?? unit.starterCode
}
