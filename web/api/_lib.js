// Funções compartilhadas pelas rotas da API (Vercel Serverless, Node 18+).
const env = (k) => (process.env[k] || "").trim();

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
}

// Confere o login (token do Supabase) e se o e-mail é o permitido.
export async function requireUser(req, res) {
  const auth = req.headers.authorization || "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) { send(res, 401, { error: "Faça login de novo.", code: "no_session" }); return null; }
  const r = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) { send(res, 401, { error: "Sessão expirada. Entre de novo.", code: "bad_session" }); return null; }
  const user = await r.json();
  const allowed = env("ALLOWED_EMAIL").toLowerCase();
  if (allowed && (user.email || "").toLowerCase() !== allowed) {
    send(res, 403, { error: "Esta conta não tem acesso.", code: "forbidden" }); return null;
  }
  return user;
}

// Acesso ao banco com a chave de serviço (só no servidor).
export async function db(path, opt = {}) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const r = await fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...opt,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(opt.headers || {}) },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Banco ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

export { env };
