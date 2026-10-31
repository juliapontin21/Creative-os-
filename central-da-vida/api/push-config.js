// Devolve a chave pública para o celular se inscrever nas notificações.
import { admin, send, vapid } from './_lib.js'

export default async function handler(req, res) {
  try { send(res, 200, { publicKey: await vapid(admin()) }) }
  catch (e) { send(res, 500, { error: e.message }) }
}
