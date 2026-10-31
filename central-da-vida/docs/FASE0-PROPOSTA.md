# Central da Vida · Fase 0: proposta

Baseada na *Especificação funcional v1.0 (31/10/2026)*. Este documento **não autoriza código**: ele existe para você aprovar, corrigir ou recusar antes da Fase 1.

---

## 1. Resumo em uma frase

Um app único, mobile-first, com **quatro contextos financeiros** (Empresa Júlia, Júlia PF, Michelangelo PF, Casal) e **três escopos de visibilidade** (Júlia, Michelangelo, Casal). Todo registro tem dono, escopo e permissões; as telas pessoais *calculam* a parte de cada um, sem copiar valores.

---

## 2. Arquitetura enxuta (proposta)

Reaproveita o que você já opera no Creative OS, para não abrir contas e custos novos sem necessidade.

| Camada | Escolha | Por quê |
|---|---|---|
| Plataforma | **PWA** (app web instalável no celular) | Um código só para iPhone, Android e computador; sem loja de apps; atualiza na hora |
| Front-end | React + TypeScript + Vite | 8 módulos com muitos componentes reutilizáveis (cartões, filtros, calendário, gráficos). Um arquivo HTML único, como no Creative OS, não aguenta esse tamanho |
| Banco e login | **Supabase** (Postgres + Auth Google + Realtime + Storage) | Já conhecido; segurança por linha (RLS) resolve "cada um vê o que pode"; Realtime sincroniza os dois perfis |
| Servidor | Funções da Vercel (como hoje) + rotinas agendadas do Supabase (pg_cron) | Lembretes, materialização de recorrências, envio de push, backup |
| Notificações | Web Push | Ver limitações na seção 6 |
| IA (só Fase 7) | API do Claude chamada pelo servidor, nunca pelo navegador | Chave fora do código; enviar ao modelo só o mínimo |
| WhatsApp (só Fase 8) | WhatsApp Business Cloud API (oficial da Meta) | Única via oficial; custos e aprovação avaliados antes |

**Recomendação de organização:** repositório e projeto Supabase **separados** do Creative OS (dados de outra pessoa, finanças, regras diferentes). A pasta `central-da-vida/` aqui é só para esta proposta e pode ser movida.

### Regras de engenharia

- Dinheiro em **centavos inteiros** (BRL), nunca número com vírgula flutuante.
- Datas guardadas em UTC com fuso `America/Sao_Paulo`; competência e caixa como campos distintos.
- Totais sempre **calculados** a partir das transações (views no banco), nunca digitados em dois lugares.
- Regras determinísticas primeiro; IA só para interpretar linguagem, estimar foto e sugerir.
- Nenhum pagamento automático: só links e instruções.

---

## 3. Mapa de telas

Navegação inferior com 5 botões; o restante entra por "Mais".

```
[Hoje]  [Finanças]  [ + ]  [Agenda]  [Mais]
                     │
                     └─ ação rápida: despesa · receita · água · evento · hábito · item de mercado · lembrete p/ parceiro
```

| Área | Telas |
|---|---|
| **Hoje** | Resumo do dia: compromissos, vencimentos, hábitos do dia, garrafa de água, refeições planejadas, alertas de orçamento |
| **Finanças** | Abas Empresa · Júlia PF · Michelangelo PF · Casal (cada um só vê as suas + Casal) → Visão do mês · Lançamentos · Calendário financeiro · Contas e cartões · Favorecidos/Pix · Assinaturas · Orçamentos · Caixinhas · Gráficos · Simulador |
| **Agenda** | Dia · Semana · Mês · Lista; filtros: meus, casal, do parceiro que me afetam, hábitos, recebimentos, vencimentos |
| **Mais → Hábitos** | Lista de hábitos, marcação diária, heatmap semanal/mensal/anual, água |
| **Mais → Alimentação** | Cardápio da semana · Receitas · Diário alimentar · Lista de mercado (compartilhada) |
| **Mais → Treinos** | Fichas por dia · Exercício com foto/vídeo · Biblioteca de mídias · "O que ouvir hoje" |
| **Mais → Assistente** | Chat com confirmação antes de gravar (Fase 7) |
| **Mais → Ajustes** | Perfil, categorias (criar/renomear/colorir/ordenar/arquivar), notificações, permissões entre parceiros, visualizações salvas, exportar/backup |

Componentes globais: barra de filtros combináveis (escopo, categoria, data, tipo, status, módulo) com "salvar visualização"; busca; seletor de escopo em todo formulário.

Os mockups visuais podem ser feitos como protótipo clicável **sem dados reais**, se você quiser vê-los antes de aprovar a Fase 1.

---

## 4. Modelo de dados preliminar

### 4.1 Pilares de propriedade

Toda tabela de conteúdo tem: `id`, `owner_id` (quem criou), `scope` (`julia` | `michelangelo` | `casal`), `created_at`, `updated_at`, `archived_at`. Finanças acrescentam `context` (`empresa_julia` | `pf_julia` | `pf_michelangelo` | `casal`).

| Regra | Como o banco garante |
|---|---|
| Escopo pessoal | só o dono lê e escreve (RLS) |
| Escopo Casal | os dois membros do "household" leem e escrevem |
| Empresa Júlia | só Júlia |
| Exceções | tabela `grants` (permissão explícita por registro ou módulo) |
| "Impacta minha agenda" | o parceiro **não** lê o evento; lê uma view que mostra só horário e "Ocupado / impacta você" |

### 4.2 Entidades

| Grupo | Tabelas |
|---|---|
| Base | `profiles`, `households`, `household_members`, `grants`, `categories` (hierárquica, cor, ordem, módulo), `saved_views`, `audit_log` |
| Finanças | `accounts` (conta, carteira, saldo inicial), `cards`, `payees` (nome, chave Pix, observações), `transactions`, `recurrences`, `splits`, `transfers`, `budgets`, `subscriptions`, `goals` (caixinhas), `goal_contributions`, `simulations` |
| Agenda | `events`, `event_participants`, `reminders`, `notification_prefs`, `push_subscriptions` |
| Hábitos | `habits`, `habit_logs`, `water_goals`, `water_logs` |
| Alimentação | `recipes`, `ingredients`, `recipe_ingredients`, `meal_plans`, `meals`, `food_logs`, `calorie_goals`, `shopping_items` |
| Treinos | `workouts`, `workout_exercises`, `media_links` |
| IA | `ai_actions` (o que foi pedido, interpretado, confirmado, executado) |

### 4.3 Transação (o centro das finanças)

```
transactions
  kind            receita | despesa | transferencia
  context         empresa_julia | pf_julia | pf_michelangelo | casal
  status          previsto | realizado | cancelado        (vencido = previsto + vencimento < hoje, calculado)
  amount_cents    inteiro
  competence_date data de competência
  due_date        vencimento
  paid_date       data de caixa (quando realizado)
  account_id, card_id, payee_id, category_id
  payment_method  pix | boleto | cartao | dinheiro | transferencia | outro
  payment_link
  client_source   cliente/fonte (receitas)
  tags            UGC, TikTok, ...
  recurrence_id, installment_no, installment_total
  responsible_id
```

### 4.4 Regras que evitam dupla contagem

1. **Despesa do Casal** existe uma vez só, no contexto `casal`. `splits` diz quanto é de cada um (50/50, proporção ou valor fixo). A tela de Júlia PF mostra "minha parte do casal" calculada, sem lançar cópia.
2. **Empresa → pessoa** (pró-labore, transferência): um registro em `transfers` liga uma saída da empresa e uma entrada em Júlia PF. Receita da empresa nunca aparece como dinheiro pessoal disponível.
3. **Caixinha**: aporte é transferência da conta para a meta, não despesa. O saldo disponível desconta o que está na caixinha uma vez só.
4. **Recorrência e parcelas**: a regra fica em `recurrences`; as ocorrências são geradas como `previsto` para os próximos 12 meses, para poder editar uma isolada.
5. **Histórico financeiro**: categoria com lançamentos é arquivada, não apagada; exclusão de lançamento pede confirmação e fica no `audit_log`.

### 4.5 Segredos

- Nada de senha de banco ou de assinatura em texto. `subscriptions` guarda só um **link para o item no gerenciador de senhas** (Bitwarden, 1Password ou o que vocês usarem).
- Chave Pix é dado de cobrança, não credencial; fica guardada normalmente.

---

## 5. Decisões técnicas que precisam da sua escolha

| # | Decisão | Recomendo |
|---|---|---|
| D1 | Onde fica o projeto | Repositório novo `central-da-vida` + Supabase novo |
| D2 | Plataforma | PWA |
| D3 | Login | Google para os dois |
| D4 | Hospedagem | Planos gratuitos no começo (Vercel Hobby + Supabase Free); avaliar Supabase pago só se precisar |
| D5 | Senhas de assinaturas | Link para gerenciador de senhas existente, nada guardado no app |

Ficam **para depois**, quando a fase pedir: regras padrão de rateio (Fase 2), o que o parceiro vê de um evento que o impacta (Fase 4), saldos iniciais e limites reais (Fases 2–3), fonte de dados nutricionais (Fase 5), sincronização com Google Agenda (avaliar na Fase 4).

---

## 6. Riscos, limitações e custos

| Tema | Realidade | Alternativa |
|---|---|---|
| Push no iPhone | Só funciona com o app **adicionado à Tela de Início** (iOS 16.4+) e permissão concedida. No Android funciona pelo navegador | Lembretes também aparecem dentro do app; fallback por e-mail se quiserem |
| Widget de água na tela inicial | **PWA não cria widget** de tela inicial | Notificação com ação rápida "+250 ml" (Android) e atalho rápido dentro do app; widget nativo só com app nativo (fora do escopo) |
| Calorias por foto | Estimativa com incerteza; foto sozinha não dá precisão | Sempre pedir porção, mostrar faixa e permitir corrigir |
| Supabase Free | Projeto gratuito pausa após ~1 semana sem uso e tem limites de espaço | Uso diário evita pausa; backup/exportação desde a Fase 1 |
| Custos de IA | Cobrado por uso; baixo se a IA só interpretar frases curtas | Comandos estruturados e consultas diretas sem IA; teto mensal configurável |
| WhatsApp | API oficial exige conta Business verificada, número dedicado e cobra por conversa/mensagem conforme tabela da Meta | Avaliar preço vigente na Fase 8 antes de qualquer contratação |
| Contabilidade da empresa | O app é **gestão** (fluxo de caixa), não contabilidade fiscal | Exportar CSV para a contadora |
| Escopo grande | 8 módulos; risco de nada ficar pronto | Uma fase por vez, cada uma usável sozinha |

Valores de planos pagos mudam; serão conferidos nas fontes oficiais quando a decisão aparecer, sem estimativa inventada aqui.

---

## 7. Plano de entregas

| Fase | Entrega | Complexidade |
|---|---|---|
| 0 | Esta proposta (+ protótipo clicável opcional) | Baixa |
| 1 | Base multiusuário: login, household, escopos, RLS, navegação, categorias coloridas, filtros globais, visualizações salvas, backup | Média |
| 2 | Finanças essenciais: 4 abas, contas, cartões, entradas, despesas, Pix, rateio, transferências empresa→PF, calendário financeiro, saldos | Alta |
| 3 | Planejamento: orçamentos, caixinhas, alertas, gráficos, projeção, simulador (regras, sem IA) | Alta |
| 4 | Agenda e hábitos: calendários, eventos cruzados com privacidade, lembretes, push, hábitos, heatmap, água | Alta |
| 5 | Alimentação: receitas, cardápio, lista de mercado com deduplicação, diário manual | Média |
| 6 | Treinos e biblioteca | Baixa |
| 7 | IA no app: comandos com confirmação, simulador em linguagem natural, assistente culinário, estimativa nutricional | Média |
| 8 | WhatsApp, áudio, notificações avançadas | Alta (depende de terceiros) |

Cada fase termina com: changelog curto, roteiro de teste com os dois perfis, limitações conhecidas e pedido de aprovação.

---

## 8. Critérios de aceite da Fase 0

- [ ] Você leu e aprovou (ou corrigiu) arquitetura, mapa de telas e modelo de dados.
- [ ] Decisões D1 a D5 respondidas.
- [ ] Riscos da seção 6 entendidos e aceitos.
- [ ] Ordem das fases confirmada (ou alterada).

## 9. Critérios de aceite propostos para a Fase 1 (para referência)

- Júlia e Michelangelo entram com Google; qualquer outro e-mail é recusado.
- Um registro privado de Júlia **não aparece** para Michelangelo (testado direto no banco, não só na tela), e vice-versa.
- Um registro do Casal criado por um aparece no celular do outro em poucos segundos, sem recarregar.
- Categorias: criar, renomear, colorir, reordenar, arquivar; excluir pede confirmação.
- Filtros combinados (escopo + categoria + data) funcionam e podem ser salvos.
- Telas legíveis em celular de 360 px de largura; app instalável na Tela de Início.
- Exportar todos os meus dados em um arquivo.
