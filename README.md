# RecordIt Prototype

RecordIt is an early product prototype for AI-assisted process discovery: record a work session, preserve narration and evidence, extract structured steps, and turn the result into an implementation-ready workflow brief.

The active continuation of this product direction is [RecordFlow](https://github.com/kaantaskentt/recordflow). This repository remains public as a transparent snapshot of the earlier architecture and interface.

## Prototype capabilities

- Creates projects and recorded workflow sessions.
- Stores frames, narration, notes, and session metadata in Supabase.
- Extracts steps and follow-up questions with AI providers.
- Classifies work as manual, AI-assisted, or automation-ready.
- Generates project briefings, build specifications, and PDF exports.
- Provides session playback with time-linked process steps.

## Repository layout

The application lives in [`Claude Projects/Kaan-2`](./Claude%20Projects/Kaan-2). The path is retained to preserve the prototype history.

## Run locally

Requirements: Node.js 22, npm, a Supabase project, and model-provider credentials.

```bash
git clone https://github.com/kaantaskentt/recordit.git
cd "recordit/Claude Projects/Kaan-2"
cp .env.local.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

GitHub Actions runs the same checks with non-secret build placeholders. Dependency alerts, automated fixes, secret scanning, push protection, and private vulnerability reporting are enabled.

## Security

This prototype handles recordings, narration, extracted text, and AI-generated analysis. Do not use it with production or sensitive data without reviewing authentication, Supabase row-level security, storage access, retention, upload limits, and model-provider policies.

Report vulnerabilities privately through the repository Security tab.
