// ============================================
// RecordIt — Core Types
// ============================================

export type ProjectStatus = "active" | "completed" | "archived";
export type SessionStatus = "pending" | "recording" | "processing" | "reviewed";
export type ActionType =
  | "navigation"
  | "data_entry"
  | "decision"
  | "communication"
  | "lookup"
  | "validation"
  | "transformation";
export type Complexity = "automate" | "ai_assist" | "manual";
export type FollowUpStatus = "pending" | "sent" | "answered";

// ---- Projects ----

export interface BriefingSummary {
  process_overview: string;
  tools_mentioned: string[];
  pain_points: string[];
  key_entities: { name: string; type: string; description: string }[];
  open_questions: string[];
}

export interface WatchListItem {
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
}

export interface Project {
  id: string;
  name: string;
  client_name: string;
  department: string;
  description: string;
  status: ProjectStatus;
  briefing_transcript: string | null;
  briefing_summary: BriefingSummary | null;
  watch_list: WatchListItem[] | null;
  tags: string[];
  automation_score: number | null;
  created_at: string;
  updated_at: string;
}

// ---- Sessions ----

export interface Session {
  id: string;
  project_id: string;
  title: string;
  status: SessionStatus;
  instructions: string | null;
  recording_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}

// ---- Steps ----

export interface Step {
  id: string;
  session_id: string;
  step_number: number;
  timestamp_start: number | null;
  timestamp_end: number | null;
  description: string;
  tools_detected: string[];
  data_sources: string[];
  action_type: ActionType;
  complexity: Complexity;
  notes: string | null;
}

// ---- Follow-ups ----

export interface FollowUp {
  id: string;
  session_id: string;
  step_id: string | null;
  question: string;
  context: string;
  response: string | null;
  status: FollowUpStatus;
  created_at: string;
}

// ---- Narrations ----

export interface Narration {
  id: string;
  session_id: string;
  timestamp: number;
  text: string;
}

// ---- Recording Log (client-side) ----

export interface LogEntry {
  time: string;
  type: "action" | "narration" | "voice" | "system";
  text: string;
  timestamp?: number;
}
