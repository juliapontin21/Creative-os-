import { useState } from 'react'
import { Icon } from '../components/Icon'
import { ColorPicker, Confirm, Empty, Segmented, Sheet } from '../components/ui'
import { addDays, isDue, parseYmd, streak, weekCount, weekStart, ymd } from '../lib/agenda'
import { useData } from '../lib/data'
import type { Habit } from '../lib/types'
import { PALETTE } from '../lib/util'

const WD = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

// ───────────────────────── Água ─────────────────────────

export function useWater(day = ymd(new Date())) {
  const { water_logs, personal_settings, me } = useData()
  const goal = personal_settings.find((s) => s.owner_id === me!.id)?.water_goal_ml ?? 2000
  const logs = water_logs.filter((w) => w.owner_id === me!.id && w.date === day)
  const total = Math.max(0, logs.reduce((s, w) => s + w.ml, 0))
  return { goal, total, logs, pct: Math.min(100, Math.round((total / goal) * 100)) }
}

export function WaterCard({ compact }: { compact?: boolean }) {
  const { insert, update, remove, personal_settings, me, toast } = useData()
  const today = ymd(new Date())
  const { goal, total, logs, pct } = useWater(today)
  const [custom, setCustom] = useState(false)
  const [ml, setMl] = useState('')
  const [goalEdit, setGoalEdit] = useState(false)
  const [g, setG] = useState(String(goal))
  const add = (v: number) => insert('water_logs', { date: today, ml: v })
  const last = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const setting = personal_settings.find((s) => s.owner_id === me!.id)
  return (
    <div className={'card water' + (compact ? ' compact' : '')}>
      <svg className="bottle" viewBox="0 0 60 120" role="img" aria-label={`${pct}% da meta de água`}>
        <defs><clipPath id="bottle-clip"><path d="M22 4h16v12c0 4 10 8 10 18v76a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V34c0-10 10-14 10-18z" /></clipPath></defs>
        <rect x="0" y={120 - (pct / 100) * 104 - 6} width="60" height="120" className="water-fill" clipPath="url(#bottle-clip)" />
        <path d="M22 4h16v12c0 4 10 8 10 18v76a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V34c0-10 10-14 10-18z" className="bottle-line" />
      </svg>
      <div className="grow water-info">
        <strong>Água · {pct}%</strong>
        <span className="small">{(total / 1000).toLocaleString('pt-BR')} L de {(goal / 1000).toLocaleString('pt-BR')} L · faltam {(Math.max(0, goal - total) / 1000).toLocaleString('pt-BR')} L</span>
        <div className="water-btns">
          {[200, 300, 500].map((v) => <button key={v} className="btn small" onClick={() => add(v)}>+{v}</button>)}
          <button className="btn small" onClick={() => setCustom(true)} aria-label="Outro valor">…</button>
          {last && <button className="icon-btn" aria-label="Desfazer o último" title="Desfazer o último" onClick={() => remove('water_logs', last.id)}><Icon name="back" size={16} /></button>}
          {!compact && <button className="link small" onClick={() => setGoalEdit(true)}>Meta</button>}
        </div>
      </div>
      {custom && <Sheet title="Registrar água" onClose={() => setCustom(false)} footer={<>
        <button className="btn" onClick={() => setCustom(false)}>Cancelar</button>
        <button className="btn primary" disabled={!(Number(ml) > 0)} onClick={async () => { if (await add(Math.round(Number(ml)))) setCustom(false) }}>Registrar</button></>}>
        <label className="field"><span className="label">Quantidade (ml)</span><input type="number" inputMode="numeric" autoFocus value={ml} onChange={(e) => setMl(e.target.value)} placeholder="250" /></label>
      </Sheet>}
      {goalEdit && <Sheet title="Meta diária de água" onClose={() => setGoalEdit(false)} footer={<>
        <button className="btn" onClick={() => setGoalEdit(false)}>Cancelar</button>
        <button className="btn primary" disabled={!(Number(g) >= 250)} onClick={async () => {
          const v = Math.round(Number(g))
          const r = setting ? await update('personal_settings', setting.id, { water_goal_ml: v }) : await insert('personal_settings', { water_goal_ml: v })
          if (r) { toast('Meta de água salva.'); setGoalEdit(false) }
        }}>Salvar</button></>}>
        <label className="field"><span className="label">Meta (ml por dia)</span><input type="number" inputMode="numeric" value={g} onChange={(e) => setG(e.target.value)} /></label>
        <p className="hint">Widget na tela do iPhone não é possível para app instalado pelo navegador. Use o atalho no Hoje; na Fase 4B, dá para receber lembretes.</p>
      </Sheet>}
    </div>
  )
}

// ───────────────────────── Hábitos ─────────────────────────

function useHabitDays(h: Habit) {
  const { habit_logs } = useData()
  const logs = habit_logs.filter((l) => l.habit_id === h.id)
  const done = new Set(logs.filter((l) => l.value >= h.target).map((l) => l.date))
  return { logs, done }
}

export function HabitRow({ h, day }: { h: Habit; day: string }) {
  const { insert, update } = useData()
  const { logs, done } = useHabitDays(h)
  const log = logs.find((l) => l.date === day)
  const value = log?.value ?? 0
  const complete = value >= h.target
  const set = (v: number) => log ? update('habit_logs', log.id, { value: Math.max(0, v) }) : insert('habit_logs', { habit_id: h.id, date: day, value: Math.max(0, v) })
  const info = h.frequency === 'semana' ? `${weekCount(done, day)}/${h.times_per_week} na semana` : `${streak(h, done, day)} dia(s) seguidos`
  return (
    <div className={'card habit' + (complete ? ' done' : '')} style={{ ['--c' as string]: h.color }}>
      <button className="ev-check big" aria-label={complete ? 'Desmarcar' : 'Marcar como feito'} onClick={() => set(complete ? 0 : h.target)}>{complete && <Icon name="check" size={12} />}</button>
      <span className="grow habit-text"><strong>{h.name}</strong><span className="muted small">{h.target > 1 ? `${value}/${h.target} ${h.unit} · ` : ''}{info}</span></span>
      {h.target > 1 && <span className="habit-steps">
        <button className="icon-btn" aria-label="Menos" onClick={() => set(value - 1)}>−</button>
        <button className="icon-btn" aria-label="Mais" onClick={() => set(value + 1)}><Icon name="plus" size={16} /></button></span>}
    </div>
  )
}

export function Habitos() {
  const { habits, me, partner } = useData()
  const today = ymd(new Date())
  const [day, setDay] = useState(today)
  const [edit, setEdit] = useState<Habit | 'new' | null>(null)
  const [detail, setDetail] = useState<Habit | null>(null)
  const mine = habits.filter((h) => h.owner_id === me!.id && !h.archived_at).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const due = mine.filter((h) => isDue(h, day))
  const other = mine.filter((h) => !isDue(h, day))
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i))
  return (
    <>
      <p className="card info">Hábitos e água são só seus: {partner?.display_name ?? 'o outro'} não vê.</p>
      <WaterCard />
      <div className="week-strip">{week.map((d) => (
        <button key={d} className={'ws-day' + (d === day ? ' on' : '') + (d === today ? ' today' : '')} onClick={() => setDay(d)}>
          <span>{WD[parseYmd(d).getDay()]}</span><b>{parseYmd(d).getDate()}</b></button>))}</div>
      <section>
        <div className="section-head"><h2>{day === today ? 'Hoje' : parseYmd(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })}</h2>
          <button className="link" onClick={() => setEdit('new')}>+ Hábito</button></div>
        {due.length ? <div className="list">{due.map((h) => <HabitRow key={h.id} h={h} day={day} />)}</div>
          : <Empty icon="check" title={mine.length ? 'Nenhum hábito para este dia' : 'Nenhum hábito ainda'} text="Ex.: ler 20 minutos, alongar, 3 treinos por semana." action={<button className="btn primary" onClick={() => setEdit('new')}>Criar hábito</button>} />}
      </section>
      {mine.length > 0 && <section>
        <div className="section-head"><h2>Acompanhamento</h2></div>
        <div className="list">{mine.map((h) => (
          <button key={h.id} className="card list-link" onClick={() => setDetail(h)}>
            <span className="dot" style={{ background: h.color }} /><span className="grow"><strong>{h.name}</strong>
              <span className="muted small">{h.frequency === 'diario' ? 'todo dia' : h.frequency === 'dias' ? h.week_days.map((x) => WD[x]).join(' ') : `${h.times_per_week}× por semana`}</span></span>
            <MiniGrid h={h} /><Icon name="right" size={16} />
          </button>
        ))}</div>
        {other.length > 0 && <p className="hint">{other.length} {other.length === 1 ? 'hábito não é' : 'hábitos não são'} deste dia.</p>}
      </section>}
      {edit && <HabitEditor habit={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {detail && <HabitDetail h={detail} onClose={() => setDetail(null)} onEdit={() => { setEdit(detail); setDetail(null) }} />}
    </>
  )
}

function MiniGrid({ h }: { h: Habit }) {
  const { done } = useHabitDays(h)
  const today = ymd(new Date())
  return <span className="mini-grid">{Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => <i key={d} className={done.has(d) ? 'on' : isDue(h, d) ? '' : 'off'} style={{ ['--c' as string]: h.color }} />)}</span>
}

function HabitDetail({ h, onClose, onEdit }: { h: Habit; onClose: () => void; onEdit: () => void }) {
  const { done } = useHabitDays(h)
  const today = ymd(new Date())
  const [range, setRange] = useState<'semana' | 'mes' | 'ano'>('mes')
  const daysBack = range === 'semana' ? 7 : range === 'mes' ? 35 : 371
  const start = weekStart(addDays(today, -(daysBack - 7)))
  const cells = Array.from({ length: daysBack }, (_, i) => addDays(start, i))
  const counted = cells.filter((d) => d <= today && isDue(h, d))
  const rate = counted.length ? Math.round((counted.filter((d) => done.has(d)).length / counted.length) * 100) : 0
  return (
    <Sheet title={h.name} onClose={onClose} footer={<><span className="grow" /><button className="btn" onClick={onEdit}>Editar hábito</button><button className="btn primary" onClick={onClose}>Fechar</button></>}>
      <Segmented value={range} onChange={setRange} options={[{ id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }, { id: 'ano', label: 'Ano' }]} />
      <div className="grid2">
        <div className="card stat"><span className="muted small">Sequência atual</span><strong className="stat-value">{streak(h, done, today)} dias</strong></div>
        <div className="card stat"><span className="muted small">Cumprido no período</span><strong className="stat-value">{rate}%</strong></div>
      </div>
      <div className={'heat ' + range} style={{ ['--c' as string]: h.color }} role="img" aria-label={`Grade de ${range}`}>
        {range !== 'ano' && WD.map((w, i) => <span key={i} className="heat-wd">{w}</span>)}
        {cells.map((d) => <i key={d} title={parseYmd(d).toLocaleDateString('pt-BR')} className={(done.has(d) ? 'on' : '') + (d > today ? ' future' : '') + (!isDue(h, d) ? ' off' : '') + (d === today ? ' today' : '')} />)}
      </div>
      <p className="hint">Cada quadradinho é um dia: cheio = feito; claro = pendente; tracejado = dia em que o hábito não estava previsto.</p>
    </Sheet>
  )
}

function HabitEditor({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const { insert, update, remove, toast } = useData()
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? PALETTE[5])
  const [frequency, setFrequency] = useState<Habit['frequency']>(habit?.frequency ?? 'diario')
  const [days, setDays] = useState<number[]>(habit?.week_days ?? [1, 2, 3, 4, 5])
  const [times, setTimes] = useState(habit?.times_per_week ?? 3)
  const [target, setTarget] = useState(String(habit?.target ?? 1))
  const [unit, setUnit] = useState(habit?.unit ?? 'vez')
  const [reminder, setReminder] = useState(habit?.reminder_time?.slice(0, 5) ?? '')
  const [inAgenda, setInAgenda] = useState(habit?.show_in_agenda ?? false)
  const [confirmDel, setConfirmDel] = useState(false)
  const valid = name.trim() !== '' && Number(target) > 0 && (frequency !== 'dias' || days.length > 0)
  const save = async () => {
    const row = { name: name.trim(), color, frequency, week_days: frequency === 'dias' ? days : [0, 1, 2, 3, 4, 5, 6], times_per_week: times, target: Number(target), unit: unit.trim() || 'vez', reminder_time: reminder || null, show_in_agenda: inAgenda }
    const r = habit ? await update('habits', habit.id, row) : await insert('habits', row)
    if (r) { toast('Hábito salvo.'); onClose() }
  }
  return (
    <Sheet title={habit ? 'Editar hábito' : 'Novo hábito'} onClose={onClose} footer={<>
      {habit && <button className="icon-btn" aria-label="Arquivar" title="Arquivar" onClick={async () => { if (await update('habits', habit.id, { archived_at: new Date().toISOString() })) onClose() }}><Icon name="archive" /></button>}
      {habit && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>}
      <span className="grow" /><button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!valid} onClick={save}>Salvar</button></>}>
      <label className="field"><span className="label">Hábito</span><input autoFocus={!habit} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ler 20 minutos" /></label>
      <div className="field"><span className="label">Frequência</span>
        <Segmented value={frequency} onChange={setFrequency} options={[{ id: 'diario', label: 'Todo dia' }, { id: 'dias', label: 'Dias da semana' }, { id: 'semana', label: 'X por semana' }]} /></div>
      {frequency === 'dias' && <div className="chips wrap">{WD.map((w, i) => <button key={i} type="button" className={'chip' + (days.includes(i) ? ' on' : '')} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}>{w}</button>)}</div>}
      {frequency === 'semana' && <label className="field"><span className="label">Vezes por semana</span><select value={times} onChange={(e) => setTimes(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>}
      <div className="row2">
        <label className="field"><span className="label">Meta por dia</span><input type="number" inputMode="decimal" min={1} value={target} onChange={(e) => setTarget(e.target.value)} /></label>
        <label className="field"><span className="label">Unidade</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="vez, min, páginas" /></label>
      </div>
      <label className="field"><span className="label">Horário do lembrete (opcional)</span><input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} />
        <span className="hint">A notificação chega na Fase 4B.</span></label>
      <label className="toggle"><input type="checkbox" checked={inAgenda} onChange={(e) => setInAgenda(e.target.checked)} />Mostrar na agenda (só para você)</label>
      <ColorPicker value={color} onChange={setColor} />
      {confirmDel && habit && <Confirm title="Excluir hábito?" message="O histórico de marcações também será apagado. Para guardar o histórico, arquive." onConfirm={async () => { if (await remove('habits', habit.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}
