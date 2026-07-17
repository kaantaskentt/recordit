import { generateBuildSpec } from "@/lib/spec/generator";
import { renderToBuffer } from "@react-pdf/renderer";
import { BuildSpecPDF } from "@/lib/spec/pdf";
import React from "react";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const spec = await generateBuildSpec(id);
    const buffer = await renderToBuffer(<BuildSpecPDF spec={spec} />);
    const bytes = new Uint8Array(buffer);

    const filename = `${spec.project.name.replace(/\s+/g, "-").toLowerCase()}-spec.pdf`;

    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to generate PDF",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
