import type { Category, Scope } from './types'
import { norm } from './util'

// Filtros combináveis usados em todas as listas. Cada módulo usa os campos que fazem sentido.
export interface Filters {
  scope: 'todos' | 'meus' | 'casal'
  categories: string[]
  from: string
  to: string
  status: string
  q: string
  archived: boolean
}
export const EMPTY_FILTERS: Filters = { scope: 'todos', categories: [], from: '', to: '', status: 'todos', q: '', archived: false }

export function activeCount(f: Filters) {
  return (f.scope !== 'todos' ? 1 : 0) + (f.categories.length ? 1 : 0) + (f.from || f.to ? 1 : 0) +
    (f.status !== 'todos' ? 1 : 0) + (f.archived ? 1 : 0)
}

export function sanitize(raw: Record<string, unknown>): Filters {
  return { ...EMPTY_FILTERS, ...(raw as Partial<Filters>), categories: Array.isArray(raw.categories) ? (raw.categories as string[]) : [] }
}

// Selecionar uma categoria-mãe inclui as subcategorias.
export function expandCategories(ids: string[], cats: Category[]) {
  const set = new Set(ids)
  for (const c of cats) if (c.parent_id && set.has(c.parent_id)) set.add(c.id)
  return set
}

interface Filterable { owner_id: string; scope: Scope; archived_at: string | null; category_id?: string | null; date?: string | null; status?: string }

export function applyFilters<T extends Filterable>(rows: T[], f: Filters, meId: string, cats: Category[], text: (r: T) => string): T[] {
  const catSet = f.categories.length ? expandCategories(f.categories, cats) : null
  const q = norm(f.q.trim())
  return rows.filter((r) => {
    if (f.archived !== Boolean(r.archived_at)) return false
    if (f.scope === 'meus' && !(r.scope === 'pessoal' && r.owner_id === meId)) return false
    if (f.scope === 'casal' && r.scope !== 'casal') return false
    if (catSet && !(r.category_id && catSet.has(r.category_id))) return false
    if (f.from && (!r.date || r.date < f.from)) return false
    if (f.to && (!r.date || r.date > f.to)) return false
    if (f.status !== 'todos' && r.status !== f.status) return false
    if (q && !norm(text(r)).includes(q)) return false
    return true
  })
}
