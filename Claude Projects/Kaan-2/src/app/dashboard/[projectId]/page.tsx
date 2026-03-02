"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Video,
  FileOutput,
  Plus,
  Copy,
  ExternalLink,
  Clock,
  Loader2,
  Zap,
  Eye,
  Download,
  BarChart3,
  MoreVertical,
  Trash2,
  ArrowRightLeft,
  X,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Check,
  Tag,
  Activity,
} from "lucide-react";
import { timeAgo, formatDuration } from "@/lib/utils";
import type { Project, Session } from "@/lib/types";

type Tab = "briefing" | "sessions" | "spec";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("briefing");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProject(), fetchSessions()]).then(() =>
      setLoading(false)
    );
  }, [projectId]);

  async function fetchProject() {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  }

  const fetchSessions = useCallback(async () => {
    const res = await fetch(`/api/sessions?project_id=${projectId}`);
    if (res.ok) setSessions(await res.json());
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center">
        <p className="text-[rgba(229,231,235,0.45)]">Project not found</p>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "briefing", label: "Briefing", icon: <FileText className="w-3.5 h-3.5" /> },
    { key: "sessions", label: "Sessions", icon: <Video className="w-3.5 h-3.5" /> },
    { key: "spec", label: "Build Spec", icon: <FileOutput className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Back + Header */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-[rgba(229,231,235,0.4)] hover:text-green-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" />
        <span className="font-mono">Projects</span>
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-mono font-bold text-2xl text-[#e5e7eb]">
            {project.name}
          </h1>
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase bg-green-500/10 text-green-400">
            {project.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[rgba(229,231,235,0.35)]">
          <span>{project.client_name}</span>
          {project.department && (
            <>
              <span>·</span>
              <span>{project.department}</span>
            </>
          )}
        </div>
        {project.description && (
          <p className="text-sm text-[rgba(229,231,235,0.45)] mt-2">
            {project.description}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[rgba(34,197,94,0.08)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-green-500 text-green-400"
                : "border-transparent text-[rgba(229,231,235,0.4)] hover:text-[rgba(229,231,235,0.6)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "briefing" && (
        <BriefingTab project={project} sessions={sessions} onUpdate={fetchProject} />
      )}
      {activeTab === "sessions" && (
        <SessionsTab
          projectId={projectId}
          sessions={sessions}
          project={project}
          onUpdate={fetchSessions}
        />
      )}
      {activeTab === "spec" && (
        <SpecTab project={project} sessions={sessions} />
      )}
    </div>
  );
}

// ---- Briefing Tab ----

function BriefingTab({
  project,
  sessions,
  onUpdate,
}: {
  project: Project;
  sessions: Session[];
  onUpdate: () => void;
}) {
  const [transcript, setTranscript] = useState(
    project.briefing_transcript || ""
  );
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(
    !project.briefing_summary
  );

  async function saveTranscript() {
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ briefing_transcript: transcript }),
    });
    setSaving(false);
    onUpdate();
  }

  async function analyzeTranscript() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          transcript,
        }),
      });
      if (res.ok) {
        onUpdate();
      }
    } finally {
      setAnalyzing(false);
    }
  }

  const reviewedCount = sessions.filter((s) => s.status === "reviewed").length;
  const totalDuration = sessions.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Project Overview Card */}
      <div className="p-5 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-mono font-bold text-sm text-green-400 mb-1">
              Project Overview
            </h3>
            {project.description && (
              <p className="text-sm text-[#e5e7eb] leading-relaxed max-w-2xl">
                {project.description}
              </p>
            )}
          </div>
          {project.automation_score !== null && (
            <div className="text-right shrink-0 ml-4">
              <div className="font-mono font-bold text-2xl text-green-400">
                {project.automation_score}%
              </div>
              <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
                Automatable
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded bg-[#111] border border-[rgba(34,197,94,0.08)]">
            <div className="font-mono font-bold text-lg text-[#e5e7eb]">
              {sessions.length}
            </div>
            <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
              Sessions
            </div>
          </div>
          <div className="p-3 rounded bg-[#111] border border-[rgba(34,197,94,0.08)]">
            <div className="font-mono font-bold text-lg text-[#e5e7eb]">
              {reviewedCount}
            </div>
            <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
              Reviewed
            </div>
          </div>
          <div className="p-3 rounded bg-[#111] border border-[rgba(34,197,94,0.08)]">
            <div className="font-mono font-bold text-lg text-[#e5e7eb]">
              {totalDuration > 0 ? formatDuration(totalDuration) : "0:00"}
            </div>
            <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
              Total Recorded
            </div>
          </div>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a1a1a] font-mono text-[10px] text-green-400 border border-[rgba(34,197,94,0.1)]"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI-Extracted Briefing Summary (shown prominently if it exists) */}
      {project.briefing_summary && (
        <div className="space-y-4">
          <h3 className="font-mono font-bold text-sm text-green-400">
            AI-Extracted Context
          </h3>

          <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
            <h4 className="font-mono text-xs font-bold text-[rgba(229,231,235,0.55)] mb-2 uppercase tracking-wider">
              Process Overview
            </h4>
            <p className="text-sm text-[#e5e7eb] leading-relaxed">
              {project.briefing_summary.process_overview}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {project.briefing_summary.tools_mentioned.length > 0 && (
              <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
                <h4 className="font-mono text-xs font-bold text-[rgba(229,231,235,0.55)] mb-2 uppercase tracking-wider">
                  Tools Mentioned
                </h4>
                <div className="flex flex-wrap gap-2">
                  {project.briefing_summary.tools_mentioned.map((tool) => (
                    <span
                      key={tool}
                      className="px-2 py-1 rounded bg-[#1a1a1a] font-mono text-xs text-green-400 border border-[rgba(34,197,94,0.1)]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {project.briefing_summary.pain_points.length > 0 && (
              <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
                <h4 className="font-mono text-xs font-bold text-[rgba(229,231,235,0.55)] mb-2 uppercase tracking-wider">
                  Pain Points
                </h4>
                <ul className="space-y-1.5">
                  {project.briefing_summary.pain_points.map((point, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[#e5e7eb]"
                    >
                      <span className="text-red-400 mt-0.5">·</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {project.briefing_summary.open_questions.length > 0 && (
            <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
              <h4 className="font-mono text-xs font-bold text-[rgba(229,231,235,0.55)] mb-2 uppercase tracking-wider">
                Open Questions
              </h4>
              <ul className="space-y-1.5">
                {project.briefing_summary.open_questions.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[#e5e7eb]"
                  >
                    <span className="text-yellow-400 mt-0.5">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Watch List */}
      {project.watch_list && project.watch_list.length > 0 && (
        <div>
          <h3 className="font-mono font-bold text-sm text-green-400 mb-3">
            Watch List
          </h3>
          <p className="text-xs text-[rgba(229,231,235,0.3)] mb-3">
            Things the AI should look for during recordings.
          </p>
          <div className="space-y-2">
            {project.watch_list.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]"
              >
                <span
                  className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    item.priority === "high"
                      ? "bg-red-400"
                      : item.priority === "medium"
                        ? "bg-yellow-400"
                        : "bg-gray-400"
                  }`}
                />
                <div>
                  <p className="text-sm text-[#e5e7eb]">{item.description}</p>
                  <span className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase">
                    {item.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Transcript Section */}
      <div className="border border-[rgba(34,197,94,0.1)] rounded-lg overflow-hidden">
        <button
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#0f0f0f] hover:bg-[#111] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[rgba(229,231,235,0.4)]" />
            <span className="font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)]">
              Call Transcript / Notes
            </span>
            {project.briefing_transcript && (
              <span className="px-1.5 py-0.5 rounded bg-green-500/10 font-mono text-[10px] text-green-400">
                saved
              </span>
            )}
          </div>
          {transcriptOpen ? (
            <ChevronUp className="w-4 h-4 text-[rgba(229,231,235,0.3)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[rgba(229,231,235,0.3)]" />
          )}
        </button>

        {transcriptOpen && (
          <div className="p-4 border-t border-[rgba(34,197,94,0.06)]">
            <p className="text-xs text-[rgba(229,231,235,0.3)] mb-3">
              Paste your first call transcript or notes. AI will extract
              context, tools, pain points, and generate a watch list.
            </p>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={8}
              placeholder="Paste your call transcript or notes here..."
              className="w-full px-4 py-3 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded-lg text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.15)] focus:outline-none focus:border-green-500 transition-colors resize-y font-sans leading-relaxed"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={saveTranscript}
                disabled={saving || !transcript.trim()}
                className="px-4 py-2 font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] border border-[rgba(229,231,235,0.1)] rounded hover:border-green-500 hover:text-green-400 transition-colors disabled:opacity-30"
              >
                {saving ? "Saving..." : "Save Transcript"}
              </button>
              <button
                onClick={analyzeTranscript}
                disabled={analyzing || !transcript.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze with AI"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Sessions Tab ----

function SessionsTab({
  projectId,
  sessions,
  project,
  onUpdate,
}: {
  projectId: string;
  sessions: Session[];
  project: Project;
  onUpdate: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [moveSessionId, setMoveSessionId] = useState<string | null>(null);
  const [otherProjects, setOtherProjects] = useState<
    { id: string; name: string }[]
  >([]);

  // Poll for updates while any session is processing
  const hasProcessing = sessions.some((s) => s.status === "processing");
  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(onUpdate, 5000);
    return () => clearInterval(interval);
  }, [hasProcessing, onUpdate]);

  async function analyzeSession(sessionId: string) {
    setAnalyzingId(sessionId);
    try {
      const res = await fetch("/api/analyze/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (res.ok) {
        onUpdate();
      }
    } finally {
      setAnalyzingId(null);
    }
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          title,
          task_description: taskDescription || null,
        }),
      });
      if (res.ok) {
        setTitle("");
        setTaskDescription("");
        setShowCreate(false);
        onUpdate();
      }
    } finally {
      setCreating(false);
    }
  }

  function copyRecordingLink(sessionId: string) {
    const url = `${window.location.origin}/record/${sessionId}`;
    navigator.clipboard.writeText(url);
  }

  async function deleteSession(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    onUpdate();
  }

  async function duplicateSession(id: string) {
    setMenuOpen(null);
    await fetch(`/api/sessions/${id}/duplicate`, { method: "POST" });
    onUpdate();
  }

  async function openMoveModal(sessionId: string) {
    setMenuOpen(null);
    // Fetch all projects to show as targets
    const res = await fetch("/api/projects");
    if (res.ok) {
      const all = await res.json();
      setOtherProjects(
        all
          .filter((p: { id: string }) => p.id !== projectId)
          .map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }))
      );
    }
    setMoveSessionId(sessionId);
  }

  async function moveSession(targetProjectId: string) {
    if (!moveSessionId) return;
    await fetch(`/api/sessions/${moveSessionId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_project_id: targetProjectId }),
    });
    setMoveSessionId(null);
    onUpdate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-[rgba(229,231,235,0.35)]">
          {sessions.length} recording session{sessions.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New Session
        </button>
      </div>

      {/* Create Session */}
      {showCreate && (
        <div className="mb-6 p-5 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.2)]">
          <h3 className="font-mono font-bold text-sm text-[#e5e7eb] mb-3">
            New Recording Session
          </h3>
          <form onSubmit={createSession} className="space-y-3">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Session title (e.g. Invoice processing walkthrough)"
              className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.2)] focus:outline-none focus:border-green-500 transition-colors"
            />
            <input
              type="text"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="What task are you about to do? (e.g. Process a purchase order from email to SAP)"
              className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.2)] focus:outline-none focus:border-green-500 transition-colors"
            />
            <p className="text-[10px] text-[rgba(229,231,235,0.2)]">
              Recording instructions will be auto-generated from your briefing context
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 font-mono text-xs text-[rgba(229,231,235,0.45)] border border-[rgba(229,231,235,0.1)] rounded hover:border-[rgba(229,231,235,0.2)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-3 py-1.5 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Session"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 p-6 rounded-lg bg-[#0f0f0f] border border-red-500/20">
            <h2 className="font-mono font-bold text-lg text-[#e5e7eb] mb-2">
              Delete Session?
            </h2>
            <p className="text-sm text-[rgba(229,231,235,0.45)] mb-6">
              This will permanently delete this session, its recording, steps,
              and analysis. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] border border-[rgba(229,231,235,0.1)] rounded hover:border-[rgba(229,231,235,0.2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSession(confirmDelete)}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-mono text-xs font-bold rounded hover:bg-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Session Modal */}
      {moveSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 p-6 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono font-bold text-lg text-[#e5e7eb]">
                Move to Project
              </h2>
              <button
                onClick={() => setMoveSessionId(null)}
                className="p-1 text-[rgba(229,231,235,0.3)] hover:text-[rgba(229,231,235,0.6)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {otherProjects.length === 0 ? (
              <p className="text-sm text-[rgba(229,231,235,0.4)]">
                No other projects to move to.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {otherProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => moveSession(p.id)}
                    className="w-full text-left px-3 py-2.5 rounded bg-[#111] border border-[rgba(229,231,235,0.06)] hover:border-green-500 hover:bg-green-500/5 transition-colors"
                  >
                    <span className="font-mono text-sm text-[#e5e7eb]">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 && !showCreate && (
        <div className="text-center py-12">
          <Video className="w-8 h-8 mx-auto mb-3 text-[rgba(229,231,235,0.15)]" />
          <p className="text-sm text-[rgba(229,231,235,0.35)]">
            No recording sessions yet
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="p-4 rounded-lg bg-[#0f0f0f] card-glow"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono font-bold text-sm text-[#e5e7eb]">
                {session.title}
              </h4>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase ${
                    session.status === "pending"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : session.status === "recording"
                        ? "bg-red-500/10 text-red-400"
                        : session.status === "processing"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-green-500/10 text-green-400"
                  }`}
                >
                  {session.status === "processing" && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  {session.status}
                </span>

                {/* Session Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(
                        menuOpen === session.id ? null : session.id
                      )
                    }
                    className="p-1 rounded text-[rgba(229,231,235,0.2)] hover:text-[rgba(229,231,235,0.5)] hover:bg-[rgba(229,231,235,0.05)] transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {menuOpen === session.id && (
                    <div className="absolute right-0 top-7 z-40 w-44 py-1 rounded-lg bg-[#151515] border border-[rgba(229,231,235,0.1)] shadow-xl">
                      <button
                        onClick={() => duplicateSession(session.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[rgba(229,231,235,0.6)] hover:bg-[rgba(229,231,235,0.05)] hover:text-[#e5e7eb] transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => openMoveModal(session.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[rgba(229,231,235,0.6)] hover:bg-[rgba(229,231,235,0.05)] hover:text-[#e5e7eb] transition-colors"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Move to Project
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(null);
                          setConfirmDelete(session.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[rgba(229,231,235,0.3)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(session.created_at)}
              </span>
              {session.duration_seconds && (
                <span>{formatDuration(session.duration_seconds)}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => copyRecordingLink(session.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-semibold text-green-400 border border-[rgba(34,197,94,0.2)] rounded hover:bg-green-500/10 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy Link
              </button>
              <Link
                href={`/record/${session.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-semibold text-[rgba(229,231,235,0.45)] border border-[rgba(229,231,235,0.1)] rounded hover:border-[rgba(229,231,235,0.2)] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open
              </Link>
              {session.status === "processing" && (
                <button
                  onClick={() => analyzeSession(session.id)}
                  disabled={analyzingId === session.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500 text-black font-mono text-[10px] font-bold rounded hover:bg-green-400 transition-colors disabled:opacity-50"
                >
                  {analyzingId === session.id ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      Analyze
                    </>
                  )}
                </button>
              )}
              {session.status === "reviewed" && (
                <Link
                  href={`/dashboard/${projectId}/sessions/${session.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-semibold text-green-400 border border-[rgba(34,197,94,0.2)] rounded hover:bg-green-500/10 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  View Analysis
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Spec Tab ----

interface SpecData {
  complexity_breakdown: {
    automate: number;
    ai_assist: number;
    manual: number;
    automation_score: number;
  };
  time_estimate: {
    total_steps: number;
    estimated_hours_manual: number;
    estimated_hours_automated: number;
    time_savings_percent: number;
  };
  tools_inventory: { tool: string; count: number }[];
  recommendations: {
    priority: string;
    type: string;
    description: string;
    related_steps: number[];
  }[];
  steps: { step_number: number; description: string; complexity: string }[];
}

function SpecTab({
  project,
  sessions,
}: {
  project: Project;
  sessions: Session[];
}) {
  const [spec, setSpec] = useState<SpecData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewedSessions = sessions.filter((s) => s.status === "reviewed");

  async function generateSpec() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/spec?format=json`);
      if (res.ok) {
        setSpec(await res.json());
      } else {
        const data = await res.json();
        setError(data.error || "Failed to generate spec");
      }
    } catch {
      setError("Failed to generate spec");
    } finally {
      setGenerating(false);
    }
  }

  function downloadMarkdown() {
    window.open(`/api/projects/${project.id}/spec?format=markdown`, "_blank");
  }

  if (reviewedSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileOutput className="w-8 h-8 mx-auto mb-3 text-[rgba(229,231,235,0.15)]" />
        <p className="text-sm text-[rgba(229,231,235,0.35)] mb-2">
          No build spec available yet
        </p>
        <p className="text-xs text-[rgba(229,231,235,0.25)]">
          Complete and review at least one recording session to generate a spec.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generate / Download */}
      <div className="flex items-center gap-3">
        <button
          onClick={generateSpec}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <BarChart3 className="w-3.5 h-3.5" />
              Generate Build Spec
            </>
          )}
        </button>
        {spec && (
          <>
            <button
              onClick={downloadMarkdown}
              className="inline-flex items-center gap-2 px-4 py-2 font-mono text-xs font-semibold text-green-400 border border-[rgba(34,197,94,0.2)] rounded hover:bg-green-500/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download .md
            </button>
            <button
              onClick={() =>
                window.open(
                  `/api/projects/${project.id}/spec/pdf`,
                  "_blank"
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2 font-mono text-xs font-semibold text-green-400 border border-[rgba(34,197,94,0.2)] rounded hover:bg-green-500/10 transition-colors"
            >
              <FileOutput className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {spec && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
              <div className="font-mono font-bold text-2xl text-green-400">
                {spec.complexity_breakdown.automation_score}%
              </div>
              <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
                Automation Score
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
              <div className="font-mono font-bold text-2xl text-green-400">
                {spec.time_estimate.time_savings_percent}%
              </div>
              <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
                Time Savings
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
              <div className="font-mono font-bold text-2xl text-[#e5e7eb]">
                {spec.time_estimate.total_steps}
              </div>
              <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
                Total Steps
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
              <div className="font-mono font-bold text-2xl text-[#e5e7eb]">
                {spec.tools_inventory.length}
              </div>
              <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
                Tools Used
              </div>
            </div>
          </div>

          {/* Complexity Breakdown */}
          <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
            <h4 className="font-mono text-xs font-bold text-[rgba(229,231,235,0.55)] mb-3 uppercase tracking-wider">
              Complexity Breakdown
            </h4>
            <div className="flex gap-1 h-6 rounded overflow-hidden mb-3">
              {spec.complexity_breakdown.automate > 0 && (
                <div
                  className="bg-green-500 rounded-sm"
                  style={{
                    width: `${(spec.complexity_breakdown.automate / spec.time_estimate.total_steps) * 100}%`,
                  }}
                />
              )}
              {spec.complexity_breakdown.ai_assist > 0 && (
                <div
                  className="bg-yellow-500 rounded-sm"
                  style={{
                    width: `${(spec.complexity_breakdown.ai_assist / spec.time_estimate.total_steps) * 100}%`,
                  }}
                />
              )}
              {spec.complexity_breakdown.manual > 0 && (
                <div
                  className="bg-red-500 rounded-sm"
                  style={{
                    width: `${(spec.complexity_breakdown.manual / spec.time_estimate.total_steps) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[rgba(229,231,235,0.5)]">
                  Automate ({spec.complexity_breakdown.automate})
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-[rgba(229,231,235,0.5)]">
                  AI Assist ({spec.complexity_breakdown.ai_assist})
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[rgba(229,231,235,0.5)]">
                  Manual ({spec.complexity_breakdown.manual})
                </span>
              </span>
            </div>
          </div>

          {/* Recommendations */}
          {spec.recommendations.length > 0 && (
            <div>
              <h4 className="font-mono text-xs font-bold text-green-400 mb-3 uppercase tracking-wider">
                Recommendations
              </h4>
              <div className="space-y-2">
                {spec.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]"
                  >
                    <span
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        rec.priority === "high"
                          ? "bg-red-400"
                          : rec.priority === "medium"
                            ? "bg-yellow-400"
                            : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm text-[#e5e7eb]">
                        {rec.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase">
                          {rec.type.replace("_", " ")}
                        </span>
                        {rec.related_steps.length > 0 && (
                          <span className="font-mono text-[10px] text-[rgba(229,231,235,0.2)]">
                            Steps: {rec.related_steps.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tools Inventory */}
          {spec.tools_inventory.length > 0 && (
            <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.15)]">
              <h4 className="font-mono text-xs font-bold text-[rgba(229,231,235,0.55)] mb-3 uppercase tracking-wider">
                Tools Inventory
              </h4>
              <div className="flex flex-wrap gap-2">
                {spec.tools_inventory.map((t) => (
                  <span
                    key={t.tool}
                    className="px-2.5 py-1 rounded bg-[#1a1a1a] font-mono text-xs text-green-400 border border-[rgba(34,197,94,0.1)]"
                  >
                    {t.tool}
                    <span className="ml-1.5 text-[rgba(229,231,235,0.3)]">
                      x{t.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
