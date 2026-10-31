import { useState } from 'react'
import { useData } from '../lib/data'
import { activeCount, EMPTY_FILTERS, sanitize, type Filters } from '../lib/filters'
import type { Scope } from '../lib/types'
import { Icon } from './Icon'
import { CategoryChip, Confirm, Segmented, Sheet, useModuleCategories } from './ui'

interface Props {
  module: string
  value: Filters
  onChange: (f: Filters) => void
  statuses?: { id: string; label: string }[]
  dates?: boolean
  hideScope?: boolean
}

export function FilterBar({ module, value, onChange, statuses, dates, hideScope }: Props) {
  const { saved_views, insert, remove, toast } = useData()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  const cats = useModuleCategories(module)
  const views = saved_views.filter((v) => v.module === module && !v.archived_at).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const n = activeCount(value)
  const set = (p: Partial<Filters>) => onChange({ ...value, ...p })
  const toggleCat = (id: string) => set({ categories: value.categories.includes(id) ? value.categories.filter((x) => x !== id) : [...value.categories, id] })
  const same = (f: Record<string, unknown>) => JSON.stringify(sanitize(f)) === JSON.stringify({ ...value, q: '' })

  return (
    <div className="filterbar">
      <div className="searchrow">
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Buscar" value={value.q} onChange={(e) => set({ q: e.target.value })} aria-label="Buscar" />
        </label>
        <button className={'icon-btn boxed' + (n ? ' active' : '')} onClick={() => setOpen(true)} aria-label="Filtros">
          <Icon name="filter" />{n > 0 && <span className="count">{n}</span>}
        </button>
      </div>
      <div className="chips scroll">
        {!hideScope && <Segmented value={value.scope} onChange={(s) => set({ scope: s })}
          options={[{ id: 'todos', label: 'Tudo' }, { id: 'meus', label: 'Só meus' }, { id: 'casal', label: 'Casal' }]} />}
        {views.map((v) => (
          <button key={v.id} className={'chip' + (same(v.filters) ? ' on' : '')} onClick={() => onChange({ ...sanitize(v.filters), q: value.q })}>
            <Icon name="bookmark" size={14} />{v.name}
          </button>
        ))}
        {n > 0 && <button className="chip ghost" onClick={() => onChange({ ...EMPTY_FILTERS, q: value.q })}>Limpar</button>}
      </div>

      {open && (
        <Sheet title="Filtros" onClose={() => setOpen(false)} footer={<>
          <button className="btn" onClick={() => setSaving(true)} disabled={!n}>Salvar visualização</button>
          <button className="btn primary" onClick={() => setOpen(false)}>Ver resultados</button>
        </>}>
          {!hideScope && <div className="field">
            <span className="label">Quem vê</span>
            <Segmented value={value.scope} onChange={(s) => set({ scope: s })}
              options={[{ id: 'todos', label: 'Tudo' }, { id: 'meus', label: 'Só meus' }, { id: 'casal', label: 'Casal' }]} />
          </div>}
          <div className="field">
            <span className="label">Categorias {value.categories.length > 0 && `(${value.categories.length})`}</span>
            <div className="chips wrap">
              {cats.map((c) => <CategoryChip key={c.id} cat={c} on={value.categories.includes(c.id)} onClick={() => toggleCat(c.id)} />)}
              {!cats.length && <span className="hint">Sem categorias neste módulo.</span>}
            </div>
            <span className="hint">Escolher uma categoria inclui as subcategorias dela.</span>
          </div>
          {dates && (
            <div className="field">
              <span className="label">Período</span>
              <div className="row2">
                <input type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} aria-label="De" />
                <input type="date" value={value.to} onChange={(e) => set({ to: e.target.value })} aria-label="Até" />
              </div>
            </div>
          )}
          {statuses && (
            <div className="field">
              <span className="label">Status</span>
              <Segmented value={value.status} onChange={(s) => set({ status: s })} options={[{ id: 'todos', label: 'Todos' }, ...statuses]} />
            </div>
          )}
          <label className="toggle">
            <input type="checkbox" checked={value.archived} onChange={(e) => set({ archived: e.target.checked })} />
            Mostrar só arquivados
          </label>
          {views.length > 0 && (
            <div className="field">
              <span className="label">Visualizações salvas</span>
              <div className="list compact">
                {views.map((v) => (
                  <div key={v.id} className="list-row">
                    <span className="grow"><Icon name="bookmark" size={14} /> {v.name} {v.scope === 'casal' && <span className="badge casal">Casal</span>}</span>
                    <button className="icon-btn" aria-label={`Excluir ${v.name}`} onClick={() => setDelId(v.id)}><Icon name="trash" size={18} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Sheet>
      )}
      {saving && <SaveView onClose={() => setSaving(false)} onSave={async (name, scope) => {
        const r = await insert('saved_views', { module, name, scope, filters: { ...value, q: '' } as unknown as Record<string, unknown>, position: views.length })
        if (r) { toast('Visualização salva.'); setSaving(false) }
      }} />}
      {delId && <Confirm title="Excluir visualização?" message="Os itens não são afetados, só o atalho de filtro."
        onConfirm={() => remove('saved_views', delId)} onClose={() => setDelId(null)} />}
    </div>
  )
}

function SaveView({ onSave, onClose }: { onSave: (name: string, scope: Scope) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<Scope>('pessoal')
  return (
    <Sheet title="Salvar visualização" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!name.trim()} onClick={() => onSave(name.trim(), scope)}>Salvar</button>
    </>}>
      <label className="field">
        <span className="label">Nome</span>
        <input autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pendências do casal" />
      </label>
      <div className="field">
        <span className="label">Quem usa</span>
        <Segmented value={scope} onChange={setScope} options={[{ id: 'pessoal', label: 'Só eu' }, { id: 'casal', label: 'Casal' }]} />
      </div>
    </Sheet>
  )
}
