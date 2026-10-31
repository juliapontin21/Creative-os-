# Central da Vida

App pessoal da Júlia e do Michelangelo: finanças, agenda, hábitos, alimentação, mercado e treinos, com áreas individuais e do casal.

PWA (React + TypeScript + Vite) com Supabase (Postgres, login Google, RLS, tempo real), hospedado na Vercel. Independente do Creative OS: banco e projeto Vercel próprios.

| Arquivo | O que tem |
|---|---|
| `docs/FASE0-PROPOSTA.md` | Arquitetura, telas, modelo de dados, riscos e plano por fases |
| `docs/FASE1.md` | Changelog, passo a passo de configuração, roteiro de teste e limitações da Fase 1 |
| `docs/REGRAS-FINANCEIRAS.md` | Regras da casa (mesada, cartão do casal, parcelas, indicadores) |
| `docs/FASE2-PROPOSTA.md` · `docs/FASE2A.md` · `docs/FASE2B.md` · `docs/FASE3-PROPOSTA.md` · `docs/FASE3A.md` | Proposta da Fase 2 e entregas 2A e 2B (changelog, configuração, testes) |
| `supabase/schema.sql` | Base: tabelas, privacidade e gatilhos (rodar primeiro) |
| `supabase/fase2a.sql` | Finanças 2A: contas, cartões, favorecidos, lançamentos (rodar depois) |
| `supabase/fase2b.sql` | Finanças 2B: renda de referência, contas fixas/assinaturas, mês do casal |
| `supabase/fase3a.sql` | Planejamento 3A: regras da casa, caixinhas, limites, tipo de gasto |
| `src/` | O app |
