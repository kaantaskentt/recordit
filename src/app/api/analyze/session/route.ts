import { NextResponse } from "next/server";
import { runAnalysisPipeline } from "@/lib/ai/analysis";
import { validate, analyzeSessionSchema } from "@/lib/validations";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = validate(analyzeSessionSchema, body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const summary = await runAnalysisPipeline(result.data.session_id);

    return NextResponse.json({
      message: "Analysis complete",
      ...summary,
    });
  } catch (err) {
    console.error("Session analysis error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to analyze session",
      },
      { status: 500 }
    );
  }
}
