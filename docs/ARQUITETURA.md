# Creative OS — Arquitetura e plano de implementação

Documento de análise do Briefing Mestre (seção 24, passos 1 a 8). Serve de referência para todas as fases do projeto.

---

## 1. Leitura do briefing em uma frase

O Creative OS é um **grafo de produção**: referências, ideias, conteúdos, roteiros, takes, produtos, arquivos, compromissos e publicações são entidades independentes ligadas por relacionamentos muitos-para-muitos. As telas são apenas formas diferentes de percorrer esse grafo. O "Captar agora" percorre a partir de um **contexto** (onde estou); o calendário percorre a partir de uma **data**.

Os dois testes decisivos do briefing:

1. **Captar agora** — contexto → takes pendentes de vários conteúdos + produtos compatíveis → gravar → marcar → enviar arquivo.
2. **Calendário** — data → compromissos + gravações (fixas e flexíveis) + edições + publicações, com dependências entre elas.

Todo o resto alimenta esses dois fluxos.

---

## 2. Relacionamentos entre os módulos

```
Referência ──< ref_conteudo >── Conteúdo ──< conteudo_take >── Take ──< take_arquivo >── Arquivo
    │                              │   │                          │
    ├──< ref_produto >── Produto ──┼───┼──< take_produto >────────┘
    │                       │      │   │
    └──< ref_ideia >── Ideia┘      │   └──< Publicação (1 conteúdo : N publicações)
                                   │
          Projeto ──< Frente ──────┤
             │                     │
             └──< Atividade ───────┼── contextos ── Take / Produto
                                   │
          Compromisso ──< compromisso_conteudo >──┘
             │
             └──< Tarefa de produção (gravação, edição, revisão, finalização)
```

O elo que conecta "o que estou vivendo" com "o que preciso gravar" é o **contexto** (praia, academia, cozinha, evento, reunião...). Ele aparece em três lugares:

| Entidade | Uso do contexto |
|---|---|
| Take | Onde ele pode ser gravado |
| Produto | Onde ele faz sentido aparecer (principal / recomendado / alternativo) |
| Atividade de projeto e compromisso | Onde eu estarei e quando |

Cruzando os três, o sistema responde "o que gravar agora" (contexto atual) e "o que gravar naquele dia" (contexto previsto na agenda).

---

## 3. Arquitetura de informação (navegação)

Seis áreas, conforme a seção 17 do briefing:

| Área | Conteúdo |
|---|---|
| **Início** | Hoje: compromissos, gravações, edições, publicações, prazos próximos, oportunidades de gravação ligadas à agenda, botão Captar agora |
| **Ideias** | Referências (busca por intenção) · Ideias · Planejamento mensal e equilíbrio de objetivos/públicos |
| **Produção** | Conteúdos (roteiro em 3 modos) · Banco de takes · Takes gravados / biblioteca · Edição e publicação |
| **Captar agora** | Botão central. Contexto → takes consolidados + produtos + sugestões criativas → marcar → enviar |
| **Calendário** | Dia · Semana · Mês · Lista, filtros combináveis, planejamento reverso, fixo/flexível |
| **Projetos** | Projetos e experiências (frentes, atividades) · Catálogo TikTok Shop · Indicadores |

---

## 4. Modelo de dados

Todas as entidades têm `id`, `createdAt`, `updatedAt`. Relacionamentos são guardados como listas de IDs no MVP e viram tabelas de junção na Fase 2.

| Entidade | Campos principais |
|---|---|
| **Referência** | título, url, observações, por que gostei, como adaptar, formatos[], objetivos[], públicos[], plataformas[], características[], produtoIds[], projetoIds[], conteudoIds[], dados TikTok Shop (gancho, benefício, objeção, contexto de uso, estilo de venda) |
| **Ideia** | título, descrição, refIds[], público, objetivo, plataforma, formato, projetoId, prioridade, status, data prevista |
| **Conteúdo** | título, projetoId, frenteId, objetivos[], públicos[], plataformas[], formato, refIds[], produtoIds[], status, datas (gravação, edição, publicação), roteiro |
| **Roteiro** | versão, falas[] (cena, texto, indicação de interpretação, takeIds[] para montagem, orientações de edição, texto na tela, transição) |
| **Take** | código (T-001), descrição, ação, enquadramento, cenário, contextos[], localização, participante, produtoIds[], duração, prioridade, status (pendente/gravado), conteudoIds[], arquivoIds[], compromissoId (quando é fixo), espontâneo, observações |
| **Arquivo** | nome, tamanho, tipo, data, driveFileId, caminho, takeIds[], simulado (true no MVP) |
| **Produto** | nome, marca, categoria, link, benefícios, público, contextos[] {contexto, nível}, refIds[], prioridade, status, disponível fisicamente |
| **Projeto** | nome, período, objetivos, participantes, frentes[], atividades[] {nome, data, contextos[]} |
| **Compromisso / tarefa** | título, data, hora, tipo (compromisso, gravação, edição, revisão, publicação), contextos[], local, projetoId, conteudoIds[], fixo/flexível, responsável, status, origemId (para mover junto) |
| **Publicação** | conteudoId, plataforma, data, hora, formato, status, link, arquivo final |

### Regras de integridade

- Take e arquivo são entidades distintas: "planejado" nunca vira "gravado" sem ação explícita (ou upload).
- Um take pode ter vários arquivos; um arquivo pode servir a vários takes.
- Remover um take de um roteiro só desfaz o vínculo; o take e os arquivos continuam existindo.
- Nenhum arquivo é apagado automaticamente. Antes de qualquer exclusão, verificar se há outros vínculos.
- A data passar não marca nada como concluído.
- Ao mover um compromisso, as gravações vinculadas a ele acompanham; conflitos de prazo são sinalizados.

---

## 5. Fluxos de navegação principais

**Captar agora (fluxo D + E)**
1. Toque no botão central.
2. Digite ou toque em um contexto ("estou na academia", "cozinhando").
3. O sistema identifica contextos pelo texto (sinônimos), cruza com takes pendentes e produtos.
4. Lista ordenada por: nº de conteúdos beneficiados, prazo mais próximo, dependência daquele local, prioridade.
5. Cada take mostra para quais conteúdos serve. Takes parecidos ficam agrupados por cenário, preservando cada um.
6. Produtos compatíveis (principal e recomendado; alternativos recolhidos).
7. Sugestões criativas da IA, sempre rotuladas como sugestão.
8. Marcar como gravado ou enviar arquivo → status do take e progresso dos conteúdos atualizam na hora.

**Calendário (fluxo F)**
1. Cadastrar compromisso (ex.: networking dia 20) com contexto "evento".
2. Vincular conteúdos. O sistema mostra os takes compatíveis com aquele contexto e cria a gravação fixa no mesmo dia.
3. Ao abrir o dia: evento → gravações relacionadas → takes necessários.
4. Planejamento reverso a partir da publicação: sugere gravação, edição e revisão, respeitando eventos fixos e dias carregados.

**Planejamento mensal (fluxo B)**
Informar quantidades por objetivo → sistema busca ideias e referências compatíveis → selecionar → virar conteúdos → definir publicação → calendário sugere prazos.

---

## 6. Conflitos e lacunas identificados no briefing

| # | Ponto | Proposta |
|---|---|---|
| 1 | "Identificar o take correspondente" no upload: identificar automaticamente pelo conteúdo do vídeo exige visão computacional | MVP: upload sempre a partir de um take (você está nele quando envia). Fase 3: sugerir associação por nome, data, local e análise de imagem |
| 2 | Upload direto do celular para o Drive com vídeos grandes | Precisa de upload resumível da API do Drive (vídeos passam de centenas de MB). Não cabe em um artefato; exige app web com backend ou PWA |
| 3 | Atalhos do Drive para evitar duplicação | Viável (atalho = arquivo do tipo `application/vnd.google-apps.shortcut`). Arquivo original fica em Biblioteca de Takes; pastas dos conteúdos recebem atalhos |
| 4 | "Remover do celular" | O app não pode apagar a galeria do celular. Pode apenas confirmar que o upload terminou e que é seguro você apagar |
| 5 | Contexto em texto livre ("meu namorado está cozinhando") | MVP: dicionário de sinônimos → contextos. Fase 3: interpretação por IA |
| 6 | Duplicidade de takes "parecidos mas diferentes" | MVP: agrupar por cenário/contexto sem fundir. Fase 3: similaridade semântica sugerindo fusão, sempre com confirmação |
| 7 | Referências por link externo (TikTok, Instagram) | Essas plataformas bloqueiam leitura automática. A IA trabalha com suas observações, não com o vídeo, e deixa isso explícito |
| 8 | Publicação automática | Fora do MVP, conforme o briefing. A entidade Publicação já tem os campos para isso |
| 9 | Participantes (ex.: Michelangelo) | Projetos e takes têm participante. Permissões para outra pessoa usar o app ficam para a Fase 2 |
| 10 | Notificações | Exigem push (PWA ou app). MVP mostra os mesmos alertas no Início |

---

## 7. MVP versus integrações

| Funcionalidade | Artefato do Claude (agora) | Exige |
|---|---|---|
| Cadastros, relacionamentos, status, progresso | Sim | — |
| Roteiro em 3 modos + modo leitura | Sim | — |
| Captar agora por contexto | Sim (sinônimos + pontuação) | — |
| Calendário, filtros, planejamento reverso, reagendamento | Sim | — |
| Dados salvos entre sessões | Sim (banco do artefato, privado para você) | Fase 2: banco próprio (ex.: Supabase/Postgres) |
| Busca por intenção | Sim, com IA do Claude sob demanda + busca local | Fase 3: embeddings para busca semântica sem custo por consulta |
| Sugestões criativas e planejamento por IA | Sim (IA do Claude, rotulada) | — |
| Upload de vídeo | **Simulado** (registra nome, tamanho, vínculos) | Fase 2: app web + Google Drive API (OAuth, upload resumível) |
| Pastas e atalhos no Drive | **Simulado** (mostra onde ficaria) | Fase 2: Drive API |
| Google Calendar | Não | Fase 2: Calendar API com OAuth, escolha de agendas autorizadas |
| Notificações push | Não (alertas no Início) | Fase 2: PWA + Web Push |
| Teleprompter | Modo leitura com letras grandes | Fase 3: rolagem automática por velocidade |

Nada simulado é apresentado como real: a interface marca "Simulação" em todo upload e pasta do Drive.

---

## 8. Implementação por etapas

**Fase 1 — MVP interativo (este repositório, `app/index.html`)**
Projetos e frentes, referências com busca, ideias, conteúdos com roteiro em 3 modos, banco universal de takes, Captar agora, catálogo contextual de produtos, calendário unificado com filtros e planejamento reverso, checklists e status, simulação de upload, indicadores. Dados persistentes no banco do artefato.

**Fase 2 — App web com integrações**
- Stack sugerida: Next.js (PWA, mobile-first) + Supabase (Postgres, autenticação, filas) hospedado na Vercel.
- Tabelas espelhando o modelo da seção 4, com junções para os N:N.
- Google OAuth com escopos `drive.file` (só arquivos criados pelo app) e `calendar.readonly` / `calendar.events`.
- Upload resumível direto do celular para o Drive; o banco guarda só metadados.
- Estrutura `Creative OS/Biblioteca de Takes` (originais) + `Projetos/<projeto>/<conteúdo>` (atalhos) + `Arquivos Finais`.
- Sincronização de agenda com escolha de quais calendários entram no planejamento e chave de deduplicação pelo ID do evento Google.
- Web Push para os alertas do briefing.
- Exportação/backup do banco em JSON.

**Fase 3 — Inteligência avançada**
Embeddings (pgvector) para referências e takes, detecção de takes semelhantes, planejamento assistido, sugestões de calendário com base na agenda real, análise de distribuição por objetivo, sugestão automática de associação de arquivos.

---

## 9. Critérios de aceitação × Fase 1

| # | Critério | Fase 1 |
|---|---|---|
| 1 | Referência recuperada por intenção | Sim |
| 2 | Roteiro em falas / captação / edição | Sim |
| 3 | Um take em vários conteúdos | Sim |
| 4 | "Estou na academia" → produtos e takes | Sim |
| 5 | "Estou cozinhando" → takes de vários roteiros | Sim |
| 6 | Marcar gravado e atualizar progresso | Sim |
| 7 | Um envio, vários conteúdos, sem duplicar | Simulado (vínculos reais, arquivo não enviado) |
| 8 | Reutilizar takes antigos | Sim |
| 9 | Evento com gravações associadas | Sim |
| 10 | Calendário único | Sim |
| 11 | Filtros combinados | Sim |
| 12 | Datas a partir da publicação | Sim |
| 13 | Fixo × flexível | Sim |
| 14 | Frentes dentro da viagem | Sim |
| 15 | Prontos para edição e pendências | Sim |
| 16 | Relacionamentos consistentes ao editar | Sim |
