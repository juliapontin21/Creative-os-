import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/ui'
import { addDays, ymd } from '../lib/agenda'
import { parseCommand, type Proposal } from '../lib/command'
import { useData } from '../lib/data'
import { parseItem } from '../lib/food'
import { accountBalance, addMonths, fmtMoney, isOverdue, splitInstallments } from '../lib/finance'
import { methodLabel, useCtxOptions } from '../lib/finctx'
import { go } from '../lib/route'
import type { Transaction } from '../lib/types'
import { EventEditor } from './AgendaEditors'
import { useAddToList } from './Alimentacao'
import { useMonthModel } from './Fin3B'
import { TxEditor, type TxInitial } from './FinEditors'

const EXAMPLES = [
  'gastei 85 no mercado no cartão do casal', 'dentista sexta 15h', 'bebi 500 ml', 'mercado: leite, pão e 2 kg tomate',
  'lembra o Mi de pagar o condomínio amanhã às 9', 'quanto ainda tenho de mesada?', 'o que tenho amanhã?', 'fiz 40 min de dança',
  'comi salada com frango no almoço', 'posso comprar uma vara de pesca de 3000 em 10x?',
]
const MEAL: Record<string, string> = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Café da tarde', jantar: 'Jantar' }
const dateLabel = (d: string) => { const t = ymd(new Date()); return d === t ? 'hoje' : d === addDays(t, 1) ? 'amanhã' : d === addDays(t, -1) ? 'ontem' : new Date(d + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) }
const toIso = (day: string, hm: string) => { const [y, m, d] = day.split('-').map(Number); const [h, mi] = hm.split(':').map(Number); return new Date(y, m - 1, d, h, mi).toISOString() }

export function FaleComigo({ onClose }: { onClose: () => void }) {
  const d = useData()
  const ctxOpts = useCtxOptions()
  const addToList = useAddToList()
  const model = useMonthModel()
  const [text, setText] = useState('')
  const [p, setP] = useState<Proposal | null>(null)
  const [answer, setAnswer] = useState<string[] | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [editTx, setEditTx] = useState<TxInitial | null>(null)
  const [editEv, setEditEv] = useState<{ day: string; startMin?: number; durMin?: number; allDay?: boolean } | null>(null)
  const me = d.me!
  const partner = d.partner
  const today = ymd(new Date())
  const myCtx = (c: 'pf' | 'casal' | 'empresa') => ctxOpts.find((o) => o.ctx === c && (c === 'casal' || o.owner === me.id))!

  const understand = (value = text) => {
    const r = parseCommand(value, {
      now: new Date(),
      partnerNames: partner ? [partner.display_name, partner.display_name.slice(0, 2)].filter((x) => x.length >= 2) : [],
      financeCategories: d.categories.filter((c) => c.module === 'financas' && !c.archived_at).map((c) => ({ id: c.id, name: c.name })),
      cards: d.cards.filter((c) => !c.archived_at && (c.context === 'casal' || c.owner_id === me.id)).map((c) => ({ id: c.id, name: c.name, couple: c.is_couple_card })),
      accounts: d.accounts.filter((a) => !a.archived_at && (a.context === 'casal' || a.owner_id === me.id)).map((a) => ({ id: a.id, name: a.name })),
      habits: d.habits.filter((h) => h.owner_id === me.id && !h.archived_at).map((h) => ({ id: h.id, name: h.name })),
      hasCompany: me.has_company,
    })
    setAnswer(null)
    if (r.kind === 'consulta') { setP(null); setAnswer(consult(r)); return }
    if (r.kind === 'simular') {
      try { sessionStorage.setItem('cdv-sim-prefill', JSON.stringify(r)) } catch { /* sem armazenamento */ }
      onClose(); go('financas', 'simular'); return
    }
    setP(r)
  }

  // Consultas: os números vêm dos mesmos cálculos do app.
  const consult = (q: Extract<Proposal, { kind: 'consulta' }>): string[] => {
    if (q.topic === 'mesada') {
      const m = model(myCtx('pf'), today.slice(0, 7))
      return m.allowance == null ? ['Não consegui calcular a mesada.'] : [`Sua mesada deste mês: ${fmtMoney(m.allowance)}.`, `Usado até agora: ${fmtMoney(m.allowance - (m.room ?? 0))}.`, `Resta: ${fmtMoney(m.room ?? 0)}.`]
    }
    if (q.topic === 'saldo') {
      const accs = d.accounts.filter((a) => !a.archived_at && a.context === 'pf' && a.owner_id === me.id)
      if (!accs.length) return ['Você ainda não cadastrou contas pessoais (Finanças → Contas).']
      const lines = accs.map((a) => `${a.name}: ${fmtMoney(accountBalance(a, d.transactions, d.cards, today))}`)
      return [...lines, `Total: ${fmtMoney(accs.reduce((s, a) => s + accountBalance(a, d.transactions, d.cards, today), 0))}`]
    }
    if (q.topic === 'agenda') {
      const days = q.range === 'semana' ? 7 : 1
      const end = addDays(q.date, days)
      const evs = d.events.filter((e) => !e.archived_at && ymd(new Date(e.start_at)) >= q.date && ymd(new Date(e.start_at)) < end && (e.context === 'casal' || e.owner_id === me.id || e.impacts_partner))
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
      if (!evs.length) return [`Nada na agenda ${days === 7 ? 'nos próximos 7 dias' : dateLabel(q.date)}.`]
      return evs.map((e) => `${days === 7 ? dateLabel(ymd(new Date(e.start_at))) + ' · ' : ''}${e.all_day ? 'dia inteiro' : new Date(e.start_at).toTimeString().slice(0, 5)} · ${e.title}${e.context === 'casal' ? ' (casal)' : e.owner_id !== me.id ? ` (${partner?.display_name})` : ''}`)
    }
    if (q.topic === 'vencimentos') {
      const end = addDays(q.date, q.range === 'semana' ? 7 : 1)
      const mine = d.transactions.filter((t) => t.status === 'previsto' && t.kind === 'despesa' && !t.card_id && (t.context === 'casal' || t.owner_id === me.id))
      const soon = mine.filter((t) => t.due_date >= q.date && t.due_date < end).sort((a, b) => a.due_date.localeCompare(b.due_date))
      const late = mine.filter((t) => isOverdue(t, today))
      const lines = soon.map((t) => `${dateLabel(t.due_date)} · ${t.description} · ${fmtMoney(t.amount_cents)}`)
      if (late.length) lines.push(`Atrasadas: ${late.length} (${fmtMoney(late.reduce((s, t) => s + t.amount_cents, 0))})`)
      return lines.length ? lines : ['Nada vencendo nesse período. 🎉']
    }
    const month = today.slice(0, 7)
    const exp = d.transactions.filter((t) => t.kind === 'despesa' && t.status !== 'cancelado' && (t.paid_date ?? t.due_date).slice(0, 7) === month && (!q.categoryId || t.category_id === q.categoryId))
    const mine = exp.filter((t) => t.context === 'pf' && t.owner_id === me.id).reduce((s, t) => s + t.amount_cents, 0)
    const casal = exp.filter((t) => t.context === 'casal').reduce((s, t) => s + t.amount_cents, 0)
    const cat = q.categoryId ? d.categories.find((c) => c.id === q.categoryId)?.name : null
    return [`Neste mês${cat ? ` em ${cat}` : ''}:`, `Seus gastos pessoais: ${fmtMoney(mine)}`, `Gastos do casal: ${fmtMoney(casal)}`]
  }

  const firstAccount = (c: 'pf' | 'casal' | 'empresa') => d.accounts.find((a) => !a.archived_at && a.context === c && (c === 'casal' || a.owner_id === me.id))?.id ?? null

  const confirm = async () => {
    if (!p) return
    let ok = false, label = ''
    if (p.kind === 'despesa' || p.kind === 'receita') {
      const base: Partial<Transaction> = {
        kind: p.kind, context: p.context, description: p.description, payment_method: p.cardId ? 'cartao' : p.method as Transaction['payment_method'],
        category_id: p.categoryId, client: p.client, card_id: p.cardId, account_id: p.cardId ? null : p.accountId ?? firstAccount(p.context),
        status: p.done ? 'realizado' : 'previsto', paid_date: p.done ? p.date : null,
      }
      if (p.cardId && p.installments > 1) {
        const g = crypto.randomUUID()
        ok = !!(await d.insertMany('transactions', splitInstallments(p.cents, p.installments).map((v, i) => ({ ...base, amount_cents: v, competence_date: addMonths(p.date, i), due_date: addMonths(p.date, i), status: 'previsto' as const, paid_date: null, installment_group: g, installment_no: i + 1, installment_total: p.installments }))))
      } else ok = !!(await d.insert('transactions', { ...base, amount_cents: p.cents, competence_date: p.date, due_date: p.date, ...(p.cardId ? { status: 'previsto' as const, paid_date: null } : {}) }))
      label = `${p.kind === 'receita' ? 'Receita' : 'Despesa'} de ${fmtMoney(p.cents)} lançada`
    } else if (p.kind === 'agua') { ok = !!(await d.insert('water_logs', { date: today, ml: p.ml })); label = `+${p.ml} ml de água` }
    else if (p.kind === 'mercado') { await addToList(p.items.map(parseItem), 'Fale comigo'); ok = true; label = `${p.items.length} ${p.items.length === 1 ? 'item' : 'itens'} na lista do mercado` }
    else if (p.kind === 'compromisso') {
      const row = p.start ? { start_at: toIso(p.date, p.start), end_at: toIso(p.date, p.end ?? p.start), all_day: false } : { start_at: toIso(p.date, '00:00'), end_at: toIso(addDays(p.date, 1), '00:00'), all_day: true }
      ok = !!(await d.insert('events', { ...row, title: p.title, context: p.context, nature: p.nature, reminders: [30] }))
      label = `Compromisso "${p.title}" na agenda`
    } else if (p.kind === 'lembrete' && partner) { ok = !!(await d.insert('partner_reminders', { to_id: partner.id, text: p.text, remind_at: toIso(p.date, p.time) })); label = `Lembrete enviado para ${partner.display_name}` }
    else if (p.kind === 'habito') {
      const h = d.habits.find((x) => x.id === p.habitId)
      const log = d.habit_logs.find((l) => l.habit_id === p.habitId && l.date === p.date)
      ok = !!(log ? await d.update('habit_logs', log.id, { value: h?.target ?? 1 }) : await d.insert('habit_logs', { habit_id: p.habitId, date: p.date, value: h?.target ?? 1 }))
      label = `Hábito "${p.name}" marcado`
    } else if (p.kind === 'treino') { ok = !!(await d.insert('workout_sessions', { workout_id: null, workout_name: p.activity, activity: p.activity, date: p.date, minutes: p.minutes, items: [] })); label = `${p.activity} · ${p.minutes} min registrado` }
    else if (p.kind === 'comi') { ok = !!(await d.insert('food_logs', { date: p.date, meal: p.meal, text: p.text, kcal: p.kcal, servings: 1 })); label = `${MEAL[p.meal]} registrado no diário` }
    else if (p.kind === 'nota') { ok = !!(await d.insert('notes', { title: p.text.slice(0, 200), date: p.date, scope: 'pessoal' })); label = 'Nota criada' }
    if (ok) { setDone([`✅ ${label}`, ...done].slice(0, 6)); setP(null); setText(''); d.toast(label + '.') }
  }

  const edit = () => {
    if (!p) return
    if (p.kind === 'despesa' || p.kind === 'receita') setEditTx({ kind: p.kind, ctx: myCtx(p.context), amount: p.cents, description: p.description, date: p.date, category: p.categoryId, payWith: p.cardId ? 'cartao' : 'conta', cardId: p.cardId ?? '', installments: p.installments })
    else if (p.kind === 'compromisso') { const [h, mi] = (p.start ?? '09:00').split(':').map(Number); const [eh, emi] = (p.end ?? p.start ?? '10:00').split(':').map(Number); setEditEv({ day: p.date, startMin: h * 60 + mi, durMin: Math.max(15, eh * 60 + emi - (h * 60 + mi)), allDay: !p.start }) }
    else if (p.kind === 'mercado') { onClose(); go('alimentacao', 'mercado') }
    else if (p.kind === 'comi') { onClose(); go('alimentacao', 'diario') }
    else if (p.kind === 'treino') { onClose(); go('treinos') }
    else if (p.kind === 'habito' || p.kind === 'agua') { onClose(); go('habitos') }
  }

  const rows: [string, string][] = !p ? [] : p.kind === 'despesa' || p.kind === 'receita' ? [
    ['Tipo', p.kind === 'despesa' ? (p.cardId ? 'Compra no cartão (entra na fatura)' : p.done ? 'Despesa paga' : 'Despesa a pagar') : (p.done ? 'Receita recebida' : 'Receita a receber')],
    ['Valor', `${fmtMoney(p.cents)}${p.installments > 1 ? ` em ${p.installments}x de ${fmtMoney(splitInstallments(p.cents, p.installments)[1])}` : ''}`],
    ['Descrição', p.description], ['Aba', p.context === 'casal' ? 'Casal' : p.context === 'empresa' ? 'Empresa' : me.display_name],
    ['Como', p.cardId ? `Cartão ${d.cards.find((c) => c.id === p.cardId)?.name ?? ''}` : `${methodLabel(p.method)}${(p.accountId ?? firstAccount(p.context)) ? ` · ${d.accounts.find((a) => a.id === (p.accountId ?? firstAccount(p.context)))?.name}` : ''}`],
    ['Categoria', d.categories.find((c) => c.id === p.categoryId)?.name ?? '—'], ['Data', dateLabel(p.date)], ...(p.client ? [['Cliente', p.client] as [string, string]] : []),
  ] : p.kind === 'agua' ? [['Água', `+${p.ml} ml hoje`]]
    : p.kind === 'mercado' ? p.items.map((i, k) => [k === 0 ? 'Para a lista' : '', i] as [string, string])
    : p.kind === 'compromisso' ? [['Compromisso', p.title], ['Quando', `${dateLabel(p.date)}${p.start ? ` · ${p.start}–${p.end}` : ' · dia inteiro'}`], ['Agenda', p.context === 'casal' ? 'Casal' : me.display_name], ['Tipo', p.nature === 'trabalho' ? 'Trabalho' : 'Pessoal'], ['Lembrar', '30 min antes']]
    : p.kind === 'lembrete' ? [['Para', partner?.display_name ?? '—'], ['Lembrar de', p.text], ['Quando', `${dateLabel(p.date)} às ${p.time}`]]
    : p.kind === 'habito' ? [['Hábito', p.name], ['Dia', dateLabel(p.date)]]
    : p.kind === 'treino' ? [['Atividade', p.activity], ['Duração', `${p.minutes} min`], ['Dia', dateLabel(p.date)]]
    : p.kind === 'comi' ? [['Refeição', MEAL[p.meal]], ['O que', p.text], ['Calorias', p.kcal ? `${p.kcal} kcal` : 'não informado'], ['Dia', dateLabel(p.date)]]
    : p.kind === 'nota' ? [['Nota', p.text], ...(p.date ? [['Data', dateLabel(p.date)] as [string, string]] : [])] : []

  return (
    <Sheet title="Fale comigo" onClose={onClose}>
      <div className="searchrow">
        <input autoFocus value={text} onChange={(e) => { setText(e.target.value); setP(null); setAnswer(null) }} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) understand() }}
          placeholder="Ex.: gastei 85 no mercado no cartão do casal" aria-label="O que você quer registrar ou perguntar" enterKeyHint="send" />
        <button className="btn primary" disabled={!text.trim()} onClick={() => understand()} aria-label="Entender"><Icon name="right" /></button>
      </div>
      <p className="hint">Dica: no iPhone, toque no microfone do teclado para falar em vez de digitar.</p>

      {p && p.kind !== 'desconhecido' && (
        <div className="card proposal">
          <strong>Entendi assim. Confere?</strong>
          <dl className="prop-rows">{rows.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          {p.kind === 'lembrete' && !partner && <p className="hint err">Seu parceiro ainda não entrou no app.</p>}
          <div className="row2">
            <button className="btn" onClick={edit}>Editar</button>
            <button className="btn primary" onClick={confirm} disabled={p.kind === 'lembrete' && !partner}><Icon name="check" />Confirmar</button>
          </div>
        </div>
      )}
      {p?.kind === 'desconhecido' && (
        <div className="card warn">
          <strong>Não entendi esse comando.</strong>
          <p className="small">Esta versão funciona por regras (sem IA). Tente começar com o que aconteceu: "gastei…", "recebi…", "bebi…", "mercado:…", "lembra o {partner?.display_name ?? 'parceiro'} de…", ou um compromisso com dia e hora. Quando a IA for ligada, frases mais livres vão funcionar.</p>
        </div>
      )}
      {answer && <div className="card info answer">{answer.map((a, i) => <p key={i}>{a}</p>)}</div>}
      {done.length > 0 && <div className="list compact">{done.map((x, i) => <div key={i} className="list-row small">{x}</div>)}</div>}

      {!p && !answer && <div className="field"><span className="label">Experimente</span>
        <div className="chips wrap">{EXAMPLES.map((e) => <button key={e} className="chip small-chip" onClick={() => { setText(e); understand(e) }}>{e}</button>)}</div></div>}

      {editTx && <TxEditor tx={null} preset={{ kind: editTx.kind, ctx: editTx.ctx }} initial={editTx} onClose={() => { setEditTx(null); setP(null); setText('') }} />}
      {editEv && <EventEditor ev={null} draft={editEv} onClose={() => { setEditEv(null); setP(null); setText('') }} />}
    </Sheet>
  )
}

// Para o Simulador ler o pedido feito por aqui.
export function takeSimPrefill(): Extract<Proposal, { kind: 'simular' }> | null {
  try { const r = sessionStorage.getItem('cdv-sim-prefill'); sessionStorage.removeItem('cdv-sim-prefill'); return r ? JSON.parse(r) : null } catch { return null }
}
