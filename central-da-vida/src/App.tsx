import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Icon } from './components/Icon'
import { Sheet } from './components/ui'
import { DataProvider, useData } from './lib/data'
import { go, useRoute, type Route } from './lib/route'
import { configured, sb } from './lib/supabase'
import { Categorias } from './screens/Categorias'
import { NoteEditor, Notas } from './screens/Notas'
import { Ajustes, Busca, EmBreve, Hoje, Mais, ROADMAP } from './screens/Telas'
import { Financas, useFinCtx } from './screens/Financas'
import { useRecurrenceSync } from './screens/Fin2B'
import { Regras } from './screens/Metas'
import { TxEditor } from './screens/FinEditors'
import type { Transaction } from './lib/types'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [authErr, setAuthErr] = useState('')

  useEffect(() => {
    if (!configured) { setSession(null); return }
    ;(async () => {
      const u = new URL(location.href)
      const hashParams = new URLSearchParams(u.hash.startsWith('#/') ? '' : u.hash.slice(1))
      const err = u.searchParams.get('error_description') || hashParams.get('error_description')
      const code = u.searchParams.get('code')
      if (err) setAuthErr(/database error|acesso_negado/i.test(err) ? 'Este e-mail não está liberado no Central da Vida. Entre com a conta Google cadastrada.' : err)
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code)
        if (error) setAuthErr('Não consegui concluir o login: ' + error.message +
          (/verifier/i.test(error.message) ? ' Abra o app direto no Safari (não por um link dentro do WhatsApp ou Instagram) e tente de novo.' : ''))
      }
      if (code || err) history.replaceState(null, '', u.origin + u.pathname + (u.hash.startsWith('#/') ? u.hash : ''))
      const { data } = await sb.auth.getSession()
      setSession(data.session)
    })()
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="splash"><div className="logo" /></div>
  if (!session) return <Login error={authErr} />
  return <DataProvider session={session}><Gate /></DataProvider>
}

function Login({ error }: { error: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <main className="login">
      <div className="logo big" />
      <h1>Central da Vida</h1>
      <p className="muted">Finanças, agenda, hábitos, alimentação e treinos da Júlia e do Michelangelo, num lugar só.</p>
      {!configured ? (
        <div className="card warn">Falta configurar o Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY). Veja docs/FASE1.md.</div>
      ) : (
        <button className="btn primary wide" disabled={busy} onClick={async () => {
          setBusy(true)
          const { error: e } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: location.origin + '/', queryParams: { prompt: 'select_account' } },
          })
          if (e) setBusy(false)
        }}>{busy ? 'Abrindo o Google…' : 'Entrar com Google'}</button>
      )}
      {error && <div className="card warn" role="alert">{error}</div>}
    </main>
  )
}

function Gate() {
  const { loading, me, error, session, reload } = useData()
  if (loading) return <div className="splash"><div className="logo" /></div>
  if (error && !me) return (
    <main className="login"><div className="card warn" role="alert">{error}</div>
      <button className="btn wide" onClick={reload}>Tentar de novo</button>
      <button className="btn wide" onClick={() => sb.auth.signOut()}>Sair</button></main>
  )
  if (!me) return (
    <main className="login">
      <h1>Acesso não liberado</h1>
      <p className="muted">A conta {session.user.email} não está cadastrada no Central da Vida.</p>
      <button className="btn wide" onClick={() => sb.auth.signOut()}>Entrar com outra conta</button>
    </main>
  )
  return <Shell />
}

const TITLES: Record<Route, string> = {
  hoje: 'Hoje', financas: 'Finanças', agenda: 'Agenda', mais: 'Mais', notas: 'Notas', categorias: 'Categorias',
  ajustes: 'Ajustes', busca: 'Busca', 'em-breve': 'Em breve', regras: 'Regras da casa',
}
const TABS: { id: Route; label: string; icon: string }[] = [
  { id: 'hoje', label: 'Hoje', icon: 'home' },
  { id: 'financas', label: 'Finanças', icon: 'wallet' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'mais', label: 'Mais', icon: 'grid' },
]
const SUB: Route[] = ['notas', 'categorias', 'ajustes', 'busca', 'em-breve', 'regras']

function Shell() {
  const { route, arg } = useRoute()
  const { me, toastMsg, online } = useData()
  const [quick, setQuick] = useState(false)
  const [newNote, setNewNote] = useState(false)
  const [newTx, setNewTx] = useState<Transaction['kind'] | null>(null)
  const fin = useFinCtx()
  useRecurrenceSync()
  const isSub = SUB.includes(route)
  const title = route === 'em-breve' ? (ROADMAP.find((r) => r.id === arg)?.title ?? 'Em breve') : TITLES[route] ?? 'Hoje'

  const screen = (() => {
    switch (route) {
      case 'financas': return <Financas sub={arg} />
      case 'agenda': return <EmBreve id="agenda" />
      case 'mais': return <Mais />
      case 'notas': return <Notas />
      case 'categorias': return <Categorias initial={arg} />
      case 'ajustes': return <Ajustes />
      case 'busca': return <Busca />
      case 'em-breve': return <EmBreve id={arg} />
      case 'regras': return <Regras />
      default: return <Hoje />
    }
  })()

  return (
    <div className="app">
      <header className="topbar">
        {isSub ? <button className="icon-btn" aria-label="Voltar" onClick={() => history.length > 1 ? history.back() : go('mais')}><Icon name="back" /></button>
          : <span className="logo small" aria-hidden="true" />}
        <h1 className="grow">{title}</h1>
        {route !== 'busca' && <button className="icon-btn" aria-label="Buscar" onClick={() => go('busca')}><Icon name="search" /></button>}
        <button className="avatar sm" style={{ background: me?.color }} aria-label="Ajustes" onClick={() => go('ajustes')}>{me?.display_name.slice(0, 1)}</button>
      </header>
      {!online && <div className="offline">Sem internet: o que você vê pode estar desatualizado.</div>}
      <main className="content">{screen}</main>
      <nav className="tabbar" aria-label="Navegação">
        {TABS.slice(0, 2).map((t) => <Tab key={t.id} t={t} active={route === t.id} />)}
        <button className="tab plus" aria-label="Adicionar" onClick={() => setQuick(true)}><span><Icon name="plus" size={26} /></span></button>
        {TABS.slice(2).map((t) => <Tab key={t.id} t={t} active={route === t.id || (isSub && t.id === 'mais')} />)}
      </nav>
      {quick && <QuickAdd onClose={() => setQuick(false)} onNote={() => { setQuick(false); setNewNote(true) }} onTx={(k) => { setQuick(false); setNewTx(k) }} />}
      {newTx && fin.cur && <TxEditor tx={null} preset={{ kind: newTx, ctx: fin.cur }} onClose={() => setNewTx(null)} />}
      {newNote && <NoteEditor note={null} onClose={() => setNewNote(false)} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  )
}

function Tab({ t, active }: { t: { id: Route; label: string; icon: string }; active: boolean }) {
  return (
    <button className={'tab' + (active ? ' on' : '')} aria-current={active ? 'page' : undefined} onClick={() => go(t.id)}>
      <Icon name={t.icon} size={22} /><span>{t.label}</span>
    </button>
  )
}

function QuickAdd({ onClose, onNote, onTx }: { onClose: () => void; onNote: () => void; onTx: (k: Transaction['kind']) => void }) {
  const later = [
    { icon: 'calendar', label: 'Evento', phase: 4 }, { icon: 'drop', label: 'Água', phase: 4 },
    { icon: 'check', label: 'Hábito', phase: 4 }, { icon: 'cart', label: 'Mercado', phase: 5 },
    { icon: 'heart', label: 'Lembrete p/ parceiro', phase: 4 },
  ]
  return (
    <Sheet title="Adicionar" onClose={onClose}>
      <div className="quick">
        <button className="quick-item" onClick={() => onTx('despesa')}><Icon name="wallet" size={24} />Despesa</button>
        <button className="quick-item" onClick={() => onTx('receita')}><Icon name="wallet" size={24} />Receita</button>
        <button className="quick-item" onClick={onNote}><Icon name="note" size={24} />Nota</button>
        <button className="quick-item" onClick={() => { onClose(); go('categorias') }}><Icon name="tag" size={24} />Categoria</button>
        {later.map((l) => (
          <button key={l.label} className="quick-item" disabled><Icon name={l.icon} size={24} />{l.label}<small>Fase {l.phase}</small></button>
        ))}
      </div>
    </Sheet>
  )
}
