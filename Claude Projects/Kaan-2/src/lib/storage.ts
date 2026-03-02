import { supabase } from "@/lib/supabase";

const BUCKET = "recordings";

/** Delete all storage files for a session (video + frames) */
export async function deleteSessionStorage(sessionId: string) {
  const prefix = `recordings/${sessionId}/`;

  // List all files under the session folder (video + frames subfolder)
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`recordings/${sessionId}`, { limit: 1000 });

  const { data: frameFiles } = await supabase.storage
    .from(BUCKET)
    .list(`recordings/${sessionId}/frames`, { limit: 1000 });

  const paths: string[] = [];

  if (files) {
    for (const f of files) {
      if (f.name && f.id) {
        paths.push(`${prefix}${f.name}`);
      }
    }
  }

  if (frameFiles) {
    for (const f of frameFiles) {
      if (f.name) {
        paths.push(`${prefix}frames/${f.name}`);
      }
    }
  }

  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

/** Delete all storage files for every session in a project */
export async function deleteProjectStorage(projectId: string) {
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("project_id", projectId);

  if (sessions) {
    for (const session of sessions) {
      await deleteSessionStorage(session.id);
    }
  }
}
