-- Central da Vida · Ajuste da Fase 6 · Tipo de atividade (musculação, cardio, dança…) nas fichas e nos treinos feitos.
-- Pode rodar de novo sem problema.
alter table public.workouts add column if not exists activity text not null default 'Musculação' check (length(trim(activity)) between 1 and 40);
alter table public.workout_sessions add column if not exists activity text not null default 'Musculação' check (length(trim(activity)) between 1 and 40);
