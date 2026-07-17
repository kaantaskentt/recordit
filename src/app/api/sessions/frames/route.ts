import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const sessionId = formData.get("session_id") as string | null;
    const timestamp = formData.get("timestamp") as string | null;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: "file and session_id are required" },
        { status: 400 }
      );
    }

    const ts = timestamp || Date.now().toString();
    const path = `recordings/${sessionId}/frames/${ts}.jpg`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(path, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("recordings").getPublicUrl(path);

    return NextResponse.json({ path, url: publicUrl }, { status: 201 });
  } catch (err) {
    console.error("Frame upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload frame" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.storage
    .from("recordings")
    .list(`recordings/${sessionId}/frames`, {
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const frames = (data || []).map((file) => {
    const path = `recordings/${sessionId}/frames/${file.name}`;
    const {
      data: { publicUrl },
    } = supabase.storage.from("recordings").getPublicUrl(path);
    return {
      name: file.name,
      path,
      url: publicUrl,
      timestamp: parseInt(file.name.replace(".jpg", ""), 10) || 0,
    };
  });

  return NextResponse.json(frames);
}
