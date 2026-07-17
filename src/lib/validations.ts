import { z } from "zod";

// ---- Projects ----

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  client_name: z.string().min(1, "Client name is required").max(200),
  department: z.string().max(200).optional().default(""),
  description: z.string().max(2000).optional().default(""),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  client_name: z.string().min(1).max(200).optional(),
  department: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  briefing_transcript: z.string().optional().nullable(),
  briefing_summary: z.any().optional().nullable(),
  watch_list: z.any().optional().nullable(),
});

// ---- Sessions ----

export const createSessionSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  title: z.string().min(1, "Title is required").max(300),
  instructions: z.string().max(5000).optional().nullable(),
  task_description: z.string().max(2000).optional().nullable(),
});

export const updateSessionSchema = z.object({
  status: z.enum(["pending", "recording", "processing", "reviewed"]).optional(),
  duration_seconds: z.number().int().min(0).optional(),
  recording_url: z.string().url().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
});

// ---- Narrations ----

export const createNarrationSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
  timestamp: z.number().min(0),
  text: z.string().min(1, "Narration text is required").max(5000),
});

// ---- Briefing Analysis ----

export const analyzeBriefingSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  transcript: z.string().min(1, "Transcript is required"),
});

// ---- Session Analysis ----

export const analyzeSessionSchema = z.object({
  session_id: z.string().uuid("Invalid session ID"),
});

// ---- Steps ----

export const updateStepSchema = z.object({
  description: z.string().min(1).max(2000).optional(),
  action_type: z
    .enum(["navigation", "data_entry", "decision", "communication", "lookup", "validation", "transformation"])
    .optional(),
  complexity: z.enum(["automate", "ai_assist", "manual"]).optional(),
  notes: z.string().max(5000).optional().nullable(),
  tools_detected: z.array(z.string()).optional(),
  data_sources: z.array(z.string()).optional(),
});

// ---- Move Session ----

export const moveSessionSchema = z.object({
  target_project_id: z.string().uuid("Invalid target project ID"),
});

// ---- Follow-ups ----

export const updateFollowUpSchema = z.object({
  status: z.enum(["pending", "sent", "answered"]).optional(),
  response: z.string().max(5000).optional().nullable(),
});

// ---- Helpers ----

export function validate<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    return { success: false as const, error: message };
  }
  return { success: true as const, data: result.data };
}
