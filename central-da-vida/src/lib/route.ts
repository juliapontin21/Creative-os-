import { useEffect, useState } from 'react'

export type Route = 'hoje' | 'financas' | 'agenda' | 'mais' | 'notas' | 'categorias' | 'ajustes' | 'busca' | 'em-breve' | 'regras' | 'habitos' | 'notificacoes' | 'alimentacao' | 'treinos'

const parse = (): { route: Route; arg: string } => {
  const [r, arg = ''] = location.hash.replace(/^#\/?/, '').split('/')
  return { route: (r || 'hoje') as Route, arg: decodeURIComponent(arg) }
}

export function useRoute() {
  const [state, set] = useState(parse)
  useEffect(() => {
    const on = () => { set(parse()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return state
}

export const go = (route: Route, arg = '') => { location.hash = `/${route}${arg ? '/' + encodeURIComponent(arg) : ''}` }
