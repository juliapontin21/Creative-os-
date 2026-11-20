# Meu Criativo dentro do Creative OS

Os roteiros, produtos, takes, inserções, ideias e pedidos do Meu Criativo passam a morar no banco do Creative OS (Supabase, tabela `mc_docs`). O antigo painel (artefato "Meu Criativo") fica só como arquivo.

## Como o app ficou

| Aba | O que tem |
|---|---|
| **Início** | Lembretes, semana (roteiros registrados, distribuição por produto), indicadores, "Precisam de você", continuar de onde parou, pedidos para o Claude, agenda de hoje |
| **Roteiros** | Lista com busca e filtros, revisão em sequência (aprovar, pedir ajuste, ditar), produtos com os dois bancos |
| **Produção** | Gravação por cenário (casa/externas → cenário → blocados/contínuos → produto → takes), narrações, inserções, edição. Botão **Subir** envia direto ao Drive; ⟳ confere os envios |
| **Notas** | Ideias rápidas e vídeos de referência (como antes), **Ideias de produto** (do Meu Criativo) e plano do mês |
| **Agenda** | Postagens e compromissos, agora com os rascunhos enviados ao TikTok e as datas de publicação dos roteiros |
| **⚙ Ajustes** | TikTok (rascunhos) e Conta (backup, importar roteiros do painel) |

Saíram: Captar agora e Projetos.

## Configuração (uma vez)

1. **Supabase → SQL Editor**: rode o trecho "Meu Criativo" do `supabase/schema.sql` (tabela `mc_docs`, funções `mc_owner` e `mc_merge`, atualização ao vivo).
2. **Importar os dados do painel**: no app, ⚙ Ajustes → Conta → **Importar roteiros do painel** e escolha o arquivo `meu-criativo-dados.json` que o Claude enviou.
3. **Conectar o Supabase ao Claude** (claude.ai → Configurações → Conectores → Supabase). Assim as conversas do Meu Criativo leem e gravam direto no app.
4. **Atualizar as skills** "Meu Criativo · Roteiros" e "Edição TikTokShop" com o texto abaixo.

## Texto para as skills (substitui a parte "Painel")

> **Painel = app Creative OS.** Os dados ficam no Supabase do Creative OS (projeto `imvdabzogrdhjjgfvvob`), tabela `mc_docs` (`col`, `id`, `data` jsonb). Use o conector do Supabase (`execute_sql`). As coleções e os campos são os mesmos de antes: `videos`, `takes`, `produtos`, `ideias`, `pedidos`, `semanas`, `insercoes`, `linguagem`, `estado` (`continuar`), `config` (`geral`).
>
> - **Ler**: `select id, data from mc_docs where col = 'videos' and id in ('V001','V002');` (leituras seletivas; filtre por campos com `data->>'produto' = 'P01'`).
> - **Gravar ou juntar campos** (cria se não existir): `select mc_merge('videos', 'V012', '{"linkEditado": "…"}'::jsonb);`. A junção é só no primeiro nível: para mudar um campo dentro de `status`, `narracao` etc., leia o objeto e mande ele inteiro (ex.: `'{"status": {"roteiro":"aprovado","captacao":"pendente","edicao":"editado","publicacao":"aprovado"}}'`).
> - **Vários de uma vez**: várias chamadas `mc_merge` no mesmo `execute_sql`, separadas por `;`.
> - **Apagar**: `delete from mc_docs where col = 'takes' and id = 'T000';`
> - **Pedidos dos botões do app**: `select id, data from mc_docs where col = 'pedidos' and data->>'status' = 'novo';` Atenda e marque com `mc_merge('pedidos', '<id>', '{"status":"feito","resposta":"…"}'::jsonb)`.
> - O app mostra tudo na hora (atualização ao vivo). Não declarar pronto o que não foi gravado no banco.
> - **Envio de arquivos**: a Júlia sobe takes, narrações, contínuos e inserções pelo próprio app (Produção → Subir). Os nomes continuam `MeuCriativo T014 CORPO - …`, `MeuCriativo NAR-V012 - …`, `MeuCriativo VC-V012 - …`, `MeuCriativo X003 - …`, em `Meu Criativo / <produto> / <V012> / Takes brutos` ou `Inserções`. A antiga página de envio não é mais usada.
> - **TikTok**: o vídeo aprovado é salvo em `Editado` (com o arquivo `V012 - legenda.txt`). Nada vai sozinho para o TikTok: no app, a Júlia toca em **Programar** (`status.publicacao = "programar"`, com `publicacao.data` e `publicacao.hora`; a skill **Agendamento de Post** programa no TikTok Studio e muda para `agendado`) ou em **Mandar pro rascunho** (vai para a caixa de entrada do TikTok e muda para `rascunho`). Quando ela publica, `postado`.
