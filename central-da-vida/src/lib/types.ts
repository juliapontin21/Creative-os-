export type Scope = 'pessoal' | 'casal'
export type Module = 'geral' | 'notas' | 'financas' | 'agenda' | 'habitos' | 'alimentacao' | 'mercado' | 'treinos' | 'biblioteca'

export const MODULES: { id: Module; label: string; phase: number }[] = [
  { id: 'notas', label: 'Notas', phase: 1 },
  { id: 'financas', label: 'Finanças', phase: 2 },
  { id: 'agenda', label: 'Agenda', phase: 4 },
  { id: 'habitos', label: 'Hábitos', phase: 4 },
  { id: 'alimentacao', label: 'Alimentação', phase: 5 },
  { id: 'mercado', label: 'Mercado', phase: 5 },
  { id: 'treinos', label: 'Treinos', phase: 6 },
  { id: 'biblioteca', label: 'Biblioteca', phase: 6 },
  { id: 'geral', label: 'Geral', phase: 1 },
]
export const moduleLabel = (m: string) => MODULES.find((x) => x.id === m)?.label ?? m

export interface Profile { id: string; household_id: string; email: string; display_name: string; color: string }

interface Owned {
  id: string; household_id: string; owner_id: string; scope: Scope
  created_at: string; updated_at: string; archived_at: string | null
}
export interface Category extends Owned { module: Module; parent_id: string | null; name: string; color: string; position: number }
export interface Note extends Owned {
  category_id: string | null; title: string; body: string; date: string | null
  status: 'aberta' | 'concluida'; pinned: boolean
}
export interface SavedView extends Owned { module: string; name: string; filters: Record<string, unknown>; position: number }

export interface Tables { profiles: Profile[]; categories: Category[]; notes: Note[]; saved_views: SavedView[] }
export type TableName = keyof Tables
export type Row<T extends TableName> = Tables[T][number]
export type Writable = Exclude<TableName, 'profiles'>
