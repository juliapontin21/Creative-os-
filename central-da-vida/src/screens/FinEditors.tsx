import { useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { CategoryPicker, ColorPicker, Confirm, Segmented, Sheet } from '../components/ui'
import { useData } from '../lib/data'
import { addMonths, fmtMoney, parseMoney, splitInstallments } from '../lib/finance'
import { canWrite, linkOk, METHODS, methodLabel, useCtxOptions, type CtxOpt } from '../lib/finctx'
import type { Account, Card, FinContext, Payee, PayMethod, Transaction } from '../lib/types'
import { fmtDate, PALETTE, todayISO } from '../lib/util'

const uuid = () => crypto.randomUUID()
const centsToInput = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')

export function MoneyInput({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const bad = value.trim() !== '' && parseMoney(value) === null
  return (
    <label className="field">
      <span className="label">{label}</span>
      <div className="money-input">
        <span>R$</span>
        <input inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {bad ? <span className="hint err">Valor inválido. Use, por exemplo, 1.234,56.</span> : hint && <span className="hint">{hint}</span>}
    </label>
  )
}

function CtxSelect({ value, onChange, disabled }: { value: string; onChange: (o: CtxOpt) => void; disabled?: boolean }) {
  const opts = useCtxOptions().filter((o) => o.writable)
  return (
    <div className="field">
      <span className="label">Aba</span>
      <Segmented value={value} disabled={disabled} onChange={(k) => onChange(opts.find((o) => o.key === k)!)}
        options={opts.map((o) => ({ id: o.key, label: o.label }))} />
    </div>
  )
}

const keyOf = (ctx: FinContext, owner: string) => (ctx === 'casal' ? 'casal' : `${ctx}:${owner}`)

function Footer({ onClose, onSave, saveLabel = 'Salvar', disabled, left }: { onClose: () => void; onSave?: () => void; saveLabel?: string; disabled?: boolean; left?: ReactNode }) {
  return <>
    {left}
    <span className="grow" />
    <button className="btn" onClick={onClose}>{onSave ? 'Cancelar' : 'Fechar'}</button>
    {onSave && <button className="btn primary" disabled={disabled} onClick={onSave}>{saveLabel}</button>}
  </>
}

// ───────────────────────── Lançamento ─────────────────────────

type Kind = Transaction['kind']

export function TxEditor({ tx, preset, onClose }: { tx: Transaction | null; preset: { kind: Kind; ctx: CtxOpt }; onClose: () => void }) {
  const { me, accounts, cards, payees, transactions, profiles, insert, update, insertMany, updateMatch, removeMatch, remove, toast } = useData()
  const meId = me!.id
  const editable = !tx || (canWrite(tx, meId) && (tx.kind !== 'transferencia' || tx.owner_id === meId))
  const pair = tx?.transfer_group ? transactions.filter((t) => t.transfer_group === tx.transfer_group) : []
  const outLeg = pair.find((t) => t.direction === 'saida')
  const inLeg = pair.find((t) => t.direction === 'entrada')
  const startCtx = tx ? { ctx: tx.context, owner: tx.owner_id } : (preset.ctx.writable ? preset.ctx : { ctx: 'pf' as FinContext, owner: meId })

  const [kind, setKind] = useState<Kind>(tx?.kind ?? preset.kind)
  const [ctx, setCtx] = useState<{ ctx: FinContext; owner: string }>({ ctx: startCtx.ctx, owner: startCtx.ctx === 'casal' ? meId : startCtx.owner })
  const [amount, setAmount] = useState(centsToInput(tx?.amount_cents))
  const [description, setDescription] = useState(tx?.description ?? '')
  const [date, setDate] = useState(tx?.competence_date ?? todayISO())
  const [due, setDue] = useState(tx?.due_date ?? '')
  const [done, setDone] = useState(tx ? tx.status === 'realizado' : false)
  const [canceled, setCanceled] = useState(tx?.status === 'cancelado')
  const couple = cards.find((c) => c.is_couple_card && !c.archived_at)
  const [payWith, setPayWith] = useState<'conta' | 'cartao'>(tx ? (tx.card_id ? 'cartao' : 'conta') : startCtx.ctx === 'casal' && couple ? 'cartao' : 'conta')
  const [method, setMethod] = useState<PayMethod>(tx && tx.payment_method !== 'cartao' ? tx.payment_method : 'pix')
  const [accountId, setAccountId] = useState<string>(tx?.account_id ?? outLeg?.account_id ?? '')
  const [toAccountId, setToAccountId] = useState<string>(inLeg?.account_id ?? '')
  const [cardId, setCardId] = useState<string>(tx?.card_id ?? (startCtx.ctx === 'casal' ? couple?.id ?? '' : ''))
  const [installments, setInstallments] = useState(1)
  const [payeeId, setPayeeId] = useState<string>(tx?.payee_id ?? '')
  const [client, setClient] = useState(tx?.client ?? '')
  const [category, setCategory] = useState<string | null>(tx?.category_id ?? null)
  const [link, setLink] = useState(tx?.payment_link ?? '')
  const [tags, setTags] = useState((tx?.tags ?? []).join(', '))
  const [notes, setNotes] = useState(tx?.notes ?? '')
  const [more, setMore] = useState(Boolean(tx?.payment_link || tx?.notes || tx?.tags?.length))
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const isTransfer = kind === 'transferencia'
  // Mesma regra do banco; no Casal, itens pessoais só os de quem está lançando.
  const usable = <T extends { context: FinContext; owner_id: string; archived_at: string | null }>(list: T[]) =>
    list.filter((x) => !x.archived_at && linkOk(ctx.ctx, ctx.ctx === 'casal' ? meId : ctx.owner, x) && (x.context !== 'pf' || x.owner_id === meId))
  const accOpts = usable(accounts)
  const cardOpts = usable(cards)
  const payeeOpts = usable(payees)
  const myAccounts = accounts.filter((a) => !a.archived_at && (a.context === 'casal' || a.owner_id === meId))
  const cents = parseMoney(amount)
  const owner = profiles.find((p) => p.id === tx?.owner_id)

  const r3hint = kind === 'despesa' && couple ? (
    ctx.ctx === 'casal' && !(payWith === 'cartao' && cardId === couple.id) ? `Regra da casa: despesas do casal vão no ${couple.name}.`
      : ctx.ctx !== 'casal' && payWith === 'cartao' && cardId === couple.id ? `Regra da casa: o ${couple.name} é só para despesas do casal; gastos da mesada vão no Pix ou débito.` : ''
  ) : ''

  const valid = cents !== null && description.trim() !== '' && (
    isTransfer ? accountId !== '' && toAccountId !== '' && accountId !== toAccountId
      : kind === 'despesa' && payWith === 'cartao' ? cardId !== '' : true)

  const paidDate = (d: string) => (d <= todayISO() ? d : todayISO())

  const save = async () => {
    if (!valid || cents === null) return
    setBusy(true)
    const status: Transaction['status'] = canceled ? 'cancelado' : done ? 'realizado' : 'previsto'
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
    const common = { description: description.trim(), payment_link: link.trim(), tags: tagList, notes, category_id: category }
    let ok = false
    if (isTransfer) {
      const from = accounts.find((a) => a.id === accountId)!
      const to = accounts.find((a) => a.id === toAccountId)!
      const legs = { amount_cents: cents, competence_date: date, due_date: date, status, paid_date: status === 'realizado' ? paidDate(date) : null, description: description.trim(), notes }
      if (tx?.transfer_group) {
        ok = !!(await updateMatch('transactions', { transfer_group: tx.transfer_group, direction: 'saida' }, { ...legs, account_id: from.id })) &&
          !!(await updateMatch('transactions', { transfer_group: tx.transfer_group, direction: 'entrada' }, { ...legs, account_id: to.id }))
      } else {
        const g = uuid()
        ok = !!(await insertMany('transactions', [
          { ...legs, kind: 'transferencia', direction: 'saida', context: from.context, account_id: from.id, transfer_group: g },
          { ...legs, kind: 'transferencia', direction: 'entrada', context: to.context, account_id: to.id, transfer_group: g },
        ]))
      }
    } else {
      const useCard = kind === 'despesa' && payWith === 'cartao'
      const row: Partial<Transaction> = {
        ...common, kind, context: ctx.ctx, amount_cents: cents, competence_date: date,
        // No cartão, o banco calcula o vencimento da fatura; ao editar sem mudar a data, mantém o atual.
        due_date: useCard ? (tx?.card_id === cardId && tx.competence_date === date ? tx.due_date : date) : due || date, status,
        paid_date: status === 'realizado' ? (tx?.paid_date ?? paidDate(useCard ? tx?.due_date ?? date : due || date)) : null,
        account_id: useCard ? null : accountId || null, card_id: useCard ? cardId : null,
        payment_method: useCard ? 'cartao' : kind === 'receita' ? (method === 'cartao' ? 'pix' : method) : method,
        payee_id: kind === 'despesa' ? payeeId || null : null, client: kind === 'receita' ? client.trim() : '',
      }
      if (tx) ok = !!(await update('transactions', tx.id, row))
      else if (useCard && installments > 1) {
        const g = uuid()
        const parts = splitInstallments(cents, installments)
        ok = !!(await insertMany('transactions', parts.map((v, i) => ({
          ...row, amount_cents: v, competence_date: addMonths(date, i), due_date: addMonths(date, i),
          installment_group: g, installment_no: i + 1, installment_total: installments,
        }))))
      } else ok = !!(await insert('transactions', row))
    }
    setBusy(false)
    if (ok) { toast('Lançamento salvo.'); onClose() }
  }

  const del = async (all: boolean) => {
    if (!tx) return
    const ok = tx.transfer_group ? await removeMatch('transactions', { transfer_group: tx.transfer_group })
      : all && tx.installment_group ? await removeMatch('transactions', { installment_group: tx.installment_group })
        : await remove('transactions', tx.id)
    if (ok) { toast('Lançamento excluído.'); onClose() }
  }

  const title = tx ? (editable ? 'Editar lançamento' : 'Lançamento') : kind === 'despesa' ? 'Nova despesa' : kind === 'receita' ? 'Nova receita' : 'Nova transferência'
  const ro = !editable

  return (
    <Sheet title={title} onClose={onClose} footer={<Footer onClose={onClose} onSave={ro ? undefined : save} disabled={!valid || busy}
      saveLabel={busy ? 'Salvando…' : 'Salvar'}
      left={tx && editable && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>} />}>
      {ro && <p className="card warn">Lançado por {owner?.display_name}. Você pode ver, mas só {owner?.display_name} edita.</p>}
      <fieldset disabled={ro} className="plain">
        {!tx && <Segmented value={kind} onChange={setKind} options={[{ id: 'despesa', label: 'Despesa' }, { id: 'receita', label: 'Receita' }, { id: 'transferencia', label: 'Transferência' }]} />}
        {!isTransfer && <CtxSelect value={keyOf(ctx.ctx, ctx.owner)} disabled={!!tx && tx.owner_id !== meId}
          onChange={(o) => { setCtx({ ctx: o.ctx, owner: o.ctx === 'casal' ? meId : o.owner }); setAccountId(''); setPayeeId(''); setCategory(null); setCardId(o.ctx === 'casal' ? couple?.id ?? '' : ''); if (o.ctx === 'casal' && couple) setPayWith('cartao') }} />}
        <MoneyInput label={!tx && payWith === 'cartao' && kind === 'despesa' && installments > 1 ? 'Valor total da compra' : 'Valor'} value={amount} onChange={setAmount}
          hint={!tx && installments > 1 && cents ? `${installments}x de ${fmtMoney(splitInstallments(cents, installments)[1])}` : undefined} />
        <label className="field"><span className="label">Descrição</span>
          <input maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={kind === 'receita' ? 'Ex.: Campanha UGC marca X' : 'Ex.: Mercado'} /></label>

        {isTransfer ? (
          <div className="row2">
            <label className="field"><span className="label">De</span>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Escolha</option>
                {myAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.context === 'empresa' ? ' (Empresa)' : a.context === 'casal' ? ' (Casal)' : ''}</option>)}</select></label>
            <label className="field"><span className="label">Para</span>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}><option value="">Escolha</option>
                {myAccounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}{a.context === 'empresa' ? ' (Empresa)' : a.context === 'casal' ? ' (Casal)' : ''}</option>)}</select></label>
          </div>
        ) : kind === 'despesa' ? (<>
          <div className="field"><span className="label">Pagar com</span>
            <Segmented value={payWith} onChange={setPayWith} disabled={!!tx?.installment_group} options={[{ id: 'conta', label: 'Conta (Pix, débito…)' }, { id: 'cartao', label: 'Cartão de crédito' }]} /></div>
          {payWith === 'cartao' ? (<>
            <label className="field"><span className="label">Cartão</span>
              <select value={cardId} onChange={(e) => setCardId(e.target.value)} disabled={!!tx?.installment_group}><option value="">Escolha o cartão</option>
                {cardOpts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_couple_card ? ' (cartão do casal)' : ''}</option>)}</select>
              {!cardOpts.length && <span className="hint">Cadastre um cartão em Finanças → Contas.</span>}</label>
            {!tx && <label className="field"><span className="label">Parcelas</span>
              <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x`}</option>)}</select></label>}
            {tx?.installment_group && <p className="hint">Parcela {tx.installment_no} de {tx.installment_total}. Alterações valem só para esta parcela.</p>}
          </>) : (
            <div className="row2">
              <label className="field"><span className="label">Conta</span>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Sem conta</option>
                  {accOpts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <label className="field"><span className="label">Forma</span>
                <select value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
                  {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            </div>
          )}
          {r3hint && <p className="hint warn-text">{r3hint}</p>}
        </>) : (
          <div className="row2">
            <label className="field"><span className="label">Entra na conta</span>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Sem conta</option>
                {accOpts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="field"><span className="label">Cliente ou fonte</span>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex.: Marca X" /></label>
          </div>
        )}

        <div className="row2">
          <label className="field"><span className="label">{kind === 'despesa' && payWith === 'cartao' ? 'Data da compra' : 'Data'}</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          {!isTransfer && !(kind === 'despesa' && payWith === 'cartao') && (
            <label className="field"><span className="label">Vencimento</span>
              <input type="date" value={due || date} onChange={(e) => setDue(e.target.value)} /></label>)}
          {kind === 'despesa' && payWith === 'cartao' && tx && <div className="field"><span className="label">Fatura</span><span className="muted">vence {fmtDate(tx.due_date, { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>}
        </div>

        <label className="toggle"><input type="checkbox" checked={done} disabled={canceled} onChange={(e) => setDone(e.target.checked)} />
          {kind === 'receita' ? 'Já recebi' : kind === 'despesa' && payWith === 'cartao' ? 'Fatura já paga' : isTransfer ? 'Já transferi' : 'Já paguei'}</label>

        {!isTransfer && <CategoryPicker module="financas" value={category} onChange={setCategory} scope={ctx.ctx === 'casal' ? 'casal' : 'pessoal'} ownerId={tx?.owner_id ?? meId} />}

        {kind === 'despesa' && <label className="field"><span className="label">Favorecido</span>
          <select value={payeeId} onChange={(e) => setPayeeId(e.target.value)}><option value="">Nenhum</option>
            {payeeOpts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}

        <button type="button" className="link" onClick={() => setMore(!more)}>{more ? '− Menos detalhes' : '+ Link de pagamento, etiquetas, observações'}</button>
        {more && <>
          {!isTransfer && <label className="field"><span className="label">Link de pagamento</span><input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></label>}
          {!isTransfer && <label className="field"><span className="label">Etiquetas</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="UGC, TikTok" /><span className="hint">Separe por vírgula.</span></label>}
          <label className="field"><span className="label">Observações</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          {tx && <label className="toggle"><input type="checkbox" checked={canceled} onChange={(e) => { setCanceled(e.target.checked); if (e.target.checked) setDone(false) }} />Cancelado (não conta nos totais)</label>}
        </>}
        {tx?.payment_link && ro && <a className="btn wide" href={tx.payment_link} target="_blank" rel="noreferrer">Abrir link de pagamento</a>}
      </fieldset>

      {confirmDel && tx && (tx.installment_group ? (
        <Sheet title="Excluir parcela?" onClose={() => setConfirmDel(false)} footer={<>
          <button className="btn" onClick={() => setConfirmDel(false)}>Cancelar</button>
          <button className="btn" onClick={() => del(false)}>Só esta</button>
          <button className="btn danger" onClick={() => del(true)}>Todas as {tx.installment_total}</button></>}>
          <p>“{tx.description}” é a parcela {tx.installment_no} de {tx.installment_total}.</p>
        </Sheet>
      ) : <Confirm title="Excluir lançamento?" onConfirm={() => del(false)} onClose={() => setConfirmDel(false)}
        message={tx.transfer_group ? 'As duas pontas da transferência serão apagadas.' : `“${tx.description}” será apagado. Para manter o histórico, você pode marcar como Cancelado.`} />)}
    </Sheet>
  )
}

// ───────────────────────── Conta ─────────────────────────

const ACCOUNT_KINDS: { id: Account['kind']; label: string }[] = [
  { id: 'corrente', label: 'Conta corrente' }, { id: 'poupanca', label: 'Poupança' }, { id: 'carteira', label: 'Carteira / dinheiro' },
  { id: 'investimento', label: 'Investimento' }, { id: 'outro', label: 'Outro' },
]
export const accountKindLabel = (k: string) => ACCOUNT_KINDS.find((x) => x.id === k)?.label ?? k

export function AccountEditor({ account, ctx, onClose }: { account: Account | null; ctx: CtxOpt; onClose: () => void }) {
  const { me, insert, update, remove, toast } = useData()
  const [c, setC] = useState({ ctx: account?.context ?? (ctx.writable ? ctx.ctx : 'pf'), owner: account?.owner_id ?? (ctx.writable && ctx.ctx !== 'casal' ? ctx.owner : me!.id) })
  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<Account['kind']>(account?.kind ?? 'corrente')
  const [initial, setInitial] = useState(account ? (account.initial_balance_cents / 100).toFixed(2).replace('.', ',') : '0')
  const [date, setDate] = useState(account?.initial_date ?? todayISO())
  const [color, setColor] = useState(account?.color ?? PALETTE[7])
  const [confirmDel, setConfirmDel] = useState(false)
  const neg = initial.trim().startsWith('-')
  const cents = initial.trim() === '0' || initial.trim() === '' ? 0 : parseMoney(initial.replace('-', ''))
  const valid = name.trim() !== '' && cents !== null
  const save = async () => {
    const row = { name: name.trim(), kind, initial_balance_cents: (neg ? -1 : 1) * (cents ?? 0), initial_date: date, color, context: c.ctx }
    const r = account ? await update('accounts', account.id, row) : await insert('accounts', row)
    if (r) { toast('Conta salva.'); onClose() }
  }
  return (
    <Sheet title={account ? 'Editar conta' : 'Nova conta'} onClose={onClose} footer={<Footer onClose={onClose} onSave={save} disabled={!valid}
      left={account && <>
        <button className="icon-btn" aria-label="Arquivar" title={account.archived_at ? 'Desarquivar' : 'Arquivar'} onClick={async () => { if (await update('accounts', account.id, { archived_at: account.archived_at ? null : new Date().toISOString() })) onClose() }}><Icon name="archive" /></button>
        <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button></>} />}>
      <CtxSelect value={keyOf(c.ctx, c.owner)} disabled={!!account} onChange={(o) => setC({ ctx: o.ctx, owner: o.ctx === 'casal' ? me!.id : o.owner })} />
      <label className="field"><span className="label">Nome</span><input autoFocus={!account} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank, Itaú PJ" /></label>
      <label className="field"><span className="label">Tipo</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as Account['kind'])}>{ACCOUNT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
      <div className="row2">
        <MoneyInput label="Saldo inicial" value={initial} onChange={setInitial} hint="Use - para saldo negativo." />
        <label className="field"><span className="label">Saldo em</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <p className="hint">O saldo é calculado a partir desta data: lançamentos pagos antes dela não entram.</p>
      <ColorPicker value={color} onChange={setColor} />
      {confirmDel && account && <Confirm title="Excluir conta?" message="Só é possível excluir contas sem lançamentos. Se ela já foi usada, arquive." onConfirm={async () => { if (await remove('accounts', account.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}

// ───────────────────────── Cartão ─────────────────────────

export function CardEditor({ card, ctx, onClose }: { card: Card | null; ctx: CtxOpt; onClose: () => void }) {
  const { me, accounts, insert, update, remove, toast } = useData()
  const [c, setC] = useState({ ctx: card?.context ?? (ctx.writable ? ctx.ctx : 'pf'), owner: card?.owner_id ?? (ctx.writable && ctx.ctx !== 'casal' ? ctx.owner : me!.id) })
  const [name, setName] = useState(card?.name ?? '')
  const [payAcc, setPayAcc] = useState(card?.pay_account_id ?? '')
  const [closing, setClosing] = useState(card?.closing_day ?? 5)
  const [dueDay, setDueDay] = useState(card?.due_day ?? 12)
  const [limit, setLimit] = useState(centsToInput(card?.limit_cents))
  const [couple, setCouple] = useState(card?.is_couple_card ?? c.ctx === 'casal')
  const [color, setColor] = useState(card?.color ?? PALETTE[9])
  const [confirmDel, setConfirmDel] = useState(false)
  const owner = c.ctx === 'casal' ? me!.id : c.owner
  const accOpts = accounts.filter((a) => !a.archived_at && linkOk(c.ctx, owner, a) && (a.context !== 'pf' || a.owner_id === me!.id))
  const limitCents = limit.trim() ? parseMoney(limit) : null
  const valid = name.trim() !== '' && (limit.trim() === '' || limitCents !== null)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const save = async () => {
    const row = { name: name.trim(), pay_account_id: payAcc || null, closing_day: closing, due_day: dueDay, limit_cents: limitCents, is_couple_card: c.ctx === 'casal' && couple, color, context: c.ctx }
    const r = card ? await update('cards', card.id, row) : await insert('cards', row)
    if (r) { toast('Cartão salvo.'); onClose() }
  }
  return (
    <Sheet title={card ? 'Editar cartão' : 'Novo cartão'} onClose={onClose} footer={<Footer onClose={onClose} onSave={save} disabled={!valid}
      left={card && <>
        <button className="icon-btn" aria-label="Arquivar" title={card.archived_at ? 'Desarquivar' : 'Arquivar'} onClick={async () => { if (await update('cards', card.id, { archived_at: card.archived_at ? null : new Date().toISOString() })) onClose() }}><Icon name="archive" /></button>
        <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button></>} />}>
      <CtxSelect value={keyOf(c.ctx, c.owner)} disabled={!!card} onChange={(o) => { setC({ ctx: o.ctx, owner: o.ctx === 'casal' ? me!.id : o.owner }); setPayAcc(''); setCouple(o.ctx === 'casal') }} />
      <label className="field"><span className="label">Nome</span><input autoFocus={!card} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank Casal" /></label>
      <div className="row2">
        <label className="field"><span className="label">Fecha no dia</span><select value={closing} onChange={(e) => setClosing(Number(e.target.value))}>{days.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        <label className="field"><span className="label">Vence no dia</span><select value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}>{days.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
      </div>
      <p className="hint">Compras no dia do fechamento ou depois entram na fatura seguinte.</p>
      <label className="field"><span className="label">Conta que paga a fatura</span>
        <select value={payAcc} onChange={(e) => setPayAcc(e.target.value)}><option value="">Escolha</option>{accOpts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <span className="hint">É dessa conta que o valor sai quando a fatura é marcada como paga.</span></label>
      <MoneyInput label="Limite (opcional)" value={limit} onChange={setLimit} />
      {c.ctx === 'casal' && <label className="toggle"><input type="checkbox" checked={couple} onChange={(e) => setCouple(e.target.checked)} />Este é o cartão do casal (regra da casa)</label>}
      <ColorPicker value={color} onChange={setColor} />
      {confirmDel && card && <Confirm title="Excluir cartão?" message="Só é possível excluir cartões sem compras. Se ele já foi usado, arquive." onConfirm={async () => { if (await remove('cards', card.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}

// ───────────────────────── Favorecido / Pix ─────────────────────────

const PIX_TYPES: { id: NonNullable<Payee['pix_type']>; label: string }[] = [
  { id: 'cpf', label: 'CPF' }, { id: 'cnpj', label: 'CNPJ' }, { id: 'email', label: 'E-mail' }, { id: 'telefone', label: 'Telefone' }, { id: 'aleatoria', label: 'Aleatória' },
]
export const pixTypeLabel = (t: string | null) => PIX_TYPES.find((x) => x.id === t)?.label ?? 'Chave'

export function PayeeEditor({ payee, ctx, onClose }: { payee: Payee | null; ctx: CtxOpt; onClose: () => void }) {
  const { me, insert, update, remove, toast } = useData()
  const [c, setC] = useState({ ctx: payee?.context ?? (ctx.writable ? ctx.ctx : 'casal'), owner: payee?.owner_id ?? (ctx.writable && ctx.ctx !== 'casal' ? ctx.owner : me!.id) })
  const [name, setName] = useState(payee?.name ?? '')
  const [pixType, setPixType] = useState<Payee['pix_type']>(payee?.pix_type ?? 'cpf')
  const [pix, setPix] = useState(payee?.pix_key ?? '')
  const [notes, setNotes] = useState(payee?.notes ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const save = async () => {
    const row = { name: name.trim(), pix_type: pix.trim() ? pixType : null, pix_key: pix.trim() || null, notes, context: c.ctx }
    const r = payee ? await update('payees', payee.id, row) : await insert('payees', row)
    if (r) { toast('Favorecido salvo.'); onClose() }
  }
  return (
    <Sheet title={payee ? 'Editar favorecido' : 'Novo favorecido'} onClose={onClose} footer={<Footer onClose={onClose} onSave={save} disabled={!name.trim()}
      left={payee && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>} />}>
      <CtxSelect value={keyOf(c.ctx, c.owner)} disabled={!!payee} onChange={(o) => setC({ ctx: o.ctx, owner: o.ctx === 'casal' ? me!.id : o.owner })} />
      <label className="field"><span className="label">Nome</span><input autoFocus={!payee} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Diarista Ana" /></label>
      <div className="row2">
        <label className="field"><span className="label">Tipo de chave</span>
          <select value={pixType ?? 'cpf'} onChange={(e) => setPixType(e.target.value as Payee['pix_type'])}>{PIX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        <label className="field"><span className="label">Chave Pix</span><input value={pix} onChange={(e) => setPix(e.target.value)} autoCapitalize="none" /></label>
      </div>
      <label className="field"><span className="label">Observações</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <p className="hint">Guarde só a chave Pix. Senhas e dados de acesso ao banco nunca vão aqui.</p>
      {confirmDel && payee && <Confirm title="Excluir favorecido?" message="Os lançamentos ligados a ele continuam, só sem o favorecido." onConfirm={async () => { if (await remove('payees', payee.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}

export { methodLabel }
