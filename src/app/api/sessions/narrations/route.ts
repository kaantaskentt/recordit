import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { validate, createNarrationSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const result = validate(createNarrationSchema, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("narrations")
    .insert(result.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("narrations")
    .select("*")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
