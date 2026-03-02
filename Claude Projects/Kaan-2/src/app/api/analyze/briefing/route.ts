import { NextResponse } from "next/server";
import { anthropic } from "@/lib/ai/claude";
import { supabase } from "@/lib/supabase";
import { validate, analyzeBriefingSchema } from "@/lib/validations";

const BRIEFING_SYSTEM_PROMPT = `You are a process discovery analyst. You help AI solutions architects understand client workflows before building automations.

Given a transcript or notes from an initial discovery call with a client, extract:

1. **process_overview**: A clear 2-3 sentence summary of the process being discussed
2. **tools_mentioned**: Array of all software tools, platforms, and systems mentioned (e.g., "Excel", "SAP", "Gmail", "Slack")
3. **pain_points**: Array of specific pain points, inefficiencies, or complaints mentioned
4. **key_entities**: Array of objects with {name, type, description} for important people, roles, departments, data sources, or systems
5. **open_questions**: Array of important questions that weren't answered in the call — gaps in understanding that need follow-up

Also generate a **watch_list** — things to specifically look for when the client records their screen doing this process. Each item should have:
- **description**: What to watch for
- **category**: One of: "data_flow", "decision_point", "manual_step", "tool_usage", "exception_handling"
- **priority**: "high", "medium", or "low"

Focus on the micro-details. The watch list should capture things like:
- Where does specific data come from?
- What triggers each step?
- Are there manual lookups or reference checks?
- Where are decisions made and what drives them?
- What happens when something goes wrong?

Return valid JSON only — no markdown, no explanation. Two top-level keys: "briefing_summary" and "watch_list".`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = validate(analyzeBriefingSchema, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { project_id, transcript } = result.data;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: BRIEFING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the transcript/notes from my discovery call:\n\n${transcript}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON — handle potential markdown wrapping
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        parsed = JSON.parse(match[1].trim());
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    // Update project with extracted data
    const { error } = await supabase
      .from("projects")
      .update({
        briefing_transcript: transcript,
        briefing_summary: parsed.briefing_summary,
        watch_list: parsed.watch_list,
      })
      .eq("id", project_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Briefing analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze briefing" },
      { status: 500 }
    );
  }
}
