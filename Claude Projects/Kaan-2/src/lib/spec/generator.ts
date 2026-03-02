// ============================================
// RecordIt — Build Spec Generator
// ============================================

import { supabase } from "@/lib/supabase";
import type {
  Project,
  Step,
  FollowUp,
  BriefingSummary,
  WatchListItem,
} from "@/lib/types";

export interface BuildSpec {
  project: {
    name: string;
    client_name: string;
    department: string;
    description: string;
  };
  briefing: BriefingSummary | null;
  watch_list: WatchListItem[];
  sessions_summary: {
    total: number;
    reviewed: number;
    total_duration_seconds: number;
  };
  steps: Step[];
  follow_ups: {
    total: number;
    answered: number;
    pending: number;
    items: FollowUp[];
  };
  complexity_breakdown: {
    automate: number;
    ai_assist: number;
    manual: number;
    automation_score: number;
  };
  tools_inventory: { tool: string; count: number }[];
  data_sources_inventory: { source: string; count: number }[];
  time_estimate: {
    total_steps: number;
    estimated_hours_manual: number;
    estimated_hours_automated: number;
    time_savings_percent: number;
  };
  recommendations: {
    priority: "high" | "medium" | "low";
    type: "automate" | "ai_assist" | "investigate";
    description: string;
    related_steps: number[];
  }[];
}

export async function generateBuildSpec(
  projectId: string
): Promise<BuildSpec> {
  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Project not found: ${projectError?.message}`);
  }

  // Fetch sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const allSessions = sessions || [];
  const reviewedSessions = allSessions.filter(
    (s: { status: string }) => s.status === "reviewed"
  );

  // Fetch all steps across sessions, ordered by session then step number
  const sessionIds = reviewedSessions.map((s: { id: string }) => s.id);
  let allSteps: Step[] = [];
  if (sessionIds.length > 0) {
    const { data: steps } = await supabase
      .from("steps")
      .select("*")
      .in("session_id", sessionIds)
      .order("step_number", { ascending: true });
    const rawSteps = (steps as Step[]) || [];

    // Sort by session order then step_number, then renumber globally
    const sessionOrder = new Map(sessionIds.map((id, i) => [id, i]));
    rawSteps.sort((a, b) => {
      const sa = sessionOrder.get(a.session_id) ?? 0;
      const sb = sessionOrder.get(b.session_id) ?? 0;
      if (sa !== sb) return sa - sb;
      return a.step_number - b.step_number;
    });
    allSteps = rawSteps.map((s, i) => ({ ...s, step_number: i + 1 }));
  }

  // Fetch all follow-ups
  let allFollowUps: FollowUp[] = [];
  if (sessionIds.length > 0) {
    const { data: followUps } = await supabase
      .from("follow_ups")
      .select("*")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true });
    allFollowUps = (followUps as FollowUp[]) || [];
  }

  // ---- Complexity breakdown ----
  const automateSteps = allSteps.filter((s) => s.complexity === "automate");
  const aiAssistSteps = allSteps.filter((s) => s.complexity === "ai_assist");
  const manualSteps = allSteps.filter((s) => s.complexity === "manual");
  const automationScore =
    allSteps.length > 0
      ? Math.round(
          ((automateSteps.length + aiAssistSteps.length * 0.5) /
            allSteps.length) *
            100
        )
      : 0;

  // ---- Tools inventory ----
  const toolCounts = new Map<string, number>();
  for (const step of allSteps) {
    for (const tool of step.tools_detected || []) {
      toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
    }
  }
  const toolsInventory = Array.from(toolCounts.entries())
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count);

  // ---- Data sources inventory ----
  const sourceCounts = new Map<string, number>();
  for (const step of allSteps) {
    for (const source of step.data_sources || []) {
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    }
  }
  const dataSourcesInventory = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // ---- Time estimates ----
  // Rough heuristics: automate=0.5h/step to build, ai_assist=1.5h, manual=0h (stays manual)
  const buildHours =
    automateSteps.length * 0.5 + aiAssistSteps.length * 1.5;
  // Manual execution: 3min per automate step, 5min per ai_assist, 8min per manual
  const manualHoursPerExecution =
    (automateSteps.length * 3 + aiAssistSteps.length * 5 + manualSteps.length * 8) / 60;
  const automatedHoursPerExecution =
    (automateSteps.length * 0.1 + aiAssistSteps.length * 1 + manualSteps.length * 8) / 60;
  const timeSavings =
    manualHoursPerExecution > 0
      ? Math.round(
          ((manualHoursPerExecution - automatedHoursPerExecution) /
            manualHoursPerExecution) *
            100
        )
      : 0;

  // ---- Recommendations ----
  const recommendations: BuildSpec["recommendations"] = [];

  // Group automatable steps by tool — flag multi-step tool integrations
  const toolGroups = new Map<string, number[]>();
  for (const step of automateSteps) {
    for (const tool of step.tools_detected || []) {
      if (!toolGroups.has(tool)) toolGroups.set(tool, []);
      toolGroups.get(tool)!.push(step.step_number);
    }
  }
  for (const [tool, stepNums] of toolGroups) {
    if (stepNums.length >= 2) {
      recommendations.push({
        priority: "high",
        type: "automate",
        description: `${stepNums.length} steps using ${tool} can be fully automated with API integration`,
        related_steps: stepNums,
      });
    }
  }

  // Cross-tool data flow — detect steps where data moves between systems
  const dataFlowSteps = allSteps.filter(
    (s) => s.tools_detected.length >= 2 || (s.data_sources && s.data_sources.length >= 2)
  );
  if (dataFlowSteps.length > 0) {
    recommendations.push({
      priority: "high",
      type: "automate",
      description: `${dataFlowSteps.length} step(s) involve data transfer between multiple tools — prime integration automation candidates`,
      related_steps: dataFlowSteps.map((s) => s.step_number),
    });
  }

  // Sequential automatable steps — flag uninterrupted automation chains
  let chainStart = -1;
  let chainLength = 0;
  for (let i = 0; i < allSteps.length; i++) {
    if (allSteps[i].complexity === "automate") {
      if (chainStart === -1) chainStart = i;
      chainLength++;
    } else {
      if (chainLength >= 3) {
        const chainSteps = allSteps
          .slice(chainStart, chainStart + chainLength)
          .map((s) => s.step_number);
        recommendations.push({
          priority: "high",
          type: "automate",
          description: `Steps ${chainSteps[0]}-${chainSteps[chainSteps.length - 1]} form an uninterrupted automation chain (${chainLength} consecutive automatable steps)`,
          related_steps: chainSteps,
        });
      }
      chainStart = -1;
      chainLength = 0;
    }
  }
  // Check if chain extends to the end
  if (chainLength >= 3) {
    const chainSteps = allSteps
      .slice(chainStart, chainStart + chainLength)
      .map((s) => s.step_number);
    recommendations.push({
      priority: "high",
      type: "automate",
      description: `Steps ${chainSteps[0]}-${chainSteps[chainSteps.length - 1]} form an uninterrupted automation chain (${chainLength} consecutive automatable steps)`,
      related_steps: chainSteps,
    });
  }

  // AI assist recommendations — group by action type for efficiency
  const aiAssistByType = new Map<string, Step[]>();
  for (const step of aiAssistSteps) {
    const type = step.action_type;
    if (!aiAssistByType.has(type)) aiAssistByType.set(type, []);
    aiAssistByType.get(type)!.push(step);
  }
  for (const [type, groupSteps] of aiAssistByType) {
    if (groupSteps.length >= 2) {
      recommendations.push({
        priority: "medium",
        type: "ai_assist",
        description: `${groupSteps.length} ${type.replace("_", " ")} steps could benefit from AI assistance — consider a unified AI workflow for these`,
        related_steps: groupSteps.map((s) => s.step_number),
      });
    } else {
      recommendations.push({
        priority: "medium",
        type: "ai_assist",
        description: `Step ${groupSteps[0].step_number} (${type.replace("_", " ")}) could benefit from AI assistance: ${groupSteps[0].description.slice(0, 100)}`,
        related_steps: [groupSteps[0].step_number],
      });
    }
  }

  // Decision steps without clear criteria — flag as investigation needed
  const unclearDecisions = allSteps.filter(
    (s) => s.action_type === "decision" && (!s.notes || s.notes.length < 10)
  );
  if (unclearDecisions.length > 0) {
    recommendations.push({
      priority: "high",
      type: "investigate",
      description: `${unclearDecisions.length} decision step(s) lack clear criteria — must clarify logic before automation`,
      related_steps: unclearDecisions.map((s) => s.step_number),
    });
  }

  // Unanswered follow-ups
  const unanswered = allFollowUps.filter((f) => f.status !== "answered");
  if (unanswered.length > 0) {
    recommendations.push({
      priority: "high",
      type: "investigate",
      description: `${unanswered.length} follow-up question(s) still unanswered — answers may reveal additional automation opportunities`,
      related_steps: [],
    });
  }

  const typedProject = project as Project;

  return {
    project: {
      name: typedProject.name,
      client_name: typedProject.client_name,
      department: typedProject.department,
      description: typedProject.description,
    },
    briefing: typedProject.briefing_summary,
    watch_list: typedProject.watch_list || [],
    sessions_summary: {
      total: allSessions.length,
      reviewed: reviewedSessions.length,
      total_duration_seconds: allSessions.reduce(
        (sum: number, s: { duration_seconds: number | null }) =>
          sum + (s.duration_seconds || 0),
        0
      ),
    },
    steps: allSteps,
    follow_ups: {
      total: allFollowUps.length,
      answered: allFollowUps.filter((f) => f.status === "answered").length,
      pending: allFollowUps.filter((f) => f.status !== "answered").length,
      items: allFollowUps,
    },
    complexity_breakdown: {
      automate: automateSteps.length,
      ai_assist: aiAssistSteps.length,
      manual: manualSteps.length,
      automation_score: automationScore,
    },
    tools_inventory: toolsInventory,
    data_sources_inventory: dataSourcesInventory,
    time_estimate: {
      total_steps: allSteps.length,
      estimated_hours_manual: Math.round(manualHoursPerExecution * 10) / 10,
      estimated_hours_automated: Math.round(automatedHoursPerExecution * 10) / 10,
      time_savings_percent: timeSavings,
    },
    recommendations: recommendations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    }),
  };
}

// ---- Markdown Export ----

export function specToMarkdown(spec: BuildSpec): string {
  const lines: string[] = [];

  lines.push(`# Build Spec: ${spec.project.name}`);
  lines.push(`**Client:** ${spec.project.client_name}`);
  if (spec.project.department) {
    lines.push(`**Department:** ${spec.project.department}`);
  }
  lines.push("");

  // Overview
  if (spec.briefing?.process_overview) {
    lines.push("## Process Overview");
    lines.push(spec.briefing.process_overview);
    lines.push("");
  }

  // Complexity
  lines.push("## Automation Analysis");
  lines.push(`- **Automation Score:** ${spec.complexity_breakdown.automation_score}%`);
  lines.push(`- **Fully Automatable:** ${spec.complexity_breakdown.automate} steps`);
  lines.push(`- **AI-Assisted:** ${spec.complexity_breakdown.ai_assist} steps`);
  lines.push(`- **Manual (stays human):** ${spec.complexity_breakdown.manual} steps`);
  lines.push(`- **Estimated Time Savings:** ${spec.time_estimate.time_savings_percent}% per execution`);
  lines.push("");

  // Tools
  if (spec.tools_inventory.length > 0) {
    lines.push("## Tools Inventory");
    for (const t of spec.tools_inventory) {
      lines.push(`- **${t.tool}** — used in ${t.count} step(s)`);
    }
    lines.push("");
  }

  // Steps
  if (spec.steps.length > 0) {
    lines.push("## Process Steps");
    for (const s of spec.steps) {
      const badge =
        s.complexity === "automate"
          ? "[AUTOMATE]"
          : s.complexity === "ai_assist"
            ? "[AI ASSIST]"
            : "[MANUAL]";
      lines.push(`${s.step_number}. ${badge} ${s.description}`);
      if (s.tools_detected.length > 0) {
        lines.push(`   - Tools: ${s.tools_detected.join(", ")}`);
      }
      if (s.notes) {
        lines.push(`   - Note: ${s.notes}`);
      }
    }
    lines.push("");
  }

  // Recommendations
  if (spec.recommendations.length > 0) {
    lines.push("## Recommendations");
    for (const r of spec.recommendations) {
      const badge = r.priority === "high" ? "!!!" : r.priority === "medium" ? "!!" : "!";
      lines.push(`- ${badge} ${r.description}`);
    }
    lines.push("");
  }

  // Follow-ups
  if (spec.follow_ups.total > 0) {
    lines.push("## Follow-up Questions");
    lines.push(`${spec.follow_ups.answered} of ${spec.follow_ups.total} answered`);
    lines.push("");
    for (const f of spec.follow_ups.items) {
      const status =
        f.status === "answered" ? "[ANSWERED]" : f.status === "sent" ? "[SENT]" : "[PENDING]";
      lines.push(`- ${status} ${f.question}`);
      if (f.response) {
        lines.push(`  > ${f.response}`);
      }
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`*Generated by RecordIt on ${new Date().toISOString().split("T")[0]}*`);

  return lines.join("\n");
}
