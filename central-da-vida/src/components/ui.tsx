import { useEffect, type ReactNode } from 'react'
import { useData } from '../lib/data'
import type { Category, Scope } from '../lib/types'
import { PALETTE } from '../lib/util'
import { Icon } from './Icon'

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({ title, message, confirm = 'Excluir', danger = true, onConfirm, onClose }: {
  title: string; message: ReactNode; confirm?: string; danger?: boolean; onConfirm: () => void; onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className={danger ? 'btn danger' : 'btn primary'} onClick={() => { onConfirm(); onClose() }}>{confirm}</button>
    </>}>
      <div className="confirm-msg">{message}</div>
    </Sheet>
  )
}

export function Segmented<T extends string>({ value, options, onChange, disabled }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; disabled?: boolean
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''}
          disabled={disabled} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

export function ScopePicker({ value, onChange, disabled }: { value: Scope; onChange: (s: Scope) => void; disabled?: boolean }) {
  const { partner } = useData()
  return (
    <div className="field">
      <span className="label">Quem vê</span>
      <Segmented value={value} onChange={onChange} disabled={disabled}
        options={[{ id: 'pessoal', label: 'Só eu' }, { id: 'casal', label: 'Casal' }]} />
      <span className="hint">
        {disabled ? 'Só quem criou pode mudar a visibilidade.'
          : value === 'casal' ? `Você e ${partner?.display_name ?? 'seu parceiro'} veem e editam.` : 'Ninguém além de você vê.'}
      </span>
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="field">
      <span className="label">Cor</span>
      <div className="swatches">
        {PALETTE.map((c) => (
          <button key={c} className={'swatch' + (c === value ? ' on' : '')} style={{ background: c }}
            aria-label={`Cor ${c}`} aria-pressed={c === value} onClick={() => onChange(c)} />
        ))}
        <label className="swatch custom" style={{ background: PALETTE.includes(value) ? undefined : value }} title="Outra cor">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Outra cor" />+
        </label>
      </div>
    </div>
  )
}

export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} />
}

export function CategoryChip({ cat, onClick, on }: { cat: Category; onClick?: () => void; on?: boolean }) {
  const { categories } = useData()
  const parent = cat.parent_id ? categories.find((c) => c.id === cat.parent_id) : undefined
  return (
    <button type="button" className={'chip' + (on ? ' on' : '')} onClick={onClick} style={{ ['--c' as string]: cat.color }}>
      <Dot color={cat.color} />{parent ? `${parent.name} › ` : ''}{cat.name}
    </button>
  )
}

// Lista as categorias visíveis de um módulo, mãe seguida das filhas.
export function useModuleCategories(module: string, opts: { scope?: Scope; ownerId?: string; includeArchived?: boolean } = {}) {
  const { categories } = useData()
  const ok = (c: Category) => c.module === module && (opts.includeArchived || !c.archived_at) &&
    (opts.scope !== 'casal' || c.scope === 'casal') &&
    (!opts.ownerId || c.scope === 'casal' || c.owner_id === opts.ownerId)
  const byPos = (a: Category, b: Category) => a.position - b.position || a.name.localeCompare(b.name)
  const parents = categories.filter((c) => ok(c) && !c.parent_id).sort(byPos)
  return parents.flatMap((p) => [p, ...categories.filter((c) => ok(c) && c.parent_id === p.id).sort(byPos)])
}

export function CategoryPicker({ module, value, onChange, scope, ownerId }: {
  module: string; value: string | null; onChange: (id: string | null) => void; scope: Scope; ownerId: string
}) {
  const cats = useModuleCategories(module, { scope, ownerId })
  return (
    <div className="field">
      <span className="label">Categoria</span>
      <div className="chips wrap">
        <button type="button" className={'chip' + (!value ? ' on' : '')} onClick={() => onChange(null)}>Sem categoria</button>
        {cats.map((c) => <CategoryChip key={c.id} cat={c} on={value === c.id} onClick={() => onChange(c.id)} />)}
      </div>
      {scope === 'casal' && <span className="hint">Itens do Casal só usam categorias do Casal.</span>}
      {!cats.length && <span className="hint">Nenhuma categoria ainda. Crie em Mais → Categorias.</span>}
    </div>
  )
}

export function ScopeBadge({ scope, ownerId }: { scope: Scope; ownerId: string }) {
  const { me, profiles } = useData()
  const owner = profiles.find((p) => p.id === ownerId)
  if (scope === 'casal') {
    return <span className="badge casal"><Icon name="heart" size={12} />Casal{owner && owner.id !== me?.id ? ` · por ${owner.display_name}` : ''}</span>
  }
  return <span className="badge" style={{ ['--c' as string]: owner?.color }}><Icon name="user" size={12} />Só eu</span>
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}
