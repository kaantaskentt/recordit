// ============================================
// RecordIt — Analysis Pipeline Orchestrator
// ============================================
// Dual-provider: Gemini 2.5 Flash (vision + extraction) + Claude Sonnet 4.6 (reasoning)
// Chain: Frame Analysis → Step Extraction → Gap Detection → Follow-up Generation

import { geminiFlash } from "@/lib/ai/gemini";
import { anthropic } from "@/lib/ai/claude";
import { supabase } from "@/lib/supabase";
import {
  FRAME_ANALYSIS_PROMPT,
  buildStepExtractionPrompt,
  buildGapDetectionPrompt,
  buildFollowUpPrompt,
} from "@/lib/ai/prompts";
import type { BriefingSummary, WatchListItem } from "@/lib/types";

interface FrameInfo {
  url: string;
  timestamp: number;
}

interface NarrationEntry {
  timestamp: number;
  text: string;
}

interface FrameDescription {
  timestamp: number;
  description: string;
  app: string;
  action: string;
  data_visible: string[];
  data_flow: string | null;
  decision_indicators: string | null;
  error_or_validation: string | null;
  matched_narration: string | null;
}

interface ExtractedStep {
  step_number: number;
  timestamp_start: number;
  timestamp_end: number;
  description: string;
  tools_detected: string[];
  data_sources: string[];
  action_type: string;
  complexity: string;
  decision_criteria: string | null;
  data_origin: string | null;
  data_destination: string | null;
  user_reasoning: string | null;
  notes: string;
}

interface Gap {
  type: string;
  description: string;
  related_step: number | null;
  related_watch_item: string | null;
  priority: string;
  context: string;
  suggested_resolution: string | null;
}

interface FollowUpItem {
  question: string;
  context: string;
  related_step: number | null;
  gap_type: string;
  priority: string;
}

// ---- Helper: Parse JSON from LLM response (with fallback) ----
function parseJSON(text: string): Record<string, unknown> {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    throw new Error("Failed to parse JSON from response");
  }
}

// ---- Helper: Fetch image as base64 for Gemini ----
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

// ---- Helper: Match narrations to frames by timestamp proximity ----
function matchNarrationsToFrames(
  frames: FrameDescription[],
  narrations: NarrationEntry[]
): void {
  // For each narration, find the closest frame within a 10-second window
  for (const narration of narrations) {
    let closestFrame: FrameDescription | null = null;
    let closestDistance = Infinity;

    for (const frame of frames) {
      const distance = Math.abs(frame.timestamp - narration.timestamp);
      if (distance < closestDistance && distance <= 10) {
        closestDistance = distance;
        closestFrame = frame;
      }
    }

    if (closestFrame) {
      // Append narration — a frame may have multiple narrations
      if (closestFrame.matched_narration) {
        closestFrame.matched_narration += ` | ${narration.text}`;
      } else {
        closestFrame.matched_narration = narration.text;
      }
    }
  }
}

export async function runAnalysisPipeline(sessionId: string) {
  // ---- Fetch session + project data ----
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error(`Session not found: ${sessionError?.message}`);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", session.project_id)
    .single();

  const watchList: WatchListItem[] = project?.watch_list || [];
  const briefingSummary: BriefingSummary | null =
    project?.briefing_summary || null;

  // ---- Fetch frames ----
  const { data: frameFiles } = await supabase.storage
    .from("recordings")
    .list(`recordings/${sessionId}/frames`, {
      sortBy: { column: "name", order: "asc" },
    });

  const frames: FrameInfo[] = (frameFiles || []).map((f) => {
    const path = `recordings/${sessionId}/frames/${f.name}`;
    const {
      data: { publicUrl },
    } = supabase.storage.from("recordings").getPublicUrl(path);
    return {
      url: publicUrl,
      timestamp: parseInt(f.name.replace(".jpg", ""), 10) || 0,
    };
  });

  // ---- Fetch narrations ----
  const { data: narrations } = await supabase
    .from("narrations")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true });

  const narrationEntries: NarrationEntry[] = (narrations || []).map(
    (n: { timestamp: number; text: string }) => ({
      timestamp: n.timestamp,
      text: n.text,
    })
  );

  // ---- Step 1: Frame Analysis — Gemini 2.5 Flash (batched, 5 at a time) ----
  const frameDescriptions: FrameDescription[] = [];

  for (let i = 0; i < frames.length; i += 5) {
    const batch = frames.slice(i, i + 5);
    const results = await Promise.all(
      batch.map((frame) => analyzeFrameWithGemini(frame))
    );
    frameDescriptions.push(
      ...(results.filter(Boolean) as FrameDescription[])
    );
  }

  // ---- Match narrations to closest frames ----
  matchNarrationsToFrames(frameDescriptions, narrationEntries);

  // ---- Step 2: Step Extraction — Gemini 2.5 Flash ----
  // Build rich frame descriptions with matched narrations
  const enrichedFrames = frameDescriptions.map((f) => {
    const parts = [`[${f.app}] ${f.action}`];
    if (f.data_visible.length > 0) {
      parts.push(`Data visible: ${f.data_visible.join(", ")}`);
    }
    if (f.data_flow) {
      parts.push(`Data flow: ${f.data_flow}`);
    }
    if (f.decision_indicators) {
      parts.push(`Decision: ${f.decision_indicators}`);
    }
    if (f.error_or_validation) {
      parts.push(`Error/Validation: ${f.error_or_validation}`);
    }

    return {
      timestamp: f.timestamp,
      description: parts.join(" — "),
      narration: f.matched_narration || undefined,
    };
  });

  const stepExtractionPrompt = buildStepExtractionPrompt(
    enrichedFrames,
    narrationEntries,
    watchList
  );

  const stepsResult = await geminiFlash.generateContent({
    contents: [{ role: "user", parts: [{ text: stepExtractionPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const stepsContent = stepsResult.response.text();
  const extractedSteps: ExtractedStep[] = stepsContent
    ? (parseJSON(stepsContent).steps as ExtractedStep[]) || []
    : [];

  // ---- Step 3: Gap Detection — Claude Sonnet 4.6 (reasoning-critical) ----
  const gapPrompt = buildGapDetectionPrompt(
    extractedSteps.map((s) => ({
      step_number: s.step_number,
      description: s.description,
      tools_detected: s.tools_detected,
      action_type: s.action_type,
      complexity: s.complexity,
      decision_criteria: s.decision_criteria,
      data_origin: s.data_origin,
      data_destination: s.data_destination,
      user_reasoning: s.user_reasoning,
      notes: s.notes,
    })),
    watchList,
    briefingSummary
  );

  const gapsResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system:
      "You are a process discovery expert. Always respond with valid JSON only. No markdown, no explanation — just the JSON object.",
    messages: [{ role: "user", content: gapPrompt }],
  });

  const gapsText =
    gapsResponse.content[0].type === "text"
      ? gapsResponse.content[0].text
      : "";
  const gapsParsed = gapsText ? parseJSON(gapsText) : { gaps: [] };
  const gaps: Gap[] = (gapsParsed.gaps as Gap[]) || [];

  // ---- Step 4: Follow-up Generation — Gemini 2.5 Flash ----
  // Fetch previous follow-ups from other sessions in the same project for cross-session awareness
  const { data: otherSessionIds } = await supabase
    .from("sessions")
    .select("id")
    .eq("project_id", session.project_id)
    .neq("id", sessionId);

  let previousFollowUps: { question: string; response: string | null; status: string }[] = [];
  const otherIds = (otherSessionIds || []).map((s: { id: string }) => s.id);
  if (otherIds.length > 0) {
    const { data: prevFUs } = await supabase
      .from("follow_ups")
      .select("question, response, status")
      .in("session_id", otherIds);
    previousFollowUps = (prevFUs || []) as { question: string; response: string | null; status: string }[];
  }

  const followUpPrompt = buildFollowUpPrompt(
    gaps.map((g) => ({
      ...g,
      suggested_resolution: g.suggested_resolution ?? undefined,
    })),
    extractedSteps.map((s) => ({
      step_number: s.step_number,
      description: s.description,
      user_reasoning: s.user_reasoning,
    })),
    narrationEntries,
    previousFollowUps
  );

  const followUpsResult = await geminiFlash.generateContent({
    contents: [{ role: "user", parts: [{ text: followUpPrompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const followUpsContent = followUpsResult.response.text();
  const followUps: FollowUpItem[] = followUpsContent
    ? (parseJSON(followUpsContent).follow_ups as FollowUpItem[]) || []
    : [];

  // ---- Save steps to database ----
  if (extractedSteps.length > 0) {
    const stepRows = extractedSteps.map((s) => ({
      session_id: sessionId,
      step_number: s.step_number,
      timestamp_start: s.timestamp_start,
      timestamp_end: s.timestamp_end,
      description: s.description,
      tools_detected: s.tools_detected,
      data_sources: s.data_sources,
      action_type: s.action_type,
      complexity: s.complexity,
      notes: s.notes || null,
    }));

    const { error: stepsError } = await supabase
      .from("steps")
      .insert(stepRows);

    if (stepsError) {
      console.error("Failed to save steps:", stepsError);
    }
  }

  // ---- Save follow-ups to database ----
  if (followUps.length > 0) {
    const { data: savedSteps } = await supabase
      .from("steps")
      .select("id, step_number")
      .eq("session_id", sessionId)
      .order("step_number", { ascending: true });

    const stepMap = new Map(
      (savedSteps || []).map((s: { id: string; step_number: number }) => [
        s.step_number,
        s.id,
      ])
    );

    const followUpRows = followUps.map((f) => ({
      session_id: sessionId,
      step_id: f.related_step ? stepMap.get(f.related_step) || null : null,
      question: f.question,
      context: f.context,
      status: "pending" as const,
    }));

    const { error: followUpsError } = await supabase
      .from("follow_ups")
      .insert(followUpRows);

    if (followUpsError) {
      console.error("Failed to save follow-ups:", followUpsError);
    }
  }

  // ---- Update session status ----
  await supabase
    .from("sessions")
    .update({ status: "reviewed" })
    .eq("id", sessionId);

  // ---- Auto-tag project ----
  await updateProjectTags(session.project_id);

  return {
    steps: extractedSteps.length,
    gaps: gaps.length,
    follow_ups: followUps.length,
    frames_analyzed: frameDescriptions.length,
  };
}

// ---- Helper: Compute and update project-level tags + automation score ----

async function updateProjectTags(projectId: string) {
  try {
    // Fetch all reviewed sessions for this project
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("project_id", projectId)
      .eq("status", "reviewed");

    const sessionIds = (sessions || []).map((s: { id: string }) => s.id);
    if (sessionIds.length === 0) return;

    // Fetch all steps across reviewed sessions
    const { data: steps } = await supabase
      .from("steps")
      .select("tools_detected, action_type, complexity")
      .in("session_id", sessionIds);

    const allSteps = steps || [];
    if (allSteps.length === 0) return;

    const tags: string[] = [];

    // Extract unique tools as tags
    const toolSet = new Set<string>();
    for (const step of allSteps) {
      for (const tool of step.tools_detected || []) {
        toolSet.add(tool);
      }
    }
    for (const tool of toolSet) {
      tags.push(tool);
    }

    // Compute automation score
    const automateCount = allSteps.filter(
      (s) => s.complexity === "automate"
    ).length;
    const aiAssistCount = allSteps.filter(
      (s) => s.complexity === "ai_assist"
    ).length;
    const automationScore = Math.round(
      ((automateCount + aiAssistCount * 0.5) / allSteps.length) * 100
    );

    // Add automation potential tag
    if (automationScore >= 70) {
      tags.push("High Automation");
    } else if (automationScore >= 40) {
      tags.push("Medium Automation");
    } else {
      tags.push("Low Automation");
    }

    // Add dominant action type tags
    const typeCounts = new Map<string, number>();
    for (const step of allSteps) {
      const t = step.action_type;
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
    }
    const sorted = Array.from(typeCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    if (sorted.length > 0 && sorted[0][1] >= allSteps.length * 0.3) {
      const label = sorted[0][0].replace("_", " ");
      tags.push(`${label[0].toUpperCase()}${label.slice(1)} Heavy`);
    }

    await supabase
      .from("projects")
      .update({ tags, automation_score: automationScore })
      .eq("id", projectId);
  } catch (err) {
    console.error("Failed to update project tags:", err);
  }
}

// ---- Helper: Analyze single frame with Gemini 2.5 Flash Vision ----

async function analyzeFrameWithGemini(
  frame: FrameInfo
): Promise<FrameDescription | null> {
  try {
    const base64Image = await fetchImageAsBase64(frame.url);

    const result = await geminiFlash.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: FRAME_ANALYSIS_PROMPT },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 800,
      },
    });

    const content = result.response.text();
    if (!content) return null;

    const parsed = parseJSON(content);
    return {
      timestamp: frame.timestamp,
      description: `${parsed.app}: ${parsed.action}`,
      app: (parsed.app as string) || "Unknown",
      action: (parsed.action as string) || "Unknown action",
      data_visible: (parsed.data_visible as string[]) || [],
      data_flow: (parsed.data_flow as string) || null,
      decision_indicators: (parsed.decision_indicators as string) || null,
      error_or_validation: (parsed.error_or_validation as string) || null,
      matched_narration: null,
    };
  } catch (err) {
    console.error(
      `Frame analysis failed for timestamp ${frame.timestamp}:`,
      err
    );
    return null;
  }
}
