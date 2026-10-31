// Agenda e hábitos: cálculos puros (sem imports, para rodar nos testes do Node).

export const SNAP_MIN = 15
export const snap = (min: number, step = SNAP_MIN) => Math.round(min / step) * step

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d) }
export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
export const atMinutes = (day: string, min: number) => { const d = parseYmd(day); d.setMinutes(min); return d }

// Distribui compromissos que se sobrepõem em colunas lado a lado (como numa agenda por horário).
export interface Block { id: string; start: number; end: number }
export function layoutColumns(blocks: Block[]): Record<string, { col: number; cols: number }> {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Record<string, { col: number; cols: number }> = {}
  let cluster: Block[] = []
  let clusterEnd = -1
  let colEnds: number[] = []
  const flush = () => { const cols = colEnds.length; for (const b of cluster) out[b.id].cols = cols; cluster = []; colEnds = [] }
  for (const b of sorted) {
    if (b.start >= clusterEnd && cluster.length) flush()
    let col = colEnds.findIndex((e) => e <= b.start)
    if (col < 0) { col = colEnds.length; colEnds.push(b.end) } else colEnds[col] = b.end
    out[b.id] = { col, cols: 1 }
    cluster.push(b)
    clusterEnd = Math.max(clusterEnd, b.end)
  }
  if (cluster.length) flush()
  return out
}

// Datas de uma série (repetição) a partir do primeiro dia, até o horizonte.
export type Rule = 'diario' | 'semanal' | 'mensal' | 'anual'
export const HORIZON_DAYS: Record<Rule, number> = { diario: 183, semanal: 366, mensal: 731, anual: 1827 }
export function seriesDays(first: string, rule: Rule, until?: string): string[] {
  const limit = until ?? addDays(first, HORIZON_DAYS[rule])
  const out: string[] = []
  const [y, m, d] = first.split('-').map(Number)
  for (let i = 0; i < 2000; i++) {
    let day: string
    if (rule === 'diario') day = addDays(first, i)
    else if (rule === 'semanal') day = addDays(first, 7 * i)
    else {
      const months = rule === 'mensal' ? i : 12 * i
      const base = new Date(y, m - 1 + months, 1)
      const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
      day = ymd(new Date(base.getFullYear(), base.getMonth(), Math.min(d, last)))
    }
    if (day > limit) break
    out.push(day)
  }
  return out
}

// ───────────────────────── Hábitos ─────────────────────────
export interface HabitLike { frequency: 'diario' | 'dias' | 'semana'; week_days: number[]; times_per_week: number; target: number; created_at: string }
export const isDue = (h: HabitLike, day: string) => h.frequency !== 'dias' || h.week_days.includes(parseYmd(day).getDay())
export const weekStart = (day: string) => addDays(day, -parseYmd(day).getDay())

// Sequência de dias cumpridos até hoje (dias em que o hábito não é devido não quebram a sequência).
export function streak(h: HabitLike, done: Set<string>, today: string): number {
  let n = 0
  let day = done.has(today) ? today : addDays(today, -1)
  for (let i = 0; i < 1000; i++) {
    if (!isDue(h, day)) { day = addDays(day, -1); continue }
    if (!done.has(day)) break
    n++; day = addDays(day, -1)
  }
  return n
}

// Para "X vezes por semana": quantas vezes na semana do dia.
export function weekCount(done: Set<string>, day: string): number {
  const s = weekStart(day)
  let n = 0
  for (let i = 0; i < 7; i++) if (done.has(addDays(s, i))) n++
  return n
}

// ───────────────────────── Grade geral dos dias (hábitos + treino) ─────────────────────────
// Previsto no dia: hábitos devidos (todo dia / dias da semana) + treino, se havia ficha marcada.
// Hábito "X por semana" e treino fora do previsto contam como extra (somam sem penalizar).
// Hábito com meta > 1 feito em parte vale a fração (ex.: 1 de 2 = 0,5).
export interface DayInput {
  habits: (HabitLike & { id: string })[]
  logs: { habit_id: string; date: string; value: number }[]
  workoutPlanned: (day: string) => boolean
  workoutDone: (day: string) => boolean
}
export function dayScore(inp: DayInput, day: string): { due: number; done: number; level: 'none' | 'zero' | 'partial' | 'full'; ratio: number } {
  let due = 0, done = 0
  for (const h of inp.habits) {
    if (h.created_at && h.created_at.slice(0, 10) > day) continue
    const log = inp.logs.find((l) => l.habit_id === h.id && l.date === day)
    const frac = log ? Math.min(1, Number(log.value) / Number(h.target)) : 0
    if (h.frequency === 'semana') { if (frac > 0) { due += 1; done += frac } continue }
    if (!isDue(h, day)) continue
    due += 1; done += frac
  }
  const planned = inp.workoutPlanned(day), did = inp.workoutDone(day)
  if (planned || did) { due += 1; if (did) done += 1 }
  if (!due) return { due, done, level: 'none', ratio: 0 }
  const ratio = done / due
  return { due, done, ratio, level: ratio >= 0.999 ? 'full' : ratio > 0 ? 'partial' : 'zero' }
}
