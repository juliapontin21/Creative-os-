import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Icon } from '../components/Icon'
import { CategoryChip, Segmented, Sheet, useModuleCategories } from '../components/ui'
import { expandCategories } from '../lib/filters'
import { addDays, atMinutes, isDue, layoutColumns, minutesOfDay, parseYmd, snap, weekStart, ymd } from '../lib/agenda'
import { useData } from '../lib/data'
import { fmtMoney, invoices } from '../lib/finance'
import { go } from '../lib/route'
import type { AgendaEvent } from '../lib/types'
import { EventEditor, ReminderEditor, type EventDraft } from './AgendaEditors'

type View = 'dia' | '3dias' | 'semana' | 'mes' | 'lista'
const HOUR = 56
const LONG_PRESS = 380
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// Filtros (lembrados neste aparelho).
interface AgendaFilters { meus: boolean; casal: boolean; parceiro: 'todos' | 'afetam' | 'nenhum'; habitos: boolean; receber: boolean; pagar: boolean; lembretes: boolean; cats: string[] }
const DEFAULT_F: AgendaFilters = { meus: true, casal: true, parceiro: 'todos', habitos: true, receber: true, pagar: true, lembretes: true, cats: [] }
function useStored<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, set] = useState<T>(() => { try { const r = localStorage.getItem(key); return r ? { ...init, ...JSON.parse(r) } : init } catch { return init } })
  // (filtros antigos sem 'cats' recebem o padrão acima)
  return [v, (x: T) => { set(x); try { localStorage.setItem(key, JSON.stringify(x)) } catch { /* sem armazenamento */ } }]
}

// Item exibido: compromisso (arrastável), ou chip de dia (finanças, hábitos, lembretes).
interface Timed { key: string; ev: AgendaEvent; dayIdx: number; start: number; end: number; editable: boolean; partner: boolean; segment: boolean }
interface Chip { key: string; day: string; label: string; color: string; done?: boolean; onToggle?: () => void; onOpen: () => void; ev?: AgendaEvent; editable?: boolean; partner?: boolean }

export function Agenda() {
  const d = useData()
  const meId = d.me!.id
  const today = ymd(new Date())
  const [view, setView] = useStored<{ v: View }>('cdv-agenda-view', { v: '3dias' })
  const [anchor, setAnchor] = useState(today)
  const [f, setF] = useStored<AgendaFilters>('cdv-agenda-filters', DEFAULT_F)
  const [fs, setFs] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [edit, setEdit] = useState<{ ev: AgendaEvent | null; draft?: EventDraft } | null>(null)
  const [reminder, setReminder] = useState(false)
  const [monthSel, setMonthSel] = useState(today)

  useEffect(() => {
    document.body.classList.toggle('agenda-fs', fs)
    return () => document.body.classList.remove('agenda-fs')
  }, [fs])

  const v = view.v
  const nDays = v === 'dia' ? 1 : v === '3dias' ? 3 : 7
  const firstDay = v === 'semana' ? weekStart(anchor) : anchor
  const days = Array.from({ length: nDays }, (_, i) => addDays(firstDay, i))

  // Compromissos visíveis conforme filtros (quem + categorias).
  const agendaCats = useModuleCategories('agenda')
  const catSet = f.cats.length ? expandCategories(f.cats, d.categories) : null
  const visible = useMemo(() => d.events.filter((e) => {
    if (e.archived_at) return false
    if (catSet && !(e.category_id && catSet.has(e.category_id))) return false
    if (e.context === 'casal') return f.casal
    if (e.owner_id === meId) return f.meus
    return f.parceiro === 'todos' || (f.parceiro === 'afetam' && e.impacts_partner)
  }), [d.events, f, meId, catSet])
  const editableEv = (e: AgendaEvent) => e.context === 'casal' || e.owner_id === meId

  const toggleDone = (e: AgendaEvent) => { if (editableEv(e)) d.update('events', e.id, { done_at: e.done_at ? null : new Date().toISOString() }) }
  const moveEvent = (e: AgendaEvent, start: Date, end: Date) => d.update('events', e.id, { start_at: start.toISOString(), end_at: end.toISOString() })

  // Chips de dia (dia inteiro, finanças, hábitos, lembretes).
  const chipsFor = (day: string): Chip[] => {
    const out: Chip[] = []
    for (const e of visible) {
      const s = new Date(e.start_at), en = new Date(e.end_at)
      const dayStart = parseYmd(day), dayEnd = parseYmd(addDays(day, 1))
      const multiTimed = !e.all_day && (ymd(s) !== ymd(new Date(en.getTime() - 1)))
      if ((e.all_day || multiTimed) && s < dayEnd && en > dayStart)
        out.push({ key: `e${e.id}${day}`, day, label: e.title, color: e.color, done: !!e.done_at, onToggle: editableEv(e) ? () => toggleDone(e) : undefined, onOpen: () => setEdit({ ev: e }), ev: e, editable: editableEv(e) && e.all_day, partner: e.owner_id !== meId && e.context === 'pf' })
    }
    if (f.receber || f.pagar) {
      for (const t of d.transactions) {
        if (t.status !== 'previsto' || t.due_date !== day || t.card_id || t.kind === 'transferencia') continue
        if (t.context === 'pf' && t.owner_id !== meId) continue
        if ((t.kind === 'receita' && !f.receber) || (t.kind === 'despesa' && !f.pagar)) continue
        out.push({ key: `t${t.id}`, day, label: `${t.kind === 'receita' ? '↓' : '↑'} ${t.description} ${fmtMoney(t.amount_cents)}`, color: t.kind === 'receita' ? '#15803d' : '#b91c1c', onOpen: () => go('financas', 'lancamentos') })
      }
      if (f.pagar) for (const c of d.cards.filter((c) => !c.archived_at && (c.context === 'casal' || c.owner_id === meId))) {
        const inv = invoices(c.id, d.transactions, today).find((i) => i.due === day && i.status !== 'paga')
        if (inv) out.push({ key: `f${c.id}${day}`, day, label: `↑ Fatura ${c.name} ${fmtMoney(inv.open)}`, color: '#b91c1c', onOpen: () => go('financas', 'contas') })
      }
    }
    if (f.habitos) for (const h of d.habits.filter((h) => !h.archived_at && h.show_in_agenda && isDue(h, day))) {
      const log = d.habit_logs.find((l) => l.habit_id === h.id && l.date === day)
      const done = !!log && log.value >= h.target
      out.push({ key: `h${h.id}${day}`, day, label: h.name, color: h.color, done, onOpen: () => go('habitos'),
        onToggle: () => log ? d.update('habit_logs', log.id, { value: done ? 0 : h.target }) : d.insert('habit_logs', { habit_id: h.id, date: day, value: h.target }) })
    }
    if (f.lembretes) for (const r of d.partner_reminders.filter((r) => ymd(new Date(r.remind_at)) === day)) {
      const fromMe = r.from_id === meId
      out.push({ key: `r${r.id}`, day, label: `🔔 ${fromMe ? `p/ ${d.partner?.display_name ?? ''}: ` : ''}${r.text}`, color: '#7c3aed', done: !!r.done_at,
        onToggle: () => d.update('partner_reminders', r.id, { done_at: r.done_at ? null : new Date().toISOString() }), onOpen: () => go('hoje') })
    }
    return out
  }

  const timedFor = (dayList: string[]): Timed[] => {
    const out: Timed[] = []
    dayList.forEach((day, i) => {
      for (const e of visible) {
        if (e.all_day) continue
        const s = new Date(e.start_at), en = new Date(e.end_at)
        if (ymd(s) !== ymd(new Date(en.getTime() - 1))) continue // vários dias: vai para a faixa de dia inteiro
        if (ymd(s) !== day) continue
        out.push({ key: e.id, ev: e, dayIdx: i, start: minutesOfDay(s), end: minutesOfDay(s) + (en.getTime() - s.getTime()) / 60000, editable: editableEv(e), partner: e.context === 'pf' && e.owner_id !== meId, segment: false })
      }
    })
    return out
  }

  const step = v === 'dia' ? 1 : v === '3dias' ? 3 : v === 'semana' ? 7 : 0
  const nav = (dir: number) => {
    if (v === 'mes') { const x = parseYmd(anchor); x.setMonth(x.getMonth() + dir, 1); setAnchor(ymd(x)) }
    else if (v === 'lista') setAnchor(addDays(anchor, 14 * dir))
    else setAnchor(addDays(anchor, step * dir))
  }
  const title = (() => {
    const a = parseYmd(days[0]), b = parseYmd(days[days.length - 1])
    if (v === 'mes') { const s = parseYmd(anchor).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1) }
    if (v === 'dia' || v === 'lista') return a.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} de ${b.toLocaleDateString('pt-BR', { month: 'short' })}` : `${a.getDate()} ${a.toLocaleDateString('pt-BR', { month: 'short' })} – ${b.getDate()} ${b.toLocaleDateString('pt-BR', { month: 'short' })}`
  })()

  return (
    <div className={'agenda' + (fs ? ' fs' : '')}>
      <div className="agenda-bar">
        <button className="icon-btn" aria-label="Anterior" onClick={() => nav(-1)}><Icon name="back" /></button>
        <strong className="grow agenda-title">{title}</strong>
        <button className="icon-btn" aria-label="Próximo" onClick={() => nav(1)}><Icon name="right" /></button>
        <button className="btn small" onClick={() => { setAnchor(today); setMonthSel(today) }}>Hoje</button>
        <button className="icon-btn" aria-label="Filtros" onClick={() => setShowFilters(true)}><Icon name="filter" /></button>
        <button className="icon-btn" aria-label={fs ? 'Sair da tela cheia' : 'Tela cheia'} onClick={() => setFs(!fs)}><Icon name={fs ? 'x' : 'grid'} /></button>
      </div>
      <div className="chips scroll agenda-views">
        <Segmented value={v} onChange={(x) => setView({ v: x })} options={[{ id: 'dia', label: 'Dia' }, { id: '3dias', label: '3 dias' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mês' }, { id: 'lista', label: 'Lista' }]} />
      </div>
      <div className="chips scroll quick-filters">
        <button className={'chip' + (f.meus && f.casal && f.parceiro === 'todos' && !f.cats.length ? ' on' : '')} onClick={() => setF({ ...f, meus: true, casal: true, parceiro: 'todos', cats: [] })}>Tudo</button>
        <button className={'chip' + (f.meus && !f.casal && f.parceiro === 'nenhum' ? ' on' : '')} onClick={() => setF({ ...f, meus: true, casal: false, parceiro: 'nenhum' })}>Só meus</button>
        {d.partner && <button className={'chip' + (f.meus && f.casal && f.parceiro === 'afetam' ? ' on' : '')} onClick={() => setF({ ...f, meus: true, casal: true, parceiro: 'afetam' })}>Meus + os que me afetam</button>}
        {agendaCats.filter((c) => !c.parent_id).map((c) => <CategoryChip key={c.id} cat={c} on={f.cats.includes(c.id)} onClick={() => setF({ ...f, cats: f.cats.includes(c.id) ? f.cats.filter((x) => x !== c.id) : [...f.cats, c.id] })} />)}
      </div>

      {(v === 'dia' || v === '3dias' || v === 'semana') && (
        <TimeGrid days={days} today={today} timed={timedFor(days)} chips={days.map(chipsFor)} compact={v === 'semana'}
          onCreate={(day, min) => setEdit({ ev: null, draft: { day, startMin: min, durMin: 60 } })}
          onOpen={(e) => setEdit({ ev: e })} onToggle={toggleDone} onMove={moveEvent} />
      )}
      {v === 'mes' && <MonthView anchor={anchor} today={today} selected={monthSel} onSelect={setMonthSel} chipsFor={(day) => chipsFor(day).filter((c) => !c.key.startsWith('h'))} timedOf={(day) => timedFor([day])}
        onMoveDay={(e, day) => {
          const s = new Date(e.start_at), en = new Date(e.end_at)
          const ns = parseYmd(day); ns.setHours(s.getHours(), s.getMinutes())
          moveEvent(e, ns, new Date(ns.getTime() + (en.getTime() - s.getTime())))
        }}
        onOpen={(e) => setEdit({ ev: e })} onToggle={toggleDone} onCreate={(day) => setEdit({ ev: null, draft: { day, startMin: 9 * 60 } })} />}
      {v === 'lista' && <ListView from={anchor} today={today} chipsFor={chipsFor} timedOf={(day) => timedFor([day])} onOpen={(e) => setEdit({ ev: e })} onToggle={toggleDone} />}

      {!fs && <button className="fab" aria-label="Novo compromisso" onClick={() => setEdit({ ev: null, draft: { day: v === 'mes' ? monthSel : anchor, startMin: Math.min(22 * 60, snap(minutesOfDay(new Date()) + 60, 60)) } })}><Icon name="plus" size={26} /></button>}
      {fs && <button className="fab fs-fab" aria-label="Novo compromisso" onClick={() => setEdit({ ev: null, draft: { day: anchor, startMin: 9 * 60 } })}><Icon name="plus" size={26} /></button>}

      {showFilters && (
        <Sheet title="Mostrar na agenda" onClose={() => setShowFilters(false)} footer={<>
          <button className="btn" onClick={() => setF(DEFAULT_F)}>Padrão</button><span className="grow" />
          <button className="btn primary" onClick={() => setShowFilters(false)}>Pronto</button></>}>
          <label className="toggle"><input type="checkbox" checked={f.meus} onChange={(e) => setF({ ...f, meus: e.target.checked })} />Meus compromissos</label>
          <label className="toggle"><input type="checkbox" checked={f.casal} onChange={(e) => setF({ ...f, casal: e.target.checked })} />Compromissos do casal</label>
          {d.partner && <div className="field"><span className="label">Compromissos de {d.partner.display_name}</span>
            <Segmented value={f.parceiro} onChange={(p) => setF({ ...f, parceiro: p })} options={[{ id: 'todos', label: 'Todos' }, { id: 'afetam', label: 'Só os que me afetam' }, { id: 'nenhum', label: 'Nenhum' }]} /></div>}
          <div className="field"><span className="label">Categorias {f.cats.length > 0 && `(${f.cats.length})`}</span>
            <div className="chips wrap">{agendaCats.map((c) => <CategoryChip key={c.id} cat={c} on={f.cats.includes(c.id)} onClick={() => setF({ ...f, cats: f.cats.includes(c.id) ? f.cats.filter((x) => x !== c.id) : [...f.cats, c.id] })} />)}
              {!agendaCats.length && <span className="hint">Crie categorias em Mais → Categorias → Agenda.</span>}</div>
            <span className="hint">Nenhuma marcada = todas. Escolher uma categoria inclui as subcategorias. Categorias pessoais do outro não aparecem aqui.</span></div>
          <label className="toggle"><input type="checkbox" checked={f.habitos} onChange={(e) => setF({ ...f, habitos: e.target.checked })} />Hábitos (os marcados para aparecer na agenda)</label>
          <label className="toggle"><input type="checkbox" checked={f.receber} onChange={(e) => setF({ ...f, receber: e.target.checked })} />Recebimentos</label>
          <label className="toggle"><input type="checkbox" checked={f.pagar} onChange={(e) => setF({ ...f, pagar: e.target.checked })} />Vencimentos e faturas</label>
          <label className="toggle"><input type="checkbox" checked={f.lembretes} onChange={(e) => setF({ ...f, lembretes: e.target.checked })} />Lembretes entre vocês</label>
          {d.partner && <button className="btn wide" onClick={() => { setShowFilters(false); setReminder(true) }}>Criar lembrete para {d.partner.display_name}</button>}
        </Sheet>
      )}
      {edit && <EventEditor ev={edit.ev} draft={edit.draft} onClose={() => setEdit(null)} />}
      {reminder && <ReminderEditor onClose={() => setReminder(false)} />}
    </div>
  )
}

// ───────────────────────── Arrastar com o dedo ─────────────────────────
// Toque curto: abre. Segurar ~0,4 s: arrasta (o celular vibra, se puder). A borda de baixo: muda a duração.

type DragState = { key: string; mode: 'move' | 'resize'; dx: number; dy: number }

function useDrag(container: React.RefObject<HTMLElement | null>, onEnd: (key: string, mode: 'move' | 'resize', dx: number, dy: number, x: number, y: number) => void, onTap: (key: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const active = useRef<DragState | null>(null)
  // Enquanto arrasta, impede a rolagem da tela (iPhone precisa de listener não passivo).
  useEffect(() => {
    const el = container.current
    if (!el) return
    const block = (e: TouchEvent) => { if (active.current) e.preventDefault() }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [container])

  const start = (e: RPointerEvent, key: string, mode: 'move' | 'resize', canDrag: boolean) => {
    e.stopPropagation()
    const x0 = e.clientX, y0 = e.clientY
    let moved = false
    let timer = 0
    const activate = () => {
      active.current = { key, mode, dx: 0, dy: 0 }
      setDrag(active.current)
      try { navigator.vibrate?.(12) } catch { /* sem vibração */ }
    }
    if (canDrag) { if (mode === 'resize') activate(); else timer = window.setTimeout(activate, LONG_PRESS) }
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0
      if (!active.current) { if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { moved = true; window.clearTimeout(timer) } return }
      ev.preventDefault()
      active.current = { ...active.current, dx, dy }
      setDrag(active.current)
    }
    const up = (ev: PointerEvent) => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      const a = active.current
      active.current = null
      setDrag(null)
      if (a) onEnd(a.key, a.mode, a.dx, a.dy, ev.clientX, ev.clientY)
      else if (!moved && mode === 'move') onTap(key)
    }
    const cancel = () => {
      if (active.current) return
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }
  return { drag, start }
}

// ───────────────────────── Linha do tempo (dia, 3 dias, semana) ─────────────────────────

function TimeGrid({ days, today, timed, chips, compact, onCreate, onOpen, onToggle, onMove }: {
  days: string[]; today: string; timed: Timed[]; chips: Chip[][]; compact: boolean
  onCreate: (day: string, min: number) => void; onOpen: (e: AgendaEvent) => void; onToggle: (e: AgendaEvent) => void
  onMove: (e: AgendaEvent, start: Date, end: Date) => void
}) {
  const scroll = useRef<HTMLDivElement>(null)
  const cols = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(t) }, [])
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = Math.max(0, (Math.min(minutesOfDay(new Date()), 20 * 60) - 90) / 60 * HOUR) }, [])
  const colW = () => (cols.current?.clientWidth ?? 300) / days.length
  const byKey = Object.fromEntries(timed.map((t) => [t.key, t]))
  const { drag, start } = useDrag(scroll, (key, mode, dx, dy) => {
    const t = byKey[key]
    if (!t) return
    const dmin = snap((dy / HOUR) * 60)
    const dur = t.end - t.start
    if (mode === 'resize') {
      const newEnd = Math.min(24 * 60, Math.max(t.start + 15, t.end + dmin))
      if (newEnd !== t.end) onMove(t.ev, atMinutes(days[t.dayIdx], t.start), atMinutes(days[t.dayIdx], newEnd))
      return
    }
    const dayIdx = Math.min(days.length - 1, Math.max(0, t.dayIdx + Math.round(dx / colW())))
    const ns = Math.min(24 * 60 - dur, Math.max(0, t.start + dmin))
    if (ns !== t.start || dayIdx !== t.dayIdx) onMove(t.ev, atMinutes(days[dayIdx], ns), atMinutes(days[dayIdx], ns + dur))
  }, (key) => { const t = byKey[key]; if (t) onOpen(t.ev) })

  return (
    <div className={'tg' + (compact ? ' compact' : '')}>
      <div className="tg-head">
        <span className="tg-gutter" />
        {days.map((day, i) => {
          const dt = parseYmd(day)
          return (
            <div key={day} className={'tg-dayhead' + (day === today ? ' today' : '')}>
              <span className="wd">{WD[dt.getDay()]}</span><span className="dn">{dt.getDate()}</span>
              <div className="tg-allday">{chips[i].slice(0, compact ? 2 : 4).map((c) => <ChipView key={c.key} c={c} />)}
                {chips[i].length > (compact ? 2 : 4) && <span className="more">+{chips[i].length - (compact ? 2 : 4)}</span>}</div>
            </div>
          )
        })}
      </div>
      <div className="tg-scroll" ref={scroll}>
        <div className="tg-body" style={{ height: 24 * HOUR }}>
          <div className="tg-gutter">{Array.from({ length: 24 }, (_, h) => <span key={h} style={{ top: h * HOUR }}>{h ? `${String(h).padStart(2, '0')}:00` : ''}</span>)}</div>
          <div className="tg-cols" ref={cols}>
            {days.map((day, i) => {
              const items = timed.filter((t) => t.dayIdx === i)
              const lay = layoutColumns(items.map((t) => ({ id: t.key, start: t.start, end: t.end })))
              return (
                <div key={day} className="tg-col" onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  onCreate(day, Math.min(23 * 60, snap(((e.clientY - r.top) / HOUR) * 60, 30)))
                }}>
                  {Array.from({ length: 24 }, (_, h) => <i key={h} className="tg-line" style={{ top: h * HOUR }} />)}
                  {day === today && <i className="tg-now" style={{ top: (minutesOfDay(now) / 60) * HOUR }} />}
                  {items.map((t) => {
                    const L = lay[t.key]
                    const dragging = drag?.key === t.key
                    let top = (t.start / 60) * HOUR, height = Math.max(20, ((t.end - t.start) / 60) * HOUR), shiftX = 0
                    if (dragging && drag.mode === 'move') { top += (snap((drag.dy / HOUR) * 60) / 60) * HOUR; shiftX = Math.round(drag.dx / colW()) * colW() }
                    if (dragging && drag.mode === 'resize') height = Math.max((15 / 60) * HOUR, height + (snap((drag.dy / HOUR) * 60) / 60) * HOUR)
                    const s = new Date(t.ev.start_at), en = new Date(t.ev.end_at)
                    return (
                      <div key={t.key} role="button" tabIndex={0}
                        className={'ev' + (t.ev.done_at ? ' done' : '') + (dragging ? ' dragging' : '') + (t.partner ? ' partner' : '') + (t.ev.impacts_partner && t.partner ? ' impacts' : '')}
                        style={{ top, height, left: `calc(${(L.col / L.cols) * 100}% + 1px)`, width: `calc(${100 / L.cols}% - 3px)`, transform: shiftX ? `translateX(${shiftX}px)` : undefined, ['--c' as string]: t.ev.color }}
                        onPointerDown={(e) => start(e, t.key, 'move', t.editable)} onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') onOpen(t.ev) }}>
                        {t.editable && <button className="ev-check" aria-label={t.ev.done_at ? 'Desmarcar' : 'Marcar como feito'}
                          onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggle(t.ev) }}>{t.ev.done_at && <Icon name="check" size={10} />}</button>}
                        <span className="ev-title">{t.ev.title}</span>
                        {height > 34 && <span className="ev-time">{`${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}–${String(en.getHours()).padStart(2, '0')}:${String(en.getMinutes()).padStart(2, '0')}`}</span>}
                        {t.editable && <span className="ev-resize" aria-hidden="true" onPointerDown={(e) => start(e, t.key, 'resize', true)} />}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChipView({ c }: { c: Chip }) {
  return (
    <div className={'chip-ev' + (c.done ? ' done' : '') + (c.partner ? ' partner' : '')} style={{ ['--c' as string]: c.color }} onClick={(e) => { e.stopPropagation(); c.onOpen() }}>
      {c.onToggle && <button className="ev-check" aria-label="Marcar" onClick={(e) => { e.stopPropagation(); c.onToggle!() }}>{c.done && <Icon name="check" size={10} />}</button>}
      <span>{c.label}</span>
    </div>
  )
}

// ───────────────────────── Mês ─────────────────────────

function MonthView({ anchor, today, selected, onSelect, chipsFor, timedOf, onMoveDay, onOpen, onToggle, onCreate }: {
  anchor: string; today: string; selected: string; onSelect: (d: string) => void
  chipsFor: (d: string) => Chip[]; timedOf: (d: string) => Timed[]
  onMoveDay: (e: AgendaEvent, day: string) => void; onOpen: (e: AgendaEvent) => void; onToggle: (e: AgendaEvent) => void; onCreate: (day: string) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const a = parseYmd(anchor)
  const first = ymd(new Date(a.getFullYear(), a.getMonth(), 1))
  const start = weekStart(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const evByKey: Record<string, AgendaEvent> = {}
  const dayAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest('[data-day]') as HTMLElement | null)?.dataset.day ?? null
  const { drag, start: startDrag } = useDrag(box, (key, _m, _dx, _dy, x, y) => {
    setHover(null)
    const day = dayAt(x, y)
    const e = evByKey[key]
    if (e && day) onMoveDay(e, day)
  }, (key) => { const e = evByKey[key]; if (e) onOpen(e) })
  useEffect(() => {
    if (!drag) return
    const h = (ev: PointerEvent) => setHover(dayAt(ev.clientX, ev.clientY))
    window.addEventListener('pointermove', h)
    return () => window.removeEventListener('pointermove', h)
  }, [drag])

  const sel = [...timedOf(selected).map((t) => ({ t })), ...chipsFor(selected).map((c) => ({ c }))]
  return (
    <>
      <div className="month" ref={box}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => <span key={i} className="month-wd">{w}</span>)}
        {cells.map((day) => {
          const items = [
            ...timedOf(day).sort((x, y) => x.start - y.start).map((t) => ({ key: t.key, label: t.ev.title, color: t.ev.color, done: !!t.ev.done_at, ev: t.ev, editable: t.editable })),
            ...chipsFor(day).map((c) => ({ key: c.key, label: c.label, color: c.color, done: !!c.done, ev: c.ev, editable: !!c.editable })),
          ]
          return (
            <div key={day} data-day={day} className={'month-cell' + (day.slice(0, 7) !== first.slice(0, 7) ? ' out' : '') + (day === today ? ' today' : '') + (day === selected ? ' sel' : '') + (hover === day ? ' drop' : '')}
              onClick={() => onSelect(day)}>
              <span className="mc-n">{parseYmd(day).getDate()}</span>
              {items.slice(0, 3).map((it) => {
                if (it.ev) evByKey[it.key] = it.ev
                return (
                  <span key={it.key} className={'mc-ev' + (it.done ? ' done' : '') + (drag?.key === it.key ? ' dragging' : '')} style={{ ['--c' as string]: it.color }}
                    onPointerDown={(e) => it.ev ? startDrag(e, it.key, 'move', it.editable) : undefined} onClick={(e) => { if (it.ev) e.stopPropagation() }}>{it.label}</span>
                )
              })}
              {items.length > 3 && <span className="mc-more">+{items.length - 3}</span>}
            </div>
          )
        })}
      </div>
      <p className="hint">Segure um compromisso e arraste para outro dia. Toque num dia para ver a lista.</p>
      <section>
        <div className="section-head"><h2>{parseYmd(selected).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          <button className="link" onClick={() => onCreate(selected)}>+ Compromisso</button></div>
        <DayList items={sel} onOpen={onOpen} onToggle={onToggle} />
      </section>
    </>
  )
}

function DayList({ items, onOpen, onToggle }: { items: ({ t: Timed } | { c: Chip })[]; onOpen: (e: AgendaEvent) => void; onToggle: (e: AgendaEvent) => void }) {
  if (!items.length) return <p className="muted pad">Nada neste dia.</p>
  const hhmm = (iso: string) => { const x = new Date(iso); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}` }
  return (
    <div className="list">{items.map((it) => 't' in it ? (
      <div key={it.t.key} className={'card ev-row' + (it.t.ev.done_at ? ' done' : '')} style={{ ['--c' as string]: it.t.ev.color }}>
        {it.t.editable && <button className="ev-check big" aria-label="Marcar como feito" onClick={() => onToggle(it.t.ev)}>{it.t.ev.done_at && <Icon name="check" size={12} />}</button>}
        <button className="grow ev-row-main" onClick={() => onOpen(it.t.ev)}><strong>{it.t.ev.title}</strong>
          <span className="muted small">{hhmm(it.t.ev.start_at)}–{hhmm(it.t.ev.end_at)}{it.t.ev.location ? ` · ${it.t.ev.location}` : ''}{it.t.partner ? ' · do parceiro' : ''}</span></button>
      </div>
    ) : (
      <div key={it.c.key} className={'card ev-row' + (it.c.done ? ' done' : '')} style={{ ['--c' as string]: it.c.color }}>
        {it.c.onToggle && <button className="ev-check big" aria-label="Marcar" onClick={it.c.onToggle}>{it.c.done && <Icon name="check" size={12} />}</button>}
        <button className="grow ev-row-main" onClick={it.c.onOpen}><strong>{it.c.label}</strong><span className="muted small">dia inteiro</span></button>
      </div>
    ))}</div>
  )
}

// ───────────────────────── Lista ─────────────────────────

function ListView({ from, today, chipsFor, timedOf, onOpen, onToggle }: {
  from: string; today: string; chipsFor: (d: string) => Chip[]; timedOf: (d: string) => Timed[]; onOpen: (e: AgendaEvent) => void; onToggle: (e: AgendaEvent) => void
}) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i))
  return (
    <>
      {days.map((day) => {
        const items = [...timedOf(day).sort((a, b) => a.start - b.start).map((t) => ({ t })), ...chipsFor(day).map((c) => ({ c }))]
        if (!items.length) return null
        return (
          <section key={day}>
            <div className="section-head"><h2 className={day === today ? 'today-text' : ''}>{parseYmd(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</h2></div>
            <DayList items={items} onOpen={onOpen} onToggle={onToggle} />
          </section>
        )
      })}
      <p className="muted pad small">Próximos 14 dias. Use as setas para avançar.</p>
    </>
  )
}
