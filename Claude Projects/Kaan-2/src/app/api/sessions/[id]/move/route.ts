import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validate, moveSessionSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const result = validate(moveSessionSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { target_project_id } = result.data;

  // Verify target project exists
  const { error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", target_project_id)
    .single();

  if (projectError) {
    return NextResponse.json(
      { error: "Target project not found" },
      { status: 404 }
    );
  }

  // Move session
  const { data, error } = await supabase
    .from("sessions")
    .update({ project_id: target_project_id })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
