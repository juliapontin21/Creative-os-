-- Central da Vida · Ajuste da agenda · Título sem limite de tamanho e checklist de atividades em cada compromisso.
-- Pode rodar de novo sem problema.
alter table public.events drop constraint if exists events_title_check;
alter table public.events add constraint events_title_check check (length(trim(title)) >= 1);
alter table public.events add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.events drop constraint if exists events_checklist_is_array;
alter table public.events add constraint events_checklist_is_array check (jsonb_typeof(checklist) = 'array');
