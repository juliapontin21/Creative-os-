// Cálculos financeiros puros (sem React, sem rede). Testados em tests/finance.test.ts.
// Regra de mês: previsto conta pelo vencimento; realizado conta pela data de pagamento (regime de caixa).

export type Kind = 'receita' | 'despesa' | 'transferencia'
export type Status = 'previsto' | 'realizado' | 'cancelado'

export interface TxLike {
  kind: Kind; status: Status; amount_cents: number; direction: 'entrada' | 'saida' | null
  due_date: string; paid_date: string | null; account_id: string | null; card_id: string | null
}
export interface AccountLike { id: string; initial_balance_cents: number; initial_date: string }
export interface CardLike { id: string; pay_account_id: string | null }

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtMoney = (cents: number) => BRL.format(cents / 100)

// Aceita "1.234,56", "1234,56", "1234.56", "R$ 50".
export function parseMoney(input: string): number | null {
  let s = input.replace(/[R$\s]/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const v = Math.round(Number(s) * 100)
  return v > 0 ? v : null
}

// Efeito do lançamento no saldo (+ entra, − sai). Cancelado não mexe.
export function signed(t: TxLike): number {
  if (t.status === 'cancelado') return 0
  if (t.kind === 'receita') return t.amount_cents
  if (t.kind === 'despesa') return -t.amount_cents
  return t.direction === 'entrada' ? t.amount_cents : -t.amount_cents
}

export const isOverdue = (t: TxLike, today: string) => t.status === 'previsto' && t.due_date < today

// Data de caixa do lançamento.
export const cashDate = (t: TxLike) => (t.status === 'realizado' ? t.paid_date ?? t.due_date : t.due_date)

// Conta afetada: a própria conta ou a conta que paga a fatura do cartão.
export function accountOf(t: TxLike, cards: CardLike[]): string | null {
  if (t.account_id) return t.account_id
  if (t.card_id) return cards.find((c) => c.id === t.card_id)?.pay_account_id ?? null
  return null
}

// Saldo realizado da conta até a data (inclusive). Lançamentos antes do saldo inicial são ignorados.
export function accountBalance(a: AccountLike, txs: TxLike[], cards: CardLike[], upTo?: string): number {
  let total = a.initial_balance_cents
  for (const t of txs) {
    if (t.status !== 'realizado' || accountOf(t, cards) !== a.id) continue
    const d = cashDate(t)
    if (d < a.initial_date || (upTo && d > upTo)) continue
    total += signed(t)
  }
  return total
}

export const monthOf = (iso: string) => iso.slice(0, 7)
export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}
export function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const first = new Date(y, m - 1 + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const mm = String(first.getMonth() + 1).padStart(2, '0')
  return `${first.getFullYear()}-${mm}-${String(Math.min(d, last)).padStart(2, '0')}`
}

export interface MonthSummary {
  incomeDone: number; incomePlanned: number; expenseDone: number; expensePlanned: number
  overdueTotal: number; overdueCount: number
}

// Resumo do mês. Transferências não contam como receita nem despesa.
export function monthSummary(txs: TxLike[], month: string, today: string): MonthSummary {
  const s: MonthSummary = { incomeDone: 0, incomePlanned: 0, expenseDone: 0, expensePlanned: 0, overdueTotal: 0, overdueCount: 0 }
  for (const t of txs) {
    if (t.status === 'cancelado') continue
    if (isOverdue(t, today) && t.kind === 'despesa') { s.overdueTotal += t.amount_cents; s.overdueCount++ }
    if (t.kind === 'transferencia' || monthOf(cashDate(t)) !== month) continue
    const done = t.status === 'realizado'
    if (t.kind === 'receita') done ? (s.incomeDone += t.amount_cents) : (s.incomePlanned += t.amount_cents)
    else done ? (s.expenseDone += t.amount_cents) : (s.expensePlanned += t.amount_cents)
  }
  return s
}

// Previsão de fechamento: saldo de hoje nas contas + tudo previsto até o fim do mês (inclusive atrasados).
export function forecast(accounts: AccountLike[], txs: TxLike[], cards: CardLike[], month: string, today: string): number {
  const ids = new Set(accounts.map((a) => a.id))
  const end = monthEnd(month)
  let total = accounts.reduce((s, a) => s + accountBalance(a, txs, cards, today), 0)
  for (const t of txs) {
    if (t.status !== 'previsto' || t.due_date > end) continue
    const acc = accountOf(t, cards)
    if (acc && ids.has(acc)) total += signed(t)
  }
  return total
}

// Divide um total em N parcelas; os centavos que sobram vão na primeira.
export function splitInstallments(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? total - base * n : 0))
}

export interface Invoice { cardId: string; due: string; total: number; open: number; status: 'paga' | 'aberta' | 'vencida' }

// Faturas de um cartão agrupadas pelo vencimento.
export function invoices(cardId: string, txs: (TxLike & { card_id: string | null })[], today: string): Invoice[] {
  const by = new Map<string, Invoice>()
  for (const t of txs) {
    if (t.card_id !== cardId || t.status === 'cancelado') continue
    const inv = by.get(t.due_date) ?? { cardId, due: t.due_date, total: 0, open: 0, status: 'paga' as const }
    inv.total += t.amount_cents
    if (t.status === 'previsto') inv.open += t.amount_cents
    by.set(t.due_date, inv)
  }
  for (const inv of by.values()) inv.status = inv.open === 0 ? 'paga' : inv.due < today ? 'vencida' : 'aberta'
  return [...by.values()].sort((a, b) => a.due.localeCompare(b.due))
}

// ───────────────────────── Contas fixas ─────────────────────────
export type Frequency = 'semanal' | 'mensal' | 'anual'

// Datas de uma recorrência depois de `after` (exclusivo) até `until` (inclusive), respeitando início e fim.
export function occurrenceDates(start: string, freq: Frequency, after: string | null, until: string, end: string | null): string[] {
  const out: string[] = []
  const limit = end && end < until ? end : until
  for (let i = 0; i < 600; i++) {
    let d: string
    if (freq === 'semanal') {
      const [y, m, dd] = start.split('-').map(Number)
      const x = new Date(y, m - 1, dd + 7 * i)
      d = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    } else d = addMonths(start, freq === 'mensal' ? i : 12 * i)
    if (d > limit) break
    if (!after || d > after) out.push(d)
  }
  return out
}

// ───────────────────────── Mês do casal ─────────────────────────
// Renda do casal − contas fixas do casal − caixinhas/reserva = sobra; a sobra vira mesada proporcional à renda.
export interface CoupleMonth {
  total: number; fixed: number; savings: number; leftover: number
  allowances: { id: string; income: number; share: number; allowance: number }[]
}
export function coupleMonth(incomes: { id: string; income: number }[], fixed: number, savings: number): CoupleMonth {
  const total = incomes.reduce((s, x) => s + x.income, 0)
  const leftover = total - fixed - savings
  const pool = Math.max(0, leftover)
  const allowances = incomes.map((x) => ({ id: x.id, income: x.income, share: total ? x.income / total : 0, allowance: total ? Math.floor((pool * x.income) / total) : 0 }))
  // Centavos que sobram da divisão ficam com quem tem a maior renda.
  const rest = pool - allowances.reduce((s, a) => s + a.allowance, 0)
  if (rest > 0 && allowances.length) allowances.reduce((a, b) => (b.income > a.income ? b : a)).allowance += rest
  return { total, fixed, savings, leftover, allowances }
}
