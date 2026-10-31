// Funções do servidor (Vercel). Usam a chave secreta do Supabase, que fica só nas variáveis da Vercel.
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const env = (k) => (process.env[k] || '').trim()
export const SITE = 'https://central-da-vida-vert.vercel.app'

export function admin() {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

// Chaves de notificação (VAPID): criadas uma vez pelo próprio servidor e guardadas no banco.
export async function vapid(db) {
  const get = async (n) => (await db.rpc('get_app_secret', { p_name: n })).data
  let pub = await get('vapid_public'), priv = await get('vapid_private')
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys()
    await db.rpc('set_app_secret', { p_name: 'vapid_public', p_value: k.publicKey })
    await db.rpc('set_app_secret', { p_name: 'vapid_private', p_value: k.privateKey })
    pub = await get('vapid_public'); priv = await get('vapid_private') // se outro processo criou antes, vale o que ficou salvo
  }
  webpush.setVapidDetails(SITE, pub, priv)
  return pub
}

// Envia para todos os aparelhos de uma pessoa; remove inscrições que não existem mais.
export async function pushTo(db, userId, payload) {
  const { data: subs } = await db.from('push_subscriptions').select('*').eq('owner_id', userId)
  let ok = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 })
      ok++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
    }
  }
  return ok
}

// Confere o login de quem chama (token do Supabase no cabeçalho Authorization).
export async function userFrom(req, db) {
  const jwt = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!jwt) return null
  const { data } = await db.auth.getUser(jwt)
  return data?.user ?? null
}
