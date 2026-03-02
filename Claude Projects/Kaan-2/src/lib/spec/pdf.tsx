import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { BuildSpec } from "@/lib/spec/generator";

const green = "#22c55e";
const yellow = "#eab308";
const red = "#ef4444";
const dark = "#111111";
const muted = "#888888";

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Courier",
    fontSize: 10,
    color: "#222",
    backgroundColor: "#ffffff",
  },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: muted, marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: dark,
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 8, color: muted, textTransform: "uppercase", marginTop: 2 },
  stepRow: {
    flexDirection: "row",
    marginBottom: 6,
    paddingVertical: 4,
  },
  stepNumber: {
    width: 24,
    fontSize: 10,
    fontWeight: "bold",
    color: dark,
  },
  badge: {
    fontSize: 7,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginRight: 6,
    textTransform: "uppercase",
  },
  stepDesc: { flex: 1, fontSize: 10, lineHeight: 1.4 },
  toolChip: {
    fontSize: 8,
    color: green,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 2,
    marginRight: 4,
    marginTop: 2,
  },
  recRow: { marginBottom: 6, paddingVertical: 2 },
  recPriority: { fontSize: 8, fontWeight: "bold", marginRight: 4 },
  fuRow: { marginBottom: 8, paddingVertical: 2 },
  fuStatus: {
    fontSize: 7,
    fontWeight: "bold",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 4,
  },
  fuResponse: {
    fontSize: 9,
    color: muted,
    marginTop: 2,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#d0d0d0",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  toolItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

function complexityColor(c: string) {
  if (c === "automate") return green;
  if (c === "ai_assist") return yellow;
  return red;
}

function complexityLabel(c: string) {
  if (c === "automate") return "AUTOMATE";
  if (c === "ai_assist") return "AI ASSIST";
  return "MANUAL";
}

export function BuildSpecPDF({ spec }: { spec: BuildSpec }) {
  const date = new Date().toISOString().split("T")[0];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <Text style={s.title}>Build Spec: {spec.project.name}</Text>
        <Text style={s.subtitle}>
          Client: {spec.project.client_name}
          {spec.project.department ? ` | Department: ${spec.project.department}` : ""}
          {` | Generated: ${date}`}
        </Text>

        {/* Process Overview */}
        {spec.briefing?.process_overview && (
          <>
            <Text style={s.sectionTitle}>Process Overview</Text>
            <Text style={{ marginBottom: 12, lineHeight: 1.5 }}>
              {spec.briefing.process_overview}
            </Text>
          </>
        )}

        {/* Stats Row */}
        <Text style={s.sectionTitle}>Automation Analysis</Text>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: green }]}>
              {spec.complexity_breakdown.automation_score}%
            </Text>
            <Text style={s.statLabel}>Automation Score</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: green }]}>
              {spec.complexity_breakdown.automate}
            </Text>
            <Text style={s.statLabel}>Automatable</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: yellow }]}>
              {spec.complexity_breakdown.ai_assist}
            </Text>
            <Text style={s.statLabel}>AI Assist</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: red }]}>
              {spec.complexity_breakdown.manual}
            </Text>
            <Text style={s.statLabel}>Manual</Text>
          </View>
        </View>

        {/* Time Estimate */}
        <View style={[s.statsRow, { marginTop: 0 }]}>
          <View style={s.statBox}>
            <Text style={[s.statValue, { fontSize: 16 }]}>
              {spec.time_estimate.time_savings_percent}%
            </Text>
            <Text style={s.statLabel}>Time Savings</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { fontSize: 16 }]}>
              {spec.time_estimate.total_steps}
            </Text>
            <Text style={s.statLabel}>Total Steps</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { fontSize: 16 }]}>
              {spec.sessions_summary.reviewed}/{spec.sessions_summary.total}
            </Text>
            <Text style={s.statLabel}>Sessions Reviewed</Text>
          </View>
        </View>

        {/* Tools Inventory */}
        {spec.tools_inventory.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Tools Inventory</Text>
            <View style={s.toolsGrid}>
              {spec.tools_inventory.map((t) => (
                <View key={t.tool} style={s.toolItem}>
                  <Text style={s.toolChip}>{t.tool}</Text>
                  <Text style={{ fontSize: 8, color: muted }}>
                    {t.count} step{t.count !== 1 ? "s" : ""}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Process Steps */}
        {spec.steps.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Process Steps</Text>
            {spec.steps.map((step) => (
              <View key={step.id} style={s.stepRow} wrap={false}>
                <Text style={s.stepNumber}>{step.step_number}.</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                    <Text
                      style={[
                        s.badge,
                        {
                          backgroundColor: complexityColor(step.complexity) + "22",
                          color: complexityColor(step.complexity),
                        },
                      ]}
                    >
                      {complexityLabel(step.complexity)}
                    </Text>
                    <Text style={{ fontSize: 8, color: muted }}>
                      {step.action_type.replace("_", " ")}
                    </Text>
                  </View>
                  <Text style={s.stepDesc}>{step.description}</Text>
                  {step.tools_detected.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 2 }}>
                      {step.tools_detected.map((tool) => (
                        <Text key={tool} style={s.toolChip}>
                          {tool}
                        </Text>
                      ))}
                    </View>
                  )}
                  {step.notes && (
                    <Text style={{ fontSize: 8, color: muted, marginTop: 2 }}>
                      Note: {step.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Recommendations */}
        {spec.recommendations.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Recommendations</Text>
            {spec.recommendations.map((rec, i) => (
              <View key={i} style={s.recRow} wrap={false}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={[
                      s.recPriority,
                      {
                        color:
                          rec.priority === "high"
                            ? red
                            : rec.priority === "medium"
                              ? yellow
                              : muted,
                      },
                    ]}
                  >
                    [{rec.priority.toUpperCase()}]
                  </Text>
                  <Text style={{ fontSize: 9 }}>{rec.description}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Follow-ups */}
        {spec.follow_ups.total > 0 && (
          <>
            <Text style={s.sectionTitle}>
              Follow-up Questions ({spec.follow_ups.answered}/{spec.follow_ups.total} answered)
            </Text>
            {spec.follow_ups.items.map((fu) => (
              <View key={fu.id} style={s.fuRow} wrap={false}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={[
                      s.fuStatus,
                      {
                        backgroundColor:
                          fu.status === "answered" ? green + "22" : yellow + "22",
                        color: fu.status === "answered" ? green : yellow,
                      },
                    ]}
                  >
                    {fu.status.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 10 }}>{fu.question}</Text>
                </View>
                {fu.response && (
                  <Text style={s.fuResponse}>{fu.response}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Footer */}
        <Text style={s.footer} fixed>
          Generated by RecordIt on {date}
        </Text>
      </Page>
    </Document>
  );
}
