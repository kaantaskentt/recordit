// ============================================
// RecordIt — Prompt Templates (4-Step Chain)
// ============================================
// Chain: Frame Analysis → Step Extraction → Gap Detection → Follow-up Generation

// ---- Step 1: Frame Analysis (Gemini 2.5 Flash Vision) ----
// Applied per-frame — identifies what's on screen with deep detail

export const FRAME_ANALYSIS_PROMPT = `You are analyzing a screenshot captured during a business process recording. Your job is to extract maximum detail about what's happening — not just surface-level observations, but workflow-critical information.

Analyze the screenshot and return a JSON object with:

- "app": The application or website visible (e.g., "Gmail", "Excel - Vendor Pricing.xlsx", "Salesforce - Account Detail", "Chrome - portal.company.com/orders")
- "action": What the user appears to be doing — be very specific (e.g., "filtering orders table by date range 01/15 to 01/31", "entering vendor name into Purchase Order form field")
- "data_visible": Array of specific data items visible on screen — include actual field names, column headers, values when readable (e.g., ["Order ID: PO-4521", "Status dropdown showing 'Pending Approval'", "Total: $12,340.00", "Column headers: Date, Vendor, Amount, Status"])
- "ui_elements": Key UI elements and their state — note what's active, selected, or open (e.g., ["search bar with text 'Acme Corp'", "dropdown menu open showing 3 options", "modal dialog: 'Confirm Submission'", "tab 'Pending' is selected among Pending/Approved/Rejected"])
- "data_flow": Where data appears to be coming FROM or going TO (e.g., "copying value from email into spreadsheet cell B4", "looking up customer ID to paste into form", "exporting filtered table")
- "decision_indicators": Any evidence of a decision being made — conditional logic, filtering, sorting, choosing between options (e.g., "selecting 'Priority: High' from dropdown", "checking a checkbox next to specific rows", "comparing two values side by side")
- "error_or_validation": Any error messages, warnings, validation states, or unusual UI states visible (e.g., "red validation error: 'Amount exceeds limit'", "yellow warning banner at top", "field highlighted in red", null if none)
- "notes": Additional observations — system load state, number of items in a list, anything that suggests volume or frequency

Be extremely specific. Instead of "using a spreadsheet", say "entering values into column B (Amount) of Excel spreadsheet 'Q4_Invoices.xlsx' — visible rows show 47 entries with headers: Invoice#, Vendor, Amount, Due Date, Status".

Return valid JSON only.`;

// ---- Step 2: Step Extraction ----
// Combines frame descriptions + narrations into structured steps

export function buildStepExtractionPrompt(
  frameDescriptions: { timestamp: number; description: string; narration?: string }[],
  narrations: { timestamp: number; text: string }[],
  watchList: { description: string; category: string; priority: string }[]
) {
  const framesText = frameDescriptions
    .map((f) => {
      let line = `[${f.timestamp}s] ${f.description}`;
      if (f.narration) {
        line += `\n    USER SAID: "${f.narration}"`;
      }
      return line;
    })
    .join("\n");

  const narrationsText = narrations
    .map((n) => `[${n.timestamp}s] "${n.text}"`)
    .join("\n");

  const watchListText = watchList
    .map((w) => `- [${w.priority}] ${w.description} (${w.category})`)
    .join("\n");

  return `You are a senior process analyst extracting structured workflow steps from a recorded business process. You must produce a precise, actionable step-by-step breakdown.

## Frame Descriptions (what was on screen at each timestamp)
${framesText || "No frames captured"}

## User Narrations (what the user said — THIS IS CRITICAL CONTEXT)
${narrationsText || "No narrations recorded"}

IMPORTANT: The user's voice narrations explain WHY they're doing things. Treat narrations as the highest-priority signal for understanding intent, decision logic, and exceptions. If a narration contradicts what the frames show, note the discrepancy.

## Watch List (things we specifically need to track)
${watchListText || "No watch list items"}

Extract a sequence of discrete workflow steps. Each step should represent one meaningful action.

Return a JSON object with a "steps" array. Each step:
{
  "step_number": 1,
  "timestamp_start": 0,
  "timestamp_end": 15,
  "description": "Clear, specific description including exact app/screen and what data is involved",
  "tools_detected": ["Excel", "Email"],
  "data_sources": ["vendor email", "price list spreadsheet"],
  "action_type": "data_entry" | "navigation" | "decision" | "communication" | "lookup" | "validation" | "transformation",
  "complexity": "automate" | "ai_assist" | "manual",
  "decision_criteria": "IF order > $10k THEN route to manager approval, ELSE auto-approve" or null,
  "data_origin": "Where the input data comes from (e.g., 'copied from email attachment')" or null,
  "data_destination": "Where the output/result goes (e.g., 'pasted into SAP PO form')" or null,
  "user_reasoning": "What the user said about why they do this step" or null,
  "notes": "Any relevant context — exceptions mentioned, frequency hints, pain points expressed"
}

## Classification Guidelines:
- "automate": Purely mechanical — copy/paste, data entry from known source, navigation to fixed URL, filter by fixed criteria, file download/upload. NO judgment needed.
- "ai_assist": Requires pattern recognition or soft judgment — classifying emails, summarizing documents, detecting anomalies, choosing from options based on fuzzy criteria. AI can handle with human oversight.
- "manual": Requires human judgment, creativity, relationship context, or real-time adaptation — negotiation, exception handling with novel scenarios, quality judgment on subjective criteria.

## Extraction Rules:
1. Group related micro-actions into logical steps (don't create a step for every click)
2. When the user narrates "I always check X because Y", extract the decision criteria
3. When the user says "this is the annoying part" or similar, flag it in notes as a pain point
4. When data moves between systems, capture both origin and destination
5. If a step matches a watch list item, mention it in notes
6. Timestamps must align with the frame data — don't guess timestamps
7. If narrations mention exceptions or edge cases ("sometimes X happens"), capture in notes

Return valid JSON only.`;
}

// ---- Step 3: Gap Detection ----
// Compares extracted steps against watch list to find missing info

export function buildGapDetectionPrompt(
  steps: {
    step_number: number;
    description: string;
    tools_detected: string[];
    action_type: string;
    complexity: string;
    decision_criteria?: string | null;
    data_origin?: string | null;
    data_destination?: string | null;
    user_reasoning?: string | null;
    notes?: string | null;
  }[],
  watchList: { description: string; category: string; priority: string }[],
  briefingSummary: {
    process_overview: string;
    tools_mentioned: string[];
    pain_points: string[];
    open_questions: string[];
  } | null
) {
  const stepsText = steps
    .map((s) => {
      let line = `Step ${s.step_number}: ${s.description} [${s.action_type}/${s.complexity}] (tools: ${s.tools_detected.join(", ")})`;
      if (s.decision_criteria) line += `\n    Decision: ${s.decision_criteria}`;
      if (s.data_origin) line += `\n    Data from: ${s.data_origin}`;
      if (s.data_destination) line += `\n    Data to: ${s.data_destination}`;
      if (s.user_reasoning) line += `\n    User said: ${s.user_reasoning}`;
      if (s.notes) line += `\n    Notes: ${s.notes}`;
      return line;
    })
    .join("\n\n");

  const watchListText = watchList
    .map((w) => `- [${w.priority}] ${w.description} (${w.category})`)
    .join("\n");

  const briefingText = briefingSummary
    ? `Process Overview: ${briefingSummary.process_overview}
Tools Expected: ${briefingSummary.tools_mentioned.join(", ")}
Known Pain Points: ${briefingSummary.pain_points.join("; ")}
Unanswered Questions: ${briefingSummary.open_questions.join("; ")}`
    : "No briefing data available";

  return `You are a process discovery expert performing gap analysis. Your job is to identify what's MISSING from our understanding — things that would block building a reliable automation.

## Extracted Steps
${stepsText}

## Watch List (what we were looking for)
${watchListText || "No watch list items"}

## Briefing Context
${briefingText}

## Gap Analysis Framework

Analyze the steps against these critical dimensions:

### 1. Logical Completeness
- Are there implicit steps between recorded steps? (e.g., step jumps from "open email" to "data entered in SAP" — what happened in between?)
- Does every decision have clear criteria, or are some based on unstated knowledge?
- Are there steps where data appears "magically" without a clear source?

### 2. Watch List Coverage
- For each HIGH priority watch item: was it clearly observed, partially observed, or completely missing?
- For each MEDIUM priority watch item: same assessment

### 3. Exception Paths
- What happens when the normal flow breaks? (system error, missing data, rejected approval)
- Were any error states or edge cases shown? If not, what likely exceptions exist?
- Did the user mention any "sometimes X happens" scenarios?

### 4. Automation Blockers
- Which steps lack enough detail to write automation logic?
- Where are we assuming rules that weren't explicitly stated?
- What data formats, field names, or system access details are missing?

### 5. Volume & Frequency
- How often is this process run? (mentioned or inferable?)
- How many items per run? (batch size)
- How long does it take manually?

Return a JSON object with:
{
  "gaps": [
    {
      "type": "implicit_step" | "missing_decision_logic" | "missing_exception" | "unconfirmed_tool" | "missing_data_source" | "unclear_reasoning" | "missing_metric" | "watch_item_missed" | "automation_blocker",
      "description": "Clear description of what's missing",
      "related_step": 3 or null,
      "related_watch_item": "Description of relevant watch list item" or null,
      "priority": "high" | "medium" | "low",
      "context": "Why this gap matters for building the automation — what breaks or becomes unreliable without this info",
      "suggested_resolution": "How to fill this gap (e.g., 'Ask client about approval thresholds', 'Request another recording showing the exception case')"
    }
  ],
  "watch_list_coverage": [
    {
      "item": "Watch list item description",
      "status": "observed" | "partially_observed" | "not_observed",
      "evidence": "What we saw (or didn't see)"
    }
  ],
  "confidence_assessment": {
    "overall": "high" | "medium" | "low",
    "reasoning": "Why we have this confidence level — what's solid vs uncertain"
  }
}

Focus on gaps that would block building a reliable automation. Don't flag trivial cosmetic issues.

Return valid JSON only.`;
}

// ---- Step 4: Follow-up Generation ----
// Generates targeted questions per gap

export function buildFollowUpPrompt(
  gaps: {
    type: string;
    description: string;
    related_step: number | null;
    priority: string;
    context: string;
    suggested_resolution?: string;
  }[],
  steps: { step_number: number; description: string; user_reasoning?: string | null }[],
  narrations?: { timestamp: number; text: string }[],
  previousFollowUps?: { question: string; response: string | null; status: string }[]
) {
  const gapsText = gaps
    .map(
      (g) =>
        `[${g.priority}] ${g.description} (type: ${g.type}, step: ${g.related_step || "N/A"}) — ${g.context}${g.suggested_resolution ? ` | Resolution: ${g.suggested_resolution}` : ""}`
    )
    .join("\n");

  const stepsText = steps
    .map((s) => {
      let line = `Step ${s.step_number}: ${s.description}`;
      if (s.user_reasoning) line += ` (user said: "${s.user_reasoning}")`;
      return line;
    })
    .join("\n");

  const narrationContext = narrations?.length
    ? `\n## What the User Said During Recording\n${narrations.map((n) => `[${n.timestamp}s] "${n.text}"`).join("\n")}`
    : "";

  // Cross-session context: show previously asked/answered questions
  let previousContext = "";
  if (previousFollowUps && previousFollowUps.length > 0) {
    const answered = previousFollowUps.filter(
      (f) => f.status === "answered" && f.response
    );
    const unanswered = previousFollowUps.filter(
      (f) => f.status !== "answered" || !f.response
    );

    if (answered.length > 0) {
      previousContext += `\n## Previously Answered Questions (from other sessions in this project)\nThese questions have already been answered. DO NOT ask them again or ask similar questions that are already covered.\n`;
      previousContext += answered
        .map((f) => `Q: ${f.question}\nA: ${f.response}`)
        .join("\n\n");
    }
    if (unanswered.length > 0) {
      previousContext += `\n## Previously Asked (Still Pending)\nThese questions were already asked but not yet answered. DO NOT repeat them.\n`;
      previousContext += unanswered.map((f) => `- ${f.question}`).join("\n");
    }
  }

  return `You are a process discovery expert generating follow-up questions for a client. These questions will be sent to the person who recorded their workflow, to fill gaps in our understanding.
${narrationContext}
## Process Steps (what we observed)
${stepsText}

## Identified Gaps
${gapsText}
${previousContext}

Generate targeted follow-up questions. Each question should:
1. Reference what we ACTUALLY SAW the user do ("I noticed you opened the vendor spreadsheet and looked up the price...")
2. If the user said something relevant during recording, reference it ("You mentioned that 'sometimes the PO gets rejected'...")
3. Ask about the specific gap in a way a non-technical person can answer
4. Be phrased naturally and conversationally — as if talking to a colleague
5. Explain briefly why you're asking (so they know it matters)

## Question Quality Rules:
- Never ask "Can you describe your process?" — we already watched them do it
- Never ask about things they clearly showed or explained
- NEVER repeat or rephrase questions that were already asked in previous sessions (see above)
- If a previous answer already covers a gap, skip that gap entirely
- Ask specific, pointed questions: "What happens when the amount exceeds $10,000?" not "Tell me about approval rules"
- Group related gaps into single multi-part questions when appropriate
- For automation blockers, ask about exact thresholds, field names, and system access

Return a JSON object with a "follow_ups" array:
{
  "follow_ups": [
    {
      "question": "The natural-language question to ask the client",
      "context": "What we observed that prompted this question — be specific about what we saw",
      "related_step": 3,
      "gap_type": "missing_decision_logic",
      "priority": "high" | "medium" | "low"
    }
  ]
}

Order by priority (high first). Limit to 10 most important questions.

Return valid JSON only.`;
}
