-- Central da Vida · Ajuste da agenda · Tipo do compromisso (pessoal ou trabalho), visível para os dois.
-- Pode rodar de novo sem problema.
alter table public.events add column if not exists nature text not null default 'pessoal' check (nature in ('pessoal', 'trabalho'));
