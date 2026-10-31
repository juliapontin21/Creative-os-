import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useData } from '../lib/data'
import { currentSubscription, disablePush, enablePush, pushSupport, sendTest } from '../lib/push'
import type { NotificationPrefs } from '../lib/types'

const DEFAULTS = { events: true, partner_events: true, partner_reminders: true, habits: true, water: false, water_every_min: 120, finance: true, finance_hour: 9, quiet_start: 1320, quiet_end: 420 }
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const fromTime = (s: string) => { const [h, m] = s.split(':').map(Number); return (h || 0) * 60 + (m || 0) }

export function Notificacoes() {
  const { me, partner, notification_prefs, push_subscriptions, insert, update, reload, toast } = useData()
  const support = pushSupport()
  const row = notification_prefs.find((p) => p.owner_id === me!.id)
  const p: Omit<NotificationPrefs, 'id' | 'household_id' | 'owner_id' | 'created_at' | 'updated_at'> = { ...DEFAULTS, ...(row ?? {}) }
  const [here, setHere] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => { currentSubscription().then((s) => setHere(Boolean(s && push_subscriptions.some((x) => x.endpoint === s.endpoint)))) }, [push_subscriptions])

  const save = async (patch: Partial<typeof p>) => {
    const r = row ? await update('notification_prefs', row.id, patch) : await insert('notification_prefs', { ...p, ...patch })
    if (r) toast('Preferência salva.')
  }
  const T = ({ k, label, hint }: { k: keyof typeof DEFAULTS; label: string; hint?: string }) => (
    <label className="toggle"><input type="checkbox" checked={Boolean(p[k])} onChange={(e) => save({ [k]: e.target.checked })} />
      <span><strong>{label}</strong>{hint && <span className="muted small block">{hint}</span>}</span></label>
  )

  return (
    <>
      <div className={'card ' + (here ? 'info' : 'tip')}>
        <div className="grow">
          <strong>{here ? 'Notificações ativas neste aparelho' : 'Ativar neste aparelho'}</strong>
          <p className="small">{!support.ok ? support.reason : here ? 'Você vai receber os avisos escolhidos abaixo. Cada celular ou tablet precisa ser ativado uma vez.' : 'Toque em Ativar e permita as notificações. Cada aparelho (celular, tablet) é ativado separadamente.'}</p>
          {msg && <p className="small err-text">{msg}</p>}
        </div>
      </div>
      {support.ok && <div className="row2">
        {!here ? <button className="btn primary wide" disabled={busy} onClick={async () => { setBusy(true); setMsg(''); const e = await enablePush(); setMsg(e); await reload(); setBusy(false); if (!e) toast('Notificações ativadas.') }}>{busy ? 'Ativando…' : 'Ativar'}</button>
          : <button className="btn wide" disabled={busy} onClick={async () => { setBusy(true); await disablePush(); await reload(); setBusy(false); toast('Desativado neste aparelho.') }}>Desativar aqui</button>}
        <button className="btn wide" disabled={busy || !here} onClick={async () => { setBusy(true); const e = await sendTest(); setMsg(e); setBusy(false); if (!e) toast('Teste enviado: deve chegar em alguns segundos.') }}><Icon name="sparkle" />Enviar teste</button>
      </div>}
      {push_subscriptions.length > 0 && <p className="muted small pad">{push_subscriptions.length} {push_subscriptions.length === 1 ? 'aparelho inscrito' : 'aparelhos inscritos'} na sua conta.</p>}

      <section>
        <div className="section-head"><h2>O que avisar</h2></div>
        <div className="card ind-card">
          <T k="events" label="Meus compromissos e os do casal" hint="No horário de lembrete escolhido em cada compromisso (ex.: 30 min antes)." />
          {partner && <T k="partner_events" label={`Compromissos de ${partner.display_name} que me afetam`} hint="Só os que ele marcar como 'afeta você'." />}
          {partner && <T k="partner_reminders" label={`Lembretes de ${partner.display_name}`} hint="Na hora que ele marcar." />}
          <T k="habits" label="Hábitos" hint="No horário de lembrete de cada hábito, se ainda não estiver feito." />
          <T k="finance" label="Contas do dia" hint="Um resumo por dia com vencimentos de hoje e contas atrasadas." />
          {p.finance && <label className="field"><span className="label">Horário do resumo de contas</span>
            <select value={p.finance_hour} onChange={(e) => save({ finance_hour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{toTime(h * 60)}</option>)}</select></label>}
          <T k="water" label="Beber água" hint="Entre 9h e 21h, só quando estiver abaixo do ritmo da sua meta." />
          {p.water && <label className="field"><span className="label">A cada</span>
            <select value={p.water_every_min} onChange={(e) => save({ water_every_min: Number(e.target.value) })}>{[60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m / 60} h</option>)}</select></label>}
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Silêncio</h2></div>
        <div className="card ind-card">
          <div className="row2">
            <label className="field"><span className="label">Das</span><input type="time" value={toTime(p.quiet_start)} onChange={(e) => save({ quiet_start: fromTime(e.target.value) })} /></label>
            <label className="field"><span className="label">Até</span><input type="time" value={toTime(p.quiet_end)} onChange={(e) => save({ quiet_end: fromTime(e.target.value) })} /></label>
          </div>
          <p className="hint">Nesse horário, hábitos, água e contas não avisam. Compromissos e lembretes do parceiro avisam sempre.</p>
        </div>
      </section>
      <p className="hint pad">Os avisos podem chegar até 1 minuto depois do horário. No iPhone, o modo Foco/Não perturbe também pode segurar as notificações.</p>
    </>
  )
}
