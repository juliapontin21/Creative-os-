// IA do app (busca nas notas, sugestões criativas, aba Falar).
// Só funciona se ANTHROPIC_API_KEY estiver configurada na Vercel. Cobrança por uso na conta Anthropic.
import { send, readJson, requireUser, env } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
  const user = await requireUser(req, res);
  if (!user) return;
  if (!env("ANTHROPIC_API_KEY")) return send(res, 503, { error: "IA não configurada.", code: "not_granted" });
  const { prompt, tier } = await readJson(req);
  if (!prompt || typeof prompt !== "string" || prompt.length > 200000) return send(res, 400, { error: "Pedido inválido." });
  const model = tier === "quick" ? env("AI_MODEL_QUICK") || "claude-haiku-5-5" : env("AI_MODEL") || "claude-sonnet-5-5";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
    });
    const j = await r.json();
    if (!r.ok) return send(res, 502, { error: j?.error?.message || "A IA não respondeu.", code: r.status === 429 ? "rate_limited" : "ai_error" });
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const start = text.search(/[\[{]/);
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (start < 0 || end < start) return send(res, 502, { error: "Resposta da IA sem JSON.", code: "invalid_json" });
    return send(res, 200, { result: JSON.parse(text.slice(start, end + 1)) });
  } catch (e) {
    return send(res, 502, { error: "Falha ao falar com a IA: " + e.message, code: "ai_error" });
  }
}
