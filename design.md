# Pebble Code — Design Document

## 1. Executive Overview
Pebble Code is a recovery-first coding practice platform built around one core idea: the hardest part of learning to solve problems is not opening an editor, it is recovering productively after a wrong run, failed submission, or stalled attempt. The product combines a premium browser-based IDE, guided problem practice, runtime-aware mentor assistance, structured onboarding and placement, and an insights layer that turns raw activity into momentum, streak, and recovery signals.

The current repository implements a full frontend application with local-first persistence, a production-facing serverless API surface, a richer local Express development backend, a multi-language code runner, Cognito-based authentication, analytics/telemetry plumbing, and AWS infrastructure scaffolding for hosting, orchestration, observability, and premium recap features.

Pebble Code is materially beyond a static demo. It is also not yet a fully hardened production learning platform. Several subsystems are complete enough to demonstrate credibly, while some cloud-backed analytics and narration paths remain configuration-dependent or only fully available through the local backend and AWS stacks.

## 2. Product Vision
Pebble Code is designed to become a coding practice system that behaves more like a mentor-guided workspace than a plain problem bank or a generic AI chatbot.

The intended product direction visible in the codebase is:
- an editor-centric practice experience,
- immediate runtime clarity,
- context-aware coaching inside the solving session,
- recovery-oriented insights rather than vanity metrics,
- multilingual accessibility, and
- a premium, calm interface that reduces cognitive friction instead of adding noise.

The differentiator is not “AI for coding” in the abstract. It is the combination of judged execution, session context, structured help tiers, progress tracking, and reflective recap surfaces inside one coherent workflow.

## 3. Problem Being Solved
The implementation consistently targets a specific set of user problems:
- learners get stuck in the middle of solving, not just at the beginning;
- raw pass/fail feedback is often too shallow to support recovery;
- coding practice tools fragment discovery, solving, reflection, and progress tracking across separate surfaces;
- generic chat assistants do not reliably stay grounded in the exact problem, code state, or failing testcase;
- users struggle to maintain momentum because they lack an interpretable feedback loop across days and sessions;
- language and localization barriers reduce accessibility for many learners.

Pebble Code addresses this by keeping the user in a single environment where they can discover problems, code, run, submit, ask for help, inspect failures, review submissions, and then see growth-oriented analytics afterward.

## 4. Target Users
The current product surface is best suited for:
- beginner and intermediate coding-practice users,
- placement-prep users who want structured warm-up and coding evaluation,
- users who need guided recovery rather than full solution dumping,
- learners who benefit from multilingual UI and mentor narration,
- users who want a calmer, more premium alternative to spreadsheet-like problem lists and generic IDE shells.

The repo also contains admin and operations surfaces, indicating a second-order audience of maintainers and judges/operators who need insight into runtime and system health.

## 5. Core User Experience
### 5.1 Landing and entry
Users land on a premium marketing/home page that explains the product through a staged product preview, daily plan surfaces, and feature modules. This page is not a static hero only; it already exposes core concepts such as runtime feedback, coach guidance, daily plan generation, and weekly recap.

### 5.2 Onboarding and learning-track setup
Users select a current level and language focus through a two-step onboarding flow. The chosen learning track is stored locally and reused to set defaults for later session/editor language behavior.

### 5.3 Placement
The placement flow combines MCQ and coding questions. It estimates a placement outcome and can advance the user into a suggested unit. The experience already includes skip tracking and coding evaluation, so it functions as a real placement prototype rather than a static questionnaire.

### 5.4 Problem discovery
The Problems Browser provides topic filtering, search, sorting, solved-state visibility, curated topic intelligence, and entry into a session. It behaves more like a polished discovery surface than a flat table.

### 5.5 Coding session
The Session page is the core product. It presents:
- an editorial problem panel,
- a central editor with run/submit controls,
- testcase and diagnostic output,
- a Pebble mentor rail,
- solutions and submissions tabs,
- timer, units drawer, and session utilities.

This is where Pebble’s product thesis is most visible: failure, coaching, and recovery are designed as part of the session, not as separate help pages.

### 5.6 Review and insights
The Dashboard/Insights surface derives recovery and momentum metrics from user activity, renders streaks, issue bars, trend charts, growth summaries, and weekly recap playback/script generation. The analytics layer is local-first in the current prototype, with optional cohort/cloud integrations scaffolded alongside it.

### 5.7 Identity and profile management
Authentication, profile editing, username checks, avatar upload, settings, notifications, and admin-facing surfaces are already integrated into the app shell.

## 6. Product Surface / Page-Level Design
The application currently exposes these primary user-facing pages:

### Landing (`/`)
Premium product homepage with hero, product mock, daily plan, continuation prompts, recommended next step, and feature showcase.

### Onboarding (`/onboarding`)
Learning-track setup for level and language focus.

### Placement (`/placement`)
Mixed MCQ and coding evaluation surface that determines starting level/path direction.

### Problems (`/problems`)
Problem discovery surface with search, filters, topic catalog, solved tracking, and curated browsing.

### Session (`/session/:sessionId`)
Main practice workspace with editor, run/submit, mentor help, testcases, solutions, submissions, units, and timer.

### Dashboard (`/dashboard`)
Insight and recap surface with recovery-oriented metrics, streak views, issue clusters, recommendations, and weekly recap playback.

### Profile (`/profile`)
User profile, avatar upload, username management, language/theme preferences, and local data reset.

### Ops (`/ops`)
Admin-only operational dashboard for metrics and health signals.

### Auth pages
Separate pages exist for login, signup, verification, forgot password, and post-signup confirmation.

## 7. Design Principles
The design system in code consistently points to the following principles:

### Calm, premium surfaces
The app uses layered shells, muted but readable text, restrained blue accents, and controlled borders to keep cognitive load low.

### Editor-first hierarchy
The center of gravity is the session workspace, especially the editor and execution feedback loop.

### Recovery over punishment
The product does not stop at “wrong answer” or “runtime error.” It attempts to explain failure, preserve context, and guide the next move.

### Grounded assistance
The mentor rail is structured around the current problem, language, code, failing state, and help tier.

### Structured autonomy
Users can ask for hints, explanations, next steps, and tiered help without the UI collapsing into passive answer delivery.

### Inclusive language support
The app is localized across multiple Indian languages plus English and includes RTL-aware support where relevant.

### Productized analytics
Insights are framed as momentum, recovery, streak risk, and next action, not just raw event logs.

## 8. System Architecture
## 8.1 Frontend stack
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Monaco editor
- shadcn-style UI composition
- React Router
- local browser storage for substantial portions of user state in prototype mode

The frontend is the primary product layer and already contains significant derived logic: analytics rollups, problem localization, session orchestration, solved/submission state, weekly recap summarization inputs, and profile/session preferences.

## 8.2 API and backend topology
There are two backend shapes in the repo:

### Production/serverless API (`api/`)
This includes handlers for:
- auth login/signup/confirm/resend,
- telemetry ingestion,
- code execution (`/api/run`),
- Bedrock-backed Pebble coaching (`/api/pebble`),
- username availability,
- health endpoints,
- profile-related shared helpers.

### Local development backend (`server/dev-server.ts`)
The local backend is materially richer than the current serverless surface. It exposes:
- `/api/pebble-agent`,
- `/api/analytics/cohort`,
- weekly recap generation/fetch/audio endpoints,
- local runner orchestration,
- observability hooks,
- additional fallback and mock behavior for development.

This distinction matters: some advanced flows are fully wired for local/demo use but only partially mirrored into production serverless routes.

## 8.3 Execution runtime
Pebble includes a local runner and a serverless-compatible execution API.

Supported judged languages in the shared registry are:
- Python
- JavaScript
- C++17
- Java 17
- C

The session layer also includes SQL as a session/problem mode, handled separately from the core local language runner.

The run API normalizes requests and responses, supports remote or local execution modes, and maps diagnostics into user-facing statuses such as compile error, runtime error, timeout, validation error, and toolchain unavailable.

## 8.4 Data and persistence
The current prototype is hybrid in its persistence model.

### Local-first browser state
Substantial user/product state is stored in browser storage, including:
- learning track,
- editor language preference,
- solved state,
- submissions,
- daily plans,
- analytics events,
- unit progress,
- some recap/voice preferences.

This enables a full demo loop without requiring every backend subsystem to be live.

### Cloud-backed persistence (optional/config-dependent)
The repo includes production-oriented integrations and infrastructure for:
- Cognito,
- DynamoDB,
- S3,
- Athena,
- EventBridge,
- Lambda,
- AppSync-style mental-state publishing,
- Polly,
- SageMaker runtime.

These are not all required for local/demo operation, but the architecture clearly anticipates them.

## 8.5 Infrastructure
The `infra/` directory contains AWS CDK stacks for:
- hosting and CloudFront/S3 delivery,
- CI/CD pipeline,
- analytics phases,
- journeys,
- files,
- observability,
- premium/phase 9 features.

The infrastructure story is therefore more mature than a frontend-only hackathon demo, even where some app-layer integrations remain partial.

## 9. AI / Coaching Design
Pebble’s coaching architecture has two visible layers.

### 9.1 Production-safe baseline coaching
The current serverless `api/pebble` route uses AWS Bedrock with a structured system prompt and prompt rules. It receives problem/session context, user code, run outcomes, and help-tier information, then returns grounded mentor text.

### 9.2 Richer agent path in local backend
The frontend first attempts `/api/pebble-agent`, which expects a more structured response including reasoning brief, hints, patch suggestions, and safety flags. That richer endpoint exists in the local Express backend but not as a matching serverless route in the current `api/` folder. The frontend therefore gracefully falls back to `/api/pebble` when the richer route is unavailable.

### 9.3 Coaching experience in the session UI
The mentor panel is not a plain chat window. The codebase supports:
- quick actions,
- tiered help,
- struggle-aware nudges,
- context from failing testcases and run summaries,
- grounding in current language and code,
- structured mentor suggestions rather than only freeform conversation.

### 9.4 Guardrails and safety
The local backend applies safety enforcement and redaction around Pebble responses. The prompt layer also includes rule-based shaping of acceptable assistance. This is more mature than a raw prompt call, though not yet a full policy platform.

## 10. Execution / Runtime Design
The execution model intentionally separates “run” from “submit.”

### Run
Run is for iterative feedback. It captures stdout/stderr, testcase outcomes, diagnostics, and runtime metadata.

### Submit
Submit is for judged acceptance. Accepted submissions contribute to solved state, streak/momentum metrics, and submission history.

### Runtime characteristics visible in code
- local or remote runner selection,
- normalized request validation,
- timeouts,
- output truncation and response normalization,
- compile/runtime/internal/toolchain states,
- code-to-line diagnostic mapping,
- per-language boilerplate and function-mode helpers.

This design supports a believable practice platform rather than a one-shot “execute code” demo.

## 11. Analytics / Insights Design
Pebble’s insights layer is one of the strongest implemented differentiators.

### 11.1 Event collection
The frontend records structured events for:
- runs,
- submits,
- assist interactions,
- placement skips,
- solves and streak-related progress.

### 11.2 Local derivation
A significant portion of dashboard intelligence is computed locally from these events. The repo includes derivation logic for:
- streaks,
- pass rate trends,
- recovery time,
- guidance reliance,
- issue clustering,
- growth radar,
- next recommended actions,
- daily completion maps,
- weekly recap inputs.

### 11.3 Telemetry pipeline
There is also a telemetry client with a serverless endpoint that can no-op or forward to an ingest Lambda depending on environment configuration. This lets the app degrade safely if telemetry infrastructure is absent.

### 11.4 Cohort and premium analytics
The dashboard fetches cohort analytics and the server dev backend exposes `/api/analytics/cohort`, but this is not fully mirrored as a serverless production route in the current repo. It should therefore be treated as optional or partially wired.

### 11.5 Weekly recap
The weekly recap widget is implemented in the frontend and backed in the local dev server by recap-building, speech, and storage flows. The premium narration path clearly exists in the architecture, but parts of it remain deployment/config dependent.

## 12. Authentication / Identity / Profiles
Authentication is Cognito-oriented and already integrated across the app shell.

Implemented identity capabilities include:
- signup,
- login by email or username,
- confirmation-code verification,
- resend confirmation code,
- forgot-password flow on the client,
- token/session persistence,
- profile fetch/update,
- username availability checks,
- avatar upload via signed upload flow,
- admin gating for ops surfaces.

The current auth system is credible and functional, but it still depends on correct environment configuration and deployed auth routes for full production parity.

## 13. Internationalization, Accessibility, and Theming
## 13.1 Internationalization
The repo contains a substantial localization system with problem copy, UI strings, and recap language mapping across multiple languages. The language layer is not a placeholder; it is deeply threaded through the UI, recap, and content systems.

## 13.2 RTL and script handling
The presence of Urdu and broader language support indicates deliberate script-direction handling considerations. The repo also includes checks around mixed-language issues in localization content.

## 13.3 Theme system
Pebble supports polished dark and light themes across landing, app shell, session, problems, insights, settings, and notifications. Theme persistence is integrated into profile/settings surfaces.

## 13.4 Accessibility posture
The app uses semantic buttons, focus states, segmented controls, popovers, and modal/dialog patterns consistently. Accessibility is not fully documented as a compliance target in the repo, but the UI system shows deliberate keyboard and focus-visible treatment.

## 14. Technical Tradeoffs
Pebble makes several pragmatic tradeoffs that are appropriate for a hackathon-grade but serious product build.

### Local-first persistence vs full backend dependence
A large portion of progress, analytics, and plan state lives locally. This improves demo reliability and keeps the product usable without requiring every cloud dependency to be live.

### Dual backend model
The richer local Express server moves faster for prototyping advanced flows, while the serverless `api/` surface supports deployable production-like endpoints. The downside is feature skew: some capabilities exist locally before they are mirrored into deployed routes.

### Bedrock-backed coaching with fallback paths
The app prefers structured, context-aware coaching but degrades gracefully when richer endpoints are unavailable.

### Premium infrastructure scaffolding ahead of full integration
The AWS stacks indicate serious architecture intent. At the same time, not every infra capability is fully surfaced end-to-end in the deployed product.

### Rich frontend derivation
By deriving insights client-side, Pebble gains responsiveness and demo portability, but some analytics are inherently more prototype-like until cloud rollups become the primary source of truth.

## 15. Current Limitations
The codebase is strong, but several limits should be described honestly.

- Some advanced API paths exist only in the local Express backend and are not yet mirrored as production serverless routes.
- Several cloud-backed capabilities are environment-dependent; without proper AWS configuration, the app falls back to local/demo behavior.
- Analytics are partly local-first, which is useful for demo reliability but not yet a full multi-device source of truth.
- The runner and coaching systems support a credible core language set, but breadth and hidden-test rigor are not yet equivalent to a production-scale judge platform.
- Some report and cohort analytics paths are scaffolded or mocked rather than fully end-to-end in production deployment.
- The repository still contains generated/build-oriented infrastructure artifacts that would typically be kept slimmer in a hardened production repo.

These are not disqualifying weaknesses; they are the natural boundaries of a serious prototype that already includes production-oriented architecture.

## 16. Future Evolution
The repository already points toward plausible next steps:
- fully mirror local advanced endpoints into deployable serverless APIs,
- move more analytics and recap persistence from local-first derivation to cloud-backed aggregation,
- harden the coaching agent path and structured response schema in production,
- expand judged content and hidden-test coverage,
- deepen observability and ops tooling,
- mature premium narration and multilingual coaching into a consistent production feature set,
- unify local/demo and deployed backend capabilities to reduce feature skew.

The current codebase is therefore best understood as a strong integrated prototype with real architecture, not a static mock and not yet a fully finished production platform.
