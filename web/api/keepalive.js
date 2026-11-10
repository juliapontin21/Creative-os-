// Chamado 1x por dia pelo Cron da Vercel para o Supabase gratuito não pausar por inatividade.
import { send, env } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/os_docs?select=key&limit=1`, {
      headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${env("SUPABASE_ANON_KEY")}` },
    });
    return send(res, 200, { ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    return send(res, 200, { ok: false, error: e.message });
  }
}
