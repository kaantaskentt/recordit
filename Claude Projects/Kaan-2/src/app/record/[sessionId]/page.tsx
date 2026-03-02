"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import {
  Circle,
  Square,
  Mic,
  MicOff,
  Monitor,
  CheckCircle,
  Loader2,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { Session, LogEntry } from "@/lib/types";

type Phase = "guide" | "recording" | "done";

// SpeechRecognition types for browser API
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export default function RecordPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("guide");
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [narration, setNarration] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [interimText, setInterimText] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync stream to video element when both are available
  // (video element mounts in RecordingPhase after phase changes)
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, phase]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  // Warn before leaving during recording
  useEffect(() => {
    if (phase !== "recording") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  async function fetchSession() {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) setSession(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function now(): string {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  }

  // Start speech recognition (Web Speech API)
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setLog((prev) => [
        ...prev,
        {
          time: now(),
          type: "system",
          text: "Voice transcription not supported in this browser — use typed notes instead.",
        },
      ]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        setInterimText("");
        const trimmed = transcript.trim();
        if (trimmed) {
          setLog((prev) => [
            ...prev,
            {
              time: now(),
              type: "voice",
              text: trimmed,
              timestamp: elapsedRef.current,
            },
          ]);
        }
      } else {
        setInterimText(transcript);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error);
      }
    };

    // Auto-restart when it stops (browser stops after silence)
    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Already running or stopped
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setMicActive(true);
    setLog((prev) => [
      ...prev,
      {
        time: now(),
        type: "system",
        text: "Voice transcription active — speak naturally as you work.",
      },
    ]);
  }, []);

  async function startRecording() {
    try {
      // 1. Get screen stream
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // 2. Get microphone stream
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        micStreamRef.current = micStream;
      } catch {
        console.warn("Microphone access denied — recording without mic audio.");
      }

      // 3. Mix audio streams using Web Audio API
      let recordingStream: MediaStream;

      if (micStream) {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const dest = audioCtx.createMediaStreamDestination();

        // Add display audio if present
        if (displayStream.getAudioTracks().length > 0) {
          const displayAudio = audioCtx.createMediaStreamSource(displayStream);
          displayAudio.connect(dest);
        }

        // Add mic audio
        const micAudio = audioCtx.createMediaStreamSource(micStream);
        micAudio.connect(dest);

        // Combined stream: screen video + mixed audio
        recordingStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } else {
        recordingStream = displayStream;
      }

      setStream(displayStream);

      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
        videoRef.current.play().catch(() => {});
      }

      // Set up MediaRecorder with combined stream
      const recorder = new MediaRecorder(recordingStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(1000);

      // Handle stream end (user stops sharing)
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      setPhase("recording");
      setLog([{ time: now(), type: "system", text: "Recording started" }]);

      // Start timer with ref for accurate timestamps
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);

      // Start frame capture every 7 seconds
      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;

      // Wait for video to have data before first capture
      if (videoRef.current) {
        videoRef.current.onloadeddata = () => {
          captureFrame(displayStream, canvas);
        };
      }

      frameTimerRef.current = setInterval(() => {
        captureFrame(displayStream, canvas);
      }, 7000);

      // Start speech recognition
      startSpeechRecognition();

      // Update session status
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "recording" }),
      });
    } catch (err) {
      console.error("Failed to start recording:", err);
      setLog((prev) => [
        ...prev,
        {
          time: now(),
          type: "system",
          text: "Failed to start screen share. Please allow screen sharing.",
        },
      ]);
    }
  }

  async function captureFrame(
    displayStream: MediaStream,
    canvas: HTMLCanvasElement
  ) {
    try {
      const videoTrack = displayStream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== "live") return;

      // Don't capture if video hasn't loaded actual frame data yet
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      const settings = videoTrack.getSettings();
      const w = settings.width || 1280;
      const h = settings.height || 720;

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8)
      );

      if (!blob) return;

      const ts = elapsedRef.current;
      const formData = new FormData();
      formData.append("file", blob, `${ts}.jpg`);
      formData.append("session_id", sessionId);
      formData.append("timestamp", ts.toString());

      await fetch("/api/sessions/frames", {
        method: "POST",
        body: formData,
      });

      setFrameCount((prev) => prev + 1);
      setLog((prev) => [
        ...prev,
        {
          time: now(),
          type: "system",
          text: `Frame captured (${ts}s)`,
        },
      ]);
    } catch (err) {
      console.error("Frame capture failed:", err);
    }
  }

  async function stopRecording() {
    // Debounce guard — prevent double-stop
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    // Stop speech recognition
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      ref.onend = null;
      ref.stop();
      setMicActive(false);
      setInterimText("");
    }

    // Stop frame capture timer
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop MediaRecorder
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    // Stop mic stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Close audio context
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    // Stop display stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setLog((prev) => [
      ...prev,
      {
        time: now(),
        type: "system",
        text: "Recording stopped — processing...",
      },
    ]);

    // Upload recording
    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    if (blob.size > 0) {
      await uploadRecording(blob);
    }

    // Update session
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "processing",
        duration_seconds: elapsedRef.current,
        completed_at: new Date().toISOString(),
      }),
    });

    // Save all narrations (typed + voice) with correct timestamps
    const narrationEntries = log.filter(
      (l) => l.type === "narration" || l.type === "voice"
    );
    for (const entry of narrationEntries) {
      await fetch("/api/sessions/narrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          timestamp: entry.timestamp || 0,
          text: `${entry.type === "voice" ? "[voice] " : ""}${entry.text}`,
        }),
      });
    }

    setLog((prev) => [
      ...prev,
      { time: now(), type: "system", text: "Recording saved. Starting AI analysis..." },
    ]);

    setPhase("done");

    // Auto-trigger analysis in the background (fire-and-forget)
    fetch("/api/analyze/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => {
      // Analysis failure is non-blocking — can be retried from dashboard
    });
  }

  async function uploadRecording(blob: Blob) {
    try {
      const formData = new FormData();
      formData.append("file", blob, `recording-${sessionId}.webm`);
      formData.append("session_id", sessionId);

      await fetch("/api/sessions/upload", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Upload failed:", err);
    }
  }

  function addNarration() {
    if (!narration.trim()) return;
    setLog((prev) => [
      ...prev,
      {
        time: now(),
        type: "narration",
        text: narration.trim(),
        timestamp: elapsedRef.current,
      },
    ]);
    setNarration("");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[rgba(229,231,235,0.45)] font-mono text-sm">
          Session not found
        </p>
      </div>
    );
  }

  // Prevent re-recording sessions that are already completed
  if (phase === "guide" && session.status !== "pending") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
          <h2 className="font-mono font-bold text-lg text-[#e5e7eb] mb-2">
            Session Already Recorded
          </h2>
          <p className="text-sm text-[rgba(229,231,235,0.45)] mb-1">
            This session has already been recorded and is{" "}
            {session.status === "processing" ? "being analyzed" : "reviewed"}.
          </p>
          <p className="text-xs text-[rgba(229,231,235,0.3)]">
            Return to the dashboard to view results or create a new session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-[rgba(34,197,94,0.1)] bg-[rgba(10,10,10,0.9)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-mono font-bold text-xs text-[#e5e7eb]">
              RecordIt
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-wider uppercase text-[rgba(229,231,235,0.3)]">
            <span className={phase === "guide" ? "text-green-400" : ""}>
              01 Guide
            </span>
            <ArrowRight className="w-3 h-3" />
            <span className={phase === "recording" ? "text-green-400" : ""}>
              02 Record
            </span>
            <ArrowRight className="w-3 h-3" />
            <span className={phase === "done" ? "text-green-400" : ""}>
              03 Done
            </span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <main className="pt-12">
        {phase === "guide" && (
          <GuidePhase session={session} onStart={startRecording} />
        )}
        {phase === "recording" && (
          <RecordingPhase
            videoRef={videoRef}
            log={log}
            elapsed={elapsed}
            narration={narration}
            setNarration={setNarration}
            addNarration={addNarration}
            stopRecording={stopRecording}
            logEndRef={logEndRef}
            micActive={micActive}
            interimText={interimText}
          />
        )}
        {phase === "done" && (
          <DonePhase log={log} elapsed={elapsed} frameCount={frameCount} />
        )}
      </main>
    </div>
  );
}

// ---- Guide Phase ----

function GuidePhase({
  session,
  onStart,
}: {
  session: Session;
  onStart: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] mb-4">
          <Circle className="w-3 h-3 text-green-400" />
          <span className="font-mono text-[10px] font-bold tracking-widest text-green-400 uppercase">
            Recording Session
          </span>
        </div>
        <h1 className="font-mono font-bold text-2xl text-[#e5e7eb] mb-2">
          {session.title}
        </h1>
        <p className="text-sm text-[rgba(229,231,235,0.45)]">
          Follow the guide below, then click Start Recording when ready.
        </p>
      </div>

      {/* Instructions */}
      {session.instructions && (
        <div className="p-5 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.2)] mb-8">
          <h3 className="font-mono text-xs font-bold text-green-400 mb-3 uppercase tracking-wider">
            What to focus on
          </h3>
          <p className="text-sm text-[#e5e7eb] leading-relaxed whitespace-pre-wrap">
            {session.instructions}
          </p>
        </div>
      )}

      {/* How it works */}
      <div className="grid sm:grid-cols-4 gap-4 mb-10">
        {[
          {
            icon: <Monitor className="w-4 h-4" />,
            title: "Share your screen",
            desc: "Click Start and select which screen or window to share",
          },
          {
            icon: <Mic className="w-4 h-4" />,
            title: "Talk as you go",
            desc: "Speak naturally — we'll transcribe your voice automatically",
          },
          {
            icon: <Circle className="w-4 h-4" />,
            title: "Work normally",
            desc: "Do the task exactly as you would on a normal day",
          },
          {
            icon: <CheckCircle className="w-4 h-4" />,
            title: "Stop when done",
            desc: "Click Stop Recording and we'll take it from here",
          },
        ].map((step, i) => (
          <div
            key={i}
            className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.08)]"
          >
            <div className="text-green-400 mb-2">{step.icon}</div>
            <h4 className="font-mono text-xs font-bold text-[#e5e7eb] mb-1">
              {step.title}
            </h4>
            <p className="text-[11px] text-[rgba(229,231,235,0.35)] leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="p-4 rounded-lg bg-[rgba(34,197,94,0.03)] border border-[rgba(34,197,94,0.1)] mb-8">
        <h4 className="font-mono text-xs font-bold text-green-400 mb-2">
          Pro Tips
        </h4>
        <ul className="space-y-1 text-xs text-[rgba(229,231,235,0.45)]">
          <li>
            · Say <strong className="text-[#e5e7eb]">why</strong> you&apos;re
            doing each step, not just what you&apos;re clicking
          </li>
          <li>
            · Mention where you get data from (which file, email, system)
          </li>
          <li>· Pause briefly between major steps</li>
          <li>
            · Show what happens when something goes wrong, if possible
          </li>
        </ul>
      </div>

      <div className="text-center">
        <button
          onClick={onStart}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-green-500 text-black font-mono text-sm font-bold rounded hover:bg-green-400 transition-colors"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-rec-pulse" />
          Start Recording
        </button>
        <p className="mt-3 text-[10px] text-[rgba(229,231,235,0.25)]">
          You&apos;ll be asked to share your screen and allow microphone access
        </p>
      </div>
    </div>
  );
}

// ---- Recording Phase ----

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

function RecordingPhase({
  videoRef,
  log,
  elapsed,
  narration,
  setNarration,
  addNarration,
  stopRecording,
  logEndRef,
  micActive,
  interimText,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  log: LogEntry[];
  elapsed: number;
  narration: string;
  setNarration: (v: string) => void;
  addNarration: () => void;
  stopRecording: () => void;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  micActive: boolean;
  interimText: string;
}) {
  const voiceCount = log.filter((l) => l.type === "voice").length;
  const typedCount = log.filter((l) => l.type === "narration").length;
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const rippleIdRef = useRef(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { id, x, y }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 700);
    },
    []
  );

  return (
    <div className="h-[calc(100vh-3rem)]">
      {/* Status Bar */}
      <div className="h-10 px-6 flex items-center justify-between border-b border-[rgba(34,197,94,0.08)] bg-[#080808]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-rec-pulse" />
            <span className="font-mono text-[10px] font-bold text-red-400 tracking-wider uppercase">
              REC
            </span>
          </div>
          <span className="font-mono text-xs text-[rgba(229,231,235,0.5)] tabular-nums">
            {formatDuration(elapsed)}
          </span>
          <div className="flex items-center gap-1.5">
            {micActive ? (
              <Mic className="w-3 h-3 text-green-400" />
            ) : (
              <MicOff className="w-3 h-3 text-[rgba(229,231,235,0.2)]" />
            )}
            <span className="font-mono text-[10px] text-[rgba(229,231,235,0.25)]">
              {voiceCount} voice · {typedCount} typed
            </span>
          </div>
        </div>
        <button
          onClick={stopRecording}
          className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 font-mono text-xs font-bold rounded hover:bg-red-500/20 transition-colors"
        >
          <Square className="w-3 h-3" />
          Stop Recording
        </button>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-5 h-[calc(100%-2.5rem)]">
        {/* Screen Capture */}
        <div className="lg:col-span-3 p-4 flex flex-col">
          <div
            ref={videoContainerRef}
            onClick={handleVideoClick}
            className="flex-1 bg-black rounded-lg overflow-hidden border border-[rgba(34,197,94,0.1)] relative cursor-crosshair"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            {/* Click Ripples */}
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="absolute pointer-events-none animate-click-ripple"
                style={{
                  left: ripple.x - 15,
                  top: ripple.y - 15,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "2px solid rgba(34,197,94,0.7)",
                  boxShadow: "0 0 8px rgba(34,197,94,0.3)",
                }}
              />
            ))}
          </div>

          {/* Live transcription indicator */}
          {interimText && (
            <div className="mt-2 px-3 py-1.5 bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.1)] rounded flex items-center gap-2">
              <Mic className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-xs text-[rgba(229,231,235,0.35)] italic truncate">
                {interimText}
              </span>
            </div>
          )}

          {/* Narration Input */}
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNarration()}
              placeholder="Or type a note here..."
              className="flex-1 px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.15)] focus:outline-none focus:border-green-500 transition-colors"
            />
            <button
              onClick={addNarration}
              className="px-4 py-2 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors"
            >
              Log
            </button>
          </div>
        </div>

        {/* Live Log */}
        <div className="lg:col-span-2 border-l border-[rgba(34,197,94,0.08)] flex flex-col">
          <div className="px-4 py-3 border-b border-[rgba(34,197,94,0.08)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[rgba(229,231,235,0.55)] uppercase tracking-wider">
                Live Log
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-rec-pulse" />
            </div>
            <span className="font-mono text-[10px] text-[rgba(229,231,235,0.25)]">
              {log.length} entries
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {log.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 animate-fade-up">
                <span className="font-mono text-[10px] text-[rgba(229,231,235,0.2)] mt-0.5 tabular-nums shrink-0">
                  {entry.time}
                </span>
                <span
                  className={`text-xs leading-relaxed ${
                    entry.type === "voice"
                      ? "text-blue-300"
                      : entry.type === "narration"
                        ? "text-green-300"
                        : entry.type === "system"
                          ? "text-[rgba(229,231,235,0.35)]"
                          : "text-[#86efac]"
                  }`}
                >
                  {entry.type === "voice" && (
                    <Mic className="w-3 h-3 inline mr-1" />
                  )}
                  {entry.type === "narration" && (
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                  )}
                  {entry.text}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Done Phase ----

function DonePhase({
  log,
  elapsed,
  frameCount,
}: {
  log: LogEntry[];
  elapsed: number;
  frameCount: number;
}) {
  const voiceNotes = log.filter((l) => l.type === "voice").length;
  const typedNotes = log.filter((l) => l.type === "narration").length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
        <CheckCircle className="w-8 h-8 text-green-400" />
      </div>
      <h2 className="font-mono font-bold text-2xl text-[#e5e7eb] mb-2">
        Recording Complete
      </h2>
      <p className="text-sm text-[rgba(229,231,235,0.45)] mb-2">
        Thank you! Your recording has been saved.
      </p>
      <p className="text-xs text-[rgba(229,231,235,0.3)] mb-8">
        AI analysis is running automatically — steps, gaps, and follow-up questions will appear in the dashboard shortly.
      </p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]">
          <div className="font-mono font-bold text-lg text-green-400">
            {formatDuration(elapsed)}
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
            Duration
          </div>
        </div>
        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]">
          <div className="font-mono font-bold text-lg text-blue-300">
            {voiceNotes}
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
            Voice Notes
          </div>
        </div>
        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]">
          <div className="font-mono font-bold text-lg text-green-400">
            {typedNotes}
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
            Typed Notes
          </div>
        </div>
        <div className="p-4 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.1)]">
          <div className="font-mono font-bold text-lg text-green-400">
            {frameCount}
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.3)] uppercase tracking-wider">
            Frames
          </div>
        </div>
      </div>

      <p className="text-xs text-[rgba(229,231,235,0.25)]">
        You can close this tab. The recording is safe.
      </p>
    </div>
  );
}
