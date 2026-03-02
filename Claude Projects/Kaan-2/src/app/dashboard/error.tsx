"use client";

import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <h2 className="font-mono font-bold text-lg text-[#e5e7eb] mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-[rgba(229,231,235,0.45)] mb-4">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
