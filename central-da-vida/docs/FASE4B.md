# Central da Vida · Fase 4B · Notificações no celular

## O que mudou (changelog)

- **Mais → Notificações** (também em Ajustes): **Ativar neste aparelho**, **Enviar teste**, desativar, e escolher o que avisar.
- Avisos:
  - **Compromissos** seus e do casal, no horário de lembrete de cada um (na hora, 10 min, 30 min, 1 h, 1 dia antes).
  - **Compromissos do parceiro que afetam você** (os marcados como "afeta").
  - **Lembretes do parceiro**, na hora marcada.
  - **Hábitos** no horário escolhido em cada hábito, só se ainda não estiver feito.
  - **Água** a cada 1 a 4 h entre 9h e 21h, só se estiver abaixo do ritmo da meta (desligado por padrão).
  - **Contas do dia**: um resumo diário com vencimentos de hoje, faturas e contas atrasadas.
- **Silêncio** (padrão 22h às 7h): hábitos, água e contas não avisam; compromissos e lembretes do parceiro avisam sempre.
- Tocar na notificação abre o app na tela certa.
- Sem repetição: cada aviso é registrado e enviado uma vez só.

## Como funciona por dentro

A cada minuto, o Supabase chama o servidor do app (Vercel), que confere um segredo guardado só no banco, calcula o que está na hora de avisar (horário de São Paulo) e envia para os aparelhos inscritos. As chaves de notificação são criadas pelo próprio servidor na primeira vez e ficam guardadas no banco. Custo: zero (planos gratuitos).

## Configuração (uns 10 minutos)

1. **Banco**: em https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/sql/new cole todo o conteúdo de `central-da-vida/supabase/fase4b.sql` e clique em **Run**. Esperado: "Success".
   - Se aparecer erro com `pg_cron` ou `pg_net`: abra https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/database/extensions, ative **pg_cron** e **pg_net**, e rode o arquivo de novo.
2. **Chave secreta do Supabase na Vercel** (é o único segredo copiado entre sites):
   - Em https://supabase.com/dashboard/project/oyglhouncpiuuilprvhn/settings/api-keys, em **Secret keys**, revele e copie a chave (`sb_secret_...`). Se não houver, use a aba **Legacy** → **service_role**.
   - Na Vercel: projeto **central-da-vida** → **Settings** → **Environment Variables** → adicione `SUPABASE_SERVICE_ROLE_KEY` com esse valor (Production e Preview) → **Save**.
   - Nunca cole essa chave no chat.
3. **Publicar**: faça o merge do pull request (a Vercel publica com a chave nova).
4. **Em cada aparelho**: abra o app **pelo ícone da Tela de Início** → Mais → **Notificações** → **Ativar** → **Permitir** → **Enviar teste**.

Para conferir a rotina no Supabase (opcional), rode: `select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;`

## Roteiro de teste

| # | Faça | Esperado |
|---|---|---|
| 1 | Notificações → Ativar → Permitir | "Notificações ativas neste aparelho" |
| 2 | Enviar teste | Chega "Notificações funcionando neste aparelho ✅" |
| 3 | Crie um compromisso daqui a 15 min com lembrete "10 min" | Aviso chega 10 min antes (até 1 min de atraso) |
| 4 | Compromisso do casal com lembrete | Chega nos aparelhos dos dois |
| 5 | Michelangelo marca um compromisso dele como "afeta você" | Você recebe o aviso dele |
| 6 | Lembrete para o parceiro daqui a 2 min | Chega no aparelho dele na hora |
| 7 | Hábito com lembrete daqui a 2 min, não marcado | Chega; se marcar antes, não chega |
| 8 | Ative água a cada 1 h | Avisos só se estiver abaixo da meta |
| 9 | Toque numa notificação | Abre o app na tela certa |
| 10 | Desligue "Hábitos" | Lembretes de hábito param |

Testes já feitos aqui: banco em Postgres 16 (segredo criado sozinho e invisível para o app; inscrições e preferências privadas de cada um), 33 testes automáticos (`npm test`), incluindo 8 da lógica de avisos (janela de horário, dono × casal × parceiro afetado, feito não avisa, preferências, silêncio, água pelo ritmo, resumo de contas), e envio real de uma notificação criptografada e assinada para um servidor de push de teste.

## Limitações conhecidas

- **iPhone**: só com o app instalado na Tela de Início e aberto pelo ícone (iOS 16.4 ou mais novo). Modo Foco/Não perturbe pode segurar os avisos.
- Avisos podem chegar até ~1 minuto depois do horário.
- Cada aparelho precisa ser ativado uma vez; se trocar de celular, ative de novo.
- Widget de água na tela do iPhone continua não sendo possível.
