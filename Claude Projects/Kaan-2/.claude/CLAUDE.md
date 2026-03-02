# RecordIt — Process Discovery Tool

## Overview
AI-powered process discovery for solutions architects. Records client workflows via screen capture + voice narration, extracts steps with AI, classifies automation potential, and generates build specs with actionable recommendations.

## Tech Stack
- Next.js 16 (App Router) / React 19 / TypeScript
- Tailwind CSS v4 (dark theme, green accent #22c55e)
- Supabase (PostgreSQL + Storage — bucket: "recordings")
- AI: Gemini 2.5 Flash (vision/extraction) + Claude Sonnet 4.6 (reasoning)
- PDF: @react-pdf/renderer (server-side PDF generation)

## AI Architecture
- **Gemini 2.5 Flash** ($0.30/1M tokens): Frame analysis (vision), step extraction, follow-up generation
- **Claude Sonnet 4.6** ($3.00/1M tokens): Briefing analysis, gap detection
- Prompt chain: Frames → Steps → Gap Detection → Follow-ups
- Model IDs: `gemini-2.5-flash`, `claude-sonnet-4-6`
- Narrations matched to frames by timestamp proximity (10s window) before step extraction
- Frame analysis extracts: app, action, data_visible, data_flow, decision_indicators, error_or_validation
- Step extraction outputs: decision_criteria, data_origin, data_destination, user_reasoning
- Gap detection includes: watch_list_coverage, confidence_assessment, suggested_resolution per gap

## Key Directories
- `src/app/api/` — API routes (17 routes)
- `src/app/dashboard/` — Project list, project detail (briefing/sessions/spec tabs), session detail (video + steps + follow-ups + watch list)
- `src/app/record/[sessionId]/` — Recording interface (3 phases: guide → recording → done)
- `src/lib/ai/` — AI providers (claude.ts, gemini.ts), prompts.ts, analysis.ts pipeline
- `src/lib/spec/` — Build spec generator.ts + pdf.tsx export
- `src/lib/` — Shared: types.ts, supabase.ts, utils.ts, validations.ts
- `supabase/migrations/` — Database schema

## Database Tables
`projects`, `sessions`, `steps`, `follow_ups`, `narrations`

## Conventions
- Monospace font throughout (`font-mono`)
- Colors: green-400/green-500 primary, dark backgrounds (#0a0a0a, #0f0f0f)
- API pattern: NextResponse.json, Supabase client, typed responses
- Components: inline in page files (no separate component directory)
- Card style: `bg-[#0f0f0f] card-glow` with green-tinted borders

## Recording Flow
1. `getDisplayMedia` → screen + system audio
2. `getUserMedia` → microphone audio
3. Web Audio API mixes both into one MediaRecorder stream
4. Web Speech API provides real-time voice transcription
5. Canvas captures frames every 7s → uploaded to Supabase Storage
6. On stop: WebM uploaded, narrations saved with timestamps, session marked "processing"
7. Auto-analysis fires in background (fire-and-forget) — no manual button needed

## External Agents
Kaan uses **Manus AI** for GitHub repo research. Manus finds repos, evaluates maintenance status, and explains fit. Results shared as markdown files for Claude Code to evaluate and integrate.

## Token Cost Optimization (Roadmap)
Current cost drivers (in order):
1. Frame analysis (Gemini vision) — ~60K tokens per 5-min recording
2. Step extraction — ~5-15K tokens
3. Gap detection (Claude) — ~3-8K tokens

Future optimizations to implement:
- Adaptive frame capture: 7s for 0-2min, 15s after (halves frames for long recordings)
- Frame deduplication: skip if <5% pixel diff from previous capture
- Larger frame batches: increase from 5 to 10 per Gemini call
- Cache frame descriptions to avoid reprocessing on re-analysis

## Templates
Templates library: /Users/kaantaskent/Desktop/Claude Projects/claude-code-templates/
