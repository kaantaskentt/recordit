"use client";

import Link from "next/link";
import { Circle, Monitor, Mic, Zap, CheckCircle, ArrowRight, Shield, FileText, Link2 } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: <Circle className="w-5 h-5" />,
    title: "Record",
    desc: "Share your screen and narrate your workflow in plain language.",
  },
  {
    num: "02",
    icon: <Zap className="w-5 h-5" />,
    title: "Analyze",
    desc: "AI watches your recording and extracts every step, tool, and decision.",
  },
  {
    num: "03",
    icon: <CheckCircle className="w-5 h-5" />,
    title: "Discover",
    desc: "Get structured insights, follow-up questions, and automation specs.",
  },
];

const FEATURES = [
  {
    icon: <Monitor className="w-5 h-5" />,
    title: "Screen + Voice Capture",
    desc: "Record your screen and narrate what you're doing. AI correlates both.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "AI-Powered Analysis",
    desc: "Gemini 2.5 Flash + Claude analyze your recording and extract structured steps.",
  },
  {
    icon: <Mic className="w-5 h-5" />,
    title: "Smart Follow-Ups",
    desc: "AI spots gaps in the process and generates targeted questions.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Context-Aware",
    desc: "Brief the system before recording. It knows what to look for.",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Build Specs",
    desc: "Export structured automation specs ready for any builder.",
  },
  {
    icon: <Link2 className="w-5 h-5" />,
    title: "Shareable Links",
    desc: "Send a recording link to anyone. No account needed.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[rgba(34,197,94,0.1)] bg-[rgba(10,10,10,0.85)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative w-2.5 h-2.5 rounded-full bg-green-500 pulse-dot" />
            <span className="font-mono font-bold text-sm tracking-tight text-[#e5e7eb]">
              RecordIt
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="font-mono text-xs font-semibold tracking-wider text-[rgba(229,231,235,0.55)] hover:text-green-400 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden scanlines">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-rec-pulse" />
              <span className="font-mono text-[10px] font-semibold tracking-widest text-green-400 uppercase">
                Process Discovery Tool
              </span>
            </div>

            <h1 className="font-mono font-extrabold text-4xl md:text-5xl lg:text-6xl leading-tight tracking-tight text-[#f0fdf4] mb-6">
              Understand any process.{" "}
              <span className="text-green-400 text-glow">Build it right.</span>
            </h1>

            <p className="text-lg text-[rgba(229,231,235,0.65)] leading-relaxed mb-8 max-w-lg">
              Record how people work. AI watches, asks the right questions, and
              gives you everything you need to build the automation — first time.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 text-black font-mono text-sm font-bold rounded hover:bg-green-400 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-black" />
                Start a Project
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-1 px-4 py-3 font-mono text-sm font-semibold text-green-400 hover:text-green-300 transition-colors"
              >
                How it works <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-[rgba(34,197,94,0.08)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-mono font-bold text-2xl md:text-3xl text-[#f0fdf4] mb-12">
            How it works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="p-6 rounded-lg bg-[#0f0f0f] card-glow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-xs font-bold tracking-widest text-green-500">
                    {step.num}
                  </span>
                  <span className="text-green-400">{step.icon}</span>
                </div>
                <h3 className="font-mono font-bold text-lg text-[#e5e7eb] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[rgba(229,231,235,0.55)] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-[rgba(34,197,94,0.08)] bg-[#080808]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-mono font-bold text-2xl md:text-3xl text-[#f0fdf4] mb-12">
            Features
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="p-5 rounded-lg bg-[#0f0f0f] card-glow"
              >
                <div className="w-9 h-9 flex items-center justify-center rounded border border-[rgba(34,197,94,0.2)] text-green-400 mb-3">
                  {feat.icon}
                </div>
                <h3 className="font-mono font-bold text-sm text-[#e5e7eb] mb-1.5">
                  {feat.title}
                </h3>
                <p className="text-xs text-[rgba(229,231,235,0.5)] leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-[rgba(34,197,94,0.08)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-mono font-bold text-2xl md:text-3xl text-[#f0fdf4] mb-4">
            Stop guessing. Start discovering.
          </h2>
          <p className="text-[rgba(229,231,235,0.55)] mb-8">
            Every automation project starts with understanding the process. RecordIt makes that 10x faster.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-green-500 text-black font-mono text-sm font-bold rounded hover:bg-green-400 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-black" />
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[rgba(34,197,94,0.08)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-mono text-xs font-bold text-[rgba(229,231,235,0.4)]">
              RecordIt
            </span>
          </div>
          <span className="font-mono text-[10px] text-[rgba(229,231,235,0.25)]">
            Built by Kaan
          </span>
        </div>
      </footer>
    </div>
  );
}
