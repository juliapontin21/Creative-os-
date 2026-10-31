import { useEffect, useState } from 'react'
import { useData } from './data'
import type { FinContext, PayMethod } from './types'

// Uma "aba" de Finanças: Empresa (da Júlia), PF de cada um, Casal.
export interface CtxOpt { key: string; ctx: FinContext; owner: string; label: string; writable: boolean }

export function useCtxOptions(): CtxOpt[] {
  const { me, partner } = useData()
  if (!me) return []
  const opts: CtxOpt[] = []
  if (me.has_company) opts.push({ key: `empresa:${me.id}`, ctx: 'empresa', owner: me.id, label: 'Empresa', writable: true })
  opts.push({ key: `pf:${me.id}`, ctx: 'pf', owner: me.id, label: me.display_name, writable: true })
  if (partner) opts.push({ key: `pf:${partner.id}`, ctx: 'pf', owner: partner.id, label: partner.display_name, writable: false })
  opts.push({ key: 'casal', ctx: 'casal', owner: '', label: 'Casal', writable: true })
  return opts
}

type Owned = { context: FinContext; owner_id: string }
export const inCtx = (r: Owned, o: { ctx: FinContext; owner: string }) => r.context === o.ctx && (o.ctx === 'casal' || r.owner_id === o.owner)
export const canWrite = (r: Owned, meId: string) => r.context === 'casal' || r.owner_id === meId

// Mesma regra do banco (fin_link_ok): o que um lançamento/cartão daquela aba pode usar.
export function linkOk(ctx: FinContext, owner: string, l: Owned) {
  if (ctx === 'casal') return l.context === 'casal' || l.context === 'pf'
  return (l.context === ctx && l.owner_id === owner) || l.context === 'casal'
}

export const METHODS: { id: PayMethod; label: string }[] = [
  { id: 'pix', label: 'Pix' }, { id: 'debito', label: 'Débito' }, { id: 'boleto', label: 'Boleto' },
  { id: 'dinheiro', label: 'Dinheiro' }, { id: 'transferencia', label: 'Transferência' }, { id: 'outro', label: 'Outro' },
]
export const methodLabel = (m: string) => (m === 'cartao' ? 'Cartão' : METHODS.find((x) => x.id === m)?.label ?? m)

// Estado que sobrevive à troca de tela (por aba do navegador).
export function useSessionState<T>(key: string, init: T): [T, (v: T) => void] {
  const [v, set] = useState<T>(() => {
    try { const raw = sessionStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : init } catch { return init }
  })
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(v)) } catch { /* sem armazenamento */ } }, [key, v])
  return [v, set]
}
