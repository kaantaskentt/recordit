import { NextResponse } from "next/server";
import { generateBuildSpec, specToMarkdown } from "@/lib/spec/generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  try {
    const spec = await generateBuildSpec(id);

    if (format === "markdown") {
      const markdown = specToMarkdown(spec);
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${spec.project.name.replace(/\s+/g, "-").toLowerCase()}-spec.md"`,
        },
      });
    }

    return NextResponse.json(spec);
  } catch (err) {
    console.error("Spec generation error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate spec",
      },
      { status: 500 }
    );
  }
}
