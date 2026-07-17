import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validate, createSessionSchema } from "@/lib/validations";
import type { WatchListItem } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  let query = supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Generate recording instructions from briefing watch list + task description
function buildInstructions(
  taskDescription: string | null,
  watchList: WatchListItem[] | null
): string {
  const lines: string[] = [];

  if (taskDescription) {
    lines.push(`Task: ${taskDescription}`);
    lines.push("");
  }

  // Pull high and medium priority watch list items
  const items = (watchList || []).filter(
    (w) => w.priority === "high" || w.priority === "medium"
  );

  if (items.length > 0) {
    lines.push("While recording, please focus on:");
    lines.push("");
    for (const item of items.slice(0, 8)) {
      lines.push(`• ${item.description}`);
    }
    lines.push("");
  }

  lines.push("Tips:");
  lines.push("• Talk through what you're doing and why as you go");
  lines.push(
    "• Mention where you get data from (which file, email, system)"
  );
  lines.push("• Show what happens when something goes wrong, if possible");
  lines.push("• Pause briefly between major steps");

  return lines.join("\n");
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = validate(createSessionSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Fetch project to get watch list for auto-generated instructions
  const { data: project } = await supabase
    .from("projects")
    .select("watch_list")
    .eq("id", result.data.project_id)
    .single();

  const instructions = buildInstructions(
    result.data.task_description || null,
    project?.watch_list || null
  );

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      project_id: result.data.project_id,
      title: result.data.title,
      instructions,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
