-- Add AI-computed tags and automation score to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS automation_score integer;
