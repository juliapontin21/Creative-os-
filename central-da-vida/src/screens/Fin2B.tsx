import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { CategoryPicker, Confirm, Dot, Empty, Segmented, Sheet } from '../components/ui'
import { useData } from '../lib/data'
import { addMonths, cashDate, coupleMonth, fmtMoney, isOverdue, monthEnd, monthOf, occurrenceDates, parseMoney, signed, accountOf } from '../lib/finance'
import { canWrite, inCtx, linkOk, METHODS, type CtxOpt } from '../lib/finctx'
import { go } from '../lib/route'
import { sb, friendly } from '../lib/supabase'
import type { FinContext, MonthPlan, PayMethod, Recurrence, Transaction } from '../lib/types'
import { fmtDate, todayISO } from '../lib/util'
import { MoneyInput } from './FinEditors'
import { TxList } from './Financas'
import { usePlanning } from '../lib/usePlanning'
import { useCtxOptions } from '../lib/finctx'

function useCoupleSuggestion(month: string) {
  const casal = useCtxOptions().find((o) => o.ctx === 'casal')!
  return usePlanning(casal, month).coupleSuggestion
}

const centsToInput = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')
const FREQ_LABEL: Record<Recurrence['frequency'], string> = { semanal: 'por semana', mensal: 'por mês', anual: 'por ano' }
const horizonFor = (f: Recurrence['frequency']) => addMonths(todayISO(), f === 'semanal' ? 3 : f === 'anual' ? 24 : 12)
const monthlyEquivalent = (r: Recurrence) => (r.frequency === 'mensal' ? r.amount_cents : r.frequency === 'semanal' ? Math.round((r.amount_cents * 52) / 12) : Math.round(r.amount_cents / 12))

// ───────────────────────── Geração das contas fixas ─────────────────────────

type Gen = ReturnType<typeof useData>
function occurrenceRow(r: Recurrence, d: string): Partial<Transaction> {
  return {
    context: r.context, kind: r.kind, status: 'previsto', amount_cents: r.amount_cents, description: r.description,
    competence_date: d, due_date: d, account_id: r.card_id ? null : r.account_id, card_id: r.card_id, payee_id: r.payee_id,
    category_id: r.category_id, payment_method: r.payment_method, client: r.client, payment_link: r.payment_link, recurrence_id: r.id,
  }
}
async function generate(r: Recurrence, after: string | null, g: Gen) {
  const until = horizonFor(r.frequency)
  const dates = occurrenceDates(r.start_date, r.frequency, after, until, r.end_date)
  const ok = await g.insertIgnore('transactions', dates.map((d) => occurrenceRow(r, d)), 'recurrence_id,competence_date')
  if (ok) await g.update('recurrences', r.id, { generated_until: until })
}
// Apaga as ocorrências futuras ainda não pagas (para regenerar ou encerrar).
async function dropFuture(id: string, from: string) {
  const { error } = await sb.from('transactions').delete().eq('recurrence_id', id).eq('status', 'previsto').gte('competence_date', from)
  return error ? friendly(error.message) : ''
}

// Ao abrir o app, completa as contas fixas até o horizonte (12 meses; 3 para semanais; 24 para anuais).
export function useRecurrenceSync() {
  const g = useData()
  const ran = useRef(false)
  useEffect(() => {
    if (g.loading || !g.me || ran.current) return
    ran.current = true
    ;(async () => {
      for (const r of g.recurrences) {
        if (r.archived_at || !canWrite(r, g.me!.id)) continue
        if (r.end_date && r.generated_until && r.generated_until >= r.end_date) continue
        if (!r.generated_until || r.generated_until < addMonths(horizonFor(r.frequency), -1)) await generate(r, r.generated_until, g)
      }
    })()
  }, [g.loading, g.me]) // eslint-disable-line react-hooks/exhaustive-deps
}

// ───────────────────────── Mês do casal ─────────────────────────

export function MesCasal({ month }: { month: string }) {
  const { me, partner, transactions, month_plans, insert, update, toast } = useData()
  const [edit, setEdit] = useState(false)
  const plan = month_plans.find((p) => p.month.slice(0, 7) === month)
  const people = [me!, ...(partner ? [partner] : [])]
  const incomeOf = (id: string, ref: number) => plan?.income_overrides?.[id] ?? ref
  const live = transactions.filter((t) => t.status !== 'cancelado' && t.kind === 'despesa' && monthOf(cashDate(t)) === month)
  const fixed = live.filter((t) => t.context === 'casal').reduce((s, t) => s + t.amount_cents, 0)
  const cm = coupleMonth(people.map((p) => ({ id: p.id, income: incomeOf(p.id, p.income_ref_cents) })), fixed, plan?.savings_cents ?? 0)
  const usedBy = (id: string) => live.filter((t) => t.context === 'pf' && t.owner_id === id).reduce((s, t) => s + t.amount_cents, 0)
  const missing = people.filter((p) => !incomeOf(p.id, p.income_ref_cents))

  return (
    <>
      {missing.map((p) => (
        <div key={p.id} className="card tip"><div className="grow">
          <strong>{p.id === me!.id ? 'Informe sua renda de referência' : `${p.display_name} ainda não informou a renda`}</strong>
          <p>{p.id === me!.id ? 'Ela é a base da mesada. Ajustes → Minha renda.' : `Ele informa no app dele em Ajustes → Minha renda, ou ajuste só este mês aqui.`}</p></div>
          {p.id === me!.id && <button className="btn" onClick={() => go('ajustes')}>Informar</button>}</div>
      ))}
      <div className="card flow">
        <FlowRow label="Renda do casal" value={cm.total} detail={people.map((p) => `${p.display_name} ${fmtMoney(incomeOf(p.id, p.income_ref_cents))}`).join(' + ')} />
        <FlowRow label="− Contas do casal" value={-cm.fixed} detail="despesas da aba Casal neste mês (pagas e a pagar)" onClick={() => go('financas', 'lancamentos')} />
        <FlowRow label="− Caixinhas e reserva" value={-cm.savings} detail={cm.savings ? 'definido para este mês' : 'ainda não definido'} />
        <div className="flow-total"><span>= Sobra para as mesadas</span><strong className={cm.leftover < 0 ? 'neg' : 'pos'}>{fmtMoney(cm.leftover)}</strong></div>
      </div>
      {cm.leftover < 0 && <p className="card alert-text">As contas do casal e as caixinhas passaram da renda em {fmtMoney(-cm.leftover)} neste mês.</p>}
      <section>
        <div className="section-head"><h2>Mesadas</h2><span className="muted small">proporcionais à renda</span></div>
        <div className="grid2">{cm.allowances.map((a) => {
          const p = people.find((x) => x.id === a.id)!
          const used = usedBy(a.id)
          const pct = a.allowance ? Math.min(100, Math.round((used / a.allowance) * 100)) : used ? 100 : 0
          return (
            <div key={a.id} className="card stat">
              <span className="muted small"><Dot color={p.color} /> {p.display_name} · {Math.round(a.share * 100)}%</span>
              <strong className="stat-value">{fmtMoney(a.allowance)}</strong>
              <div className="bar"><span style={{ width: `${pct}%`, background: used > a.allowance ? 'var(--neg)' : p.color }} /></div>
              <span className="muted small">usado {fmtMoney(used)} · {used > a.allowance ? <b className="neg">passou {fmtMoney(used - a.allowance)}</b> : `resta ${fmtMoney(a.allowance - used)}`}</span>
            </div>
          )
        })}</div>
        <p className="hint">“Usado” soma as despesas pessoais de cada um no mês. A mesada é gasta sem precisar de acordo.</p>
      </section>
      <button className="btn wide" onClick={() => setEdit(true)}><Icon name="settings" />Ajustar este mês</button>
      {edit && <PlanEditor month={month} plan={plan} people={people} onClose={() => setEdit(false)}
        onSave={async (row) => {
          const r = plan ? await update('month_plans', plan.id, row) : await insert('month_plans', { ...row, month: `${month}-01`, context: 'casal' })
          if (r) { toast('Mês atualizado.'); setEdit(false) }
        }} />}
    </>
  )
}

function FlowRow({ label, value, detail, onClick }: { label: string; value: number; detail: string; onClick?: () => void }) {
  return (
    <button className="flow-row" onClick={onClick} disabled={!onClick}>
      <span className="grow"><span>{label}</span><span className="muted small">{detail}</span></span>
      <strong>{fmtMoney(value)}</strong>
    </button>
  )
}

function PlanEditor({ month, plan, people, onClose, onSave }: {
  month: string; plan: MonthPlan | undefined; people: { id: string; display_name: string; income_ref_cents: number }[]
  onClose: () => void; onSave: (row: Partial<MonthPlan>) => void
}) {
  const [savings, setSavings] = useState(centsToInput(plan?.savings_cents) || '0')
  const [incomes, setIncomes] = useState<Record<string, string>>(Object.fromEntries(people.map((p) => [p.id, plan?.income_overrides?.[p.id] !== undefined ? centsToInput(plan.income_overrides[p.id]) : ''])))
  const [notes, setNotes] = useState(plan?.notes ?? '')
  const suggestion = useCoupleSuggestion(month)
  const sv = savings.trim() === '0' || !savings.trim() ? 0 : parseMoney(savings)
  const parsed = Object.entries(incomes).map(([id, v]) => [id, v.trim() ? parseMoney(v) : undefined] as const)
  const valid = sv !== null && parsed.every(([, v]) => v !== null)
  const [y, m] = month.split('-').map(Number)
  return (
    <Sheet title={`Ajustar ${new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}`} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!valid} onClick={() => onSave({
        savings_cents: sv ?? 0, notes,
        income_overrides: Object.fromEntries(parsed.filter(([, v]) => typeof v === 'number').map(([id, v]) => [id, v as number])),
      })}>Salvar</button></>}>
      <MoneyInput label="Caixinhas e reserva de emergência" value={savings} onChange={setSavings} hint="Quanto vai para as caixinhas e a reserva neste mês." />
      {suggestion > 0 && <p className="hint">Pelas metas e prazos das caixinhas do casal: {fmtMoney(suggestion)} por mês. <button className="link inline" onClick={() => setSavings(centsToInput(suggestion))}>Usar</button></p>}
      {people.map((p) => (
        <MoneyInput key={p.id} label={`Renda de ${p.display_name} neste mês`} value={incomes[p.id]} onChange={(v) => setIncomes({ ...incomes, [p.id]: v })}
          hint={`Deixe vazio para usar a referência (${fmtMoney(p.income_ref_cents)}). Preencha quando entrar dinheiro extra.`} />
      ))}
      <label className="field"><span className="label">Anotações do mês</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
    </Sheet>
  )
}

// ───────────────────────── Contas fixas e assinaturas ─────────────────────────

export function Fixas({ cur }: { cur: CtxOpt }) {
  const { recurrences, transactions } = useData()
  const [only, setOnly] = useState<'todas' | 'assinaturas'>('todas')
  const [edit, setEdit] = useState<Recurrence | 'new' | null>(null)
  const today = todayISO()
  const list = recurrences.filter((r) => !r.archived_at && inCtx(r, cur) && (only === 'todas' || r.is_subscription))
  const nextOf = (r: Recurrence) => transactions.filter((t) => t.recurrence_id === r.id && t.status === 'previsto' && t.competence_date >= today)
    .reduce<string | null>((m, t) => (!m || t.competence_date < m ? t.competence_date : m), null)
  const active = list.filter((r) => !r.end_date || r.end_date >= today)
  const monthly = active.filter((r) => r.kind === 'despesa').reduce((s, r) => s + monthlyEquivalent(r), 0)
  const rows = [...list].sort((a, b) => (nextOf(a) ?? '9999').localeCompare(nextOf(b) ?? '9999'))
  return (
    <>
      <div className="chips">
        <Segmented value={only} onChange={setOnly} options={[{ id: 'todas', label: 'Contas fixas' }, { id: 'assinaturas', label: 'Assinaturas' }]} />
      </div>
      {active.length > 0 && <p className="muted small pad">{active.length} ativas · cerca de {fmtMoney(monthly)} por mês em despesas fixas</p>}
      {rows.length ? <div className="list">{rows.map((r) => {
        const next = nextOf(r)
        const ended = r.end_date && r.end_date < today
        return (
          <div key={r.id} className={'card tx' + (ended ? ' canceled' : '')}>
            <button className="tx-main" onClick={() => setEdit(r)}>
              <span className="grow tx-text">
                <strong>{r.description} {r.is_subscription && <span className="badge">Assinatura</span>}</strong>
                <span className="muted small">{ended ? `encerrada em ${fmtDate(r.end_date)}` : next ? `próxima ${fmtDate(next)}` : 'sem próximas'} · {r.frequency}</span>
              </span>
              <span className="tx-amount"><strong className={r.kind === 'receita' ? 'pos' : ''}>{fmtMoney(r.amount_cents)}</strong><span className="muted small">{FREQ_LABEL[r.frequency]}</span></span>
            </button>
            {r.is_subscription && r.service_url && <a className="icon-btn" href={r.service_url} target="_blank" rel="noreferrer" aria-label="Abrir serviço"><Icon name="right" size={18} /></a>}
          </div>
        )
      })}</div> : <Empty icon="calendar" title={only === 'assinaturas' ? 'Nenhuma assinatura' : 'Nenhuma conta fixa'} text="Aluguel, condomínio, academia, streaming… cadastre uma vez e o app lança os próximos meses sozinho." />}
      {cur.writable && <button className="fab" aria-label="Nova conta fixa" onClick={() => setEdit('new')}><Icon name="plus" size={26} /></button>}
      {edit && <RecEditor rec={edit === 'new' ? null : edit} cur={cur} subscription={only === 'assinaturas'} onClose={() => setEdit(null)} />}
    </>
  )
}

function RecEditor({ rec, cur, subscription, onClose }: { rec: Recurrence | null; cur: CtxOpt; subscription: boolean; onClose: () => void }) {
  const g = useData()
  const { me, accounts, cards, payees, profiles, insert, update, remove, reload, toast } = g
  const meId = me!.id
  const editable = !rec || canWrite(rec, meId)
  const startCtx: FinContext = rec?.context ?? (cur.writable ? cur.ctx : 'pf')
  const couple = cards.find((c) => c.is_couple_card && !c.archived_at)
  const [ctx, setCtx] = useState<FinContext>(startCtx)
  const [kind, setKind] = useState<Recurrence['kind']>(rec?.kind ?? 'despesa')
  const [amount, setAmount] = useState(centsToInput(rec?.amount_cents))
  const [description, setDescription] = useState(rec?.description ?? '')
  const [frequency, setFrequency] = useState<Recurrence['frequency']>(rec?.frequency ?? 'mensal')
  const [start, setStart] = useState(rec?.start_date ?? todayISO())
  const [end, setEnd] = useState(rec?.end_date ?? '')
  const [payWith, setPayWith] = useState<'conta' | 'cartao'>(rec ? (rec.card_id ? 'cartao' : 'conta') : startCtx === 'casal' && couple ? 'cartao' : 'conta')
  const [method, setMethod] = useState<PayMethod>(rec && rec.payment_method !== 'cartao' ? rec.payment_method : 'pix')
  const [accountId, setAccountId] = useState(rec?.account_id ?? '')
  const [cardId, setCardId] = useState(rec?.card_id ?? (startCtx === 'casal' ? couple?.id ?? '' : ''))
  const [payeeId, setPayeeId] = useState(rec?.payee_id ?? '')
  const [client, setClient] = useState(rec?.client ?? '')
  const [category, setCategory] = useState<string | null>(rec?.category_id ?? null)
  const [isSub, setIsSub] = useState(rec?.is_subscription ?? subscription)
  const [serviceUrl, setServiceUrl] = useState(rec?.service_url ?? '')
  const [vaultUrl, setVaultUrl] = useState(rec?.vault_url ?? '')
  const [link, setLink] = useState(rec?.payment_link ?? '')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<'end' | 'del' | null>(null)
  const owner = ctx === 'casal' ? meId : rec?.owner_id ?? meId
  const usable = <T extends { context: FinContext; owner_id: string; archived_at: string | null }>(l: T[]) =>
    l.filter((x) => !x.archived_at && linkOk(ctx, owner, x) && (x.context !== 'pf' || x.owner_id === meId))
  const cents = parseMoney(amount)
  const useCard = kind === 'despesa' && payWith === 'cartao'
  const valid = cents !== null && description.trim() !== '' && (!useCard || cardId !== '') && (!end || end >= start)
  const ctxOpts = [...(me!.has_company ? [{ id: 'empresa' as FinContext, label: 'Empresa' }] : []), { id: 'pf' as FinContext, label: me!.display_name }, { id: 'casal' as FinContext, label: 'Casal' }]
  const ownerName = profiles.find((p) => p.id === rec?.owner_id)?.display_name

  const save = async () => {
    if (!valid || cents === null) return
    setBusy(true)
    const row: Partial<Recurrence> = {
      context: ctx, kind, amount_cents: cents, description: description.trim(), frequency, start_date: start, end_date: end || null,
      account_id: useCard ? null : accountId || null, card_id: useCard ? cardId : null, payment_method: useCard ? 'cartao' : method,
      payee_id: kind === 'despesa' ? payeeId || null : null, client: kind === 'receita' ? client.trim() : '', category_id: category,
      is_subscription: isSub, service_url: isSub ? serviceUrl.trim() : '', vault_url: isSub ? vaultUrl.trim() : '', payment_link: link.trim(),
    }
    let saved: Recurrence | null
    if (rec) {
      // Mudou a conta fixa: as próximas ocorrências não pagas são refeitas com os dados novos.
      const err = await dropFuture(rec.id, todayISO())
      if (err) { toast(err); setBusy(false); return }
      saved = await update('recurrences', rec.id, { ...row, generated_until: null })
    } else saved = await insert('recurrences', row)
    if (saved) {
      const y = new Date(); y.setDate(y.getDate() - 1)
      await generate(saved, rec ? todayISO(y) : null, g)
      await reload()
      toast(rec ? 'Conta fixa atualizada; os próximos lançamentos foram refeitos.' : 'Conta fixa criada; os próximos meses já foram lançados.')
      onClose()
    }
    setBusy(false)
  }
  const endNow = async () => {
    if (!rec) return
    const today = todayISO()
    const err = await dropFuture(rec.id, today)
    if (err) return toast(err)
    if (await update('recurrences', rec.id, { end_date: today < rec.start_date ? rec.start_date : today })) { await reload(); toast('Conta fixa encerrada.'); onClose() }
  }
  const del = async () => {
    if (!rec) return
    const err = await dropFuture(rec.id, '0001-01-01')
    if (err) return toast(err)
    if (await remove('recurrences', rec.id)) { await reload(); toast('Conta fixa excluída; o que já foi pago continua no histórico.'); onClose() }
  }

  return (
    <Sheet title={rec ? (editable ? 'Editar conta fixa' : 'Conta fixa') : isSub ? 'Nova assinatura' : 'Nova conta fixa'} onClose={onClose} footer={<>
      {rec && editable && <button className="btn small" onClick={() => setConfirm('end')}>Encerrar</button>}
      {rec && editable && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirm('del')}><Icon name="trash" /></button>}
      <span className="grow" />
      <button className="btn" onClick={onClose}>{editable ? 'Cancelar' : 'Fechar'}</button>
      {editable && <button className="btn primary" disabled={!valid || busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button>}
    </>}>
      {!editable && <p className="card warn">Cadastrada por {ownerName}. Você pode ver, mas só {ownerName} edita.</p>}
      <fieldset disabled={!editable} className="plain">
        <Segmented value={kind} onChange={setKind} options={[{ id: 'despesa', label: 'Despesa fixa' }, { id: 'receita', label: 'Receita fixa' }]} />
        <div className="field"><span className="label">Aba</span>
          <Segmented value={ctx} disabled={!!rec && rec.owner_id !== meId} options={ctxOpts}
            onChange={(c) => { setCtx(c); setAccountId(''); setPayeeId(''); setCategory(null); setCardId(c === 'casal' ? couple?.id ?? '' : ''); if (c === 'casal' && couple) setPayWith('cartao') }} /></div>
        <MoneyInput label="Valor" value={amount} onChange={setAmount} />
        <label className="field"><span className="label">Descrição</span><input maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isSub ? 'Ex.: Netflix' : 'Ex.: Aluguel'} /></label>
        <div className="row2">
          <label className="field"><span className="label">Repete</span>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as Recurrence['frequency'])}>
              <option value="mensal">Todo mês</option><option value="semanal">Toda semana</option><option value="anual">Todo ano</option></select></label>
          <label className="field"><span className="label">{frequency === 'anual' ? 'Renova em' : 'Primeira data'}</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        </div>
        <label className="field"><span className="label">Termina em (opcional)</span><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        {kind === 'despesa' ? (<>
          <Segmented value={payWith} onChange={setPayWith} options={[{ id: 'conta', label: 'Conta (Pix, débito…)' }, { id: 'cartao', label: 'Cartão de crédito' }]} />
          {useCard ? (
            <label className="field"><span className="label">Cartão</span><select value={cardId} onChange={(e) => setCardId(e.target.value)}><option value="">Escolha</option>
              {usable(cards).map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_couple_card ? ' (cartão do casal)' : ''}</option>)}</select></label>
          ) : (
            <div className="row2">
              <label className="field"><span className="label">Conta</span><select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Sem conta</option>
                {usable(accounts).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <label className="field"><span className="label">Forma</span><select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            </div>
          )}
          <label className="field"><span className="label">Favorecido</span><select value={payeeId} onChange={(e) => setPayeeId(e.target.value)}><option value="">Nenhum</option>
            {usable(payees).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        </>) : (
          <div className="row2">
            <label className="field"><span className="label">Entra na conta</span><select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Sem conta</option>
              {usable(accounts).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="field"><span className="label">Cliente ou fonte</span><input value={client} onChange={(e) => setClient(e.target.value)} /></label>
          </div>
        )}
        <CategoryPicker module="financas" value={category} onChange={setCategory} scope={ctx === 'casal' ? 'casal' : 'pessoal'} ownerId={rec?.owner_id ?? meId} />
        {kind === 'despesa' && <label className="toggle"><input type="checkbox" checked={isSub} onChange={(e) => setIsSub(e.target.checked)} />É uma assinatura (streaming, app, curso…)</label>}
        {isSub && <>
          <label className="field"><span className="label">Link do serviço</span><input type="url" value={serviceUrl} onChange={(e) => setServiceUrl(e.target.value)} placeholder="https://" /></label>
          <label className="field"><span className="label">Link no gerenciador de senhas</span><input type="url" value={vaultUrl} onChange={(e) => setVaultUrl(e.target.value)} placeholder="https:// (Bitwarden, 1Password, Senhas do iCloud…)" />
            <span className="hint">Nunca escreva a senha aqui: guarde só o link para o item no seu gerenciador de senhas.</span></label>
          {rec?.vault_url && <a className="btn wide" href={rec.vault_url} target="_blank" rel="noreferrer">Abrir no gerenciador de senhas</a>}
        </>}
        {!isSub && <label className="field"><span className="label">Link de pagamento (opcional)</span><input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></label>}
        <p className="hint">O app lança automaticamente os próximos {frequency === 'semanal' ? '3 meses' : frequency === 'anual' ? '2 anos' : '12 meses'} como “previsto”. Ao editar, as próximas ocorrências não pagas são refeitas; as já pagas não mudam.</p>
      </fieldset>
      {confirm === 'end' && <Confirm title="Encerrar conta fixa?" confirm="Encerrar" message="Ela para de gerar lançamentos a partir de hoje. As próximas ocorrências não pagas são apagadas; o histórico fica." onConfirm={endNow} onClose={() => setConfirm(null)} />}
      {confirm === 'del' && <Confirm title="Excluir conta fixa?" message="Todas as ocorrências não pagas são apagadas. As já pagas continuam como lançamentos normais." onConfirm={del} onClose={() => setConfirm(null)} />}
    </Sheet>
  )
}

// ───────────────────────── Calendário financeiro ─────────────────────────

export function Calendario({ cur, month, onOpen }: { cur: CtxOpt; month: string; onOpen: (t: Transaction) => void }) {
  const { transactions } = useData()
  const today = todayISO()
  const [sel, setSel] = useState(monthOf(today) === month ? today : `${month}-01`)
  useEffect(() => { setSel(monthOf(today) === month ? today : `${month}-01`) }, [month, today])
  const byDay = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of transactions) {
      if (!inCtx(t, cur) || t.status === 'cancelado') continue
      const d = cashDate(t)
      if (monthOf(d) !== month) continue
      m.set(d, [...(m.get(d) ?? []), t])
    }
    return m
  }, [transactions, cur, month])
  const [y, mm] = month.split('-').map(Number)
  const first = new Date(y, mm - 1, 1).getDay()
  const days = Number(monthEnd(month).slice(8))
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
  const list = byDay.get(sel) ?? []
  return (
    <>
      <div className="cal">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="cal-wd">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />
          const txs = byDay.get(d) ?? []
          const kinds = new Set<string>(txs.map((t) => t.kind === 'receita' ? 'in' : t.status === 'realizado' ? 'paid' : isOverdue(t, today) ? 'late' : t.kind === 'transferencia' ? 'paid' : 'out'))
          return (
            <button key={d} className={'cal-day' + (d === sel ? ' on' : '') + (d === today ? ' today' : '')} onClick={() => setSel(d)} aria-label={fmtDate(d, { day: 'numeric', month: 'long' })}>
              <span>{Number(d.slice(8))}</span>
              <span className="cal-dots">{['late', 'out', 'in', 'paid'].filter((k) => kinds.has(k)).map((k) => <i key={k} className={'cd-' + k} />)}</span>
            </button>
          )
        })}
      </div>
      <p className="cal-legend muted small"><i className="cd-out" /> a pagar <i className="cd-late" /> vencido <i className="cd-in" /> a receber/recebido <i className="cd-paid" /> pago</p>
      <section>
        <div className="section-head"><h2>{fmtDate(sel, { weekday: 'long', day: 'numeric', month: 'long' })}</h2></div>
        {list.length ? <TxList txs={list} onOpen={onOpen} /> : <p className="muted pad">Nada neste dia.</p>}
      </section>
    </>
  )
}

// ───────────────────────── Empresa: visão anual ─────────────────────────

export function EmpresaAno({ cur, onOpen }: { cur: CtxOpt; onOpen: (t: Transaction) => void }) {
  const { accounts, cards, transactions } = useData()
  const today = todayISO()
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const accs = accounts.filter((a) => inCtx(a, cur))
  const ids = new Set(accs.map((a) => a.id))
  const txs = transactions.filter((t) => inCtx(t, cur) && t.status !== 'cancelado')
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  const rows = months.map((m) => {
    const end = monthEnd(m)
    const inM = txs.filter((t) => monthOf(cashDate(t)) === m)
    const sum = (k: string, done: boolean) => inM.filter((t) => t.kind === k && (t.status === 'realizado') === done).reduce((s, t) => s + t.amount_cents, 0)
    // Saldo projetado: saldo inicial + tudo (pago e previsto) que passa pelas contas da empresa até o fim do mês.
    const balance = accs.reduce((s, a) => s + a.initial_balance_cents, 0) + transactions.reduce((s, t) => {
      if (t.status === 'cancelado') return s
      const acc = accountOf(t, cards)
      if (!acc || !ids.has(acc)) return s
      const a = accs.find((x) => x.id === acc)!
      const d = cashDate(t)
      return d >= a.initial_date && d <= end ? s + signed(t) : s
    }, 0)
    const known = accs.length > 0 && accs.some((a) => a.initial_date <= end)
    return { m, inDone: sum('receita', true), inPlan: sum('receita', false), outDone: sum('despesa', true), outPlan: sum('despesa', false), balance: known ? balance : null }
  })
  const receivable = new Map<string, { total: number; count: number; due: string; late: boolean }>()
  for (const t of txs) {
    if (t.kind !== 'receita' || t.status !== 'previsto') continue
    const k = t.client || t.description
    const r = receivable.get(k) ?? { total: 0, count: 0, due: t.due_date, late: false }
    r.total += t.amount_cents; r.count++; r.due = t.due_date < r.due ? t.due_date : r.due; r.late ||= isOverdue(t, today)
    receivable.set(k, r)
  }
  const toPay = txs.filter((t) => t.kind === 'despesa' && t.status === 'previsto').sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 8)
  const short = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return (
    <>
      <div className="month-pick">
        <button className="icon-btn" aria-label="Ano anterior" onClick={() => setYear(year - 1)}><Icon name="back" /></button>
        <strong>{year}</strong>
        <button className="icon-btn" aria-label="Próximo ano" onClick={() => setYear(year + 1)}><Icon name="right" /></button>
      </div>
      {!accs.length && <p className="card info">Cadastre a conta da empresa em Contas, com o saldo inicial, para ver o saldo projetado.</p>}
      <div className="card year-table">
        <div className="yt-row yt-head"><span>Mês</span><span>Receitas</span><span>Despesas</span><span>Saldo</span></div>
        {rows.map((r) => (
          <div key={r.m} className={'yt-row' + (r.m === today.slice(0, 7) ? ' now' : '') + (r.m > today.slice(0, 7) ? ' future' : '')}>
            <span>{short(r.m)}</span>
            <span><b className="pos">{fmtMoney(r.inDone)}</b>{r.inPlan > 0 && <small>+{fmtMoney(r.inPlan)}</small>}</span>
            <span><b>{fmtMoney(r.outDone)}</b>{r.outPlan > 0 && <small>+{fmtMoney(r.outPlan)}</small>}</span>
            <span><b className={r.balance !== null && r.balance < 0 ? 'neg' : ''}>{r.balance === null ? '—' : fmtMoney(r.balance)}</b></span>
          </div>
        ))}
      </div>
      <p className="hint">Valores em destaque já aconteceram; os menores (+) estão previstos. O saldo considera também pró-labore e transferências.</p>
      <section>
        <div className="section-head"><h2>A receber por cliente</h2></div>
        {receivable.size ? <div className="list">{[...receivable.entries()].sort((a, b) => a[1].due.localeCompare(b[1].due)).map(([k, r]) => (
          <div key={k} className="card list-link">
            <span className="grow"><strong>{k}</strong><span className="muted small">{r.count} {r.count === 1 ? 'recebimento' : 'recebimentos'} · próximo {fmtDate(r.due)}{r.late ? ' · atrasado' : ''}</span></span>
            <strong className={r.late ? 'neg' : 'pos'}>{fmtMoney(r.total)}</strong>
          </div>
        ))}</div> : <p className="muted pad">Nada a receber.</p>}
      </section>
      <section>
        <div className="section-head"><h2>A pagar</h2></div>
        {toPay.length ? <TxList txs={toPay} onOpen={onOpen} /> : <p className="muted pad">Nada a pagar.</p>}
      </section>
    </>
  )
}
