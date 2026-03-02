import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("session_id") as string;

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: "File and session_id required" },
        { status: 400 }
      );
    }

    const fileName = `recordings/${sessionId}/${Date.now()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("recordings")
      .upload(fileName, file, {
        contentType: "video/webm",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("recordings").getPublicUrl(fileName);

    // Update session with recording URL
    await supabase
      .from("sessions")
      .update({ recording_url: publicUrl })
      .eq("id", sessionId);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
