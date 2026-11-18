# Creative OS · Rascunhos automáticos no TikTok

## Como funciona

1. Você aprova a edição e o Claude salva o vídeo na pasta **Editado** do Drive (`Meu Criativo / <produto> / <V012> / Editado`), junto com um arquivo **`V012 - legenda.txt`**.
2. A cada 10 minutos, o Creative OS procura vídeos novos em todas as pastas `Editado` (as pastas de takes brutos e de inserções são ignoradas).
3. Para cada vídeo novo, ele:
   - lê a legenda do arquivo `legenda` da mesma pasta. Se esse arquivo não aparecer em até 20 minutos, a IA escreve uma (com `ANTHROPIC_API_KEY`) ou entra uma legenda simples, com o nome do produto e `#tiktokshop`;
   - envia o vídeo como **rascunho** para a caixa de entrada do seu TikTok.
4. No celular: Creative OS → **Projetos → TikTok** → **Copiar legenda**. Depois, no TikTok, abra a notificação do rascunho, cole a legenda, vincule o produto, escolha a música (se for o caso) e publique. Por fim, toque em **Já publiquei** no Creative OS (ele também percebe sozinho).

**Limites do TikTok**
- A API de rascunho **não aceita legenda nem produto**. Por isso a legenda fica no Creative OS para copiar, e o produto é vinculado no app do TikTok.
- O TikTok limita quantos rascunhos podem ficar pendentes na caixa de entrada (o app considera 5 em 24 h). Os outros esperam na fila e saem conforme você publica. Para mudar esse número, use a variável `TIKTOK_MAX_PENDING`.
- Quando sai uma nova versão do mesmo vídeo (ex.: `V012 - v2.mp4`) antes do envio, só a mais nova é enviada.
- Só entram vídeos salvos **depois** de você conectar o TikTok. Para incluir os que já estavam nas pastas `Editado`, use **Incluir vídeos antigos**.

---

## Configuração (uma vez, uns 40 minutos no computador)

Regra de ouro: **chaves secretas nunca vão para o chat**. Cole só nos sites.

### Etapa 1 · App no TikTok for Developers

1. Entre em https://developers.tiktok.com com a sua conta do TikTok → **Manage apps** → **Connect an app** (ou **Create app**).
2. Preencha o app:
   - Nome: `Creative OS`; ícone: use `web/icons/icon-512.png`
   - Categoria: ferramentas de criação/produtividade; descrição curta: "Ferramenta pessoal que envia meus vídeos finalizados como rascunho para a minha conta do TikTok."
   - **Terms of Service URL:** `https://creative-os-web.vercel.app/termos.html`
   - **Privacy Policy URL:** `https://creative-os-web.vercel.app/privacidade.html`
   - Plataforma: **Web**, site `https://creative-os-web.vercel.app`
3. Em **Products**, adicione:
   - **Login Kit**. Em Redirect URI, coloque exatamente: `https://creative-os-web.vercel.app/api/tiktok-callback`
   - **Content Posting API**. Não precisa ligar o Direct Post.
4. Em **Scopes**, confira se estão marcados: `user.info.basic` e `video.upload`.
5. Copie o **Client key** e o **Client secret** (este é secreto).
6. **Para testar antes da aprovação:** crie um **Sandbox** no app e adicione a sua conta do TikTok como usuária de teste (*target user*). Se o sandbox não deixar enviar o vídeo, siga direto para o item 7.
7. **Para uso definitivo:** clique em **Submit for review**. Explique o uso ("uso pessoal: envio dos meus próprios vídeos finalizados como rascunho para a minha caixa de entrada") e anexe um vídeo curto de demonstração: conectar → aparecer na fila → rascunho no TikTok. A análise costuma levar alguns dias.

### Etapa 2 · Google (liberar a leitura da pasta Editado)

Os vídeos editados são criados pelo Claude, não pelo Creative OS. Por isso o app precisa da permissão de **leitura** do Drive.

1. https://console.cloud.google.com → projeto **Creative OS** → **Google Auth Platform** (ou **Tela de permissão OAuth**) → **Acesso a dados** → **Adicionar escopos**.
2. Marque `.../auth/drive.readonly` → **Atualizar** → **Salvar**.
3. É uma permissão "restrita". Como o app é só seu, não precisa da verificação do Google, mas no login vai aparecer o aviso "O Google não verificou este app": toque em **Avançado → Acessar Creative OS**.

### Etapa 3 · Supabase (tabelas novas)

1. Supabase → **SQL Editor** → **New query**.
2. Cole **todo** o arquivo `supabase/schema.sql` → **Run**. Pode rodar de novo sem medo: o que já existe não é apagado.

### Etapa 4 · Vercel (variáveis)

Projeto **creative-os--web** → **Settings → Environment Variables** → adicione (Production):

| Nome | Valor |
|---|---|
| `TIKTOK_CLIENT_KEY` | Client key do TikTok |
| `TIKTOK_CLIENT_SECRET` | Client secret do TikTok |
| `TIKTOK_REDIRECT_URI` | `https://creative-os-web.vercel.app/api/tiktok-callback` |
| `CRON_SECRET` | uma senha longa e aleatória inventada por você (ex.: 40 letras e números de um gerador de senhas). Guarde para a Etapa 5 |
| `ANTHROPIC_API_KEY` | (opcional) para a IA escrever a legenda quando o arquivo de legenda não vier |

Depois: **Deployments** → último deploy → **⋯ → Redeploy**.

### Etapa 5 · Verificação a cada 10 minutos (Supabase)

O plano gratuito da Vercel só roda tarefas automáticas 1 vez por dia (essa já fica configurada, às 10h40 de Brasília, como reserva). Quem chama o app a cada 10 minutos é o agendador gratuito do Supabase:

1. Supabase → **Database → Extensions** → ative **pg_cron** e **pg_net**.
2. **SQL Editor** → cole, troque `COLE_O_CRON_SECRET` pela senha da Etapa 4 → **Run**:

```sql
select cron.schedule(
  'tiktok-rascunhos',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://creative-os-web.vercel.app/api/tiktok-sync',
    headers := jsonb_build_object('Authorization', 'Bearer COLE_O_CRON_SECRET'),
    body := '{}'::jsonb,
    timeout_milliseconds := 280000
  );
  $$
);
```

Para parar um dia: `select cron.unschedule('tiktok-rascunhos');`

### Etapa 6 · No celular

1. Abra o Creative OS → **Projetos → Conta → Sair** e entre de novo com o Google. Autorize a leitura do Drive.
2. **Projetos → TikTok → Conectar TikTok** → autorize.
3. Toque em **Verificar agora** para testar.

### Etapa 7 · Ensinar o Claude a salvar a legenda junto com o vídeo

Peça numa conversa com o Claude: *"Atualize a skill Edição TikTokShop com a regra da legenda do TikTok que está em docs/TIKTOK-SETUP.md."* Ou cole este trecho na skill, na parte de **Salvar o aprovado**:

> **Legenda do TikTok (rascunho automático).** Ao salvar o aprovado, **antes** de subir o vídeo, crie na mesma pasta `Editado` o arquivo `V012 - legenda.txt` (`create_file`, `contentMimeType: text/plain`, `disableConversionToGoogleType: true`) com a legenda do post. Escreva a partir do roteiro aprovado no painel (gancho e benefício principal, com o perfil "Minha Linguagem e Estilo de Comunicação"): 1 a 3 linhas curtas, tom de conversa (não de anúncio), sem inventar preço, desconto ou condição comercial e sem prometer resultado; no fim, 3 a 5 hashtags relevantes (sempre `#tiktokshop`). Máximo de 300 caracteres. Depois suba o vídeo. O Creative OS lê esse arquivo e manda o vídeo como rascunho para o TikTok; a legenda fica no app para ela copiar.

---

## Problemas comuns

- **"O app ainda não pode ler a pasta Editado"**: faltou a Etapa 2, ou você não saiu e entrou de novo no Creative OS (Etapa 6.1).
- **"O login do TikTok expirou"**: toque em **Conectar TikTok** de novo. O acesso vale 1 ano e é renovado sozinho a cada uso.
- **"O TikTok pediu para esperar"**: há rascunhos demais pendentes. Publique ou descarte alguns no app do TikTok; a fila continua sozinha.
- **Erro `scope_not_authorized` ou `unaudited_client`**: o app do TikTok ainda está em análise, ou a sua conta não está no sandbox (Etapa 1, itens 6 e 7).
