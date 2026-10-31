import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)
export const sb = createClient(url || 'http://localhost', key || 'missing', {
  auth: { persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
})

export function friendly(msg: string): string {
  if (/row-level security|permission denied/i.test(msg)) return 'Você não tem permissão para isso.'
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sem conexão. Confira a internet e tente de novo.'
  if (/JWT|session/i.test(msg)) return 'Sua sessão expirou. Entre de novo.'
  return msg
}
