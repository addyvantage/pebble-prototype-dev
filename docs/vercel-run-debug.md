# Vercel Run Debug Guide

Use this when `/api/run` fails in production or behaves differently from local dev.

## 1) Reproduce with Vercel runtime locally

```bash
npx vercel dev
```

By default this serves on `http://localhost:3000`.

## 2) Verify function routing first

```bash
curl -i http://localhost:3000/api/health
```

Expected: `200` + JSON with `ok: true`.

## 3) Smoke test `/api/run`

```bash
curl -i -X POST http://localhost:3000/api/run \
  -H 'content-type: application/json' \
  --data '{"language":"python","code":"print(1)","stdin":"","timeoutMs":4000,"tests":[]}'
```

Expected:
- Success path: JSON run result with `ok: true`.
- Misconfigured runner path: JSON run result with `ok: false` and a clear `stderr` message.

## 4) Check production function logs

```bash
vercel logs <deployment-url> --since 1h
```

or use the Vercel Dashboard:
- Project → Deployments → select deployment → Functions logs

## 5) Common production misconfigurations

- `PEBBLE_RUNNER_MODE=remote` but no runner configured:
  - Set `RUNNER_URL`, or set both `AWS_REGION` + `RUNNER_LAMBDA_NAME`.
- Upstream runner URL is invalid/unreachable.
- API routes accidentally rewritten to SPA (fixed by `vercel.json` routes).

## 6) Env vars to verify

- `PEBBLE_RUNNER_MODE` (`local` or `remote`)
- `RUNNER_URL` (preferred remote HTTP runner)
- OR: `AWS_REGION` + `RUNNER_LAMBDA_NAME` (Lambda invoke mode)
