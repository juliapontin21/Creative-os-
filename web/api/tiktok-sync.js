// Rodada automática: procura vídeos novos nas pastas "Editado" e envia como rascunho ao TikTok.
// Chamada pelo agendador do Supabase (a cada 10 min) e pelo Cron diário da Vercel, sempre com o CRON_SECRET.
import { send, db, env } from "./_lib.js";
import { syncAccount, tiktokConfigured } from "./_tiktok.js";

export default async function handler(req, res) {
  const secret = env("CRON_SECRET");
  if (!secret) return send(res, 503, { error: "Falta CRON_SECRET na Vercel." });
  if ((req.headers.authorization || "") !== `Bearer ${secret}`) return send(res, 401, { error: "Não autorizado." });
  if (!tiktokConfigured()) return send(res, 503, { error: "TikTok não configurado." });
  const deadline = Date.now() + 240e3;
  const accounts = (await db("tiktok_accounts?needs_reconnect=eq.false&select=*")) || [];
  const results = [];
  for (const acc of accounts) results.push(await syncAccount(acc, deadline));
  return send(res, 200, { ok: true, accounts: accounts.length, results, at: new Date().toISOString() });
}
