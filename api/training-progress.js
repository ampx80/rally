// GET  /api/training-progress?user=<id optional>
// POST /api/training-progress
//
// Shared, cross-user backend for training completion. Managers use this to see
// who trained on what across the real team. The front end seeds teammate
// progress locally; this makes it real once Supabase is configured. Env-gated
// and graceful end to end: with no database it never errors, it simply reports
// disabled so the client can fall back to its local seed. PII is never logged
// beyond a name.
//
// Env:
//   SUPABASE_URL              - Supabase project URL (required for durable storage)
//   SUPABASE_SERVICE_ROLE_KEY - service role key (server-side only)
//
// Table: rally_training_progress
//   user_id      text    (part of unique key: user_id + module_id)
//   user_name    text
//   role         text
//   module_id    text    (part of unique key: user_id + module_id)
//   module_title text
//   completed_at timestamptz
// NO em-dash / en-dash. ASCII only.
import { withErrorHandling, methodNotAllowed, readJsonBody } from './_utils.js';

const clean = (s, max = 200) => String(s == null ? '' : s).trim().slice(0, max);

function hasDb() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getSupa() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

async function listRows(userId) {
  if (!hasDb()) return { ok: false, disabled: true, reason: 'no-db', rows: [] };
  try {
    const supa = await getSupa();
    let query = supa
      .from('rally_training_progress')
      .select('user_id, user_name, role, module_id, module_title, completed_at')
      .order('completed_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) { console.warn('[training-progress] list skipped:', error.message); return { ok: false, error: error.message, rows: [] }; }
    return { ok: true, rows: data || [] };
  } catch (e) { console.warn('[training-progress] list error:', e?.message); return { ok: false, error: e?.message, rows: [] }; }
}

async function upsertRow(row) {
  if (!hasDb()) return { ok: false, disabled: true };
  try {
    const supa = await getSupa();
    const { error } = await supa.from('rally_training_progress').upsert(row, { onConflict: 'user_id,module_id' });
    if (error) { console.warn('[training-progress] upsert skipped:', error.message); return { ok: false, error: error.message }; }
    return { ok: true };
  } catch (e) { console.warn('[training-progress] upsert error:', e?.message); return { ok: false, error: e?.message }; }
}

export default withErrorHandling(async (req, res) => {
  if (req.method === 'GET') {
    const userId = clean(req.query?.user, 120);
    const result = await listRows(userId || null);
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const b = readJsonBody(req);
    const userId = clean(b.userId, 120);
    const moduleId = clean(b.moduleId, 120);
    if (!userId || !moduleId) return res.status(400).json({ ok: false, error: 'userId and moduleId are required.' });

    const row = {
      user_id: userId,
      user_name: clean(b.userName, 120),
      role: clean(b.role, 80),
      module_id: moduleId,
      module_title: clean(b.moduleTitle, 200),
      completed_at: clean(b.completedAt, 40) || new Date().toISOString(),
    };

    const result = await upsertRow(row);
    console.log(`[training-progress] completion for ${row.user_name || 'teammate'}`); // no PII beyond a name
    return res.status(200).json(result);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
});
