# Creative OS · Fase 2 · Passo a passo de configuração

Tempo estimado: 30 a 40 minutos, no computador. Use sempre a conta **juliapontin21@gmail.com**.

Regra de ouro: **chaves secretas nunca vão para o chat**. Você cola elas só nos sites (Supabase e Vercel).

---

## Etapa 1 · Supabase (banco de dados)

1. Entre em https://supabase.com e clique em **Start your project**. Entre com o GitHub.
2. Clique em **New project**.
   - Name: `creative-os`
   - Database password: crie uma senha forte e guarde (não precisa me mandar)
   - Region: **South America (São Paulo)**
   - Clique em **Create new project** e espere uns 2 minutos.
3. No menu da esquerda, abra **SQL Editor** → **New query**.
4. Abra o arquivo `supabase/schema.sql` do seu GitHub, copie tudo, cole no editor e clique em **Run**. Deve aparecer "Success".
5. Vá em **Project Settings** (engrenagem) → **API** (ou **Data API** / **API Keys**). Deixe esta aba aberta. Você vai precisar de:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon / public key**
   - **service_role / secret key** (secreta)

## Etapa 2 · Google Cloud (permissão para o Drive)

1. Entre em https://console.cloud.google.com com a conta juliapontin21@gmail.com.
2. No topo, clique no seletor de projeto → **Novo projeto** → nome `Creative OS` → **Criar**. Confirme que ele ficou selecionado.
3. Menu → **APIs e serviços** → **Biblioteca** → procure **Google Drive API** → **Ativar**.
4. Menu → **APIs e serviços** → **Tela de permissão OAuth** (ou **Google Auth Platform**) → **Começar**:
   - Nome do app: `Creative OS`; e-mail de suporte: o seu
   - Público: **Externo**
   - Contato: o seu e-mail → aceite e **Criar**
5. Em **Público** (Audience), clique em **Publicar app** e confirme. Isso evita que o acesso ao Drive expire a cada 7 dias. Como o app só pede acesso aos arquivos que ele mesmo cria, não precisa de verificação do Google.
6. Em **Clientes** (ou **Credenciais** → **Criar credenciais** → **ID do cliente OAuth**):
   - Tipo: **Aplicativo da Web**; nome: `Creative OS web`
   - Em **URIs de redirecionamento autorizados**, adicione: `https://SEU-PROJETO.supabase.co/auth/v1/callback` (troque pelo seu Project URL da Etapa 1, mantendo `/auth/v1/callback` no fim)
   - Clique em **Criar**. Guarde o **ID do cliente** e a **Chave secreta do cliente** (secreta).

## Etapa 3 · Ligar o Google no Supabase

1. No Supabase: **Authentication** → **Sign In / Providers** (ou **Providers**) → **Google** → ative.
2. Cole o **Client ID** e o **Client Secret** do Google → **Save**.

## Etapa 4 · Vercel (onde o app fica no ar)

1. Entre em https://vercel.com → **Sign Up** → **Continue with GitHub**.
2. **Add New…** → **Project** → escolha o repositório **Creative-os-** → **Import**.
3. Em **Root Directory**, clique em **Edit** e escolha a pasta **web**. Framework Preset: **Other**.
4. Abra **Environment Variables** e adicione uma por uma:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | Project URL do Supabase |
| `SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
| `GOOGLE_CLIENT_ID` | ID do cliente do Google |
| `GOOGLE_CLIENT_SECRET` | Chave secreta do cliente do Google |
| `ALLOWED_EMAIL` | `juliapontin21@gmail.com` |
| `ANTHROPIC_API_KEY` | (opcional) chave da API do Claude, para a IA do app |

5. Clique em **Deploy**. No fim, copie o endereço do app (algo como `https://creative-os-xxxx.vercel.app`).

## Etapa 5 · Avisar o Supabase do endereço do app

1. No Supabase: **Authentication** → **URL Configuration**.
2. **Site URL**: cole o endereço da Vercel.
3. Em **Redirect URLs**, adicione o mesmo endereço → **Save**.

## Etapa 6 · Primeiro acesso no celular

1. Abra o endereço da Vercel no celular e toque em **Entrar com Google**.
2. Se aparecer "O Google não verificou este app", toque em **Avançado** → **Acessar Creative OS**. É o seu próprio app.
3. Autorize o acesso ao Drive.
4. Peça no chat: "migra meus dados". Eu gero o arquivo de backup com tudo o que está no Creative OS do Claude, e você toca em **Importar backup**.
5. Instale na tela inicial:
   - iPhone (Safari): **Compartilhar** → **Adicionar à Tela de Início**
   - Android (Chrome): menu ⋮ → **Instalar app**

---

## Bom saber

- **Custos:** Supabase e Google não cobram neste volume de uso. O plano gratuito da Vercel (Hobby) é para uso não comercial. Para uso profissional dentro das regras, o plano Pro custa US$ 20/mês. Também dá para hospedar grátis na Cloudflare Pages com pequenas mudanças.
- **IA (opcional):** sem `ANTHROPIC_API_KEY`, a busca por palavras e a leitura simples de comandos continuam funcionando. Com a chave, a cobrança é por uso em https://console.anthropic.com.
- **Supabase gratuito** pausa o projeto depois de 7 dias sem nenhum acesso. Usando o app, isso não acontece.
- **Backup:** o app grava uma cópia dos seus dados por dia, e você pode baixar outra em Projetos → Conta.
