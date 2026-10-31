import { useState } from 'react'
import { Icon } from '../components/Icon'
import { CategoryPicker, Segmented, Sheet } from '../components/ui'
import { addDays, seriesDays, ymd, type Rule } from '../lib/agenda'
import { useData } from '../lib/data'
import { sb, friendly } from '../lib/supabase'
import type { AgendaEvent } from '../lib/types'

const hm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const toDate = (day: string, time: string) => { const [y, m, d] = day.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(y, m - 1, d, h || 0, mi || 0) }
const REMINDERS = [{ v: 0, l: 'Na hora' }, { v: 10, l: '10 min' }, { v: 30, l: '30 min' }, { v: 60, l: '1 h' }, { v: 1440, l: '1 dia' }]
const RULES: { id: 'nao' | Rule; label: string }[] = [{ id: 'nao', label: 'Não repete' }, { id: 'diario', label: 'Todo dia' }, { id: 'semanal', label: 'Toda semana' }, { id: 'mensal', label: 'Todo mês' }, { id: 'anual', label: 'Todo ano' }]

export interface EventDraft { day: string; startMin?: number; durMin?: number; allDay?: boolean }

export function EventEditor({ ev, draft, onClose }: { ev: AgendaEvent | null; draft?: EventDraft; onClose: () => void }) {
  const { me, partner, profiles, insert, insertMany, update, remove, reload, toast } = useData()
  const meId = me!.id
  const editable = !ev || ev.context === 'casal' || ev.owner_id === meId
  const s0 = ev ? new Date(ev.start_at) : (() => { const d = toDate(draft?.day ?? ymd(new Date()), '00:00'); d.setMinutes(draft?.startMin ?? 9 * 60); return d })()
  const e0 = ev ? new Date(ev.end_at) : new Date(s0.getTime() + (draft?.durMin ?? 60) * 60000)
  const [title, setTitle] = useState(ev?.title ?? '')
  const [context, setContext] = useState<'pf' | 'casal'>(ev?.context ?? 'pf')
  const [allDay, setAllDay] = useState(ev?.all_day ?? draft?.allDay ?? false)
  const [startDay, setStartDay] = useState(ymd(s0))
  const [startTime, setStartTime] = useState(hm(s0))
  const [endDay, setEndDay] = useState(ymd(ev?.all_day ? new Date(e0.getTime() - 1) : e0))
  const [endTime, setEndTime] = useState(hm(e0))
  const [category, setCategory] = useState<string | null>(ev?.category_id ?? null)
  const [location, setLocation] = useState(ev?.location ?? '')
  const [notes, setNotes] = useState(ev?.notes ?? '')
  const [impacts, setImpacts] = useState(ev?.impacts_partner ?? false)
  const [nature, setNature] = useState<'pessoal' | 'trabalho'>(ev?.nature ?? 'pessoal')
  const [reminders, setReminders] = useState<number[]>(ev?.reminders ?? [30])
  const [rule, setRule] = useState<'nao' | Rule>(ev?.series_rule ?? 'nao')
  const [done, setDone] = useState(Boolean(ev?.done_at))
  const [busy, setBusy] = useState(false)
  const [askScope, setAskScope] = useState<null | 'save' | 'delete'>(null)
  const owner = profiles.find((p) => p.id === ev?.owner_id)

  const start = allDay ? toDate(startDay, '00:00') : toDate(startDay, startTime)
  const end = allDay ? toDate(addDays(endDay, 1), '00:00') : toDate(endDay, endTime)
  const valid = title.trim() !== '' && end > start
  const durMs = end.getTime() - start.getTime()

  const rowFor = (dayStart: Date) => ({
    title: title.trim(), context, all_day: allDay, start_at: dayStart.toISOString(), end_at: new Date(dayStart.getTime() + durMs).toISOString(),
    category_id: category, location: location.trim(), notes, impacts_partner: context === 'pf' && impacts, reminders, nature,
    done_at: done ? ev?.done_at ?? new Date().toISOString() : null,
  })

  const createSeries = async (from: Date, r: Rule) => {
    const sid = crypto.randomUUID()
    const days = seriesDays(ymd(from), r)
    const rows = days.map((d) => { const x = toDate(d, '00:00'); x.setHours(from.getHours(), from.getMinutes()); return { ...rowFor(x), series_id: sid, series_rule: r, done_at: null } })
    return insertMany('events', rows)
  }

  const save = async (scope: 'one' | 'following' = 'one') => {
    if (!valid) return
    setBusy(true)
    let ok = false
    if (!ev) ok = !!(rule === 'nao' ? await insert('events', rowFor(start)) : await createSeries(start, rule))
    else if (scope === 'following' && ev.series_id) {
      // "Este e os próximos": refaz a série a partir deste compromisso com os dados novos.
      const { error } = await sb.from('events').delete().eq('series_id', ev.series_id).gte('start_at', ev.start_at)
      if (error) toast(friendly(error.message))
      else { ok = rule === 'nao' ? !!(await insert('events', rowFor(start))) : !!(await createSeries(start, rule)); await reload() }
    } else ok = !!(await update('events', ev.id, rowFor(start)))
    setBusy(false)
    if (ok) { toast('Compromisso salvo.'); onClose() }
  }
  const del = async (scope: 'one' | 'following') => {
    if (!ev) return
    if (scope === 'following' && ev.series_id) {
      const { error } = await sb.from('events').delete().eq('series_id', ev.series_id).gte('start_at', ev.start_at)
      if (error) return toast(friendly(error.message))
      await reload()
    } else if (!(await remove('events', ev.id))) return
    toast('Compromisso excluído.'); onClose()
  }

  return (
    <Sheet title={ev ? (editable ? 'Editar compromisso' : 'Compromisso') : 'Novo compromisso'} onClose={onClose} footer={<>
      {ev && editable && <button className="icon-btn danger" aria-label="Excluir" onClick={() => ev.series_id ? setAskScope('delete') : del('one')}><Icon name="trash" /></button>}
      <span className="grow" />
      <button className="btn" onClick={onClose}>{editable ? 'Cancelar' : 'Fechar'}</button>
      {editable && <button className="btn primary" disabled={!valid || busy} onClick={() => ev?.series_id ? setAskScope('save') : save()}>{busy ? 'Salvando…' : 'Salvar'}</button>}
    </>}>
      {!editable && <p className="card info">Compromisso de {owner?.display_name}. Você vê, mas só {owner?.display_name} edita.</p>}
      <fieldset disabled={!editable} className="plain">
        <input className="title-input" autoFocus={!ev} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do compromisso" aria-label="Título" />
        <div className="field"><span className="label">Agenda</span>
          <Segmented value={context} disabled={!!ev && ev.owner_id !== meId} onChange={(c) => { setContext(c); setCategory(null) }} options={[{ id: 'pf', label: me!.display_name }, { id: 'casal', label: 'Casal' }]} /></div>
        <div className="field"><span className="label">Tipo</span>
          <Segmented value={nature} onChange={setNature} options={[{ id: 'pessoal', label: 'Pessoal' }, { id: 'trabalho', label: 'Trabalho' }]} /></div>
        <label className="toggle"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />Dia inteiro</label>
        <div className="row2">
          <label className="field"><span className="label">Início</span><input type="date" value={startDay} onChange={(e) => { const d = e.target.value; setStartDay(d); if (d > endDay) setEndDay(d) }} /></label>
          {!allDay && <label className="field"><span className="label">&nbsp;</span><input type="time" step={900} value={startTime} onChange={(e) => {
            const old = toDate(startDay, startTime), nw = toDate(startDay, e.target.value)
            const ne = new Date(toDate(endDay, endTime).getTime() + (nw.getTime() - old.getTime()))
            setStartTime(e.target.value); setEndDay(ymd(ne)); setEndTime(hm(ne))
          }} /></label>}
        </div>
        <div className="row2">
          <label className="field"><span className="label">Término</span><input type="date" value={endDay} onChange={(e) => setEndDay(e.target.value)} /></label>
          {!allDay && <label className="field"><span className="label">&nbsp;</span><input type="time" step={900} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>}
        </div>
        {!valid && title.trim() && <span className="hint err">O término precisa ser depois do início.</span>}
        <CategoryPicker module="agenda" value={category} onChange={setCategory} scope={context === 'casal' ? 'casal' : 'pessoal'} ownerId={ev?.owner_id ?? meId} />
        <span className="hint">A cor do compromisso é a da categoria. Crie e colora categorias em Mais → Categorias → Agenda.</span>
        {(!ev || ev.series_id) && <label className="field"><span className="label">Repetir</span>
          <select value={rule} onChange={(e) => setRule(e.target.value as 'nao' | Rule)}>{RULES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label>}
        {context === 'pf' && partner && <label className="toggle"><input type="checkbox" checked={impacts} onChange={(e) => setImpacts(e.target.checked)} />Afeta {partner.display_name} (destaca na agenda dele)</label>}
        <div className="field"><span className="label">Lembrar</span>
          <div className="chips wrap">{REMINDERS.map((r) => (
            <button key={r.v} type="button" className={'chip' + (reminders.includes(r.v) ? ' on' : '')}
              onClick={() => setReminders(reminders.includes(r.v) ? reminders.filter((x) => x !== r.v) : [...reminders, r.v].sort((a, b) => a - b))}>{r.l}</button>))}</div>
          <span className="hint">As notificações no celular chegam na Fase 4B; os horários já ficam guardados.</span></div>
        <label className="field"><span className="label">Local</span><input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
        <label className="field"><span className="label">Observações</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {ev && <label className="toggle"><input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />Feito</label>}
      </fieldset>
      {askScope && (
        <Sheet title={askScope === 'save' ? 'Salvar compromisso repetido' : 'Excluir compromisso repetido'} onClose={() => setAskScope(null)} footer={<>
          <button className="btn" onClick={() => setAskScope(null)}>Cancelar</button>
          <button className="btn" onClick={() => { setAskScope(null); askScope === 'save' ? save('one') : del('one') }}>Só este</button>
          <button className={'btn ' + (askScope === 'save' ? 'primary' : 'danger')} onClick={() => { setAskScope(null); askScope === 'save' ? save('following') : del('following') }}>Este e os próximos</button>
        </>}><p>Este compromisso se repete. A mudança vale só para ele ou também para os próximos?</p></Sheet>
      )}
    </Sheet>
  )
}

export function ReminderEditor({ onClose }: { onClose: () => void }) {
  const { partner, insert, toast } = useData()
  const now = new Date(); now.setMinutes(0); now.setHours(now.getHours() + 1)
  const [text, setText] = useState('')
  const [day, setDay] = useState(ymd(now))
  const [time, setTime] = useState(hm(now))
  if (!partner) return <Sheet title="Lembrete" onClose={onClose}><p>Seu parceiro ainda não entrou no app.</p></Sheet>
  return (
    <Sheet title={`Lembrete para ${partner.display_name}`} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!text.trim()} onClick={async () => {
        if (await insert('partner_reminders', { to_id: partner.id, text: text.trim(), remind_at: toDate(day, time).toISOString() })) { toast(`Lembrete enviado para ${partner.display_name}.`); onClose() }
      }}>Enviar</button></>}>
      <label className="field"><span className="label">Lembrar de</span><input autoFocus maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: comprar pão na volta" /></label>
      <div className="row2">
        <label className="field"><span className="label">Dia</span><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        <label className="field"><span className="label">Hora</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
      </div>
      <p className="hint">Aparece no Hoje e na Agenda de {partner.display_name}. Na Fase 4B, chega também como notificação.</p>
    </Sheet>
  )
}
