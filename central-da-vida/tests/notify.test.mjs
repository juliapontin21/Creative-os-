import { test } from 'node:test'
import assert from 'node:assert/strict'
import { local, plan } from '../api/_plan.js'

const H = 'h1', J = 'j', M = 'm'
const profiles = [{ id: J, household_id: H, display_name: 'Júlia' }, { id: M, household_id: H, display_name: 'Michelangelo' }]
const base = { profiles, prefs: [], events: [], reminders: [], habits: [], habitLogs: [], waterLogs: [], settings: [], transactions: [], invoices: [], weekStartYmd: '2026-11-01' }
// 02/11/2026 09:00 em São Paulo = 12:00 UTC
const at = (hm) => new Date(`2026-11-02T${hm}:00-03:00`)

test('horário local de São Paulo', () => {
  assert.deepEqual(local(at('09:00')), { ymd: '2026-11-02', min: 540, dow: 1 })
})

test('compromisso pessoal: avisa 30 min antes só para a dona; impacta → avisa o parceiro', () => {
  const ev = { id: 'e1', household_id: H, owner_id: J, context: 'pf', title: 'Gravação', start_at: at('10:00').toISOString(), reminders: [30], impacts_partner: true, location: '' }
  const r = plan({ ...base, now: at('09:31'), events: [ev] })
  assert.deepEqual(r.map((x) => x.user).sort(), [J, M])
  assert.match(r.find((x) => x.user === J).body, /10:00/)
  assert.equal(plan({ ...base, now: at('09:20'), events: [ev] }).length, 0)
  assert.equal(plan({ ...base, now: at('09:45'), events: [ev] }).length, 0) // passou da janela de 10 min
})

test('compromisso do casal avisa os dois; feito não avisa', () => {
  const ev = { id: 'e2', household_id: H, owner_id: J, context: 'casal', title: 'Jantar', start_at: at('20:00').toISOString(), reminders: [0, 60], impacts_partner: false, location: 'Centro' }
  assert.equal(plan({ ...base, now: at('19:00'), events: [ev] }).length, 2)
  assert.equal(plan({ ...base, now: at('19:00'), events: [{ ...ev, done_at: 'x' }] }).length, 0)
})

test('preferências: desligar eventos não avisa', () => {
  const ev = { id: 'e3', household_id: H, owner_id: J, context: 'pf', title: 'X', start_at: at('10:00').toISOString(), reminders: [0], impacts_partner: false, location: '' }
  assert.equal(plan({ ...base, now: at('10:00'), events: [ev], prefs: [{ owner_id: J, events: false }] }).length, 0)
})

test('lembrete do parceiro chega para quem recebe', () => {
  const r = plan({ ...base, now: at('18:02'), reminders: [{ id: 'r1', from_id: M, to_id: J, text: 'Comprar pão', remind_at: at('18:00').toISOString() }] })
  assert.equal(r.length, 1); assert.equal(r[0].user, J); assert.match(r[0].title, /Michelangelo/)
})

test('hábito: avisa no horário se não foi feito; respeita silêncio', () => {
  const h = { id: 'h1', owner_id: J, name: 'Ler', reminder_time: '21:00:00', frequency: 'diario', week_days: [], times_per_week: 3, target: 1 }
  assert.equal(plan({ ...base, now: at('21:01'), habits: [h] }).length, 1)
  assert.equal(plan({ ...base, now: at('21:01'), habits: [h], habitLogs: [{ habit_id: 'h1', date: '2026-11-02', value: 1 }] }).length, 0)
  assert.equal(plan({ ...base, now: at('23:01'), habits: [{ ...h, reminder_time: '23:00' }] }).length, 0) // silêncio 22h–7h
})

test('água: avisa no intervalo só se estiver abaixo do ritmo', () => {
  const prefs = [{ owner_id: J, water: true, water_every_min: 120 }]
  assert.equal(plan({ ...base, now: at('11:00'), prefs }).filter((x) => x.user === J).length, 1)
  assert.equal(plan({ ...base, now: at('11:00'), prefs, waterLogs: [{ owner_id: J, date: '2026-11-02', ml: 800 }] }).filter((x) => x.user === J).length, 0)
})

test('finanças: resumo às 9h com vencimentos de hoje e atrasados', () => {
  const tx = [{ status: 'previsto', kind: 'despesa', card_id: null, context: 'casal', owner_id: J, due_date: '2026-11-02', description: 'Aluguel', amount_cents: 350000 },
    { status: 'previsto', kind: 'despesa', card_id: null, context: 'pf', owner_id: M, due_date: '2026-10-30', description: 'Academia', amount_cents: 12990 }]
  const r = plan({ ...base, now: at('09:02'), transactions: tx })
  const j = r.find((x) => x.user === J), m = r.find((x) => x.user === M)
  assert.match(j.body, /Aluguel/); assert.doesNotMatch(j.body, /vencida/)
  assert.match(m.body, /1 conta vencida/)
})
