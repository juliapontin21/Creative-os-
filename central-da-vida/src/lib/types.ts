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

export interface Profile { id: string; household_id: string; email: string; display_name: string; color: string; has_company: boolean }

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

export type FinContext = 'empresa' | 'pf' | 'casal'
interface FinOwned {
  id: string; household_id: string; owner_id: string; context: FinContext
  created_at: string; updated_at: string; archived_at: string | null
}
export interface Account extends FinOwned {
  name: string; kind: 'corrente' | 'poupanca' | 'carteira' | 'investimento' | 'outro'
  initial_balance_cents: number; initial_date: string; color: string; position: number
}
export interface Card extends FinOwned {
  name: string; pay_account_id: string | null; closing_day: number; due_day: number
  limit_cents: number | null; is_couple_card: boolean; color: string; position: number
}
export interface Payee extends FinOwned {
  name: string; pix_key: string | null; pix_type: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null; notes: string
}
export type PayMethod = 'pix' | 'debito' | 'boleto' | 'cartao' | 'dinheiro' | 'transferencia' | 'outro'
export interface Transaction extends FinOwned {
  kind: 'receita' | 'despesa' | 'transferencia'; direction: 'entrada' | 'saida' | null
  status: 'previsto' | 'realizado' | 'cancelado'; amount_cents: number; description: string
  competence_date: string; due_date: string; paid_date: string | null
  account_id: string | null; card_id: string | null; payee_id: string | null; client: string
  category_id: string | null; payment_method: PayMethod; payment_link: string; tags: string[]; notes: string
  installment_group: string | null; installment_no: number | null; installment_total: number | null
  transfer_group: string | null
}

export interface Tables {
  profiles: Profile[]; categories: Category[]; notes: Note[]; saved_views: SavedView[]
  accounts: Account[]; cards: Card[]; payees: Payee[]; transactions: Transaction[]
}
export type TableName = keyof Tables
export type Row<T extends TableName> = Tables[T][number]
export type Writable = Exclude<TableName, 'profiles'>
