-- ============================================
-- RecordIt v1 — Initial Schema
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Projects (one per client engagement)
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_name text not null,
  department text not null default '',
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  briefing_transcript text,
  briefing_summary jsonb,
  watch_list jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recording Sessions (multiple per project)
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'recording', 'processing', 'reviewed')),
  instructions text,
  recording_url text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Steps (AI-extracted from recordings)
create table steps (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  step_number integer not null,
  timestamp_start integer,
  timestamp_end integer,
  description text not null,
  tools_detected jsonb not null default '[]',
  data_sources jsonb not null default '[]',
  action_type text not null default 'navigation' check (action_type in ('navigation', 'data_entry', 'decision', 'communication', 'lookup')),
  complexity text not null default 'manual' check (complexity in ('automate', 'ai_assist', 'manual')),
  notes text
);

-- Follow-ups (AI-generated questions after analysis)
create table follow_ups (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  step_id uuid references steps(id) on delete set null,
  question text not null,
  context text not null default '',
  response text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'answered')),
  created_at timestamptz not null default now()
);

-- Narrations (manual notes during recording)
create table narrations (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  timestamp integer not null default 0,
  text text not null
);

-- Indexes
create index idx_sessions_project on sessions(project_id);
create index idx_steps_session on steps(session_id);
create index idx_follow_ups_session on follow_ups(session_id);
create index idx_narrations_session on narrations(session_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();
