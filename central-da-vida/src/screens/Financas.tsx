import { useMemo, useState } from 'react'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Dot, Empty, Segmented } from '../components/ui'
import { useData } from '../lib/data'
import { EMPTY_FILTERS, expandCategories, type Filters } from '../lib/filters'
import { accountBalance, cashDate, fmtMoney, forecast, invoices, isOverdue, monthOf, monthSummary, type Invoice } from '../lib/finance'
import { canWrite, inCtx, methodLabel, useCtxOptions, useSessionState, type CtxOpt } from '../lib/finctx'
import { go } from '../lib/route'
import type { Account, Card, Payee, Transaction } from '../lib/types'
import { fmtDate, norm, todayISO } from '../lib/util'
import { accountKindLabel, AccountEditor, CardEditor, PayeeEditor, pixTypeLabel, TxEditor } from './FinEditors'

type Sub = 'resumo' | 'lancamentos' | 'contas' | 'pix'
const SUBS: { id: Sub; label: string }[] = [
  { id: 'resumo', label: 'Resumo' }, { id: 'lancamentos', label: 'Lançamentos' }, { id: 'contas', label: 'Contas' }, { id: 'pix', label: 'Pix' },
]
const STATUSES = [{ id: 'previsto', label: 'Previstos' }, { id: 'vencido', label: 'Vencidos' }, { id: 'realizado', label: 'Pagos' }, { id: 'cancelado', label: 'Cancelados' }]

function monthLabel(m: string) {
  const [y, mm] = m.split('-').map(Number)
  const s = new Date(y, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function shiftMonth(m: string, n: number) {
  const [y, mm] = m.split('-').map(Number)
  const d = new Date(y, mm - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function useFinCtx() {
  const opts = useCtxOptions()
  const [key, setKey] = useSessionState('cdv-fin-ctx', opts.find((o) => o.writable && o.ctx === 'pf')?.key ?? 'casal')
  const cur = opts.find((o) => o.key === key) ?? opts[0]
  return { opts, cur, setKey }
}

type EditState = { tx: Transaction | null; kind: Transaction['kind'] } | null

export function Financas({ sub: subArg }: { sub: string }) {
  const { opts, cur, setKey } = useFinCtx()
  const [month, setMonth] = useSessionState('cdv-fin-month', todayISO().slice(0, 7))
  const [edit, setEdit] = useState<EditState>(null)
  const sub = (SUBS.find((s) => s.id === subArg)?.id ?? 'resumo') as Sub
  if (!cur) return null
  return (
    <>
      <div className="chips scroll">
        {opts.map((o) => (
          <button key={o.key} className={'chip' + (o.key === cur.key ? ' on' : '')} onClick={() => setKey(o.key)}>
            {o.ctx === 'casal' ? <Icon name="heart" size={14} /> : o.ctx === 'empresa' ? <Icon name="wallet" size={14} /> : <Icon name="user" size={14} />}
            {o.label}{!o.writable && ' (só ver)'}
          </button>
        ))}
      </div>
      <Segmented value={sub} onChange={(s) => go('financas', s)} options={SUBS} />
      {(sub === 'resumo' || sub === 'lancamentos') && (
        <div className="month-pick">
          <button className="icon-btn" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}><Icon name="back" /></button>
          <strong>{monthLabel(month)}</strong>
          <button className="icon-btn" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}><Icon name="right" /></button>
        </div>
      )}
      {!cur.writable && <p className="card info">Você está vendo a organização de {cur.label}. Só {cur.label} edita.</p>}
      {sub === 'resumo' && <Resumo cur={cur} month={month} onOpen={(tx) => setEdit({ tx, kind: tx.kind })} />}
      {sub === 'lancamentos' && <Lancamentos cur={cur} month={month} onOpen={(tx) => setEdit({ tx, kind: tx.kind })} />}
      {sub === 'contas' && <Contas cur={cur} />}
      {sub === 'pix' && <Pix cur={cur} />}
      {(sub === 'resumo' || sub === 'lancamentos') && cur.writable && (
        <button className="fab" aria-label="Novo lançamento" onClick={() => setEdit({ tx: null, kind: 'despesa' })}><Icon name="plus" size={26} /></button>
      )}
      {edit && <TxEditor tx={edit.tx} preset={{ kind: edit.kind, ctx: cur }} onClose={() => setEdit(null)} />}
    </>
  )
}

// ───────────────────────── Resumo ─────────────────────────

function Resumo({ cur, month, onOpen }: { cur: CtxOpt; month: string; onOpen: (t: Transaction) => void }) {
  const { accounts, cards, transactions } = useData()
  const today = todayISO()
  const accs = accounts.filter((a) => !a.archived_at && inCtx(a, cur))
  const txs = transactions.filter((t) => inCtx(t, cur))
  const s = monthSummary(txs, month, today)
  const balance = accs.reduce((sum, a) => sum + accountBalance(a, transactions, cards, today), 0)
  const fc = forecast(accs, transactions, cards, month, today)
  const upcoming = txs.filter((t) => t.status === 'previsto' && t.kind !== 'transferencia' && (isOverdue(t, today) || monthOf(t.due_date) === month))
    .sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 10)
  const ctxCards = cards.filter((c) => !c.archived_at && inCtx(c, cur))

  return (
    <>
      {!accs.length && cur.writable && (
        <div className="card tip"><div className="grow"><strong>Comece cadastrando uma conta</strong>
          <p>Com o saldo inicial, o app calcula o saldo de hoje e a previsão do mês.</p></div>
          <button className="btn" onClick={() => go('financas', 'contas')}>Cadastrar</button></div>
      )}
      <div className="grid2">
        <Stat label="Saldo nas contas hoje" value={accs.length ? fmtMoney(balance) : '—'} />
        <Stat label="Previsão de fechamento" value={accs.length ? fmtMoney(fc) : '—'} tone={fc < 0 ? 'neg' : undefined} hint="saldo + previstos até o fim do mês" />
        <Stat label="Receitas" value={fmtMoney(s.incomeDone)} hint={`+ ${fmtMoney(s.incomePlanned)} a receber`} tone="pos" />
        <Stat label="Despesas" value={fmtMoney(s.expenseDone)} hint={`+ ${fmtMoney(s.expensePlanned)} a pagar`} />
      </div>
      {s.overdueCount > 0 && (
        <button className="card alert" onClick={() => go('financas', 'lancamentos')}>
          <Icon name="calendar" /><span className="grow"><strong>{s.overdueCount} {s.overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}</strong>
            <span>{fmtMoney(s.overdueTotal)} em aberto</span></span><Icon name="right" size={18} />
        </button>
      )}
      {ctxCards.length > 0 && (
        <section><div className="section-head"><h2>Faturas</h2></div>
          <div className="list">{ctxCards.map((c) => {
            const next = invoices(c.id, transactions, today).find((i) => i.status !== 'paga')
            return (
              <button key={c.id} className="card list-link" onClick={() => go('financas', 'contas')}>
                <Dot color={c.color} /><span className="grow"><strong>{c.name}</strong>
                  <span className="muted">{next ? `vence ${fmtDate(next.due)}` : 'nenhuma fatura em aberto'}</span></span>
                {next && <strong className={next.status === 'vencida' ? 'neg' : ''}>{fmtMoney(next.open)}</strong>}
              </button>
            )
          })}</div></section>
      )}
      <section><div className="section-head"><h2>A pagar e a receber</h2></div>
        {upcoming.length ? <TxList txs={upcoming} onOpen={onOpen} /> : <p className="muted pad">Nada previsto para este mês.</p>}
      </section>
    </>
  )
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="card stat">
      <span className="muted small">{label}</span>
      <strong className={'stat-value ' + (tone ?? '')}>{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  )
}

// ───────────────────────── Lista de lançamentos ─────────────────────────

export function TxList({ txs, onOpen }: { txs: Transaction[]; onOpen: (t: Transaction) => void }) {
  const { me, accounts, cards, categories, profiles, update, toast } = useData()
  const today = todayISO()
  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of txs) { const d = cashDate(t); m.set(d, [...(m.get(d) ?? []), t]) }
    return [...m.entries()]
  }, [txs])
  const markPaid = async (t: Transaction) => {
    if (await update('transactions', t.id, { status: 'realizado', paid_date: t.due_date <= today ? t.due_date : today })) toast(t.kind === 'receita' ? 'Marcado como recebido.' : 'Marcado como pago.')
  }
  return (
    <div className="list">
      {groups.map(([day, list]) => (
        <div key={day} className="day-group">
          <span className="day-head">{fmtDate(day, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
          {list.map((t) => {
            const cat = categories.find((c) => c.id === t.category_id)
            const where = t.card_id ? cards.find((c) => c.id === t.card_id)?.name : accounts.find((a) => a.id === t.account_id)?.name
            const by = profiles.find((p) => p.id === t.owner_id)
            const late = isOverdue(t, today)
            const sign = t.kind === 'receita' || t.direction === 'entrada' ? '+' : t.kind === 'transferencia' ? '−' : '−'
            const writable = canWrite(t, me!.id) && t.kind !== 'transferencia'
            return (
              <div key={t.id} className={'card tx' + (t.status === 'cancelado' ? ' canceled' : '')}>
                <button className="tx-main" onClick={() => onOpen(t)}>
                  <span className="tx-dot" style={{ background: cat?.color ?? 'var(--line)' }} />
                  <span className="grow tx-text">
                    <strong>{t.description}{t.installment_total ? ` (${t.installment_no}/${t.installment_total})` : ''}</strong>
                    <span className="muted small">
                      {[t.kind === 'transferencia' ? (t.direction === 'saida' ? 'Transferência enviada' : 'Transferência recebida') : cat?.name,
                        where ?? (t.kind !== 'transferencia' ? methodLabel(t.payment_method) : ''),
                        t.context === 'casal' && by && by.id !== me!.id ? `por ${by.display_name}` : '',
                        t.client].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="tx-amount">
                    <strong className={t.kind === 'receita' || t.direction === 'entrada' ? 'pos' : ''}>{sign} {fmtMoney(t.amount_cents)}</strong>
                    <span className={'pill ' + (t.status === 'realizado' ? 'ok' : late ? 'late' : t.status === 'cancelado' ? '' : 'plan')}>
                      {t.status === 'realizado' ? (t.kind === 'receita' ? 'Recebido' : 'Pago') : t.status === 'cancelado' ? 'Cancelado' : late ? 'Vencido' : 'Previsto'}
                    </span>
                  </span>
                </button>
                {writable && t.status === 'previsto' && !t.card_id && (
                  <button className="icon-btn" aria-label="Marcar como pago" title="Marcar como pago" onClick={() => markPaid(t)}><Icon name="check" size={18} /></button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function Lancamentos({ cur, month, onOpen }: { cur: CtxOpt; month: string; onOpen: (t: Transaction) => void }) {
  const { transactions, categories, accounts, cards } = useData()
  const [f, setF] = useState<Filters>(EMPTY_FILTERS)
  const [kind, setKind] = useState<'todos' | Transaction['kind']>('todos')
  const [where, setWhere] = useState('')
  const today = todayISO()
  const ctxAcc = accounts.filter((a) => inCtx(a, cur))
  const ctxCards = cards.filter((c) => inCtx(c, cur))
  const catSet = f.categories.length ? expandCategories(f.categories, categories) : null
  const q = norm(f.q.trim())
  const rows = transactions.filter((t) => {
    if (!inCtx(t, cur)) return false
    const d = cashDate(t)
    if (f.from || f.to) { if (f.from && d < f.from) return false; if (f.to && d > f.to) return false }
    else if (monthOf(d) !== month && !(f.status === 'vencido' && isOverdue(t, today))) return false
    if (kind !== 'todos' && t.kind !== kind) return false
    if (where && t.account_id !== where && t.card_id !== where) return false
    if (catSet && !(t.category_id && catSet.has(t.category_id))) return false
    if (f.status === 'vencido' ? !isOverdue(t, today) : f.status !== 'todos' && t.status !== f.status) return false
    if (q && !norm(`${t.description} ${t.client} ${t.notes} ${t.tags.join(' ')}`).includes(q)) return false
    return true
  }).sort((a, b) => cashDate(a).localeCompare(cashDate(b)) || a.created_at.localeCompare(b.created_at))
  const total = rows.reduce((s, t) => s + (t.status === 'cancelado' || t.kind === 'transferencia' ? 0 : t.kind === 'receita' ? t.amount_cents : -t.amount_cents), 0)

  return (
    <>
      <FilterBar module="financas" value={f} onChange={setF} statuses={STATUSES} dates hideScope />
      <div className="chips scroll">
        <Segmented value={kind} onChange={setKind} options={[{ id: 'todos', label: 'Tudo' }, { id: 'despesa', label: 'Despesas' }, { id: 'receita', label: 'Receitas' }, { id: 'transferencia', label: 'Transf.' }]} />
        {(ctxAcc.length + ctxCards.length > 0) && (
          <select className="chip-select" value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Conta ou cartão">
            <option value="">Todas as contas</option>
            {ctxAcc.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            {ctxCards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      {rows.length ? <>
        <p className="muted small pad">{rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'} · resultado {fmtMoney(total)}</p>
        <TxList txs={rows} onOpen={onOpen} />
      </> : <Empty icon="wallet" title="Nenhum lançamento" text={cur.writable ? 'Toque no + para lançar uma despesa ou receita.' : 'Nada neste período.'} />}
    </>
  )
}

// ───────────────────────── Contas e cartões ─────────────────────────

function Contas({ cur }: { cur: CtxOpt }) {
  const { accounts, cards, transactions, updateMatch, toast } = useData()
  const today = todayISO()
  const [showArchived, setShowArchived] = useState(false)
  const [accEdit, setAccEdit] = useState<Account | 'new' | null>(null)
  const [cardEdit, setCardEdit] = useState<Card | 'new' | null>(null)
  const [openCard, setOpenCard] = useState<string | null>(null)
  const accs = accounts.filter((a) => inCtx(a, cur) && Boolean(a.archived_at) === showArchived).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const crds = cards.filter((c) => inCtx(c, cur) && Boolean(c.archived_at) === showArchived).sort((a, b) => a.name.localeCompare(b.name))
  const month = today.slice(0, 7)

  const payInvoice = async (inv: Invoice) => {
    const r = await updateMatch('transactions', { card_id: inv.cardId, due_date: inv.due, status: 'previsto' }, { status: 'realizado', paid_date: inv.due <= today ? inv.due : today })
    if (r) toast(`Fatura de ${fmtMoney(inv.open)} marcada como paga.`)
  }

  return (
    <>
      <section>
        <div className="section-head"><h2>Contas</h2>{cur.writable && <button className="link" onClick={() => setAccEdit('new')}>+ Conta</button>}</div>
        {accs.length ? <div className="list">{accs.map((a) => (
          <button key={a.id} className="card list-link" onClick={() => cur.writable && setAccEdit(a)}>
            <span className="list-icon" style={{ background: a.color + '22', color: a.color }}><Icon name="wallet" /></span>
            <span className="grow"><strong>{a.name}</strong><span className="muted small">{accountKindLabel(a.kind)} · previsão do mês {fmtMoney(forecast([a], transactions, cards, month, today))}</span></span>
            <strong className={accountBalance(a, transactions, cards, today) < 0 ? 'neg' : ''}>{fmtMoney(accountBalance(a, transactions, cards, today))}</strong>
          </button>
        ))}</div> : <p className="muted pad">Nenhuma conta {showArchived ? 'arquivada' : 'nesta aba'}.</p>}
      </section>

      <section>
        <div className="section-head"><h2>Cartões</h2>{cur.writable && <button className="link" onClick={() => setCardEdit('new')}>+ Cartão</button>}</div>
        {crds.length ? <div className="list">{crds.map((c) => {
          const invs = invoices(c.id, transactions, today)
          const shown = invs.filter((i) => i.status !== 'paga' || i.due >= today.slice(0, 7)).slice(0, 4)
          const open = openCard === c.id
          const writable = cur.writable
          return (
            <div key={c.id} className="card card-block">
              <button className="list-link" onClick={() => setOpenCard(open ? null : c.id)}>
                <span className="list-icon" style={{ background: c.color + '22', color: c.color }}><Icon name="wallet" /></span>
                <span className="grow"><strong>{c.name} {c.is_couple_card && <span className="badge casal"><Icon name="heart" size={12} />Cartão do casal</span>}</strong>
                  <span className="muted small">fecha dia {c.closing_day} · vence dia {c.due_day}{c.limit_cents ? ` · limite ${fmtMoney(c.limit_cents)}` : ''}</span></span>
                <Icon name={open ? 'up' : 'down'} size={18} />
              </button>
              {open && <div className="invoices">
                {shown.length ? shown.map((i) => (
                  <div key={i.due} className="invoice-row">
                    <span className="grow"><strong>Fatura {fmtDate(i.due, { month: 'long' })}</strong><span className="muted small">vence {fmtDate(i.due)} · {i.status === 'paga' ? 'paga' : i.status === 'vencida' ? 'vencida' : 'aberta'}</span></span>
                    <strong className={i.status === 'vencida' ? 'neg' : ''}>{fmtMoney(i.total)}</strong>
                    {writable && i.status !== 'paga' && <button className="btn small" onClick={() => payInvoice(i)}>Pagar</button>}
                  </div>
                )) : <p className="muted small">Nenhuma compra neste cartão ainda.</p>}
                {cur.writable && <button className="link" onClick={() => setCardEdit(c)}>Editar cartão</button>}
              </div>}
            </div>
          )
        })}</div> : <p className="muted pad">Nenhum cartão {showArchived ? 'arquivado' : 'nesta aba'}.</p>}
      </section>
      <label className="toggle pad"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Ver arquivados</label>
      {accEdit && <AccountEditor account={accEdit === 'new' ? null : accEdit} ctx={cur} onClose={() => setAccEdit(null)} />}
      {cardEdit && <CardEditor card={cardEdit === 'new' ? null : cardEdit} ctx={cur} onClose={() => setCardEdit(null)} />}
    </>
  )
}

// ───────────────────────── Favorecidos e Pix ─────────────────────────

function Pix({ cur }: { cur: CtxOpt }) {
  const { payees, toast } = useData()
  const [edit, setEdit] = useState<Payee | 'new' | null>(null)
  const [q, setQ] = useState('')
  const list = payees.filter((p) => !p.archived_at && inCtx(p, cur) && norm(p.name + ' ' + (p.pix_key ?? '')).includes(norm(q.trim())))
    .sort((a, b) => a.name.localeCompare(b.name))
  const copy = async (p: Payee) => {
    try { await navigator.clipboard.writeText(p.pix_key ?? ''); toast(`Chave Pix de ${p.name} copiada.`) } catch { toast('Não consegui copiar. Toque e segure na chave para copiar.') }
  }
  return (
    <>
      <label className="search"><Icon name="search" size={18} /><input type="search" placeholder="Buscar favorecido" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {list.length ? <div className="list">{list.map((p) => (
        <div key={p.id} className="card payee">
          <button className="grow payee-main" onClick={() => cur.writable && setEdit(p)}>
            <strong>{p.name}</strong>
            {p.pix_key ? <span className="muted small">{pixTypeLabel(p.pix_type)}: <span className="selectable">{p.pix_key}</span></span> : <span className="muted small">Sem chave Pix</span>}
            {p.notes && <span className="muted small">{p.notes}</span>}
          </button>
          {p.pix_key && <button className="btn small" onClick={() => copy(p)}>Copiar Pix</button>}
        </div>
      ))}</div> : <Empty icon="user" title="Nenhum favorecido" text="Guarde aqui quem vocês pagam com frequência, com a chave Pix." />}
      {cur.writable && <button className="fab" aria-label="Novo favorecido" onClick={() => setEdit('new')}><Icon name="plus" size={26} /></button>}
      {edit && <PayeeEditor payee={edit === 'new' ? null : edit} ctx={cur} onClose={() => setEdit(null)} />}
    </>
  )
}
