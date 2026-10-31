// Envia uma notificação de teste para os aparelhos de quem pediu.
import { admin, pushTo, send, userFrom, vapid } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' })
  try {
    const db = admin()
    const user = await userFrom(req, db)
    if (!user) return send(res, 401, { error: 'Faça login de novo.' })
    await vapid(db)
    const n = await pushTo(db, user.id, { title: 'Central da Vida', body: 'Notificações funcionando neste aparelho ✅', url: '/#/hoje', tag: 'teste' })
    send(res, 200, { sent: n })
  } catch (e) { send(res, 500, { error: e.message }) }
}
