// POST: guarda o refresh token do Google (recebido no primeiro login).
// GET: devolve um access token novo para o app enviar arquivos ao Drive.
// O refresh token nunca volta para o navegador.
import { send, readJson, requireUser, db, env } from "./_lib.js";

export default async function handler(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  try {
    if (req.method === "POST") {
      const { refresh_token } = await readJson(req);
      if (!refresh_token) return send(res, 400, { error: "Token ausente." });
      await db("google_tokens", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ user_id: user.id, refresh_token, updated_at: new Date().toISOString() }),
      });
      return send(res, 200, { ok: true });
    }
    const rows = await db(`google_tokens?user_id=eq.${user.id}&select=refresh_token`);
    if (!rows?.length) {
      return send(res, 409, { error: "Saia e entre de novo para autorizar o Google Drive.", code: "no_refresh_token" });
    }
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: rows[0].refresh_token,
        client_id: env("GOOGLE_CLIENT_ID"),
        client_secret: env("GOOGLE_CLIENT_SECRET"),
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      return send(res, 409, { error: "O acesso ao Google expirou. Saia e entre de novo.", code: j.error || "google_error" });
    }
    return send(res, 200, { access_token: j.access_token, expires_in: j.expires_in });
  } catch (e) {
    return send(res, 500, { error: "Falha no servidor: " + e.message });
  }
}
