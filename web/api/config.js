// Configuração pública que o app precisa para iniciar (nada secreto aqui).
import { send, env } from "./_lib.js";

export default function handler(req, res) {
  send(res, 200, {
    supabaseUrl: env("SUPABASE_URL"),
    supabaseAnonKey: env("SUPABASE_ANON_KEY"),
    allowedEmail: env("ALLOWED_EMAIL"),
    ai: Boolean(env("ANTHROPIC_API_KEY")),
  });
}
