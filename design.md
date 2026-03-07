# PebbleCode — Technical Design Document

## 1. System Overview

PebbleCode is a full-stack web application built around a recovery-oriented coding practice philosophy. The system combines a React-based frontend IDE, a dual-mode backend (local Express server + serverless API routes), a multi-language code execution runtime, AWS Bedrock-powered AI coaching, and a comprehensive analytics pipeline.

### Architecture Principles

1. **Local-first with cloud enhancement**: Core functionality works offline/locally; cloud services add premium features
2. **Graceful degradation**: System remains functional when AWS services are unavailable
3. **Context preservation**: Session state, code drafts, and analytics persist across browser sessions
4. **Separation of concerns**: Learning track (curriculum) and editor language (tooling) are independent
5. **Event-driven analytics**: User actions emit events that feed into insights derivation

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Landing  │  │ Problems │  │ Session  │  │Dashboard │       │
│  │  Page    │  │ Browser  │  │   IDE    │  │Insights  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│         │              │              │              │          │
│         └──────────────┴──────────────┴──────────────┘          │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │   API Layer (Dual Mode)            │
         │  ┌──────────────┐ ┌──────────────┐│
         │  │ Local Express│ │  Serverless  ││
         │  │  Dev Server  │ │  API Routes  ││
         │  └──────────────┘ └──────────────┘│
         └────────────────────────────────────┘
                │         │         │
      ┌─────────┴─────┬───┴────┬────┴─────────┐
      ▼               ▼        ▼              ▼
┌──────────┐   ┌──────────┐ ┌────────┐  ┌──────────┐
│  Local   │   │   AWS    │ │  AWS   │  │   AWS    │
│  Runner  │   │ Bedrock  │ │ Lambda │  │ Cognito  │
│ (Python, │   │  (LLM)   │ │(Runner)│  │  (Auth)  │
│JS,C++,   │   └──────────┘ └────────┘  └──────────┘
│Java,C)   │
└──────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│  Optional AWS Services                   │
│  • DynamoDB (state persistence)          │
│  • S3 (avatars, reports)                 │
│  • EventBridge (event routing)           │
│  • AppSync (live updates)                │
│  • Athena (analytics queries)            │
│  • Polly (voice narration)               │
│  • SageMaker (streak risk prediction)   │
└──────────────────────────────────────────┘
```


## 2. Frontend Architecture

### Technology Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM 7
- **Styling**: Tailwind CSS with custom design system
- **Editor**: Monaco Editor (VS Code engine)
- **State Management**: React hooks + custom stores with localStorage persistence
- **UI Components**: Custom component library (shadcn-inspired)
- **Animation**: Framer Motion for premium transitions

### Application Structure

```
src/
├── pages/              # Top-level route components
│   ├── LandingPage.tsx
│   ├── ProblemsPage.tsx
│   ├── SessionPage.tsx
│   ├── DashboardPage.tsx
│   ├── OnboardingPage.tsx
│   ├── PlacementPage.tsx
│   ├── ProfilePage.tsx
│   └── CommunityPage.tsx
├── components/         # Reusable UI components
│   ├── session/       # Session IDE components
│   ├── problems/      # Problem browser components
│   ├── insights/      # Analytics widgets
│   ├── community/     # Community features
│   └── ui/            # Base UI primitives
├── lib/               # Core business logic
│   ├── runApi.ts      # Code execution client
│   ├── analyticsStore.ts  # Event tracking
│   ├── analyticsDerivers.ts  # Metrics computation
│   ├── auth.ts        # Authentication logic
│   ├── functionMode.ts  # Function-mode harness
│   └── [stores].ts    # Local persistence stores
├── i18n/              # Internationalization
│   ├── languages.ts   # Language definitions
│   ├── strings.ts     # UI translations
│   ├── problemContent.ts  # Problem localization
│   └── topicCatalog.ts  # Topic translations
├── data/              # Static data and problem bank
│   ├── problemsBank.ts  # 50+ curated problems
│   ├── onboardingData.ts
│   └── communitySeed.ts
└── utils/             # Helper functions
```

### Key Frontend Patterns

#### Local-First Persistence

All critical user state persists to localStorage with versioned keys:

```typescript
// Example: Problem code persistence by language
const STORAGE_KEY = 'pebble.problemCodeByLang.v2'

function saveProblemCodeByLang(data: ProblemCodeByLang) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function loadProblemCodeByLang(): ProblemCodeByLang {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}
```

Persisted state includes:
- Code drafts per problem per language
- Solved problems map
- Submissions history
- Analytics events
- User preferences (theme, language, editor settings)
- Learning track and placement results
- Notifications

#### Event-Driven Analytics

User actions emit structured events that feed into analytics derivation:

```typescript
type AnalyticsEvent = 
  | { type: 'run'; problemId: string; language: string; passed: boolean; errorType?: string }
  | { type: 'submit'; problemId: string; language: string; accepted: boolean }
  | { type: 'assist'; problemId: string; helpTier: 'hint' | 'explain' | 'next' }
  | { type: 'solve'; problemId: string; attempts: number; timeSpent: number }

// Events are stored locally and processed on-demand
function logRunEvent(event: RunEvent) {
  const state = getAnalyticsState()
  state.events.push({ ...event, timestamp: Date.now() })
  saveAnalyticsState(state)
}
```

Analytics derivation happens client-side:

```typescript
function deriveInsights(events: AnalyticsEvent[]) {
  return {
    recoveryEffectiveness: calculateRecoveryScore(events),
    avgRecoveryTime: calculateAvgRecoveryTime(events),
    autonomyRate: calculateAutonomyRate(events),
    issueProfile: clusterErrorTypes(events),
    radarScores: calculateSkillRadar(events),
    nextActions: recommendNextSteps(events)
  }
}
```


#### Session State Management

The Session IDE maintains complex state for the active coding session:

```typescript
// Core session state
const [editorLanguage, setEditorLanguage] = useState<SessionLanguageId>()
const [draftByUnitId, setDraftByUnitId] = useState<Record<string, Record<Language, string>>>()
const [testResultsByIndex, setTestResultsByIndex] = useState<Record<number, TestResult>>()
const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>()
const [submitAccepted, setSubmitAccepted] = useState(false)

// Struggle tracking for adaptive nudging
const struggleEngine = createStruggleEngine()
struggleEngine.recordEvent({ type: 'run_failed', errorType: 'runtime_error' })
const struggleLevel = struggleEngine.getState().level // 0-3
```

State synchronization:
- Code drafts debounced to localStorage (500ms)
- Test results cleared on language switch
- Run status resets on new problem load
- Struggle state persists across runs within same session

### Component Design Patterns

#### Compound Components

Complex UI surfaces use compound component patterns:

```typescript
<ProblemsFilterPopover
  value={filters}
  onApply={setFilters}
  topicOptions={topics}
  labels={localizedLabels}
/>

<PebbleChatPanel
  problem={currentProblem}
  code={editorCode}
  runOutcome={lastRunResult}
  helpTier={selectedTier}
  onResponse={handleCoachResponse}
/>
```

#### Render Props for Flexibility

```typescript
<TestResultsPanel
  results={testResultsByIndex}
  renderDiagnostic={(result) => (
    <DiagnosticMessage
      status={result.diagnostic.status}
      line={result.diagnostic.editorLine}
      message={result.diagnostic.message}
    />
  )}
/>
```

### Internationalization Architecture

Multilingual support is deeply integrated:

```typescript
// Language context provider
<I18nProvider>
  <App />
</I18nProvider>

// Usage in components
const { t, lang, isRTL } = useI18n()

// UI strings
<h1>{t('problems.title')}</h1>

// Problem content localization
const localizedProblem = getLocalizedProblem(problem, lang)

// RTL-aware styling
<div className={isRTL ? 'rtlText text-right' : ''}>
  {localizedProblem.title}
</div>
```

Translation coverage:
- 13 languages for UI strings
- Problem titles, statements, and topics localized
- Fallback to English for missing translations
- RTL layout support for Urdu


## 3. Backend Architecture

### Dual Backend Model

PebbleCode uses two backend implementations:

#### Local Express Server (`server/dev-server.ts`)

**Purpose**: Rich development environment with full feature set

**Capabilities**:
- Local code execution (Python, JS, C++, Java, C)
- Pebble Coach with safety layer
- Weekly recap generation and audio synthesis
- Cohort analytics endpoints
- Observability middleware (tracing, metrics)
- SSE (Server-Sent Events) for live updates

**Advantages**:
- Fast iteration during development
- No AWS dependency for core features
- Richer debugging and logging
- Supports advanced features not yet in serverless routes

#### Serverless API Routes (`api/`)

**Purpose**: Production-ready deployment on Vercel/AWS

**Routes**:
- `/api/pebble` - Bedrock-backed coaching
- `/api/run` - Code execution (local or Lambda)
- `/api/auth/*` - Cognito authentication flows
- `/api/telemetry` - Event ingestion
- `/api/health` - Health check

**Advantages**:
- Scales automatically
- Pay-per-use pricing
- Global edge deployment
- Stateless and cacheable

### Code Execution Pipeline

#### Request Flow

```
User clicks "Run" in IDE
  ↓
Frontend calls POST /api/run with:
  {
    language: 'python3',
    code: 'def solve():\n  return 42',
    stdin: '',
    timeoutMs: 5000
  }
  ↓
Backend normalizes request
  ↓
Runner mode selection:
  - auto: Try remote, fallback to local
  - local: Force local execution
  - remote: Force Lambda/remote runner
  ↓
Execution (local example):
  1. Write code to temp file
  2. Spawn child process (python3 main.py)
  3. Pipe stdin, capture stdout/stderr
  4. Enforce timeout with AbortController
  5. Parse exit code and output
  ↓
Response normalization:
  {
    status: 'success' | 'compile_error' | 'runtime_error' | 'timeout',
    stdout: '42',
    stderr: '',
    exitCode: 0,
    executionTimeMs: 123
  }
  ↓
Frontend updates test results UI
```

#### Local Runner Implementation

```typescript
async function runCodeLocally(request: RunRequest): Promise<RunnerResponse> {
  const { language, code, stdin, timeoutMs } = request
  
  // Create temp directory
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pebble-'))
  
  // Write source file
  const sourceFile = getSourceFileName(language) // e.g., 'main.py'
  await fsp.writeFile(path.join(tempDir, sourceFile), code)
  
  // Spawn process with timeout
  const child = spawn(getCommand(language), getArgs(language, sourceFile), {
    cwd: tempDir,
    timeout: timeoutMs
  })
  
  // Pipe stdin
  child.stdin.write(stdin)
  child.stdin.end()
  
  // Capture output
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => stdout += chunk)
  child.stderr.on('data', chunk => stderr += chunk)
  
  // Wait for completion
  const exitCode = await new Promise<number>((resolve) => {
    child.on('exit', code => resolve(code ?? -1))
    child.on('error', () => resolve(-1))
  })
  
  // Cleanup
  await fsp.rm(tempDir, { recursive: true, force: true })
  
  // Normalize response
  return {
    status: exitCode === 0 ? 'success' : 'runtime_error',
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
    executionTimeMs: Date.now() - startTime
  }
}
```

#### Function Mode vs Stdio Mode

**Stdio Mode** (default for problems):
- User writes full program with stdin/stdout
- Suitable for competitive programming style
- Example: Read array from stdin, print result to stdout

**Function Mode** (used for curriculum units):
- User implements specific function signature
- Test harness wraps function and evaluates test cases
- Example: `def twoSum(nums: List[int], target: int) -> List[int]`

Function mode harness generation:

```python
# Generated harness for Python function mode
def twoSum(nums, target):
    # User code injected here
    pass

# Test harness
import json
test_cases = [
    {"args": [[2,7,11,15], 9], "expected": [0,1]},
    {"args": [[3,2,4], 6], "expected": [1,2]}
]

for i, case in enumerate(test_cases):
    result = twoSum(*case["args"])
    passed = result == case["expected"]
    print(f"CASE_{i}:{'PASS' if passed else 'FAIL'}:{json.dumps(result)}")
```


### AI Coaching Architecture

#### Pebble Coach Design

The Pebble Coach is not a generic chatbot—it's a context-aware mentor grounded in session state.

**Context Payload**:

```typescript
type PebbleContext = {
  taskTitle: string           // Current problem title
  codeText: string           // User's code (trimmed to 1800 chars)
  executionMode: string      // 'function' | 'stdio'
  requiredSignature: string  // Expected function signature
  detectedSignature: string  // Actual signature in code
  runStatus: string          // 'success' | 'compile_error' | 'runtime_error'
  runMessage: string         // Diagnostic message (trimmed to 360 chars)
  currentErrorKey: string    // Error type classification
  nudgeVisible: boolean      // Whether struggle nudge is shown
  guidedStep: string         // Current guided step (e.g., "2/5")
  struggleScore: number      // 0-3 struggle level
  repeatErrorCount: number   // Consecutive same-error count
  errorHistory: string[]     // Last 3 error types
}
```

**Prompt Construction**:

```typescript
const systemPrompt = `
You are Pebble, a calm and terse coding mentor.

Core rules:
- Stay grounded in the current problem, code, and run outcome
- Provide hints before explanations before solutions
- Keep responses under 6 lines
- Ask clarifying questions only under high struggle
- Celebrate progress with one micro next-step

Context: ${JSON.stringify(compactContext)}
User question: ${userPrompt}
`

const bedrockRequest = {
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  body: {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 240,
    temperature: 0.35,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  }
}
```

**Safety Layer**:

Before returning coach response:

```typescript
function enforceSafety(response: string, context: PebbleContext): string {
  // Check for solution dumping
  if (containsFullSolution(response, context.codeText)) {
    return "I can't provide the full solution, but I can guide you step by step."
  }
  
  // Check for off-topic content
  if (!isRelevantToProblem(response, context.taskTitle)) {
    return "Let's stay focused on the current problem."
  }
  
  // Redact sensitive patterns
  return redactSensitiveContent(response)
}
```

**Tiered Help System**:

```typescript
type HelpTier = 'hint' | 'explain' | 'next'

function buildTieredPrompt(tier: HelpTier, context: PebbleContext): string {
  switch (tier) {
    case 'hint':
      return `Give a subtle hint about the approach without revealing the solution.`
    case 'explain':
      return `Explain the concept or algorithm needed, with examples.`
    case 'next':
      return `Provide the specific next step to fix the current error.`
  }
}
```


## 4. Data Architecture

### Local-First Persistence Model

PebbleCode uses browser localStorage as the primary data store for the prototype, with optional cloud sync.

#### Storage Schema

```typescript
// Analytics events
'pebble.analytics.v2' → {
  events: AnalyticsEvent[],
  updatedAt: number
}

// Problem code by language
'pebble.problemCodeByLang.v2' → {
  [problemId]: {
    selectedLanguage: string,
    drafts: {
      python3: string,
      javascript: string,
      cpp17: string,
      java17: string,
      c: string
    }
  }
}

// Solved problems
'pebble.solvedProblems.v2' → {
  [problemId]: {
    solvedAt: number,
    language: string,
    attempts: number
  }
}

// Submissions history
'pebble.submissions.v2' → {
  [unitId]: Array<{
    timestamp: number,
    language: string,
    code: string,
    accepted: boolean,
    testResults: TestResult[]
  }>
}

// User preferences
'pebble.sessionPrefs.v1' → {
  learningTrack: { languageFocus: string, level: string },
  editorLanguage: string,
  editorLanguageUserOverride: boolean
}

// Notifications
'pebble.notifications.v1' → {
  [userId]: Array<{
    id: string,
    category: string,
    title: string,
    message: string,
    timestamp: number,
    read: boolean
  }>
}
```

#### Versioning Strategy

Storage keys include version suffixes (`.v1`, `.v2`) to support schema migrations:

```typescript
function migrateAnalyticsStorage() {
  const oldData = localStorage.getItem('pebble.analytics.v1')
  if (!oldData) return
  
  const parsed = JSON.parse(oldData)
  const migrated = {
    events: parsed.events.map(migrateEventSchema),
    updatedAt: Date.now()
  }
  
  localStorage.setItem('pebble.analytics.v2', JSON.stringify(migrated))
  localStorage.removeItem('pebble.analytics.v1')
}
```

### Cloud Data Layer (Optional)

When AWS services are configured, PebbleCode can sync data to cloud storage:

#### DynamoDB Tables

**Profiles Table**:
```
PK: userId (string)
Attributes:
  - displayName
  - username
  - bio
  - avatarUrl
  - createdAt
  - updatedAt
```

**Mental State Table** (for live updates):
```
PK: userId (string)
SK: timestamp (string)
Attributes:
  - recoveryEffectiveness
  - autonomyRate
  - guidanceReliance
  - streakDays
  - ttl (for auto-cleanup)
```

**Events Table** (for analytics):
```
PK: userId (string)
SK: timestamp#eventType (string)
Attributes:
  - eventType
  - problemId
  - language
  - metadata (JSON)
```

#### S3 Buckets

**Avatars Bucket**:
- User-uploaded profile pictures
- Presigned URL upload flow
- CORS configured for frontend origin

**Reports Bucket**:
- Generated recovery report PDFs
- Presigned URL download flow
- Lifecycle policy for auto-deletion after 7 days


## 5. Authentication & Authorization

### Cognito Integration

PebbleCode uses AWS Cognito for user identity management.

#### Authentication Flows

**Signup Flow**:
```
1. User submits email + password
2. Frontend calls /api/auth/signup
3. Backend creates Cognito user
4. Cognito sends verification email
5. User enters confirmation code
6. Frontend calls /api/auth/confirm-signup
7. User is logged in with JWT tokens
```

**Login Flow**:
```
1. User submits email/username + password
2. Frontend calls /api/auth/login
3. Backend authenticates with Cognito
4. Cognito returns JWT tokens (idToken, accessToken, refreshToken)
5. Frontend stores tokens in localStorage
6. Subsequent API calls include Authorization header
```

**Token Management**:

```typescript
// Token storage
const AUTH_STORAGE_KEY = 'pebble.auth.tokens'

function saveTokens(tokens: CognitoTokens) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + (tokens.expiresIn * 1000)
  }))
}

// Token refresh
async function refreshTokenIfNeeded() {
  const stored = loadTokens()
  if (!stored || Date.now() < stored.expiresAt - 60000) {
    return stored // Still valid
  }
  
  // Refresh using refreshToken
  const newTokens = await cognitoClient.refreshSession(stored.refreshToken)
  saveTokens(newTokens)
  return newTokens
}
```

#### Authorization Patterns

**Protected Routes**:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) return <Navigate to="/login" />
  
  return <>{children}</>
}

// Usage
<Route path="/profile" element={
  <ProtectedRoute>
    <ProfilePage />
  </ProtectedRoute>
} />
```

**API Authorization**:

```typescript
async function apiFetch(endpoint: string, options?: RequestInit) {
  const tokens = await refreshTokenIfNeeded()
  
  return fetch(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${tokens.idToken}`,
      'Content-Type': 'application/json'
    }
  })
}
```

### Username System

PebbleCode supports both email and username login:

```typescript
// Username availability check
async function checkUsernameAvailable(username: string): Promise<boolean> {
  const response = await fetch('/api/username/available', {
    method: 'POST',
    body: JSON.stringify({ username })
  })
  const data = await response.json()
  return data.available
}

// Username is stored as custom attribute in Cognito
const userAttributes = {
  email: 'user@example.com',
  'custom:username': 'pebble_coder_42'
}
```


## 6. Analytics & Insights Pipeline

### Event Collection

User actions emit structured events that feed into analytics:

```typescript
// Event types
type AnalyticsEvent = 
  | RunEvent
  | SubmitEvent
  | AssistEvent
  | SolveEvent
  | PlacementEvent

interface RunEvent {
  type: 'run'
  timestamp: number
  problemId: string
  language: string
  passed: boolean
  errorType?: 'syntax' | 'runtime' | 'logic' | 'timeout'
  executionTimeMs: number
}

interface SubmitEvent {
  type: 'submit'
  timestamp: number
  problemId: string
  language: string
  accepted: boolean
  testsPassed: number
  testsTotal: number
}

interface AssistEvent {
  type: 'assist'
  timestamp: number
  problemId: string
  helpTier: 'hint' | 'explain' | 'next'
  struggleLevel: number
}
```

### Metrics Derivation

Analytics are computed on-demand from the event log:

#### Recovery Effectiveness

```typescript
function calculateRecoveryEffectiveness(events: AnalyticsEvent[]): number {
  const runEvents = events.filter(e => e.type === 'run')
  if (runEvents.length === 0) return 0
  
  let totalRecoveryScore = 0
  let recoveryCount = 0
  
  for (let i = 1; i < runEvents.length; i++) {
    const prev = runEvents[i - 1]
    const curr = runEvents[i]
    
    if (!prev.passed && curr.passed) {
      // Successful recovery
      const timeDelta = curr.timestamp - prev.timestamp
      const autonomyBonus = !hasAssistBetween(events, prev.timestamp, curr.timestamp) ? 20 : 0
      const speedBonus = timeDelta < 60000 ? 15 : 0
      
      totalRecoveryScore += 65 + autonomyBonus + speedBonus
      recoveryCount++
    }
  }
  
  return recoveryCount > 0 ? Math.round(totalRecoveryScore / recoveryCount) : 0
}
```

#### Autonomy Rate

```typescript
function calculateAutonomyRate(events: AnalyticsEvent[]): number {
  const solveEvents = events.filter(e => e.type === 'solve')
  if (solveEvents.length === 0) return 0
  
  let autonomousSolves = 0
  
  for (const solve of solveEvents) {
    const assistsBeforeSolve = events.filter(e => 
      e.type === 'assist' && 
      e.problemId === solve.problemId &&
      e.timestamp < solve.timestamp
    )
    
    if (assistsBeforeSolve.length === 0) {
      autonomousSolves++
    }
  }
  
  return Math.round((autonomousSolves / solveEvents.length) * 100)
}
```

#### Issue Profiling

```typescript
function clusterErrorTypes(events: AnalyticsEvent[]): IssueProfile[] {
  const errorCounts = new Map<string, number>()
  
  events
    .filter(e => e.type === 'run' && !e.passed && e.errorType)
    .forEach(e => {
      const count = errorCounts.get(e.errorType!) || 0
      errorCounts.set(e.errorType!, count + 1)
    })
  
  const total = Array.from(errorCounts.values()).reduce((a, b) => a + b, 0)
  
  return Array.from(errorCounts.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: Math.round((count / total) * 100)
  }))
}
```

#### Skill Radar

Six-dimensional skill assessment:

```typescript
function calculateSkillRadar(events: AnalyticsEvent[]): RadarScores {
  return {
    speed: calculateSpeedScore(events),        // Time to first pass
    accuracy: calculateAccuracyScore(events),  // First-attempt success rate
    consistency: calculateConsistencyScore(events), // Streak stability
    autonomy: calculateAutonomyScore(events),  // Solve without hints
    debugging: calculateDebuggingScore(events), // Error recovery rate
    complexity: calculateComplexityScore(events) // Hard problem success
  }
}
```

### Streak Tracking

```typescript
function selectCurrentStreak(
  dailyCompletions: Map<string, number>,
  todayKey: string
): StreakStats {
  const sortedDays = Array.from(dailyCompletions.keys()).sort()
  
  let streak = 0
  let currentDay = todayKey
  
  while (dailyCompletions.has(currentDay)) {
    streak++
    currentDay = getPreviousDay(currentDay)
  }
  
  return {
    streak,
    isTodayComplete: dailyCompletions.has(todayKey),
    lastCompletedDay: sortedDays[sortedDays.length - 1]
  }
}
```


## 7. AWS Infrastructure

### CDK Stack Architecture

PebbleCode uses AWS CDK for infrastructure as code, organized into phase-based stacks:

#### Phase 0: Core Backend (`pebble-phase0-stack.ts`)

- **API Gateway**: REST API for serverless routes
- **Lambda Functions**: Code execution, auth handlers
- **Cognito User Pool**: Authentication and user management
- **DynamoDB Tables**: User profiles, sessions

#### Phase 4: Live Updates (`pebble-phase4-stack.ts`)

- **AppSync GraphQL API**: Real-time subscriptions for mental state updates
- **DynamoDB Streams**: Trigger Lambda on state changes
- **EventBridge**: Event routing for run/submit completions
- **Lambda Functions**: 
  - `updateMentalState`: Compute recovery metrics from events
  - `publishToAppSync`: Push updates to subscribed clients

```typescript
// AppSync subscription for live updates
const subscription = gql`
  subscription OnMentalStateUpdate($userId: String!) {
    onMentalStateUpdate(userId: $userId) {
      recoveryEffectiveness
      autonomyDelta
      streakDelta
      guidanceRelianceDelta
    }
  }
`
```

#### Phase 5: Analytics (`pebble-phase5-analytics-stack.ts`)

- **S3 Data Lake**: Raw event storage
- **Glue Crawler**: Schema discovery for events
- **Athena**: SQL queries over event data
- **Lambda Functions**: Cohort analytics aggregation

```sql
-- Example Athena query for cohort analytics
SELECT 
  language,
  AVG(recovery_time_sec) as avg_recovery_time,
  AVG(autonomy_rate) as avg_autonomy_rate
FROM events
WHERE event_type = 'solve'
  AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY language
```

#### Phase 6: Journeys (`pebble-phase6-journeys-stack.ts`)

- **Step Functions**: Orchestrate multi-step learning paths
- **Lambda Functions**: Journey state transitions
- **DynamoDB**: Journey progress tracking

#### Phase 7: Files (`pebble-phase7-files-stack.ts`)

- **S3 Buckets**: Avatar uploads, report storage
- **CloudFront**: CDN for static assets
- **Lambda@Edge**: Image resizing, format conversion

#### Phase 8: Observability (`pebble-phase8-observability-stack.ts`)

- **CloudWatch Logs**: Centralized logging
- **CloudWatch Metrics**: Custom metrics (run latency, error rates)
- **X-Ray**: Distributed tracing
- **Lambda Functions**: Log aggregation, alerting

#### Phase 9: Premium Features (`pebble-phase9-premium-stack.ts`)

- **SageMaker Endpoint**: Streak risk prediction model
- **Polly**: Text-to-speech for weekly recap narration
- **S3**: Audio file storage
- **Lambda Functions**: 
  - `generateRecap`: Build weekly summary from events
  - `synthesizeSpeech`: Convert recap to audio via Polly

```typescript
// Streak risk prediction
const sagemakerClient = new SageMakerRuntimeClient({ region })
const response = await sagemakerClient.send(new InvokeEndpointCommand({
  EndpointName: 'pebble-streak-risk-model',
  Body: JSON.stringify({
    features: {
      currentStreak: 7,
      avgDailyProblems: 2.3,
      lastActivityHoursAgo: 18,
      weekdayPattern: [1, 1, 0, 1, 1, 1, 0]
    }
  })
}))

const prediction = JSON.parse(response.Body)
// { riskScore: 0.68, recommendation: 'Practice today to maintain streak' }
```

### Hosting Stack (`hosting-stack.ts`)

- **S3 Bucket**: Static frontend assets
- **CloudFront Distribution**: Global CDN with edge caching
- **Route53**: DNS management (optional)
- **ACM Certificate**: HTTPS/TLS

Deployment script:

```bash
# Build frontend
npm run build

# Sync to S3
aws s3 sync dist/ s3://pebble-frontend-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```


## 8. Key User Flows

### Flow 1: First-Time User Onboarding

```
1. User lands on homepage
   ↓
2. Clicks "Try Pebble" CTA
   ↓
3. Onboarding page:
   - Select learning track language (Python/JS/C++/Java/C)
   - Select skill level (Beginner/Intermediate/Advanced)
   ↓
4. Placement test (optional):
   - 3-5 MCQ questions
   - 1 coding challenge
   ↓
5. Placement result determines starting unit
   ↓
6. Redirected to first session
```

### Flow 2: Problem Discovery & Session Start

```
1. User navigates to Problems page
   ↓
2. Browses problem list:
   - Filters by difficulty, topic, language
   - Searches by title or keyword
   - Clicks topic chip to filter
   ↓
3. Clicks problem row to open preview
   ↓
4. Preview panel shows:
   - Full problem statement
   - Examples and constraints
   - Language selector
   - Time estimate
   ↓
5. Clicks "Start Problem"
   ↓
6. Redirected to Session IDE with:
   - Problem statement loaded
   - Starter code in selected language
   - Test cases visible
```

### Flow 3: Coding Session with Recovery

```
1. User writes code in Monaco editor
   ↓
2. Clicks "Run" button
   ↓
3. Code executes against visible test cases
   ↓
4. Test results show:
   - ✅ Test 1: Passed
   - ❌ Test 2: Failed (Expected: "hello", Got: "helo")
   - ❌ Test 3: Runtime Error (IndexError: list index out of range)
   ↓
5. User struggles to fix error (3+ failed runs)
   ↓
6. Struggle nudge appears: "Need a hint?"
   ↓
7. User opens Pebble Coach panel
   ↓
8. Selects "Hint" tier
   ↓
9. Coach provides context-aware hint:
   "Your loop is iterating one index too far. Check your range bounds."
   ↓
10. User fixes code, clicks "Run" again
   ↓
11. All tests pass ✅
   ↓
12. User clicks "Submit"
   ↓
13. Code evaluated against hidden tests
   ↓
14. Submission accepted! 🎉
   ↓
15. Analytics event logged:
    - Solve event with attempts count
    - Recovery time calculated
    - Autonomy rate updated (used hint)
```

### Flow 4: Insights Review

```
1. User navigates to Dashboard
   ↓
2. Dashboard loads analytics from local events
   ↓
3. KPI cards display:
   - Recovery Effectiveness: 78/100
   - Avg Recovery Time: 142 sec
   - Autonomy Rate: 65%
   - Current Streak: 5 days
   ↓
4. Skill radar shows strengths/weaknesses:
   - Strong: Speed, Accuracy
   - Needs work: Debugging, Complexity
   ↓
5. Issue profile shows error distribution:
   - 45% Logic errors
   - 30% Runtime errors
   - 15% Syntax errors
   - 10% Timeouts
   ↓
6. Next actions widget recommends:
   "Focus on debugging: Practice problems with edge cases"
   ↓
7. User clicks "Continue" on recommended problem
   ↓
8. Redirected to Session IDE
```

### Flow 5: Weekly Recap (Premium)

```
1. User navigates to Dashboard
   ↓
2. Weekly Recap widget shows:
   "Your week in review: 12 problems solved, 87% recovery rate"
   ↓
3. User clicks "Generate Recap"
   ↓
4. Backend Lambda function:
   - Queries last 7 days of events
   - Computes weekly metrics
   - Generates narrative summary
   - Calls AWS Polly for speech synthesis
   - Stores audio in S3
   ↓
5. Frontend polls for completion
   ↓
6. Audio player appears with narrated recap
   ↓
7. User plays audio:
   "This week you solved 12 problems with an 87% recovery rate.
    Your strongest area was array manipulation.
    Consider practicing more dynamic programming problems next week."
```


## 9. Performance Optimizations

### Frontend Performance

#### Code Splitting

```typescript
// Lazy load heavy pages
const SessionPage = lazy(() => import('./pages/SessionPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

// Route-based code splitting
<Route path="/session/:id" element={
  <Suspense fallback={<LoadingSpinner />}>
    <SessionPage />
  </Suspense>
} />
```

#### Monaco Editor Optimization

```typescript
// Load Monaco asynchronously
import { loader } from '@monaco-editor/react'

loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs'
  }
})

// Define custom themes once
monaco.editor.defineTheme('pebble-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#252A3C',
    'editor.lineHighlightBackground': '#FFFFFF08'
  }
})
```

#### Debounced Persistence

```typescript
// Debounce code draft saves
const debouncedSave = useCallback(
  debounce((code: string) => {
    saveProblemCodeByLang({
      ...problemCodeByLang,
      [currentProblem.id]: {
        ...problemCodeByLang[currentProblem.id],
        drafts: {
          ...problemCodeByLang[currentProblem.id]?.drafts,
          [editorLanguage]: code
        }
      }
    })
  }, 500),
  [currentProblem, editorLanguage]
)
```

#### Memoization

```typescript
// Memoize expensive computations
const filteredProblems = useMemo(() => {
  return problems
    .filter(p => matchesSearch(p, searchQuery))
    .filter(p => matchesFilters(p, filters))
    .sort((a, b) => sortByMode(a, b, sortMode))
}, [problems, searchQuery, filters, sortMode])

const derivedInsights = useMemo(() => {
  return deriveInsights({
    events: analyticsState.events,
    unitProgress,
    submissions,
    units
  })
}, [analyticsState.events, unitProgress, submissions, units])
```

### Backend Performance

#### Execution Timeout Enforcement

```typescript
// Prevent infinite loops
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

const child = spawn(command, args, {
  signal: controller.signal,
  timeout: timeoutMs
})

child.on('exit', () => clearTimeout(timeoutId))
```

#### Output Truncation

```typescript
// Prevent memory exhaustion from excessive output
const MAX_OUTPUT_CHARS = 10_000

let stdout = ''
child.stdout.on('data', (chunk) => {
  if (stdout.length < MAX_OUTPUT_CHARS) {
    stdout += chunk.toString()
  }
})

if (stdout.length >= MAX_OUTPUT_CHARS) {
  stdout = stdout.slice(0, MAX_OUTPUT_CHARS) + '\n[output truncated]'
}
```

#### Bedrock Request Optimization

```typescript
// Compact context to reduce token usage
function compactContextForModel(context: PebbleContext): CompactContext {
  return {
    taskTitle: context.taskTitle,
    runStatus: context.runStatus,
    runMessage: trimValue(context.runMessage, 360),
    codeText: trimCodeForModel(context.codeText, 1800),
    errorHistory: context.errorHistory.slice(-3) // Last 3 only
  }
}

// Tune generation parameters for concise responses
const bedrockParams = {
  max_tokens: 240,      // ~6 lines
  temperature: 0.35,    // More deterministic
  top_p: 0.9
}
```

### Database Performance

#### DynamoDB Optimization

```typescript
// Use composite sort keys for efficient queries
const mentalStateTable = new dynamodb.Table(this, 'MentalState', {
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING }
})

// Query last 7 days of events
const params = {
  TableName: 'pebble-events',
  KeyConditionExpression: 'userId = :userId AND timestamp > :weekAgo',
  ExpressionAttributeValues: {
    ':userId': userId,
    ':weekAgo': Date.now() - 7 * 24 * 60 * 60 * 1000
  }
}
```

#### TTL for Auto-Cleanup

```typescript
// Automatically delete old mental state records
const mentalStateTable = new dynamodb.Table(this, 'MentalState', {
  timeToLiveAttribute: 'ttl'
})

// Set TTL to 30 days from now
const item = {
  userId: 'user123',
  timestamp: Date.now(),
  recoveryEffectiveness: 78,
  ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
}
```


## 10. Security Considerations

### Frontend Security

#### No Secrets in Client Code

```typescript
// ❌ NEVER do this
const AWS_SECRET_KEY = 'abc123...'

// ✅ Use environment variables on backend only
// Frontend only knows public endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
```

#### Input Sanitization

```typescript
// Sanitize user input before display
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100)
}

// Prevent XSS in user-generated content
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
    ALLOWED_ATTR: []
  })
}
```

#### CORS Configuration

```typescript
// Backend CORS setup
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://pebblecode.app'
  ]
  
  const origin = req.headers.origin
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  next()
})
```

### Backend Security

#### Code Execution Sandboxing

```typescript
// Timeout enforcement
const EXECUTION_TIMEOUT_MS = 5000

// Resource limits (Linux)
const child = spawn(command, args, {
  timeout: EXECUTION_TIMEOUT_MS,
  env: {
    ...process.env,
    RLIMIT_CPU: '5',      // 5 seconds CPU time
    RLIMIT_AS: '512000000' // 512MB memory
  }
})

// Cleanup temp files
try {
  await runCode(request)
} finally {
  await fs.rm(tempDir, { recursive: true, force: true })
}
```

#### Bedrock Safety Layer

```typescript
// Prevent solution dumping
function enforceSafety(response: string, context: PebbleContext): string {
  // Check for full solution patterns
  const solutionPatterns = [
    /def\s+\w+\([^)]*\):\s*\n\s+return\s+.+/,
    /function\s+\w+\([^)]*\)\s*{\s*return\s+.+}/
  ]
  
  if (solutionPatterns.some(pattern => pattern.test(response))) {
    return "I can't provide the full solution. Let me guide you step by step instead."
  }
  
  // Redact sensitive patterns
  return response
    .replace(/password|secret|key/gi, '[REDACTED]')
    .replace(/\b\d{16}\b/g, '[CARD_NUMBER]')
}
```

#### Authentication Token Validation

```typescript
// Verify JWT tokens on protected routes
async function verifyToken(token: string): Promise<CognitoUser | null> {
  try {
    const jwksClient = jwksRsa({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    })
    
    const decoded = jwt.decode(token, { complete: true })
    const key = await jwksClient.getSigningKey(decoded.header.kid)
    
    const verified = jwt.verify(token, key.getPublicKey(), {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
    })
    
    return verified as CognitoUser
  } catch (error) {
    return null
  }
}
```

### Data Security

#### Encryption at Rest

```typescript
// DynamoDB encryption
const table = new dynamodb.Table(this, 'Profiles', {
  encryption: dynamodb.TableEncryption.AWS_MANAGED
})

// S3 encryption
const bucket = new s3.Bucket(this, 'Avatars', {
  encryption: s3.BucketEncryption.S3_MANAGED
})
```

#### Presigned URLs for Uploads

```typescript
// Generate presigned URL for avatar upload
async function getAvatarUploadUrl(userId: string): Promise<string> {
  const s3Client = new S3Client({ region })
  const command = new PutObjectCommand({
    Bucket: 'pebble-avatars',
    Key: `${userId}/avatar.jpg`,
    ContentType: 'image/jpeg'
  })
  
  return await getSignedUrl(s3Client, command, { expiresIn: 300 })
}

// Frontend uploads directly to S3
const response = await fetch(presignedUrl, {
  method: 'PUT',
  body: avatarFile,
  headers: { 'Content-Type': 'image/jpeg' }
})
```


## 11. Scalability & Reliability

### Horizontal Scaling

#### Serverless Auto-Scaling

```typescript
// Lambda concurrency limits
const runnerLambda = new lambda.Function(this, 'Runner', {
  reservedConcurrentExecutions: 100, // Reserve capacity
  timeout: cdk.Duration.seconds(10)
})

// API Gateway throttling
const api = new apigateway.RestApi(this, 'PebbleApi', {
  deployOptions: {
    throttlingRateLimit: 1000,  // requests per second
    throttlingBurstLimit: 2000
  }
})
```

#### DynamoDB Auto-Scaling

```typescript
const table = new dynamodb.Table(this, 'Events', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST // Auto-scales
})

// Or with provisioned capacity
const table = new dynamodb.Table(this, 'Events', {
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 5,
  writeCapacity: 5
})

table.autoScaleReadCapacity({
  minCapacity: 5,
  maxCapacity: 100
}).scaleOnUtilization({ targetUtilizationPercent: 70 })
```

### Caching Strategy

#### CloudFront Edge Caching

```typescript
const distribution = new cloudfront.Distribution(this, 'Frontend', {
  defaultBehavior: {
    origin: new origins.S3Origin(frontendBucket),
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
  },
  additionalBehaviors: {
    '/api/*': {
      origin: new origins.HttpOrigin(apiDomain),
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // Don't cache API
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL
    }
  }
})
```

#### Browser Caching

```typescript
// Cache static assets aggressively
const cacheHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable'
}

// Don't cache HTML
const htmlHeaders = {
  'Cache-Control': 'no-cache, must-revalidate'
}
```

### Error Handling & Retry Logic

#### Exponential Backoff

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) return response
      
      // Retry on 5xx errors
      if (response.status >= 500 && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      return response
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw new Error('Max retries exceeded')
}
```

#### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failureCount = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= 5) {
      this.state = 'open'
    }
  }
}
```

### Graceful Degradation

#### Fallback Strategies

```typescript
// Try remote runner, fallback to local
async function runCode(request: RunRequest): Promise<RunnerResponse> {
  const mode = getRunnerMode()
  
  if (mode === 'auto' || mode === 'remote') {
    try {
      const result = await runViaLambda(request)
      
      // Fallback to local if remote fails
      if (shouldFallbackToLocal(result)) {
        console.warn('Remote runner failed, falling back to local')
        return await runCodeLocally(request)
      }
      
      return result
    } catch (error) {
      console.error('Remote runner error:', error)
      return await runCodeLocally(request)
    }
  }
  
  return await runCodeLocally(request)
}
```

#### Offline Support

```typescript
// Service worker for offline caching
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Return offline fallback page
        return caches.match('/offline.html')
      })
    })
  )
})
```


## 12. Monitoring & Observability

### Logging Strategy

#### Structured Logging

```typescript
// Backend logging with context
function logInfo(message: string, context: Record<string, unknown>) {
  console.log(JSON.stringify({
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    ...context
  }))
}

// Example usage
logInfo('Code execution completed', {
  language: 'python3',
  executionTimeMs: 142,
  status: 'success',
  userId: 'user123'
})
```

#### CloudWatch Integration

```typescript
// Lambda function with CloudWatch Logs
const runnerLambda = new lambda.Function(this, 'Runner', {
  logRetention: logs.RetentionDays.ONE_WEEK,
  environment: {
    LOG_LEVEL: 'info'
  }
})

// Custom metrics
const metric = new cloudwatch.Metric({
  namespace: 'PebbleCode',
  metricName: 'CodeExecutionLatency',
  statistic: 'Average',
  period: cdk.Duration.minutes(5)
})
```

### Metrics Collection

#### Custom Metrics

```typescript
// Track key performance indicators
class MetricsStore {
  private metrics: Map<string, number[]> = new Map()
  
  record(name: string, value: number) {
    const values = this.metrics.get(name) || []
    values.push(value)
    this.metrics.set(name, values)
  }
  
  getAverage(name: string): number {
    const values = this.metrics.get(name) || []
    return values.reduce((a, b) => a + b, 0) / values.length
  }
  
  getPercentile(name: string, percentile: number): number {
    const values = (this.metrics.get(name) || []).sort((a, b) => a - b)
    const index = Math.floor(values.length * percentile / 100)
    return values[index] || 0
  }
}

// Usage
metricsStore.record('run_latency_ms', 142)
metricsStore.record('bedrock_latency_ms', 1834)
```

#### Frontend Performance Monitoring

```typescript
// Track page load performance
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  
  telemetry.track('page_load', {
    loadTime: perfData.loadEventEnd - perfData.fetchStart,
    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
    firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime
  })
})

// Track user interactions
function trackInteraction(action: string, metadata: Record<string, unknown>) {
  telemetry.track('user_interaction', {
    action,
    timestamp: Date.now(),
    ...metadata
  })
}
```

### Distributed Tracing

#### X-Ray Integration

```typescript
// Enable X-Ray tracing for Lambda
const runnerLambda = new lambda.Function(this, 'Runner', {
  tracing: lambda.Tracing.ACTIVE
})

// Add X-Ray SDK to Lambda code
import AWSXRay from 'aws-xray-sdk-core'
const AWS = AWSXRay.captureAWS(require('aws-sdk'))

// Create subsegments for operations
const segment = AWSXRay.getSegment()
const subsegment = segment.addNewSubsegment('code_execution')

try {
  const result = await executeCode(request)
  subsegment.close()
  return result
} catch (error) {
  subsegment.addError(error)
  subsegment.close()
  throw error
}
```

### Alerting

#### CloudWatch Alarms

```typescript
// Alert on high error rate
const errorAlarm = new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: runnerLambda.metricErrors({
    statistic: 'Sum',
    period: cdk.Duration.minutes(5)
  }),
  threshold: 10,
  evaluationPeriods: 2,
  alarmDescription: 'Alert when runner error rate exceeds threshold'
})

// Alert on high latency
const latencyAlarm = new cloudwatch.Alarm(this, 'HighLatency', {
  metric: runnerLambda.metricDuration({
    statistic: 'Average',
    period: cdk.Duration.minutes(5)
  }),
  threshold: 5000, // 5 seconds
  evaluationPeriods: 2
})

// Send alerts to SNS topic
const topic = new sns.Topic(this, 'AlertTopic')
errorAlarm.addAlarmAction(new actions.SnsAction(topic))
latencyAlarm.addAlarmAction(new actions.SnsAction(topic))
```


## 13. Testing Strategy

### Frontend Testing

#### Unit Tests

```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react'
import { ProblemsPage } from './ProblemsPage'

describe('ProblemsPage', () => {
  it('filters problems by difficulty', () => {
    render(<ProblemsPage />)
    
    const difficultyFilter = screen.getByLabelText('Difficulty')
    fireEvent.change(difficultyFilter, { target: { value: 'easy' } })
    
    const problems = screen.getAllByRole('row')
    expect(problems).toHaveLength(15) // 15 easy problems
  })
  
  it('searches problems by title', () => {
    render(<ProblemsPage />)
    
    const searchInput = screen.getByPlaceholderText('Search problems')
    fireEvent.change(searchInput, { target: { value: 'two sum' } })
    
    expect(screen.getByText('Two Sum')).toBeInTheDocument()
    expect(screen.queryByText('Valid Anagram')).not.toBeInTheDocument()
  })
})
```

#### Integration Tests

```typescript
// Test full user flow
describe('Session Flow', () => {
  it('completes full coding session', async () => {
    const { user } = renderWithRouter(<App />, { route: '/session/1' })
    
    // Write code
    const editor = screen.getByRole('textbox')
    await user.type(editor, 'def solve():\n  return 42')
    
    // Run code
    const runButton = screen.getByText('Run')
    await user.click(runButton)
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('All tests passed')).toBeInTheDocument()
    })
    
    // Submit
    const submitButton = screen.getByText('Submit')
    await user.click(submitButton)
    
    // Verify acceptance
    await waitFor(() => {
      expect(screen.getByText('Accepted')).toBeInTheDocument()
    })
  })
})
```

### Backend Testing

#### Runner Tests

```typescript
// Test code execution
describe('Local Runner', () => {
  it('executes Python code successfully', async () => {
    const result = await runCodeLocally({
      language: 'python3',
      code: 'print("hello")',
      stdin: '',
      timeoutMs: 5000
    })
    
    expect(result.status).toBe('success')
    expect(result.stdout).toBe('hello')
    expect(result.exitCode).toBe(0)
  })
  
  it('handles runtime errors', async () => {
    const result = await runCodeLocally({
      language: 'python3',
      code: 'raise ValueError("test error")',
      stdin: '',
      timeoutMs: 5000
    })
    
    expect(result.status).toBe('runtime_error')
    expect(result.stderr).toContain('ValueError: test error')
  })
  
  it('enforces timeout', async () => {
    const result = await runCodeLocally({
      language: 'python3',
      code: 'import time\nwhile True: time.sleep(1)',
      stdin: '',
      timeoutMs: 1000
    })
    
    expect(result.status).toBe('timeout')
  })
})
```

#### API Tests

```typescript
// Test API endpoints
describe('POST /api/run', () => {
  it('returns success for valid code', async () => {
    const response = await request(app)
      .post('/api/run')
      .send({
        language: 'python3',
        code: 'print("test")',
        stdin: '',
        timeoutMs: 5000
      })
    
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('success')
    expect(response.body.stdout).toBe('test')
  })
  
  it('validates request body', async () => {
    const response = await request(app)
      .post('/api/run')
      .send({ language: 'invalid' })
    
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Invalid language')
  })
})
```

### End-to-End Testing

#### Playwright Tests

```typescript
// E2E test for full user journey
test('user can solve a problem', async ({ page }) => {
  // Navigate to problems page
  await page.goto('/problems')
  
  // Search for problem
  await page.fill('[placeholder="Search problems"]', 'two sum')
  
  // Open problem
  await page.click('text=Two Sum')
  
  // Start problem
  await page.click('text=Start Problem')
  
  // Write solution
  await page.fill('.monaco-editor', `
    def solve():
        nums = [2, 7, 11, 15]
        target = 9
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    print(i, j)
                    return
  `)
  
  // Run code
  await page.click('text=Run')
  
  // Wait for success
  await page.waitForSelector('text=All tests passed')
  
  // Submit
  await page.click('text=Submit')
  
  // Verify acceptance
  await page.waitForSelector('text=Accepted')
})
```


## 14. Deployment Architecture

### Development Environment

```bash
# Local development setup
npm install
cp .env.example .env.local

# Edit .env.local with local config
VITE_API_BASE_URL=http://localhost:3001
VITE_COGNITO_USER_POOL_ID=local-pool-id
VITE_COGNITO_CLIENT_ID=local-client-id

# Start dev servers
npm run dev:full
# Runs both:
# - Backend: http://localhost:3001
# - Frontend: http://localhost:5173
```

### Staging Environment

```bash
# Deploy infrastructure
cd infra
npm ci
npx cdk deploy --all --profile staging

# Build and deploy frontend
npm run build
aws s3 sync dist/ s3://pebble-staging-frontend --delete
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"

# Deploy serverless API
vercel deploy --prod --env-file .env.staging
```

### Production Environment

#### Infrastructure Deployment

```bash
# Bootstrap CDK (one-time)
npx cdk bootstrap aws://ACCOUNT_ID/REGION

# Deploy all stacks
npx cdk deploy --all --profile production

# Outputs:
# - API Gateway URL
# - CloudFront Distribution URL
# - Cognito User Pool ID
# - Cognito Client ID
```

#### Frontend Deployment

```bash
# Automated deployment script
AWS_REGION=ap-south-1 \
AWS_PROFILE=production \
STACK_NAME=PebbleHostingStack \
bash infra/scripts/deploy-frontend.sh

# Script performs:
# 1. npm ci && npm run build
# 2. Resolve S3 bucket from stack outputs
# 3. aws s3 sync dist/ s3://bucket --delete
# 4. Create CloudFront invalidation
```

#### Environment Variables

**Frontend (Vite)**:
```bash
VITE_API_BASE_URL=https://api.pebblecode.app
VITE_COGNITO_USER_POOL_ID=ap-south-1_ABC123
VITE_COGNITO_CLIENT_ID=abc123def456
```

**Backend (Lambda)**:
```bash
AWS_REGION=ap-south-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
RUNNER_LAMBDA_NAME=pebble-runner-prod
PROFILES_TABLE_NAME=pebble-profiles-prod
AVATARS_BUCKET_NAME=pebble-avatars-prod
```

### CI/CD Pipeline

#### GitHub Actions Workflow

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build frontend
        run: npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
          VITE_COGNITO_USER_POOL_ID: ${{ secrets.COGNITO_POOL_ID }}
          VITE_COGNITO_CLIENT_ID: ${{ secrets.COGNITO_CLIENT_ID }}
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-south-1
      
      - name: Deploy to S3
        run: |
          aws s3 sync dist/ s3://pebble-frontend-prod --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
```

### Rollback Strategy

```bash
# Rollback frontend to previous version
aws s3 sync s3://pebble-frontend-prod-backup/v1.2.3/ \
  s3://pebble-frontend-prod/ --delete

aws cloudfront create-invalidation \
  --distribution-id E123 \
  --paths "/*"

# Rollback Lambda function
aws lambda update-function-code \
  --function-name pebble-runner-prod \
  --s3-bucket pebble-lambda-artifacts \
  --s3-key runner-v1.2.3.zip

# Rollback CDK stack
cd infra
git checkout v1.2.3
npx cdk deploy --all
```


## 15. Current Prototype Scope & Constraints

### Fully Implemented Features

The following features are production-ready in the current prototype:

✅ **Session IDE**
- Monaco editor with syntax highlighting
- Multi-language support (Python, JS, C++, Java, C, SQL)
- Run and submit workflows
- Test results visualization
- Code draft persistence per language

✅ **Code Execution**
- Local runner for all supported languages
- Remote Lambda runner with fallback
- Timeout enforcement and error handling
- Function-mode and stdio-mode support
- Diagnostic mapping with line numbers

✅ **AI Coaching**
- AWS Bedrock integration
- Context-aware prompting
- Tiered help system (Hint/Explain/Next Step)
- Safety layer and solution dumping prevention
- Struggle detection and adaptive nudging

✅ **Authentication**
- Cognito-backed signup/login
- Email verification
- Username system
- Profile management
- Token refresh

✅ **Analytics & Insights**
- Event collection and storage
- Recovery effectiveness calculation
- Autonomy rate tracking
- Issue profiling
- Skill radar
- Streak tracking
- Growth ledger

✅ **Multilingual Support**
- 13 language UI translations
- Problem content localization
- RTL layout for Urdu
- Language preference persistence

✅ **Problems Browser**
- 50+ curated problems
- Search and filtering
- Topic catalog
- Solved state tracking
- Problem preview

✅ **Infrastructure**
- AWS CDK stacks for all phases
- CloudFront + S3 hosting
- Lambda functions
- DynamoDB tables
- EventBridge event routing

### Partially Implemented / Config-Dependent

The following features exist in code but require AWS configuration to activate:

⚠️ **Premium Features**
- Weekly recap generation (requires Polly)
- Streak risk prediction (requires SageMaker endpoint)
- Cohort analytics (requires Athena setup)
- Live mental state updates (requires AppSync)

⚠️ **Community Features**
- UI fully implemented
- Backed by static seed data
- No live backend for posts/replies yet

⚠️ **Advanced Analytics**
- Local derivation works fully
- Cloud aggregation requires DynamoDB + Athena setup
- Cohort comparison requires multi-user data

### Known Constraints

**Problem Library**:
- 50+ problems currently (not 500+)
- Hidden test coverage varies by problem
- SQL problems use simulated checker (not real database)

**Runner Limitations**:
- Local runner requires language toolchains installed
- Remote runner requires Lambda deployment
- No support for languages beyond Python/JS/C++/Java/C

**Analytics**:
- Local-first means no cross-device sync without AWS setup
- Cohort analytics require multiple users
- Historical data limited to browser storage capacity

**Community**:
- Static seed data only
- No real-time updates
- No user-generated content persistence

**Scalability**:
- Local storage has ~5-10MB limit
- No database sharding implemented
- No CDN for API endpoints (only frontend)

### Production Readiness Checklist

To move from prototype to production:

**Infrastructure**:
- [ ] Deploy all CDK stacks to production AWS account
- [ ] Configure custom domain with Route53
- [ ] Set up SSL certificates with ACM
- [ ] Configure WAF rules for API protection
- [ ] Set up backup and disaster recovery

**Backend**:
- [ ] Implement rate limiting per user
- [ ] Add request validation middleware
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Implement health check endpoints

**Frontend**:
- [ ] Add service worker for offline support
- [ ] Implement error boundary components
- [ ] Add analytics tracking (Google Analytics, etc.)
- [ ] Optimize bundle size (code splitting)
- [ ] Add performance monitoring (Sentry, etc.)

**Content**:
- [ ] Expand problem library to 200+
- [ ] Add hidden tests for all problems
- [ ] Translate all problems to all languages
- [ ] Add video explanations for problems
- [ ] Create curriculum paths

**Features**:
- [ ] Implement live community backend
- [ ] Add real-time collaboration
- [ ] Build mobile-responsive PWA
- [ ] Add voice-based coaching
- [ ] Implement spaced repetition

**Testing**:
- [ ] Achieve 80%+ test coverage
- [ ] Set up E2E test suite
- [ ] Implement load testing
- [ ] Add security scanning
- [ ] Perform accessibility audit

**Operations**:
- [ ] Set up monitoring dashboards
- [ ] Configure alerting rules
- [ ] Document runbooks
- [ ] Train support team
- [ ] Create user documentation


## 16. Technology Choices & Rationale

### Frontend Stack

**React 19**
- Mature ecosystem with extensive library support
- Strong TypeScript integration
- Concurrent rendering for smooth UX
- Large talent pool for future hiring

**Vite**
- Fast HMR for rapid development
- Optimized production builds
- Native ESM support
- Better DX than Webpack

**Monaco Editor**
- Same engine as VS Code
- Excellent language support
- Customizable themes
- Familiar to developers

**Tailwind CSS**
- Utility-first approach speeds development
- Consistent design system
- Small production bundle with purging
- Easy to customize

### Backend Stack

**Express (Local Dev)**
- Simple and flexible
- Rich middleware ecosystem
- Easy debugging
- Fast iteration

**Serverless Functions (Production)**
- Auto-scaling without configuration
- Pay-per-use pricing
- Global edge deployment
- Reduced operational overhead

**AWS Bedrock**
- Managed LLM service (no model hosting)
- Multiple model options
- Built-in safety features
- Enterprise-grade reliability

**AWS Cognito**
- Managed authentication
- Built-in security features
- Scales automatically
- Integrates with other AWS services

### Data Layer

**localStorage (Primary)**
- Zero latency for reads
- Works offline
- No backend dependency
- Simple API

**DynamoDB (Optional)**
- Serverless and auto-scaling
- Single-digit millisecond latency
- Flexible schema
- Built-in streams for events

### Infrastructure

**AWS CDK**
- Infrastructure as code in TypeScript
- Type-safe configuration
- Reusable constructs
- Better than raw CloudFormation

**CloudFront + S3**
- Global CDN with edge caching
- Low cost for static hosting
- High availability
- Automatic HTTPS

### Alternative Approaches Considered

**Why not Next.js?**
- Vite provides faster dev experience
- Don't need SSR for this use case
- Simpler deployment model
- More control over build process

**Why not Firebase?**
- AWS provides more flexibility
- Better integration with Bedrock
- More cost-effective at scale
- Prefer infrastructure as code

**Why not PostgreSQL?**
- DynamoDB scales better for event data
- Serverless model fits use case
- Lower operational overhead
- Better for key-value access patterns

**Why not OpenAI API?**
- Bedrock provides model choice
- Better AWS integration
- Enterprise compliance features
- Avoid vendor lock-in

## 17. Future Architecture Evolution

### Short-Term Improvements (3-6 months)

**Backend Consolidation**
- Migrate all local Express routes to serverless
- Unify feature parity between dev and prod
- Implement API versioning
- Add GraphQL layer for complex queries

**Analytics Enhancement**
- Move from local-first to cloud-first
- Implement real-time aggregation
- Add cohort comparison features
- Build admin analytics dashboard

**Content Expansion**
- Grow problem library to 200+
- Add video explanations
- Create structured curriculum paths
- Implement spaced repetition

### Medium-Term Evolution (6-12 months)

**Mobile Experience**
- Build Progressive Web App
- Optimize for mobile screens
- Add offline mode
- Implement push notifications

**Collaboration Features**
- Real-time pair programming
- Code review system
- Mentor matching
- Study groups

**Advanced AI**
- Fine-tune models on PebbleCode data
- Add voice-based coaching
- Implement code generation with guardrails
- Build personalized learning paths

### Long-Term Vision (12+ months)

**Platform Expansion**
- Contest and competition modes
- Integration with job boards
- Corporate training packages
- University partnerships

**Ecosystem Development**
- Public API for third-party integrations
- Plugin system for custom problems
- White-label solutions
- Open-source community edition

**Global Scale**
- Multi-region deployment
- Language expansion beyond India
- Localized content for each market
- Regional compliance (GDPR, etc.)

## Conclusion

PebbleCode's technical architecture reflects a pragmatic approach to building a serious coding practice platform: local-first for reliability and speed, cloud-enhanced for premium features, and designed for graceful degradation when services are unavailable.

The dual backend model (local Express + serverless routes) allows rapid prototyping while maintaining a path to production scalability. The event-driven analytics pipeline provides rich insights without requiring complex backend infrastructure. The AWS CDK-based infrastructure demonstrates production-grade thinking while remaining flexible for future evolution.

Most importantly, the architecture directly supports the product vision: every technical decision—from context-aware AI prompting to local-first persistence to multi-language execution—serves the goal of helping users recover productively from failure and develop genuine problem-solving skills.

This is not a toy demo. It's a foundation for a platform that can scale to serve millions of learners while maintaining the calm, focused, recovery-oriented experience that makes PebbleCode unique.
