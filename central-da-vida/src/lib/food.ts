// Alimentação e mercado: cálculos puros (sem imports, para os testes do Node).

export type Meal = 'cafe' | 'almoco' | 'lanche' | 'jantar'
export const MEALS: { id: Meal; label: string }[] = [
  { id: 'cafe', label: 'Café da manhã' }, { id: 'almoco', label: 'Almoço' }, { id: 'lanche', label: 'Café da tarde' }, { id: 'jantar', label: 'Jantar' },
]
export interface Ingredient { name: string; qty: number | null; unit: string; section?: string | null }

const UNITS: Record<string, string> = {
  g: 'g', gr: 'g', grama: 'g', gramas: 'g', kg: 'kg', quilo: 'kg', quilos: 'kg', ml: 'ml', l: 'L', litro: 'L', litros: 'L',
  un: 'un', und: 'un', unid: 'un', unidade: 'un', unidades: 'un', pct: 'pacote', pacote: 'pacote', pacotes: 'pacote',
  cx: 'caixa', caixa: 'caixa', caixas: 'caixa', dz: 'dúzia', duzia: 'dúzia', dúzia: 'dúzia', lata: 'lata', latas: 'lata',
  xic: 'xícara', xícara: 'xícara', xícaras: 'xícara', xicara: 'xícara', xicaras: 'xícara', colher: 'colher', colheres: 'colher', maço: 'maço', maco: 'maço', maços: 'maço',
}
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

// "2 kg tomate", "tomate 2kg", "1,5 l leite", "pão" → { name, qty, unit }
export function parseItem(text: string): Ingredient {
  let s = text.trim().replace(/\s+/g, ' ')
  const num = '(\\d+(?:[.,]\\d+)?)'
  const unitAlt = Object.keys(UNITS).sort((a, b) => b.length - a.length).join('|')
  let m = s.match(new RegExp(`^${num}\\s*(${unitAlt})?\\s*(?:de\\s+)?(.+)$`, 'i'))
  if (m && m[3]) return { name: cap(m[3]), qty: Number(m[1].replace(',', '.')), unit: m[2] ? UNITS[m[2].toLowerCase()] : '' }
  m = s.match(new RegExp(`^(.+?)\\s+${num}\\s*(${unitAlt})?$`, 'i'))
  if (m) return { name: cap(m[1]), qty: Number(m[2].replace(',', '.')), unit: m[3] ? UNITS[m[3].toLowerCase()] : '' }
  s = s.replace(/^de\s+/i, '')
  return { name: cap(s), qty: null, unit: '' }
}
const cap = (s: string) => { const t = s.trim(); return t.charAt(0).toUpperCase() + t.slice(1) }

// Mesmo item na lista = mesmo nome (sem acento/maiúscula, singular simples) e mesma unidade.
export const itemKey = (name: string, unit: string) => `${norm(name).replace(/s$/, '')}|${norm(unit)}`

// Soma quantidades ao juntar itens repetidos (sem quantidade + com quantidade → fica a que existe).
export function mergeQty(a: number | null, b: number | null): number | null {
  if (a == null) return b
  if (b == null) return a
  return Math.round((a + b) * 1000) / 1000
}

// Ingredientes ajustados para N porções (receita feita para `base` porções).
export function scale(ings: Ingredient[], base: number, wanted: number): Ingredient[] {
  const f = base > 0 ? wanted / base : 1
  return ings.map((i) => ({ ...i, qty: i.qty == null ? null : Math.round(i.qty * f * 100) / 100 }))
}

export const fmtQty = (q: number | null, unit: string) => q == null ? '' : `${q.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`

// Calorias de um item do cardápio/diário: o valor informado no item, ou kcal da receita × porções.
export function itemKcal(it: { kcal: number | null; servings: number; recipe_id: string | null }, recipeKcal: (id: string) => number | null): number | null {
  if (it.kcal != null) return it.kcal
  if (!it.recipe_id) return null
  const k = recipeKcal(it.recipe_id)
  return k == null ? null : Math.round(k * it.servings)
}
