import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto mb-3" />
        <p className="font-mono text-xs text-[rgba(229,231,235,0.3)]">
          Loading...
        </p>
      </div>
    </div>
  );
}
