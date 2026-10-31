// Decide quais notificações enviar agora. Puro (sem rede), testado em tests/notify.test.mjs.
// Tudo no horário de São Paulo. A rotina roda a cada minuto; olha a janela dos últimos WINDOW minutos
// (para não perder nada se uma chamada atrasar) e o registro de enviados evita repetição.

export const WINDOW = 10
export const TZ = 'America/Sao_Paulo'

export function local(date, tz = TZ) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' })
    .formatToParts(date).map((x) => [x.type, x.value]))
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  return { ymd: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute), dow }
}
const hhmm = (d) => { const l = local(d); return `${String(Math.floor(l.min / 60)).padStart(2, '0')}:${String(l.min % 60).padStart(2, '0')}` }
const inQuiet = (p, min) => p.quiet_start === p.quiet_end ? false : p.quiet_start < p.quiet_end ? min >= p.quiet_start && min < p.quiet_end : min >= p.quiet_start || min < p.quiet_end
const DEFAULT_PREFS = { events: true, partner_events: true, partner_reminders: true, habits: true, water: false, water_every_min: 120, finance: true, finance_hour: 9, quiet_start: 1320, quiet_end: 420 }
const brl = (c) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100)

// "Acabou de chegar a hora?" — a hora alvo caiu dentro da janela (agora − WINDOW, agora].
const justDue = (target, now) => target <= now && target > now - WINDOW * 60000
const minuteDue = (targetMin, nowMin) => targetMin <= nowMin && targetMin > nowMin - WINDOW

export function plan(d) {
  const now = d.now.getTime()
  const L = local(d.now)
  const prefsOf = (id) => ({ ...DEFAULT_PREFS, ...(d.prefs.find((p) => p.owner_id === id) ?? {}) })
  const nameOf = (id) => d.profiles.find((p) => p.id === id)?.display_name ?? ''
  const partnerOf = (id) => d.profiles.find((p) => p.id !== id && p.household_id === d.profiles.find((x) => x.id === id)?.household_id)?.id
  const out = []
  const push = (key, user, title, body, url) => out.push({ key: `${key}:${user}`, user, title, body, url })

  // 1. Compromissos: nos minutos escolhidos antes do início.
  for (const e of d.events) {
    if (e.done_at || e.archived_at || !e.reminders?.length) continue
    const start = new Date(e.start_at).getTime()
    for (const m of e.reminders) {
      if (!justDue(start - m * 60000, now)) continue
      const when = m === 0 ? 'agora' : m >= 1440 ? `amanhã às ${hhmm(new Date(start))}` : `às ${hhmm(new Date(start))} (em ${m >= 60 ? `${m / 60} h` : `${m} min`})`
      const body = `${e.all_day ? 'Dia inteiro' : when}${e.location ? ` · ${e.location}` : ''}`
      const targets = new Set()
      if (e.context === 'casal') d.profiles.filter((p) => p.household_id === e.household_id).forEach((p) => targets.add(p.id))
      else targets.add(e.owner_id)
      for (const u of targets) if (prefsOf(u).events) push(`ev:${e.id}:${m}:${e.start_at}`, u, e.context === 'casal' ? `💞 ${e.title}` : e.title, body, '/#/agenda')
      const partner = partnerOf(e.owner_id)
      if (e.context === 'pf' && e.impacts_partner && partner && prefsOf(partner).partner_events)
        push(`ev:${e.id}:${m}:${e.start_at}`, partner, `${nameOf(e.owner_id)}: ${e.title}`, `${body} · afeta você`, '/#/agenda')
    }
  }

  // 2. Lembretes do parceiro, na hora marcada.
  for (const r of d.reminders) {
    if (r.done_at || !justDue(new Date(r.remind_at).getTime(), now) || !prefsOf(r.to_id).partner_reminders) continue
    push(`pr:${r.id}`, r.to_id, `🔔 Lembrete de ${nameOf(r.from_id)}`, r.text, '/#/hoje')
  }

  // 3. Hábitos no horário escolhido, se ainda não feitos (respeita silêncio).
  for (const h of d.habits) {
    if (h.archived_at || !h.reminder_time) continue
    const p = prefsOf(h.owner_id)
    if (!p.habits || inQuiet(p, L.min)) continue
    const [hh, mm] = h.reminder_time.split(':').map(Number)
    if (!minuteDue(hh * 60 + mm, L.min)) continue
    if (h.frequency === 'dias' && !h.week_days.includes(L.dow)) continue
    const logs = d.habitLogs.filter((l) => l.habit_id === h.id)
    if (logs.some((l) => l.date === L.ymd && Number(l.value) >= Number(h.target))) continue
    if (h.frequency === 'semana' && logs.filter((l) => l.date >= d.weekStartYmd && Number(l.value) >= Number(h.target)).length >= h.times_per_week) continue
    push(`hb:${h.id}:${L.ymd}`, h.owner_id, `✅ ${h.name}`, 'Hora do seu hábito de hoje.', '/#/habitos')
  }

  // 4. Água: a cada X minutos entre 9h e 21h, se estiver abaixo do ritmo da meta.
  for (const p0 of d.profiles) {
    const p = prefsOf(p0.id)
    if (!p.water || inQuiet(p, L.min) || L.min < 540 || L.min > 1260) continue
    const slot = Math.floor((L.min - 540) / p.water_every_min)
    if (slot < 1 || !minuteDue(540 + slot * p.water_every_min, L.min)) continue
    const goal = d.settings.find((s) => s.owner_id === p0.id)?.water_goal_ml ?? 2000
    const drank = d.waterLogs.filter((w) => w.owner_id === p0.id && w.date === L.ymd).reduce((s, w) => s + w.ml, 0)
    if (drank >= goal * ((L.min - 540) / 720)) continue
    push(`wt:${L.ymd}:${slot}`, p0.id, '💧 Hora de beber água', `Você bebeu ${(Math.max(0, drank) / 1000).toLocaleString('pt-BR')} L de ${(goal / 1000).toLocaleString('pt-BR')} L hoje.`, '/#/habitos')
  }

  // 5. Finanças: um resumo por dia no horário escolhido (vencimentos de hoje e atrasados).
  for (const p0 of d.profiles) {
    const p = prefsOf(p0.id)
    if (!p.finance || inQuiet(p, L.min) || !minuteDue(p.finance_hour * 60, L.min)) continue
    const mine = d.transactions.filter((t) => t.status === 'previsto' && t.kind === 'despesa' && !t.card_id && (t.context === 'casal' || t.owner_id === p0.id))
    const today = mine.filter((t) => t.due_date === L.ymd)
    const late = mine.filter((t) => t.due_date < L.ymd)
    const inv = d.invoices.filter((i) => i.due === L.ymd && (i.context === 'casal' || i.owner_id === p0.id))
    if (!today.length && !late.length && !inv.length) continue
    const parts = []
    if (today.length || inv.length) parts.push(`Vence hoje: ${[...today.map((t) => `${t.description} ${brl(t.amount_cents)}`), ...inv.map((i) => `fatura ${i.name} ${brl(i.total)}`)].join(', ')}`)
    if (late.length) parts.push(`${late.length} ${late.length === 1 ? 'conta vencida' : 'contas vencidas'}`)
    push(`fin:${L.ymd}`, p0.id, '💰 Contas do dia', parts.join(' · '), '/#/financas/lancamentos')
  }
  return out
}
