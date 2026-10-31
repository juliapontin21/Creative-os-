import { useState } from 'react'
import { Icon } from '../components/Icon'
import { ColorPicker, Confirm, Dot, Empty, ScopeBadge, ScopePicker, Sheet, useModuleCategories } from '../components/ui'
import { useData } from '../lib/data'
import { MODULES, type Category, type Module, type Scope } from '../lib/types'
import { PALETTE } from '../lib/util'

const SUGGESTIONS: Partial<Record<Module, string[]>> = {
  notas: ['Casa', 'Viagens', 'Ideias', 'Trabalho'],
  financas: ['Moradia', 'Mercado', 'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Educação', 'Pets'],
  agenda: ['Trabalho', 'Casal', 'Saúde', 'Família', 'Social'],
  habitos: ['Saúde', 'Estudo', 'Bem-estar'],
  alimentacao: ['Doce', 'Salgado', 'Fit', 'Rápida'],
  mercado: ['Hortifrúti', 'Açougue', 'Padaria', 'Limpeza', 'Higiene'],
  treinos: ['Força', 'Cardio', 'Mobilidade'],
  biblioteca: ['Aprendizado', 'Entretenimento', 'Podcasts', 'Músicas'],
}

export function Categorias({ initial }: { initial?: string }) {
  const { categories, notes, insert, update, remove, toast } = useData()
  const [module, setModule] = useState<Module>((MODULES.find((m) => m.id === initial)?.id) ?? 'notas')
  const [showArchived, setShowArchived] = useState(false)
  const [edit, setEdit] = useState<Category | { parent?: Category } | null>(null)
  const list = useModuleCategories(module, { includeArchived: true }).filter((c) => Boolean(c.archived_at) === showArchived)
  const siblingsOf = (c: Category) => list.filter((x) => x.parent_id === c.parent_id)

  const move = async (c: Category, dir: -1 | 1) => {
    const sib = siblingsOf(c)
    const i = sib.findIndex((x) => x.id === c.id)
    const j = i + dir
    if (j < 0 || j >= sib.length) return
    const order = sib.slice();
    [order[i], order[j]] = [order[j], order[i]]
    await Promise.all(order.map((x, k) => x.position !== k ? update('categories', x.id, { position: k }) : null))
  }

  const suggest = async () => {
    const names = SUGGESTIONS[module] ?? []
    const existing = new Set(categories.filter((c) => c.module === module).map((c) => c.name.toLowerCase()))
    let k = list.length
    for (const [i, name] of names.entries()) {
      if (!existing.has(name.toLowerCase())) await insert('categories', { module, name, scope: 'casal', color: PALETTE[i % PALETTE.length], position: k++ })
    }
    toast('Categorias sugeridas criadas. Edite à vontade.')
  }

  return (
    <>
      <div className="chips scroll">
        {MODULES.map((m) => (
          <button key={m.id} className={'chip' + (m.id === module ? ' on' : '')} onClick={() => setModule(m.id)}>{m.label}</button>
        ))}
      </div>
      <p className="hint pad">Categorias do Casal aparecem para os dois. Subcategorias seguem a visibilidade da mãe.</p>
      {list.length ? (
        <div className="list">
          {list.map((c) => {
            const sib = siblingsOf(c)
            const idx = sib.findIndex((x) => x.id === c.id)
            return (
              <div key={c.id} className={'card cat-row' + (c.parent_id ? ' child' : '')}>
                <button className="grow cat-main" onClick={() => setEdit(c)}>
                  <Dot color={c.color} />
                  <span className="grow">{c.name}</span>
                  <ScopeBadge scope={c.scope} ownerId={c.owner_id} />
                </button>
                {!showArchived && <>
                  <button className="icon-btn" disabled={idx === 0} aria-label="Subir" onClick={() => move(c, -1)}><Icon name="up" size={18} /></button>
                  <button className="icon-btn" disabled={idx === sib.length - 1} aria-label="Descer" onClick={() => move(c, 1)}><Icon name="down" size={18} /></button>
                </>}
              </div>
            )
          })}
        </div>
      ) : (
        <Empty icon="tag" title={showArchived ? 'Nenhuma categoria arquivada' : 'Nenhuma categoria aqui'}
          action={!showArchived && SUGGESTIONS[module] ? <button className="btn" onClick={suggest}>Criar sugestões</button> : undefined} />
      )}
      <label className="toggle pad"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Ver arquivadas</label>
      <button className="fab" onClick={() => setEdit({})} aria-label="Nova categoria"><Icon name="plus" size={26} /></button>
      {edit && <CategoryEditor module={module} cat={'id' in edit ? edit as Category : null} onClose={() => setEdit(null)}
        usage={(id) => notes.filter((n) => n.category_id === id).length}
        kidsOf={(id) => categories.filter((x) => x.parent_id === id)}
        onDelete={remove} onUpdate={update} onInsert={insert} />}
    </>
  )
}

function CategoryEditor({ module, cat, onClose, usage, kidsOf, onDelete, onUpdate, onInsert }: {
  module: Module; cat: Category | null; onClose: () => void
  usage: (id: string) => number; kidsOf: (id: string) => Category[]
  onDelete: ReturnType<typeof useData>['remove']; onUpdate: ReturnType<typeof useData>['update']; onInsert: ReturnType<typeof useData>['insert']
}) {
  const { me } = useData()
  const parents = useModuleCategories(module).filter((c) => !c.parent_id && c.id !== cat?.id)
  const [name, setName] = useState(cat?.name ?? '')
  const [color, setColor] = useState(cat?.color ?? PALETTE[0])
  const [scope, setScope] = useState<Scope>(cat?.scope ?? 'casal')
  const [parent, setParent] = useState<string | null>(cat?.parent_id ?? null)
  const [confirmDel, setConfirmDel] = useState(false)
  const mine = !cat || cat.owner_id === me!.id
  const hasKids = cat ? kidsOf(cat.id).length > 0 : false
  const parentCat = parents.find((p) => p.id === parent)
  const allowedParents = parents.filter((p) => p.scope === 'casal' || p.owner_id === (cat?.owner_id ?? me!.id))

  const save = async () => {
    const row = { name: name.trim(), color, scope: parentCat ? parentCat.scope : scope, parent_id: parent, module }
    const r = cat ? await onUpdate('categories', cat.id, row) : await onInsert('categories', { ...row, position: 999 })
    if (r) onClose()
  }
  const n = cat ? usage(cat.id) : 0
  const kids = cat ? kidsOf(cat.id) : []

  return (
    <Sheet title={cat ? 'Editar categoria' : 'Nova categoria'} onClose={onClose} footer={<>
      {cat && <button className="icon-btn" aria-label={cat.archived_at ? 'Desarquivar' : 'Arquivar'} title={cat.archived_at ? 'Desarquivar' : 'Arquivar'}
        onClick={async () => { if (await onUpdate('categories', cat.id, { archived_at: cat.archived_at ? null : new Date().toISOString() })) onClose() }}>
        <Icon name="archive" /></button>}
      {cat && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>}
      <span className="grow" />
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!name.trim()} onClick={save}>Salvar</button>
    </>}>
      <label className="field">
        <span className="label">Nome</span>
        <input autoFocus={!cat} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <ColorPicker value={color} onChange={setColor} />
      {!hasKids && (
        <label className="field">
          <span className="label">Dentro de (opcional)</span>
          <select value={parent ?? ''} onChange={(e) => setParent(e.target.value || null)}>
            <option value="">Nenhuma (categoria principal)</option>
            {allowedParents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}
      {parentCat ? <p className="hint">Visibilidade igual à de “{parentCat.name}”.</p>
        : <ScopePicker value={scope} onChange={setScope} disabled={!mine} />}
      {confirmDel && cat && <Confirm title="Excluir categoria?" onConfirm={async () => { if (await onDelete('categories', cat.id)) onClose() }}
        onClose={() => setConfirmDel(false)} message={<>
          <p>“{cat.name}” será apagada.</p>
          {n > 0 && <p>{n} {n === 1 ? 'item ficará' : 'itens ficarão'} sem categoria.</p>}
          {kids.length > 0 && <p>{kids.length} {kids.length === 1 ? 'subcategoria também será apagada' : 'subcategorias também serão apagadas'}.</p>}
          <p>Para manter o histórico, prefira <b>Arquivar</b>.</p>
        </>} />}
    </Sheet>
  )
}
