import { useState } from 'react'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { CategoryPicker, Confirm, Dot, Empty, ScopeBadge, ScopePicker, Sheet } from '../components/ui'
import { useData } from '../lib/data'
import { applyFilters, EMPTY_FILTERS, type Filters } from '../lib/filters'
import type { Note, Scope } from '../lib/types'
import { fmtDate, todayISO } from '../lib/util'

const STATUSES = [{ id: 'aberta', label: 'Abertas' }, { id: 'concluida', label: 'Concluídas' }]

export function NotesList({ notes, onOpen }: { notes: Note[]; onOpen: (n: Note) => void }) {
  const { categories, update } = useData()
  return (
    <div className="list">
      {notes.map((n) => {
        const cat = categories.find((c) => c.id === n.category_id)
        const late = n.status === 'aberta' && n.date && n.date < todayISO()
        return (
          <div key={n.id} className={'card note' + (n.status === 'concluida' ? ' done' : '')}>
            <button className={'check' + (n.status === 'concluida' ? ' on' : '')} aria-label={n.status === 'concluida' ? 'Reabrir' : 'Concluir'}
              onClick={() => update('notes', n.id, { status: n.status === 'concluida' ? 'aberta' : 'concluida' })}>
              <Icon name="check" size={16} />
            </button>
            <button className="note-main" onClick={() => onOpen(n)}>
              <span className="note-title">{n.pinned && <Icon name="pin" size={14} />} {n.title}</span>
              {n.body && <span className="note-body">{n.body}</span>}
              <span className="meta">
                <ScopeBadge scope={n.scope} ownerId={n.owner_id} />
                {cat && <span className="badge" style={{ ['--c' as string]: cat.color }}><Dot color={cat.color} />{cat.name}</span>}
                {n.date && <span className={'badge' + (late ? ' late' : '')}><Icon name="calendar" size={12} />{fmtDate(n.date)}</span>}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function Notas() {
  const { notes, categories, me } = useData()
  const [f, setF] = useState<Filters>(EMPTY_FILTERS)
  const [edit, setEdit] = useState<Note | 'new' | null>(null)
  const rows = applyFilters(notes, f, me!.id, categories, (n) => `${n.title} ${n.body}`)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.status === b.status ? 0 : a.status === 'aberta' ? -1 : 1) ||
      (a.date ?? '9999').localeCompare(b.date ?? '9999') || b.updated_at.localeCompare(a.updated_at))
  return (
    <>
      <FilterBar module="notas" value={f} onChange={setF} statuses={STATUSES} dates />
      {rows.length ? <NotesList notes={rows} onOpen={setEdit} /> : (
        <Empty icon="note" title={notes.length ? 'Nada com esses filtros' : 'Nenhuma nota ainda'}
          text={notes.length ? 'Mude ou limpe os filtros.' : 'Notas servem de bloco de anotações e para testar o que cada um vê.'}
          action={<button className="btn primary" onClick={() => setEdit('new')}>Nova nota</button>} />
      )}
      <button className="fab" onClick={() => setEdit('new')} aria-label="Nova nota"><Icon name="plus" size={26} /></button>
      {edit && <NoteEditor note={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  )
}

export function NoteEditor({ note, onClose, preset }: { note: Note | null; onClose: () => void; preset?: Partial<Note> }) {
  const { me, insert, update, remove } = useData()
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [date, setDate] = useState(note?.date ?? preset?.date ?? '')
  const [scope, setScope] = useState<Scope>(note?.scope ?? preset?.scope ?? 'pessoal')
  const [cat, setCat] = useState<string | null>(note?.category_id ?? null)
  const [pinned, setPinned] = useState(note?.pinned ?? false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [busy, setBusy] = useState(false)
  const ownerId = note?.owner_id ?? me!.id
  const mine = ownerId === me!.id

  const save = async () => {
    setBusy(true)
    const row = { title: title.trim(), body, date: date || null, scope, category_id: cat, pinned }
    const r = note ? await update('notes', note.id, row) : await insert('notes', row)
    setBusy(false)
    if (r) onClose()
  }
  const changeScope = (s: Scope) => { setScope(s); if (s === 'casal') setCat(null) }

  return (
    <Sheet title={note ? 'Editar nota' : 'Nova nota'} onClose={onClose} footer={<>
      {note && <button className="icon-btn" aria-label="Arquivar" title={note.archived_at ? 'Desarquivar' : 'Arquivar'}
        onClick={async () => { if (await update('notes', note.id, { archived_at: note.archived_at ? null : new Date().toISOString() })) onClose() }}>
        <Icon name="archive" /></button>}
      {note && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>}
      <span className="grow" />
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!title.trim() || busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button>
    </>}>
      <label className="field">
        <span className="label">Título</span>
        <input autoFocus={!note} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Ligar para a pediatra" />
      </label>
      <label className="field">
        <span className="label">Detalhes</span>
        <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <label className="field">
        <span className="label">Data (opcional)</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <ScopePicker value={scope} onChange={changeScope} disabled={!mine} />
      <CategoryPicker module="notas" value={cat} onChange={setCat} scope={scope} ownerId={ownerId} />
      <label className="toggle"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />Fixar no topo e em Hoje</label>
      {confirmDel && note && <Confirm title="Excluir nota?" message={<>“{note.title}” será apagada para sempre. Se quiser só tirar da frente, use <b>Arquivar</b>.</>}
        onConfirm={async () => { if (await remove('notes', note.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}
