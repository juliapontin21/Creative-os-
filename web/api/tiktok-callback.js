// O TikTok volta para cá depois que a Júlia autoriza o app. Troca o código pelo token e volta para o Creative OS.
import { db, env } from "./_lib.js";
import { readState, redirectUri, tokenRequest, saveTokens, getAccount } from "./_tiktok.js";

function back(res, params) {
  res.statusCode = 302;
  res.setHeader("Location", "/?" + new URLSearchParams(params));
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

export default async function handler(req, res) {
  const q = new URL(req.url, "https://x").searchParams;
  if (q.get("error")) return back(res, { tiktok: "erro", msg: q.get("error_description") || q.get("error") });
  const userId = readState(q.get("state"));
  if (!userId) return back(res, { tiktok: "erro", msg: "O link de conexão expirou. Tente de novo." });
  try {
    const j = await tokenRequest({ code: q.get("code") || "", grant_type: "authorization_code", redirect_uri: redirectUri(req) });
    let display_name = null;
    try {
      const r = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", { headers: { Authorization: `Bearer ${j.access_token}` } });
      display_name = (await r.json())?.data?.user?.display_name || null;
    } catch {}
    const first = !(await getAccount(userId));
    const now = new Date().toISOString();
    await saveTokens(userId, j, { display_name, ...(first ? { connected_at: now, scan_since: now } : {}) });
    return back(res, { tiktok: "conectado" });
  } catch (e) {
    return back(res, { tiktok: "erro", msg: e.message });
  }
}
