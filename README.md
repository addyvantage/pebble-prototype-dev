# Pebble Prototype

Pebble is a calm, behavior-aware AI learning companion for developers.
This repository contains a hackathon-grade front-end prototype built with:

- Vite
- React + TypeScript
- Tailwind CSS
- React Router

## Local setup

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal, usually `http://localhost:5173`.

## Local full-stack dev

```bash
npm install
npm run dev:full
```

Open `http://localhost:5173/session/1`.

`/api/*` is proxied by Vite to the local backend on `http://localhost:3001`, so frontend calls stay as `/api/pebble` and `/api/run/python`.

Default local mode uses a local Python process (`python3`) in `server/dev-server.ts`.
To test against remote Lambda runner from local:

```bash
PEBBLE_RUNNER_REMOTE=1 npm run dev:backend
```

Required for remote mode:
- `AWS_REGION`
- `RUNNER_LAMBDA_NAME`
- Optional static creds: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (or use your local AWS profile/role chain)

### Smoke test

```bash
curl -sS http://localhost:5173/api/pebble
curl -sS -X POST http://localhost:5173/api/pebble -H "Content-Type: application/json" -d '{"prompt":"Say hi in 1 line","context":{}}'
curl -sS -X POST http://localhost:5173/api/run/python -H "Content-Type: application/json" -d '{"code":"print(2+2)","stdin":"","timeoutMs":4000}'
```

Inside `/session/1`, use the Python IDE Run button, verify stdout/stderr in the output panel, then ask Pebble to get help based on live run results.

## Deploy runner (AWS SAM)

Runner source is in [`runner/`](./runner) and uses Lambda Python 3.12.

```bash
cd runner
sam build
sam deploy --guided
```

Capture outputs:
- `RunnerFunctionName`
- `RunnerFunctionArn`
- `RunnerFunctionUrl` (IAM-protected)

The app uses SDK invoke by function name/ARN (not public URL).

## Vercel env vars

Set these in Vercel Project Settings -> Environment Variables:

- `AWS_REGION`
- `RUNNER_LAMBDA_NAME` (from SAM output: function name or ARN)
- `PEBBLE_RUNNER_MODE=remote`
- `BEDROCK_MODEL_ID`
- Bedrock creds: either
  - `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, or
  - role-based credentials in your runtime environment

Then redeploy.

### Deployed smoke test

```bash
curl -sS -X POST https://<your-app>.vercel.app/api/run/python \
  -H "Content-Type: application/json" \
  -d '{"code":"print(40+2)","stdin":"","timeoutMs":4000}'
```

Expected shape:

```json
{"ok":true,"exitCode":0,"stdout":"42\n","stderr":"","timedOut":false,"durationMs":123}
```

## Security notes

- Do not run untrusted code without sandboxing.
- Runner enforces input clamping, output truncation, and execution timeout.
- For stronger egress controls, run Lambda in private subnets with no NAT to block outbound internet.
- Keep AWS credentials server-side only; never expose them in client code.

## Step 1 status

The current build includes:

- A premium dark navy base theme with glass panels
- App routing for landing, session shell, and insights shell
- A polished landing page aligned with Pebble tone

Next implementation steps will add simulated IDE behavior, struggle telemetry, nudges, growth memory, and trends.
