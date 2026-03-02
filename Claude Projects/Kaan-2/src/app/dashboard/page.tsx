"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  Clock,
  ArrowRight,
  MoreVertical,
  Trash2,
  Copy,
  ArrowUpDown,
  X,
  Zap,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { Project } from "@/lib/types";

type SortKey = "newest" | "name" | "updated" | "automation";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client_name: "",
    department: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Close dropdown on outside click
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      // Will show empty state
    } finally {
      setLoading(false);
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: "", client_name: "", department: "", description: "" });
        setShowCreate(false);
        fetchProjects();
      }
    } finally {
      setCreating(false);
    }
  }

  async function deleteProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    fetchProjects();
  }

  async function duplicateProject(id: string) {
    setMenuOpen(null);
    await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
    fetchProjects();
  }

  // Collect all unique tags across projects
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const p of projects) {
      for (const t of p.tags || []) {
        tagSet.add(t);
      }
    }
    return Array.from(tagSet).sort();
  }, [projects]);

  // Filter + sort
  const displayedProjects = useMemo(() => {
    let list = [...projects];

    if (filterTag) {
      list = list.filter((p) => (p.tags || []).includes(filterTag));
    }

    switch (sortKey) {
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        break;
      case "updated":
        list.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        );
        break;
      case "automation":
        list.sort(
          (a, b) => (b.automation_score ?? -1) - (a.automation_score ?? -1)
        );
        break;
    }

    return list;
  }, [projects, sortKey, filterTag]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono font-bold text-2xl text-[#e5e7eb]">
            Projects
          </h1>
          <p className="text-sm text-[rgba(229,231,235,0.45)] mt-1">
            Your client discovery engagements
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Project
        </button>
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 p-6 rounded-lg bg-[#0f0f0f] border border-[rgba(34,197,94,0.2)]">
            <h2 className="font-mono font-bold text-lg text-[#e5e7eb] mb-4">
              New Project
            </h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. Invoice Processing Automation"
                  className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.2)] focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] mb-1.5">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={form.client_name}
                  onChange={(e) =>
                    setForm({ ...form, client_name: e.target.value })
                  }
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.2)] focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder="e.g. Finance, Operations, HR"
                  className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.2)] focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] mb-1.5">
                  Process Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  placeholder="What process is being documented?"
                  className="w-full px-3 py-2 bg-[#111] border border-[rgba(34,197,94,0.15)] rounded text-sm text-[#e5e7eb] placeholder:text-[rgba(229,231,235,0.2)] focus:outline-none focus:border-green-500 transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] border border-[rgba(229,231,235,0.1)] rounded hover:border-[rgba(229,231,235,0.2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 p-6 rounded-lg bg-[#0f0f0f] border border-red-500/20">
            <h2 className="font-mono font-bold text-lg text-[#e5e7eb] mb-2">
              Delete Project?
            </h2>
            <p className="text-sm text-[rgba(229,231,235,0.45)] mb-6">
              This will permanently delete the project, all its sessions,
              recordings, and analysis data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 font-mono text-xs font-semibold text-[rgba(229,231,235,0.55)] border border-[rgba(229,231,235,0.1)] rounded hover:border-[rgba(229,231,235,0.2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProject(confirmDelete)}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-mono text-xs font-bold rounded hover:bg-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-[#111] border border-[rgba(34,197,94,0.15)]">
            <FolderOpen className="w-7 h-7 text-[rgba(229,231,235,0.25)]" />
          </div>
          <h3 className="font-mono font-bold text-lg text-[#e5e7eb] mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-[rgba(229,231,235,0.4)] mb-6">
            Create your first project to start a discovery engagement.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-black font-mono text-xs font-bold rounded hover:bg-green-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>
      )}

      {/* Sort + Filter Controls */}
      {!loading && projects.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-[rgba(229,231,235,0.3)]" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-[#111] border border-[rgba(34,197,94,0.15)] rounded px-2 py-1 font-mono text-xs text-[#e5e7eb] focus:outline-none focus:border-green-500"
              >
                <option value="newest">Newest</option>
                <option value="updated">Last Updated</option>
                <option value="name">Name (A-Z)</option>
                <option value="automation">Automation Score</option>
              </select>
            </div>
            <span className="text-xs text-[rgba(229,231,235,0.3)] font-mono">
              {displayedProjects.length} project{displayedProjects.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Tag Filter Chips */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {filterTag && (
                <button
                  onClick={() => setFilterTag(null)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                  Clear
                </button>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setFilterTag(filterTag === tag ? null : tag)
                  }
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold transition-colors ${
                    filterTag === tag
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-[#1a1a1a] text-[rgba(229,231,235,0.4)] border border-[rgba(229,231,235,0.06)] hover:border-[rgba(229,231,235,0.15)]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Project Grid */}
          <div className="grid gap-4" ref={menuRef}>
            {displayedProjects.map((project) => (
              <div
                key={project.id}
                className="group relative p-5 rounded-lg bg-[#0f0f0f] card-glow flex items-center justify-between"
              >
                <Link
                  href={`/dashboard/${project.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-mono font-bold text-sm text-[#e5e7eb] truncate">
                      {project.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold tracking-wider uppercase ${
                        project.status === "active"
                          ? "bg-green-500/10 text-green-400"
                          : project.status === "completed"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {project.status}
                    </span>
                    {project.automation_score != null && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-[rgba(34,197,94,0.08)] text-green-400">
                        <Zap className="w-2.5 h-2.5" />
                        {project.automation_score}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[rgba(229,231,235,0.35)]">
                    <span>{project.client_name}</span>
                    {project.department && (
                      <>
                        <span>·</span>
                        <span>{project.department}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(project.created_at)}
                    </span>
                  </div>
                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-[#1a1a1a] font-mono text-[9px] text-[rgba(229,231,235,0.35)] border border-[rgba(229,231,235,0.05)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>

                {/* Actions Dropdown */}
                <div className="relative flex items-center gap-2 ml-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(
                        menuOpen === project.id ? null : project.id
                      );
                    }}
                    className="p-1.5 rounded text-[rgba(229,231,235,0.2)] hover:text-[rgba(229,231,235,0.5)] hover:bg-[rgba(229,231,235,0.05)] transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-[rgba(229,231,235,0.15)] group-hover:text-green-400 transition-colors" />

                  {menuOpen === project.id && (
                    <div className="absolute right-0 top-8 z-40 w-40 py-1 rounded-lg bg-[#151515] border border-[rgba(229,231,235,0.1)] shadow-xl">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          duplicateProject(project.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[rgba(229,231,235,0.6)] hover:bg-[rgba(229,231,235,0.05)] hover:text-[#e5e7eb] transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpen(null);
                          setConfirmDelete(project.id);
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
            ))}
          </div>
        </>
      )}
    </div>
  );
}
