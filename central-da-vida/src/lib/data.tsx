import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { RealtimePostgresChangesPayload, Session } from '@supabase/supabase-js'
import { friendly, sb } from './supabase'
import type { Profile, Row, TableName, Tables, Writable } from './types'

const TABLES: TableName[] = ['profiles', 'categories', 'notes', 'saved_views', 'accounts', 'cards', 'payees', 'transactions', 'recurrences', 'month_plans', 'house_rules', 'goals', 'goal_moves', 'budgets', 'events', 'partner_reminders', 'habits', 'habit_logs', 'water_logs', 'personal_settings']
const EMPTY: Tables = { profiles: [], categories: [], notes: [], saved_views: [], accounts: [], cards: [], payees: [], transactions: [], recurrences: [], month_plans: [], house_rules: [], goals: [], goal_moves: [], budgets: [], events: [], partner_reminders: [], habits: [], habit_logs: [], water_logs: [], personal_settings: [] }

interface DataCtx extends Tables {
  session: Session
  me: Profile | undefined
  partner: Profile | undefined
  loading: boolean
  error: string
  online: boolean
  reload: () => Promise<void>
  insert: <T extends Writable>(t: T, row: Partial<Row<T>>) => Promise<Row<T> | null>
  update: <T extends TableName>(t: T, id: string, patch: Partial<Row<T>>) => Promise<Row<T> | null>
  remove: (t: Writable, id: string) => Promise<boolean>
  insertMany: <T extends Writable>(t: T, rows: Partial<Row<T>>[]) => Promise<Row<T>[] | null>
  updateMatch: <T extends Writable>(t: T, match: Record<string, string>, patch: Partial<Row<T>>) => Promise<Row<T>[] | null>
  removeMatch: (t: Writable, match: Record<string, string>) => Promise<boolean>
  insertIgnore: <T extends Writable>(t: T, rows: Partial<Row<T>>[], onConflict: string) => Promise<Row<T>[] | null>
  toast: (msg: string) => void
  toastMsg: string
}

const Ctx = createContext<DataCtx | null>(null)
export const useData = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('DataProvider ausente')
  return c
}

type AnyRow = { id: string; updated_at?: string }

function upsertRow<R extends AnyRow>(list: R[], row: R): R[] {
  const i = list.findIndex((x) => x.id === row.id)
  if (i < 0) return [...list, row]
  const cur = list[i]
  if (cur.updated_at && row.updated_at && row.updated_at < cur.updated_at) return list
  const next = list.slice()
  next[i] = row
  return next
}

export function DataProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [data, setData] = useState<Tables>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [toastMsg, setToastMsg] = useState('')
  const timer = useRef<number>(0)

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToastMsg(''), 3200)
  }, [])

  const reload = useCallback(async () => {
    const res = await Promise.all(TABLES.map((t) => sb.from(t).select('*')))
    const err = res.find((r) => r.error)?.error
    if (err) setError(friendly(err.message))
    else {
      setError('')
      setData(Object.fromEntries(TABLES.map((t, i) => [t, res[i].data ?? []])) as unknown as Tables)
    }
    setLoading(false)
  }, [])

  const setRow = useCallback((t: TableName, row: AnyRow) => {
    setData((d) => ({ ...d, [t]: upsertRow(d[t] as AnyRow[], row) }))
  }, [])
  const dropRow = useCallback((t: TableName, id: string) => {
    setData((d) => ({ ...d, [t]: (d[t] as AnyRow[]).filter((x) => x.id !== id) }))
  }, [])

  useEffect(() => {
    reload()
    const ch = sb.channel('cdv-db')
    for (const t of TABLES) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, (p: RealtimePostgresChangesPayload<AnyRow>) => {
        if (p.eventType === 'DELETE') { if (p.old?.id) dropRow(t, p.old.id) } else setRow(t, p.new)
      })
    }
    let first = true
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') { if (!first) reload(); first = false }
    })
    // Ao voltar para o app, confere tudo (cobre itens que deixaram de ser visíveis).
    const onVis = () => { if (document.visibilityState === 'visible') reload() }
    const on = () => { setOnline(true); reload() }
    const off = () => setOnline(false)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      sb.removeChannel(ch)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [reload, setRow, dropRow])

  const insert = useCallback(async <T extends Writable>(t: T, row: Partial<Row<T>>) => {
    const { data: r, error: e } = await sb.from(t).insert(row as never).select().single()
    if (e) { toast(friendly(e.message)); return null }
    setRow(t, r as AnyRow)
    return r as Row<T>
  }, [setRow, toast])

  const update = useCallback(async <T extends TableName>(t: T, id: string, patch: Partial<Row<T>>) => {
    const { data: r, error: e } = await sb.from(t).update(patch as never).eq('id', id).select().maybeSingle()
    if (e) { toast(friendly(e.message)); return null }
    if (!r) { toast('Você não tem permissão para alterar este item.'); return null }
    setRow(t, r as AnyRow)
    return r as Row<T>
  }, [setRow, toast])

  const remove = useCallback(async (t: Writable, id: string) => {
    const { error: e, count } = await sb.from(t).delete({ count: 'exact' }).eq('id', id)
    if (e) { toast(friendly(e.message)); return false }
    if (!count) { toast('Você não tem permissão para excluir este item.'); return false }
    dropRow(t, id)
    return true
  }, [dropRow, toast])

  const insertMany = useCallback(async <T extends Writable>(t: T, rows: Partial<Row<T>>[]) => {
    const { data: r, error: e } = await sb.from(t).insert(rows as never).select()
    if (e) { toast(friendly(e.message)); return null }
    for (const x of r ?? []) setRow(t, x as AnyRow)
    return (r ?? []) as Row<T>[]
  }, [setRow, toast])

  const updateMatch = useCallback(async <T extends Writable>(t: T, match: Record<string, string>, patch: Partial<Row<T>>) => {
    const { data: r, error: e } = await sb.from(t).update(patch as never).match(match).select()
    if (e) { toast(friendly(e.message)); return null }
    if (!r?.length) { toast('Você não tem permissão para alterar este item.'); return null }
    for (const x of r) setRow(t, x as AnyRow)
    return r as Row<T>[]
  }, [setRow, toast])

  const removeMatch = useCallback(async (t: Writable, match: Record<string, string>) => {
    const { data: r, error: e } = await sb.from(t).delete().match(match).select('id')
    if (e) { toast(friendly(e.message)); return false }
    if (!r?.length) { toast('Você não tem permissão para excluir este item.'); return false }
    for (const x of r) dropRow(t, (x as AnyRow).id)
    return true
  }, [dropRow, toast])

  // Insere ignorando o que já existe (ex.: ocorrências de contas fixas geradas pelos dois celulares).
  const insertIgnore = useCallback(async <T extends Writable>(t: T, rows: Partial<Row<T>>[], onConflict: string) => {
    if (!rows.length) return []
    const { data: r, error: e } = await sb.from(t).upsert(rows as never, { onConflict, ignoreDuplicates: true }).select()
    if (e) { toast(friendly(e.message)); return null }
    for (const x of r ?? []) setRow(t, x as AnyRow)
    return (r ?? []) as Row<T>[]
  }, [setRow, toast])

  const me = data.profiles.find((p) => p.id === session.user.id)
  const partner = data.profiles.find((p) => p.id !== session.user.id)

  return (
    <Ctx.Provider value={{ ...data, session, me, partner, loading, error, online, reload, insert, update, remove, insertMany, updateMatch, removeMatch, insertIgnore, toast, toastMsg }}>
      {children}
    </Ctx.Provider>
  )
}
