// Chamado a cada minuto pela rotina do Supabase. Confere o segredo, decide o que avisar e envia.
import { admin, pushTo, send, vapid } from './_lib.js'
import { local, plan, WINDOW } from './_plan.js'

const addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, d + n)); return x.toISOString().slice(0, 10) }

export default async function handler(req, res) {
  try {
    const db = admin()
    const { data: secret } = await db.rpc('get_app_secret', { p_name: 'cron_secret' })
    if (!secret || req.headers['x-cron-secret'] !== secret) return send(res, 401, { error: 'não autorizado' })
    await vapid(db)

    const now = new Date()
    const L = local(now)
    const weekStartYmd = addDays(L.ymd, -L.dow)
    const iso = (ms) => new Date(ms).toISOString()
    const [profiles, prefs, events, reminders, habits, habitLogs, waterLogs, settings, transactions, cards] = await Promise.all([
      db.from('profiles').select('id, household_id, display_name'),
      db.from('notification_prefs').select('*'),
      db.from('events').select('id, household_id, owner_id, context, title, start_at, all_day, location, reminders, impacts_partner, done_at, archived_at')
        .gte('start_at', iso(now.getTime() - WINDOW * 60000)).lte('start_at', iso(now.getTime() + 1441 * 60000)).is('done_at', null).is('archived_at', null),
      db.from('partner_reminders').select('*').gte('remind_at', iso(now.getTime() - (WINDOW + 5) * 60000)).lte('remind_at', iso(now.getTime())).is('done_at', null),
      db.from('habits').select('*').not('reminder_time', 'is', null).is('archived_at', null),
      db.from('habit_logs').select('habit_id, date, value').gte('date', weekStartYmd),
      db.from('water_logs').select('owner_id, date, ml').eq('date', L.ymd),
      db.from('personal_settings').select('owner_id, water_goal_ml'),
      db.from('transactions').select('id, status, kind, card_id, context, owner_id, due_date, description, amount_cents').eq('status', 'previsto').eq('kind', 'despesa').lte('due_date', L.ymd),
      db.from('cards').select('id, name, context, owner_id'),
    ])
    const tx = transactions.data ?? []
    const invoices = (cards.data ?? []).map((c) => ({ ...c, due: L.ymd, total: tx.filter((t) => t.card_id === c.id && t.due_date === L.ymd).reduce((s, t) => s + Number(t.amount_cents), 0) })).filter((i) => i.total > 0)

    const candidates = plan({
      now, profiles: profiles.data ?? [], prefs: prefs.data ?? [], events: events.data ?? [], reminders: reminders.data ?? [],
      habits: habits.data ?? [], habitLogs: habitLogs.data ?? [], waterLogs: waterLogs.data ?? [], settings: settings.data ?? [],
      transactions: tx.filter((t) => !t.card_id), invoices, weekStartYmd,
    })
    if (!candidates.length) return send(res, 200, { sent: 0 })

    // Não repetir: o registro guarda cada aviso já enviado.
    const { data: already } = await db.from('notification_log').select('key').in('key', candidates.map((c) => c.key))
    const done = new Set((already ?? []).map((x) => x.key))
    const fresh = candidates.filter((c) => !done.has(c.key))
    if (fresh.length) await db.from('notification_log').upsert(fresh.map((c) => ({ key: c.key })), { onConflict: 'key', ignoreDuplicates: true })
    let sent = 0
    for (const c of fresh) sent += await pushTo(db, c.user, { title: c.title, body: c.body, url: c.url, tag: c.key })
    if (L.min === 180) await db.from('notification_log').delete().lt('sent_at', iso(now.getTime() - 7 * 86400000))
    send(res, 200, { candidates: candidates.length, sent })
  } catch (e) { send(res, 500, { error: e.message }) }
}
