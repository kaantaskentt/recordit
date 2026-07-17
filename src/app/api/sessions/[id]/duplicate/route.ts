import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Create duplicate session (without video — just metadata + steps)
  const { data: newSession, error: insertError } = await supabase
    .from("sessions")
    .insert({
      project_id: session.project_id,
      title: `${session.title} (Copy)`,
      status: session.status === "reviewed" ? "reviewed" : "pending",
      instructions: session.instructions,
      duration_seconds: session.duration_seconds,
    })
    .select()
    .single();

  if (insertError || !newSession) {
    return NextResponse.json(
      { error: insertError?.message || "Failed to duplicate session" },
      { status: 500 }
    );
  }

  // Copy steps if original session had them
  const { data: steps } = await supabase
    .from("steps")
    .select("*")
    .eq("session_id", id)
    .order("step_number", { ascending: true });

  if (steps && steps.length > 0) {
    const stepRows = steps.map((s) => ({
      session_id: newSession.id,
      step_number: s.step_number,
      timestamp_start: s.timestamp_start,
      timestamp_end: s.timestamp_end,
      description: s.description,
      tools_detected: s.tools_detected,
      data_sources: s.data_sources,
      action_type: s.action_type,
      complexity: s.complexity,
      notes: s.notes,
    }));

    await supabase.from("steps").insert(stepRows);
  }

  return NextResponse.json(newSession, { status: 201 });
}
