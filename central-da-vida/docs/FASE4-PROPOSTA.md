# Central da Vida · Fase 4 · Agenda e hábitos (proposta)

Aprovada para começar em 31/10/2026. Duas entregas:

| Entrega | Conteúdo | Custo |
|---|---|---|
| **4A · Agenda, hábitos e água** | Agenda Dia/Semana/Mês/Lista com eventos pessoais e do casal; eventos que **impactam o outro** (com visibilidade controlada); recorrência (diária, semanal, mensal, anual); participantes; recebimentos e vencimentos de Finanças na agenda; filtros (meus, casal, do parceiro que me afetam, hábitos, recebimentos, vencimentos); **lembrete para o parceiro** (aparece no app dele); hábitos com frequência, meta, marcação diária e **grade de quadradinhos** semanal/mensal/anual; **garrafa de água** com meta diária e registro rápido | Gratuito |
| **4B · Notificações no celular** | Push no iPhone (app instalado na Tela de Início, iOS 16.4+) e no Android; preferências por tipo (eventos, hábitos, água, vencimentos, lembretes do parceiro); horários de silêncio; envio agendado pelo servidor | Gratuito (Vercel + Supabase), exige 4 chaves configuradas |

## Como os dados se organizam

- **Evento**: título, início/fim (ou dia inteiro), local, observações, categoria, aba (pessoal ou casal), recorrência, lembretes (minutos antes), participantes.
- **"Impacta o outro"**: um evento pessoal pode ser marcado como "impacta [parceiro]". O que o parceiro vê depende da resposta à pergunta 1.
- **Hábito**: nome, ícone/cor, frequência (todo dia ou dias da semana, ou X vezes por semana), meta por dia (ex.: 1 vez, 30 min, 8 copos), horário de lembrete opcional, mostrar ou não na agenda.
- **Água**: meta diária em ml por pessoa, registros rápidos (+200, +300, +500 ml ou valor livre), garrafa que enche, consumido e restante.
- **Lembrete para o parceiro**: texto + data/hora; aparece no Hoje e na Agenda dele (na 4B, também por notificação).

## Limitações já conhecidas

- **Widget de água** na tela do iPhone não é possível para app instalado pelo navegador. Alternativa: atalho direto na tela Hoje e, na 4B, notificação de lembrete.
- **Sincronizar com Google Agenda/Apple Calendário**: fora desta fase; pode ser avaliado depois.

## Perguntas antes de programar

1. **Agenda pessoal do outro**: o parceiro pode
   a) ver **todos** os seus eventos pessoais (como em Finanças);
   b) ver **só os marcados como "impacta"**, com título e horário; ou
   c) ver **só os marcados como "impacta"**, aparecendo apenas como "Ocupado" com horário (sem título)?
2. **Hábitos e água**: ficam **visíveis** para o outro (só ver) ou **privados**?
