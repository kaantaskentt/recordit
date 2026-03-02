import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[rgba(34,197,94,0.1)] bg-[rgba(10,10,10,0.9)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="relative w-2 h-2 rounded-full bg-green-500" />
              <span className="font-mono font-bold text-xs tracking-tight text-[#e5e7eb]">
                RecordIt
              </span>
            </Link>
            <span className="text-[rgba(229,231,235,0.15)]">/</span>
            <Link
              href="/dashboard"
              className="font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] hover:text-green-400 transition-colors"
            >
              Projects
            </Link>
          </div>
          <div className="font-mono text-[10px] text-[rgba(229,231,235,0.25)] tracking-wider uppercase">
            v1
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-14">{children}</main>
    </div>
  );
}
