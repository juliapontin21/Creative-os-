import { useData } from './data'
import { expandCategories } from './filters'
import { accountBalance, cashDate, fmtMoney, monthOf } from './finance'
import { inCtx, type CtxOpt } from './finctx'
import { budgetStatus, companyIndicators, goalPlan, pfIndicators, withDefaults, type Indicator, type RuleCtx } from './planning'
import type { Goal } from './types'
import { todayISO } from './util'

export interface Alert { id: string; level: 'warn' | 'over'; title: string; detail: string }

// Regras de uma aba (já com os padrões). Casal: uma linha da casa; PF: a da pessoa; Empresa: a da dona.
export function useRules() {
  const { house_rules } = useData()
  return (ctx: RuleCtx, owner: string) => {
    const row = house_rules.find((r) => r.context === ctx && (ctx === 'casal' || r.owner_id === owner))
    return { row, params: withDefaults(ctx, row?.params) }
  }
}

export function useGoalBalance() {
  const { goal_moves } = useData()
  return (g: Goal) => goal_moves.filter((m) => m.goal_id === g.id).reduce((s, m) => s + m.amount_cents, 0)
}

// Tudo o que a aba Metas e o Resumo precisam para uma aba e um mês.
export function usePlanning(cur: CtxOpt, month: string) {
  const d = useData()
  const rulesOf = useRules()
  const goalBalance = useGoalBalance()
  const today = todayISO()
  const people = [d.me!, ...(d.partner ? [d.partner] : [])]
  const plan = d.month_plans.find((p) => p.month.slice(0, 7) === month)
  const incomeOf = (id: string) => plan?.income_overrides?.[id] ?? people.find((p) => p.id === id)?.income_ref_cents ?? 0
  const coupleIncome = people.reduce((s, p) => s + incomeOf(p.id), 0)
  const live = d.transactions.filter((t) => t.status !== 'cancelado' && monthOf(cashDate(t)) === month)
  const ctxTx = live.filter((t) => inCtx(t, cur))
  // Tipo de gasto (fixo, lazer, imposto); subcategoria herda da mãe.
  const bucketOf = (catId: string | null) => {
    const c = d.categories.find((x) => x.id === catId)
    if (!c) return null
    return c.fin_bucket ?? (c.parent_id ? d.categories.find((x) => x.id === c.parent_id)?.fin_bucket ?? null : null)
  }
  const installments = (pred: (t: (typeof live)[number]) => boolean) => live.filter((t) => t.installment_total && t.kind === 'despesa' && pred(t)).reduce((s, t) => s + t.amount_cents, 0)

  const goals = d.goals.filter((g) => !g.archived_at && inCtx(g, cur)).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    .map((g) => { const saved = goalBalance(g); return { goal: g, saved, ...goalPlan(g.target_cents, saved, g.deadline, today) } })
  const accs = d.accounts.filter((a) => !a.archived_at && inCtx(a, cur))
  const balance = accs.reduce((s, a) => s + accountBalance(a, d.transactions, d.cards, today), 0)
  const reserved = goals.reduce((s, g) => s + Math.max(0, g.saved), 0)

  // Limites por categoria (com subcategorias).
  const budgets = d.budgets.filter((b) => !b.archived_at && inCtx(b, cur)).map((b) => {
    const cats = expandCategories([b.category_id], d.categories)
    const spent = ctxTx.filter((t) => t.kind === 'despesa' && t.category_id && cats.has(t.category_id)).reduce((s, t) => s + t.amount_cents, 0)
    return { budget: b, category: d.categories.find((c) => c.id === b.category_id), spent, ...budgetStatus(spent, b.limit_cents) }
  })

  // Indicadores.
  let indicators: Indicator[] = []
  let income = 0
  if (cur.ctx === 'pf') {
    income = incomeOf(cur.owner)
    const mine = ctxTx.filter((t) => t.kind === 'despesa')
    const pfGoals = d.goals.filter((g) => g.context === 'pf' && g.owner_id === cur.owner)
    const invested = d.goal_moves.filter((m) => monthOf(m.date) === month && pfGoals.some((g) => g.id === m.goal_id && g.kind !== 'desejo')).reduce((s, m) => s + m.amount_cents, 0)
    const reserve = pfGoals.filter((g) => g.kind === 'reserva').reduce((s, g) => s + goalBalance(g), 0)
    const patrimony = d.accounts.filter((a) => a.context === 'pf' && a.owner_id === cur.owner && (a.kind === 'investimento' || a.kind === 'poupanca'))
      .reduce((s, a) => s + accountBalance(a, d.transactions, d.cards, today), 0)
    indicators = pfIndicators(rulesOf('pf', cur.owner).params, income, {
      fixed: mine.filter((t) => t.recurrence_id || bucketOf(t.category_id) === 'fixo').reduce((s, t) => s + t.amount_cents, 0),
      leisure: mine.filter((t) => bucketOf(t.category_id) === 'lazer').reduce((s, t) => s + t.amount_cents, 0),
      invested, reserve, patrimony,
      installments: installments((t) => t.context === 'pf' && t.owner_id === cur.owner),
    })
  } else if (cur.ctx === 'empresa') {
    const revenue = ctxTx.filter((t) => t.kind === 'receita').reduce((s, t) => s + t.amount_cents, 0)
    income = revenue
    const prolabore = ctxTx.filter((t) => t.kind === 'transferencia' && t.direction === 'saida' &&
      d.transactions.some((x) => x.transfer_group === t.transfer_group && x.direction === 'entrada' && x.context === 'pf')).reduce((s, t) => s + t.amount_cents, 0)
    const desp = ctxTx.filter((t) => t.kind === 'despesa')
    const tax = desp.filter((t) => bucketOf(t.category_id) === 'imposto').reduce((s, t) => s + t.amount_cents, 0)
    indicators = companyIndicators(rulesOf('empresa', cur.owner).params, revenue, { prolabore, tax, opex: desp.reduce((s, t) => s + t.amount_cents, 0) - tax })
  } else {
    income = coupleIncome
    const p = rulesOf('casal', '').params
    if (p.r2_couple_on !== false) {
      const target = Math.round((coupleIncome * Number(p.r2_couple_pct)) / 100)
      const actual = installments((t) => t.context === 'casal')
      indicators = [{ id: 'r2_couple', label: 'Parcelas do casal no mês', target, actual, kind: 'max', ok: actual <= target, rule: `até ${p.r2_couple_pct}% da renda do casal (R2)` }]
    }
  }

  // Alertas (só avisos; nada é bloqueado).
  const alerts: Alert[] = []
  const casalP = rulesOf('casal', '').params
  if (cur.ctx !== 'empresa' && casalP.r1_on !== false && coupleIncome > 0) {
    for (const c of d.cards.filter((c) => !c.archived_at && c.limit_cents && inCtx(c, cur) && c.limit_cents > coupleIncome)) {
      alerts.push({ id: `r1-${c.id}`, level: 'warn', title: `Limite do ${c.name} acima da renda do casal`, detail: `Limite ${fmtMoney(c.limit_cents!)} · renda do casal ${fmtMoney(coupleIncome)} (R1)` })
    }
  }
  if (cur.ctx !== 'empresa' && casalP.r3_on !== false) {
    const couple = d.cards.find((c) => c.is_couple_card && !c.archived_at)
    if (couple) {
      const off = cur.ctx === 'casal' ? ctxTx.filter((t) => t.kind === 'despesa' && t.card_id !== couple.id) : ctxTx.filter((t) => t.kind === 'despesa' && t.card_id === couple.id)
      if (off.length) alerts.push({
        id: `r3-${cur.key}`, level: 'warn',
        title: cur.ctx === 'casal' ? `${off.length} ${off.length === 1 ? 'despesa do casal fora' : 'despesas do casal fora'} do ${couple.name}` : `${off.length} ${off.length === 1 ? 'gasto pessoal' : 'gastos pessoais'} no ${couple.name}`,
        detail: `${fmtMoney(off.reduce((s, t) => s + t.amount_cents, 0))} · regra R3: casal no cartão do casal; mesada no Pix/débito`,
      })
    }
  }
  // Reserva e patrimônio são metas de longo prazo: aparecem nos indicadores, não como alerta do mês.
  for (const i of indicators.filter((x) => !x.ok && x.id !== 'fi' && x.id !== 'reserve')) {
    alerts.push({ id: `ind-${cur.key}-${i.id}`, level: i.kind === 'max' ? 'over' : 'warn', title: `${i.label}: ${fmtMoney(i.actual)}`, detail: `Referência ${fmtMoney(i.target)} (${i.rule})` })
  }
  for (const b of budgets.filter((x) => x.level !== 'ok')) {
    alerts.push({ id: `bud-${b.budget.id}`, level: b.level as 'warn' | 'over', title: `${b.category?.name ?? 'Categoria'}: ${b.pct}% do limite`, detail: `${fmtMoney(b.spent)} de ${fmtMoney(b.budget.limit_cents)}` })
  }

  const coupleSuggestion = d.goals.filter((g) => !g.archived_at && g.context === 'casal')
    .reduce((s, g) => s + (goalPlan(g.target_cents, goalBalance(g), g.deadline, today).monthly ?? 0), 0)

  return { goals, budgets, indicators, alerts, balance, reserved, available: balance - reserved, hasAccounts: accs.length > 0, income, coupleIncome, coupleSuggestion }
}

// Alertas dispensados (só neste aparelho, por mês).
export function dismissed(month: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(`cdv-dismiss-${month}`) ?? '[]') as string[]) } catch { return new Set() }
}
export function dismiss(month: string, id: string) {
  try { const s = dismissed(month); s.add(id); localStorage.setItem(`cdv-dismiss-${month}`, JSON.stringify([...s])) } catch { /* sem armazenamento */ }
}
