import { useState } from 'react'
import { Icon } from '../components/Icon'
import { Dot, Empty, Sheet } from '../components/ui'
import { useData } from '../lib/data'
import { go } from '../lib/route'
import { sb } from '../lib/supabase'
import { MODULES, moduleLabel, type Note } from '../lib/types'
import { download, isIOS, isStandalone, norm, PALETTE, todayISO } from '../lib/util'
import { NoteEditor, NotesList } from './Notas'
import { MoneyInput } from './FinEditors'
import { fmtMoney, parseMoney } from '../lib/finance'

export const ROADMAP: { id: string; title: string; icon: string; phase: number; text: string }[] = [
  { id: 'mes-casal', title: 'Mês do casal', icon: 'heart', phase: 2, text: 'Renda do casal, contas fixas, caixinhas e a mesada de cada um, proporcional à renda (entrega 2B).' },
  { id: 'planejamento', title: 'Planejamento financeiro', icon: 'sparkle', phase: 3, text: 'Orçamentos por categoria, caixinhas, alertas, gráficos, projeções e simulador de compras.' },
  { id: 'agenda', title: 'Agenda', icon: 'calendar', phase: 4, text: 'Agendas separadas e do casal, eventos que impactam o outro, lembretes para o parceiro.' },
  { id: 'habitos', title: 'Hábitos e água', icon: 'drop', phase: 4, text: 'Rastreadores, grade de quadradinhos e a garrafa de água que enche.' },
  { id: 'alimentacao', title: 'Alimentação e mercado', icon: 'cart', phase: 5, text: 'Receitas, cardápio da semana, diário alimentar e lista de mercado compartilhada.' },
  { id: 'treinos', title: 'Treinos e biblioteca', icon: 'dumbbell', phase: 6, text: 'Fichas, vídeos demonstrativos e links de podcasts, músicas e séries.' },
  { id: 'assistente', title: 'Assistente', icon: 'chef', phase: 7, text: 'Comandos em linguagem natural com confirmação, assistente culinário e estimativas.' },
]

function InstallTip() {
  const [hide, setHide] = useState(() => { try { return localStorage.getItem('cdv-hide-install') === '1' } catch { return false } })
  if (hide || isStandalone() || !isIOS()) return null
  return (
    <div className="card tip">
      <div className="grow">
        <strong>Instale na Tela de Início</strong>
        <p>No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. É assim que o iPhone libera notificações (a partir da Fase 4).</p>
      </div>
      <button className="icon-btn" aria-label="Dispensar" onClick={() => { setHide(true); try { localStorage.setItem('cdv-hide-install', '1') } catch { /* sem armazenamento */ } }}><Icon name="x" /></button>
    </div>
  )
}

export function Hoje() {
  const { notes, me, partner } = useData()
  const [edit, setEdit] = useState<Note | null>(null)
  const [creating, setCreating] = useState(false)
  const today = todayISO()
  const open = notes.filter((n) => !n.archived_at && n.status === 'aberta')
  const forToday = open.filter((n) => n.date && n.date <= today).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const pinned = open.filter((n) => n.pinned && !forToday.includes(n))
  const h = new Date().getHours()
  const hello = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return (
    <>
      <section className="hero">
        <p className="eyebrow">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1>{hello}, {me?.display_name}</h1>
        <p className="sub">{partner ? <><Dot color={partner.color} /> Conectado com {partner.display_name}</> : 'Seu parceiro ainda não entrou no app.'}</p>
      </section>
      <InstallTip />
      <section>
        <div className="section-head"><h2>Para hoje</h2><button className="link" onClick={() => setCreating(true)}>+ Nota</button></div>
        {forToday.length ? <NotesList notes={forToday} onOpen={setEdit} />
          : <p className="muted pad">Nada marcado para hoje. Notas com data de hoje ou atrasadas aparecem aqui.</p>}
      </section>
      {pinned.length > 0 && <section><div className="section-head"><h2>Fixadas</h2></div><NotesList notes={pinned} onOpen={setEdit} /></section>}
      <section>
        <div className="section-head"><h2>Chegando nas próximas fases</h2></div>
        <div className="grid2">
          {ROADMAP.slice(0, 4).map((r) => (
            <button key={r.id} className="card mini" onClick={() => go('em-breve', r.id)}>
              <Icon name={r.icon} /><strong>{r.title}</strong><span className="muted">Fase {r.phase}</span>
            </button>
          ))}
        </div>
      </section>
      {edit && <NoteEditor note={edit} onClose={() => setEdit(null)} />}
      {creating && <NoteEditor note={null} preset={{ date: today }} onClose={() => setCreating(false)} />}
    </>
  )
}

export function EmBreve({ id }: { id: string }) {
  const items = id ? ROADMAP.filter((r) => r.id === id || (id === 'financas' && r.id === 'planejamento') || (id === 'agenda' && r.id === 'habitos')) : ROADMAP
  return (
    <>
      {items.map((r) => (
        <div key={r.id} className="card roadmap">
          <div className="roadmap-icon"><Icon name={r.icon} size={24} /></div>
          <div className="grow">
            <span className="eyebrow">Fase {r.phase}</span>
            <h2>{r.title}</h2>
            <p>{r.text}</p>
          </div>
        </div>
      ))}
      <p className="muted pad">Cada fase só começa com a sua aprovação. Enquanto isso, você já pode preparar as categorias deste módulo.</p>
      {id && MODULES.some((m) => m.id === id) && <button className="btn wide" onClick={() => go('categorias', id)}><Icon name="tag" />Categorias de {moduleLabel(id)}</button>}
    </>
  )
}

export function Mais() {
  const items: { icon: string; label: string; hint: string; to: () => void }[] = [
    { icon: 'note', label: 'Notas', hint: 'Bloco de notas pessoal e do casal', to: () => go('notas') },
    { icon: 'tag', label: 'Categorias', hint: 'Criar, colorir, ordenar e arquivar', to: () => go('categorias') },
    { icon: 'search', label: 'Busca', hint: 'Procurar em tudo', to: () => go('busca') },
    ...ROADMAP.filter((r) => r.phase >= 4).map((r) => ({ icon: r.icon, label: r.title, hint: `Fase ${r.phase}`, to: () => go('em-breve', r.id) })),
    { icon: 'settings', label: 'Ajustes', hint: 'Perfil, exportar dados, sair', to: () => go('ajustes') },
  ]
  return (
    <div className="list">
      {items.map((i) => (
        <button key={i.label} className="card list-link" onClick={i.to}>
          <span className="list-icon"><Icon name={i.icon} /></span>
          <span className="grow"><strong>{i.label}</strong><span className="muted">{i.hint}</span></span>
          <Icon name="right" size={18} />
        </button>
      ))}
    </div>
  )
}

export function Busca() {
  const { notes, categories } = useData()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Note | null>(null)
  const t = norm(q.trim())
  const ns = t ? notes.filter((n) => norm(`${n.title} ${n.body}`).includes(t)) : []
  const cs = t ? categories.filter((c) => norm(c.name).includes(t)) : []
  return (
    <>
      <label className="search big">
        <Icon name="search" size={18} />
        <input autoFocus type="search" placeholder="Buscar notas e categorias" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {t && !ns.length && !cs.length && <Empty icon="search" title="Nada encontrado" />}
      {ns.length > 0 && <section><div className="section-head"><h2>Notas</h2></div><NotesList notes={ns} onOpen={setEdit} /></section>}
      {cs.length > 0 && <section><div className="section-head"><h2>Categorias</h2></div>
        <div className="list">{cs.map((c) => (
          <button key={c.id} className="card list-link" onClick={() => go('categorias', c.module)}>
            <Dot color={c.color} /><span className="grow">{c.name}</span><span className="muted">{moduleLabel(c.module)}</span>
          </button>
        ))}</div></section>}
      {!t && <p className="muted pad">A busca vai crescer junto com o app: finanças, agenda, receitas e treinos entram aqui nas próximas fases.</p>}
      {edit && <NoteEditor note={edit} onClose={() => setEdit(null)} />}
    </>
  )
}

export function Ajustes() {
  const { me, partner, update, toast, profiles, categories, notes, saved_views } = useData()
  const [profileOpen, setProfileOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [income, setIncome] = useState(me?.income_ref_cents ? (me.income_ref_cents / 100).toFixed(2).replace('.', ',') : '')
  const [name, setName] = useState(me?.display_name ?? '')
  const [color, setColor] = useState(me?.color ?? PALETTE[0])
  const exportAll = () => {
    const payload = { app: 'Central da Vida', exported_at: new Date().toISOString(), user: me?.email, profiles, categories, notes, saved_views }
    download(`central-da-vida-${todayISO()}.json`, JSON.stringify(payload, null, 2))
    toast('Arquivo gerado com tudo o que você vê.')
  }
  return (
    <>
      <div className="card profile">
        <span className="avatar" style={{ background: me?.color }}>{me?.display_name.slice(0, 1)}</span>
        <div className="grow"><strong>{me?.display_name}</strong><span className="muted">{me?.email}</span></div>
        <button className="btn" onClick={() => setProfileOpen(true)}>Editar</button>
      </div>
      <button className="card list-link" onClick={() => setIncomeOpen(true)}>
        <span className="list-icon"><Icon name="wallet" /></span>
        <span className="grow"><strong>Minha renda de referência</strong><span className="muted">{me?.income_ref_cents ? fmtMoney(me.income_ref_cents) : 'Ainda não informada'} · base da mesada no Mês do casal</span></span>
        <Icon name="right" size={18} />
      </button>
      <div className="card">
        <strong>Parceiro</strong>
        <p className="muted">{partner ? <><Dot color={partner.color} /> {partner.display_name} já entrou ({partner.email}).</> : 'Ainda não entrou. Quando ele fizer login com o e-mail liberado, a conexão é automática.'}</p>
      </div>
      <div className="list">
        <button className="card list-link" onClick={exportAll}>
          <span className="list-icon"><Icon name="download" /></span>
          <span className="grow"><strong>Exportar meus dados</strong><span className="muted">Arquivo JSON com tudo o que você vê. Guarde como backup.</span></span>
        </button>
        <button className="card list-link" onClick={() => sb.auth.signOut()}>
          <span className="list-icon"><Icon name="logout" /></span>
          <span className="grow"><strong>Sair</strong></span>
        </button>
      </div>
      <p className="muted pad small">Central da Vida · Fase 1 · Notificações chegam na Fase 4.</p>
      {incomeOpen && (
        <Sheet title="Minha renda de referência" onClose={() => setIncomeOpen(false)} footer={<>
          <button className="btn" onClick={() => setIncomeOpen(false)}>Cancelar</button>
          <button className="btn primary" disabled={parseMoney(income) === null} onClick={async () => {
            const v = parseMoney(income)
            if (me && v !== null && await update('profiles', me.id, { income_ref_cents: v })) { toast('Renda de referência atualizada.'); setIncomeOpen(false) }
          }}>Salvar</button>
        </>}>
          <MoneyInput label="Renda mensal" value={income} onChange={setIncome} hint="Ex.: pró-labore ou salário fixo. Quando entrar dinheiro extra, ajuste só aquele mês em Finanças → Casal → Mês do casal." />
        </Sheet>
      )}
      {profileOpen && (
        <Sheet title="Meu perfil" onClose={() => setProfileOpen(false)} footer={<>
          <button className="btn" onClick={() => setProfileOpen(false)}>Cancelar</button>
          <button className="btn primary" disabled={!name.trim()} onClick={async () => {
            if (me && await update('profiles', me.id, { display_name: name.trim(), color })) setProfileOpen(false)
          }}>Salvar</button>
        </>}>
          <label className="field"><span className="label">Nome</span><input maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="field">
            <span className="label">Cor</span>
            <div className="swatches">{PALETTE.map((c) => <button key={c} className={'swatch' + (c === color ? ' on' : '')} style={{ background: c }} aria-label={c} onClick={() => setColor(c)} />)}</div>
          </div>
        </Sheet>
      )}
    </>
  )
}
