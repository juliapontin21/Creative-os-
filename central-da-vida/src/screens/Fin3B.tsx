import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Segmented, useModuleCategories } from '../components/ui'
import { useData } from '../lib/data'
import { addMonths, cashDate, coupleMonth, fmtMoney, forecast, monthOf, monthSummary, parseMoney, splitInstallments } from '../lib/finance'
import { inCtx, useCtxOptions, type CtxOpt } from '../lib/finctx'
import { goalPlan } from '../lib/planning'
import { simulate, type SimMonth } from '../lib/simulate'
import { useGoalBalance, usePlanning, useRules } from '../lib/usePlanning'
import type { Transaction } from '../lib/types'
import { todayISO } from '../lib/util'
import { MoneyInput, TxEditor, type TxInitial } from './FinEditors'

const shortMonth = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
const longMonth = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
const shift = (m: string, n: number) => addMonths(`${m}-01`, n).slice(0, 7)
const compact = (c: number) => {
  const v = Math.abs(c) / 100
  const s = v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return (c < 0 ? '−' : '') + s
}

// ───────────────────────── Modelo de meses (usado pela projeção e pelo simulador) ─────────────────────────

export function useMonthModel() {
  const d = useData()
  const rulesOf = useRules()
  const goalBalance = useGoalBalance()
  const today = todayISO()
  const people = [d.me!, ...(d.partner ? [d.partner] : [])]
  const coupleSuggestion = d.goals.filter((g) => !g.archived_at && g.context === 'casal')
    .reduce((s, g) => s + (goalPlan(g.target_cents, goalBalance(g), g.deadline, today).monthly ?? 0), 0)

  return (cur: CtxOpt, month: string, premise: { income?: number | null; savings?: number | null } = {}): SimMonth & { allowance: number | null } => {
    const plan = d.month_plans.find((p) => p.month.slice(0, 7) === month)
    const incomeOf = (id: string) => (id === (cur.ctx === 'pf' ? cur.owner : d.me!.id) && premise.income != null ? premise.income : plan?.income_overrides?.[id] ?? people.find((p) => p.id === id)?.income_ref_cents ?? 0)
    const live = d.transactions.filter((t) => t.status !== 'cancelado' && monthOf(cashDate(t)) === month)
    const fixed = live.filter((t) => t.context === 'casal' && t.kind === 'despesa').reduce((s, t) => s + t.amount_cents, 0)
    const savings = premise.savings ?? plan?.savings_cents ?? coupleSuggestion
    const cm = coupleMonth(people.map((p) => ({ id: p.id, income: incomeOf(p.id) })), fixed, savings)
    const accs = d.accounts.filter((a) => !a.archived_at && inCtx(a, cur))
    const inst = (pred: (t: Transaction) => boolean) => live.filter((t) => t.installment_total && t.kind === 'despesa' && pred(t)).reduce((s, t) => s + t.amount_cents, 0)
    if (cur.ctx === 'pf') {
      const p = rulesOf('pf', cur.owner).params
      const allowance = cm.allowances.find((a) => a.id === cur.owner)?.allowance ?? 0
      const used = live.filter((t) => t.context === 'pf' && t.owner_id === cur.owner && t.kind === 'despesa').reduce((s, t) => s + t.amount_cents, 0)
      return {
        month, balance: accs.length ? forecast(accs, d.transactions, d.cards, month, today) : null, room: allowance - used, allowance,
        installments: inst((t) => t.context === 'pf' && t.owner_id === cur.owner),
        r2Limit: p.r2_ind_on !== false ? Math.round((incomeOf(cur.owner) * Number(p.r2_ind_pct)) / 100) : null,
      }
    }
    if (cur.ctx === 'casal') {
      const p = rulesOf('casal', '').params
      return {
        month, balance: accs.length ? forecast(accs, d.transactions, d.cards, month, today) : null, room: cm.leftover, allowance: null,
        installments: inst((t) => t.context === 'casal'),
        r2Limit: p.r2_couple_on !== false ? Math.round((cm.total * Number(p.r2_couple_pct)) / 100) : null,
      }
    }
    return { month, balance: accs.length ? forecast(accs, d.transactions, d.cards, month, today) : null, room: null, allowance: null, installments: 0, r2Limit: null }
  }
}

// ───────────────────────── Gráficos ─────────────────────────

function BarChart({ groups, series, onSelect, selected }: {
  groups: { key: string; label: string; values: number[] }[]
  series: { name: string; className: string }[]
  onSelect: (k: string) => void; selected: string | null
}) {
  const W = 340, H = 170, top = 10, bottom = 22
  const all = groups.flatMap((g) => g.values)
  const max = Math.max(1, ...all.map((v) => Math.max(0, v)))
  const min = Math.min(0, ...all)
  const span = max - min || 1
  const y = (v: number) => top + ((max - v) / span) * (H - top - bottom)
  const gw = W / groups.length
  const bw = Math.min(18, (gw - 10 - (series.length - 1) * 2) / series.length)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={series.map((s) => s.name).join(' e ')}>
      {[max, max / 2].map((v, i) => <g key={i}><line className="grid" x1={0} x2={W} y1={y(v)} y2={y(v)} /><text className="axis" x={2} y={y(v) - 3}>{compact(v)}</text></g>)}
      <line className="baseline" x1={0} x2={W} y1={y(0)} y2={y(0)} />
      {groups.map((g, gi) => {
        const x0 = gi * gw + (gw - (bw * series.length + 2 * (series.length - 1))) / 2
        const on = selected === g.key
        return (
          <g key={g.key} className={'bar-group' + (on ? ' on' : '')} onClick={() => onSelect(g.key)} onMouseEnter={() => onSelect(g.key)}>
            <rect className="hit" x={gi * gw} y={0} width={gw} height={H} />
            {g.values.map((v, si) => {
              const y1 = y(Math.max(0, v)), y2 = y(Math.min(0, v))
              const h = Math.max(v === 0 ? 0 : 2, y2 - y1)
              return <rect key={si} className={'mark ' + series[si].className + (v < 0 ? ' negative' : '')} x={x0 + si * (bw + 2)} y={v < 0 ? y(0) : y(0) - h} width={bw} height={h} rx={3}>
                <title>{`${g.label} · ${series[si].name}: ${fmtMoney(v)}`}</title></rect>
            })}
            <text className={'axis x' + (on ? ' strong' : '')} x={gi * gw + gw / 2} y={H - 6} textAnchor="middle">{g.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function Legend({ items }: { items: { name: string; className: string }[] }) {
  return <div className="legend">{items.map((i) => <span key={i.name}><i className={'sw ' + i.className} />{i.name}</span>)}</div>
}

export function Graficos({ cur, month }: { cur: CtxOpt; month: string }) {
  const { transactions, categories } = useData()
  const model = useMonthModel()
  const today = todayISO()
  const [range, setRange] = useState<'6' | '12'>('6')
  const [sel, setSel] = useState<string | null>(month)
  const [table, setTable] = useState(false)
  const txs = transactions.filter((t) => inCtx(t, cur))
  const n = Number(range)
  const months = Array.from({ length: n }, (_, i) => shift(month, i - n + 1))
  const sums = months.map((m) => ({ m, s: monthSummary(txs, m, today) }))
  const rx = sums.map(({ m, s }) => ({ key: m, label: shortMonth(m), values: [s.incomeDone + s.incomePlanned, s.expenseDone + s.expensePlanned] }))
  const cur0 = sums[sums.length - 1].s, prev = monthSummary(txs, shift(month, -1), today)
  const tot = (s: typeof cur0) => ({ inc: s.incomeDone + s.incomePlanned, exp: s.expenseDone + s.expensePlanned })
  const a = tot(cur0), b = tot(prev)
  const selRow = rx.find((r) => r.key === sel) ?? rx[rx.length - 1]

  // Despesas por categoria (agrupadas na categoria-mãe).
  const exp = txs.filter((t) => t.kind === 'despesa' && t.status !== 'cancelado' && monthOf(cashDate(t)) === month)
  const byCat = new Map<string, number>()
  for (const t of exp) {
    const c = categories.find((x) => x.id === t.category_id)
    const key = c ? (c.parent_id ?? c.id) : ''
    byCat.set(key, (byCat.get(key) ?? 0) + t.amount_cents)
  }
  const catRows = [...byCat.entries()].map(([k, v]) => ({ name: categories.find((c) => c.id === k)?.name ?? 'Sem categoria', color: categories.find((c) => c.id === k)?.color ?? '#9a9890', v })).sort((x, y) => y.v - x.v)
  const top = catRows.slice(0, 7)
  const rest = catRows.slice(7).reduce((s, r) => s + r.v, 0)
  if (rest) top.push({ name: 'Outras', color: '#9a9890', v: rest })
  const catMax = Math.max(1, ...top.map((r) => r.v))
  const biggest = [...exp].sort((x, y) => y.amount_cents - x.amount_cents).slice(0, 5)

  // Projeção do saldo nos próximos 6 meses.
  const future = Array.from({ length: 6 }, (_, i) => shift(today.slice(0, 7), i))
  const proj = future.map((m) => ({ key: m, label: shortMonth(m), values: [model(cur, m).balance ?? 0] }))
  const hasAcc = model(cur, today.slice(0, 7)).balance !== null
  const [projSel, setProjSel] = useState<string | null>(null)
  const projRow = proj.find((p) => p.key === projSel)

  const Delta = ({ now, before, good }: { now: number; before: number; good: 'up' | 'down' }) => {
    const d = now - before
    if (!before && !now) return <span className="muted small">—</span>
    const better = good === 'up' ? d >= 0 : d <= 0
    return <span className={'small ' + (d === 0 ? 'muted' : better ? 'pos' : 'neg')}>{d >= 0 ? '▲' : '▼'} {fmtMoney(Math.abs(d))} vs {shortMonth(shift(month, -1))}</span>
  }

  return (
    <>
      <div className="grid2">
        <div className="card stat"><span className="muted small">Receitas em {shortMonth(month)}</span><strong className="stat-value">{fmtMoney(a.inc)}</strong><Delta now={a.inc} before={b.inc} good="up" /></div>
        <div className="card stat"><span className="muted small">Despesas em {shortMonth(month)}</span><strong className="stat-value">{fmtMoney(a.exp)}</strong><Delta now={a.exp} before={b.exp} good="down" /></div>
      </div>

      <section className="card chart-card">
        <div className="section-head"><h2>Receitas × despesas</h2>
          <Segmented value={range} onChange={setRange} options={[{ id: '6', label: '6 meses' }, { id: '12', label: '12' }]} /></div>
        <Legend items={[{ name: 'Receitas', className: 's1' }, { name: 'Despesas', className: 's2' }]} />
        {table ? (
          <table className="data-table"><thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Resultado</th></tr></thead>
            <tbody>{rx.map((r) => <tr key={r.key}><td>{r.label}</td><td>{fmtMoney(r.values[0])}</td><td>{fmtMoney(r.values[1])}</td><td>{fmtMoney(r.values[0] - r.values[1])}</td></tr>)}</tbody></table>
        ) : <BarChart groups={rx} series={[{ name: 'Receitas', className: 's1' }, { name: 'Despesas', className: 's2' }]} onSelect={setSel} selected={selRow.key} />}
        <p className="chart-detail"><b>{longMonth(selRow.key)}</b>: receitas {fmtMoney(selRow.values[0])} · despesas {fmtMoney(selRow.values[1])} · resultado <b className={selRow.values[0] - selRow.values[1] < 0 ? 'neg' : 'pos'}>{fmtMoney(selRow.values[0] - selRow.values[1])}</b></p>
        <button className="link small" onClick={() => setTable(!table)}>{table ? 'Ver gráfico' : 'Ver como tabela'}</button>
        <p className="hint">Inclui o que já aconteceu e o que está previsto em cada mês. Toque num mês para ver os valores.</p>
      </section>

      <section className="card chart-card">
        <div className="section-head"><h2>Despesas por categoria</h2><span className="muted small">{shortMonth(month)}</span></div>
        {top.length ? <div className="hbars">{top.map((r) => (
          <div key={r.name} className="hbar" title={`${r.name}: ${fmtMoney(r.v)}`}>
            <span className="hbar-label"><i className="dot" style={{ background: r.color }} />{r.name}</span>
            <span className="hbar-track"><span className="hbar-fill" style={{ width: `${Math.max(2, (r.v / catMax) * 100)}%` }} /></span>
            <span className="hbar-value">{fmtMoney(r.v)}</span>
          </div>
        ))}</div> : <p className="muted">Sem despesas neste mês.</p>}
      </section>

      {biggest.length > 0 && <section className="card chart-card">
        <div className="section-head"><h2>Maiores gastos</h2><span className="muted small">{shortMonth(month)}</span></div>
        <ol className="ranking">{biggest.map((t) => <li key={t.id}><span className="grow">{t.description}{t.installment_total ? ` (${t.installment_no}/${t.installment_total})` : ''}</span><b>{fmtMoney(t.amount_cents)}</b></li>)}</ol>
      </section>}

      <section className="card chart-card">
        <div className="section-head"><h2>Saldo projetado</h2><span className="muted small">próximos 6 meses</span></div>
        {hasAcc ? <>
          <BarChart groups={proj} series={[{ name: 'Saldo no fim do mês', className: 's1' }]} onSelect={setProjSel} selected={projSel} />
          <p className="chart-detail">{projRow ? <><b>{longMonth(projRow.key)}</b>: {fmtMoney(projRow.values[0])}</> : 'Toque num mês para ver o saldo.'}</p>
          <p className="hint">Saldo de hoje nas contas da aba + tudo o que está previsto até o fim de cada mês (contas fixas, parcelas, receitas).</p>
        </> : <p className="muted">Cadastre contas nesta aba para ver a projeção.</p>}
      </section>
    </>
  )
}

// ───────────────────────── Simulador de compras ─────────────────────────

export function Simulador({ cur }: { cur: CtxOpt }) {
  const { me, cards, budgets, categories } = useData()
  const opts = useCtxOptions().filter((o) => o.writable)
  const model = useMonthModel()
  const today = todayISO()
  const [ctxKey, setCtxKey] = useState(cur.writable ? cur.key : opts.find((o) => o.ctx === 'pf')!.key)
  const target = opts.find((o) => o.key === ctxKey)!
  const P = usePlanning(target, today.slice(0, 7))
  const [desc, setDesc] = useState('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(today)
  const [payWith, setPayWith] = useState<'conta' | 'cartao'>('conta')
  const [n, setN] = useState(1)
  const [cardId, setCardId] = useState('')
  const [category, setCategory] = useState('')
  const [income, setIncome] = useState('')
  const [savings, setSavings] = useState('')
  const [launch, setLaunch] = useState<TxInitial | null>(null)
  const cats = useModuleCategories('financas', { scope: target.ctx === 'casal' ? 'casal' : 'pessoal', ownerId: me!.id }).filter((c) => !c.parent_id)
  const cardOpts = cards.filter((c) => !c.archived_at && (c.context === 'casal' || (c.context === target.ctx && c.owner_id === me!.id)))
  const total = parseMoney(value)
  const parts = total ? (payWith === 'cartao' ? splitInstallments(total, n) : [total]) : []
  const firstMonth = date.slice(0, 7) < today.slice(0, 7) ? today.slice(0, 7) : date.slice(0, 7)
  const startMonth = payWith === 'cartao' ? shift(firstMonth, 1) : firstMonth
  const premise = { income: income.trim() ? parseMoney(income) : null, savings: savings.trim() ? parseMoney(savings) ?? 0 : null }
  const months = parts.map((_, i) => model(target, shift(startMonth, i), premise))
  const budget = category ? budgets.find((b) => b.category_id === category && !b.archived_at && inCtx(b, target)) : undefined
  const budgetRow = budget ? P.budgets.find((b) => b.budget.id === budget.id) : undefined
  const result = total ? simulate({
    ctx: target.ctx, parts, months,
    budget: budgetRow ? { name: categories.find((c) => c.id === category)?.name ?? 'categoria', limit: budget!.limit_cents, spent: budgetRow.spent } : null,
    available: P.hasAccounts && P.reserved > 0 ? P.available : null,
  }) : null
  const m0 = months[0]

  return (
    <>
      <p className="card info">Simule antes de comprar. Nada é lançado sem você confirmar; as referências são as das Regras da casa.</p>
      <div className="card form-card">
        <div className="field"><span className="label">Para quem</span>
          <Segmented value={ctxKey} onChange={(k) => { setCtxKey(k); setCardId(''); setCategory('') }} options={opts.map((o) => ({ id: o.key, label: o.label }))} /></div>
        <label className="field"><span className="label">O que</span><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: vara de pesca, curso de inglês" /></label>
        <MoneyInput label="Valor" value={value} onChange={setValue} />
        <div className="row2">
          <label className="field"><span className="label">Quando</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="field"><span className="label">Categoria</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">Nenhuma</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        <Segmented value={payWith} onChange={(v) => { setPayWith(v); if (v === 'conta') setN(1) }} options={[{ id: 'conta', label: 'À vista (Pix, débito)' }, { id: 'cartao', label: 'Cartão' }]} />
        {payWith === 'cartao' && <div className="row2">
          <label className="field"><span className="label">Cartão</span><select value={cardId} onChange={(e) => setCardId(e.target.value)}><option value="">Escolha</option>{cardOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="field"><span className="label">Parcelas</span><select value={n} onChange={(e) => setN(Number(e.target.value))}>{Array.from({ length: 24 }, (_, i) => i + 1).map((k) => <option key={k} value={k}>{k === 1 ? 'À vista' : `${k}x`}</option>)}</select></label>
        </div>}
      </div>

      {result && total && (
        <section className={'card verdict v-' + result.verdict}>
          <div className="verdict-head">
            <Icon name={result.verdict === 'cabe' ? 'check' : result.verdict === 'ajustes' ? 'sparkle' : 'x'} size={22} />
            <strong>{result.verdict === 'cabe' ? 'Cabe' : result.verdict === 'ajustes' ? 'Cabe com ajustes' : target.ctx === 'casal' ? 'Não recomendado: não cabe no orçamento' : 'Não cabe'}</strong>
          </div>
          <p className="small">{desc || 'Compra'} de {fmtMoney(total)}{parts.length > 1 ? ` em ${parts.length}x de ${fmtMoney(parts[1])}` : ' à vista'}{payWith === 'cartao' ? `, primeira parcela na fatura de ${shortMonth(startMonth)}` : ''}.</p>
          <ul className="checks">{result.checks.map((c, i) => <li key={i} className={'c-' + c.level}><Icon name={c.level === 'ok' ? 'check' : c.level === 'warn' ? 'sparkle' : 'x'} size={14} />{c.text}</li>)}</ul>
          {result.alternatives.length > 0 && <><strong className="small">Alternativas</strong><ul className="alts">{result.alternatives.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
          <p className="hint">É uma recomendação: você pode comprar mesmo assim.</p>
          <button className="btn primary wide" onClick={() => setLaunch({
            kind: 'despesa', ctx: target, amount: total, description: desc || 'Compra', date, category: category || null,
            payWith, cardId: payWith === 'cartao' ? cardId : '', installments: payWith === 'cartao' ? n : 1,
          })}>Lançar esta compra</button>
        </section>
      )}

      {m0 && <section className="card premises">
        <strong>Premissas usadas</strong>
        <ul className="small">
          {m0.balance !== null && <li>Saldo projetado das contas em {shortMonth(m0.month)}: {fmtMoney(m0.balance)}</li>}
          {target.ctx === 'pf' && m0.room !== null && <li>Mesada restante em {shortMonth(m0.month)}: {fmtMoney(m0.room)}</li>}
          {target.ctx === 'casal' && m0.room !== null && <li>Sobra do casal em {shortMonth(m0.month)} (depois das contas e caixinhas): {fmtMoney(m0.room)}</li>}
          {m0.r2Limit !== null && <li>Parcelas já correndo: {fmtMoney(m0.installments)} · referência {fmtMoney(m0.r2Limit)}</li>}
        </ul>
        {target.ctx !== 'empresa' && <div className="row2">
          <MoneyInput label={target.ctx === 'pf' ? 'Sua renda (premissa)' : 'Sua renda (premissa)'} value={income} onChange={setIncome} hint="Vazio = renda de referência." />
          <MoneyInput label="Caixinhas do casal/mês" value={savings} onChange={setSavings} hint="Vazio = valor do mês ou sugestão." />
        </div>}
      </section>}

      {launch && <TxEditor tx={null} preset={{ kind: 'despesa', ctx: launch.ctx }} initial={launch} onClose={() => setLaunch(null)} />}
    </>
  )
}
