import { useState } from 'react'
import { Icon } from '../components/Icon'
import { ColorPicker, Confirm, Dot, Segmented, Sheet, useModuleCategories } from '../components/ui'
import { useData } from '../lib/data'
import { fmtMoney, parseMoney } from '../lib/finance'
import { canWrite, type CtxOpt } from '../lib/finctx'
import { DEFAULTS, withDefaults, type Indicator, type Params, type RuleCtx } from '../lib/planning'
import { go } from '../lib/route'
import { dismiss, dismissed, useGoalBalance, usePlanning, useRules, type Alert } from '../lib/usePlanning'
import type { Budget, FinContext, Goal } from '../lib/types'
import { fmtDate, PALETTE, todayISO } from '../lib/util'
import { MoneyInput } from './FinEditors'

const centsToInput = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')
const KIND_LABEL: Record<Goal['kind'], string> = { desejo: 'Desejo', reserva: 'Reserva de emergência', investimento: 'Investimento' }

export function AlertList({ alerts, month, compact }: { alerts: Alert[]; month: string; compact?: boolean }) {
  const [, force] = useState(0)
  const hidden = dismissed(month)
  const shown = alerts.filter((a) => !hidden.has(a.id))
  if (!shown.length) return compact ? null : <p className="muted pad">Nenhum alerta neste mês.</p>
  return (
    <div className="list">
      {shown.slice(0, compact ? 3 : undefined).map((a) => (
        <div key={a.id} className={'card alert-item lv-' + a.level}>
          <Icon name="sparkle" size={18} />
          <span className="grow"><strong>{a.title}</strong><span className="small">{a.detail}</span></span>
          <button className="icon-btn" aria-label="Dispensar neste mês" title="Dispensar neste mês" onClick={() => { dismiss(month, a.id); force((x) => x + 1) }}><Icon name="x" size={16} /></button>
        </div>
      ))}
      {compact && shown.length > 3 && <button className="link" onClick={() => go('financas', 'metas')}>Ver os {shown.length} alertas</button>}
    </div>
  )
}

function IndicatorRow({ i }: { i: Indicator }) {
  const pct = i.target ? Math.min(100, Math.round((Math.max(0, i.actual) / i.target) * 100)) : 0
  const color = i.kind === 'ref' ? 'var(--plan)' : i.ok ? 'var(--pos)' : i.kind === 'max' ? 'var(--neg)' : '#d97706'
  return (
    <div className="ind-row">
      <div className="ind-head"><strong>{i.label}</strong><span className="small"><b style={{ color }}>{fmtMoney(i.actual)}</b> / {fmtMoney(i.target)}</span></div>
      <div className="bar"><span style={{ width: `${pct}%`, background: color }} /></div>
      <span className="muted small">Referência: {i.rule}{i.kind === 'max' && !i.ok ? ` · passou ${fmtMoney(i.actual - i.target)}` : i.kind === 'min' && !i.ok ? ` · faltam ${fmtMoney(i.target - i.actual)}` : ''}</span>
    </div>
  )
}

export function Metas({ cur, month }: { cur: CtxOpt; month: string }) {
  const { me } = useData()
  const P = usePlanning(cur, month)
  const [goalEdit, setGoalEdit] = useState<Goal | 'new' | null>(null)
  const [move, setMove] = useState<{ goal: Goal; sign: 1 | -1 } | null>(null)
  const [budgetEdit, setBudgetEdit] = useState<Budget | 'new' | null>(null)
  return (
    <>
      <section>
        <div className="section-head"><h2>Alertas do mês</h2><button className="link" onClick={() => go('regras')}>Referências</button></div>
        <AlertList alerts={P.alerts} month={month} />
      </section>

      {P.indicators.length > 0 && (
        <section>
          <div className="section-head"><h2>{cur.ctx === 'empresa' ? 'Faturamento do mês' : cur.ctx === 'casal' ? 'Regras do casal' : 'Indicadores'}</h2>
            <span className="muted small">{cur.ctx === 'empresa' ? fmtMoney(P.income) : `renda ${fmtMoney(P.income)}`}</span></div>
          {!P.income && <p className="card info">{cur.ctx === 'empresa' ? 'Sem receitas da empresa neste mês.' : 'Informe a renda de referência em Ajustes para calcular os indicadores.'}</p>}
          <div className="card ind-card">{P.indicators.map((i) => <IndicatorRow key={i.id} i={i} />)}</div>
          <p className="hint">São referências: mude os números ou desligue qualquer uma em <button className="link inline" onClick={() => go('regras')}>Regras da casa</button>.
            {cur.ctx === 'pf' && ' Fixos = contas fixas + categorias do tipo "fixo"; lazer = categorias do tipo "lazer"; investido = aportes em caixinhas de reserva e investimento.'}</p>
        </section>
      )}

      <section>
        <div className="section-head"><h2>Caixinhas</h2>{cur.writable && <button className="link" onClick={() => setGoalEdit('new')}>+ Caixinha</button>}</div>
        {P.hasAccounts && <div className="grid2">
          <div className="card stat"><span className="muted small">Guardado nas caixinhas</span><strong className="stat-value">{fmtMoney(P.reserved)}</strong></div>
          <div className="card stat"><span className="muted small">Disponível fora delas</span><strong className={'stat-value ' + (P.available < 0 ? 'neg' : '')}>{fmtMoney(P.available)}</strong></div>
        </div>}
        {P.goals.length ? <div className="list">{P.goals.map(({ goal: g, saved, pct, monthly, monthsLeft }) => (
          <div key={g.id} className="card goal">
            <button className="goal-main" onClick={() => setGoalEdit(g)}>
              <span className="goal-head"><Dot color={g.color} /><strong className="grow">{g.name}</strong><span className="badge">{KIND_LABEL[g.kind]}</span></span>
              <span className="small"><b>{fmtMoney(saved)}</b> de {fmtMoney(g.target_cents)} · {pct}%</span>
              <div className="bar"><span style={{ width: `${pct}%`, background: g.color }} /></div>
              <span className="muted small">{monthly ? `Guardar ${fmtMoney(monthly)} por mês até ${fmtDate(g.deadline, { month: 'short', year: 'numeric' })} (${monthsLeft} ${monthsLeft === 1 ? 'mês' : 'meses'})` : saved >= g.target_cents ? 'Meta atingida 🎉' : 'Sem prazo definido'}</span>
            </button>
            {canWrite(g, me!.id) && <div className="goal-actions">
              <button className="btn small" onClick={() => setMove({ goal: g, sign: 1 })}>+ Guardar</button>
              <button className="btn small" onClick={() => setMove({ goal: g, sign: -1 })}>− Resgatar</button>
            </div>}
          </div>
        ))}</div> : <p className="muted pad">Nenhuma caixinha nesta aba. Crie uma para desejos, reserva de emergência ou investimentos.</p>}
        <p className="hint">Caixinha separa uma parte do saldo das contas: não é dinheiro novo e não entra duas vezes nos totais.</p>
      </section>

      <section>
        <div className="section-head"><h2>Limites por categoria</h2>{cur.writable && <button className="link" onClick={() => setBudgetEdit('new')}>+ Limite</button>}</div>
        {P.budgets.length ? <div className="card ind-card">{P.budgets.map((b) => (
          <button key={b.budget.id} className="ind-row as-btn" onClick={() => cur.writable && setBudgetEdit(b.budget)}>
            <div className="ind-head"><strong><Dot color={b.category?.color ?? '#999'} /> {b.category?.name ?? 'Categoria'}</strong>
              <span className="small"><b className={b.level === 'over' ? 'neg' : ''}>{fmtMoney(b.spent)}</b> / {fmtMoney(b.budget.limit_cents)}</span></div>
            <div className="bar"><span style={{ width: `${Math.min(100, b.pct)}%`, background: b.level === 'over' ? 'var(--neg)' : b.level === 'warn' ? '#d97706' : 'var(--pos)' }} /></div>
            <span className="muted small">{b.level === 'over' ? `passou ${fmtMoney(b.spent - b.budget.limit_cents)}` : `disponível ${fmtMoney(b.budget.limit_cents - b.spent)}`} · {b.pct}%</span>
          </button>
        ))}</div> : <p className="muted pad">Nenhum limite. Ex.: Mercado até R$ 1.200 por mês.</p>}
      </section>

      {goalEdit && <GoalEditor goal={goalEdit === 'new' ? null : goalEdit} cur={cur} onClose={() => setGoalEdit(null)} />}
      {move && <MoveEditor goal={move.goal} sign={move.sign} onClose={() => setMove(null)} />}
      {budgetEdit && <BudgetEditor budget={budgetEdit === 'new' ? null : budgetEdit} cur={cur} onClose={() => setBudgetEdit(null)} />}
    </>
  )
}

// ───────────────────────── Editores ─────────────────────────

function ctxChoices(me: { display_name: string; has_company: boolean }) {
  return [...(me.has_company ? [{ id: 'empresa' as FinContext, label: 'Empresa' }] : []), { id: 'pf' as FinContext, label: me.display_name }, { id: 'casal' as FinContext, label: 'Casal' }]
}

function GoalEditor({ goal, cur, onClose }: { goal: Goal | null; cur: CtxOpt; onClose: () => void }) {
  const { me, goal_moves, insert, update, remove, toast } = useData()
  const rulesOf = useRules()
  const balanceOf = useGoalBalance()
  const editable = !goal || canWrite(goal, me!.id)
  const [ctx, setCtx] = useState<FinContext>(goal?.context ?? (cur.writable ? cur.ctx : 'casal'))
  const [name, setName] = useState(goal?.name ?? '')
  const [kind, setKind] = useState<Goal['kind']>(goal?.kind ?? 'desejo')
  const [target, setTarget] = useState(centsToInput(goal?.target_cents))
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [color, setColor] = useState(goal?.color ?? PALETTE[5])
  const [confirmDel, setConfirmDel] = useState(false)
  const t = parseMoney(target)
  const reserveRef = ctx === 'pf' ? me!.income_ref_cents * Number(rulesOf('pf', me!.id).params.reserve_mult) : 0
  const moves = goal ? goal_moves.filter((m) => m.goal_id === goal.id).sort((a, b) => b.date.localeCompare(a.date)) : []
  const save = async () => {
    if (t === null) return
    const row = { name: name.trim(), kind, target_cents: t, deadline: deadline || null, color, context: ctx }
    const r = goal ? await update('goals', goal.id, row) : await insert('goals', row)
    if (r) { toast('Caixinha salva.'); onClose() }
  }
  return (
    <Sheet title={goal ? (editable ? 'Editar caixinha' : 'Caixinha') : 'Nova caixinha'} onClose={onClose} footer={<>
      {goal && editable && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>}
      <span className="grow" />
      <button className="btn" onClick={onClose}>{editable ? 'Cancelar' : 'Fechar'}</button>
      {editable && <button className="btn primary" disabled={!name.trim() || t === null} onClick={save}>Salvar</button>}
    </>}>
      <fieldset disabled={!editable} className="plain">
        {!goal && <div className="field"><span className="label">Aba</span><Segmented value={ctx} onChange={setCtx} options={ctxChoices(me!)} /></div>}
        <label className="field"><span className="label">Nome</span><input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Viagem de fim de ano" /></label>
        <div className="field"><span className="label">Tipo</span><Segmented value={kind} onChange={setKind} options={[{ id: 'desejo', label: 'Desejo' }, { id: 'reserva', label: 'Reserva' }, { id: 'investimento', label: 'Investimento' }]} /></div>
        <MoneyInput label="Meta" value={target} onChange={setTarget} />
        {kind === 'reserva' && reserveRef > 0 && (
          <p className="hint">Referência da casa: {Number(rulesOf('pf', me!.id).params.reserve_mult)}× sua renda = {fmtMoney(reserveRef)}. <button className="link inline" onClick={() => setTarget(centsToInput(reserveRef))}>Usar</button> (você pode escolher outro valor)</p>
        )}
        <label className="field"><span className="label">Prazo (opcional)</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        <ColorPicker value={color} onChange={setColor} />
      </fieldset>
      {goal && <div className="field"><span className="label">Movimentos · saldo {fmtMoney(balanceOf(goal))}</span>
        {moves.length ? <div className="list compact">{moves.map((m) => (
          <div key={m.id} className="list-row"><span className="grow small">{fmtDate(m.date)}{m.note ? ` · ${m.note}` : ''}</span>
            <b className={m.amount_cents > 0 ? 'pos' : ''}>{m.amount_cents > 0 ? '+' : '−'} {fmtMoney(Math.abs(m.amount_cents))}</b>
            {editable && <button className="icon-btn" aria-label="Apagar movimento" onClick={() => remove('goal_moves', m.id)}><Icon name="x" size={16} /></button>}</div>
        ))}</div> : <span className="hint">Nenhum aporte ainda.</span>}</div>}
      {confirmDel && goal && <Confirm title="Excluir caixinha?" message="A caixinha e o histórico de aportes serão apagados. O dinheiro nas contas não muda." onConfirm={async () => { if (await remove('goals', goal.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}

function MoveEditor({ goal, sign, onClose }: { goal: Goal; sign: 1 | -1; onClose: () => void }) {
  const { insert, toast } = useData()
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const v = parseMoney(value)
  return (
    <Sheet title={`${sign > 0 ? 'Guardar em' : 'Resgatar de'} ${goal.name}`} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={v === null} onClick={async () => {
        if (v !== null && await insert('goal_moves', { goal_id: goal.id, amount_cents: sign * v, date, note: note.trim() })) { toast(sign > 0 ? 'Valor guardado.' : 'Resgate registrado.'); onClose() }
      }}>{sign > 0 ? 'Guardar' : 'Resgatar'}</button></>}>
      <MoneyInput label="Valor" value={value} onChange={setValue} />
      <label className="field"><span className="label">Data</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="field"><span className="label">Observação (opcional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: 13º salário" /></label>
      <p className="hint">Registra a separação do dinheiro; não cria despesa nem mexe no saldo das contas.</p>
    </Sheet>
  )
}

function BudgetEditor({ budget, cur, onClose }: { budget: Budget | null; cur: CtxOpt; onClose: () => void }) {
  const { me, insert, update, remove, toast } = useData()
  const [ctx, setCtx] = useState<FinContext>(budget?.context ?? (cur.writable ? cur.ctx : 'casal'))
  const cats = useModuleCategories('financas', { scope: ctx === 'casal' ? 'casal' : 'pessoal', ownerId: me!.id }).filter((c) => !c.parent_id)
  const [cat, setCat] = useState(budget?.category_id ?? '')
  const [limit, setLimit] = useState(centsToInput(budget?.limit_cents))
  const [confirmDel, setConfirmDel] = useState(false)
  const v = parseMoney(limit)
  return (
    <Sheet title={budget ? 'Editar limite' : 'Novo limite'} onClose={onClose} footer={<>
      {budget && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>}
      <span className="grow" />
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!cat || v === null} onClick={async () => {
        if (v === null) return
        const r = budget ? await update('budgets', budget.id, { limit_cents: v }) : await insert('budgets', { context: ctx, category_id: cat, limit_cents: v })
        if (r) { toast('Limite salvo.'); onClose() }
      }}>Salvar</button></>}>
      {!budget && <div className="field"><span className="label">Aba</span><Segmented value={ctx} onChange={(c) => { setCtx(c); setCat('') }} options={ctxChoices(me!)} /></div>}
      <label className="field"><span className="label">Categoria</span>
        <select value={cat} disabled={!!budget} onChange={(e) => setCat(e.target.value)}><option value="">Escolha</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {!cats.length && <span className="hint">Crie categorias de Finanças em Mais → Categorias.</span>}
        <span className="hint">O limite inclui as subcategorias.</span></label>
      <MoneyInput label="Limite por mês" value={limit} onChange={setLimit} hint="O app avisa aos 80% e quando passar. Nada é bloqueado." />
      {confirmDel && budget && <Confirm title="Excluir limite?" message="Os lançamentos não mudam." onConfirm={async () => { if (await remove('budgets', budget.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}

// ───────────────────────── Regras da casa ─────────────────────────

type Field = { on: string; num?: string; label: string; unit: '%' | '×'; help: string }
const FIELDS: Record<RuleCtx, Field[]> = {
  casal: [
    { on: 'r1_on', label: 'R1 · Limite do cartão até a renda do casal', unit: '%', help: 'Avisa quando o limite de um cartão passa da renda do casal.' },
    { on: 'r2_couple_on', num: 'r2_couple_pct', label: 'R2 · Parcelas do casal no mês', unit: '%', help: 'da renda do casal (soma das parcelas correndo no mês)' },
    { on: 'r3_on', label: 'R3 · Casal no cartão do casal; mesada no Pix/débito', unit: '%', help: 'Avisa despesas do casal fora do cartão do casal e gastos pessoais nele.' },
  ],
  pf: [
    { on: 'fixed_on', num: 'fixed_pct', label: 'Gastos fixos', unit: '%', help: 'da renda, no máximo' },
    { on: 'leisure_on', num: 'leisure_pct', label: 'Lazer', unit: '%', help: 'da renda, no máximo' },
    { on: 'invest_on', num: 'invest_pct', label: 'Investir por mês', unit: '%', help: 'da renda, no mínimo' },
    { on: 'r2_ind_on', num: 'r2_ind_pct', label: 'R2 · Parcelas individuais no mês', unit: '%', help: 'da renda, no máximo' },
    { on: 'reserve_on', num: 'reserve_mult', label: 'Reserva de emergência', unit: '×', help: 'a renda' },
    { on: 'fi_on', num: 'fi_mult', label: 'Patrimônio para viver de renda', unit: '×', help: 'a renda' },
  ],
  empresa: [
    { on: 'profit_on', num: 'profit_pct', label: 'Lucro (não mexer)', unit: '%', help: 'do faturamento, no mínimo' },
    { on: 'prolabore_on', num: 'prolabore_pct', label: 'Teto do pró-labore', unit: '%', help: 'do faturamento' },
    { on: 'tax_on', num: 'tax_pct', label: 'Reserva para impostos', unit: '%', help: 'do faturamento' },
    { on: 'opex_on', num: 'opex_pct', label: 'Custo máximo da operação', unit: '%', help: 'do faturamento' },
  ],
}

export function Regras() {
  const { me } = useData()
  const sections: { ctx: RuleCtx; title: string }[] = [
    { ctx: 'casal', title: 'Casal (vale para os dois)' }, { ctx: 'pf', title: `Pessoais de ${me!.display_name}` },
    ...(me!.has_company ? [{ ctx: 'empresa' as RuleCtx, title: 'Empresa' }] : []),
  ]
  return (
    <>
      <p className="card info">Estes números são <b>referências</b>: o app compara e avisa, mas nunca bloqueia. Mude o que quiser ou desligue a regra.</p>
      {sections.map((s) => <RuleSection key={s.ctx} ctx={s.ctx} title={s.title} />)}
    </>
  )
}

function RuleSection({ ctx, title }: { ctx: RuleCtx; title: string }) {
  const { me, insert, update, toast } = useData()
  const rulesOf = useRules()
  const { row, params } = rulesOf(ctx, me!.id)
  const [p, setP] = useState<Params>(params)
  const dirty = JSON.stringify(p) !== JSON.stringify(params)
  const save = async (next: Params) => {
    const diff = Object.fromEntries(Object.entries(next).filter(([k, v]) => DEFAULTS[ctx][k] !== v))
    const r = row ? await update('house_rules', row.id, { params: diff }) : await insert('house_rules', { context: ctx, params: diff })
    if (r) toast('Referências salvas.')
  }
  return (
    <section>
      <div className="section-head"><h2>{title}</h2>
        <button className="link" onClick={() => { setP(withDefaults(ctx)); save(withDefaults(ctx)) }}>Voltar ao padrão</button></div>
      <div className="card ind-card">
        {FIELDS[ctx].map((f) => (
          <div key={f.on} className="rule-row">
            <label className="toggle grow"><input type="checkbox" checked={p[f.on] !== false} onChange={(e) => setP({ ...p, [f.on]: e.target.checked })} />
              <span><strong>{f.label}</strong><span className="muted small block">{f.num ? `${f.unit === '×' ? `${p[f.num]}×` : `${p[f.num]}%`} ${f.help}` : f.help}</span></span></label>
            {f.num && <input className="rule-num" type="number" inputMode="decimal" min={0} step={f.unit === '×' ? 1 : 1} disabled={p[f.on] === false}
              value={String(p[f.num])} onChange={(e) => setP({ ...p, [f.num!]: Number(e.target.value) })} aria-label={f.label} />}
          </div>
        ))}
      </div>
      {dirty && <button className="btn primary wide" onClick={() => save(p)}>Salvar referências</button>}
    </section>
  )
}
