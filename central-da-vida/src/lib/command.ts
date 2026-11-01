// "Fale comigo" sem IA: entende comandos diretos em português por regras.
// Puro (sem imports), testado em tests/finance.test.ts. Sempre devolve uma PROPOSTA: nada é gravado sem confirmação.

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const cap = (s: string) => { const t = s.trim().replace(/^[,.;:\-–\s]+|[,.;:\-–\s]+$/g, ''); return t.charAt(0).toUpperCase() + t.slice(1) }
const pad = (n: number) => String(n).padStart(2, '0')
const ymdOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addD = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// ───────────────────────── Data e hora ─────────────────────────
const WEEK = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

export interface When { date: string | null; time: string | null; rest: string }

// mode 'future' (compromissos, lembretes): "sexta" = próxima sexta (hoje, se for sexta). mode 'past' (gastos): a sexta mais recente.
export function parseWhen(text: string, now: Date, mode: 'future' | 'past' = 'future'): When {
  let t = ` ${norm(text)} `
  let date: Date | null = null
  let time: string | null = null
  const take = (re: RegExp) => { const m = t.match(re); if (m) t = t.replace(m[0], ' '); return m }
  let m: RegExpMatchArray | null
  if (take(/\b(depois de amanha)\b/)) date = addD(now, 2)
  else if (take(/\b(amanha)\b/)) date = addD(now, 1)
  else if (take(/\b(anteontem)\b/)) date = addD(now, -2)
  else if (take(/\b(ontem)\b/)) date = addD(now, -1)
  else if (take(/\b(hoje|agora)\b/)) date = new Date(now)
  if (!date && (m = take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : now.getFullYear()
    date = new Date(y, Number(m[2]) - 1, Number(m[1]))
    if (!m[3] && mode === 'future' && ymdOf(date) < ymdOf(now)) date.setFullYear(y + 1)
  }
  if (!date && (m = take(/\bdia (\d{1,2})\b/))) {
    date = new Date(now.getFullYear(), now.getMonth(), Number(m[1]))
    if (mode === 'future' && ymdOf(date) < ymdOf(now)) date.setMonth(date.getMonth() + 1)
    if (mode === 'past' && ymdOf(date) > ymdOf(now)) date.setMonth(date.getMonth() - 1)
  }
  if (!date && (m = take(/\b(?:(proxima|proximo|na|no|nesta|nessa|essa|esta)\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira| feira)?\b/))) {
    const target = WEEK.indexOf(m[2])
    const diff = (target - now.getDay() + 7) % 7
    date = mode === 'past' ? addD(now, -((now.getDay() - target + 7) % 7)) : addD(now, m[1]?.startsWith('proxim') && diff === 0 ? 7 : diff)
  }
  // Hora: "15h", "15h30", "15:30", "às 9", "meio-dia", "8 da noite"
  if (take(/\b(ao )?meio[ -]dia\b/)) time = '12:00'
  else if ((m = take(/\b(?:as |a )?(\d{1,2})(?:h|:)(\d{2})?(?:min)?\b(?:\s+(da manha|da tarde|da noite))?/)) || (m = take(/\bas (\d{1,2})()\b(?:\s+(da manha|da tarde|da noite))?/)) || (m = take(/\b(\d{1,2})()\s+(da manha|da tarde|da noite)\b/))) {
    let h = Number(m[1]); const mi = m[2] ? Number(m[2]) : 0
    if (m[3] && m[3] !== 'da manha' && h < 12) h += 12
    if (h <= 23 && mi <= 59) time = `${pad(h)}:${pad(mi)}`
  }
  return { date: date ? ymdOf(date) : null, time, rest: t.replace(/\s+/g, ' ').trim() }
}

// ───────────────────────── Dinheiro ─────────────────────────
// "R$ 1.250,90", "85,50", "85 reais", "1.500", "3 mil", "85" → centavos
export function parseMoneyIn(text: string): { cents: number; rest: string } | null {
  const t = ` ${norm(text)} `
  const re = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s*mil\b)?(?!\s*(?:ml|l\b|litro|h\b|min|x\b|kg|g\b|vezes|kcal|%|copo|km|\/|:|h\d))/g
  let best: { cents: number; idx: number; len: number; strong: boolean } | null = null
  for (const m of t.matchAll(re)) {
    const raw = m[1]
    let v = raw.includes(',') ? Number(raw.replace(/\./g, '').replace(',', '.')) : /\.\d{3}$/.test(raw) ? Number(raw.replace(/\./g, '')) : Number(raw)
    if (m[2]) v *= 1000
    const strong = /r\$/.test(m[0]) || /^\s*(reais|real|conto|contos)\b/.test(t.slice((m.index ?? 0) + m[0].length)) || !!m[2]
    const before = t.slice(0, m.index).trimEnd()
    if (/\b(dia|as|em|de)$/.test(before) && !strong && /\b(dia|as)$/.test(before)) continue
    if (!best || (strong && !best.strong)) best = { cents: Math.round(v * 100), idx: m.index ?? 0, len: m[0].length, strong }
  }
  if (!best || best.cents <= 0) return null
  const rest = (t.slice(0, best.idx) + ' ' + t.slice(best.idx + best.len)).replace(/\b(reais|real|contos?)\b/, ' ').replace(/\s+/g, ' ').trim()
  return { cents: best.cents, rest }
}

// ───────────────────────── Comandos ─────────────────────────
export interface Ctx {
  now: Date
  partnerNames: string[]                 // ex.: ['michelangelo', 'mi']
  financeCategories: { id: string; name: string }[]
  cards: { id: string; name: string; couple: boolean }[]
  accounts: { id: string; name: string }[]
  habits: { id: string; name: string }[]
  hasCompany: boolean
}

export type Proposal =
  | { kind: 'despesa' | 'receita'; cents: number; description: string; date: string; done: boolean; context: 'pf' | 'casal' | 'empresa'; method: string; cardId: string | null; accountId: string | null; categoryId: string | null; installments: number; client: string }
  | { kind: 'agua'; ml: number }
  | { kind: 'mercado'; items: string[] }
  | { kind: 'compromisso'; title: string; date: string; start: string | null; end: string | null; context: 'pf' | 'casal'; nature: 'pessoal' | 'trabalho' }
  | { kind: 'lembrete'; text: string; date: string; time: string }
  | { kind: 'habito'; habitId: string; name: string; date: string }
  | { kind: 'treino'; activity: string; minutes: number; date: string }
  | { kind: 'comi'; text: string; meal: 'cafe' | 'almoco' | 'lanche' | 'jantar'; kcal: number | null; date: string }
  | { kind: 'nota'; text: string; date: string | null }
  | { kind: 'consulta'; topic: 'mesada' | 'saldo' | 'agenda' | 'vencimentos' | 'gastos'; date: string; categoryId: string | null; range: 'dia' | 'semana' | 'mes' }
  | { kind: 'simular'; cents: number; installments: number; description: string }
  | { kind: 'desconhecido' }

const STOP = /\b(no|na|nos|nas|de|do|da|dos|das|com|pra|para|pro|o|a|os|as|um|uma|em|e|que|eu|meu|minha|hoje|ontem|via|pelo|pela|por)\b/g
const clean = (s: string) => s.replace(STOP, ' ').replace(/\s+/g, ' ').trim()
const has = (t: string, re: RegExp) => re.test(t)

export function parseCommand(input: string, c: Ctx): Proposal {
  const raw = input.trim()
  const t = ` ${norm(raw).replace(/[?!]/g, ' ').replace(/\s+/g, ' ')} `
  if (raw.length < 2) return { kind: 'desconhecido' }
  const today = ymdOf(c.now)

  // ── Consultas e simulação
  if (has(t, /\bposso comprar\b|\bcabe (no|na) (meu|minha)? ?(orcamento|mesada)\b/)) {
    const money = parseMoneyIn(raw)
    if (money) {
      const inst = t.match(/\b(\d{1,2})\s*(?:x|vezes)\b/)
      const desc = cap(money.rest.replace(/\bposso comprar\b/, '').replace(/\b(em )?(\d{1,2})\s*(?:x|vezes)\b/, '').replace(/[?]/g, '').trim().replace(/^(uma|um|o|a)\s+/, '').replace(/\s+(de|por|em|no|na)\s*$/, '').replace(/\s+/g, ' '))
      return { kind: 'simular', cents: money.cents, installments: inst ? Number(inst[1]) : 1, description: desc || 'Compra' }
    }
  }
  const question = /\?\s*$/.test(raw) || has(t, /^ ?(quanto|qual|quais|o que|tenho|como esta|como ta)\b/)
  if (question || has(t, /\b(minha mesada|meu saldo|minha agenda)\b/)) {
    const w = parseWhen(raw, c.now, 'future')
    const range = has(t, /\b(semana)\b/) ? 'semana' : has(t, /\b(mes)\b/) ? 'mes' : 'dia'
    if (has(t, /\bmesada\b/)) return { kind: 'consulta', topic: 'mesada', date: today, categoryId: null, range: 'mes' }
    if (has(t, /\bsaldo\b|\bquanto tenho (na|no) (conta|banco)\b/)) return { kind: 'consulta', topic: 'saldo', date: today, categoryId: null, range: 'dia' }
    if (has(t, /\b(venc\w*|pagar|contas)\b/)) return { kind: 'consulta', topic: 'vencimentos', date: w.date ?? today, categoryId: null, range: range === 'mes' ? 'semana' : range }
    if (has(t, /\b(gastei|gasto|gastamos)\b/)) {
      const cat = c.financeCategories.find((x) => t.includes(` ${norm(x.name)} `))
      return { kind: 'consulta', topic: 'gastos', date: today, categoryId: cat?.id ?? null, range: 'mes' }
    }
    if (has(t, /\b(agenda|compromisso|tenho|marcado)\b/)) return { kind: 'consulta', topic: 'agenda', date: w.date ?? today, categoryId: null, range: range === 'mes' ? 'semana' : range }
  }

  // ── Água
  if (has(t, /\b(bebi|agua|tomei agua)\b/)) {
    let ml = 0, m: RegExpMatchArray | null
    if ((m = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l\b|litros?)/))) ml = Number(m[1].replace(',', '.')) * (m[2] === 'ml' ? 1 : 1000)
    else if ((m = t.match(/(\d+|um|uma|dois|duas|tres)\s*(copos?|garrafas?|garrafinhas?)/))) {
      const n = ({ um: 1, uma: 1, dois: 2, duas: 2, tres: 3 } as Record<string, number>)[m[1]] ?? Number(m[1])
      ml = n * (m[2].startsWith('copo') ? 250 : 500)
    } else if (has(t, /\bum copo\b/)) ml = 250
    if (ml > 0) return { kind: 'agua', ml: Math.round(ml) }
  }

  // ── Lembrete para o parceiro
  const partnerRe = c.partnerNames.length ? new RegExp(`\\b(${c.partnerNames.map(norm).join('|')}|ele|ela|amor)\\b`) : null
  if (has(t, /^ ?(lembra|lembrar|lembre|lembrete)\b/) && partnerRe && partnerRe.test(t)) {
    const w = parseWhen(raw, c.now, 'future')
    const text = cap(w.rest.replace(/^(lembra|lembrar|lembre|lembrete)\s+(pra |para |pro )?(o |a )?/, '').replace(partnerRe, ' ').replace(/^\s*(de|que)\s+/, '').replace(/\s+/g, ' '))
    return { kind: 'lembrete', text: text || 'Lembrete', date: w.date ?? today, time: w.time ?? (w.date && w.date !== today ? '09:00' : nextHour(c.now)) }
  }

  // ── Mercado
  let m: RegExpMatchArray | null
  if ((m = raw.match(/^\s*(mercado|lista|comprar)\s*[:\-]?\s*(.+)$/i)) || (m = raw.match(/^\s*(?:adiciona|adicionar|coloca|colocar|bota|botar|poe|põe|por)\s+(.+?)\s+(?:na|no)\s+(?:lista|mercado)\b.*$/i))) {
    const body = m[2] ?? m[1]
    const items = body.split(/\s*(?:,|;|\be\b|\+)\s*/i).map((x) => x.trim()).filter((x) => x.length > 0)
    if (items.length) return { kind: 'mercado', items }
  }

  // ── Comi
  if (has(t, /\b(comi|almocei|jantei|lanchei|tomei cafe|cafe da manha)\b/)) {
    const meal = has(t, /\b(almoco|almocei)\b/) ? 'almoco' : has(t, /\b(jantar|jantei|janta)\b/) ? 'jantar' : has(t, /\b(lanche|lanchei|cafe da tarde)\b/) ? 'lanche' : has(t, /\b(cafe da manha|tomei cafe)\b/) ? 'cafe'
      : c.now.getHours() < 11 ? 'cafe' : c.now.getHours() < 15 ? 'almoco' : c.now.getHours() < 18 ? 'lanche' : 'jantar'
    const k = t.match(/(\d{2,4})\s*(kcal|calorias)/)
    const w = parseWhen(raw, c.now, 'past')
    let text = w.rest.replace(/(\d{2,4})\s*(kcal|calorias)/, ' ').replace(/\b(comi|almocei|jantei|lanchei|tomei)\b/, ' ').replace(/\b(no|na|de)?\s*(almoco|jantar|janta|lanche|cafe da manha|cafe da tarde)\b/, ' ')
    text = cap(text.replace(/\s+/g, ' '))
    return { kind: 'comi', text: text || 'Refeição', meal, kcal: k ? Number(k[1]) : null, date: w.date ?? today }
  }

  // ── Hábito ("fiz meditação", "li 20 minutos", "alongar feito")
  const tv = t.replace(/\bli\b/, ' li ler ').replace(/\bmeditei\b/, ' meditei meditacao ').replace(/\balonguei\b/, ' alonguei alongar ').replace(/\bestudei\b/, ' estudei estudar ')
  for (const h of c.habits) {
    const words = norm(h.name).split(' ').filter((x) => x.length > 2 && !/^\d+$/.test(x) && !['min', 'minutos', 'vezes'].includes(x))
    if (words.length && words.filter((x) => tv.includes(x.slice(0, Math.max(3, x.length - 2)))).length / words.length >= 0.6 && has(t, /\b(fiz|feito|feita|marca|marcar|conclui|li|meditei|alonguei|tomei|pratiquei|ok|check)\b/)) {
      const w = parseWhen(raw, c.now, 'past')
      return { kind: 'habito', habitId: h.id, name: h.name, date: w.date ?? today }
    }
  }

  // ── Treino / atividade ("fiz 40 min de dança", "corri 30 minutos", "treinei")
  const ACT: [RegExp, string][] = [[/\b(danca|dancei)\b/, 'Dança'], [/\b(corri|corrida)\b/, 'Corrida'], [/\b(caminhei|caminhada)\b/, 'Caminhada'], [/\b(cardio|esteira|bike|pedalei|bicicleta)\b/, 'Cardio'],
    [/\b(yoga|alongamento)\b/, 'Alongamento/Yoga'], [/\b(pilates)\b/, 'Pilates'], [/\b(nadei|natacao)\b/, 'Natação'], [/\b(musculacao|academia|treinei|malhei)\b/, 'Musculação']]
  const act = ACT.find(([re]) => re.test(t))
  if (act && !parseMoneyIn(raw)?.rest.match(/\b(gastei|paguei)\b/)) {
    const mins = t.match(/(\d{1,3})\s*(min|minutos)\b/) ?? t.match(/(\d)\s*h(?:ora)?s?\b/)
    const minutes = mins ? Number(mins[1]) * (/(min)/.test(mins[2]) ? 1 : 60) : 60
    const w = parseWhen(raw.replace(/(\d{1,3})\s*(min|minutos)\b/i, ''), c.now, 'past')
    return { kind: 'treino', activity: act[1], minutes, date: w.date ?? today }
  }

  // ── Receita e despesa
  const isIncome = has(t, /\b(recebi|entrou|ganhei|caiu|pagaram|vou receber|receber|recebimento)\b/)
  const isExpense = has(t, /\b(gastei|paguei|comprei|despesa|gasto|pagar|conta de|boleto)\b/)
  if (isIncome || isExpense) {
    const future = has(t, /\b(vou receber|receber|vou pagar|pagar|vence|vencimento|boleto)\b/) && !has(t, /\b(recebi|paguei)\b/)
    const w = parseWhen(raw, c.now, future ? 'future' : 'past')
    const money = parseMoneyIn(w.rest)
    if (money) {
      let rest = ` ${money.rest} `
      const inst = rest.match(/\b(?:em )?(\d{1,2})\s*(?:x|vezes)\b/)
      if (inst) rest = rest.replace(inst[0], ' ')
      let cardId: string | null = null, accountId: string | null = null, method = isIncome ? 'pix' : 'pix'
      if (/\bcartao (do )?casal\b/.test(rest)) { cardId = c.cards.find((x) => x.couple)?.id ?? null; rest = rest.replace(/\b(no |com o |pelo )?cartao (do )?casal\b/, ' ') }
      for (const card of c.cards) { const n = norm(card.name); if (!cardId && rest.includes(n)) { cardId = card.id; rest = rest.replace(new RegExp(`\\b(no |com o |pelo )?(cartao )?${n}\\b`), ' ') } }
      if (!cardId) for (const a of c.accounts) { const n = norm(a.name); if (rest.includes(n)) { accountId = a.id; rest = rest.replace(new RegExp(`\\b(na |no |pela |pelo )?(conta )?${n}\\b`), ' ') } }
      for (const [re, mth] of [[/\bpix\b/, 'pix'], [/\bdebito\b/, 'debito'], [/\bboleto\b/, 'boleto'], [/\bdinheiro\b/, 'dinheiro'], [/\btransferencia|\bted\b/, 'transferencia']] as [RegExp, string][])
        if (re.test(rest)) { method = mth; rest = rest.replace(re, ' ') }
      if (/\bcartao\b/.test(rest) && !cardId) cardId = c.cards.find((x) => x.couple)?.id ?? c.cards[0]?.id ?? null
      if (cardId) method = 'cartao'
      const couple = c.cards.find((x) => x.id === cardId)?.couple
      let context: 'pf' | 'casal' | 'empresa' = couple || /\b(casal|nosso|nossa|nos dois|da casa|pra casa)\b/.test(rest) ? 'casal' : 'pf'
      if (c.hasCompany && /\b(empresa|pj)\b/.test(rest)) context = 'empresa'
      rest = rest.replace(/\b(casal|nosso|nossa|nos dois|da casa|pra casa|empresa|pj|cartao|no|na|pelo|pela)\b/g, ' ')
      const cat = c.financeCategories.find((x) => ` ${rest} `.includes(` ${norm(x.name)} `))
      let client = ''
      if (isIncome) { const cl = rest.match(/\b(?:da|do|de)\s+(?:marca\s+|cliente\s+)?(.+)$/); if (cl) client = cap(cl[1].replace(STOP, ' ').replace(/\s+/g, ' ')) }
      const description = cap(clean(rest.replace(/\b(gastei|paguei|comprei|despesa|gasto|vou pagar|pagar|conta de|recebi|entrou|ganhei|caiu|pagaram|vou receber|receber|recebimento|reais|real)\b/g, ' ')))
      return {
        kind: isIncome ? 'receita' : 'despesa', cents: money.cents, description: description || (cat?.name ?? (isIncome ? 'Receita' : 'Despesa')),
        date: w.date ?? today, done: !future, context, method, cardId, accountId, categoryId: cat?.id ?? null, installments: inst ? Math.max(1, Math.min(24, Number(inst[1]))) : 1, client,
      }
    }
  }

  // ── Nota
  if ((m = raw.match(/^\s*(?:nota|anotar|anota|anotacao)\s*[:\-]?\s*(.+)$/i))) {
    const w = parseWhen(m[1], c.now, 'future')
    return { kind: 'nota', text: cap(m[1]), date: w.date }
  }

  // ── Compromisso (tem dia ou hora e não é outra coisa)
  const w = parseWhen(raw, c.now, 'future')
  if (w.date || w.time) {
    let rest = ` ${w.rest} `.replace(/\b(compromisso|agendar|agenda|marcar|marca|tenho|evento)\b/g, ' ')
    const casal = /\b(casal|nos dois|juntos)\b/.test(rest)
    const trabalho = /\b(trabalho|reuniao|cliente|gravacao|gravar|call)\b/.test(rest)
    rest = rest.replace(/\b(casal|nos dois|juntos|trabalho)\b/g, ' ')
    const dur = rest.match(/\b(?:por |de )?(\d{1,3})\s*(min|minutos|h|horas?)\b/)
    if (dur) rest = rest.replace(dur[0], ' ')
    const title = cap(rest.replace(/^\s*(de|do|da|o|a|um|uma)\s+/, '').replace(/\s+/g, ' '))
    const minutes = dur ? Number(dur[1]) * (/^h/.test(dur[2]) ? 60 : 1) : 60
    const end = w.time ? (() => { const [h, mi] = w.time!.split(':').map(Number); const total = Math.min(23 * 60 + 59, h * 60 + mi + minutes); return `${pad(Math.floor(total / 60))}:${pad(total % 60)}` })() : null
    if (title) return { kind: 'compromisso', title, date: w.date ?? today, start: w.time, end, context: casal ? 'casal' : 'pf', nature: trabalho ? 'trabalho' : 'pessoal' }
  }
  return { kind: 'desconhecido' }
}

function nextHour(now: Date) { const h = Math.min(23, now.getHours() + 1); return `${pad(h)}:00` }
