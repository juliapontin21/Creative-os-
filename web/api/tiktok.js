// Tela "TikTok" do app: conectar a conta, ver a fila de rascunhos e agir sobre ela.
// GET: situação da conexão e dos rascunhos. POST {action}: connect · sync · retry · ignore · published · caption · backfill · disconnect.
import { send, readJson, requireUser, db, env } from "./_lib.js";
import { authUrl, getAccount, setAccount, syncAccount, tiktokConfigured, maxPending } from "./_tiktok.js";

const FIELDS = "id,file_name,video_code,video_folder,product,caption,caption_source,status,error,attempts,drive_file_id,drive_created_at,sent_at,updated_at";

async function state(userId) {
  const acc = await getAccount(userId);
  const drafts = acc ? await db(`tiktok_drafts?user_id=eq.${userId}&status=neq.substituido&order=drive_created_at.desc&limit=80&select=${FIELDS}`) : [];
  return {
    configured: tiktokConfigured(),
    maxPending: maxPending(),
    account: acc && {
      display_name: acc.display_name,
      needs_reconnect: acc.needs_reconnect,
      connected_at: acc.connected_at,
      scan_since: acc.scan_since,
      last_sync: acc.last_sync,
      last_error: acc.last_error,
    },
    drafts: drafts || [],
  };
}

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    if (req.method === "GET") return send(res, 200, await state(user.id));
    if (req.method !== "POST") return send(res, 405, { error: "Use GET ou POST." });
    const { action, id, caption, days } = await readJson(req);
    const draft = (patch) =>
      db(`tiktok_drafts?id=eq.${Number(id)}&user_id=eq.${user.id}`, { method: "PATCH", body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });

    if (action === "connect") {
      if (!tiktokConfigured()) return send(res, 503, { error: "Faltam TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET na Vercel.", code: "not_configured" });
      return send(res, 200, { url: authUrl(req, user.id) });
    }
    const acc = await getAccount(user.id);
    if (!acc) return send(res, 409, { error: "Conecte o TikTok primeiro.", code: "not_connected" });

    if (action === "sync") {
      const r = await syncAccount(acc, Date.now() + 240e3);
      return send(res, 200, { ...(await state(user.id)), result: r });
    }
    if (action === "retry") await draft({ status: "fila", attempts: 0, error: null, publish_id: null, sent_at: null });
    else if (action === "ignore") await draft({ status: "ignorado" });
    else if (action === "published") await draft({ status: "publicado", error: null });
    else if (action === "caption") {
      if (typeof caption !== "string" || caption.length > 2200) return send(res, 400, { error: "Legenda inválida (máximo de 2.200 caracteres)." });
      await draft({ caption, caption_source: "manual" });
    } else if (action === "backfill") {
      const d = Math.min(Math.max(Number(days) || 7, 1), 60);
      const since = new Date(Date.now() - d * 864e5).toISOString();
      await setAccount(user.id, { scan_since: since, last_scan: null });
    } else if (action === "disconnect") {
      await fetch("https://open.tiktokapis.com/v2/oauth/revoke/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_key: env("TIKTOK_CLIENT_KEY"), client_secret: env("TIKTOK_CLIENT_SECRET"), token: acc.access_token }),
      }).catch(() => {});
      await db(`tiktok_accounts?user_id=eq.${user.id}`, { method: "DELETE" });
    } else return send(res, 400, { error: "Ação desconhecida." });
    return send(res, 200, await state(user.id));
  } catch (e) {
    return send(res, 500, { error: "Falha no servidor: " + e.message });
  }
}
