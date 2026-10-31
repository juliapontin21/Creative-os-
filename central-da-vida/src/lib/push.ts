import { sb } from './supabase'
import { isIOS, isStandalone } from './util'

export function pushSupport(): { ok: boolean; reason: string } {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    if (isIOS() && !isStandalone()) return { ok: false, reason: 'No iPhone, as notificações só funcionam com o app instalado: no Safari, Compartilhar → Adicionar à Tela de Início, e abra pelo ícone.' }
    return { ok: false, reason: 'Este navegador não aceita notificações. No iPhone, use o app instalado na Tela de Início (iOS 16.4 ou mais novo).' }
  }
  if (isIOS() && !isStandalone()) return { ok: false, reason: 'Abra o app pelo ícone da Tela de Início para ativar as notificações.' }
  return { ok: true, reason: '' }
}

const b64ToBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentSubscription() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

// Pede permissão, inscreve este aparelho e guarda a inscrição no banco.
export async function enablePush(): Promise<string> {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'Permissão negada. Para mudar: Ajustes do iPhone → Notificações → Central.'
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  const r = await fetch('/api/push-config')
  const cfg = await r.json().catch(() => ({}))
  if (!r.ok || !cfg.publicKey) return cfg.error ? `O servidor ainda não está configurado: ${cfg.error}` : 'Não consegui falar com o servidor.'
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.publicKey) }))
  const j = sub.toJSON()
  const { error } = await sb.from('push_subscriptions').upsert({ endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '', user_agent: navigator.userAgent.slice(0, 200) } as never, { onConflict: 'endpoint' })
  return error ? `Não consegui salvar a inscrição: ${error.message}` : ''
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function sendTest(): Promise<string> {
  const { data } = await sb.auth.getSession()
  const r = await fetch('/api/push-test', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) return j.error ?? 'Falhou.'
  return j.sent ? '' : 'Nenhum aparelho inscrito recebeu. Ative neste aparelho primeiro.'
}
