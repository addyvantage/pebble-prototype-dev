# Pebble Code — Requirements Document

## 1. Problem Statement
Learners practicing coding problems often fail not because they never start, but because they cannot recover efficiently after a wrong run, failed submission, or confusing diagnostic. Existing practice tools typically separate discovery, solving, help, and reflection into different surfaces, while generic AI chat does not stay grounded in the exact code, testcase, and session state.

Pebble Code addresses this by combining problem discovery, a browser IDE, judged execution, mentor-style assistance, structured learning flows, and growth analytics in one continuous workspace.

## 2. Objective
Pebble Code must provide a coherent coding-practice experience that helps users:
- discover appropriate problems,
- start from a sensible language/level path,
- code and execute solutions in-browser,
- recover faster from failures with context-aware guidance,
- track progress and momentum over time,
- access the product in a premium, multilingual, dark/light-themed interface.

## 3. Product Scope
### In current scope
- landing and onboarding,
- placement flow,
- problem discovery and filtering,
- session-based coding workspace,
- run and submit flows,
- mentor guidance inside the session,
- local-first analytics and insights,
- weekly recap UI and generation/playback hooks,
- Cognito-oriented auth and profile management,
- settings, notifications, and admin/ops surfaces,
- deployable frontend plus serverless/local backend support.

### Out of current core scope
- production-scale content operations,
- full multi-device canonical analytics storage,
- fully hardened enterprise-grade moderation/compliance,
- broad production-scale judge infrastructure across many runtimes.

## 4. Users / Personas
### U1. Learner preparing through guided practice
Needs problems, clean runtime feedback, and calm help when stuck.

### U2. Placement-oriented candidate
Needs onboarding, calibration, structured practice, and measurable progress.

### U3. Multilingual learner
Needs product and mentor support in a preferred language without losing coding accuracy.

### U4. Maintainer / operator
Needs visibility into auth, runtime, analytics, and system health through ops surfaces.

## 5. Primary Use Cases
- discover a problem by topic, difficulty, or recommendation,
- start a coding session in a preferred language,
- run code and inspect testcase feedback,
- submit a solution and record acceptance/failure,
- request progressively stronger mentor guidance,
- review solutions and past submissions,
- continue from prior work or follow a daily plan,
- view streak, recovery, and weekly recap insights,
- manage identity, profile, language, and theme settings,
- monitor operational metrics in admin mode.

## 6. Functional Requirements
## 6.1 Authentication and Identity
- **FR-1** The system shall allow users to sign up with email, username, and password.
- **FR-2** The system shall support login by email or username.
- **FR-3** The system shall support account verification via confirmation code.
- **FR-4** The system shall support resending verification codes.
- **FR-5** The system shall support forgot-password initiation and reset flows.
- **FR-6** The system shall persist authenticated sessions and restore them on reload.
- **FR-7** The system shall expose profile editing for display name, bio, language, theme, and avatar upload.
- **FR-8** The system shall support username availability checks and enforce cooldown-aware updates where configured.
- **FR-9** The system shall expose admin-only ops content only to authorized users.

## 6.2 Onboarding and Track Setup
- **FR-10** The system shall collect a user’s current level and language focus during onboarding.
- **FR-11** The system shall persist the selected learning track locally.
- **FR-12** The selected track shall influence default editor/session language choices.

## 6.3 Placement
- **FR-13** The system shall provide a placement flow combining question types including coding evaluation.
- **FR-14** The placement flow shall compute a placement outcome based on user responses.
- **FR-15** The system shall allow users to skip placement questions while tracking those skips for analytics.
- **FR-16** The system shall allow the resulting placement to start or recommend a next unit/path.

## 6.4 Problems Browser
- **FR-17** The system shall list available problems with search, sorting, and topic filtering.
- **FR-18** The system shall show solved-state information for problems.
- **FR-19** The system shall allow users to open a selected problem in a coding session.
- **FR-20** The problems surface shall support curated/topic-intelligence browsing cues.

## 6.5 Coding Session / IDE
- **FR-21** The system shall provide a browser-based coding session with a central editor and a problem panel.
- **FR-22** The system shall support language switching across the supported coding languages.
- **FR-23** The session shall support both run and submit actions.
- **FR-24** The session shall display testcase outcomes, runtime diagnostics, and output summaries.
- **FR-25** The system shall preserve drafts and relevant session preferences per user/device where implemented.
- **FR-26** The session shall expose solutions and submissions views alongside the problem description.
- **FR-27** The session shall provide timer, unit navigation, and report/export/share utilities where currently surfaced.

## 6.6 Code Execution
- **FR-28** The system shall validate run requests before execution.
- **FR-29** The system shall support judged execution for Python, JavaScript, C++, Java, and C.
- **FR-30** The system shall normalize compile, runtime, timeout, validation, and toolchain-unavailable outcomes.
- **FR-31** The system shall distinguish between iterative run behavior and judged submit behavior.
- **FR-32** The system shall map diagnostics back into user-facing line/context information where possible.
- **FR-33** The system shall support local execution fallback when remote/cloud runner execution is unavailable.

## 6.7 AI Mentor / Coaching
- **FR-34** The system shall allow users to request context-aware mentor help from inside the session.
- **FR-35** Mentor requests shall include relevant context such as current code, problem, run state, and help tier.
- **FR-36** The mentor surface shall expose tiered help or progressive guidance actions.
- **FR-37** The system shall support a richer structured agent response when available and degrade gracefully to baseline coaching when not.
- **FR-38** The system shall surface mentor responses without requiring users to leave the session workspace.
- **FR-39** The system shall support struggle-aware nudges or recovery prompts where the current session state indicates friction.

## 6.8 Analytics and Insights
- **FR-40** The system shall record structured practice events including runs, submits, and assist interactions.
- **FR-41** The system shall derive user-facing metrics such as streak, recovery time, guidance reliance, and trend indicators.
- **FR-42** The dashboard shall render charts or summaries for recent momentum and issue patterns.
- **FR-43** The system shall generate or retrieve a weekly mentor recap script for the last 7 days.
- **FR-44** When available, the system shall play recap audio using the best available provider while hiding infrastructure details from the user.
- **FR-45** The system may request cohort analytics or advanced metrics when the backend route is available.

## 6.9 Notifications and Settings
- **FR-46** The app shell shall provide a notification center with categorized notifications.
- **FR-47** The app shell shall provide a settings surface for language, theme, and local data reset.
- **FR-48** Theme and language choices shall persist across sessions where supported.

## 6.10 Internationalization and Theming
- **FR-49** The system shall support multiple UI languages and localized content where provided.
- **FR-50** The system shall support polished dark and light themes across primary surfaces.
- **FR-51** The session, recap, and content systems shall respect the active language configuration where wired.

## 6.11 Operations and Administration
- **FR-52** The system shall expose an ops dashboard for authorized users.
- **FR-53** The ops surface shall poll and display backend/system metrics when configured.
- **FR-54** The system shall emit telemetry in a way that can degrade safely if the ingest backend is unavailable.

## 7. Non-Functional Requirements
- **NFR-1** The application shall be usable as a responsive SPA on desktop-first layouts and remain functional on narrower widths.
- **NFR-2** The UI shall maintain a premium, low-noise visual hierarchy in both dark and light mode.
- **NFR-3** The system shall fail gracefully when optional cloud services are not configured.
- **NFR-4** The codebase shall remain TypeScript-typed across frontend and serverless/backend layers.
- **NFR-5** The app shall support local/demo operation using browser persistence and local backend fallbacks.
- **NFR-6** Execution and mentor flows shall expose meaningful user-facing errors rather than silent failure where possible.
- **NFR-7** Telemetry and analytics collection shall avoid breaking the core user workflow if an endpoint is unavailable.
- **NFR-8** The system shall remain extensible for additional languages, analytics rollups, and premium coaching modes.
- **NFR-9** The application shall support secure deployment patterns compatible with AWS hosting, Cognito, and serverless APIs.
- **NFR-10** Controls, tabs, chips, dropdowns, and floating panels shall behave consistently across the design system.

## 8. Constraints
- The current product is a serious prototype with both local-first and cloud-backed paths; these are not fully unified yet.
- Some advanced capabilities are implemented only in the local Express backend and not yet mirrored into production serverless routes.
- Several features require environment variables and deployed AWS resources to operate fully.
- Analytics truth is partly local to the device/browser in the current implementation.
- The supported runtime language set is finite and explicitly managed.
- The codebase prioritizes demo reliability and product breadth over complete production hardening.

## 9. Assumptions
- Users are primarily desktop or laptop users during coding sessions.
- The main learning value comes from runtime-aware recovery, not only from final acceptance.
- A significant portion of prototype evaluation may happen without full cloud infrastructure availability.
- The preferred language, theme, and selected track should persist locally even if backend persistence is limited.
- Judges and mentors will evaluate both product polish and architecture credibility.

## 10. Acceptance Criteria
## 10.1 Auth and profile
- A user can sign up, verify, and log in when auth configuration is present.
- The signup/login UI exposes validation and useful runtime errors.
- Profile settings can be loaded and updated without breaking the app shell.

## 10.2 Onboarding and placement
- A user can select level and language focus and proceed.
- Placement can accept answers, evaluate them, and produce a starting recommendation.

## 10.3 Problems browser
- A user can search, filter, sort, and open problems.
- Solved-state and metadata remain visible and readable in both themes.

## 10.4 Session workspace
- A user can open a problem, edit code, run it, inspect testcase output, and submit.
- The session UI keeps problem context, execution feedback, and mentor help visible together.
- Solutions and submissions tabs are accessible and consistent with the current language/session state.

## 10.5 Runner
- Run requests return normalized statuses.
- Toolchain failures degrade cleanly rather than crashing the UI.
- The local/dev path remains usable if remote execution is absent.

## 10.6 Mentor
- The mentor panel accepts a request and returns grounded feedback when a backend is available.
- If the richer agent endpoint is missing, the frontend falls back to the baseline coaching route.
- Help-tier and session context continue to influence the response path.

## 10.7 Insights and recap
- The dashboard renders derived metrics from available analytics events.
- Weekly recap generation/playback surfaces meaningful ready, loading, and error states.
- Missing optional analytics endpoints do not break the rest of the dashboard.

## 10.8 Settings and notifications
- Notification center and settings modal remain functional and readable in both themes.
- Language/theme updates propagate through the intended state paths.

## 11. MVP vs Extended Scope
### Current MVP / core prototype scope
- premium landing and app shell,
- onboarding and placement,
- problem discovery,
- session IDE with run/submit,
- mentor assistance,
- local-first analytics dashboard,
- Cognito-oriented auth,
- profile/settings/notifications,
- deployable frontend and serverless core APIs.

### Extended or partially implemented scope
- structured agent responses through `/api/pebble-agent` in production,
- cohort analytics production route parity,
- fully cloud-backed weekly recap persistence and playback everywhere,
- deeper observability and multi-service orchestration from AWS phase stacks,
- broader content/hidden-test depth.

## 12. Risks and Open Issues
- Local and production backend capability skew can create environment-specific behavior differences.
- Cloud-backed features may appear unavailable if required AWS configuration is missing.
- Some analytics views depend on locally accumulated events, which limits cross-device continuity.
- Weekly recap and premium narration flows are credible but partly configuration-dependent.
- Problem quality and coverage scale are constrained by the current curated bank and solutions inventory.
- The project already contains significant scope; continuing to add surfaces without unifying backend parity could increase maintenance complexity.

## 13. Feature Status Summary
### Implemented
- landing page and product marketing surface,
- onboarding track selection,
- placement flow,
- problems browser,
- session IDE and execution loop,
- per-language solutions and submissions views,
- mentor panel with baseline fallback,
- local-first analytics dashboard,
- auth/profile/settings/notifications,
- ops/admin surface,
- local and serverless run/telemetry/auth baselines.

### Partial / scaffolded / configuration-dependent
- richer production agent endpoint parity,
- cohort analytics in deployed serverless form,
- full premium recap cloud path in every environment,
- some observability and AWS analytics integrations,
- complete production-grade report/rollup pipelines.

### Planned or clearly extensible
- deeper cloud-backed analytics,
- fuller premium narration/voice path,
- more complete runner/content expansion,
- tighter parity between dev-server richness and serverless deployment.
