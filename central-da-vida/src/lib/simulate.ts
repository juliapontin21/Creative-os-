// Simulador de compras: puro e testado. Só avalia; nunca lança nada sem confirmação.
// Autocontido (sem imports) para rodar também nos testes do Node.
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtMoney = (c: number) => BRL.format(c / 100)

export interface SimMonth {
  month: string            // AAAA-MM
  balance: number | null   // saldo projetado das contas da aba no fim do mês (sem a compra)
  room: number | null      // folga do mês: mesada restante (pessoal), sobra do casal (casal) ou null
  installments: number     // parcelas que já correm no mês
  r2Limit: number | null   // referência de parcelas (null = regra desligada)
}
export interface SimInput {
  ctx: 'pf' | 'casal' | 'empresa'
  parts: number[]          // valor que cai em cada mês (1 item = à vista)
  months: SimMonth[]       // mesmo tamanho de parts
  budget: { name: string; limit: number; spent: number } | null
  available: number | null // disponível fora das caixinhas hoje
}
export type Verdict = 'cabe' | 'ajustes' | 'nao'
export interface Check { level: 'ok' | 'warn' | 'bad'; text: string }

export function simulate(inp: SimInput): { verdict: Verdict; checks: Check[]; alternatives: string[] } {
  const checks: Check[] = []
  const total = inp.parts.reduce((a, b) => a + b, 0)
  const parcelado = inp.parts.length > 1
  let cumulative = 0
  let bad = false
  let warn = false
  inp.months.forEach((m, i) => {
    const part = inp.parts[i] ?? 0
    cumulative += part
    const label = `Em ${monthName(m.month)}`
    if (m.balance !== null) {
      const after = m.balance - cumulative
      if (after < 0) { bad = true; checks.push({ level: 'bad', text: `${label}, o saldo projetado das contas ficaria em ${fmtMoney(after)}.` }) }
      else if (i === 0) checks.push({ level: 'ok', text: `${label}, o saldo projetado fica em ${fmtMoney(after)} depois da compra.` })
    }
    if (m.room !== null) {
      const after = m.room - part
      if (inp.ctx === 'casal') {
        if (after < 0) { bad = true; checks.push({ level: 'bad', text: `${label}, a compra passa da sobra do casal em ${fmtMoney(-after)}: compromete as contas obrigatórias ou as caixinhas.` }) }
        else if (part > 0) { warn = true; checks.push({ level: 'warn', text: `${label}, a sobra do casal cai para ${fmtMoney(after)}, e as mesadas diminuem na proporção da renda.` }) }
      } else if (inp.ctx === 'pf') {
        if (after < 0) { warn = true; checks.push({ level: 'warn', text: `${label}, a parcela passa da mesada restante em ${fmtMoney(-after)}.` }) }
        else checks.push({ level: 'ok', text: `${label}, cabe na mesada: sobram ${fmtMoney(after)}.` })
      }
    }
    if (parcelado && m.r2Limit !== null && m.installments + part > m.r2Limit) {
      warn = true
      checks.push({ level: 'warn', text: `${label}, as parcelas somariam ${fmtMoney(m.installments + part)}, acima da referência de ${fmtMoney(m.r2Limit)} (R2).` })
    }
  })
  if (inp.budget) {
    const after = inp.budget.spent + (inp.parts[0] ?? 0)
    if (after > inp.budget.limit) { warn = true; checks.push({ level: 'warn', text: `O limite de ${inp.budget.name} (${fmtMoney(inp.budget.limit)}) passaria para ${fmtMoney(after)} neste mês.` }) }
  }
  if (inp.available !== null && !parcelado && total > inp.available) {
    warn = true
    checks.push({ level: 'warn', text: `À vista, usaria ${fmtMoney(total - inp.available)} do dinheiro separado nas caixinhas.` })
  }

  const alternatives: string[] = []
  if (bad || warn) {
    const first = inp.months[0]
    const room = first?.room ?? first?.balance ?? null
    const headroom = first && first.r2Limit !== null ? first.r2Limit - first.installments : null
    for (let n = 2; n <= 12; n++) {
      const per = Math.ceil(total / n)
      if ((room === null || per <= room) && (headroom === null || per <= headroom)) { alternatives.push(`Parcelar em ${n}x de ${fmtMoney(per)} ficaria dentro das referências deste mês.`); break }
    }
    if (room !== null && room > 0) {
      const months = Math.ceil(total / room)
      if (months > 1 && months <= 24) alternatives.push(`Guardando ${fmtMoney(Math.ceil(total / months))} por mês numa caixinha, dá para comprar à vista em ${months} meses.`)
    }
    alternatives.push('Procurar um valor menor ou adiar para um mês com menos compromissos.')
  }
  return { verdict: bad ? 'nao' : warn ? 'ajustes' : 'cabe', checks, alternatives }
}

function monthName(m: string) {
  const [y, mm] = m.split('-').map(Number)
  return new Date(y, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
}
