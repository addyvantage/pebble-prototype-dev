# Pebble Prototype

Pebble is a calm, behavior-aware AI learning companion for developers.
This repo is a React + Vite frontend with:

- Local Express dev API (`server/dev-server.ts`)
- Vercel API routes (`/api/*`)
- Unified code runner endpoint: `POST /api/run`

## Local setup

### Prerequisites

- Node.js (includes `node` and `npm`)
- `python3`
- `g++`
- JDK 17+ (`javac` and `java`)

### Install and run full stack

```bash
npm install
npm run dev:full
```

Open `http://localhost:5173/session/1`.

Vite proxies `/api/*` to `http://localhost:3001` in local dev.

## How curriculum works

- Curriculum content lives in `src/content/paths/{python,javascript,cpp,java}.json`.
- Each path contains ordered units with:
  - `id`, `title`, `concept`, `prompt`
  - `starterCode`
  - `tests` (`input` + `expected`)
  - `hints`
- The session page loads the selected language path and renders:
  - left: unit list with progress
  - center: Monaco editor + run tests + output
  - right: Pebble chat panel with quick actions
- When you click Run tests, Pebble executes each test via `/api/run` and summarizes failures for coaching context.
- User learning state is stored in localStorage key `pebbleUserState`:
  - selected language and level
  - current unit id
  - completed unit ids
  - recent chat summary

## Unified run endpoint

`POST /api/run`

Request body:

```json
{
  "language": "python",
  "code": "print(2+2)",
  "stdin": "",
  "timeoutMs": 4000
}
```

Supported `language` values:

- `python`
- `javascript`
- `cpp`
- `java`

Response shape (always):

```json
{
  "ok": true,
  "exitCode": 0,
  "stdout": "4\n",
  "stderr": "",
  "timedOut": false,
  "durationMs": 12
}
```

Execution limits:

- default timeout: `4000ms`
- max timeout: `6000ms`
- code size limit: `50000` chars
- stdout/stderr truncation: `16000` chars each
- per-run temp dir: `.pebble_tmp/<runId>` (auto-cleaned)

## Local runner mode

Local backend mode is controlled by:

- `PEBBLE_RUNNER_MODE=local` (default)
- `PEBBLE_RUNNER_MODE=remote`

Remote mode requires:

- `AWS_REGION`
- `RUNNER_LAMBDA_NAME`
- Optional static creds: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`

Example:

```bash
PEBBLE_RUNNER_MODE=remote npm run dev:backend
```

## Smoke tests (local)

```bash
curl -sS -X POST http://localhost:5173/api/run \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(2+2)","stdin":"","timeoutMs":4000}'

curl -sS -X POST http://localhost:5173/api/run \
  -H "Content-Type: application/json" \
  -d '{"language":"javascript","code":"console.log(2+2)","stdin":"","timeoutMs":4000}'

curl -sS -X POST http://localhost:5173/api/run \
  -H "Content-Type: application/json" \
  -d '{"language":"cpp","code":"#include <iostream>\nint main(){std::cout<<(2+2)<<std::endl;return 0;}","stdin":"","timeoutMs":4000}'

curl -sS -X POST http://localhost:5173/api/run \
  -H "Content-Type: application/json" \
  -d '{"language":"java","code":"public class Main { public static void main(String[] args){ System.out.println(2+2); } }","stdin":"","timeoutMs":4000}'
```

## Runner deploy

Multi-language Lambda runner container files are in `runner/container/`.

### Deploy with AWS SAM (container)

```bash
cd runner/container
sam build -t template.yaml
sam deploy --guided -t template.yaml
```

Capture output:

- `RunnerFunctionName`
- `RunnerFunctionArn`

Set Vercel env vars:

- `PEBBLE_RUNNER_MODE=remote`
- `AWS_REGION`
- `RUNNER_LAMBDA_NAME` (or ARN)
- Optional: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Deployed smoke test

```bash
curl -sS -X POST https://<your-app>.vercel.app/api/run \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(40+2)","stdin":"","timeoutMs":4000}'
```

## Notes

- `/api/pebble` remains unchanged.
- Do not run untrusted code without infrastructure sandboxing/isolation.
