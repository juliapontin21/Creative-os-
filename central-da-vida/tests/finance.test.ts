import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accountBalance, addMonths, forecast, invoices, monthSummary, parseMoney, splitInstallments, type TxLike } from '../src/lib/finance.ts'

const tx = (o: Partial<TxLike> & { card_id?: string | null }): TxLike => ({
  kind: 'despesa', status: 'previsto', amount_cents: 1000, direction: null, due_date: '2026-11-10', paid_date: null,
  account_id: 'A', card_id: null, ...o,
})
const A = { id: 'A', initial_balance_cents: 100000, initial_date: '2026-11-01' }
const cards = [{ id: 'C', pay_account_id: 'A' }]

test('parseMoney entende formatos brasileiros', () => {
  assert.equal(parseMoney('1.234,56'), 123456)
  assert.equal(parseMoney('85'), 8500)
  assert.equal(parseMoney('85,5'), 8550)
  assert.equal(parseMoney('R$ 3.000'), 300000)
  assert.equal(parseMoney('12.50'), 1250)
  assert.equal(parseMoney('abc'), null)
  assert.equal(parseMoney('0'), null)
})

test('saldo: inicial + realizados, ignora previstos, cancelados e datas antes do saldo inicial', () => {
  const txs = [
    tx({ kind: 'receita', status: 'realizado', amount_cents: 600000, paid_date: '2026-11-05' }),
    tx({ status: 'realizado', amount_cents: 5000, paid_date: '2026-11-06' }),
    tx({ status: 'previsto', amount_cents: 9999 }),
    tx({ status: 'cancelado', amount_cents: 7777 }),
    tx({ status: 'realizado', amount_cents: 3333, paid_date: '2026-10-20' }),
    tx({ account_id: null, card_id: 'C', status: 'realizado', amount_cents: 2000, paid_date: '2026-11-12' }),
    tx({ kind: 'transferencia', direction: 'saida', status: 'realizado', amount_cents: 10000, paid_date: '2026-11-07' }),
  ]
  assert.equal(accountBalance(A, txs, cards), 100000 + 600000 - 5000 - 2000 - 10000)
  assert.equal(accountBalance(A, txs, cards, '2026-11-05'), 700000)
})

test('resumo do mês separa previsto, realizado e vencido; transferência fora dos totais', () => {
  const txs = [
    tx({ kind: 'receita', status: 'realizado', amount_cents: 600000, due_date: '2026-11-05', paid_date: '2026-11-05' }),
    tx({ kind: 'receita', amount_cents: 50000, due_date: '2026-11-25' }),
    tx({ status: 'realizado', amount_cents: 5000, paid_date: '2026-11-06' }),
    tx({ amount_cents: 8000, due_date: '2026-11-03' }),
    tx({ amount_cents: 1000, due_date: '2026-12-03' }),
    tx({ kind: 'transferencia', direction: 'saida', status: 'realizado', amount_cents: 99999, paid_date: '2026-11-07' }),
  ]
  const s = monthSummary(txs, '2026-11', '2026-11-15')
  assert.deepEqual(s, { incomeDone: 600000, incomePlanned: 50000, expenseDone: 5000, expensePlanned: 8000, overdueTotal: 8000, overdueCount: 1 })
})

test('previsão de fechamento = saldo de hoje + previstos até o fim do mês', () => {
  const txs = [
    tx({ kind: 'receita', status: 'realizado', amount_cents: 600000, paid_date: '2026-11-05' }),
    tx({ amount_cents: 20000, due_date: '2026-11-28' }),
    tx({ account_id: null, card_id: 'C', amount_cents: 30000, due_date: '2026-11-12' }),
    tx({ amount_cents: 99999, due_date: '2026-12-01' }),
  ]
  assert.equal(forecast([A], txs, cards, '2026-11', '2026-11-10'), 100000 + 600000 - 20000 - 30000)
})

test('parcelas somam exatamente o total', () => {
  assert.deepEqual(splitInstallments(10000, 3), [3334, 3333, 3333])
  assert.equal(splitInstallments(99999, 7).reduce((a, b) => a + b), 99999)
})

test('addMonths respeita fim de mês', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonths('2026-11-15', 2), '2027-01-15')
})

test('faturas agrupam por vencimento e mostram o status', () => {
  const t = (due: string, status: TxLike['status'], v: number) => ({ ...tx({ account_id: null, due_date: due, status, amount_cents: v }), card_id: 'C' })
  const inv = invoices('C', [t('2026-11-12', 'realizado', 100), t('2026-11-12', 'realizado', 50), t('2026-12-12', 'previsto', 70), t('2026-10-12', 'previsto', 10)], '2026-11-20')
  assert.deepEqual(inv.map((i) => [i.due, i.total, i.status]), [['2026-10-12', 10, 'vencida'], ['2026-11-12', 150, 'paga'], ['2026-12-12', 70, 'aberta']])
})

import { coupleMonth, occurrenceDates } from '../src/lib/finance.ts'

test('mês do casal: exemplo da proposta (6.000 + 4.000, fixas 5.000, caixinhas 2.000)', () => {
  const r = coupleMonth([{ id: 'J', income: 600000 }, { id: 'M', income: 400000 }], 500000, 200000)
  assert.equal(r.total, 1000000)
  assert.equal(r.leftover, 300000)
  assert.deepEqual(r.allowances.map((a) => a.allowance), [180000, 120000])
})

test('mês do casal: centavos da divisão vão para a maior renda e a soma fecha', () => {
  const r = coupleMonth([{ id: 'J', income: 600000 }, { id: 'M', income: 333333 }], 100000, 0)
  assert.equal(r.allowances[0].allowance + r.allowances[1].allowance, r.leftover)
})

test('mês do casal: se faltar dinheiro, mesada zera e a sobra fica negativa', () => {
  const r = coupleMonth([{ id: 'J', income: 600000 }, { id: 'M', income: 0 }], 700000, 0)
  assert.equal(r.leftover, -100000)
  assert.deepEqual(r.allowances.map((a) => a.allowance), [0, 0])
})

test('contas fixas: datas mensais, semanais e anuais respeitam início, fim e o que já foi gerado', () => {
  assert.deepEqual(occurrenceDates('2026-01-31', 'mensal', null, '2026-04-30', null), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  assert.deepEqual(occurrenceDates('2026-11-05', 'mensal', '2026-12-05', '2027-03-31', '2027-02-10'), ['2027-01-05', '2027-02-05'])
  assert.deepEqual(occurrenceDates('2026-11-02', 'semanal', null, '2026-11-20', null), ['2026-11-02', '2026-11-09', '2026-11-16'])
  assert.deepEqual(occurrenceDates('2024-02-29', 'anual', null, '2027-12-31', null), ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28'])
})
