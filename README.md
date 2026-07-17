# RecordIt

RecordIt is an early AI-assisted process-discovery prototype. It captures a work session, preserves narration and visual evidence, extracts structured steps, and turns the result into an implementation-ready workflow brief.

> [!NOTE]
> The active continuation of this product direction is [RecordFlow](https://github.com/kaantaskentt/recordflow). RecordIt remains public as a transparent snapshot of the earlier product architecture.

## What it does

- Creates projects and recorded workflow sessions.
- Captures screen frames, narration, notes, and session metadata.
- Extracts process steps and follow-up questions with Gemini and Claude.
- Classifies work as manual, AI-assisted, or automation-ready.
- Generates project briefings, implementation specifications, and PDF exports.
- Provides session playback with time-linked process steps.

## Architecture

| Layer | Technology |
| --- | --- |
| Product | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Data | Supabase Postgres and Storage |
| Vision and extraction | Gemini |
| Reasoning and gap analysis | Claude |
| Exports | React PDF |

The recording flow combines screen capture, microphone audio, system audio, live speech transcription, and periodic frame capture. API routes persist the evidence, run AI analysis, and assemble the final process specification.

## Run locally

Requirements: Node.js 22, npm, a Supabase project, and model-provider credentials.

```bash
git clone https://github.com/kaantaskentt/recordit.git
cd recordit
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

GitHub Actions runs these checks on every pull request and push to `main`. Dependency alerts, automated fixes, secret scanning, push protection, and private vulnerability reporting are enabled.

## Prototype status

RecordIt is not production-ready. Before using it with real customer data, review authentication, Supabase row-level security, recording consent, upload limits, storage retention, personally identifiable information, and model-provider data policies.

See [SECURITY.md](./SECURITY.md) for responsible disclosure guidance.
