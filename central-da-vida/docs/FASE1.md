# Central da Vida · Fase 1 · Base multiusuário

## O que mudou (changelog)

- Login com Google para Júlia e Michelangelo. Qualquer outro e-mail é recusado **pelo banco**, não só pela tela.
- Casa compartilhada criada automaticamente: quando cada um entra pela primeira vez, o perfil é ligado ao outro.
- Regras de privacidade no banco (RLS): item "Só eu" é invisível para o outro; item "Casal" é visto e editado pelos dois; só quem criou muda a visibilidade; ninguém consegue trocar o dono de um registro.
- Histórico de alterações (quem criou, editou ou apagou o quê), guardado no banco para as próximas fases.
- Navegação: Hoje · Finanças · + · Agenda · Mais. Finanças e Agenda mostram o que chega em cada fase.
- Categorias coloridas por módulo (Notas, Finanças, Agenda, Hábitos, Alimentação, Mercado, Treinos, Biblioteca): criar, renomear, colorir, subcategoria, reordenar, arquivar, excluir com confirmação. Botão "Criar sugestões" em cada módulo.
- Filtros combináveis (busca, Só meus/Casal, categorias com subcategorias, período, status, arquivados) e **visualizações salvas** (só suas ou do casal). Nas próximas fases, a mesma barra é usada em todos os módulos.
- Notas: bloco de anotações pessoal e do casal, com data, categoria, fixar, concluir e arquivar. Serve também para testar privacidade e sincronização.
- Sincronização em tempo real: o que um cria no Casal aparece no celular do outro em segundos.
- Busca, exportar dados (JSON), modo escuro automático, app instalável na Tela de Início do iPhone.

## Passo a passo para colocar no ar (uns 25 minutos, no computador)

Tudo em planos gratuitos. Chaves secretas nunca vão para o chat.

### 1. Supabase (banco novo, separado do Creative OS)

1. Em https://supabase.com → **New project**. Nome `central-da-vida`, região **South America (São Paulo)**, crie e guarde a senha do banco. O plano gratuito permite 2 projetos ativos: o Creative OS e este.
2. **SQL Editor → New query**. Abra `central-da-vida/supabase/schema.sql` no GitHub e copie tudo.
3. Antes de rodar, no fim do texto, troque `EMAIL_DO_MICHELANGELO@gmail.com` pelo e-mail Google dele. Clique em **Run**. Deve aparecer "Success".
4. **Project Settings → API**: anote o **Project URL** e a chave **anon / public**.

> Esqueceu de trocar o e-mail? Rode no SQL Editor:
> `update public.allowed_emails set email = 'email.dele@gmail.com' where email like 'EMAIL_DO%';`

### 2. Login com Google

O jeito mais rápido é reaproveitar o cliente Google que você já criou para o Creative OS:

1. https://console.cloud.google.com → projeto **Creative OS** → **APIs e serviços → Credenciais** → abra o cliente OAuth `Creative OS web`.
2. Em **URIs de redirecionamento autorizados**, **adicione** (sem apagar o que existe): `https://SEU-PROJETO-NOVO.supabase.co/auth/v1/callback`. Salve.
3. No Supabase novo: **Authentication → Sign In / Providers → Google** → ative, cole o mesmo **Client ID** e **Client Secret** → **Save**.

Observação: a tela do Google vai mostrar o nome "Creative OS". Se preferir "Central da Vida", dá para criar outro projeto no Google Cloud depois, sem perder nada.

### 3. Vercel (onde o app fica no ar)

1. Este código precisa estar no branch `main`. Faça o merge do branch da Fase 1 (posso abrir o pull request para você).
2. https://vercel.com → **Add New… → Project** → repositório **Creative-os-** → **Import**.
3. **Project Name**: `central-da-vida`. **Root Directory → Edit → `central-da-vida`**. O Framework fica **Vite** automaticamente.
4. **Environment Variables**:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Project URL do Supabase novo |
| `VITE_SUPABASE_ANON_KEY` | chave anon / public do Supabase novo |

5. **Deploy**. Anote o endereço (ex.: `https://central-da-vida.vercel.app`).

### 4. Ligar o endereço no Supabase

**Authentication → URL Configuration**:
- **Site URL**: o endereço da Vercel.
- **Redirect URLs → Add URL**: `https://central-da-vida.vercel.app/**` (com o seu endereço).

### 5. No iPhone (cada um no seu)

1. Abra o endereço **no Safari** (não por link dentro do WhatsApp ou Instagram).
2. **Entrar com Google**.
3. Compartilhar → **Adicionar à Tela de Início**. A partir daí, abra pelo ícone.

## Roteiro de teste (com os dois celulares)

| # | Faça | Esperado |
|---|---|---|
| 1 | Entre com uma conta Google que não é de vocês | Mensagem "Este e-mail não está liberado" |
| 2 | Júlia e Michelangelo entram | Em Hoje aparece "Conectado com …" |
| 3 | Júlia: Mais → Notas → nova nota **Só eu** | Michelangelo **não** vê, nem buscando |
| 4 | Júlia: nova nota **Casal** | Aparece no celular dele em segundos, com "Casal · por Júlia" |
| 5 | Michelangelo edita a nota do Casal | A edição aparece para a Júlia |
| 6 | Michelangelo tenta mudar a visibilidade da nota da Júlia | Opção bloqueada: "Só quem criou pode mudar a visibilidade" |
| 7 | Mais → Categorias → Notas → **Criar sugestões** | Categorias coloridas aparecem nos dois celulares |
| 8 | Crie uma subcategoria, mude cor, reordene com as setas, arquive e desarquive | Tudo reflete nos dois |
| 9 | Exclua uma categoria em uso | Aviso com quantos itens ficam sem categoria; sugestão de arquivar |
| 10 | Em Notas: filtro "Casal" + uma categoria + período → **Salvar visualização** | O atalho aparece na barra e reaplica o filtro |
| 11 | Ajustes → **Exportar meus dados** | Baixa um arquivo `.json` |
| 12 | Gire o celular e use o modo escuro | Tudo legível, sem rolagem para os lados |

Os testes 3 a 6 também foram feitos direto no banco (Postgres 16, simulando os dois usuários): leitura, edição, exclusão, troca de dono, troca de visibilidade e acesso sem login.

## Limitações conhecidas

- **Backup**: o plano gratuito do Supabase não oferece backup para baixar. Use **Exportar meus dados** de vez em quando; um backup automático pode entrar numa fase seguinte.
- **Pausa do Supabase gratuito**: um projeto sem uso por cerca de uma semana é pausado; basta reativar no painel. Com uso diário, não acontece.
- **Notificações**: chegam na Fase 4 (no iPhone, só com o app instalado na Tela de Início).
- **Sem internet**: o app abre, mas os dados precisam de conexão. Aparece um aviso.
- Se um item do Casal virar "Só eu", ele some do celular do outro quando o app é reaberto ou volta para a frente (não instantaneamente).
- Finanças, Agenda e demais módulos ainda são telas de "em breve". As categorias deles já podem ser preparadas.

## Para desenvolver

```bash
cd central-da-vida
cp .env.example .env.local   # preencha com o projeto Supabase
npm install
npm run dev
npm run build                # checa tipos e gera dist/
```
