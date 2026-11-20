---
name: agendamento-de-post
description: "Agendamento de Post. Programa no TikTok Studio (site, pelo Claude in Chrome no PC da Júlia) os vídeos editados do Meu Criativo que estão na fila \"Para programar\" do app Creative OS: carrega o vídeo da pasta Editado, cola a legenda, anexa o produto da vitrine e programa o dia e o horário. Depois marca cada vídeo como agendado no app. Use quando a Júlia pedir para programar, agendar ou postar os vídeos do TikTok Shop, \"programa os vídeos de quinta\", \"agenda a fila\", \"Agendamento de Post\"."
---

# Agendamento de Post

A Júlia escolhe no app Creative OS quais vídeos editados vão ser programados (botão **Programar**, com dia e horário). Você, no Chrome do PC dela, pega essa fila e programa cada vídeo no **TikTok Studio** (tiktok.com/tiktokstudio/upload) com **legenda, produto e horário**. Os rascunhos do celular são outro caminho (botão "Mandar pro rascunho" no app) e não passam por aqui.

## Como falar com a Júlia
Português do Brasil simples, frases curtas, sem termo técnico. Antes de começar, diga quantos vídeos vai programar e para quais dias. No fim, uma lista curta: programados, pulados (com o motivo) e o que ela precisa fazer.

## O que precisa estar pronto (confira no começo, uma vez)
1. **Conector do Supabase** ligado nesta conversa (projeto `imvdabzogrdhjjgfvvob`). Sem ele, pare e avise.
2. **Claude in Chrome** com o TikTok Studio aberto e logado na conta dela. Se pedir login, captcha ou verificação, **pare e peça para ela resolver**; nunca digite senha.
3. **Google Drive para computador** sincronizando a pasta `Meu Criativo` (no Windows costuma ser `G:\Meu Drive\Meu Criativo`). Na primeira vez, pergunte o caminho e guarde na resposta final para ela.

## 1. Ler a fila no app
Um `select` por chamada (`execute_sql`, `project_id` = `imvdabzogrdhjjgfvvob`):

```sql
select id, data->'publicacao' as pub, data->>'produto' as produto, data->'status' as status, data->>'linkEditado' as link
from mc_docs
where col = 'videos' and data->'status'->>'publicacao' = 'programar'
order by data->'publicacao'->>'data', data->'publicacao'->>'hora';
```

- Se ela pediu um dia ("os de quinta"), programe só esse dia. Sem pedido, programe a fila em ordem.
- **Horário que já passou**: não programe; pergunte se ela quer um horário novo.
- **Mais de 10 dias à frente**: o TikTok Studio pode não aceitar. Programe até onde ele deixar e diga quais ficaram para depois.
- Nome do produto: `select id, data->>'nome' as nome from mc_docs where col = 'produtos' and id = 'P01';`. Se o vídeo tiver `publicacao.nomeProduto`, use esse nome para buscar na vitrine.

## 2. Para cada vídeo, um de cada vez
**a) Legenda.** Use `publicacao.legenda` se existir. Senão, leia o arquivo `V012 - legenda.txt` da pasta `Editado` do vídeo (conector do Google Drive, `search_files` com `title contains 'V012 - legenda'`). Sem legenda nenhuma: pule o vídeo e avise (não invente legenda).

**b) Vídeo.** O arquivo final está em `Meu Criativo\<nome do produto>\<V012>\Editado\`. Use a versão mais nova: `V012 - <produto> - v2.mp4` vale mais que `- final.mp4`. Abra **Carregar** no TikTok Studio e selecione esse arquivo. Se o Chrome não deixar você escolher o arquivo sozinho, diga à Júlia o caminho exato e peça para ela arrastar o vídeo para a área de envio; continue quando aparecer "Enviado".

**c) Descrição.** Espere o envio terminar. Apague o que o TikTok preencher sozinho (ele costuma pôr o nome do arquivo) e cole a legenda exatamente como está. Hashtags fazem parte da legenda.

**d) Produto.** Em **Adicionar link** (ou "Adicionar links de produto") → **Produtos** → busque pelo nome do produto → marque **o produto exato** da vitrine → avance → confirme o nome curto que o TikTok sugere → **Adicionar**. Produto não encontrado ou mais de um parecido e você não tem certeza: **não programe esse vídeo**; pule e avise qual produto faltou. Vídeo de TikTok Shop sem o produto certo não vende.

**e) Horário.** Em **Configurações** → "Quando publicar" → **Programar** → escolha o dia e o horário do app (fuso de Brasília, GMT-3). Confira na tela se o dia e a hora ficaram certos.

**f) Programar.** Clique em **Programar** (nunca em **Publicar**). Espere a confirmação do TikTok. Se der erro, leia a mensagem, tente uma vez de novo; persistindo, pule e anote o motivo.

**g) Marcar no app.** Leia o `status` atual do vídeo e mande o objeto **inteiro** (a junção é só no primeiro nível):

```sql
select mc_merge('videos', 'V012', '{"status": {"roteiro":"aprovado","captacao":"completa","edicao":"editado","publicacao":"agendado"}, "publicacao": {"data":"2026-11-27","hora":"18:30","agendadoEm":"2026-11-20T15:02:00-03:00"}}'::jsonb);
```

Mantenha em `publicacao` o que já existia (data, hora, legenda, nomeProduto) e acrescente `agendadoEm`. Aspas simples dentro do texto vão dobradas (`d''água`).

## Regras que nunca se quebram
- **Só programar**, nunca publicar na hora.
- **Nunca inventar** legenda, preço, desconto ou produto. O que não estiver no app ou na pasta, pergunte ou pule.
- Um vídeo por vez, com calma entre eles. Não programe mais de 30 vídeos numa rodada sem a Júlia pedir.
- Não mexer em vídeos já programados ou publicados no TikTok Studio, nem nos arquivos do Drive.
- Login, captcha, aviso de segurança ou de limite do TikTok: pare e chame a Júlia.
- Só marque `agendado` no app depois de ver a confirmação do TikTok.

## Resposta final
```
Programei 8 vídeos:
· qui 27/11 — V012 07:00, V015 07:30, …
Pulei 2:
· V019 — não achei o produto "Kit Primacial" na vitrine
· V021 — sem legenda na pasta Editado
```
