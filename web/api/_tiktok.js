// Integração com o TikTok (Content Posting API, modo rascunho / caixa de entrada).
// Fluxo: procura vídeos novos nas pastas "Editado" do Google Drive → prepara a legenda
// (arquivo "legenda" na mesma pasta, ou IA como plano B) → envia o vídeo como rascunho
// para a caixa de entrada do TikTok. A API de rascunho não aceita legenda: ela fica no
// app para copiar e colar na hora de publicar.
import crypto from "node:crypto";
import { db, env } from "./_lib.js";

const TT = "https://open.tiktokapis.com";
const MB = 1024 * 1024;
export const SCOPES = "user.info.basic,video.upload";
export const maxPending = () => Number(env("TIKTOK_MAX_PENDING")) || 5;
// Espera pelo arquivo de legenda antes de usar a IA (o Claude sobe a legenda logo depois do vídeo).
const CAPTION_WAIT_MS = 20 * 60e3;

export const tiktokConfigured = () => Boolean(env("TIKTOK_CLIENT_KEY") && env("TIKTOK_CLIENT_SECRET"));

export function redirectUri(req) {
  if (env("TIKTOK_REDIRECT_URI")) return env("TIKTOK_REDIRECT_URI");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}/api/tiktok-callback`;
}

/* ---------- OAuth ---------- */
const hmac = (s) => crypto.createHmac("sha256", env("TIKTOK_CLIENT_SECRET")).update(s).digest("base64url");

export function authUrl(req, userId) {
  const payload = `${userId}.${Date.now().toString(36)}`;
  const q = new URLSearchParams({
    client_key: env("TIKTOK_CLIENT_KEY"),
    response_type: "code",
    scope: SCOPES,
    redirect_uri: redirectUri(req),
    state: `${payload}.${hmac(payload)}`,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

export function readState(state) {
  const [u, ts, sig] = String(state || "").split(".");
  if (!u || !ts || !sig) return null;
  const want = hmac(`${u}.${ts}`);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  if (Date.now() - parseInt(ts, 36) > 20 * 60e3) return null;
  return u;
}

export async function tokenRequest(params) {
  const r = await fetch(`${TT}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({ client_key: env("TIKTOK_CLIENT_KEY"), client_secret: env("TIKTOK_CLIENT_SECRET"), ...params }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error || !j.access_token) throw new Error(j.error_description || j.error || `TikTok ${r.status}`);
  return j;
}

export async function saveTokens(userId, j, extra = {}) {
  const now = Date.now();
  await db("tiktok_accounts", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: userId,
      open_id: j.open_id,
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: new Date(now + (j.expires_in || 86400) * 1000).toISOString(),
      refresh_expires_at: new Date(now + (j.refresh_expires_in || 31536000) * 1000).toISOString(),
      scope: j.scope || "",
      needs_reconnect: false,
      last_error: null,
      updated_at: new Date().toISOString(),
      ...extra,
    }),
  });
}

export async function getAccount(userId) {
  const rows = await db(`tiktok_accounts?user_id=eq.${userId}&select=*`);
  return rows?.[0] || null;
}

export const setAccount = (userId, patch) =>
  db(`tiktok_accounts?user_id=eq.${userId}`, { method: "PATCH", body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });

async function tiktokToken(acc) {
  if (new Date(acc.expires_at).getTime() - Date.now() > 10 * 60e3) return acc.access_token;
  try {
    const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: acc.refresh_token });
    await saveTokens(acc.user_id, j);
    return j.access_token;
  } catch (e) {
    await setAccount(acc.user_id, { needs_reconnect: true });
    throw new Error("O login do TikTok expirou (" + e.message + "). Toque em Conectar TikTok de novo.");
  }
}

export async function tiktokApi(token, path, body, method = "POST") {
  const r = await fetch(`${TT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: method === "GET" ? undefined : JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => ({}));
  const code = j?.error?.code;
  if (!r.ok || (code && code !== "ok")) {
    throw Object.assign(new Error(j?.error?.message || `TikTok ${r.status}`), { code: code || `http_${r.status}`, status: r.status });
  }
  return j.data || {};
}

/* ---------- Google Drive (leitura) ---------- */
export async function googleAccess(userId) {
  const rows = await db(`google_tokens?user_id=eq.${userId}&select=refresh_token`);
  if (!rows?.length) throw new Error("O Google Drive não está autorizado. Saia e entre de novo no Creative OS.");
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
  if (!r.ok) throw new Error("O acesso ao Google expirou. Saia e entre de novo no Creative OS.");
  return j.access_token;
}

async function drive(tok, path, asText = false) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/${path}`, { headers: { Authorization: `Bearer ${tok}` } });
  if (!r.ok) {
    const t = await r.text();
    const insufficient = r.status === 403 && /insufficient|scope/i.test(t);
    throw Object.assign(
      new Error(insufficient ? "O app ainda não pode ler a pasta Editado. Saia e entre de novo no Creative OS para liberar a leitura do Drive." : `Google Drive ${r.status}: ${t.slice(0, 160)}`),
      { status: r.status }
    );
  }
  return asText ? r.text() : r.json();
}

const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const isEditado = (name) => /^editados?$/.test(plain(name));
const codeOf = (...names) => {
  for (const n of names) {
    const m = String(n || "").match(/\bV\d{2,5}\b/i);
    if (m) return m[0].toUpperCase();
  }
  return null;
};

// Procura vídeos novos em pastas "Editado" e registra como "aguardando".
// Nada vai sozinho para o TikTok: só sai quando a Júlia toca em "Mandar pro rascunho" no app.
async function scan(acc, gtok) {
  const startedAt = new Date().toISOString();
  const floor = new Date(acc.scan_since || acc.connected_at).getTime();
  const from = Math.max(floor, new Date(acc.last_scan || 0).getTime() - 2 * 3600e3); // 2 h de folga
  const q = `mimeType contains 'video/' and trashed = false and modifiedTime > '${new Date(from).toISOString()}'`;
  const folders = new Map();
  const folder = async (id) => {
    if (!id) return null;
    if (!folders.has(id)) folders.set(id, await drive(gtok, `files/${id}?fields=id,name,parents`).catch(() => null));
    return folders.get(id);
  };
  const found = [];
  let pageToken = "";
  do {
    const j = await drive(
      gtok,
      `files?q=${encodeURIComponent(q)}&pageSize=100&fields=${encodeURIComponent("nextPageToken,files(id,name,size,mimeType,parents,createdTime)")}${pageToken ? `&pageToken=${pageToken}` : ""}`
    );
    for (const f of j.files || []) {
      if (new Date(f.createdTime).getTime() < floor) continue;
      const p = await folder(f.parents?.[0]);
      if (!p || !isEditado(p.name)) continue;
      const vf = await folder(p.parents?.[0]);
      const prod = await folder(vf?.parents?.[0]);
      found.push({
        user_id: acc.user_id,
        drive_file_id: f.id,
        file_name: f.name,
        mime_type: f.mimeType,
        size: Number(f.size) || null,
        folder_id: p.id,
        video_code: codeOf(f.name, vf?.name),
        video_folder: vf?.name || "",
        product: prod?.name || "",
        drive_created_at: f.createdTime,
        status: "aguardando",
      });
    }
    pageToken = j.nextPageToken || "";
  } while (pageToken);

  found.sort((a, b) => a.drive_created_at.localeCompare(b.drive_created_at));
  for (const row of found) {
    const ins = await db("tiktok_drafts?on_conflict=drive_file_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    // Nova versão do mesmo vídeo (V012 v2): a anterior que ainda não foi enviada sai da lista.
    if (ins?.length && row.video_code) {
      await db(
        `tiktok_drafts?user_id=eq.${acc.user_id}&video_code=eq.${row.video_code}&status=in.(fila,aguardando)&drive_file_id=neq.${row.drive_file_id}`,
        { method: "PATCH", body: JSON.stringify({ status: "substituido", updated_at: new Date().toISOString() }) }
      );
    }
  }
  await setAccount(acc.user_id, { last_scan: startedAt });
  return found.length;
}

// Só procura (sem enviar): usado quando a Júlia pede um rascunho de um vídeo específico.
export async function scanNow(acc) {
  const gtok = await googleAccess(acc.user_id);
  return scan(acc, gtok);
}

/* ---------- Legenda ---------- */
async function captionFromFolder(gtok, row) {
  const q = `'${row.folder_id}' in parents and trashed = false and name contains 'legenda'`;
  const j = await drive(gtok, `files?q=${encodeURIComponent(q)}&pageSize=20&orderBy=${encodeURIComponent("modifiedTime desc")}&fields=files(id,name,mimeType)`);
  const files = j.files || [];
  const pick = files.find((f) => row.video_code && f.name.toUpperCase().includes(row.video_code)) || files[0];
  if (!pick) return null;
  const text =
    pick.mimeType === "application/vnd.google-apps.document"
      ? await drive(gtok, `files/${pick.id}/export?mimeType=text/plain`, true)
      : await drive(gtok, `files/${pick.id}?alt=media`, true);
  return text.replace(/^﻿/, "").trim() || null;
}

async function captionFromAI(row) {
  if (!env("ANTHROPIC_API_KEY")) return null;
  const prompt = `Escreva a legenda de um vídeo de TikTok Shop de uma creator brasileira.
Produto: ${row.product || "(não informado)"}
Arquivo: ${row.file_name}
Regras: português do Brasil, tom de conversa de creator (não de anúncio), 1 a 2 frases curtas, sem prometer resultado, sem inventar preço, desconto ou condição comercial, e no fim 3 a 5 hashtags relevantes (inclua #tiktokshop). Máximo 300 caracteres.
Responda só JSON: {"legenda":"..."}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env("AI_MODEL_QUICK") || "claude-haiku-5-5", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });
    const j = await r.json();
    const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]).legenda?.trim() || null : null;
  } catch {
    return null;
  }
}

// Devolve {caption, source} ou null se ainda vale esperar pelo arquivo de legenda.
async function prepareCaption(gtok, row) {
  if (row.caption) return { caption: row.caption, source: row.caption_source };
  const fromFile = await captionFromFolder(gtok, row).catch(() => null);
  if (fromFile) return { caption: fromFile, source: "roteiro" };
  if (Date.now() - new Date(row.drive_created_at || row.created_at).getTime() < CAPTION_WAIT_MS) return null;
  const ai = await captionFromAI(row);
  if (ai) return { caption: ai, source: "ia" };
  return { caption: `${row.product || ""}\n\n#tiktokshop`.trim(), source: "simples" };
}

/* ---------- Envio para a caixa de entrada do TikTok ---------- */
async function uploadDraft(ttTok, gtok, row, onPublishId) {
  let size = Number(row.size);
  if (!size) size = Number((await drive(gtok, `files/${row.drive_file_id}?fields=size`)).size);
  if (!size) throw new Error("Não consegui ler o tamanho do vídeo no Drive.");
  // Regras do TikTok: até 64 MB pode ir inteiro; acima disso, partes de 5–64 MB e a última até 128 MB.
  const chunk = size <= 64 * MB ? size : 20 * MB;
  const count = size <= 64 * MB ? 1 : Math.floor(size / chunk);
  const init = await tiktokApi(ttTok, "/v2/post/publish/inbox/video/init/", {
    source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: chunk, total_chunk_count: count },
  });
  await onPublishId(init.publish_id);
  for (let i = 0; i < count; i++) {
    const start = i * chunk;
    const end = i === count - 1 ? size - 1 : start + chunk - 1;
    const g = await fetch(`https://www.googleapis.com/drive/v3/files/${row.drive_file_id}?alt=media`, {
      headers: { Authorization: `Bearer ${gtok}`, Range: `bytes=${start}-${end}` },
    });
    if (!g.ok) throw new Error(`Não consegui baixar o vídeo do Drive (${g.status}).`);
    const buf = Buffer.from(await g.arrayBuffer());
    if (buf.length !== end - start + 1) throw new Error("O Drive devolveu um pedaço incompleto do vídeo.");
    const p = await fetch(init.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": /quicktime|webm/.test(row.mime_type || "") ? row.mime_type : "video/mp4",
        "Content-Length": String(buf.length),
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
      body: buf,
    });
    if (!p.ok) throw Object.assign(new Error(`O TikTok recusou a parte ${i + 1} de ${count} (${p.status}).`), { status: p.status });
  }
  return init.publish_id;
}

// Mantém o roteiro (Meu Criativo) em dia: rascunho enviado → "Rascunho no TikTok"; publicado → "Postado".
export async function markVideo(userId, code, publicacao, extra = {}) {
  if (!code) return;
  try {
    const rows = await db(`mc_docs?user_id=eq.${userId}&col=eq.videos&id=eq.${encodeURIComponent(code)}&select=data`);
    if (!rows?.length) return;
    const status = { ...(rows[0].data?.status || {}), publicacao };
    await db("rpc/mc_merge", { method: "POST", body: JSON.stringify({ p_col: "videos", p_id: code, p_patch: { status, ...extra } }) });
  } catch {
    /* o roteiro é um extra: nunca atrapalha o envio */
  }
}

const patchDraft = (id, patch) =>
  db(`tiktok_drafts?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });

async function refreshStatuses(ttTok, userId) {
  const rows = await db(`tiktok_drafts?user_id=eq.${userId}&status=in.(enviando,no_tiktok)&select=id,publish_id,status,sent_at,attempts,video_code`);
  for (const r of rows || []) {
    if (!r.publish_id) {
      if (Date.now() - new Date(r.sent_at || 0).getTime() > 30 * 60e3) await patchDraft(r.id, { status: "fila" });
      continue;
    }
    try {
      const d = await tiktokApi(ttTok, "/v2/post/publish/status/fetch/", { publish_id: r.publish_id });
      if (d.status === "PUBLISH_COMPLETE") {
        await patchDraft(r.id, { status: "publicado", error: null });
        await markVideo(userId, r.video_code, "postado");
      }
      else if (d.status === "FAILED") await patchDraft(r.id, { status: "erro", error: `O TikTok não processou o vídeo (${d.fail_reason || "sem motivo"}).` });
      else if (d.status === "SEND_TO_USER_INBOX" && r.status !== "no_tiktok") await patchDraft(r.id, { status: "no_tiktok", error: null });
      else if (r.status === "enviando" && Date.now() - new Date(r.sent_at || 0).getTime() > 30 * 60e3) {
        // Envio interrompido no meio: volta para a fila.
        await patchDraft(r.id, { status: "fila", publish_id: null, attempts: (r.attempts || 0) + 1 });
      }
    } catch {
      /* tenta de novo na próxima rodada */
    }
  }
}

async function pendingCount(userId) {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const rows = await db(`tiktok_drafts?user_id=eq.${userId}&status=in.(enviando,no_tiktok)&sent_at=gt.${since}&select=id`);
  return rows?.length || 0;
}

// Uma rodada completa para uma conta: procura, atualiza situações e envia o que couber.
export async function syncAccount(acc, deadline) {
  const out = { found: 0, sent: 0, error: null };
  try {
    const gtok = await googleAccess(acc.user_id);
    out.found = await scan(acc, gtok);
    const ttTok = await tiktokToken(acc);
    await refreshStatuses(ttTok, acc.user_id);
    let blocked = false;
    while (!blocked && Date.now() < deadline - 90e3) {
      if ((await pendingCount(acc.user_id)) >= maxPending()) break;
      const queue = await db(`tiktok_drafts?user_id=eq.${acc.user_id}&status=eq.fila&order=drive_created_at.asc&limit=15&select=*`);
      let row = null, cap = null;
      for (const r of queue || []) {
        cap = await prepareCaption(gtok, r);
        if (cap) { row = r; break; }
      }
      if (!row) break;
      await patchDraft(row.id, { caption: cap.caption, caption_source: cap.source, status: "enviando", sent_at: new Date().toISOString(), error: null });
      try {
        const publishId = await uploadDraft(ttTok, gtok, row, (pid) => patchDraft(row.id, { publish_id: pid }));
        await patchDraft(row.id, { status: "no_tiktok", publish_id: publishId });
        await markVideo(acc.user_id, row.video_code, "rascunho", { rascunhoEm: new Date().toISOString() });
        out.sent++;
      } catch (e) {
        if (/spam_risk|too_many_pending|rate_limit/i.test(e.code || "")) {
          await patchDraft(row.id, { status: "fila", publish_id: null, sent_at: null, error: "O TikTok pediu para esperar: há rascunhos demais pendentes. Publique ou descarte alguns no app do TikTok." });
          blocked = true;
        } else {
          const attempts = (row.attempts || 0) + 1;
          await patchDraft(row.id, { status: attempts >= 3 ? "erro" : "fila", publish_id: null, sent_at: null, attempts, error: e.message });
          if (/access_token|scope_not_authorized|unauthorized/i.test(e.code || "")) {
            await setAccount(acc.user_id, { needs_reconnect: true });
            blocked = true;
          }
        }
      }
    }
    await setAccount(acc.user_id, { last_sync: new Date().toISOString(), last_error: null });
  } catch (e) {
    out.error = e.message;
    await setAccount(acc.user_id, { last_sync: new Date().toISOString(), last_error: e.message }).catch(() => {});
  }
  return out;
}
