# Pebble End-to-End Audit (React + Vite + Serverless `/api`)

## Scope
This audit covers the current mascot ask flow from UI to Bedrock and back, including cancellation, retry, memory, safety, and token-cost controls.

## Architecture Summary
- Frontend: React + Vite + `react-router-dom`.
- API layer: serverless-style `api/pebble.ts`.
- LLM path (safe mode default): browser calls `POST /api/pebble`, server calls AWS Bedrock Anthropic model.
- Optional local demo mode (`unsafe_client`) remains client-side and uses the same shared system prompt text.

## UI Flow (Input to Answer)
1. User enters text in mascot panel (`PebbleMascot.tsx`) and clicks `Ask Pebble` or presses Enter.
2. `onAskPebble()` validates input and calls `submitQuestion(question, { appendUserTurn: true })`.
3. `submitQuestion()`:
   - increments request id (`askRequestIdRef`) and aborts any previous in-flight request.
   - creates a fresh `AbortController` and stores it in `activeAbortRef`.
   - transitions UI to `thinking`, resets answer display state.
   - updates memory window (last 6 turns max).
   - builds compact prompt (`buildPebblePrompt`) with question, compact memory lines, and essential state snapshot.
   - calls `askPebble({ prompt, context, signal })`.
4. `askPebble()` (client util):
   - default mode calls `/api/pebble` with JSON body `{ prompt, context }` and abort bridging.
   - reads `{ text }` on success or surfaces server `{ error }`.
5. `api/pebble.ts`:
   - validates method/body/context.
   - compacts context deterministically (`compactContextForModel`).
   - builds Bedrock user message from prompt + compact context + constraints.
   - invokes Bedrock Anthropic via `InvokeModel` with `system` field.
   - parses response content text and returns `{ text }`.
6. Frontend receives answer:
   - request-id guard blocks stale/late updates.
   - answer is typewriter-rendered (`typing` state).
   - on completion, assistant turn is appended to memory with metadata and celebration pulse triggers.

## Cancellation & Concurrency
- Stop path:
  - UI `Stop` invalidates request id, aborts active fetch, clears typing timers, resets answer UI state, returns to `idle`.
- Request-id guard:
  - even if network returns after cancel, stale responses are ignored.
- Single-flight:
  - new submits abort prior in-flight request before creating a new controller.
- Unmount safety:
  - component cleanup aborts active request and clears timers/RAF settle loop.

## Retry Behavior
- Retry appears only for “error-ish” assistant messages.
- `Retry` reuses `lastAskedQuestion` and calls submit with `appendUserTurn: false`.
- This avoids duplicate user-memory turns.
- Assistant turn is still appended only when typewriter completes.

## Error Handling
- Server responses:
  - success: `200 { text: string }`
  - timeout: `504 { error: 'Pebble request timed out.' }`
  - user stop (abort not caused by timeout): `200 { text: 'Stopped.' }`
  - other failures: `502 { error: string }`
- Client handling:
  - preserves user-friendly timeout/temporary error messages.
  - “Stopped.” is treated as a normal short answer path and does not crash UI flow.

## Security Review
- No AWS secrets are used in browser safe mode.
- Bedrock call is server-only (`api/pebble.ts`) using `process.env`.
- API contract remains unchanged.
- `.env.local` is ignored by git; secrets should be stored in deployment env settings.
- Credential strategy:
  - server accepts explicit `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` if both are provided.
  - otherwise falls back to AWS default credential provider chain.
- Logging safety:
  - optional cost debug (`PEBBLE_DEBUG_COST=1`) logs only character counts and token estimate, never prompt content or secrets.

## Performance & Runtime
- UI:
  - timers/intervals are cleaned correctly.
  - drag settle uses RAF and cancels on pointer down.
  - request-id gating prevents late-state churn.
- API:
  - timeout enforced at 20s with abort.
  - response parsing guarded for malformed payload shapes.
- Concurrency:
  - one active request per mascot instance.

## Token/Cost Drivers and Optimizations
Primary cost drivers before tuning:
- pretty-printed context JSON,
- duplicated context text,
- oversized code/run messages.

Current optimizations:
- Shared system prompt rules in `src/shared/pebblePromptRules.ts` prevents drift.
- Compact prompt composition in UI (reduced labels/blank lines).
- Server-side context compaction:
  - keeps essential fields only,
  - trims `runMessage` to 360 chars,
  - trims `codeText` to 1800 chars with middle marker,
  - limits `errorHistory` to last 3.
- Server builds compact user message and avoids pretty JSON indentation.
- Bedrock generation tuned for short answers:
  - `max_tokens: 240` (aligned to <= 6 lines),
  - `temperature: 0.35` (lower variance, more deterministic guidance).

Why `max_tokens: 240`:
- 6 terse lines generally fit well under this limit while allowing occasional clarifying question or concise steps.
- Lower than 300 reduces worst-case output spend with minimal quality loss for this UX.

## Edge Cases
- Rapid Enter/Ask spam while generating: blocked by `isGenerating` guard.
- Stop during slow network: abort propagates; stale response blocked by request id.
- Route change/unmount mid-request: abort + cleanup prevents leaks.
- Bedrock malformed JSON/content mismatch: returns safe 502 with useful error.
- Large `codeText`: trimmed before model message construction.
- Memory growth: capped to last 6 turns.

## Prompt Personality Tuning (Implemented)
- Shared persona source of truth (`src/shared/pebblePromptRules.ts`):
  - calm, terse, action-first.
  - strict clarifying-question rule under high struggle.
  - guided mode scoping.
  - success reinforcement + one micro next step.
  - 6-line response cap and no fluff.
- Thinking personality in UI remains unchanged visually (`Thinking...`).
- Model formatting tuned toward minimal cognitive load and concise actionability.

## Environment Variables (Server)
Required:
- `AWS_REGION`
- `BEDROCK_MODEL_ID`

Optional:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
  - Provide both together, or neither.
- `PEBBLE_DEBUG_COST=1` (server-only prompt size telemetry)

## How to Test
1. Install and run:
   - `npm install`
   - `npm run dev`
2. Open session UI:
   - Navigate to `/session/1`
3. Ask flow:
   - Expand mascot, ask a coding question.
   - Expect `Thinking...` -> `Typing...` -> final answer.
4. Drag settle check:
   - Drag mascot upward and release.
   - Expect fall + subtle bounce to bottom, draggable mid-animation.
5. Stop check:
   - Ask, then press `Stop` while thinking/typing.
   - Expect prompt stop, no late overwrite, return to idle.
6. Retry check:
   - Force server/model error (e.g., invalid `BEDROCK_MODEL_ID`), ask once.
   - Expect error-ish answer + `Retry` button.
   - Press retry; verify no duplicate user memory turn.
7. Build check:
   - `npm run build`
   - Expect TypeScript + Vite build success.

## Vercel Deployment Notes
- Runtime: Node serverless function for `/api/pebble`.
- Set env vars in Vercel project settings (do not use `VITE_` prefix for secrets).
- Keep client bundle secret-free; all Bedrock auth remains server-side.
