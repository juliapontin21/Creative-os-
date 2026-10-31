import { useState } from 'react'
import { Icon } from '../components/Icon'
import { CategoryChip, Confirm, Empty, Segmented, Sheet, useModuleCategories } from '../components/ui'
import { addDays, parseYmd, weekStart, ymd } from '../lib/agenda'
import { useData } from '../lib/data'
import { fmtQty, itemKcal, itemKey, MEALS, mergeQty, norm, parseItem, scale, type Ingredient, type Meal } from '../lib/food'
import { go } from '../lib/route'
import { sb, friendly } from '../lib/supabase'
import type { MealItem, Recipe, ShoppingItem } from '../lib/types'

type Tab = 'cardapio' | 'diario' | 'receitas' | 'mercado'
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const mealLabel = (m: Meal) => MEALS.find((x) => x.id === m)!.label

// Manda ingredientes para a lista do mercado, juntando com itens iguais ainda não comprados.
export function useAddToList() {
  const { shopping_items, insert, update, toast } = useData()
  return async (items: Ingredient[], origin: string) => {
    let n = 0
    for (const it of items) {
      const same = shopping_items.find((s) => !s.checked_at && !s.archived_at && itemKey(s.name, s.unit) === itemKey(it.name, it.unit))
      if (same) {
        const origins = [same.origin, origin].filter(Boolean)
        await update('shopping_items', same.id, { qty: mergeQty(same.qty, it.qty), origin: [...new Set(origins.join(' · ').split(' · '))].join(' · ').slice(0, 200) })
      } else await insert('shopping_items', { name: it.name, qty: it.qty, unit: it.unit, origin, category_id: it.section ?? null })
      n++
    }
    if (n) toast(`${n} ${n === 1 ? 'item foi' : 'itens foram'} para a lista do mercado.`)
  }
}

export function Alimentacao({ tab: tabArg }: { tab: string }) {
  const tab = (['cardapio', 'diario', 'receitas', 'mercado'].includes(tabArg) ? tabArg : 'cardapio') as Tab
  const { me, partner } = useData()
  const [who, setWho] = useState(me!.id)
  return (
    <>
      <div className="chips scroll">
        <Segmented value={tab} onChange={(t) => go('alimentacao', t)} options={[{ id: 'cardapio', label: 'Cardápio' }, { id: 'diario', label: 'Diário' }, { id: 'receitas', label: 'Receitas' }, { id: 'mercado', label: 'Mercado' }]} />
      </div>
      {(tab === 'cardapio' || tab === 'diario') && partner && (
        <div className="chips">
          <Segmented value={who} onChange={setWho} options={[{ id: me!.id, label: me!.display_name }, { id: partner.id, label: `${partner.display_name} (só ver)` }]} />
        </div>
      )}
      {tab === 'cardapio' && <Cardapio who={who} />}
      {tab === 'diario' && <Diario who={who} />}
      {tab === 'receitas' && <Receitas />}
      {tab === 'mercado' && <Mercado />}
    </>
  )
}

// ───────────────────────── Cardápio ─────────────────────────

function Cardapio({ who }: { who: string }) {
  const { me, meal_plans, recipes, insertMany, toast } = useData()
  const addToList = useAddToList()
  const mine = who === me!.id
  const [start, setStart] = useState(weekStart(ymd(new Date())))
  const [edit, setEdit] = useState<{ item: MealItem | null; date: string; meal: Meal } | null>(null)
  const [shop, setShop] = useState(false)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const items = meal_plans.filter((m) => m.owner_id === who && !m.archived_at && m.date >= days[0] && m.date <= days[6])
  const recipeOf = (id: string | null) => recipes.find((r) => r.id === id)
  const kcalOf = (it: MealItem) => itemKcal(it, (id) => recipeOf(id)?.kcal_per_serving ?? null)
  const copyPrev = async () => {
    const prev = meal_plans.filter((m) => m.owner_id === me!.id && !m.archived_at && m.date >= addDays(start, -7) && m.date < start)
    if (!prev.length) return toast('A semana anterior está vazia.')
    if (await insertMany('meal_plans', prev.map((m) => ({ date: addDays(m.date, 7), meal: m.meal, recipe_id: m.recipe_id, text: m.text, servings: m.servings, kcal: m.kcal }))))
      toast('Semana anterior copiada.')
  }
  const weekIngredients = (): { ing: Ingredient; origin: string }[] => items.flatMap((it) => {
    const r = recipeOf(it.recipe_id)
    return r ? scale(r.ingredients, r.servings, it.servings).map((ing) => ({ ing, origin: r.name })) : []
  })

  return (
    <>
      <div className="month-pick">
        <button className="icon-btn" aria-label="Semana anterior" onClick={() => setStart(addDays(start, -7))}><Icon name="back" /></button>
        <strong>{parseYmd(days[0]).getDate()} – {parseYmd(days[6]).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</strong>
        <button className="icon-btn" aria-label="Próxima semana" onClick={() => setStart(addDays(start, 7))}><Icon name="right" /></button>
      </div>
      {mine && <div className="row2">
        <button className="btn" onClick={copyPrev}>Copiar semana anterior</button>
        <button className="btn" onClick={() => setShop(true)} disabled={!weekIngredients().length}><Icon name="cart" />Ingredientes → lista</button>
      </div>}
      {days.map((d) => {
        const dayItems = items.filter((i) => i.date === d)
        const total = dayItems.reduce((s, i) => s + (kcalOf(i) ?? 0), 0)
        return (
          <section key={d} className="card day-menu">
            <div className="section-head"><h2 className={d === ymd(new Date()) ? 'today-text' : ''}>{WD[parseYmd(d).getDay()]}, {parseYmd(d).getDate()}</h2>{total > 0 && <span className="muted small">{total} kcal</span>}</div>
            {MEALS.filter((m) => dayItems.some((i) => i.meal === m.id)).map((m) => (
              <div key={m.id} className="meal-row">
                <span className="meal-label">{m.label}</span>
                <span className="grow meal-items">
                  {dayItems.filter((i) => i.meal === m.id).map((it) => (
                    <button key={it.id} className="meal-chip" onClick={() => setEdit({ item: it, date: d, meal: m.id })}>
                      {it.recipe_id ? <Icon name="chef" size={12} /> : null}{recipeOf(it.recipe_id)?.name ?? it.text}{it.servings !== 1 ? ` ×${it.servings}` : ''}
                    </button>
                  ))}
                </span>
              </div>
            ))}
            {!dayItems.length && <span className="muted small">{mine ? 'Nada planejado.' : '—'}</span>}
            {mine && <button className="link small add-meal" onClick={() => setEdit({ item: null, date: d, meal: 'almoco' })}>+ Adicionar</button>}
          </section>
        )
      })}
      {edit && <MealEditor table="meal_plans" item={edit.item} date={edit.date} meal={edit.meal} readOnly={!mine} onClose={() => setEdit(null)} />}
      {shop && <MissingSheet title="Ingredientes da semana" rows={weekIngredients()} onClose={() => setShop(false)} onSend={async (rows) => { await addToList(rows.map((r) => r.ing), 'Cardápio da semana'); setShop(false) }} />}
    </>
  )
}

// Lista de ingredientes para marcar o que falta e mandar para o mercado.
function MissingSheet({ title, rows, onClose, onSend }: { title: string; rows: { ing: Ingredient; origin: string }[]; onClose: () => void; onSend: (rows: { ing: Ingredient; origin: string }[]) => void }) {
  // Junta repetidos (ex.: tomate em duas receitas) antes de perguntar.
  const merged: { ing: Ingredient; origin: string }[] = []
  for (const r of rows) {
    const same = merged.find((x) => itemKey(x.ing.name, x.ing.unit) === itemKey(r.ing.name, r.ing.unit))
    if (same) { same.ing = { ...same.ing, qty: mergeQty(same.ing.qty, r.ing.qty) }; if (!same.origin.includes(r.origin)) same.origin += ` · ${r.origin}` }
    else merged.push({ ing: { ...r.ing }, origin: r.origin })
  }
  const [missing, setMissing] = useState<Set<number>>(new Set())
  const [qty, setQty] = useState<Record<number, string>>({})
  return (
    <Sheet title={title} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!missing.size} onClick={() => onSend(merged.flatMap((r, i) => {
        if (!missing.has(i)) return []
        const q = qty[i] !== undefined ? (qty[i].trim() ? Number(qty[i].replace(',', '.')) : null) : r.ing.qty
        return [{ ...r, ing: { ...r.ing, qty: q && q > 0 ? q : null } }]
      }))}>Mandar {missing.size || ''} para a lista</button></>}>
      <p className="hint">Marque o que <b>falta em casa</b>. Dá para ajustar a quantidade antes de mandar.</p>
      <div className="list compact">{merged.map((r, i) => (
        <label key={i} className="list-row miss-row">
          <input type="checkbox" checked={missing.has(i)} onChange={(e) => { const s = new Set(missing); if (e.target.checked) s.add(i); else s.delete(i); setMissing(s) }} />
          <span className="grow"><strong>{r.ing.name}</strong><span className="muted small block">{r.origin}</span></span>
          <input className="qty-input" inputMode="decimal" aria-label={`Quantidade de ${r.ing.name}`} value={qty[i] ?? (r.ing.qty == null ? '' : String(r.ing.qty).replace('.', ','))} onChange={(e) => setQty({ ...qty, [i]: e.target.value })} />
          <span className="muted small unit">{r.ing.unit}</span>
        </label>
      ))}</div>
      {!merged.length && <p className="muted">Nenhum ingrediente cadastrado nas receitas.</p>}
    </Sheet>
  )
}

// ───────────────────────── Diário ─────────────────────────

function Diario({ who }: { who: string }) {
  const { me, food_logs, meal_plans, recipes, personal_settings, insert, update, toast } = useData()
  const mine = who === me!.id
  const [day, setDay] = useState(ymd(new Date()))
  const [edit, setEdit] = useState<{ item: MealItem | null; meal: Meal } | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const setting = personal_settings.find((s) => s.owner_id === me!.id)
  const [goal, setGoal] = useState(String(setting?.kcal_goal ?? ''))
  const kcal = (it: MealItem) => itemKcal(it, (id) => recipes.find((r) => r.id === id)?.kcal_per_serving ?? null)
  const logs = food_logs.filter((l) => l.owner_id === who && l.date === day && !l.archived_at)
  const plans = meal_plans.filter((l) => l.owner_id === who && l.date === day && !l.archived_at)
  const sum = (xs: MealItem[]) => xs.reduce((s, x) => s + (kcal(x) ?? 0), 0)
  const unknown = logs.filter((l) => kcal(l) == null).length
  const goalKcal = mine ? setting?.kcal_goal ?? null : null
  const ate = sum(logs)
  const atePlanned = async (m: Meal) => {
    const p = plans.filter((x) => x.meal === m)
    for (const x of p) await insert('food_logs', { date: day, meal: m, recipe_id: x.recipe_id, text: x.text, servings: x.servings, kcal: x.kcal })
    if (p.length) toast('Registrado como planejado.')
  }
  return (
    <>
      <div className="month-pick">
        <button className="icon-btn" aria-label="Dia anterior" onClick={() => setDay(addDays(day, -1))}><Icon name="back" /></button>
        <strong>{parseYmd(day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
        <button className="icon-btn" aria-label="Próximo dia" onClick={() => setDay(addDays(day, 1))}><Icon name="right" /></button>
      </div>
      <div className="grid2">
        <div className="card stat"><span className="muted small">Planejado</span><strong className="stat-value">{sum(plans)} kcal</strong></div>
        <div className="card stat"><span className="muted small">Consumido</span><strong className="stat-value">{ate} kcal</strong>
          {unknown > 0 && <span className="muted small">+ {unknown} sem calorias</span>}</div>
      </div>
      {mine && (goalKcal ? <div className="card ind-card"><div className="ind-row">
        <div className="ind-head"><strong>Meta do dia</strong><span className="small"><b>{ate}</b> / {goalKcal} kcal</span></div>
        <div className="bar"><span style={{ width: `${Math.min(100, Math.round((ate / goalKcal) * 100))}%`, background: ate > goalKcal ? 'var(--neg)' : 'var(--pos)' }} /></div>
        <span className="muted small">{ate > goalKcal ? `passou ${ate - goalKcal} kcal` : `restam ${goalKcal - ate} kcal`} · <button className="link inline" onClick={() => setGoalOpen(true)}>mudar meta</button></span>
      </div></div> : <button className="link pad" onClick={() => setGoalOpen(true)}>Definir meta de calorias (opcional)</button>)}
      <p className="hint">As calorias são as que vocês informam (na receita ou no item). O app soma, mas não estima. Déficit calórico depende também do gasto do corpo, que o app não mede.</p>
      {MEALS.map((m) => {
        const list = logs.filter((l) => l.meal === m.id)
        const planned = plans.filter((p) => p.meal === m.id)
        return (
          <section key={m.id} className="card day-menu">
            <div className="section-head"><h2>{m.label}</h2>{list.length > 0 && <span className="muted small">{sum(list)} kcal</span>}</div>
            {list.map((l) => (
              <button key={l.id} className="meal-line" onClick={() => setEdit({ item: l, meal: m.id })}>
                <span className="grow">{recipes.find((r) => r.id === l.recipe_id)?.name ?? l.text}{l.servings !== 1 ? ` ×${l.servings}` : ''}</span>
                <span className="muted small">{kcal(l) != null ? `${kcal(l)} kcal` : 'sem kcal'}</span>
              </button>
            ))}
            {!list.length && planned.length > 0 && <p className="muted small">Planejado: {planned.map((p) => recipes.find((r) => r.id === p.recipe_id)?.name ?? p.text).join(', ')}</p>}
            {mine && <div className="row2">
              {!list.length && planned.length > 0 && <button className="btn small" onClick={() => atePlanned(m.id)}>Comi o planejado</button>}
              <button className="btn small" onClick={() => setEdit({ item: null, meal: m.id })}><Icon name="plus" size={14} />Registrar</button>
            </div>}
          </section>
        )
      })}
      {edit && <MealEditor table="food_logs" item={edit.item} date={day} meal={edit.meal} readOnly={!mine} onClose={() => setEdit(null)} />}
      {goalOpen && <Sheet title="Meta de calorias" onClose={() => setGoalOpen(false)} footer={<>
        <button className="btn" onClick={async () => { if (setting) await update('personal_settings', setting.id, { kcal_goal: null }); setGoalOpen(false) }}>Sem meta</button><span className="grow" />
        <button className="btn primary" disabled={!(Number(goal) >= 500)} onClick={async () => {
          const v = Math.round(Number(goal))
          const r = setting ? await update('personal_settings', setting.id, { kcal_goal: v }) : await insert('personal_settings', { kcal_goal: v })
          if (r) { toast('Meta salva.'); setGoalOpen(false) }
        }}>Salvar</button></>}>
        <label className="field"><span className="label">Calorias por dia</span><input type="number" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex.: 1800" /></label>
        <p className="hint">Só você vê a sua meta. Se tiver acompanhamento de nutricionista, use o valor indicado.</p>
      </Sheet>}
    </>
  )
}

function MealEditor({ table, item, date, meal, readOnly, onClose }: { table: 'meal_plans' | 'food_logs'; item: MealItem | null; date: string; meal: Meal; readOnly: boolean; onClose: () => void }) {
  const { recipes, insert, update, remove, toast } = useData()
  const [mode, setMode] = useState<'receita' | 'texto'>(item ? (item.recipe_id ? 'receita' : 'texto') : 'receita')
  const [recipeId, setRecipeId] = useState(item?.recipe_id ?? '')
  const [text, setText] = useState(item?.text ?? '')
  const [servings, setServings] = useState(String(item?.servings ?? 1).replace('.', ','))
  const [kcal, setKcal] = useState(item?.kcal != null ? String(item.kcal) : '')
  const [day, setDay] = useState(item?.date ?? date)
  const [m, setM] = useState<Meal>(item?.meal ?? meal)
  const [q, setQ] = useState('')
  const sv = Number(servings.replace(',', '.'))
  const list = recipes.filter((r) => !r.archived_at && norm(r.name).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name))
  const valid = sv > 0 && (mode === 'receita' ? !!recipeId : text.trim() !== '')
  const save = async () => {
    const row = { date: day, meal: m, recipe_id: mode === 'receita' ? recipeId : null, text: mode === 'texto' ? text.trim() : '', servings: sv, kcal: kcal.trim() ? Math.round(Number(kcal)) : null }
    const r = item ? await update(table, item.id, row) : await insert(table, row)
    if (r) { toast('Salvo.'); onClose() }
  }
  const sel = recipes.find((r) => r.id === recipeId)
  return (
    <Sheet title={`${table === 'meal_plans' ? 'Cardápio' : 'Diário'} · ${mealLabel(m)}`} onClose={onClose} footer={<>
      {item && !readOnly && <button className="icon-btn danger" aria-label="Excluir" onClick={async () => { if (await remove(table, item.id)) onClose() }}><Icon name="trash" /></button>}
      <span className="grow" /><button className="btn" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
      {!readOnly && <button className="btn primary" disabled={!valid} onClick={save}>Salvar</button>}</>}>
      <fieldset disabled={readOnly} className="plain">
        <Segmented value={mode} onChange={setMode} options={[{ id: 'receita', label: 'Receita' }, { id: 'texto', label: 'Escrever' }]} />
        {mode === 'receita' ? <>
          <label className="search"><Icon name="search" size={18} /><input type="search" placeholder="Buscar receita" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <div className="recipe-pick">{list.map((r) => (
            <button key={r.id} type="button" className={'chip' + (r.id === recipeId ? ' on' : '')} onClick={() => setRecipeId(r.id)}>{r.name}</button>
          ))}{!list.length && <span className="hint">Nenhuma receita. Cadastre em Alimentação → Receitas.</span>}</div>
        </> : <label className="field"><span className="label">O que</span><input autoFocus={!item} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: salada com frango" /></label>}
        <div className="row2">
          <label className="field"><span className="label">Porções</span><input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} /></label>
          <label className="field"><span className="label">Calorias (opcional)</span><input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)}
            placeholder={sel?.kcal_per_serving ? `${Math.round(sel.kcal_per_serving * (sv || 1))} pela receita` : 'kcal'} /></label>
        </div>
        <div className="row2">
          <label className="field"><span className="label">Dia</span><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
          <label className="field"><span className="label">Refeição</span><select value={m} onChange={(e) => setM(e.target.value as Meal)}>{MEALS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        </div>
      </fieldset>
    </Sheet>
  )
}

// ───────────────────────── Receitas ─────────────────────────

function Receitas() {
  const { recipes } = useData()
  const cats = useModuleCategories('alimentacao')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [open, setOpen] = useState<Recipe | null>(null)
  const [edit, setEdit] = useState<Recipe | 'new' | null>(null)
  const list = recipes.filter((r) => !r.archived_at && (!cat || r.category_ids.includes(cat)) &&
    norm(`${r.name} ${r.ingredients.map((i) => i.name).join(' ')}`).includes(norm(q))).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <>
      <label className="search"><Icon name="search" size={18} /><input type="search" placeholder="Buscar por nome ou ingrediente" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {cats.length > 0 && <div className="chips scroll">
        <button className={'chip' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>Todas</button>
        {cats.map((c) => <CategoryChip key={c.id} cat={c} on={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)} />)}
      </div>}
      {list.length ? <div className="recipe-grid">{list.map((r) => (
        <button key={r.id} className="card recipe-card" onClick={() => setOpen(r)}>
          {r.photo_url ? <img src={r.photo_url} alt="" loading="lazy" /> : <span className="recipe-ph"><Icon name="chef" size={28} /></span>}
          <strong>{r.name}</strong>
          <span className="muted small">{[r.prep_minutes ? `${r.prep_minutes} min` : '', `${r.servings} porç.`, r.kcal_per_serving ? `${r.kcal_per_serving} kcal/porç.` : ''].filter(Boolean).join(' · ')}</span>
        </button>
      ))}</div> : <Empty icon="chef" title={recipes.length ? 'Nada encontrado' : 'Nenhuma receita ainda'} text="Guardem aqui as receitas do casal, com link, foto, ingredientes e preparo." action={<button className="btn primary" onClick={() => setEdit('new')}>Nova receita</button>} />}
      {!cats.length && <p className="hint pad">Crie categorias (doce, salgado, fit…) em Mais → Categorias → Alimentação.</p>}
      <button className="fab" aria-label="Nova receita" onClick={() => setEdit('new')}><Icon name="plus" size={26} /></button>
      {open && <RecipeView r={open} onClose={() => setOpen(null)} onEdit={() => { setEdit(open); setOpen(null) }} />}
      {edit && <RecipeEditor recipe={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function RecipeView({ r, onClose, onEdit }: { r: Recipe; onClose: () => void; onEdit: () => void }) {
  const { insert, toast } = useData()
  const addToList = useAddToList()
  const [portions, setPortions] = useState(r.servings)
  const [missing, setMissing] = useState(false)
  const [plan, setPlan] = useState(false)
  const ings = scale(r.ingredients, r.servings, portions)
  const nextMonday = addDays(weekStart(ymd(new Date())), 8)
  const [day, setDay] = useState(ymd(new Date()))
  const [meal, setMeal] = useState<Meal>('almoco')
  return (
    <Sheet title={r.name} onClose={onClose} footer={<>
      <button className="btn" onClick={onEdit}>Editar</button><span className="grow" />
      <button className="btn" onClick={() => setMissing(true)} disabled={!ings.length}><Icon name="cart" />Falta</button>
      <button className="btn primary" onClick={() => setPlan(true)}>Ao cardápio</button></>}>
      {r.photo_url && <img className="recipe-photo" src={r.photo_url} alt={r.name} />}
      {r.link && <a className="btn wide" href={r.link} target="_blank" rel="noreferrer">Abrir o link da receita</a>}
      <div className="row2">
        <label className="field"><span className="label">Porções</span>
          <select value={portions} onChange={(e) => setPortions(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6, 8, 10, 12].concat(r.servings).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <div className="field"><span className="label">Info</span><span className="muted small">{r.prep_minutes ? `${r.prep_minutes} min · ` : ''}{r.kcal_per_serving ? `${r.kcal_per_serving} kcal por porção` : 'calorias não informadas'}</span></div>
      </div>
      {ings.length > 0 && <div className="field"><span className="label">Ingredientes</span>
        <ul className="ing-list">{ings.map((i, k) => <li key={k}><b>{fmtQty(i.qty, i.unit)}</b> {i.name}</li>)}</ul></div>}
      {r.steps && <div className="field"><span className="label">Modo de preparo</span><p className="steps">{r.steps}</p></div>}
      {missing && <MissingSheet title="O que falta?" rows={ings.map((ing) => ({ ing, origin: r.name }))} onClose={() => setMissing(false)} onSend={async (rows) => { await addToList(rows.map((x) => x.ing), r.name); setMissing(false) }} />}
      {plan && <Sheet title="Adicionar ao cardápio" onClose={() => setPlan(false)} footer={<>
        <button className="btn" onClick={() => setPlan(false)}>Cancelar</button>
        <button className="btn primary" onClick={async () => { if (await insert('meal_plans', { date: day, meal, recipe_id: r.id, servings: 1 })) { toast('Adicionada ao cardápio.'); setPlan(false) } }}>Adicionar</button></>}>
        <div className="chips wrap">
          <button className="chip" onClick={() => setDay(ymd(new Date()))}>Hoje</button>
          <button className="chip" onClick={() => setDay(addDays(ymd(new Date()), 1))}>Amanhã</button>
          <button className="chip" onClick={() => setDay(nextMonday)}>Próxima semana</button>
        </div>
        <div className="row2">
          <label className="field"><span className="label">Dia</span><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
          <label className="field"><span className="label">Refeição</span><select value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>{MEALS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
        </div>
        <p className="hint">Vai para o seu cardápio (1 porção). Depois dá para mudar as porções.</p>
      </Sheet>}
    </Sheet>
  )
}

// Reduz a foto (até 1280 px, JPEG) antes de enviar, para economizar espaço.
export async function compress(file: File): Promise<Blob> {
  const img = await createImageBitmap(file)
  const s = Math.min(1, 1280 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.8))
}

function RecipeEditor({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const { me, insert, update, remove, toast } = useData()
  const cats = useModuleCategories('alimentacao')
  const sections = useModuleCategories('mercado').filter((c) => !c.parent_id)
  const [name, setName] = useState(recipe?.name ?? '')
  const [link, setLink] = useState(recipe?.link ?? '')
  const [photo, setPhoto] = useState(recipe?.photo_url ?? '')
  const [catIds, setCatIds] = useState<string[]>(recipe?.category_ids ?? [])
  const [servings, setServings] = useState(String(recipe?.servings ?? 2))
  const [prep, setPrep] = useState(recipe?.prep_minutes != null ? String(recipe.prep_minutes) : '')
  const [kcal, setKcal] = useState(recipe?.kcal_per_serving != null ? String(recipe.kcal_per_serving) : '')
  const [ings, setIngs] = useState<Ingredient[]>(recipe?.ingredients ?? [])
  const [newIng, setNewIng] = useState('')
  const [steps, setSteps] = useState(recipe?.steps ?? '')
  const [uploading, setUploading] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const valid = name.trim() !== '' && Number(servings) > 0
  const addIng = () => { if (!newIng.trim()) return; setIngs([...ings, parseItem(newIng)]); setNewIng('') }
  const upload = async (f: File) => {
    setUploading(true)
    const blob = await compress(f).catch(() => f)
    const path = `${me!.household_id}/${crypto.randomUUID()}.jpg`
    const { error } = await sb.storage.from('receitas').upload(path, blob, { contentType: 'image/jpeg' })
    setUploading(false)
    if (error) return toast(friendly(error.message))
    setPhoto(sb.storage.from('receitas').getPublicUrl(path).data.publicUrl)
  }
  const save = async () => {
    const row = { name: name.trim(), link: link.trim(), photo_url: photo, category_ids: catIds, servings: Number(servings), prep_minutes: prep ? Number(prep) : null, kcal_per_serving: kcal ? Math.round(Number(kcal)) : null, ingredients: ings, steps }
    const r = recipe ? await update('recipes', recipe.id, row) : await insert('recipes', row)
    if (r) { toast('Receita salva.'); onClose() }
  }
  return (
    <Sheet title={recipe ? 'Editar receita' : 'Nova receita'} onClose={onClose} footer={<>
      {recipe && <button className="icon-btn danger" aria-label="Excluir" onClick={() => setConfirmDel(true)}><Icon name="trash" /></button>}
      <span className="grow" /><button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!valid || uploading} onClick={save}>Salvar</button></>}>
      <input className="title-input" autoFocus={!recipe} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da receita" aria-label="Nome" />
      <label className="field"><span className="label">Link (Instagram, TikTok, site)</span><input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" /></label>
      <div className="field"><span className="label">Foto (opcional)</span>
        {photo && <img className="recipe-photo" src={photo} alt="" />}
        <div className="row2">
          <label className="btn">{uploading ? 'Enviando…' : photo ? 'Trocar foto' : 'Escolher foto'}<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} /></label>
          {photo && <button className="btn" onClick={() => setPhoto('')}>Remover</button>}
        </div></div>
      <div className="field"><span className="label">Categorias</span>
        <div className="chips wrap">{cats.map((c) => <CategoryChip key={c.id} cat={c} on={catIds.includes(c.id)} onClick={() => setCatIds(catIds.includes(c.id) ? catIds.filter((x) => x !== c.id) : [...catIds, c.id])} />)}
          {!cats.length && <span className="hint">Crie em Mais → Categorias → Alimentação (doce, salgado, fit…).</span>}</div></div>
      <div className="row2">
        <label className="field"><span className="label">Rende (porções)</span><input type="number" inputMode="numeric" min={1} value={servings} onChange={(e) => setServings(e.target.value)} /></label>
        <label className="field"><span className="label">Tempo (min)</span><input type="number" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} /></label>
      </div>
      <label className="field"><span className="label">Calorias por porção (opcional)</span><input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="Se souber (rótulo, app, nutricionista)" /></label>
      <div className="field"><span className="label">Ingredientes</span>
        <div className="list compact">{ings.map((i, k) => (
          <div key={k} className="list-row ing-edit">
            <input className="qty-input" inputMode="decimal" aria-label="Quantidade" value={i.qty == null ? '' : String(i.qty).replace('.', ',')} onChange={(e) => setIngs(ings.map((x, j) => j === k ? { ...x, qty: e.target.value.trim() ? Number(e.target.value.replace(',', '.')) || null : null } : x))} />
            <input className="unit-input" aria-label="Unidade" value={i.unit} onChange={(e) => setIngs(ings.map((x, j) => j === k ? { ...x, unit: e.target.value } : x))} />
            <input className="grow" aria-label="Ingrediente" value={i.name} onChange={(e) => setIngs(ings.map((x, j) => j === k ? { ...x, name: e.target.value } : x))} />
            {sections.length > 0 && <select className="sec-input" aria-label="Seção do mercado" value={i.section ?? ''} onChange={(e) => setIngs(ings.map((x, j) => j === k ? { ...x, section: e.target.value || null } : x))}>
              <option value="">Seção</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
            <button className="icon-btn" aria-label="Remover" onClick={() => setIngs(ings.filter((_, j) => j !== k))}><Icon name="x" size={16} /></button>
          </div>
        ))}</div>
        <div className="searchrow">
          <input value={newIng} onChange={(e) => setNewIng(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIng() } }} placeholder="Ex.: 300 g de frango" />
          <button className="btn" onClick={addIng}>Adicionar</button>
        </div>
        <span className="hint">Escreva como fala: "2 kg tomate", "1 xícara de arroz", "sal".</span></div>
      <label className="field"><span className="label">Modo de preparo</span><textarea rows={6} value={steps} onChange={(e) => setSteps(e.target.value)} /></label>
      {confirmDel && recipe && <Confirm title="Excluir receita?" message="Ela sai do cardápio e do diário (os itens ficam sem receita)." onConfirm={async () => { if (await remove('recipes', recipe.id)) onClose() }} onClose={() => setConfirmDel(false)} />}
    </Sheet>
  )
}

// ───────────────────────── Mercado ─────────────────────────

function Mercado() {
  const { shopping_items, profiles, me, update, remove, toast } = useData()
  const addToList = useAddToList()
  const sections = useModuleCategories('mercado').filter((c) => !c.parent_id)
  const [text, setText] = useState('')
  const [section, setSection] = useState('')
  const [edit, setEdit] = useState<ShoppingItem | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const items = shopping_items.filter((s) => !s.archived_at)
  const open = items.filter((s) => !s.checked_at)
  const bought = items.filter((s) => s.checked_at).sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''))
  const groups = [...sections.map((s) => ({ id: s.id, name: s.name, color: s.color })), { id: '', name: 'Outros', color: '#9a9890' }]
    .map((g) => ({ ...g, items: open.filter((i) => (i.category_id ?? '') === g.id || (g.id === '' && i.category_id && !sections.some((s) => s.id === i.category_id))).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length)
  const add = async () => {
    if (!text.trim()) return
    const it = parseItem(text)
    await addToList([{ ...it, section: section || null }], '')
    setText('')
  }
  const toggle = (i: ShoppingItem) => update('shopping_items', i.id, { checked_at: i.checked_at ? null : new Date().toISOString() })
  const by = (id: string) => (id === me!.id ? '' : profiles.find((p) => p.id === id)?.display_name ?? '')
  return (
    <>
      <div className="card form-card">
        <div className="searchrow">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add() }} placeholder="Ex.: 2 kg tomate" aria-label="Novo item" />
          <button className="btn primary" onClick={add} aria-label="Adicionar"><Icon name="plus" /></button>
        </div>
        {sections.length > 0 && <div className="chips scroll">
          <button className={'chip' + (!section ? ' on' : '')} onClick={() => setSection('')}>Sem seção</button>
          {sections.map((s) => <button key={s.id} className={'chip' + (section === s.id ? ' on' : '')} onClick={() => setSection(section === s.id ? '' : s.id)}><span className="dot" style={{ background: s.color }} />{s.name}</button>)}
        </div>}
        {!sections.length && <span className="hint">Crie seções (hortifrúti, açougue…) em Mais → Categorias → Mercado → Criar sugestões.</span>}
      </div>
      <p className="muted small pad">{open.length} para comprar · a lista é do casal e atualiza na hora nos dois celulares.</p>
      {groups.map((g) => (
        <section key={g.id || 'outros'}>
          <div className="section-head"><h2><span className="dot" style={{ background: g.color }} /> {g.name}</h2></div>
          <div className="list">{g.items.map((i) => (
            <div key={i.id} className="card shop-item">
              <button className="ev-check big" style={{ ['--c' as string]: g.color }} aria-label="Comprado" onClick={() => toggle(i)} />
              <button className="grow shop-main" onClick={() => setEdit(i)}>
                <strong>{i.name}{i.qty != null && <span className="qty"> · {fmtQty(i.qty, i.unit)}</span>}</strong>
                {(i.origin || by(i.owner_id)) && <span className="muted small">{[i.origin, by(i.owner_id) && `por ${by(i.owner_id)}`].filter(Boolean).join(' · ')}</span>}
              </button>
            </div>
          ))}</div>
        </section>
      ))}
      {!open.length && <Empty icon="cart" title="Lista vazia" text="Adicione itens acima ou mande os ingredientes que faltam de uma receita." />}
      {bought.length > 0 && <section>
        <div className="section-head"><h2>Comprados ({bought.length})</h2><button className="link" onClick={() => setConfirmClear(true)}>Limpar</button></div>
        <div className="list">{bought.slice(0, 30).map((i) => (
          <div key={i.id} className="card shop-item done">
            <button className="ev-check big" style={{ ['--c' as string]: 'var(--pos)' }} aria-label="Voltar para a lista" onClick={() => toggle(i)}><Icon name="check" size={12} /></button>
            <span className="grow shop-main"><strong>{i.name}{i.qty != null && <span className="qty"> · {fmtQty(i.qty, i.unit)}</span>}</strong></span>
          </div>
        ))}</div>
      </section>}
      {edit && <ShopEditor item={edit} sections={sections.map((s) => ({ id: s.id, name: s.name }))} onClose={() => setEdit(null)} onDelete={async () => { if (await remove('shopping_items', edit.id)) setEdit(null) }} />}
      {confirmClear && <Confirm title="Limpar comprados?" message={`${bought.length} itens comprados saem da lista.`} confirm="Limpar" onClose={() => setConfirmClear(false)}
        onConfirm={async () => { for (const b of bought) await remove('shopping_items', b.id); toast('Comprados removidos.') }} />}
    </>
  )
}

function ShopEditor({ item, sections, onClose, onDelete }: { item: ShoppingItem; sections: { id: string; name: string }[]; onClose: () => void; onDelete: () => void }) {
  const { update, toast } = useData()
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.qty == null ? '' : String(item.qty).replace('.', ','))
  const [unit, setUnit] = useState(item.unit)
  const [sec, setSec] = useState(item.category_id ?? '')
  return (
    <Sheet title="Item do mercado" onClose={onClose} footer={<>
      <button className="icon-btn danger" aria-label="Excluir" onClick={onDelete}><Icon name="trash" /></button><span className="grow" />
      <button className="btn" onClick={onClose}>Cancelar</button>
      <button className="btn primary" disabled={!name.trim()} onClick={async () => {
        const q = qty.trim() ? Number(qty.replace(',', '.')) : null
        if (await update('shopping_items', item.id, { name: name.trim(), qty: q && q > 0 ? q : null, unit: unit.trim(), category_id: sec || null })) { toast('Item salvo.'); onClose() }
      }}>Salvar</button></>}>
      <label className="field"><span className="label">Item</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="row2">
        <label className="field"><span className="label">Quantidade</span><input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
        <label className="field"><span className="label">Unidade</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, un, pacote" /></label>
      </div>
      <label className="field"><span className="label">Seção</span><select value={sec} onChange={(e) => setSec(e.target.value)}><option value="">Outros</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      {item.origin && <p className="hint">Origem: {item.origin}</p>}
    </Sheet>
  )
}
