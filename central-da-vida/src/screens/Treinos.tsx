import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { CategoryChip, ColorPicker, Confirm, Empty, Segmented, Sheet, useModuleCategories } from '../components/ui'
import { parseYmd, ymd } from '../lib/agenda'
import { useData } from '../lib/data'
import { norm } from '../lib/food'
import { go } from '../lib/route'
import { sb, friendly } from '../lib/supabase'
import { estimateMinutes, kindLabel, KINDS, loadHistory, suggestListen, workoutsForDay } from '../lib/training'
import type { Exercise, LibraryItem, SessionItem, Workout, WorkoutSession } from '../lib/types'
import { PALETTE } from '../lib/util'
import { compress } from './Alimentacao'

type Tab = 'hoje' | 'fichas' | 'historico' | 'biblioteca'
const WD = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const STATUS: { id: LibraryItem['status']; label: string }[] = [{ id: 'quero', label: 'Quero ver/ouvir' }, { id: 'andamento', label: 'Em andamento' }, { id: 'concluido', label: 'Concluído' }]
const kg = (n: number | null | undefined) => (n == null ? '' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`)
const sets = (e: { sets: number | null; reps: string; duration_sec: number | null }) => [e.sets ? `${e.sets}×` : '', e.duration_sec ? `${e.duration_sec >= 60 ? `${Math.round(e.duration_sec / 60)} min` : `${e.duration_sec} s`}` : e.reps].join('')

export function Treinos({ tab: tabArg }: { tab: string }) {
  const tab = (['hoje', 'fichas', 'historico', 'biblioteca'].includes(tabArg) ? tabArg : 'hoje') as Tab
  const { me, partner } = useData()
  const [who, setWho] = useState(me!.id)
  return (
    <>
      <div className="chips scroll">
        <Segmented value={tab} onChange={(t) => go('treinos', t)} options={[{ id: 'hoje', label: 'Hoje' }, { id: 'fichas', label: 'Fichas' }, { id: 'historico', label: 'Histórico' }, { id: 'biblioteca', label: 'Biblioteca' }]} />
      </div>
      {tab !== 'hoje' && partner && <div className="chips">
        <Segmented value={who} onChange={setWho} options={[{ id: me!.id, label: me!.display_name }, { id: partner.id, label: `${partner.display_name} (só ver)` }]} />
      </div>}
      {tab === 'hoje' && <Hoje />}
      {tab === 'fichas' && <Fichas who={who} />}
      {tab === 'historico' && <Historico who={who} />}
      {tab === 'biblioteca' && <Biblioteca who={who} />}
    </>
  )
}

// ───────────────────────── Treino de hoje ─────────────────────────

interface Progress { workoutId: string; date: string; items: SessionItem[] }
const PKEY = 'cdv-treino-em-andamento'
const loadProgress = (): Progress | null => { try { return JSON.parse(localStorage.getItem(PKEY) ?? 'null') } catch { return null } }
const saveProgress = (p: Progress | null) => { try { if (p) localStorage.setItem(PKEY, JSON.stringify(p)); else localStorage.removeItem(PKEY) } catch { /* sem armazenamento */ } }

function Hoje() {
  const { me, workouts, exercises, workout_sessions, library_items, insert, update, toast } = useData()
  const today = ymd(new Date())
  const dow = parseYmd(today).getDay()
  const mine = workouts.filter((w) => w.owner_id === me!.id)
  const todays = workoutsForDay(mine, dow)
  const [chosen, setChosen] = useState<string>(() => loadProgress()?.workoutId ?? todays[0]?.id ?? '')
  const [prog, setProg] = useState<Progress | null>(() => { const p = loadProgress(); return p && p.date === today ? p : null })
  useEffect(() => saveProgress(prog), [prog])
  const w = mine.find((x) => x.id === chosen)
  const exs = exercises.filter((e) => e.workout_id === chosen && !e.archived_at).sort((a, b) => a.position - b.position)
  const mySessions = workout_sessions.filter((s) => s.owner_id === me!.id)
  const doneToday = mySessions.filter((s) => s.date === today)
  const minutes = estimateMinutes(exs)
  const listen = suggestListen(library_items.filter((i) => i.owner_id === me!.id), minutes)
  const start = () => setProg({ workoutId: chosen, date: today, items: exs.map((e) => ({ exercise_id: e.id, name: e.name, sets: e.sets, reps: e.reps, load_kg: loadHistory(mySessions, e.name)[0]?.load ?? e.load_kg, done: false })) })
  const setItem = (i: number, patch: Partial<SessionItem>) => prog && setProg({ ...prog, items: prog.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  const finish = async () => {
    if (!prog || !w) return
    if (await insert('workout_sessions', { workout_id: w.id, workout_name: w.name, date: today, minutes, items: prog.items })) {
      setProg(null); toast('Treino concluído! 💪')
    }
  }
  return (
    <>
      {doneToday.length > 0 && <p className="card info">✅ Hoje você já concluiu: {doneToday.map((s) => s.workout_name).join(', ')}.</p>}
      {!mine.length ? <Empty icon="dumbbell" title="Nenhuma ficha ainda" text="Crie suas fichas (ex.: Treino A – Pernas) com os dias da semana e os exercícios." action={<button className="btn primary" onClick={() => go('treinos', 'fichas')}>Criar ficha</button>} /> : <>
        <div className="chips scroll">{(todays.length ? todays : mine).map((x) => (
          <button key={x.id} className={'chip' + (x.id === chosen ? ' on' : '')} disabled={!!prog} onClick={() => setChosen(x.id)}><span className="dot" style={{ background: x.color }} />{x.name}</button>
        ))}</div>
        {!todays.length && <p className="hint pad">Nenhuma ficha marcada para hoje; escolha qual vai fazer.</p>}
        {w && <section className="card workout-today" style={{ ['--c' as string]: w.color }}>
          <div className="section-head"><h2>{w.name}</h2><span className="muted small">~{minutes} min · {exs.length} exercícios</span></div>
          {(prog ? prog.items : exs.map((e) => ({ exercise_id: e.id, name: e.name, sets: e.sets, reps: e.reps, load_kg: loadHistory(mySessions, e.name)[0]?.load ?? e.load_kg, done: false }))).map((it, i) => {
            const ex = exs.find((e) => e.id === it.exercise_id)
            const hist = loadHistory(mySessions, it.name)
            return (
              <div key={i} className={'ex-row' + (it.done ? ' done' : '')}>
                {prog && <button className="ev-check big" aria-label="Feito" onClick={() => setItem(i, { done: !it.done })}>{it.done && <Icon name="check" size={12} />}</button>}
                <span className="grow ex-main"><strong>{it.name}</strong>
                  <span className="muted small">{ex ? sets(ex) : it.reps}{ex?.rest_sec ? ` · descanso ${ex.rest_sec}s` : ''}{hist[0] ? ` · última: ${kg(hist[0].load)}` : ''}</span>
                  {ex?.notes && <span className="muted small">{ex.notes}</span>}</span>
                {prog && <input className="qty-input" inputMode="decimal" aria-label={`Carga de ${it.name}`} placeholder="kg" value={it.load_kg ?? ''} onChange={(e) => setItem(i, { load_kg: e.target.value.trim() ? Number(e.target.value.replace(',', '.')) : null })} />}
                {ex?.demo_url && <a className="icon-btn" href={ex.demo_url} target="_blank" rel="noreferrer" aria-label="Ver demonstração"><Icon name="right" size={18} /></a>}
              </div>
            )
          })}
          {!exs.length && <p className="muted small">Esta ficha ainda não tem exercícios.</p>}
          {exs.length > 0 && (prog
            ? <div className="row2"><button className="btn" onClick={() => setProg(null)}>Cancelar</button><button className="btn primary" onClick={finish}>Concluir treino</button></div>
            : <button className="btn primary wide" onClick={start}>Começar treino</button>)}
        </section>}
        <section>
          <div className="section-head"><h2>🎧 O que ouvir hoje</h2><button className="link" onClick={() => go('treinos', 'biblioteca')}>Biblioteca</button></div>
          {listen.length ? <div className="list">{listen.map((i) => (
            <div key={i.id} className="card lib-row">
              <span className="grow lib-main"><strong>{i.title}</strong><span className="muted small">{kindLabel(i.kind)}{i.duration_min ? ` · ${i.duration_min} min` : ''}{i.status === 'andamento' ? ' · continuar' : ''}</span></span>
              {i.status !== 'andamento' && <button className="btn small" onClick={() => update('library_items', i.id, { status: 'andamento' })}>Começar</button>}
              {i.url && <a className="btn small primary" href={i.url} target="_blank" rel="noreferrer">Abrir</a>}
            </div>
          ))}</div> : <p className="muted pad">Adicione podcasts, playlists ou audiolivros na sua biblioteca para receber sugestões.</p>}
        </section>
      </>}
    </>
  )
}

// ───────────────────────── Fichas ─────────────────────────

function Fichas({ who }: { who: string }) {
  const { me, workouts, exercises } = useData()
  const mine = who === me!.id
  const [edit, setEdit] = useState<Workout | 'new' | null>(null)
  const list = workouts.filter((w) => w.owner_id === who && !w.archived_at).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  return (
    <>
      {list.length ? <div className="list">{list.map((w) => {
        const exs = exercises.filter((e) => e.workout_id === w.id && !e.archived_at).sort((a, b) => a.position - b.position)
        return (
          <button key={w.id} className="card workout-card" style={{ ['--c' as string]: w.color }} onClick={() => setEdit(w)}>
            <span className="section-head"><strong>{w.name}</strong><span className="muted small">{w.week_days.length ? w.week_days.slice().sort().map((d) => WD[d]).join(' ') : 'sem dia fixo'} · ~{estimateMinutes(exs)} min</span></span>
            <span className="muted small">{exs.map((e) => `${e.name} ${sets(e)}${e.load_kg != null ? ` ${kg(e.load_kg)}` : ''}`).join(' · ') || 'Sem exercícios'}</span>
          </button>
        )
      })}</div> : <Empty icon="dumbbell" title={mine ? 'Nenhuma ficha' : 'Nenhuma ficha cadastrada'} text={mine ? 'Monte suas fichas com dias da semana e exercícios.' : undefined} />}
      {mine && <button className="fab" aria-label="Nova ficha" onClick={() => setEdit('new')}><Icon name="plus" size={26} /></button>}
      {edit && <WorkoutEditor w={edit === 'new' ? null : edit} readOnly={!mine} onClose={() => setEdit(null)} />}
    </>
  )
}

interface ExDraft { id?: string; name: string; sets: string; reps: string; duration: string; load: string; rest: string; notes: string; demo_url: string; photo_url: string }
const toDraft = (e: Exercise): ExDraft => ({ id: e.id, name: e.name, sets: e.sets?.toString() ?? '', reps: e.reps, duration: e.duration_sec?.toString() ?? '', load: e.load_kg?.toString().replace('.', ',') ?? '', rest: e.rest_sec?.toString() ?? '', notes: e.notes, demo_url: e.demo_url, photo_url: e.photo_url })
const numOr = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null)

function WorkoutEditor({ w, readOnly, onClose }: { w: Workout | null; readOnly: boolean; onClose: () => void }) {
  const { me, exercises, insert, update, remove, toast } = useData()
  const [name, setName] = useState(w?.name ?? '')
  const [days, setDays] = useState<number[]>(w?.week_days ?? [])
  const [color, setColor] = useState(w?.color ?? PALETTE[2])
  const [notes, setNotes] = useState(w?.notes ?? '')
  const existing = w ? exercises.filter((e) => e.workout_id === w.id && !e.archived_at).sort((a, b) => a.position - b.position) : []
  const [exs, setExs] = useState<ExDraft[]>(existing.map(toDraft))
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const set = (i: number, p: Partial<ExDraft>) => setExs(exs.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= exs.length) return; const c = exs.slice(); [c[i], c[j]] = [c[j], c[i]]; setExs(c) }
  const upload = async (i: number, f: File) => {
    setUploading(i)
    const blob = await compress(f).catch(() => f)
    const path = `${me!.household_id}/treino-${crypto.randomUUID()}.jpg`
    const { error } = await sb.storage.from('receitas').upload(path, blob, { contentType: 'image/jpeg' })
    setUploading(null)
    if (error) return toast(friendly(error.message))
    set(i, { photo_url: sb.storage.from('receitas').getPublicUrl(path).data.publicUrl })
  }
  const save = async () => {
    setBusy(true)
    const row = { name: name.trim(), week_days: days, color, notes }
    const saved = w ? await update('workouts', w.id, row) : await insert('workouts', row)
    if (!saved) { setBusy(false); return }
    const keep = new Set(exs.filter((e) => e.id).map((e) => e.id))
    for (const old of existing) if (!keep.has(old.id)) await remove('exercises', old.id)
    for (const [k, e] of exs.entries()) {
      if (!e.name.trim()) continue
      const r = { workout_id: saved.id, name: e.name.trim(), sets: numOr(e.sets), reps: e.reps.trim(), duration_sec: numOr(e.duration), load_kg: numOr(e.load), rest_sec: numOr(e.rest), notes: e.notes, demo_url: e.demo_url.trim(), photo_url: e.photo_url, position: k }
      if (e.id) await update('exercises', e.id, r); else await insert('exercises', r)
    }
    setBusy(false); toast('Ficha salva.'); onClose()
  }
  return (
    <Sheet title={readOnly ? name : w ? 'Editar ficha' : 'Nova ficha'} onClose={onClose} footer={<>
      {w && !readOnly && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>}
      <span className="grow" /><button className="btn" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
      {!readOnly && <button className="btn primary" disabled={!name.trim() || busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button>}</>}>
      {readOnly && <p className="card info">Ficha de outra pessoa: só para ver.</p>}
      <fieldset disabled={readOnly} className="plain">
        <input className="title-input" autoFocus={!w} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Treino A – Pernas" aria-label="Nome da ficha" />
        <div className="field"><span className="label">Dias da semana</span>
          <div className="chips wrap">{WD.map((d, i) => <button key={i} type="button" className={'chip' + (days.includes(i) ? ' on' : '')} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])}>{d}</button>)}</div></div>
        <div className="field"><span className="label">Exercícios</span>
          {exs.map((e, i) => (
            <div key={i} className="card ex-edit">
              <div className="searchrow"><input value={e.name} onChange={(x) => set(i, { name: x.target.value })} placeholder="Exercício (ex.: Agachamento)" aria-label="Exercício" />
                {!readOnly && <><button type="button" className="icon-btn" aria-label="Subir" onClick={() => move(i, -1)}><Icon name="up" size={16} /></button>
                  <button type="button" className="icon-btn" aria-label="Remover" onClick={() => setExs(exs.filter((_, j) => j !== i))}><Icon name="x" size={16} /></button></>}</div>
              <div className="ex-grid">
                <label><span>Séries</span><input inputMode="numeric" value={e.sets} onChange={(x) => set(i, { sets: x.target.value })} /></label>
                <label><span>Repetições</span><input value={e.reps} onChange={(x) => set(i, { reps: x.target.value })} placeholder="10-12" /></label>
                <label><span>Carga (kg)</span><input inputMode="decimal" value={e.load} onChange={(x) => set(i, { load: x.target.value })} /></label>
                <label><span>Tempo (s)</span><input inputMode="numeric" value={e.duration} onChange={(x) => set(i, { duration: x.target.value })} placeholder="ex.: 45" /></label>
                <label><span>Descanso (s)</span><input inputMode="numeric" value={e.rest} onChange={(x) => set(i, { rest: x.target.value })} placeholder="60" /></label>
              </div>
              <input type="url" value={e.demo_url} onChange={(x) => set(i, { demo_url: x.target.value })} placeholder="Link do vídeo de demonstração (YouTube, Instagram…)" aria-label="Link de demonstração" />
              <input value={e.notes} onChange={(x) => set(i, { notes: x.target.value })} placeholder="Observações (postura, cadência…)" aria-label="Observações" />
              {e.photo_url && <img className="ex-photo" src={e.photo_url} alt="" />}
              {!readOnly && <label className="link small">{uploading === i ? 'Enviando…' : e.photo_url ? 'Trocar foto' : '+ Foto (opcional)'}<input type="file" accept="image/*" hidden onChange={(x) => { const f = x.target.files?.[0]; if (f) upload(i, f) }} /></label>}
              {readOnly && e.demo_url && <a className="btn small" href={e.demo_url} target="_blank" rel="noreferrer">Ver demonstração</a>}
            </div>
          ))}
          {!readOnly && <button type="button" className="btn wide" onClick={() => setExs([...exs, { name: '', sets: '3', reps: '12', duration: '', load: '', rest: '60', notes: '', demo_url: '', photo_url: '' }])}><Icon name="plus" />Adicionar exercício</button>}
        </div>
        <label className="field"><span className="label">Observações da ficha</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <ColorPicker value={color} onChange={setColor} />
      </fieldset>
      {confirmDel && w && <Confirm title="Excluir ficha?" message="Os exercícios saem junto. O histórico de treinos feitos continua." onConfirm={async () => { if (await remove('workouts', w.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}

// ───────────────────────── Histórico ─────────────────────────

function Historico({ who }: { who: string }) {
  const { me, workout_sessions, remove } = useData()
  const [open, setOpen] = useState<WorkoutSession | null>(null)
  const list = workout_sessions.filter((s) => s.owner_id === who && !s.archived_at).sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at))
  const since = ymd(new Date(Date.now() - 29 * 86400000))
  const last30 = list.filter((s) => s.date >= since).length
  const names = [...new Set(list.flatMap((s) => s.items.map((i) => i.name)))].sort()
  const [ex, setEx] = useState('')
  const hist = ex ? loadHistory(list, ex).slice(0, 8).reverse() : []
  const maxLoad = Math.max(1, ...hist.map((h) => h.load))
  return (
    <>
      <div className="grid2">
        <div className="card stat"><span className="muted small">Treinos nos últimos 30 dias</span><strong className="stat-value">{last30}</strong></div>
        <div className="card stat"><span className="muted small">Total registrado</span><strong className="stat-value">{list.length}</strong></div>
      </div>
      {names.length > 0 && <section className="card chart-card">
        <div className="section-head"><h2>Evolução da carga</h2></div>
        <select value={ex} onChange={(e) => setEx(e.target.value)} aria-label="Exercício"><option value="">Escolha um exercício</option>{names.map((n) => <option key={n} value={n}>{n}</option>)}</select>
        {hist.length > 0 && <div className="hbars">{hist.map((h, i) => (
          <div key={i} className="hbar"><span className="hbar-label">{parseYmd(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            <span className="hbar-track"><span className="hbar-fill" style={{ width: `${Math.max(4, (h.load / maxLoad) * 100)}%` }} /></span><span className="hbar-value">{kg(h.load)}</span></div>
        ))}</div>}
        {ex && !hist.length && <p className="muted small">Sem carga registrada para este exercício.</p>}
      </section>}
      {list.length ? <div className="list">{list.slice(0, 60).map((s) => (
        <button key={s.id} className="card list-link" onClick={() => setOpen(s)}>
          <span className="list-icon"><Icon name="dumbbell" /></span>
          <span className="grow"><strong>{s.workout_name || 'Treino'}</strong><span className="muted small">{parseYmd(s.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} · {s.items.filter((i) => i.done).length}/{s.items.length} exercícios{s.minutes ? ` · ~${s.minutes} min` : ''}</span></span>
        </button>
      ))}</div> : <Empty icon="dumbbell" title="Nenhum treino registrado" text="Os treinos concluídos em Hoje aparecem aqui." />}
      {open && <Sheet title={`${open.workout_name} · ${parseYmd(open.date).toLocaleDateString('pt-BR')}`} onClose={() => setOpen(null)} footer={<>
        {open.owner_id === me!.id && <button className="icon-btn danger" aria-label="Excluir" onClick={async () => { if (await remove('workout_sessions', open.id)) setOpen(null) }}><Icon name="trash" /></button>}
        <span className="grow" /><button className="btn primary" onClick={() => setOpen(null)}>Fechar</button></>}>
        <ul className="ing-list">{open.items.map((i, k) => <li key={k} className={i.done ? '' : 'muted'}>{i.done ? '✅' : '⬜'} {i.name} {i.reps && `· ${i.sets ? `${i.sets}×` : ''}${i.reps}`} {i.load_kg != null && `· ${kg(i.load_kg)}`}</li>)}</ul>
      </Sheet>}
    </>
  )
}

// ───────────────────────── Biblioteca ─────────────────────────

function Biblioteca({ who }: { who: string }) {
  const { me, library_items, update } = useData()
  const mine = who === me!.id
  const cats = useModuleCategories('biblioteca')
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('')
  const [status, setStatus] = useState<'' | LibraryItem['status']>('')
  const [cat, setCat] = useState<string | null>(null)
  const [edit, setEdit] = useState<LibraryItem | 'new' | null>(null)
  const list = library_items.filter((i) => i.owner_id === who && !i.archived_at && (!kind || i.kind === kind) && (!status || i.status === status) && (!cat || i.category_id === cat) && norm(`${i.title} ${i.notes}`).includes(norm(q)))
    .sort((a, b) => ({ andamento: 0, quero: 1, concluido: 2 }[a.status] - { andamento: 0, quero: 1, concluido: 2 }[b.status]) || b.created_at.localeCompare(a.created_at))
  const nextStatus = (s: LibraryItem['status']) => (s === 'quero' ? 'andamento' : s === 'andamento' ? 'concluido' : 'quero')
  return (
    <>
      <label className="search"><Icon name="search" size={18} /><input type="search" placeholder="Buscar na biblioteca" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="chips scroll">
        <select className="chip-select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tipo"><option value="">Todos os tipos</option>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
        <select className="chip-select" value={status} onChange={(e) => setStatus(e.target.value as '' | LibraryItem['status'])} aria-label="Status"><option value="">Qualquer status</option>{STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        {cats.map((c) => <CategoryChip key={c.id} cat={c} on={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)} />)}
      </div>
      {list.length ? <div className="list">{list.map((i) => (
        <div key={i.id} className={'card lib-row' + (i.status === 'concluido' ? ' done' : '')}>
          <button className="grow lib-main" onClick={() => setEdit(i)}>
            <strong>{i.title}</strong>
            <span className="muted small">{kindLabel(i.kind)}{i.duration_min ? ` · ${i.duration_min} min` : ''}{i.category_id ? ` · ${cats.find((c) => c.id === i.category_id)?.name ?? ''}` : ''}</span>
          </button>
          {mine ? <button className={'pill st-' + i.status} onClick={() => update('library_items', i.id, { status: nextStatus(i.status) })}>{STATUS.find((s) => s.id === i.status)?.label}</button>
            : <span className={'pill st-' + i.status}>{STATUS.find((s) => s.id === i.status)?.label}</span>}
          {i.url && <a className="icon-btn" href={i.url} target="_blank" rel="noreferrer" aria-label="Abrir"><Icon name="right" size={18} /></a>}
        </div>
      ))}</div> : <Empty icon="bookmark" title={library_items.some((i) => i.owner_id === who) ? 'Nada encontrado' : 'Biblioteca vazia'} text={mine ? 'Guarde links de podcasts, músicas, playlists, vídeos, documentários, séries e audiolivros.' : undefined} />}
      {mine && !cats.length && <p className="hint pad">Crie categorias (aprendizado, entretenimento…) em Mais → Categorias → Biblioteca.</p>}
      {mine && <button className="fab" aria-label="Novo item" onClick={() => setEdit('new')}><Icon name="plus" size={26} /></button>}
      {edit && <LibEditor item={edit === 'new' ? null : edit} readOnly={!mine} onClose={() => setEdit(null)} />}
    </>
  )
}

function LibEditor({ item, readOnly, onClose }: { item: LibraryItem | null; readOnly: boolean; onClose: () => void }) {
  const { insert, update, remove, toast } = useData()
  const cats = useModuleCategories('biblioteca')
  const [title, setTitle] = useState(item?.title ?? '')
  const [kind, setKind] = useState(item?.kind ?? 'podcast')
  const [url, setUrl] = useState(item?.url ?? '')
  const [cat, setCat] = useState<string | null>(item?.category_id ?? null)
  const [status, setStatus] = useState<LibraryItem['status']>(item?.status ?? 'quero')
  const [dur, setDur] = useState(item?.duration_min?.toString() ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const save = async () => {
    const row = { title: title.trim(), kind, url: url.trim(), category_id: cat, status, duration_min: dur.trim() ? Number(dur) : null, notes }
    const r = item ? await update('library_items', item.id, row) : await insert('library_items', row)
    if (r) { toast('Salvo na biblioteca.'); onClose() }
  }
  return (
    <Sheet title={readOnly ? title : item ? 'Editar item' : 'Novo na biblioteca'} onClose={onClose} footer={<>
      {item && !readOnly && <button className="icon-btn danger" aria-label="Excluir" onClick={async () => { if (await remove('library_items', item.id)) onClose() }}><Icon name="trash" /></button>}
      <span className="grow" /><button className="btn" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
      {!readOnly && <button className="btn primary" disabled={!title.trim()} onClick={save}>Salvar</button>}</>}>
      <fieldset disabled={readOnly} className="plain">
        <input className="title-input" autoFocus={!item} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" aria-label="Título" />
        <label className="field"><span className="label">Link</span><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https:// (Spotify, YouTube, Apple Podcasts…)" /></label>
        <div className="row2">
          <label className="field"><span className="label">Tipo</span><select value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
          <label className="field"><span className="label">Duração (min)</span><input type="number" inputMode="numeric" value={dur} onChange={(e) => setDur(e.target.value)} placeholder="opcional" /></label>
        </div>
        <div className="field"><span className="label">Status</span><Segmented value={status} onChange={setStatus} options={STATUS.map((s) => ({ id: s.id, label: s.label }))} /></div>
        <div className="field"><span className="label">Categoria</span><div className="chips wrap">
          <button type="button" className={'chip' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>Nenhuma</button>
          {cats.map((c) => <CategoryChip key={c.id} cat={c} on={cat === c.id} onClick={() => setCat(c.id)} />)}</div></div>
        <label className="field"><span className="label">Notas</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {readOnly && url && <a className="btn wide" href={url} target="_blank" rel="noreferrer">Abrir</a>}
      </fieldset>
    </Sheet>
  )
}
