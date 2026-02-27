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

`/api/*` is proxied by Vite to the local backend on `http://localhost:3001`, so frontend calls stay as `/api/pebble`.

### Smoke test

```bash
curl -sS http://localhost:5173/api/pebble
curl -sS -X POST http://localhost:5173/api/pebble -H "Content-Type: application/json" -d '{"prompt":"Say hi in 1 line","context":{}}'
```

## Step 1 status

The current build includes:

- A premium dark navy base theme with glass panels
- App routing for landing, session shell, and insights shell
- A polished landing page aligned with Pebble tone

Next implementation steps will add simulated IDE behavior, struggle telemetry, nudges, growth memory, and trends.
