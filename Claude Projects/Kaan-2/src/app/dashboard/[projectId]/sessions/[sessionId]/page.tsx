"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Edit3,
  Check,
  X,
  Send,
  CheckCircle,
  Play,
  Video,
  Copy,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import { formatDuration, timeAgo } from "@/lib/utils";
import type {
  Session,
  Step,
  FollowUp,
  ActionType,
  Complexity,
  WatchListItem,
} from "@/lib/types";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId, sessionId } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [watchList, setWatchList] = useState<WatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"steps" | "followups" | "watchlist">("steps");
  const [currentTime, setCurrentTime] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    Promise.all([fetchSession(), fetchSteps(), fetchFollowUps(), fetchWatchList()]).then(() =>
      setLoading(false)
    );
  }, [sessionId]);

  async function fetchSession() {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) setSession(await res.json());
  }

  async function fetchSteps() {
    const res = await fetch(`/api/steps?session_id=${sessionId}`);
    if (res.ok) setSteps(await res.json());
  }

  async function fetchFollowUps() {
    const res = await fetch(`/api/follow-ups?session_id=${sessionId}`);
    if (res.ok) setFollowUps(await res.json());
  }

  async function fetchWatchList() {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const project = await res.json();
      setWatchList(project.watch_list || []);
    }
  }

  const seekTo = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Derive active step from current playback time
  const activeStepId =
    steps.find(
      (s) =>
        s.timestamp_start !== null &&
        s.timestamp_end !== null &&
        currentTime >= s.timestamp_start &&
        currentTime < s.timestamp_end
    )?.id || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 text-center">
        <p className="text-[rgba(229,231,235,0.45)]">Session not found</p>
      </div>
    );
  }

  const automateCount = steps.filter((s) => s.complexity === "automate").length;
  const aiAssistCount = steps.filter(
    (s) => s.complexity === "ai_assist"
  ).length;
  const manualCount = steps.filter((s) => s.complexity === "manual").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href={`/dashboard/${projectId}`}
        className="inline-flex items-center gap-1.5 text-xs text-[rgba(229,231,235,0.4)] hover:text-green-400 transition-colors mb-6"
      >
        <ArrowLeft className="w-3 h-3" />
        <span className="font-mono">Back to Project</span>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-mono font-bold text-2xl text-[#e5e7eb]">
            {session.title}
          </h1>
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase bg-green-500/10 text-green-400">
            {session.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[rgba(229,231,235,0.35)]">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(session.created_at)}
          </span>
          {session.duration_seconds && (
            <span>{formatDuration(session.duration_seconds)} recorded</span>
          )}
          <span>{steps.length} steps extracted</span>
          <span>{followUps.length} follow-ups</span>
        </div>
      </div>

      {/* Video Player */}
      {session.recording_url && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Video className="w-4 h-4 text-green-400" />
            <span className="font-mono text-xs font-semibold text-[rgba(229,231,235,0.6)] uppercase tracking-wider">
              Recording
            </span>
          </div>
          <CustomVideoPlayer
            videoRef={videoRef}
            src={session.recording_url}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            onError={() => setVideoError(true)}
            duration={session.duration_seconds || 0}
          />

          {videoError && (
            <div className="mt-2 p-3 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
              Recording failed to load — the file may be corrupted or the URL has expired.
            </div>
          )}

          {/* Step Segments Bar */}
          {steps.length > 0 && session.duration_seconds && (
            <StepSegmentsBar
              steps={steps}
              duration={session.duration_seconds}
              currentTime={currentTime}
              onSeek={seekTo}
            />
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]">
          <div className="font-mono font-bold text-lg text-green-400">
            {automateCount}
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
            Automatable
          </div>
        </div>
        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]">
          <div className="font-mono font-bold text-lg text-yellow-400">
            {aiAssistCount}
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
            AI-Assist
          </div>
        </div>
        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]">
          <div className="font-mono font-bold text-lg text-red-400">
            {manualCount}
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
            Manual
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 mb-6 border-b border-[rgba(34,197,94,0.08)]">
        <button
          onClick={() => setActiveView("steps")}
          className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs font-semibold transition-colors border-b-2 -mb-px ${
            activeView === "steps"
              ? "border-green-500 text-green-400"
              : "border-transparent text-[rgba(229,231,235,0.4)] hover:text-[rgba(229,231,235,0.6)]"
          }`}
        >
          Steps Timeline ({steps.length})
        </button>
        <button
          onClick={() => setActiveView("followups")}
          className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs font-semibold transition-colors border-b-2 -mb-px ${
            activeView === "followups"
              ? "border-green-500 text-green-400"
              : "border-transparent text-[rgba(229,231,235,0.4)] hover:text-[rgba(229,231,235,0.6)]"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Follow-ups ({followUps.length})
        </button>
        {watchList.length > 0 && (
          <button
            onClick={() => setActiveView("watchlist")}
            className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs font-semibold transition-colors border-b-2 -mb-px ${
              activeView === "watchlist"
                ? "border-green-500 text-green-400"
                : "border-transparent text-[rgba(229,231,235,0.4)] hover:text-[rgba(229,231,235,0.6)]"
            }`}
          >
            Watch List ({watchList.length})
          </button>
        )}
      </div>

      {/* Content */}
      {activeView === "steps" && (
        <StepsTimeline
          steps={steps}
          onUpdate={fetchSteps}
          activeStepId={activeStepId}
          onSeek={session.recording_url ? seekTo : undefined}
        />
      )}
      {activeView === "followups" && (
        <FollowUpsList followUps={followUps} onUpdate={fetchFollowUps} />
      )}
      {activeView === "watchlist" && (
        <WatchListCoverage watchList={watchList} steps={steps} />
      )}
    </div>
  );
}

// ---- Custom Video Player ----

function CustomVideoPlayer({
  videoRef,
  src,
  currentTime,
  setCurrentTime,
  onError,
  duration: knownDuration,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  src: string;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  onError: () => void;
  duration: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(knownDuration);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Use known duration as fallback since WebM metadata can be unreliable
  const effectiveDuration =
    videoDuration > 0 ? videoDuration : knownDuration;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onDurationChange = () => {
      if (video.duration && isFinite(video.duration)) {
        setVideoDuration(video.duration);
      }
    };
    const onTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [videoRef, isDragging, setCurrentTime]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  function toggleFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen().catch(() => {});
    }
  }

  function getTimeFromEvent(e: React.MouseEvent | MouseEvent) {
    if (!progressRef.current || effectiveDuration <= 0) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * effectiveDuration;
  }

  function handleProgressClick(e: React.MouseEvent) {
    const time = getTimeFromEvent(e);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    setDragTime(getTimeFromEvent(e));

    const handleMove = (moveEvent: MouseEvent) => {
      const time = getTimeFromEvent(moveEvent);
      setDragTime(time);
    };

    const handleUp = (upEvent: MouseEvent) => {
      const time = getTimeFromEvent(upEvent);
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }

  function handleProgressHover(e: React.MouseEvent) {
    setHoverTime(getTimeFromEvent(e));
  }

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent =
    effectiveDuration > 0 ? (displayTime / effectiveDuration) * 100 : 0;

  return (
    <div className="rounded-lg overflow-hidden bg-black border border-[rgba(34,197,94,0.1)]">
      {/* Video */}
      <div className="relative group cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={src}
          onError={onError}
          className="w-full max-h-[480px]"
          playsInline
          preload="metadata"
        />
        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center border border-[rgba(229,231,235,0.2)]">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-3 py-2 bg-[#0a0a0a] border-t border-[rgba(34,197,94,0.06)]">
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="group/progress relative h-5 flex items-center cursor-pointer mb-1"
          onClick={handleProgressClick}
          onMouseDown={handleDragStart}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Track */}
          <div className="absolute left-0 right-0 h-1 rounded-full bg-[rgba(229,231,235,0.1)] group-hover/progress:h-1.5 transition-all">
            {/* Filled */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-green-500"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
            {/* Hover preview */}
            {hoverTime !== null && effectiveDuration > 0 && (
              <div
                className="absolute top-0 h-full rounded-full bg-[rgba(229,231,235,0.15)]"
                style={{
                  width: `${(hoverTime / effectiveDuration) * 100}%`,
                }}
              />
            )}
          </div>
          {/* Thumb */}
          <div
            className="absolute w-3 h-3 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)] -translate-x-1/2 opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{
              left: `${Math.min(progressPercent, 100)}%`,
            }}
          />
        </div>

        {/* Bottom row: play, time, volume, fullscreen */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-1 text-[rgba(229,231,235,0.6)] hover:text-white transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={toggleMute}
              className="p-1 text-[rgba(229,231,235,0.6)] hover:text-white transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <span className="font-mono text-[10px] text-[rgba(229,231,235,0.4)] tabular-nums">
              {formatDuration(Math.floor(displayTime))} /{" "}
              {formatDuration(Math.floor(effectiveDuration))}
            </span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="p-1 text-[rgba(229,231,235,0.6)] hover:text-white transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Step Segments Bar ----

function StepSegmentsBar({
  steps,
  duration,
  currentTime,
  onSeek,
}: {
  steps: Step[];
  duration: number;
  currentTime: number;
  onSeek: (seconds: number) => void;
}) {
  const segmentSteps = steps.filter(
    (s) => s.timestamp_start !== null && s.timestamp_end !== null
  );

  const complexitySegmentColors: Record<Complexity, string> = {
    automate: "bg-green-500/40 hover:bg-green-500/60",
    ai_assist: "bg-yellow-500/40 hover:bg-yellow-500/60",
    manual: "bg-red-500/40 hover:bg-red-500/60",
  };

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-2 px-1">
      {/* Time labels */}
      <div className="flex justify-between mb-1">
        <span className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] tabular-nums">
          {formatDuration(Math.floor(currentTime))}
        </span>
        <span className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-7 bg-[#111] rounded-md overflow-hidden border border-[rgba(34,197,94,0.08)]">
        {/* Step segments */}
        {segmentSteps.map((step) => {
          const left = ((step.timestamp_start! / duration) * 100);
          const width = (((step.timestamp_end! - step.timestamp_start!) / duration) * 100);
          return (
            <button
              key={step.id}
              onClick={() => onSeek(step.timestamp_start!)}
              title={`Step ${step.step_number}: ${step.description}`}
              className={`absolute top-0 h-full flex items-center justify-center transition-colors cursor-pointer ${complexitySegmentColors[step.complexity]}`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
            >
              {width > 4 && (
                <span className="font-mono text-[9px] font-bold text-white/80 drop-shadow-sm">
                  {step.step_number}
                </span>
              )}
            </button>
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)] pointer-events-none z-10 transition-[left] duration-200"
          style={{ left: `${playheadPercent}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1.5">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-500/50" />
          <span className="font-mono text-[9px] text-[rgba(229,231,235,0.3)]">Automate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-yellow-500/50" />
          <span className="font-mono text-[9px] text-[rgba(229,231,235,0.3)]">AI Assist</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500/50" />
          <span className="font-mono text-[9px] text-[rgba(229,231,235,0.3)]">Manual</span>
        </div>
      </div>
    </div>
  );
}

// ---- Steps Timeline ----

function StepsTimeline({
  steps,
  onUpdate,
  activeStepId,
  onSeek,
}: {
  steps: Step[];
  onUpdate: () => void;
  activeStepId: string | null;
  onSeek?: (seconds: number) => void;
}) {
  if (steps.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[rgba(229,231,235,0.35)]">
          No steps extracted yet. Run analysis to extract steps.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-[rgba(34,197,94,0.1)]" />

      <div className="space-y-4">
        {steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            onUpdate={onUpdate}
            isActive={step.id === activeStepId}
            onSeek={onSeek}
          />
        ))}
      </div>
    </div>
  );
}

function StepCard({
  step,
  onUpdate,
  isActive,
  onSeek,
}: {
  step: Step;
  onUpdate: () => void;
  isActive: boolean;
  onSeek?: (seconds: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  // Auto-scroll to active step
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive]);
  const [editData, setEditData] = useState({
    description: step.description,
    action_type: step.action_type,
    complexity: step.complexity,
    notes: step.notes || "",
  });
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/steps/${step.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setEditing(false);
        onUpdate();
      }
    } finally {
      setSaving(false);
    }
  }

  const complexityColors: Record<Complexity, string> = {
    automate: "bg-green-500/10 text-green-400",
    ai_assist: "bg-yellow-500/10 text-yellow-400",
    manual: "bg-red-500/10 text-red-400",
  };

  const actionColors: Record<ActionType, string> = {
    navigation: "text-blue-400",
    data_entry: "text-purple-400",
    decision: "text-yellow-400",
    communication: "text-cyan-400",
    lookup: "text-orange-400",
    validation: "text-emerald-400",
    transformation: "text-pink-400",
  };

  return (
    <div ref={cardRef} className="relative pl-14">
      {/* Step number badge */}
      <div
        className={`absolute left-3.5 w-5 h-5 rounded-full bg-[#0f0f0f] flex items-center justify-center ${
          isActive
            ? "border-2 border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
            : "border border-[rgba(34,197,94,0.3)]"
        }`}
      >
        <span className="font-mono text-[9px] font-bold text-green-400">
          {step.step_number}
        </span>
      </div>

      <div
        className={`p-4 rounded-lg bg-[#0f0f0f] transition-all duration-300 ${
          isActive
            ? "border border-green-500/50 shadow-[0_0_16px_rgba(34,197,94,0.12)]"
            : "card-glow"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editing ? (
              <textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] focus:outline-none focus:border-green-500 transition-colors resize-none mb-2"
              />
            ) : (
              <p className="text-sm text-[#e5e7eb] leading-relaxed mb-2">
                {step.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {/* Complexity badge */}
              {editing ? (
                <select
                  value={editData.complexity}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      complexity: e.target.value as Complexity,
                    })
                  }
                  className="px-2 py-0.5 rounded bg-[#111] border border-[rgba(34,197,94,0.15)] font-mono text-[10px] text-[#e5e7eb] focus:outline-none focus:border-green-500"
                >
                  <option value="automate">Automate</option>
                  <option value="ai_assist">AI Assist</option>
                  <option value="manual">Manual</option>
                </select>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase ${complexityColors[step.complexity]}`}
                >
                  {step.complexity.replace("_", " ")}
                </span>
              )}

              {/* Action type */}
              {editing ? (
                <select
                  value={editData.action_type}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      action_type: e.target.value as ActionType,
                    })
                  }
                  className="px-2 py-0.5 rounded bg-[#111] border border-[rgba(34,197,94,0.15)] font-mono text-[10px] text-[#e5e7eb] focus:outline-none focus:border-green-500"
                >
                  <option value="navigation">Navigation</option>
                  <option value="data_entry">Data Entry</option>
                  <option value="decision">Decision</option>
                  <option value="communication">Communication</option>
                  <option value="lookup">Lookup</option>
                  <option value="validation">Validation</option>
                  <option value="transformation">Transformation</option>
                </select>
              ) : (
                <span
                  className={`font-mono text-[10px] ${actionColors[step.action_type]}`}
                >
                  {step.action_type.replace("_", " ")}
                </span>
              )}

              {/* Timestamp (clickable to seek) */}
              {step.timestamp_start !== null && (
                <button
                  onClick={() => onSeek?.(step.timestamp_start!)}
                  disabled={!onSeek}
                  className={`font-mono text-[10px] tabular-nums ${
                    onSeek
                      ? "text-[rgba(229,231,235,0.35)] hover:text-green-400 cursor-pointer transition-colors"
                      : "text-[rgba(229,231,235,0.25)]"
                  }`}
                  title={onSeek ? "Click to jump to this step in the video" : undefined}
                >
                  <Play className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                  {formatDuration(step.timestamp_start)}
                  {step.timestamp_end !== null &&
                    ` → ${formatDuration(step.timestamp_end)}`}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-3">
            {editing ? (
              <>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditData({
                      description: step.description,
                      action_type: step.action_type,
                      complexity: step.complexity,
                      notes: step.notes || "",
                    });
                  }}
                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 text-[rgba(229,231,235,0.3)] hover:text-green-400 hover:bg-green-500/10 rounded transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 text-[rgba(229,231,235,0.3)] hover:text-[rgba(229,231,235,0.6)] rounded transition-colors"
                >
                  {expanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {(expanded || editing) && (
          <div className="mt-3 pt-3 border-t border-[rgba(34,197,94,0.06)] space-y-3">
            {/* Tools */}
            {step.tools_detected.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-[rgba(229,231,235,0.35)] uppercase tracking-wider">
                  Tools:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {step.tools_detected.map((tool) => (
                    <span
                      key={tool}
                      className="px-1.5 py-0.5 rounded bg-[#1a1a1a] font-mono text-[10px] text-green-400 border border-[rgba(34,197,94,0.1)]"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Data Sources */}
            {step.data_sources.length > 0 && (
              <div>
                <span className="font-mono text-[10px] text-[rgba(229,231,235,0.35)] uppercase tracking-wider">
                  Data Sources:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {step.data_sources.map((src) => (
                    <span
                      key={src}
                      className="px-1.5 py-0.5 rounded bg-[#1a1a1a] font-mono text-[10px] text-blue-400 border border-blue-500/10"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {editing ? (
              <div>
                <span className="font-mono text-[10px] text-[rgba(229,231,235,0.35)] uppercase tracking-wider">
                  Notes:
                </span>
                <textarea
                  value={editData.notes}
                  onChange={(e) =>
                    setEditData({ ...editData, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Add notes..."
                  className="w-full mt-1 px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-xs text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.15)] focus:outline-none focus:border-green-500 transition-colors resize-none"
                />
              </div>
            ) : (
              step.notes && (
                <div>
                  <span className="font-mono text-[10px] text-[rgba(229,231,235,0.35)] uppercase tracking-wider">
                    Notes:
                  </span>
                  <p className="text-xs text-[rgba(229,231,235,0.55)] mt-1 leading-relaxed">
                    {step.notes}
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Follow-ups List ----

function FollowUpsList({
  followUps,
  onUpdate,
}: {
  followUps: FollowUp[];
  onUpdate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyAllQuestions() {
    const text = followUps
      .map((fu, i) => `${i + 1}. ${fu.question}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (followUps.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-8 h-8 mx-auto mb-3 text-[rgba(229,231,235,0.15)]" />
        <p className="text-sm text-[rgba(229,231,235,0.35)]">
          No follow-up questions yet. Run analysis to generate them.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={copyAllQuestions}
          className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-bold text-green-400 border border-green-500/20 rounded hover:bg-green-500/10 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy All Questions
            </>
          )}
        </button>
      </div>
      <div className="space-y-3">
        {followUps.map((fu) => (
          <FollowUpCard key={fu.id} followUp={fu} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

function FollowUpCard({
  followUp,
  onUpdate,
}: {
  followUp: FollowUp;
  onUpdate: () => void;
}) {
  const [response, setResponse] = useState(followUp.response || "");
  const [saving, setSaving] = useState(false);

  async function updateStatus(status: "sent" | "answered") {
    setSaving(true);
    try {
      const body: { status: string; response?: string } = { status };
      if (status === "answered" && response.trim()) {
        body.response = response.trim();
      }
      const res = await fetch(`/api/follow-ups/${followUp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onUpdate();
    } finally {
      setSaving(false);
    }
  }

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-400",
    sent: "bg-blue-500/10 text-blue-400",
    answered: "bg-green-500/10 text-green-400",
  };

  return (
    <div className="p-4 rounded-lg bg-[#0f0f0f] card-glow">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-[#e5e7eb] leading-relaxed flex-1">
          {followUp.question}
        </p>
        <span
          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase ml-3 shrink-0 ${statusColors[followUp.status]}`}
        >
          {followUp.status}
        </span>
      </div>

      {/* Context */}
      <p className="text-xs text-[rgba(229,231,235,0.35)] leading-relaxed mb-3">
        {followUp.context}
      </p>

      {/* Response area */}
      {followUp.status === "answered" && followUp.response ? (
        <div className="p-3 rounded bg-[rgba(34,197,94,0.03)] border border-[rgba(34,197,94,0.1)]">
          <span className="font-mono text-[10px] text-green-400 uppercase tracking-wider">
            Response:
          </span>
          <p className="text-sm text-[#e5e7eb] mt-1 leading-relaxed">
            {followUp.response}
          </p>
        </div>
      ) : (
        <div>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={2}
            placeholder="Record client's response..."
            className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-xs text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.15)] focus:outline-none focus:border-green-500 transition-colors resize-none mb-2"
          />
          <div className="flex items-center gap-2">
            {followUp.status === "pending" && (
              <button
                onClick={() => updateStatus("sent")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-bold text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/10 transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                Mark Sent
              </button>
            )}
            <button
              onClick={() => updateStatus("answered")}
              disabled={saving || !response.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-bold text-green-400 border border-green-500/20 rounded hover:bg-green-500/10 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3 h-3" />
              Save Response
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Watch List Coverage ----

function WatchListCoverage({
  watchList,
  steps,
}: {
  watchList: WatchListItem[];
  steps: Step[];
}) {
  // Build a searchable text from all steps for keyword matching
  const stepsText = steps
    .map(
      (s) =>
        `${s.description} ${s.tools_detected.join(" ")} ${s.data_sources.join(" ")} ${s.notes || ""}`
    )
    .join(" ")
    .toLowerCase();

  // Determine coverage for each watch item by keyword matching
  function getCoverage(item: WatchListItem): {
    status: "observed" | "likely_observed" | "not_observed";
    matchingSteps: number[];
  } {
    const keywords = item.description
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3); // Skip short common words

    const matchingSteps: number[] = [];
    for (const step of steps) {
      const stepText =
        `${step.description} ${step.tools_detected.join(" ")} ${step.data_sources.join(" ")} ${step.notes || ""}`.toLowerCase();
      const matchCount = keywords.filter((kw) => stepText.includes(kw)).length;
      if (matchCount >= Math.max(1, Math.floor(keywords.length * 0.3))) {
        matchingSteps.push(step.step_number);
      }
    }

    // Also check overall text for broader category matches
    const categoryKeywords: Record<string, string[]> = {
      data_flow: ["data", "transfer", "copy", "paste", "import", "export", "send", "receive"],
      decision_point: ["decide", "choose", "select", "approve", "reject", "route", "condition"],
      manual_step: ["manual", "type", "enter", "fill", "write", "input"],
      tool_usage: ["open", "launch", "use", "login", "navigate"],
      exception_handling: ["error", "fail", "wrong", "reject", "exception", "retry"],
    };

    const catWords = categoryKeywords[item.category] || [];
    const hasCategoryMatch = catWords.some((w) => stepsText.includes(w));

    if (matchingSteps.length > 0) return { status: "observed", matchingSteps };
    if (hasCategoryMatch) return { status: "likely_observed", matchingSteps: [] };
    return { status: "not_observed", matchingSteps: [] };
  }

  const coverageResults = watchList.map((item) => ({
    item,
    ...getCoverage(item),
  }));

  const observedCount = coverageResults.filter((r) => r.status === "observed").length;
  const missedCount = coverageResults.filter((r) => r.status === "not_observed").length;

  const statusConfig = {
    observed: { label: "Observed", color: "text-green-400", bg: "bg-green-500/10", dot: "bg-green-400" },
    likely_observed: { label: "Likely", color: "text-yellow-400", bg: "bg-yellow-500/10", dot: "bg-yellow-400" },
    not_observed: { label: "Not Seen", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400" },
  };

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-4 mb-6 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[rgba(229,231,235,0.5)]">
            {observedCount} observed
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-[rgba(229,231,235,0.5)]">
            {missedCount} not seen
          </span>
        </span>
        <span className="text-[rgba(229,231,235,0.25)]">
          Coverage based on keyword matching — review manually for accuracy
        </span>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {coverageResults.map((result, i) => {
          const config = statusConfig[result.status];
          return (
            <div
              key={i}
              className="p-4 rounded-lg bg-[#0f0f0f] card-glow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1">
                  <span
                    className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                      result.item.priority === "high"
                        ? "bg-red-400"
                        : result.item.priority === "medium"
                          ? "bg-yellow-400"
                          : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-[#e5e7eb]">
                      {result.item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase">
                        {result.item.category.replace("_", " ")}
                      </span>
                      <span className="font-mono text-[10px] text-[rgba(229,231,235,0.2)] uppercase">
                        {result.item.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase ml-3 shrink-0 ${config.bg} ${config.color}`}
                >
                  {config.label}
                </span>
              </div>

              {/* Matching steps */}
              {result.matchingSteps.length > 0 && (
                <div className="mt-2 pl-5">
                  <span className="font-mono text-[10px] text-[rgba(229,231,235,0.3)]">
                    Matched in steps:{" "}
                    {result.matchingSteps.map((n) => `#${n}`).join(", ")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
