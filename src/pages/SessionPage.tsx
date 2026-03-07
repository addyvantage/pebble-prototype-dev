import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { StreakPill } from '../components/ui/StreakPill'
import { PebbleChatPanel } from '../components/session/PebbleChatPanel'
import { ProblemStatementPanel } from '../components/session/ProblemStatementPanel'
import {
  TestResultsPanel,
  type UnitTestResultItem,
} from '../components/session/TestResultsPanel'
import { UnitsDrawer } from '../components/session/UnitsDrawer'
import {
  getUnitIndexFromStartUnit,
  getLanguageMetadata,
  isPlacementLanguage,
  isPlacementLevel,
  type PlacementLanguage,
  type PlacementLevel,
  type StartUnit,
} from '../data/onboardingData'
import { loadCurriculumPath, type CurriculumUnit } from '../content/pathLoader'
import {
  getPebbleUserState,
  savePebbleCurriculumProgress,
} from '../utils/pebbleUserState'
import {
  buildFunctionModeRunnable,
  buildSingleCaseFunctionModeRunnable,
  getUnitFunctionMode,
  parseHarnessCasesFromStdout,
  validateFunctionSignature,
  type RunnerSourceMap,
} from '../lib/functionMode'
import { Check, ChevronLeft, ChevronRight, FileText, Home, Play, RotateCcw, Settings2, Share2, SlidersHorizontal } from 'lucide-react'
import {
  loadUnitProgress,
  markUnitCompleted,
  saveUnitProgress,
  type UnitProgressMap,
} from '../lib/progressStore'
import { setRecentActivity } from '../lib/recentStore'
import {
  appendSubmission,
  loadSubmissions,
  saveSubmissions,
  type SubmissionsByUnit,
} from '../lib/submissionsStore'
import { useBodyScrollLock } from '../utils/useBodyScrollLock'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { loadPagePrefs, savePagePrefs, type PagePrefs } from '../lib/pagePrefsStore'
import { useI18n } from '../i18n/useI18n'
import { getLocalizedUnitCopy } from '../i18n/unitContent'
import {
  applySqlStarterComment,
  getLocalizedProblem,
  getLocalizedStarter,
} from '../i18n/problemContent'
import { logSolveEvent } from '../lib/solveEvents'
import {
  dateKeyForTimeZone,
  selectCurrentStreak,
  selectDailyCompletions,
} from '../lib/analyticsDerivers'
import {
  getAnalyticsState,
  subscribeAnalytics,
  classifyErrorType,
  logAssistEvent,
  logRunEvent,
  logSubmitEvent,
} from '../lib/analyticsStore'
import {
  getDefaultProblemLanguage,
  getProblemById,
  getProblemTimeEstimateMinutes,
  getProblemStarterCode,
  getSqlCheckerFailures,
  type ProblemDefinition,
  type ProblemLanguage,
  type SqlPreviewTable,
} from '../data/problemsBank'
import { markProblemAttempt } from '../lib/solvedProblemsStore'
import { requestRunApi, type RunApiResponse } from '../lib/runApi'
import { localizeTopicLabel } from '../i18n/topicCatalog'
import type { LanguageCode } from '../i18n/languages'
import {
  createStruggleEngine,
  type StruggleAssistAction,
  type StruggleEvent,
  type StruggleContextSummary,
  type StruggleEngineState,
  type StruggleLevel,
} from '../lib/struggleEngine'
import { buildRunFailureDiagnostic } from '../lib/runDiagnostics'
import {
  LANGUAGE_IDS,
  fromLegacyCodeLanguageId,
  getLanguageDescriptor,
  normalizeSessionLanguageId,
  toLegacyCodeLanguageId,
  type LanguageId,
  type SessionLanguageId,
} from '../../shared/languageRegistry'
import { ProgramLangDropdown, type ProgramLangOption } from '../components/session/ProgramLangDropdown'
import { StopwatchControl } from '../components/session/StopwatchControl'
import { ConfirmDialog } from '../components/modals/ConfirmDialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import {
  loadProblemCodeByLang,
  saveProblemCodeByLang,
  type ProblemCodeByLang,
  type ProblemCodeByLangEntry,
} from '../lib/problemCodeByLangStore'
import { getCurriculumUnitModeDescriptor, getProblemModeDescriptor } from '../lib/modeRegistry'
import { telemetry } from '../lib/telemetry'
import { pushNotification } from '../lib/notificationsStore'
import { apiFetch } from '../lib/apiUrl'
import {
  getDefaultLearningTrack,
  loadEditorLanguagePreference,
  loadEditorLanguageUserOverride,
  loadLearningTrack,
  saveEditorLanguagePreference,
  saveEditorLanguageUserOverride,
  saveLearningTrack,
  toDefaultEditorLanguage,
  type LearningTrack,
} from '../lib/sessionPreferencesStore'

type StruggleNudgeState = {
  level: StruggleLevel
  visible: boolean
}

type RuntimeProbeState = {
  ok: boolean
  reason?: string
}

const TOOLCHAIN_PROBES: Record<LanguageId, { code: string; stdin: string }> = {
  python3: {
    code: 'print("")\n',
    stdin: '',
  },
  javascript: {
    code: 'process.stdout.write("")\n',
    stdin: '',
  },
  cpp17: {
    code: '#include <iostream>\nint main(){ return 0; }\n',
    stdin: '',
  },
  java17: {
    code: 'public class Main { public static void main(String[] args) { } }\n',
    stdin: '',
  },
  c: {
    code: '#include <stdio.h>\nint main(void){ return 0; }\n',
    stdin: '',
  },
}

type SessionEditorLanguage = SessionLanguageId
const DEFAULT_EDITOR_LANGUAGE: SessionEditorLanguage = 'python3'

function getMonacoLanguageForSession(language: SessionEditorLanguage) {
  if (language === 'sql') {
    return 'plaintext'
  }
  return getLanguageDescriptor(language).monacoLanguage
}

function getRuntimeSourceFile(language: LanguageId) {
  if (language === 'python3') {
    return 'main.py'
  }
  if (language === 'javascript') {
    return 'main.cjs'
  }
  if (language === 'java17') {
    return 'Main.java'
  }
  if (language === 'c') {
    return 'main.c'
  }
  return 'main.cpp'
}

function buildDirectSourceMap(language: LanguageId, code: string): RunnerSourceMap {
  const lineCount = Math.max(1, code.split(/\r?\n/).length)
  return {
    fileName: getRuntimeSourceFile(language),
    userStartLine: 1,
    userEndLine: lineCount,
  }
}

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim()
}

function statusVariant(status: string): 'neutral' | 'success' | 'warning' {
  if (status === 'success') {
    return 'success'
  }
  if (status === 'error') {
    return 'warning'
  }
  return 'neutral'
}

function localizeProblemChip(
  chip: string,
  lang: LanguageCode,
  t: (key: 'problem.chip.sql' | 'problem.chip.subquery') => string,
) {
  const normalized = chip.trim().toLowerCase()
  if (normalized === 'sql') {
    return t('problem.chip.sql')
  }
  if (normalized === 'subquery') {
    return t('problem.chip.subquery')
  }
  return localizeTopicLabel(chip, lang)
}

function resolveCurriculumDifficulty(level: PlacementLevel, unitId: string): 'Easy' | 'Medium' | 'Hard' {
  if (unitId === 'hello-world') {
    return 'Easy'
  }
  if (level === 'beginner') {
    return 'Easy'
  }
  if (level === 'intermediate') {
    return 'Medium'
  }
  return 'Hard'
}

function buildFailingSummary(
  resultsByIndex: Record<number, UnitTestResultItem>,
  options: {
    compileUserLine: (line: number) => string
    compileWrapper: string
    compileGeneric: string
    runtime: string
    timeout: string
    toolchain: string
    validation: string
    internal: string
    expectedLabel: string
    stderrLabel: string
    actualLabel: string
    emptyLabel: string
  },
) {
  const failed = Object.entries(resultsByIndex)
    .map(([index, result]) => ({ index: Number(index), result }))
    .filter(({ result }) => !result.passed)
    .sort((a, b) => a.index - b.index)
    .slice(0, 2)

  if (failed.length === 0) {
    return ''
  }

  return failed
    .map(({ index, result }) => {
      if (result.diagnostic) {
        let summary = options.internal
        if (result.diagnostic.status === 'compile_error') {
          if (result.diagnostic.locationKind === 'user_code' && result.diagnostic.editorLine) {
            summary = options.compileUserLine(result.diagnostic.editorLine)
          } else if (result.diagnostic.locationKind === 'runner_wrapper') {
            summary = options.compileWrapper
          } else {
            summary = options.compileGeneric
          }
        } else if (result.diagnostic.status === 'runtime_error') {
          summary = options.runtime
        } else if (result.diagnostic.status === 'timeout') {
          summary = options.timeout
        } else if (result.diagnostic.status === 'toolchain_unavailable') {
          summary = options.toolchain
        } else if (result.diagnostic.status === 'validation_error') {
          summary = options.validation
        }
        return `#${index + 1} ${summary}`
      }
      const actual = result.stderr.trim()
        ? `${options.stderrLabel}: ${result.stderr.slice(0, 120)}`
        : `${options.actualLabel}: ${result.actual || options.emptyLabel}`
      return `#${index + 1} ${options.expectedLabel}: ${result.expected}; ${actual}`
    })
    .join(' | ')
}

function isStartUnit(value: string | null): value is StartUnit {
  return value === '1' || value === 'mid' || value === 'advanced'
}

function buildProblemUnit(
  problem: ProblemDefinition,
  starterCode: string,
  practiceLabel: string,
): CurriculumUnit {
  return {
    id: problem.id,
    title: problem.title,
    concept: problem.topics[0] ?? practiceLabel,
    prompt: problem.statement.summary,
    starterCode,
    tests: problem.tests,
    hints: [],
  }
}

function toPlacementLanguage(language: SessionEditorLanguage): PlacementLanguage | null {
  if (language === 'sql') {
    return null
  }
  return toLegacyCodeLanguageId(language)
}

function toProblemLanguage(language: SessionEditorLanguage): ProblemLanguage | null {
  if (language === 'sql') {
    return 'sql'
  }
  return toLegacyCodeLanguageId(language)
}

function resolveEntryLanguage(
  value: string | null,
  allowed: SessionEditorLanguage[],
): SessionEditorLanguage | null {
  const normalized = normalizeSessionLanguageId(value)
  if (!normalized) {
    return null
  }
  return allowed.includes(normalized) ? normalized : null
}

function buildMissingTemplateMessage(unitId: string, language: SessionEditorLanguage) {
  return `[session] Missing boilerplate template for unit="${unitId}" language="${language}".`
}

function normalizeTemplateText(value: string) {
  return value.replace(/\r\n/g, '\n').trim()
}

function repairLegacyCFunctionDraft(unitId: string, language: SessionEditorLanguage, code: string) {
  if (language !== 'c') {
    return code
  }

  const cTemplate = getUnitFunctionMode('c', unitId)?.starterStub
  if (!cTemplate) {
    return code
  }

  const normalizedCode = normalizeTemplateText(code)
  if (!normalizedCode) {
    return code
  }

  const cppTemplate = getUnitFunctionMode('cpp', unitId)?.starterStub
  if (cppTemplate && normalizedCode === normalizeTemplateText(cppTemplate)) {
    return cTemplate
  }

  if (
    unitId === 'hello-world'
    && /class\s+Solution/.test(normalizedCode)
    && /string\s+solve\s*\(/.test(normalizedCode)
    && !/char\s*\*\s*solve\s*\(/.test(normalizedCode)
  ) {
    return cTemplate
  }

  return code
}

function formatSqlPreviewTable(table: SqlPreviewTable) {
  const header = table.columns.join(' | ')
  const separator = table.columns.map(() => '---').join(' | ')
  const body = table.rows.map((row) => row.join(' | ')).join('\n')
  return `${header}\n${separator}\n${body}`.trim()
}

function defineMonacoThemes(monaco: typeof import('monaco-editor')) {
  monaco.editor.defineTheme('pebble-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#EEF2FA',
      'editor.lineHighlightBackground': '#E4EAF650',
      'editorLineNumber.foreground': '#9BA3B8',
      'editorLineNumber.activeForeground': '#4C5F78',
      'editor.selectionBackground': '#1D4ED825',
      'editorCursor.foreground': '#1D4ED8',
      'editorGutter.background': '#E4EAF6',
    },
  })
  monaco.editor.defineTheme('pebble-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#252A3C',
      'editor.lineHighlightBackground': '#FFFFFF08',
      'editorLineNumber.foreground': '#707691',
      'editorLineNumber.activeForeground': '#B9C0D4',
      'editor.selectionBackground': '#3B82F628',
      'editorCursor.foreground': '#60A5FA',
      'editorGutter.background': '#1E2231',
    },
  })
}

export function SessionPage() {
  const auth = useAuth()
  const { lang: uiLanguage, t, format } = useI18n()
  const [searchParams] = useSearchParams()
  const analyticsState = useSyncExternalStore(subscribeAnalytics, getAnalyticsState, getAnalyticsState)
  const storedState = useMemo(() => getPebbleUserState(), [analyticsState.updatedAt])
  const queryUnit = searchParams.get('unit')
  const queryProblemId = searchParams.get('problem')

  // Session should behave like an app workspace with independently scrollable rails.
  useBodyScrollLock(true)

  const learningTrack = useMemo<LearningTrack>(() => {
    const persistedTrack = loadLearningTrack()
    const queryLanguage = searchParams.get('lang')
    const queryLevel = searchParams.get('level')
    const baseLanguage =
      (isPlacementLanguage(queryLanguage) ? queryLanguage : null) ??
      storedState.curriculum?.selectedLanguage ??
      storedState.placement?.language ??
      storedState.onboarding?.language ??
      persistedTrack?.languageFocus ??
      getDefaultLearningTrack().languageFocus
    const baseLevel =
      (isPlacementLevel(queryLevel) ? queryLevel : null) ??
      storedState.curriculum?.selectedLevel ??
      storedState.placement?.level ??
      storedState.onboarding?.level ??
      persistedTrack?.level ??
      getDefaultLearningTrack().level

    return {
      languageFocus: baseLanguage,
      level: baseLevel,
    }
  }, [searchParams, storedState])

  const selectedLanguage: PlacementLanguage = learningTrack.languageFocus
  const selectedLevel: PlacementLevel = learningTrack.level

  const activeProblemBase = useMemo(() => getProblemById(queryProblemId), [queryProblemId])
  const activeProblem = useMemo(
    () => (activeProblemBase ? getLocalizedProblem(activeProblemBase, uiLanguage) : null),
    [activeProblemBase, uiLanguage],
  )
  const [editorLanguage, setEditorLanguage] = useState<SessionEditorLanguage>(() => {
    return (
      loadEditorLanguagePreference()
      ?? toDefaultEditorLanguage(learningTrack)
      ?? DEFAULT_EDITOR_LANGUAGE
    )
  })
  const [editorLanguageUserOverride, setEditorLanguageUserOverride] = useState<boolean>(() => loadEditorLanguageUserOverride())
  const [problemCodeByLang, setProblemCodeByLang] = useState<ProblemCodeByLang>(() => loadProblemCodeByLang())

  const [units, setUnits] = useState<CurriculumUnit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false)
  const [sessionSettingsOpen, setSessionSettingsOpen] = useState(false)
  const [pagePrefs, setPagePrefs] = useState<PagePrefs>(() => loadPagePrefs())

  const [currentUnitIndex, setCurrentUnitIndex] = useState(0)
  const [runtimeProbeByLanguage, setRuntimeProbeByLanguage] = useState<Partial<Record<LanguageId, RuntimeProbeState>>>({})
  const activeCurriculumUnit = units[currentUnitIndex] ?? null
  const languageOptionsWithState = useMemo<Array<{ id: SessionEditorLanguage; disabled: boolean; disabledReason?: string }>>(() => {
    const runtimeStateFor = (language: LanguageId): RuntimeProbeState | null => {
      return runtimeProbeByLanguage[language] ?? null
    }

    const runtimeDisabledReason = (language: LanguageId): string | undefined => {
      const state = runtimeStateFor(language)
      return state && !state.ok ? (state.reason ?? 'Language runtime is unavailable in this environment.') : undefined
    }

    if (activeProblemBase) {
      if (activeProblemBase.kind === 'sql') {
        return [{ id: 'sql', disabled: false }]
      }
      return LANGUAGE_IDS.map((id) => {
        const runtimeReason = runtimeDisabledReason(id)
        const templateReason = (() => {
          const starter = getProblemStarterCode(activeProblemBase, toLegacyCodeLanguageId(id))
          if (starter.trim()) {
            return undefined
          }
          const message = `[session] Missing stdio template for problem="${activeProblemBase.id}" language="${id}".`
          if (import.meta.env.DEV) {
            console.error(message)
          }
          return message
        })()
        return {
          id,
          disabled: Boolean(runtimeReason || templateReason),
          disabledReason: runtimeReason ?? templateReason,
        }
      })
    }

    const curriculumLanguages: LanguageId[] = [...LANGUAGE_IDS]
    if (!activeCurriculumUnit) {
      return curriculumLanguages.map((id) => ({ id, disabled: false }))
    }

    return curriculumLanguages.map((languageId) => {
      const placementLanguage = toPlacementLanguage(languageId)
      if (!placementLanguage) {
        return {
          id: languageId,
          disabled: true,
        }
      }

      const runtimeReason = runtimeDisabledReason(languageId)
      if (runtimeReason) {
        return {
          id: languageId,
          disabled: true,
          disabledReason: runtimeReason,
        }
      }

      const fnConfig = getUnitFunctionMode(placementLanguage, activeCurriculumUnit.id)
      if (!fnConfig) {
        const displayLanguage = getLanguageDescriptor(languageId).label
        return {
          id: languageId,
          disabled: true,
          disabledReason: t('run.functionModeUnavailable', { language: displayLanguage }),
        }
      }

      const sampleCase = activeCurriculumUnit.tests
        .map((test) => fnConfig.parseTestCase(test))
        .find((item): item is NonNullable<typeof item> => item !== null)
      const harnessSupported = placementLanguage === 'python'
        ? buildFunctionModeRunnable({
          language: placementLanguage,
          userCode: fnConfig.starterStub,
          methodName: fnConfig.methodName,
          cases: sampleCase ? [sampleCase] : [],
        }) !== null
        : buildSingleCaseFunctionModeRunnable({
          language: placementLanguage,
          userCode: fnConfig.starterStub,
          methodName: fnConfig.methodName,
          args: sampleCase?.args ?? [],
          inputText: sampleCase?.input ?? '',
          signatureLabel: fnConfig.signatureLabel,
        }) !== null

      return {
        id: languageId,
        disabled: !harnessSupported,
        disabledReason: !harnessSupported
          ? t('run.functionWrapperUnavailable', { language: getLanguageDescriptor(languageId).label })
          : undefined,
      }
    })
  }, [activeCurriculumUnit, activeProblemBase, runtimeProbeByLanguage, t])

  const languageOptions = useMemo<SessionEditorLanguage[]>(
    () => languageOptionsWithState.filter((option) => !option.disabled).map((option) => option.id),
    [languageOptionsWithState],
  )

  const dropdownLanguageOptions = useMemo<ProgramLangOption[]>(() => {
    const options: ProgramLangOption[] = []
    for (const { id, disabled, disabledReason } of languageOptionsWithState) {
      const label = id === 'sql' ? 'SQL (Simulated)' : getLanguageDescriptor(id).label
      options.push({
        id,
        label,
        disabled,
        disabledReason,
      })
    }
    return options
  }, [languageOptionsWithState])

  useEffect(() => {
    let cancelled = false

    async function probeRuntimes() {
      const languages: LanguageId[] = [...LANGUAGE_IDS]
      const entries = await Promise.all(
        languages.map(async (language) => {
          const probe = TOOLCHAIN_PROBES[language]
          const result = await requestRunApi(
            {
              language,
              code: probe.code,
              stdin: probe.stdin,
              timeoutMs: 1500,
            },
            { requestTimeoutMs: 2500 },
          )

          if (result.status === 'toolchain_unavailable') {
            return [language, { ok: false, reason: result.stderr.trim() || `Toolchain unavailable for ${language}.` }] as const
          }
          if (result.status === 'internal_error' && /runner not configured|failed to reach/i.test(result.stderr)) {
            return [language, { ok: false, reason: result.stderr.trim() || `Runner unavailable for ${language}.` }] as const
          }

          return [language, { ok: true }] as const
        }),
      )

      if (cancelled) {
        return
      }

      setRuntimeProbeByLanguage(Object.fromEntries(entries))
    }

    void probeRuntimes()

    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    saveLearningTrack(learningTrack)
  }, [learningTrack])

  useEffect(() => {
    saveEditorLanguagePreference(editorLanguage)
  }, [editorLanguage])

  useEffect(() => {
    saveEditorLanguageUserOverride(editorLanguageUserOverride)
  }, [editorLanguageUserOverride])

  const [draftByUnitId, setDraftByUnitId] = useState<Record<string, Partial<Record<SessionEditorLanguage, string>>>>({})
  const [unitProgress, setUnitProgress] = useState<UnitProgressMap>(() => {
    const persisted = loadUnitProgress()
    const migrated = { ...persisted }
    for (const unitId of storedState.curriculum?.completedUnitIds ?? []) {
      if (!migrated[unitId]?.completed) {
        migrated[unitId] = {
          completed: true,
          lastPassedAt: Date.now(),
        }
      }
    }
    return migrated
  })
  const [submissionsByUnit, setSubmissionsByUnit] = useState<SubmissionsByUnit>(() => loadSubmissions())

  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')

  // ── Phase 7: Report + Snapshot state ──────────────────────────────
  const [reportLoading, setReportLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareToast, setShareToast] = useState<string | null>(null)
  const [reportToast, setReportToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [runMessage, setRunMessage] = useState(t('run.evaluateAll'))
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [selectedTestIndex, setSelectedTestIndex] = useState(0)
  const [testResultsByIndex, setTestResultsByIndex] = useState<Record<number, UnitTestResultItem>>({})
  const [isRunningAll, setIsRunningAll] = useState(false)
  const [activeAction, setActiveAction] = useState<'run' | 'submit' | null>(null)
  const [totalDurationMs, setTotalDurationMs] = useState(0)
  const [submitAccepted, setSubmitAccepted] = useState(false)
  const [, setHighlightEditorLine] = useState<number | null>(null)
  const [signatureHelper, setSignatureHelper] = useState<{
    required: string
    found: string
  } | null>(null)
  const [recentChatSummary, setRecentChatSummary] = useState(
    storedState.curriculum?.recentChatSummary ?? '',
  )
  const [editorFontSize, setEditorFontSize] = useState(14)
  const [wordWrapEnabled, setWordWrapEnabled] = useState(true)
  const [liveCodeSnapshot, setLiveCodeSnapshot] = useState('')
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [struggleNudge, setStruggleNudge] = useState<StruggleNudgeState>({
    level: 0,
    visible: false,
  })

  const struggleEngineRef = useRef<ReturnType<typeof createStruggleEngine> | null>(null)
  if (!struggleEngineRef.current) {
    struggleEngineRef.current = createStruggleEngine()
  }
  const struggleStateRef = useRef<StruggleEngineState>(struggleEngineRef.current.getState())
  const lastNudgeVisibleRef = useRef(false)
  const lastNudgeLevelRef = useRef<StruggleLevel>(0)
  const previousCodeRef = useRef('')
  const liveCodeRef = useRef('')
  const hydratedEditorKeyRef = useRef('')
  const liveCodeDebounceRef = useRef<number | null>(null)
  const codeByLangPersistDebounceRef = useRef<number | null>(null)

  const completedUnitIds = useMemo(
    () =>
      Object.entries(unitProgress)
        .filter(([, entry]) => entry.completed)
        .map(([unitId]) => unitId),
    [unitProgress],
  )

  const languageMeta = useMemo(() => getLanguageMetadata(selectedLanguage), [selectedLanguage])
  const { theme, setTheme } = useTheme()
  const activeProblemLanguage = useMemo<ProblemLanguage>(() => {
    if (!activeProblemBase) {
      return 'python'
    }
    const editorProblemLanguage = toProblemLanguage(editorLanguage)
    if (editorProblemLanguage) {
      if (editorProblemLanguage === 'sql') {
        if (activeProblemBase.kind === 'sql') {
          return 'sql'
        }
      } else {
        return editorProblemLanguage
      }
    }
    return getDefaultProblemLanguage(activeProblemBase)
  }, [activeProblemBase, editorLanguage])
  const sessionLanguage: SessionEditorLanguage = activeProblem
    ? (activeProblemLanguage === 'sql' ? 'sql' : fromLegacyCodeLanguageId(activeProblemLanguage))
    : editorLanguage
  const runtimeLanguage: LanguageId = sessionLanguage === 'sql'
    ? fromLegacyCodeLanguageId(selectedLanguage)
    : sessionLanguage
  const editorPlacementLanguage = toPlacementLanguage(sessionLanguage) ?? selectedLanguage
  const sessionLanguageLabel = sessionLanguage === 'sql'
    ? 'SQL'
    : getLanguageDescriptor(sessionLanguage).label
  const isSqlMode = activeProblemBase?.kind === 'sql' && sessionLanguage === 'sql'
  const activeProblemStarter = useMemo(() => {
    if (!activeProblemBase) {
      return ''
    }
    const starter =
      getLocalizedStarter(activeProblemBase, uiLanguage)
      ?? getProblemStarterCode(activeProblemBase, activeProblemLanguage)
    if (activeProblemBase.kind !== 'sql') {
      return starter
    }
    return applySqlStarterComment(starter, t('session.sqlStarterComment'))
  }, [activeProblemBase, activeProblemLanguage, t, uiLanguage])
  const trackId = `${selectedLanguage}:${selectedLevel}`
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const dailyCompletions = useMemo(
    () => selectDailyCompletions(analyticsState.events, timeZone),
    [analyticsState.events, timeZone],
  )
  const todayKey = useMemo(
    () => dateKeyForTimeZone(nowTick, timeZone),
    [nowTick, timeZone],
  )
  const currentStreak = useMemo(
    () => selectCurrentStreak(dailyCompletions, todayKey),
    [dailyCompletions, todayKey],
  )
  const currentSessionKey = activeProblemBase?.id ?? `unit:${units[currentUnitIndex]?.id ?? ''}`

  useEffect(() => {
    if (currentSessionKey && currentUnitIndex >= 0) {
      telemetry.track('app.session_started', {}, {
        page: 'session',
        problemId: currentSessionKey.replace('unit:', ''),
        language: sessionLanguage,
      })
    }
  }, [currentSessionKey, currentUnitIndex, sessionLanguage])

  useEffect(() => {
    const fromSessionEntry = currentSessionKey
      ? resolveEntryLanguage(problemCodeByLang[currentSessionKey]?.selectedLanguage ?? null, languageOptions)
      : null
    const fromStoredEditorPref = resolveEntryLanguage(loadEditorLanguagePreference(), languageOptions)
    const fromTrack = resolveEntryLanguage(toDefaultEditorLanguage(learningTrack), languageOptions)
    const fromProblemDefault = (() => {
      if (!activeProblemBase) {
        return null
      }
      const defaultProblemLanguage = getDefaultProblemLanguage(activeProblemBase)
      return resolveEntryLanguage(
        defaultProblemLanguage === 'sql'
          ? 'sql'
          : fromLegacyCodeLanguageId(defaultProblemLanguage),
        languageOptions,
      )
    })()
    const nextLanguage =
      resolveEntryLanguage(editorLanguage, languageOptions)
      ?? fromSessionEntry
      ?? fromStoredEditorPref
      ?? fromTrack
      ?? fromProblemDefault
      ?? languageOptions[0]
      ?? DEFAULT_EDITOR_LANGUAGE

    setEditorLanguage((prev) => (prev === nextLanguage ? prev : nextLanguage))
  }, [
    activeProblemBase,
    currentSessionKey,
    editorLanguage,
    learningTrack,
    languageOptions,
    problemCodeByLang,
  ])

  useEffect(() => {
    if (editorLanguageUserOverride) {
      return
    }
    const trackLanguage = resolveEntryLanguage(toDefaultEditorLanguage(learningTrack), languageOptions)
    if (!trackLanguage) {
      return
    }
    setEditorLanguage((prev) => (prev === trackLanguage ? prev : trackLanguage))
  }, [editorLanguageUserOverride, languageOptions, learningTrack])

  useEffect(() => {
    saveUnitProgress(unitProgress)
  }, [unitProgress])

  useEffect(() => {
    savePagePrefs(pagePrefs)
  }, [pagePrefs])

  useEffect(() => {
    saveSubmissions(submissionsByUnit)
  }, [submissionsByUnit])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('reduced-motion', pagePrefs.reduceMotion)
  }, [pagePrefs.reduceMotion])

  useEffect(() => {
    if (runStatus === 'idle') {
      setRunMessage(t('run.evaluateAll'))
    }
  }, [runStatus, t])

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      if (liveCodeDebounceRef.current !== null) {
        window.clearTimeout(liveCodeDebounceRef.current)
      }
      if (codeByLangPersistDebounceRef.current !== null) {
        window.clearTimeout(codeByLangPersistDebounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadUnits() {
      setIsLoading(true)
      setLoadError('')
      try {
        if (activeProblem) {
          const problemUnit = buildProblemUnit(activeProblem, activeProblemStarter, t('tags.practice'))
          if (!mounted) {
            return
          }

          setUnits([problemUnit])
          setDraftByUnitId({})
          setCurrentUnitIndex(0)
          setSelectedTestIndex(0)
          setTestResultsByIndex({})
          setRunStatus('idle')
          setRunMessage(t('run.evaluateAll'))
          setTotalDurationMs(0)
          setSubmitAccepted(false)
          setHighlightEditorLine(null)
          setSignatureHelper(null)
          return
        }

        const nextUnits = await loadCurriculumPath(selectedLanguage)
        if (!mounted) {
          return
        }

        setUnits(nextUnits)
        setDraftByUnitId({})

        const preferredUnitId = storedState.curriculum?.currentUnitId
        const curriculumIndex = preferredUnitId
          ? nextUnits.findIndex((unit) => unit.id === preferredUnitId)
          : -1

        const placementStart = storedState.placement?.startUnitIndex
        const placementIndex =
          typeof placementStart === 'number' && placementStart > 0
            ? Math.min(placementStart - 1, nextUnits.length - 1)
            : -1

        let nextIndex = 0
        if (placementIndex >= 0) {
          nextIndex = placementIndex
        }
        if (curriculumIndex >= 0) {
          nextIndex = curriculumIndex
        }
        if (isStartUnit(queryUnit)) {
          nextIndex = getUnitIndexFromStartUnit(queryUnit, nextUnits.length)
        } else if (queryUnit && /^\d+$/.test(queryUnit)) {
          const numericUnit = Number.parseInt(queryUnit, 10)
          if (numericUnit >= 1) {
            nextIndex = Math.min(numericUnit - 1, nextUnits.length - 1)
          }
        }

        setCurrentUnitIndex(nextIndex)
        setSelectedTestIndex(0)
        setTestResultsByIndex({})
        setRunStatus('idle')
        setRunMessage(t('run.evaluateAll'))
        setTotalDurationMs(0)
        setSubmitAccepted(false)
        setHighlightEditorLine(null)
        setSignatureHelper(null)
      } catch (error) {
        if (!mounted) {
          return
        }
        const message = error instanceof Error ? error.message : t('error.loadCurriculumFailed')
        setLoadError(message)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    void loadUnits()

    return () => {
      mounted = false
    }
  }, [
    activeProblem,
    activeProblemStarter,
    queryUnit,
    selectedLanguage,
    storedState.curriculum?.currentUnitId,
    storedState.placement?.startUnitIndex,
    t,
  ])

  const currentUnit = units[currentUnitIndex] ?? null
  const resolveCurriculumTemplate = useCallback((unit: CurriculumUnit, language: SessionEditorLanguage) => {
    const placementLanguage = toPlacementLanguage(language)
    if (!placementLanguage) {
      const message = buildMissingTemplateMessage(unit.id, language)
      if (import.meta.env.DEV) {
        console.error(message)
      }
      return `/* ${message} */\n`
    }

    const functionMode = getUnitFunctionMode(placementLanguage, unit.id)
    if (functionMode) {
      return functionMode.starterStub
    }

    const message = buildMissingTemplateMessage(unit.id, language)
    if (import.meta.env.DEV) {
      console.error(message)
    }
    return `/* ${message} */\n`
  }, [])
  const resolveProblemTemplate = useCallback((language: SessionEditorLanguage) => {
    if (!activeProblemBase) {
      return ''
    }

    const problemLanguage = toProblemLanguage(language)
    if (!problemLanguage) {
      const message = `[session] Missing stdio language mapping for problem="${activeProblemBase.id}" language="${language}".`
      if (import.meta.env.DEV) {
        console.error(message)
      }
      return `/* ${message} */\n`
    }

    const starter = getProblemStarterCode(activeProblemBase, problemLanguage) ?? ''
    if (activeProblemBase.kind !== 'sql') {
      return starter
    }
    return applySqlStarterComment(starter, t('session.sqlStarterComment'))
  }, [activeProblemBase, t])
  const resolveSessionTemplate = useCallback((unit: CurriculumUnit, language: SessionEditorLanguage) => {
    if (activeProblemBase) {
      return resolveProblemTemplate(language)
    }
    return resolveCurriculumTemplate(unit, language)
  }, [activeProblemBase, resolveCurriculumTemplate, resolveProblemTemplate])
  const localizedUnits = useMemo(
    () => units.map((unit) => ({ unit, copy: getLocalizedUnitCopy(unit, uiLanguage) })),
    [uiLanguage, units],
  )
  const currentUnitCopy = currentUnit ? getLocalizedUnitCopy(currentUnit, uiLanguage) : null
  const currentDefaultCode = useMemo(() => {
    if (!currentUnit) {
      return ''
    }
    return resolveSessionTemplate(currentUnit, sessionLanguage)
  }, [currentUnit, resolveSessionTemplate, sessionLanguage])
  const currentCode = currentUnit ? draftByUnitId[currentUnit.id]?.[sessionLanguage] ?? currentDefaultCode : ''
  const currentFunctionConfig = useMemo(() => {
    if (!currentUnit || activeProblemBase) {
      return null
    }
    const fnConfigLang = toPlacementLanguage(sessionLanguage) ?? selectedLanguage
    return getUnitFunctionMode(fnConfigLang, currentUnit.id)
  }, [activeProblemBase, currentUnit, selectedLanguage, sessionLanguage])
  const currentModeDescriptor = useMemo(() => {
    if (activeProblemBase) {
      return getProblemModeDescriptor(activeProblemBase)
    }
    if (!currentUnit) {
      return { mode: 'stdio' as const, outputType: 'text' as const }
    }
    return getCurriculumUnitModeDescriptor(currentUnit, sessionLanguage)
  }, [activeProblemBase, currentUnit, sessionLanguage])

  const syncStruggle = useCallback((nextState: StruggleEngineState) => {
    struggleStateRef.current = nextState
    const nextVisible = nextState.nudgeVisible && nextState.level > 0
    if (!lastNudgeVisibleRef.current && nextVisible) {
      pushNotification({
        category: 'coach',
        title: 'Pebble Coach suggested a hint',
        message: 'You look stuck. Open coach for a quick nudge.',
        actionRoute: '/session/1',
        actionLabel: 'Open coach',
      })
    }
    if (lastNudgeLevelRef.current < 2 && nextState.level >= 2) {
      pushNotification({
        category: 'coach',
        title: 'You reached Tier 2 guidance',
        message: 'Explain mode is now available for this attempt.',
        actionRoute: '/session/1',
        actionLabel: 'View guidance',
      })
    }
    lastNudgeVisibleRef.current = nextVisible
    lastNudgeLevelRef.current = nextState.level
    setStruggleNudge((previous) => {
      const next = {
        level: nextState.level,
        visible: nextVisible,
      }
      if (previous.level === next.level && previous.visible === next.visible) {
        return previous
      }
      return next
    })
  }, [])

  const queueLiveCodeSnapshot = useCallback((nextCode: string, immediate = false) => {
    liveCodeRef.current = nextCode

    if (liveCodeDebounceRef.current !== null) {
      window.clearTimeout(liveCodeDebounceRef.current)
      liveCodeDebounceRef.current = null
    }

    if (immediate) {
      setLiveCodeSnapshot(nextCode)
      return
    }

    liveCodeDebounceRef.current = window.setTimeout(() => {
      setLiveCodeSnapshot(liveCodeRef.current)
      liveCodeDebounceRef.current = null
    }, 200)
  }, [])

  const ingestStruggleEvent = useCallback(
    (event: StruggleEvent) => {
      const nextState = struggleEngineRef.current?.ingest(event)
      if (!nextState) {
        return
      }
      syncStruggle(nextState)
      if (import.meta.env.DEV) {
        const shouldLog =
          event.type === 'RUN_RESULT' ||
          event.type === 'SUBMIT_RESULT' ||
          event.type === 'CHAT_ASSIST_USED' ||
          event.type === 'DISMISS_NUDGE'
        if (shouldLog) {
          console.debug('[struggle-engine]', event.type, {
            level: nextState.level,
            score: nextState.score,
            visible: nextState.nudgeVisible,
            failStreak: nextState.runFailStreak,
            reason: nextState.reason,
          })
        }
      }
    },
    [syncStruggle],
  )

  const ingestRunOutcome = useCallback(
    (mode: 'run' | 'submit', passed: boolean, errorType: string | null) => {
      ingestStruggleEvent({
        type: mode === 'submit' ? 'SUBMIT_RESULT' : 'RUN_RESULT',
        passed,
        errorType,
      })
    },
    [ingestStruggleEvent],
  )

  const getStruggleContextSummary = useCallback((): StruggleContextSummary => {
    return struggleEngineRef.current?.getContextSummary() ?? {
      level: 0,
      runFailStreak: 0,
      timeStuckSeconds: 0,
      lastErrorType: null,
    }
  }, [])
  const getLiveCodeSnapshot = useCallback(() => {
    return liveCodeRef.current
  }, [])

  useEffect(() => {
    if (!currentUnit) {
      hydratedEditorKeyRef.current = ''
      return
    }

    const hydrationKey = `${currentSessionKey}:${sessionLanguage}`
    if (hydratedEditorKeyRef.current === hydrationKey) {
      return
    }
    hydratedEditorKeyRef.current = hydrationKey

    const storedEntry = problemCodeByLang[currentSessionKey]
    const storedCode = storedEntry?.codeByLanguage[sessionLanguage]
    const resolvedCode = storedCode ?? resolveSessionTemplate(currentUnit, sessionLanguage)
    const nextCode = repairLegacyCFunctionDraft(currentUnit.id, sessionLanguage, resolvedCode)
    setDraftByUnitId((prev) => {
      if (prev[currentUnit.id]?.[sessionLanguage] === nextCode) {
        return prev
      }
      return {
        ...prev,
        [currentUnit.id]: {
          ...(prev[currentUnit.id] ?? {}),
          [sessionLanguage]: nextCode,
        },
      }
    })
    previousCodeRef.current = nextCode
    queueLiveCodeSnapshot(nextCode, true)
  }, [
    currentSessionKey,
    currentUnit,
    problemCodeByLang,
    queueLiveCodeSnapshot,
    resolveSessionTemplate,
    sessionLanguage,
  ])

  useEffect(() => {
    if (!currentUnit) {
      return
    }

    setRecentActivity(activeProblem?.id ?? currentUnit.id)

    const nextCode = draftByUnitId[currentUnit.id]?.[sessionLanguage] ?? currentDefaultCode
    previousCodeRef.current = nextCode
    queueLiveCodeSnapshot(nextCode, true)
    lastNudgeVisibleRef.current = false
    lastNudgeLevelRef.current = 0
    const resetState = struggleEngineRef.current?.reset()
    if (resetState) {
      syncStruggle(resetState)
    }
  }, [
    activeProblem?.id,
    currentDefaultCode,
    currentUnit?.id,
    queueLiveCodeSnapshot,
    sessionLanguage,
    syncStruggle,
  ])

  useEffect(() => {
    const timer = window.setInterval(() => {
      ingestStruggleEvent({ type: 'TICK' })
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [ingestStruggleEvent])

  const failingSummary = useMemo(
    () =>
      buildFailingSummary(testResultsByIndex, {
        compileUserLine: (line) => t('coach.compileErrorUserLine', { line }),
        compileWrapper: t('coach.compileErrorWrapper'),
        compileGeneric: t('coach.compileErrorGeneric'),
        runtime: t('coach.runtimeErrorBody'),
        timeout: t('coach.timeoutBody'),
        toolchain: t('coach.toolchainUnavailableBody'),
        validation: t('coach.validationBody'),
        internal: t('coach.internalBody'),
        expectedLabel: t('tests.expected'),
        stderrLabel: t('tests.stderr'),
        actualLabel: t('tests.actual'),
        emptyLabel: t('common.empty'),
      }),
    [t, testResultsByIndex],
  )

  useEffect(() => {
    if (!currentUnit || activeProblem) {
      return
    }

    savePebbleCurriculumProgress({
      selectedLanguage,
      selectedLevel,
      currentUnitId: currentUnit.id,
      recentChatSummary,
      completedUnitIds,
    })
  }, [activeProblem, completedUnitIds, currentUnit, recentChatSummary, selectedLanguage, selectedLevel])

  const onCodeChange = useCallback((value: string) => {
    if (!currentUnit) {
      return
    }

    const previousCode = previousCodeRef.current
    previousCodeRef.current = value

    const addedChars = Math.max(0, value.length - previousCode.length)
    const removedChars = Math.max(0, previousCode.length - value.length)
    const isDeletionHeavy = removedChars >= Math.max(2, addedChars + 2)

    queueLiveCodeSnapshot(value)
    if (addedChars > 0 || removedChars > 0) {
      ingestStruggleEvent({
        type: 'EDITOR_CHANGE',
        addedChars,
        removedChars,
        isDeletionHeavy,
      })
    }

    setDraftByUnitId((prev) => ({
      ...prev,
      [currentUnit.id]: {
        ...(prev[currentUnit.id] ?? {}),
        [sessionLanguage]: value,
      },
    }))
    setSubmitAccepted(false)
    setHighlightEditorLine(null)
    setSignatureHelper(null)

    // Debounced persistence to problemCodeByLang (cross-reload)
    if (codeByLangPersistDebounceRef.current !== null) {
      window.clearTimeout(codeByLangPersistDebounceRef.current)
    }
    const keySnap = currentSessionKey
    const langSnap = sessionLanguage
    codeByLangPersistDebounceRef.current = window.setTimeout(() => {
      codeByLangPersistDebounceRef.current = null
      setProblemCodeByLang((prev) => {
        const entry = prev[keySnap] ?? {
          selectedLanguage: langSnap,
          codeByLanguage: {},
          updatedAt: Date.now(),
        }
        const next: ProblemCodeByLang = {
          ...prev,
          [keySnap]: {
            ...entry,
            codeByLanguage: { ...entry.codeByLanguage, [langSnap]: value },
            updatedAt: Date.now(),
          },
        }
        saveProblemCodeByLang(next)
        return next
      })
    }, 400)
  }, [currentSessionKey, currentUnit, ingestStruggleEvent, queueLiveCodeSnapshot, sessionLanguage])

  async function executeTest(index: number): Promise<UnitTestResultItem> {
    if (!currentUnit) {
      return {
        input: '',
        expected: '',
        actual: '',
        stderr: t('error.noActiveUnit'),
        passed: false,
        timedOut: false,
        durationMs: 0,
        exitCode: null,
      }
    }

    const test = currentUnit.tests[index]

    const result: RunApiResponse = await requestRunApi({
      language: runtimeLanguage,
      code: currentCode,
      stdin: test.input,
      timeoutMs: 4000,
    })
    const diagnostic = buildRunFailureDiagnostic({
      result,
      sourceMap: buildDirectSourceMap(runtimeLanguage, currentCode),
    })
    const expectedNormalized = normalizeOutput(test.expected)
    const actualNormalized = normalizeOutput(result.stdout)
    const passed = result.ok && expectedNormalized === actualNormalized

    return {
      input: test.input,
      expected: test.expected,
      actual: result.stdout,
      stderr: result.stderr,
      diagnostic,
      passed,
      timedOut: result.timedOut,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
    }
  }

  const runAllTests = useCallback(async (mode: 'run' | 'submit') => {
    if (!currentUnit || isRunningAll) {
      return
    }

    setIsRunningAll(true)
    setActiveAction(mode)
    setRunStatus('running')
    setRunMessage(
      t('run.runningAll', {
        mode: mode === 'submit' ? t('run.modeSubmitting') : t('run.modeRunning'),
        count: currentUnit.tests.length,
      }),
    )
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    setHighlightEditorLine(null)
    setSignatureHelper(null)
    if (mode === 'run') {
      setSubmitAccepted(false)
    }

    try {
      let nextResults: Record<number, UnitTestResultItem> = {}
      let durationTotal = 0
      const fnLang = toPlacementLanguage(sessionLanguage) ?? selectedLanguage

      if (isSqlMode && activeProblem?.kind === 'sql' && activeProblem.sqlMeta) {
        const checkerMessages: Record<string, string> = {
          missing_select: t('sql.checker.missingSelect'),
          missing_columns: t('sql.checker.missingColumns'),
          missing_from_person: t('sql.checker.missingFromPerson'),
          missing_left_join: t('sql.checker.missingLeftJoin'),
          missing_join_condition: t('sql.checker.missingJoinCondition'),
          missing_distinct: t('sql.checker.missingDistinct'),
          missing_department: t('sql.checker.missingDepartment'),
          missing_query_shape: t('sql.checker.missingQueryShape'),
        }
        const issues = getSqlCheckerFailures(activeProblem, currentCode)
        const passed = issues.length === 0
        const preview = formatSqlPreviewTable(activeProblem.sqlMeta.expectedResult)
        const stderrText = passed
          ? ''
          : issues
            .map((issue) => checkerMessages[issue] ?? issue)
            .join(' ')
        durationTotal = 36 + Math.min(120, Math.floor(currentCode.length / 16))

        nextResults = Object.fromEntries(
          currentUnit.tests.map((test, index) => [index, {
            input: test.input,
            expected: test.expected,
            actual: passed ? preview : '',
            stderr: stderrText,
            passed,
            timedOut: false,
            durationMs: durationTotal,
            exitCode: passed ? 0 : 1,
          }]),
        )
        setTestResultsByIndex(nextResults)
      } else if (currentModeDescriptor.mode === 'function' && currentFunctionConfig?.evalMode === 'function') {
        const signatureCheck = validateFunctionSignature({
          language: fnLang,
          userCode: currentCode,
          methodName: currentFunctionConfig.methodName,
          signatureLabel: currentFunctionConfig.signatureLabel,
        })

        if (!signatureCheck.ok) {
          const signatureMessage = t('coach.signatureMismatchBody')
          const signatureDetails = `Required: ${signatureCheck.requiredSignature}\nFound: ${signatureCheck.detectedSignature}`
          nextResults = Object.fromEntries(
            currentUnit.tests.map((test, index) => [index, {
              input: test.input,
              expected: test.expected,
              actual: '',
              stderr: `${signatureMessage} ${signatureDetails}`,
              diagnostic: {
                status: 'validation_error',
                details: signatureDetails,
                locationKind: 'unknown',
                compilerLine: null,
                editorLine: null,
              },
              requiredSignature: signatureCheck.requiredSignature,
              detectedSignature: signatureCheck.detectedSignature,
              passed: false,
              timedOut: false,
              durationMs: 0,
              exitCode: null,
            }]),
          )
          setTestResultsByIndex(nextResults)
          setRunStatus('error')
          setRunMessage(`${signatureMessage} ${t('coach.requiredSignature')}: ${signatureCheck.requiredSignature}`)
          setSignatureHelper({
            required: signatureCheck.requiredSignature,
            found: signatureCheck.detectedSignature,
          })
          setSubmitAccepted(false)
          const errorType = classifyErrorType({
            passed: false,
            stderr: signatureMessage,
            exitCode: null,
          })
          if (mode === 'run') {
            logRunEvent({
              unitId: currentUnit.id,
              trackId,
              language: editorPlacementLanguage,
              passed: false,
              passCount: 0,
              total: currentUnit.tests.length,
              runtimeMs: 0,
              exitCode: null,
              errorType,
            })
          } else {
            logSubmitEvent({
              unitId: currentUnit.id,
              trackId,
              language: editorPlacementLanguage,
              accepted: false,
              passCount: 0,
              total: currentUnit.tests.length,
              runtimeMs: 0,
              exitCode: null,
              errorType,
            })
          }
          ingestRunOutcome(mode, false, errorType ?? null)
          return
        }

        const parsedCases = currentUnit.tests.map((test) => currentFunctionConfig.parseTestCase(test))
        if (parsedCases.some((test) => test === null)) {
          nextResults = Object.fromEntries(
            currentUnit.tests.map((test, index) => [index, {
              input: test.input,
              expected: test.expected,
              actual: '',
              stderr: t('run.parseFunctionCasesFailed'),
              diagnostic: {
                status: 'validation_error',
                details: t('run.parseFunctionCasesFailed'),
                locationKind: 'unknown',
                compilerLine: null,
                editorLine: null,
              },
              passed: false,
              timedOut: false,
              durationMs: 0,
              exitCode: null,
            }]),
          )
          setTestResultsByIndex(nextResults)
          setRunStatus('error')
          setRunMessage(t('run.prepareFunctionCasesFailed'))
          setSubmitAccepted(false)
          const errorType = classifyErrorType({
            passed: false,
            stderr: t('run.prepareFunctionCasesFailed'),
            exitCode: null,
          })
          if (mode === 'run') {
            logRunEvent({
              unitId: currentUnit.id,
              trackId,
              language: editorPlacementLanguage,
              passed: false,
              passCount: 0,
              total: currentUnit.tests.length,
              runtimeMs: 0,
              exitCode: null,
              errorType,
            })
          } else {
            logSubmitEvent({
              unitId: currentUnit.id,
              trackId,
              language: editorPlacementLanguage,
              accepted: false,
              passCount: 0,
              total: currentUnit.tests.length,
              runtimeMs: 0,
              exitCode: null,
              errorType,
            })
          }
          ingestRunOutcome(mode, false, errorType ?? null)
          return
        }

        const functionCases = parsedCases.filter(
          (test): test is NonNullable<typeof test> => test !== null,
        )

        if (fnLang === 'python') {
          const runnable = buildFunctionModeRunnable({
            language: fnLang,
            userCode: currentCode,
            methodName: currentFunctionConfig.methodName,
            cases: functionCases,
          })

          if (!runnable) {
            nextResults = Object.fromEntries(
              currentUnit.tests.map((test, index) => [index, {
                input: test.input,
                expected: test.expected,
                actual: '',
                stderr: t('run.functionModeUnavailable', { language: sessionLanguageLabel }),
                diagnostic: {
                  status: 'internal_error',
                  details: t('run.functionModeUnavailable', { language: sessionLanguageLabel }),
                  locationKind: 'unknown',
                  compilerLine: null,
                  editorLine: null,
                },
                passed: false,
                timedOut: false,
                durationMs: 0,
                exitCode: null,
              }]),
            )
            setTestResultsByIndex(nextResults)
            setRunStatus('error')
            setRunMessage(t('run.functionModeUnavailable', { language: sessionLanguageLabel }))
            setSubmitAccepted(false)
            const errorType = classifyErrorType({
              passed: false,
              stderr: t('run.functionModeUnavailable', { language: sessionLanguageLabel }),
              exitCode: null,
            })
            if (mode === 'run') {
              logRunEvent({
                unitId: currentUnit.id,
                trackId,
                language: editorPlacementLanguage,
                passed: false,
                passCount: 0,
                total: currentUnit.tests.length,
                runtimeMs: 0,
                exitCode: null,
                errorType,
              })
            } else {
              logSubmitEvent({
                unitId: currentUnit.id,
                trackId,
                language: editorPlacementLanguage,
                accepted: false,
                passCount: 0,
                total: currentUnit.tests.length,
                runtimeMs: 0,
                exitCode: null,
                errorType,
              })
            }
            ingestRunOutcome(mode, false, errorType ?? null)
            return
          }

          const runResult: RunApiResponse = await requestRunApi({
            language: runtimeLanguage,
            code: runnable.code,
            stdin: '',
            timeoutMs: 4000,
          })
          const runDiagnostic = buildRunFailureDiagnostic({
            result: runResult,
            sourceMap: runnable.sourceMap,
          })
          durationTotal = runResult.durationMs
          const parsedHarnessCases = parseHarnessCasesFromStdout(runResult.stdout)
          const perCaseDuration = currentUnit.tests.length > 0
            ? Math.max(1, Math.floor(durationTotal / currentUnit.tests.length))
            : 0

          if (parsedHarnessCases && parsedHarnessCases.length > 0) {
            nextResults = Object.fromEntries(
              currentUnit.tests.map((test, index) => {
                const harnessCase = parsedHarnessCases[index]
                if (!harnessCase) {
                  return [index, {
                    input: test.input,
                    expected: test.expected,
                    actual: '',
                    stderr: t('run.missingHarnessCaseResult'),
                    diagnostic: runDiagnostic,
                    passed: false,
                    timedOut: false,
                    durationMs: perCaseDuration,
                    exitCode: runResult.exitCode,
                  }]
                }

                return [index, {
                  input: harnessCase.input || test.input,
                  expected: harnessCase.expected || test.expected,
                  actual: harnessCase.actual,
                  stderr: harnessCase.stderr,
                  diagnostic: null,
                  passed: harnessCase.passed,
                  timedOut: runResult.timedOut,
                  durationMs: perCaseDuration,
                  exitCode: runResult.exitCode,
                }]
              }),
            )
          } else {
            nextResults = Object.fromEntries(
              currentUnit.tests.map((test, index) => [index, {
                input: test.input,
                expected: test.expected,
                actual: runResult.stdout,
                stderr: runResult.stderr || t('run.parseHarnessOutputFailed'),
                diagnostic: runDiagnostic,
                passed: false,
                timedOut: runResult.timedOut,
                durationMs: perCaseDuration,
                exitCode: runResult.exitCode,
              }]),
            )
          }
        } else {
          for (let index = 0; index < currentUnit.tests.length; index += 1) {
            const currentCase = functionCases[index]
            const test = currentUnit.tests[index]

            const runnable = currentCase
              ? buildSingleCaseFunctionModeRunnable({
                language: fnLang,
                userCode: currentCode,
                methodName: currentFunctionConfig.methodName,
                args: currentCase.args,
                inputText: currentCase.input,
                signatureLabel: currentFunctionConfig.signatureLabel,
              })
              : null

            if (!runnable) {
              const failedResult: UnitTestResultItem = {
                input: test.input,
                expected: test.expected,
                actual: '',
                stderr: t('run.functionWrapperUnavailable', { language: sessionLanguageLabel }),
                diagnostic: {
                  status: 'internal_error',
                  details: t('run.functionWrapperUnavailable', { language: sessionLanguageLabel }),
                  locationKind: 'unknown',
                  compilerLine: null,
                  editorLine: null,
                },
                passed: false,
                timedOut: false,
                durationMs: 0,
                exitCode: null,
              }
              nextResults[index] = failedResult
              continue
            }

            const runResult: RunApiResponse = await requestRunApi({
              language: runtimeLanguage,
              code: runnable.code,
              stdin: '',
              timeoutMs: 4000,
            })
            const runDiagnostic = buildRunFailureDiagnostic({
              result: runResult,
              sourceMap: runnable.sourceMap,
            })
            const expectedNormalized = normalizeOutput(test.expected)
            const actualNormalized = normalizeOutput(runResult.stdout)
            const passed = runResult.ok && expectedNormalized === actualNormalized
            const caseResult: UnitTestResultItem = {
              input: test.input,
              expected: test.expected,
              actual: runResult.stdout,
              stderr: runResult.stderr,
              diagnostic: runDiagnostic,
              passed,
              timedOut: runResult.timedOut,
              durationMs: runResult.durationMs,
              exitCode: runResult.exitCode,
            }

            nextResults[index] = caseResult
            durationTotal += runResult.durationMs

            setTestResultsByIndex((prev) => ({
              ...prev,
              [index]: caseResult,
            }))
          }
        }
      } else {
        for (let index = 0; index < currentUnit.tests.length; index += 1) {
          const result = await executeTest(index)
          nextResults[index] = result
          durationTotal += result.durationMs

          setTestResultsByIndex((prev) => ({
            ...prev,
            [index]: result,
          }))
        }
      }

      setTestResultsByIndex(nextResults)
      setTotalDurationMs(durationTotal)

      const passedCount = Object.values(nextResults).filter((item) => item.passed).length
      const allPassed = passedCount === currentUnit.tests.length
      const runExitCode =
        Object.values(nextResults)
          .map((item) => item.exitCode)
          .find((exitCode) => exitCode !== null) ?? null
      const firstFailed = Object.values(nextResults).find((item) => !item.passed)
      const derivedErrorType = classifyErrorType({
        passed: allPassed,
        timedOut: firstFailed?.timedOut ?? false,
        stderr: firstFailed?.stderr ?? '',
        exitCode: firstFailed?.exitCode ?? runExitCode,
      })
      ingestRunOutcome(mode, allPassed, derivedErrorType ?? null)

      if (mode === 'run') {
        logRunEvent({
          unitId: currentUnit.id,
          trackId,
          language: editorPlacementLanguage,
          passed: allPassed,
          passCount: passedCount,
          total: currentUnit.tests.length,
          runtimeMs: durationTotal,
          exitCode: runExitCode,
          errorType: derivedErrorType,
        })
        pushNotification({
          category: 'progress',
          title: `Run completed: ${passedCount}/${currentUnit.tests.length} tests passed`,
          message: allPassed
            ? 'Great run. All visible tests passed.'
            : 'Some tests are still failing. Review diagnostics and retry.',
          actionRoute: '/session/1',
          actionLabel: 'Open session',
        })
      } else {
        logSubmitEvent({
          unitId: currentUnit.id,
          trackId,
          language: editorPlacementLanguage,
          accepted: allPassed,
          passCount: passedCount,
          total: currentUnit.tests.length,
          runtimeMs: durationTotal,
          exitCode: runExitCode,
          errorType: derivedErrorType,
        })
        pushNotification({
          category: 'progress',
          title: allPassed ? 'Submission accepted ✅' : 'Submission failed ❌',
          message: allPassed
            ? `All ${currentUnit.tests.length} tests passed.`
            : `${passedCount}/${currentUnit.tests.length} tests passed. Check failing diagnostics.`,
          actionRoute: '/session/1',
          actionLabel: 'Open submissions',
        })

        // ── Phase 6: Trigger learning journey update (fire-and-forget) ────────
        apiFetch('/api/journey/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'anonymous',
            recoveryTimeMs: durationTotal,
            struggleScore: allPassed ? 20 : 70,
            autonomyDelta: allPassed ? 2 : -1,
            problemId: currentUnit.id,
          }),
        }).catch(() => { /* non-critical, ignore errors */ })
      }

      if (allPassed) {
        setRunStatus('success')
        setRunMessage(
          isSqlMode
            ? `${t('sql.checker.pass')} • ${t('run.passedSummary', {
              passed: passedCount,
              total: currentUnit.tests.length,
              duration: durationTotal,
            })}`
            : t('run.passedSummary', {
              passed: passedCount,
              total: currentUnit.tests.length,
              duration: durationTotal,
            }),
        )
        if (!activeProblem) {
          const wasCompleted = unitProgress[currentUnit.id]?.completed === true
          setUnitProgress((prev) => markUnitCompleted(prev, currentUnit.id, durationTotal))
          if (!wasCompleted) {
            pushNotification({
              category: 'progress',
              title: `Streak saved: Day ${Math.max(1, currentStreak.streak + 1)} 🔥`,
              message: 'Keep momentum by completing one more run tomorrow.',
              actionRoute: '/dashboard',
              actionLabel: 'View insights',
            })
            const nextUnit = units[currentUnitIndex + 1]
            if (nextUnit) {
              pushNotification({
                category: 'progress',
                title: `New unit unlocked: ${nextUnit.title}`,
                message: 'Your next guided step is ready.',
                actionRoute: '/session/1',
                actionLabel: 'Start next unit',
              })
            }
          }
        } else {
          markProblemAttempt(activeProblem.id, mode === 'submit')
          if (mode === 'submit') {
            logSolveEvent({ problemId: activeProblem.id, verdict: 'accepted' })
          }
        }

        if (mode === 'submit') {
          setSubmitAccepted(true)
        }
        setSignatureHelper(null)
        setHighlightEditorLine(null)
      } else {
        const firstFailedEntry = Object.entries(nextResults)
          .map(([index, result]) => ({ index: Number(index), result }))
          .find(({ result }) => !result.passed)

        const runnerError = firstFailedEntry?.result.stderr.trim()
        const runnerErrorSnippet = runnerError
          ? runnerError
            .replace(/\s+/g, ' ')
            .replace(/\b(?:[A-Za-z0-9_./-]+\.(?:cpp|cc|cxx|c|py|js|java)):\d+(?::\d+)?/g, '[internal-location]')
            .slice(0, 140)
          : ''
        const failPreview = firstFailedEntry
          ? firstFailedEntry.result.diagnostic
            ? `#${firstFailedEntry.index + 1}: ${firstFailedEntry.result.diagnostic.status === 'compile_error'
              ? firstFailedEntry.result.diagnostic.locationKind === 'user_code' && firstFailedEntry.result.diagnostic.editorLine
                ? t('coach.compileErrorUserLine', { line: firstFailedEntry.result.diagnostic.editorLine })
                : firstFailedEntry.result.diagnostic.locationKind === 'runner_wrapper'
                  ? t('coach.compileErrorWrapper')
                  : t('coach.compileErrorGeneric')
              : firstFailedEntry.result.diagnostic.status === 'runtime_error'
                ? t('coach.runtimeErrorBody')
                : firstFailedEntry.result.diagnostic.status === 'timeout'
                  ? t('coach.timeoutBody')
                  : firstFailedEntry.result.diagnostic.status === 'toolchain_unavailable'
                    ? t('coach.toolchainUnavailableBody')
                    : firstFailedEntry.result.diagnostic.status === 'validation_error'
                      ? t('coach.validationBody')
                      : t('coach.internalBody')
            }`
            : runnerErrorSnippet
              ? t('run.runnerErrorPreview', {
                index: firstFailedEntry.index + 1,
                message: runnerErrorSnippet,
              })
              : t('run.failedPreview', {
                index: firstFailedEntry.index + 1,
                expected: firstFailedEntry.result.expected,
                actual: normalizeOutput(firstFailedEntry.result.actual) || t('common.empty'),
              })
          : t('run.someTestsFailed')

        const signatureFromFailure = firstFailedEntry?.result.requiredSignature
          ? {
            required: firstFailedEntry.result.requiredSignature,
            found: firstFailedEntry.result.detectedSignature ?? t('coach.unknown'),
          }
          : firstFailedEntry?.result.diagnostic?.status === 'compile_error'
            && firstFailedEntry.result.diagnostic.locationKind === 'runner_wrapper'
            && currentFunctionConfig
            ? {
              required: currentFunctionConfig.signatureLabel,
              found: t('coach.runnerWrapperSignatureLikely'),
            }
            : null

        setRunStatus('error')
        setHighlightEditorLine(firstFailedEntry?.result.diagnostic?.editorLine ?? null)
        setSignatureHelper(signatureFromFailure)
        setRunMessage(
          t('run.failedSummary', {
            passed: passedCount,
            total: currentUnit.tests.length,
            duration: durationTotal,
            preview: failPreview,
          }),
        )
        if (mode === 'submit') {
          setSubmitAccepted(false)
        }
        if (activeProblem) {
          markProblemAttempt(activeProblem.id, false)
        }
      }

      if (mode === 'submit') {
        setSubmissionsByUnit((prev) =>
          appendSubmission(prev, {
            unitId: currentUnit.id,
            status: allPassed ? 'accepted' : 'failed',
            language: sessionLanguage === 'sql' ? 'sql' : toLegacyCodeLanguageId(sessionLanguage),
            runtimeMs: durationTotal,
            passCount: passedCount,
            totalCount: currentUnit.tests.length,
            exitCode: runExitCode,
            code: currentCode,
          }),
        )
      }
    } finally {
      setIsRunningAll(false)
      setActiveAction(null)
    }
  }, [
    activeProblem,
    currentCode,
    currentFunctionConfig,
    currentModeDescriptor.mode,
    currentStreak.streak,
    currentUnitIndex,
    currentUnit,
    executeTest,
    ingestRunOutcome,
    isRunningAll,
    isSqlMode,
    runtimeLanguage,
    selectedLanguage,
    sessionLanguage,
    t,
    trackId,
    unitProgress,
    units,
  ])

  function selectUnit(index: number) {
    setCurrentUnitIndex(index)
    setSelectedTestIndex(0)
    setRunStatus('idle')
    setRunMessage(t('run.evaluateAll'))
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    setSubmitAccepted(false)
    setHighlightEditorLine(null)
    setSignatureHelper(null)
  }

  function moveToNextUnit() {
    if (currentUnitIndex < units.length - 1) {
      selectUnit(currentUnitIndex + 1)
    }
  }

  function moveToPreviousUnit() {
    if (currentUnitIndex > 0) {
      selectUnit(currentUnitIndex - 1)
    }
  }

  function handleResetCode() {
    if (!currentUnit) return

    // Check "don't ask again" preference
    const skipConfirm = (() => {
      try { return localStorage.getItem('pebble.confirmReset.v1') === 'false' } catch { return false }
    })()

    if (skipConfirm) {
      executeReset()
    } else {
      setIsResetConfirmOpen(true)
    }
  }

  function executeReset() {
    if (!currentUnit) return

    const resetCode = activeProblem
      ? activeProblemStarter
      : currentFunctionConfig?.starterStub ?? currentUnit.starterCode

    previousCodeRef.current = resetCode
    queueLiveCodeSnapshot(resetCode, true)
    setDraftByUnitId((prev) => ({
      ...prev,
      [currentUnit.id]: {
        ...(prev[currentUnit.id] ?? {}),
        [sessionLanguage]: resetCode,
      },
    }))
    setRunStatus('idle')
    setRunMessage(t('run.editorReset'))
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    setSubmitAccepted(false)
    setHighlightEditorLine(null)
    setSignatureHelper(null)
  }

  const switchLanguage = useCallback((newLang: SessionEditorLanguage) => {
    if (!currentUnit) {
      return
    }
    const selectedOption = languageOptionsWithState.find((option) => option.id === newLang)
    if (selectedOption?.disabled) {
      setRunStatus('error')
      setRunMessage(
        selectedOption.disabledReason
          ?? t('run.functionModeUnavailable', { language: newLang === 'sql' ? 'SQL' : getLanguageDescriptor(newLang).label }),
      )
      return
    }

    // Save current code for the outgoing language
    const liveCode = draftByUnitId[currentUnit.id]?.[sessionLanguage] ?? currentDefaultCode
    const prevEntry = problemCodeByLang[currentSessionKey] ?? {
      selectedLanguage: sessionLanguage,
      codeByLanguage: {},
      updatedAt: Date.now(),
    }
    const updatedEntry: ProblemCodeByLangEntry = {
      ...prevEntry,
      selectedLanguage: newLang,
      codeByLanguage: { ...prevEntry.codeByLanguage, [sessionLanguage]: liveCode },
      updatedAt: Date.now(),
    }

    // Determine code for new language: stored → boilerplate fallback
    const savedCode = updatedEntry.codeByLanguage[newLang]
    let newCode: string
    if (savedCode !== undefined) {
      newCode = repairLegacyCFunctionDraft(currentUnit.id, newLang, savedCode)
    } else {
      newCode = repairLegacyCFunctionDraft(
        currentUnit.id,
        newLang,
        resolveSessionTemplate(currentUnit, newLang),
      )
    }

    // Apply
    setDraftByUnitId((prev) => ({
      ...prev,
      [currentUnit.id]: {
        ...(prev[currentUnit.id] ?? {}),
        [newLang]: newCode,
      },
    }))
    setEditorLanguage(newLang)
    const trackDefaultLanguage = resolveEntryLanguage(toDefaultEditorLanguage(learningTrack), languageOptions)
    setEditorLanguageUserOverride(trackDefaultLanguage ? newLang !== trackDefaultLanguage : true)

    const nextStore: ProblemCodeByLang = { ...problemCodeByLang, [currentSessionKey]: updatedEntry }
    setProblemCodeByLang(nextStore)
    saveProblemCodeByLang(nextStore)

    // Reset run state
    setRunStatus('idle')
    setRunMessage(t('run.evaluateAll'))
    setTestResultsByIndex({})
    setTotalDurationMs(0)
    setSubmitAccepted(false)
    setHighlightEditorLine(null)
    setSignatureHelper(null)

    previousCodeRef.current = newCode
    queueLiveCodeSnapshot(newCode, true)
  }, [
    currentDefaultCode,
    currentSessionKey,
    currentUnit,
    draftByUnitId,
    languageOptionsWithState,
    languageOptions,
    learningTrack,
    problemCodeByLang,
    queueLiveCodeSnapshot,
    resolveSessionTemplate,
    sessionLanguage,
    t,
  ])

  const resetEditorLanguageToTrack = useCallback(() => {
    const trackEditorLanguage = resolveEntryLanguage(toDefaultEditorLanguage(learningTrack), languageOptions)
    if (!trackEditorLanguage) {
      return
    }
    switchLanguage(trackEditorLanguage)
    setEditorLanguageUserOverride(false)
  }, [languageOptions, learningTrack, switchLanguage])

  const handleAssistAction = useCallback((action: StruggleAssistAction) => {
    if (!currentUnit) {
      return
    }
    logAssistEvent({
      unitId: currentUnit.id,
      trackId,
      language: editorPlacementLanguage,
      action,
    })
    ingestStruggleEvent({
      type: 'CHAT_ASSIST_USED',
      action,
    })
  }, [currentUnit, ingestStruggleEvent, selectedLanguage, trackId])

  const handleStruggleDismiss = useCallback(() => {
    ingestStruggleEvent({ type: 'DISMISS_NUDGE' })
  }, [ingestStruggleEvent])

  if (isLoading) {
    return (
      <section className="min-h-[100dvh] bg-pebble-deep p-3">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-text-primary">{t('loading.curriculum')}</p>
          <p className="text-sm text-pebble-text-secondary">
            {t('loading.preparePath', { language: languageMeta.label })}
          </p>
        </Card>
      </section>
    )
  }

  if (loadError || !currentUnit) {
    return (
      <section className="min-h-[100dvh] bg-pebble-deep p-3">
        <Card className="space-y-2" padding="md" interactive>
          <p className="text-sm font-medium text-pebble-warning">{t('error.loadSession')}</p>
          <p className="text-sm text-pebble-text-secondary">{loadError || t('error.noUnits')}</p>
        </Card>
      </section>
    )
  }

  const completedCount = Object.keys(testResultsByIndex).length
  const passedCount = Object.values(testResultsByIndex).filter((result) => result.passed).length
  const currentIsCompleted = completedUnitIds.includes(currentUnit.id)
  const allTestsPassed = currentUnit.tests.length > 0 && passedCount === currentUnit.tests.length
  const nextEnabled = currentUnitIndex < units.length - 1
  const previousEnabled = currentUnitIndex > 0
  const lastExitCode = Object.values(testResultsByIndex)
    .map((result) => result.exitCode)
    .find((exitCode) => exitCode !== null)
  const levelLabelMap: Record<PlacementLevel, string> = {
    beginner: t('level.beginner'),
    intermediate: t('level.intermediate'),
    pro: t('level.pro'),
  }
  const levelLabel = levelLabelMap[selectedLevel]
  const statusLabelMap: Record<typeof runStatus, string> = {
    idle: t('status.idle'),
    running: t('status.running'),
    success: t('status.success'),
    error: t('status.error'),
  }
  const summaryLabel = format.formatTestsSummary({
    passed: passedCount,
    total: currentUnit.tests.length,
    runCount: completedCount,
    durationMs: totalDurationMs,
    exitCode: typeof lastExitCode === 'number' ? lastExitCode : null,
  })
  const currentUnitSubmissions = submissionsByUnit[currentUnit.id] ?? []
  const sqlPreviewTable = isSqlMode && activeProblem?.sqlMeta ? activeProblem.sqlMeta.expectedResult : null

  const constraints = currentFunctionConfig?.evalMode === 'function'
    ? [
      t('constraints.functionMode.1'),
      t('constraints.functionMode.2'),
      t('constraints.functionMode.3', { count: currentUnit.tests.length }),
    ]
    : [
      t('constraints.scriptMode.1'),
      t('constraints.scriptMode.2'),
      t('constraints.scriptMode.3', { count: currentUnit.tests.length }),
    ]
  const resolvedConstraints = activeProblem?.statement.constraints ?? constraints
  const curriculumDifficulty = resolveCurriculumDifficulty(selectedLevel, currentUnit.id)
  const sessionDifficulty = activeProblem?.difficulty ?? curriculumDifficulty
  const sessionDifficultyLabel = sessionDifficulty === 'Easy'
    ? t('difficulty.easy')
    : sessionDifficulty === 'Medium'
      ? t('difficulty.medium')
      : t('difficulty.hard')
  const minuteSuffix = t('problem.minuteSuffix')
  const sessionTags = activeProblem
    ? [
      ...activeProblem.topics.slice(0, 2).map((chip) => localizeProblemChip(chip, uiLanguage, t)),
      `${getProblemTimeEstimateMinutes(activeProblem)} ${minuteSuffix}`,
    ]
    : currentUnit.id === 'hello-world'
      ? [sessionLanguageLabel, t('tags.stdoutBasics'), t('tags.practice')]
      : [sessionLanguageLabel, t('tags.practice'), t('tags.runtimeVerified')]
  return (
    <section
      className={`session-shell flex h-[100dvh] flex-col overflow-hidden ${pagePrefs.compactDensity ? 'text-[13px]' : ''}`}
    >
      <header className="session-topbar grid h-[72px] shrink-0 grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.25fr)] items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/"
            aria-label={t('nav.home')}
            title={t('nav.home')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.09] text-pebble-text-primary transition hover:-translate-y-[1px] hover:bg-pebble-overlay/[0.15] active:bg-pebble-overlay/[0.2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/55"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>

          <span
            title="Track controls recommendations and pacing. You can solve in any language."
            className="hidden rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3 py-1.5 text-xs font-medium text-pebble-text-secondary md:inline-flex"
          >
            Track: {languageMeta.label} • {levelLabel}
          </span>
          <Link
            to="/onboarding"
            className="hidden text-xs font-medium text-pebble-accent transition hover:text-pebble-accent-strong md:inline-flex"
          >
            Change track
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={moveToPreviousUnit}
            disabled={!previousEnabled}
            title={t('topBar.prevUnit')}
            aria-label={t('a11y.prevUnit')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] text-pebble-text-primary transition hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.16] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0 px-1 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted">
              Active unit
            </p>
            <p className="max-w-[460px] truncate text-sm font-semibold text-pebble-text-primary">
              {activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
            </p>
          </div>
          <button
            type="button"
            onClick={moveToNextUnit}
            disabled={!nextEnabled}
            title={t('topBar.nextUnit')}
            aria-label={t('a11y.nextUnit')}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-pebble-overlay/[0.08] text-pebble-text-primary transition hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.16] disabled:cursor-not-allowed disabled:opacity-45 ${allTestsPassed && nextEnabled
              ? 'border-pebble-success/45 shadow-[0_0_0_1px_rgba(74,222,128,0.28),0_0_16px_rgba(74,222,128,0.22)]'
              : 'border-pebble-border/30'
              }`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="relative flex items-center justify-end gap-2">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  title="Page settings"
                  aria-label="Page settings"
                  onClick={() => setPageSettingsOpen(true)}
                  className="h-8 w-8 rounded-full border-pebble-border/30 bg-pebble-overlay/[0.08] p-0 text-pebble-text-primary hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.16]"
                >
                  <SlidersHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                Page settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('a11y.openUnits')}
            className="rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3.5 py-2 text-sm font-medium text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16]"
          >
            ☰ {t('topBar.units')}
          </button>

          <StreakPill
            streak={currentStreak.streak}
            isTodayComplete={currentStreak.isTodayComplete}
            compact
          />

          {/* Status badge — only visible when running, not on idle */}
          {runStatus !== 'idle' && (
            <Badge variant={statusVariant(runStatus)}>{statusLabelMap[runStatus]}</Badge>
          )}

          {/* Export Report */}
          <button
            disabled={reportLoading}
            aria-label="Export recovery report"
            title="Export Recovery Report"
            className="flex items-center gap-1.5 rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3.5 py-2 text-[13px] font-medium text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16] disabled:opacity-50"
            onClick={async () => {
              setReportLoading(true)
              setReportToast(null)
              const reportUserName =
                auth.profile?.displayName?.trim() ||
                auth.profile?.username?.trim() ||
                auth.profile?.email?.split('@')[0] ||
                auth.user?.email?.split('@')[0] ||
                'Guest'
              const reportUserId = auth.user?.userId || auth.profile?.userId || 'guest'
              // Open a blank tab synchronously (before await) so browsers don't block it
              const win = window.open('', '_blank')
              try {
                const r = await apiFetch('/api/report/recovery', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(auth.idToken ? { Authorization: `Bearer ${auth.idToken}` } : {}),
                  },
                  body: JSON.stringify({
                    problemId: currentUnit?.id ?? 'unknown',
                    problemTitle: activeProblem?.title ?? currentUnit?.title ?? 'Problem',
                    difficulty: activeProblem?.difficulty ?? sessionDifficultyLabel,
                    language: editorPlacementLanguage,
                    userId: reportUserId,
                    userName: reportUserName,
                    userEmail: auth.profile?.email ?? auth.user?.email ?? '',
                    avatarUrl: auth.profile?.avatarUrl ?? null,
                    sessionId: Date.now().toString(),
                  }),
                })
                const d = await r.json() as { reportUrl?: string; error?: string }
                if (d.reportUrl) {
                  if (win) win.location.href = d.reportUrl
                  setReportToast({ kind: 'ok', msg: 'Report ready — opening in new tab.' })
                  pushNotification({
                    category: 'system',
                    title: 'Exported recovery report',
                    message: 'Your report was generated successfully.',
                    actionRoute: '/dashboard',
                    actionLabel: 'View insights',
                  })
                } else {
                  if (win) win.close()
                  setReportToast({ kind: 'err', msg: d.error ?? 'Report generation failed.' })
                }
              } catch (err) {
                if (win) win.close()
                setReportToast({ kind: 'err', msg: err instanceof Error ? err.message : 'Network error.' })
              } finally {
                setReportLoading(false)
                setTimeout(() => setReportToast(null), 5000)
              }
            }}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {reportLoading ? 'Generating…' : 'Export Report'}
          </button>

          {/* Share Session */}
          <button
            disabled={shareLoading}
            aria-label="Share session snapshot"
            title="Share Session Snapshot"
            className="flex items-center gap-1.5 rounded-2xl border border-violet-500/30 bg-violet-500/[0.08] px-3.5 py-2 text-[13px] font-medium text-pebble-text-primary transition hover:bg-violet-500/[0.16] disabled:opacity-50"
            onClick={async () => {
              setShareLoading(true)
              setShareToast(null)
              try {
                const r = await apiFetch('/api/session/snapshot', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    problemId: currentUnit?.id ?? 'unknown',
                    finalCode: '', // omit code for privacy — just share metadata
                    language: editorPlacementLanguage,
                    status: runStatus,
                    runtimeMs: 0,
                    recoveryTimeMs: 0,
                    userId: auth.user?.userId ?? auth.profile?.userId ?? 'anonymous',
                  }),
                })
                const d = await r.json() as { shareUrl?: string; ok?: boolean }
                if (d.shareUrl) {
                  await navigator.clipboard.writeText(d.shareUrl).catch(() => { })
                  setShareToast(d.shareUrl)
                  pushNotification({
                    category: 'system',
                    title: 'Share session link created',
                    message: 'Session snapshot link copied to your clipboard.',
                    actionRoute: '/session/1',
                    actionLabel: 'Open session',
                  })
                  setTimeout(() => setShareToast(null), 5000)
                } else {
                  setShareToast('⚠ Snapshot failed — try again.')
                  setTimeout(() => setShareToast(null), 4000)
                }
              } catch (err) {
                setShareToast(`⚠ ${err instanceof Error ? err.message : 'Network error.'}`)
                setTimeout(() => setShareToast(null), 4000)
              } finally {
                setShareLoading(false)
              }
            }}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            {shareLoading ? 'Sharing…' : 'Share Session'}
          </button>

          {/* Report toast */}
          {reportToast && (
            <div className={`fixed right-4 top-[4.5rem] z-[200] max-w-[320px] rounded-xl border px-4 py-2.5 text-[12.5px] shadow-xl backdrop-blur-xl ${reportToast.kind === 'ok' ? 'border-pebble-success/30 bg-pebble-bg/95' : 'border-red-500/30 bg-pebble-bg/95'}`}>
              <p className="font-semibold text-pebble-text-primary">{reportToast.kind === 'ok' ? 'Report ready!' : 'Export failed'}</p>
              <p className="truncate text-pebble-text-secondary">{reportToast.msg}</p>
            </div>
          )}

          {/* Share toast */}
          {shareToast && !reportToast && (
            <div className={`fixed right-4 top-[4.5rem] z-[200] max-w-[320px] rounded-xl border px-4 py-2.5 text-[12.5px] shadow-xl backdrop-blur-xl ${shareToast.startsWith('⚠') ? 'border-red-500/30 bg-pebble-bg/95' : 'border-violet-500/30 bg-pebble-bg/95'}`}>
              <p className="font-semibold text-pebble-text-primary">{shareToast.startsWith('⚠') ? 'Share failed' : 'Link copied!'}</p>
              <p className="truncate text-pebble-text-secondary">{shareToast}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden px-3 pb-3 pt-3">
        <div className="grid h-full min-h-0 grid-cols-[clamp(360px,22vw,410px)_minmax(0,1.16fr)_clamp(352px,23vw,398px)] gap-3">
          <ProblemStatementPanel
            unitId={currentUnit.id}
            title={activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
            concept={activeProblem?.topics[0] ?? currentUnitCopy?.concept ?? currentUnit.concept}
            prompt={activeProblem?.statement.summary ?? currentUnitCopy?.prompt ?? currentUnit.prompt}
            description={activeProblem?.statement.description ?? currentUnitCopy?.description}
            constraints={resolvedConstraints}
            tests={currentUnit.tests}
            examples={activeProblem?.statement.examples}
            inputText={activeProblem?.statement.input}
            outputText={activeProblem?.statement.output}
            difficulty={sessionDifficulty}
            difficultyLabel={sessionDifficultyLabel}
            tags={sessionTags}
            language={sessionLanguage === 'sql' ? 'sql' : toLegacyCodeLanguageId(sessionLanguage)}
            trackLanguage={selectedLanguage}
            functionMode={currentFunctionConfig?.evalMode === 'function'}
            submissions={currentUnitSubmissions}
            sqlSchema={activeProblem?.sqlMeta?.tables}
            sqlSchemaText={activeProblem?.statement.schemaText}
            className="min-h-0 min-w-0"
          />

          <div
            className="grid h-full min-h-0 min-w-0 gap-3 overflow-hidden"
            style={{
              gridTemplateRows: 'minmax(390px,47vh) minmax(220px,1fr)',
            }}
          >
            <section className="session-surface-strong flex min-h-0 flex-col overflow-hidden rounded-[28px]">
              <div className="flex items-center justify-between gap-3 border-b border-pebble-border/20 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-pebble-text-muted">{t('editor.code')}</p>
                  <p className="truncate text-base font-semibold text-pebble-text-primary">
                    {activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <ProgramLangDropdown
                    value={sessionLanguage}
                    options={dropdownLanguageOptions}
                    onChange={switchLanguage}
                    footerActionLabel="Reset editor language to track"
                    onFooterAction={resetEditorLanguageToTrack}
                  />

                  <StopwatchControl sessionKey={currentUnit.id} />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title={t('editor.resetCode')}
                    onClick={handleResetCode}
                    className="h-10 w-10 rounded-2xl border-pebble-border/35 bg-pebble-overlay/[0.08] p-0 text-pebble-text-primary hover:border-pebble-border/50 hover:bg-pebble-overlay/[0.16]"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title={t('topBar.sessionSettings')}
                    aria-label={t('a11y.openSessionSettings')}
                    onClick={() => setSessionSettingsOpen(true)}
                    className="h-10 w-10 rounded-2xl border-pebble-border/35 bg-pebble-overlay/[0.08] p-0 text-pebble-text-primary hover:border-pebble-border/50 hover:bg-pebble-overlay/[0.16]"
                  >
                    <Settings2 className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => void runAllTests('run')}
                    disabled={isRunningAll}
                    className="h-10 rounded-2xl gap-2 px-4.5 text-sm font-semibold shadow-[0_12px_28px_rgba(8,15,35,0.18)]"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    {isRunningAll && activeAction === 'run' ? t('actions.running') : t('actions.run')}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void runAllTests('submit')}
                    disabled={isRunningAll}
                    className={`h-10 rounded-2xl px-4 text-sm font-medium ${submitAccepted ? '!border-pebble-success/45 !bg-pebble-success/18 !text-pebble-success' : ''}`}
                  >
                    {isRunningAll && activeAction === 'submit'
                      ? t('actions.submitting')
                      : submitAccepted
                        ? t('actions.accepted')
                        : t('actions.submit')}
                  </Button>
                </div>
              </div>

              <div className="border-b border-pebble-border/12 px-4 py-2">
                <div className="session-inset flex items-center justify-between gap-3 rounded-2xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-pebble-text-muted">Workspace</p>
                    <p className="truncate text-xs text-pebble-text-secondary">
                      Runtime-aware editor with grounded mentor guidance and judged testcases.
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 lg:flex">
                    <span className="session-chip rounded-full px-2.5 py-1 text-[11px] font-medium">Editor focus</span>
                    <span className="session-chip rounded-full px-2.5 py-1 text-[11px] font-medium">{currentModeDescriptor.mode === 'function' ? 'Function mode' : 'Stdio mode'}</span>
                  </div>
                </div>
              </div>

              <div dir="ltr" className="ltrSafe min-h-0 flex-1 overflow-hidden px-4 pb-3 pt-2.5">
                <div className="session-inset h-full overflow-hidden rounded-[24px]">
                <Editor
                  height="100%"
                  language={getMonacoLanguageForSession(sessionLanguage)}
                  beforeMount={defineMonacoThemes}
                  theme={theme === 'light' ? 'pebble-light' : 'pebble-dark'}
                  value={currentCode}
                  onChange={(nextValue) => onCodeChange(nextValue ?? '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: editorFontSize,
                    lineHeight: 22,
                    automaticLayout: true,
                    wordWrap: wordWrapEnabled ? 'on' : 'off',
                    scrollBeyondLastLine: false,
                    smoothScrolling: true,
                    overviewRulerLanes: 0,
                    scrollbar: {
                      horizontal: 'hidden',
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    },
                    padding: {
                      top: 12,
                      bottom: 12,
                    },
                  }}
                />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-pebble-border/20 px-4 py-2.5 text-xs text-pebble-text-secondary">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-pebble-text-muted">Session status</p>
                  <p className="truncate text-[13.5px] text-pebble-text-secondary">{runMessage}</p>
                </div>
                {currentIsCompleted ? (
                  <span className="rounded-full border border-pebble-success/35 bg-pebble-success/15 px-3 py-[0.325rem] text-[11px] font-semibold text-pebble-success">
                    {t('editor.completed')}
                  </span>
                ) : null}
              </div>
            </section>

            <TestResultsPanel
              tests={currentUnit.tests}
              selectedTestIndex={selectedTestIndex}
              onSelectTest={(index) => setSelectedTestIndex(index)}
              resultsByIndex={testResultsByIndex}
              summaryLabel={summaryLabel}
              sqlPreview={sqlPreviewTable}
              className="h-full min-h-0 min-w-0 overflow-hidden"
            />
          </div>

          <PebbleChatPanel
            unitId={currentUnit.id}
            problemId={activeProblem?.id ?? null}
            unitTitle={activeProblem?.title ?? currentUnitCopy?.title ?? currentUnit.title}
            unitConcept={activeProblem?.topics[0] ?? currentUnitCopy?.concept ?? currentUnit.concept}
            language={sessionLanguage}
            executionMode={currentModeDescriptor.mode}
            requiredSignature={signatureHelper?.required ?? currentFunctionConfig?.signatureLabel ?? null}
            detectedSignature={signatureHelper?.found ?? null}
            liveCode={liveCodeSnapshot}
            getLiveCode={getLiveCodeSnapshot}
            runStatus={runStatus}
            runMessage={runMessage}
            failingSummary={failingSummary}
            signatureHelper={signatureHelper}
            initialSummary={recentChatSummary}
            onSummaryChange={setRecentChatSummary}
            struggleLevel={struggleNudge.level}
            showStruggleNudge={struggleNudge.visible}
            getStruggleContext={getStruggleContextSummary}
            onAssistAction={handleAssistAction}
            onStruggleDismiss={handleStruggleDismiss}
            className="h-full min-h-0 min-w-0"
          />
        </div>
      </main>

      <UnitsDrawer
        open={drawerOpen}
        units={localizedUnits.map(({ unit, copy }) => ({
          id: unit.id,
          title: copy.title,
          concept: copy.concept,
        }))}
        currentUnitIndex={currentUnitIndex}
        completedUnitIds={completedUnitIds}
        onClose={() => setDrawerOpen(false)}
        onSelectUnit={selectUnit}
      />

      {pageSettingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-pebble-border/35 bg-pebble-panel/95 p-4 shadow-[0_20px_60px_rgba(2,8,23,0.32)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-pebble-text-primary">{t('settings.pageTitle')}</h2>
              <button
                type="button"
                onClick={() => setPageSettingsOpen(false)}
                className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16]"
              >
                {t('actions.close')}
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-pebble-text-secondary">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{t('settings.theme')}</span>
                <div
                  role="tablist"
                  aria-label={t('settings.theme')}
                  className="grid grid-cols-2 gap-2 rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-1"
                >
                  {(['dark', 'light'] as const).map((mode) => {
                    const selected = theme === mode
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-pressed={selected}
                        onClick={() => setTheme(mode)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/50 ${selected
                          ? 'border border-pebble-accent/50 bg-pebble-accent/18 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                          : 'border border-transparent text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]'
                          }`}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                        {mode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.reduceMotion')}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPagePrefs((prev) => ({ ...prev, reduceMotion: !prev.reduceMotion }))
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${pagePrefs.reduceMotion
                    ? 'border-pebble-accent/45 bg-pebble-accent/18 text-pebble-text-primary'
                    : 'border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary hover:bg-pebble-overlay/[0.16]'
                    }`}
                >
                  {pagePrefs.reduceMotion ? t('actions.on') : t('actions.off')}
                </button>
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.density')}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPagePrefs((prev) => ({ ...prev, compactDensity: !prev.compactDensity }))
                  }
                  className={`rounded-lg border px-2.5 py-1 text-xs transition ${pagePrefs.compactDensity
                    ? 'border-pebble-accent/45 bg-pebble-accent/18 text-pebble-text-primary'
                    : 'border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary hover:bg-pebble-overlay/[0.16]'
                    }`}
                >
                  {pagePrefs.compactDensity ? t('settings.densityCompact') : t('settings.densityComfortable')}
                </button>
              </label>
            </div>
          </div>
        </div>
      )}

      {sessionSettingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-pebble-border/35 bg-pebble-panel/95 p-4 shadow-[0_20px_60px_rgba(2,8,23,0.32)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-pebble-text-primary">{t('settings.sessionTitle')}</h2>
              <button
                type="button"
                onClick={() => setSessionSettingsOpen(false)}
                className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16]"
              >
                {t('actions.close')}
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-pebble-text-secondary">
              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.editorFontSize')}</span>
                <input
                  type="range"
                  min={14}
                  max={18}
                  step={1}
                  value={editorFontSize}
                  onChange={(event) => setEditorFontSize(Number(event.target.value))}
                  className="w-40 accent-blue-500"
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>{t('settings.wordWrap')}</span>
                <button
                  type="button"
                  onClick={() => setWordWrapEnabled((prev) => !prev)}
                  className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16]"
                >
                  {wordWrapEnabled ? t('actions.on') : t('actions.off')}
                </button>
              </label>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={isResetConfirmOpen}
        title="Reset editor?"
        description="This will replace your current code with the starter template. You can't undo this."
        confirmText="Reset"
        cancelText="Cancel"
        dontAskKey="pebble.confirmReset.v1"
        onConfirm={() => { setIsResetConfirmOpen(false); executeReset() }}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </section>
  )
}
