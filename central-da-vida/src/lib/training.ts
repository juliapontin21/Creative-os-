// Treinos e biblioteca: cálculos puros (sem imports, para os testes do Node).

export const KINDS: { id: string; label: string; audio: boolean }[] = [
  { id: 'podcast', label: 'Podcast', audio: true }, { id: 'musica', label: 'Música', audio: true }, { id: 'playlist', label: 'Playlist', audio: true },
  { id: 'audiolivro', label: 'Audiolivro', audio: true }, { id: 'video', label: 'Vídeo', audio: false }, { id: 'documentario', label: 'Documentário', audio: false },
  { id: 'serie', label: 'Série', audio: false }, { id: 'outro', label: 'Outro', audio: false },
]
export const ACTIVITIES = ['Musculação', 'Cardio', 'Dança', 'Alongamento/Yoga', 'Caminhada', 'Corrida', 'Esporte', 'Pilates', 'Natação']
export const kindLabel = (k: string) => KINDS.find((x) => x.id === k)?.label ?? k

interface WorkoutLike { id: string; week_days: number[]; archived_at: string | null; position: number }
export const workoutsForDay = <T extends WorkoutLike>(ws: T[], dow: number) => ws.filter((w) => !w.archived_at && w.week_days.includes(dow)).sort((a, b) => a.position - b.position)

// Última carga registrada para um exercício (pelo nome), do treino mais recente para o mais antigo.
interface SessionLike { date: string; created_at: string; items: { name: string; load_kg?: number | null; done?: boolean }[] }
export function loadHistory(sessions: SessionLike[], exercise: string): { date: string; load: number }[] {
  const key = exercise.trim().toLowerCase()
  return [...sessions].sort((a, b) => (b.date + b.created_at).localeCompare(a.date + a.created_at))
    .flatMap((s) => s.items.filter((i) => i.name.trim().toLowerCase() === key && i.load_kg != null).map((i) => ({ date: s.date, load: Number(i.load_kg) })))
}

// Tempo estimado: séries × (repetições × 3 s ou tempo) + descanso entre séries.
interface ExLike { sets: number | null; reps: string; duration_sec: number | null; rest_sec: number | null }
export function estimateMinutes(exs: ExLike[]): number {
  const sec = exs.reduce((s, e) => {
    const sets = e.sets ?? 1
    const reps = Number((e.reps.match(/\d+/g) ?? ['10']).slice(-1)[0])
    const work = e.duration_sec ?? reps * 3
    return s + sets * work + Math.max(0, sets - 1) * (e.rest_sec ?? 60)
  }, 0)
  return Math.max(5, Math.round(sec / 60))
}

// "O que ouvir hoje": só áudio, não concluído; primeiro o que está em andamento,
// depois o mais próximo da duração do treino (sem duração vai por último).
interface ItemLike { id: string; kind: string; status: string; duration_min: number | null; archived_at: string | null; created_at: string }
export function suggestListen<T extends ItemLike>(items: T[], minutes: number, n = 3): T[] {
  const audio = new Set(KINDS.filter((k) => k.audio).map((k) => k.id))
  const dist = (i: T) => (i.duration_min == null ? 1e6 : Math.abs(i.duration_min - minutes))
  return items.filter((i) => !i.archived_at && audio.has(i.kind) && i.status !== 'concluido')
    .sort((a, b) => (a.status === 'andamento' ? 0 : 1) - (b.status === 'andamento' ? 0 : 1) || dist(a) - dist(b) || a.created_at.localeCompare(b.created_at))
    .slice(0, n)
}
