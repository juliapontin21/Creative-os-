# Central da Vida · Fase 7A · "Fale comigo" sem IA

Decisão da Júlia (01/11/2026): primeira versão **sem IA e sem custo**, funcionando por regras; a IA (Claude API) entra numa próxima etapa, quando ela cadastrar a chave. Proposta e custos estimados da IA em `FASE7-PROPOSTA.md`.

## O que mudou (changelog)

- **Fale comigo** no topo do Hoje e no **+**. Escreva ou dite pelo microfone do teclado do iPhone.
- O app entende por regras e mostra um cartão **"Entendi assim. Confere?"** com **Confirmar** ou **Editar** (abre o formulário completo já preenchido). **Nada é gravado sem confirmar.**
- O que ele entende:

| Você diz | Vira |
|---|---|
| "gastei 85 no mercado no cartão do casal" · "paguei 1.250,90 de moradia ontem no pix" · "comprei tênis 600 em 3x no cartão inter" | Despesa (valor, aba, cartão ou conta, forma, categoria pelo nome, data, parcelas) |
| "vou pagar 350 de condomínio dia 10" | Despesa a pagar com vencimento |
| "recebi 1800 da marca X" | Receita com cliente |
| "dentista sexta 15h" · "jantar amanhã às 20h30 casal" · "reunião com cliente segunda 10h por 30 min" | Compromisso (casal, trabalho, duração; lembrete 30 min antes) |
| "lembra o Mi de pagar o condomínio amanhã às 9" | Lembrete para o parceiro |
| "bebi 500 ml" · "bebi 2 copos de água" · "bebi 1,5 litro" | Água |
| "mercado: 2 kg tomate, leite e pão" · "adiciona leite na lista" | Lista de mercado (juntando com o que já existe) |
| "fiz 40 min de dança" · "corri 30 minutos" | Atividade no histórico de treinos |
| "comi salada com frango no almoço 450 kcal" | Diário alimentar |
| "fiz meditação" · "li 20 minutos" | Marca o hábito com esse nome |
| "nota: ligar pro encanador" | Nota |
| "quanto ainda tenho de mesada?" · "qual meu saldo?" · "o que tenho amanhã?" · "o que vence essa semana?" · "quanto gastei com mercado?" | Resposta com os números do app |
| "posso comprar uma vara de pesca de 3000 em 10x?" | Abre o Simulador já preenchido |

- Frase que ele não entende: explica como reformular. Com a IA ligada (próxima etapa), frases livres vão funcionar.

## Configuração

Nenhuma: sem mudança no banco e sem chave. Basta fazer o merge.

## Roteiro de teste

| # | Diga | Esperado |
|---|---|---|
| 1 | "gastei 85 no mercado no cartão do casal" | Cartão com Casal, cartão do casal, Mercado; Confirmar lança |
| 2 | "comprei tênis 600 em 3x no cartão X" (com o nome do seu cartão) | 3x de R$ 200 |
| 3 | Editar num gasto | Abre o lançamento preenchido |
| 4 | "dentista sexta 15h" | Compromisso sexta 15h–16h |
| 5 | "lembra o Mi de … amanhã às 9" | Lembrete chega para ele |
| 6 | "bebi 2 copos de água" | +500 ml |
| 7 | "mercado: leite e pão" | 2 itens na lista |
| 8 | "quanto ainda tenho de mesada?" | Mesada, usado e restante |
| 9 | "posso comprar uma bicicleta de 2000 em 5x?" | Simulador preenchido |
| 10 | Pelo microfone do teclado | Mesmo resultado |

Testes já feitos aqui: 46 testes automáticos (`npm test`), 13 só do "Fale comigo" cobrindo datas ("sexta", "amanhã às 9", "dia 12", "8 da noite", "05/11 meio-dia"), valores ("R$ 1.250,90", "3 mil"), despesas, receitas, água, mercado, treino, refeição, hábito, nota, compromissos, lembrete, consultas e simulação. No navegador: "gastei 85 no mercado no cartão do casal" → Confirmar salvou R$ 85 no Casal, cartão do casal, categoria Mercado.

## Limitações

- Funciona com frases diretas (começando pelo que aconteceu ou com dia/hora). Frases muito livres precisam da IA.
- Categoria é reconhecida pelo nome exato da categoria na frase ("mercado", "moradia").
- Conta: se não for dita, usa a primeira conta da aba.
