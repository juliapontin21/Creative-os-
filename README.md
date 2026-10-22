# Creative OS

Sistema operacional de produção de conteúdo da Julia Pontin: UGC, TikTok Shop, marca pessoal e gestão de redes.

O diferencial: transformar momentos reais da rotina em oportunidades organizadas de gravação. Você diz onde está ("estou na praia", "estou cozinhando") e o sistema mostra quais takes gravar, para quais conteúdos eles servem e onde guardar os arquivos.

## Estrutura

| Pasta | O que tem |
|---|---|
| `docs/ARQUITETURA.md` | Análise do briefing, modelo de dados, fluxos, lacunas, MVP × integrações, plano por fases |
| `app/index.html` | Fase 1: aplicativo interativo mobile-first (um arquivo) |
| `app/seed/` | Scripts e dados: demonstração e o inventário real (`real/`) |
| `web/` | Fase 2: app web (Vercel). `index.html` é gerado de `app/index.html` por `web/build.py`; `api/` tem login com Google, token do Drive e IA |
| `supabase/schema.sql` | Tabelas do banco (Supabase) com acesso só da dona |
| `docs/FASE2-SETUP.md` | Passo a passo para colocar a Fase 2 no ar |

## Fase 2 (em configuração)

O mesmo app roda fora do Claude, com login Google, banco próprio, backup diário, microfone e upload real para o Google Drive (original em Biblioteca de Takes, atalhos nas pastas dos conteúdos). Siga `docs/FASE2-SETUP.md`.

## Fase 1 (MVP interativo, artefato no Claude)

Funciona de verdade: projetos e frentes, referências com busca por intenção, ideias e plano mensal, conteúdos com roteiro em 3 modos (roteiro, captação, edição) e modo leitura, banco universal de takes, Captar agora, catálogo contextual de produtos, calendário unificado com filtros, planejamento reverso e reagendamento, indicadores.

Simulado (e marcado como simulação na tela): envio de arquivos e organização no Google Drive.

Próximas fases: veja a seção 8 de `docs/ARQUITETURA.md`.
