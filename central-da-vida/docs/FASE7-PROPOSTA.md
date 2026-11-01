# Central da Vida · Fase 7 · IA dentro do app (proposta)

**Decisão (01/11/2026):** começar pela versão **sem IA** (Fase 7A, `FASE7A.md`); quando ligar a IA: Claude Haiku 5.5 nos comandos, Claude Sonnet 5.5 nas fotos, teto de US$ 5/mês (≈ 160 comandos/dia), internet desligada no início.

Esta é a primeira fase **com custo**: a API do Claude é cobrada por uso, separada da assinatura do Claude (claude.ai). Nada é programado antes da aprovação.

## O que entra

| Parte | Como funciona |
|---|---|
| **Assistente "Fale comigo"** | Um campo no Hoje e no botão +. Você escreve ou dita pelo microfone do teclado do iPhone: "gastei 85 no mercado no cartão do casal", "jantar com a Ana sexta às 20h", "bebi 500 ml", "adiciona leite na lista", "lembra o Mi de pagar o condomínio amanhã às 9", "quanto ainda tenho de mesada?" |
| **Confirmação antes de gravar** | A IA só **propõe**: aparece um cartão "Despesa · R$ 85 · Mercado · Casal · cartão do casal · hoje — Confirmar / Editar". Valor, data, conta, categoria ou destinatário ambíguos viram pergunta. Nada é salvo sem o seu toque. |
| **Consultas** | Saldo, mesada restante, orçamento, agenda do dia, o que vence. Os números vêm do próprio app (os mesmos cálculos testados); a IA só entende a pergunta e explica a resposta. |
| **Simulador em linguagem natural** | "Posso comprar uma vara de pesca de R$ 3.000 em 10x?" → preenche o simulador da Fase 3 e responde cabe / cabe com ajustes / não recomendado, com os números. |
| **Assistente culinário** | Conversa sobre o que tem em casa, tempo, doce ou salgado, objetivo; sugere primeiro receitas da biblioteca do casal, depois ideias novas; salva no cardápio/receitas e manda faltantes para o mercado (com confirmação). Pesquisa na internet só se você ligar. |
| **Calorias por foto ou texto** | Foto do prato e/ou descrição → estimativa com **faixa** (ex.: 450–650 kcal) e o que está incerto; pergunta a porção quando precisa; você corrige antes de ir para o diário. Foto sozinha nunca é tratada como valor exato. |
| **Histórico de ações da IA** | Registro do que foi pedido, interpretado e confirmado (exigência da especificação). |

## Segurança e privacidade

- A chave da API fica só no servidor (Vercel), nunca no celular.
- A IA **lê** só o que você já pode ver (as mesmas regras do banco: hábitos e água do outro continuam invisíveis), e **não grava nada**: quem grava é o seu app, depois que você confirma.
- Envia ao modelo só o necessário para cada pedido (não manda o banco inteiro).
- Pelos termos comerciais atuais da Anthropic, dados enviados pela API não são usados para treinar os modelos.
- **Teto mensal de gasto** no app (para de responder ao atingir) + limite de gasto no painel da Anthropic.

## Custo estimado (preços oficiais por milhão de tokens, em dólar)

| Modelo | Entrada / Saída | Por comando simples | Por foto de prato | ~30 comandos/dia (os dois) |
|---|---|---|---|---|
| **Claude Opus 5.5** (mais capaz) | US$ 4 / US$ 20 | ~US$ 0,02–0,03 | ~US$ 0,03–0,04 | **~US$ 20–30/mês** |
| **Claude Haiku 5.5** (mais rápido e barato) | US$ 0,10 / US$ 0,50 | ~US$ 0,001 | ~US$ 0,002 | **~US$ 0,50–1/mês** |

Estimativas: o valor real depende do uso e aparece no painel da Anthropic. Partes fixas (instruções, ferramentas) usam cache, que barateia a leitura repetida.

## O que vai ser preciso de vocês

1. Conta em **console.anthropic.com** com crédito pré-pago e uma **chave de API**.
2. Cadastrar a chave na Vercel como `ANTHROPIC_API_KEY` (eu guio o passo a passo, como na 4B).

## Perguntas

1. **Modelo**: Claude Opus 5.5 (melhor qualidade, ~US$ 20–30/mês no uso estimado) ou Claude Haiku 5.5 (~US$ 1/mês, bom para comandos simples)? Também dá para usar Haiku nos comandos do dia a dia e Opus só no assistente culinário e nas fotos.
2. **Teto mensal** de gasto no app: quanto? (ex.: US$ 5, US$ 10, US$ 30)
3. **Pesquisa na internet** no assistente culinário: ligada ou desligada? (desligada = só receitas da biblioteca e conhecimento do modelo)
