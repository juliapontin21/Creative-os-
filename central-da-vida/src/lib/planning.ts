// Regras da casa, indicadores, caixinhas e limites. Puro (sem React); testado em tests/finance.test.ts.
// Os números são REFERÊNCIAS: cada um pode ser alterado ou desligado. O app avisa, nunca bloqueia.

export type RuleCtx = 'casal' | 'pf' | 'empresa'
export type Params = Record<string, number | boolean>

export const DEFAULTS: Record<RuleCtx, Params> = {
  casal: { r1_on: true, r2_couple_on: true, r2_couple_pct: 10, r3_on: true },
  pf: {
    r2_ind_on: true, r2_ind_pct: 10, fixed_on: true, fixed_pct: 50, leisure_on: true, leisure_pct: 30,
    invest_on: true, invest_pct: 20, reserve_on: true, reserve_mult: 6, fi_on: true, fi_mult: 93,
  },
  empresa: { profit_on: true, profit_pct: 10, prolabore_on: true, prolabore_pct: 50, tax_on: true, tax_pct: 18, opex_on: true, opex_pct: 22 },
}

export const withDefaults = (ctx: RuleCtx, stored?: Record<string, unknown> | null): Params => ({ ...DEFAULTS[ctx], ...(stored as Params | undefined) })
const num = (p: Params, k: string) => Number(p[k])
const on = (p: Params, k: string) => p[k] !== false

// "max": o real deve ficar até a referência; "min": deve chegar na referência; "ref": só informa.
export interface Indicator { id: string; label: string; target: number; actual: number; kind: 'min' | 'max' | 'ref'; ok: boolean; rule: string }
const ind = (id: string, label: string, target: number, actual: number, kind: Indicator['kind'], rule: string): Indicator =>
  ({ id, label, target, actual, kind, rule, ok: kind === 'ref' || (kind === 'max' ? actual <= target : actual >= target) })

export function pfIndicators(p: Params, income: number, d: { fixed: number; leisure: number; invested: number; reserve: number; patrimony: number; installments: number }): Indicator[] {
  const out: Indicator[] = []
  if (on(p, 'fixed_on')) out.push(ind('fixed', 'Gastos fixos', Math.round((income * num(p, 'fixed_pct')) / 100), d.fixed, 'max', `até ${num(p, 'fixed_pct')}% da renda`))
  if (on(p, 'leisure_on')) out.push(ind('leisure', 'Lazer', Math.round((income * num(p, 'leisure_pct')) / 100), d.leisure, 'max', `até ${num(p, 'leisure_pct')}% da renda`))
  if (on(p, 'invest_on')) out.push(ind('invest', 'Investido no mês', Math.round((income * num(p, 'invest_pct')) / 100), d.invested, 'min', `pelo menos ${num(p, 'invest_pct')}% da renda`))
  if (on(p, 'r2_ind_on')) out.push(ind('r2_ind', 'Parcelas no mês', Math.round((income * num(p, 'r2_ind_pct')) / 100), d.installments, 'max', `até ${num(p, 'r2_ind_pct')}% da renda (R2)`))
  if (on(p, 'reserve_on')) out.push(ind('reserve', 'Reserva de emergência', income * num(p, 'reserve_mult'), d.reserve, 'min', `${num(p, 'reserve_mult')}× a renda`))
  if (on(p, 'fi_on')) out.push(ind('fi', 'Patrimônio para viver de renda', income * num(p, 'fi_mult'), d.patrimony, 'min', `${num(p, 'fi_mult')}× a renda`))
  return out
}

export function companyIndicators(p: Params, revenue: number, d: { prolabore: number; tax: number; opex: number }): Indicator[] {
  const pct = (k: string) => Math.round((revenue * num(p, k)) / 100)
  const profit = revenue - d.prolabore - d.tax - d.opex
  const out: Indicator[] = []
  if (on(p, 'profit_on')) out.push(ind('profit', 'Lucro (não mexer)', pct('profit_pct'), profit, 'min', `${num(p, 'profit_pct')}% do faturamento`))
  if (on(p, 'prolabore_on')) out.push(ind('prolabore', 'Pró-labore', pct('prolabore_pct'), d.prolabore, 'max', `teto de ${num(p, 'prolabore_pct')}% do faturamento`))
  if (on(p, 'tax_on')) out.push(ind('tax', 'Reserva para impostos', pct('tax_pct'), d.tax, 'ref', `separe ${num(p, 'tax_pct')}% do faturamento`))
  if (on(p, 'opex_on')) out.push(ind('opex', 'Custo da operação', pct('opex_pct'), d.opex, 'max', `até ${num(p, 'opex_pct')}% do faturamento`))
  return out
}

// Caixinha: quanto falta e quanto guardar por mês até o prazo.
export function goalPlan(target: number, saved: number, deadline: string | null, today: string) {
  const remaining = Math.max(0, target - saved)
  const pct = target ? Math.min(100, Math.round((saved / target) * 100)) : 0
  if (!deadline || remaining === 0) return { remaining, pct, monthsLeft: null as number | null, monthly: null as number | null }
  const [y1, m1] = today.split('-').map(Number)
  const [y2, m2] = deadline.split('-').map(Number)
  const monthsLeft = Math.max(1, (y2 - y1) * 12 + (m2 - m1))
  return { remaining, pct, monthsLeft, monthly: Math.ceil(remaining / monthsLeft) }
}

export function budgetStatus(spent: number, limit: number, warnPct = 80) {
  const pct = limit ? Math.round((spent / limit) * 100) : 0
  return { pct, level: (spent > limit ? 'over' : pct >= warnPct ? 'warn' : 'ok') as 'ok' | 'warn' | 'over' }
}
