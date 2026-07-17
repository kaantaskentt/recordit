import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: `${project.name} (Copy)`,
      client_name: project.client_name,
      department: project.department,
      description: project.description,
      status: "active",
      briefing_transcript: project.briefing_transcript,
      briefing_summary: project.briefing_summary,
      watch_list: project.watch_list,
      tags: project.tags,
      automation_score: project.automation_score,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
