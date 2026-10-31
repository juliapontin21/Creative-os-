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

export interface Profile { id: string; household_id: string; email: string; display_name: string; color: string; has_company: boolean; income_ref_cents: number }

interface Owned {
  id: string; household_id: string; owner_id: string; scope: Scope
  created_at: string; updated_at: string; archived_at: string | null
}
export interface Category extends Owned { module: Module; parent_id: string | null; name: string; color: string; position: number; fin_bucket: 'fixo' | 'lazer' | 'imposto' | null }
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
  transfer_group: string | null; recurrence_id: string | null
}
export interface Recurrence extends FinOwned {
  kind: 'receita' | 'despesa'; description: string; amount_cents: number; frequency: 'semanal' | 'mensal' | 'anual'
  start_date: string; end_date: string | null; account_id: string | null; card_id: string | null; payee_id: string | null
  category_id: string | null; payment_method: PayMethod; client: string; payment_link: string
  is_subscription: boolean; service_url: string; vault_url: string; generated_until: string | null
}
export interface HouseRule extends FinOwned { params: Record<string, number | boolean> }
export interface Goal extends FinOwned { name: string; kind: 'desejo' | 'reserva' | 'investimento'; target_cents: number; deadline: string | null; color: string; position: number }
export interface GoalMove extends FinOwned { goal_id: string; amount_cents: number; date: string; note: string }
export interface Budget extends FinOwned { category_id: string; limit_cents: number }
export interface AgendaEvent {
  id: string; household_id: string; owner_id: string; context: 'pf' | 'casal'
  title: string; notes: string; location: string; start_at: string; end_at: string; all_day: boolean
  category_id: string | null; color: string; impacts_partner: boolean; done_at: string | null; nature: 'pessoal' | 'trabalho'
  series_id: string | null; series_rule: 'diario' | 'semanal' | 'mensal' | 'anual' | null; reminders: number[]
  archived_at: string | null; created_at: string; updated_at: string
}
export interface PartnerReminder { id: string; household_id: string; from_id: string; to_id: string; text: string; remind_at: string; done_at: string | null; created_at: string; updated_at: string }
interface Private { id: string; household_id: string; owner_id: string; created_at: string; updated_at: string }
export interface Habit extends Private {
  name: string; color: string; frequency: 'diario' | 'dias' | 'semana'; week_days: number[]; times_per_week: number
  target: number; unit: string; reminder_time: string | null; show_in_agenda: boolean; position: number; archived_at: string | null
}
export interface HabitLog extends Private { habit_id: string; date: string; value: number }
export interface WaterLog extends Private { date: string; ml: number }
export interface PersonalSetting extends Private { water_goal_ml: number }
export interface PushSubscriptionRow extends Private { endpoint: string; p256dh: string; auth: string; user_agent: string }
export interface NotificationPrefs extends Private {
  events: boolean; partner_events: boolean; partner_reminders: boolean; habits: boolean; water: boolean; water_every_min: number
  finance: boolean; finance_hour: number; quiet_start: number; quiet_end: number
}
export interface MonthPlan extends FinOwned { month: string; savings_cents: number; income_overrides: Record<string, number>; notes: string }

export interface Tables {
  profiles: Profile[]; categories: Category[]; notes: Note[]; saved_views: SavedView[]
  accounts: Account[]; cards: Card[]; payees: Payee[]; transactions: Transaction[]
  recurrences: Recurrence[]; month_plans: MonthPlan[]
  house_rules: HouseRule[]; goals: Goal[]; goal_moves: GoalMove[]; budgets: Budget[]
  events: AgendaEvent[]; partner_reminders: PartnerReminder[]; habits: Habit[]; habit_logs: HabitLog[]; water_logs: WaterLog[]; personal_settings: PersonalSetting[]
  push_subscriptions: PushSubscriptionRow[]; notification_prefs: NotificationPrefs[]
}
export type TableName = keyof Tables
export type Row<T extends TableName> = Tables[T][number]
export type Writable = Exclude<TableName, 'profiles'>
