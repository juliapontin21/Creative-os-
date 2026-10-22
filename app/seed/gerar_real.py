"""Importa o inventário real (PDF de 21/10/2026) para o formato do banco do Creative OS.
Regras do inventário: nada de falas, takes, datas de postagem, marcas ou locais inventados.
Takes só onde o PDF lista "Takes informados" explícitos. Contextos, objetivos e públicos em tags
são classificações iniciais editáveis (o texto original fica em goal / audienceText)."""
import json, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "real")
os.makedirs(OUT, exist_ok=True)
NOW = "2026-10-21T21:30:00-03:00"

VIAGEM = "Viagem 24/10–02/11"
JAN09 = "A partir de 09/11"
AMERICANA = "Após retorno a Americana"
MKT = "Marcas e profissionais de marketing / empreendedores"
UGC_AUD = "Marcas potenciais contratantes de UGC"

projects = [
    {"id": "pj-viagem", "name": "Viagem 24/10–02/11", "start": "2026-10-24", "end": "2026-11-02",
     "participants": ["Julia", "Michelangelo"], "objectives": ["Portfólio", "Branding"],
     "fronts": [{"id": "fr-verao", "name": "UGC de produtos de verão"}, {"id": "fr-exp", "name": "UGC de experiências"},
                {"id": "fr-pesca", "name": "Portfólio de pesca (Michelangelo)"}, {"id": "fr-brand", "name": "Instagram: branding e lifestyle"},
                {"id": "fr-gastro", "name": "Gastronomia e casal"}]},
    {"id": "pj-autoridade", "name": "Autoridade, branding e estratégia", "participants": ["Julia"], "objectives": ["Autoridade", "Branding"], "fronts": []},
    {"id": "pj-portfolio", "name": "Portfólio UGC: tecnologia, apps e casa", "start": "2026-11-09", "participants": ["Julia", "Michelangelo"], "objectives": ["Portfólio"], "fronts": []},
    {"id": "pj-shop", "name": "TikTok Shop: produtos para gravar", "start": "2026-11-09", "participants": ["Julia", "Michelangelo"], "objectives": ["Vendas"], "fronts": []},
    {"id": "pj-evento", "name": "Evento TikTok Shop", "start": "2026-11-04", "end": "2026-11-06", "participants": ["Julia"], "objectives": [], "fronts": []},
]

# n, título, destino, plataformas, objetivo(texto), público(texto), quando, etapa, roteiro, formato, observações,
# janela, contextos, objetivos(tags), públicos(tags), projeto, frente, takes informados, produto
C = []
def add(n, title, destino, plats, goal, aud, when, etapa, roteiro, fmt, notes, janela, ctx, objs, auds, proj, front="", takes=None, product=None, notBefore=None):
    C.append(dict(n=n, title=title, destino=destino, plats=plats, goal=goal, aud=aud, when=when, etapa=etapa, roteiro=roteiro, fmt=fmt,
                  notes=notes, janela=janela, ctx=ctx, objs=objs, auds=auds, proj=proj, front=front, takes=takes or [], product=product, notBefore=notBefore))

IG = ("Instagram orgânico", ["Instagram"])
PORT = ("Portfólio UGC", ["Portfólio"])
SHOP = ("TikTok Shop", ["TikTok Shop"])
NR, RF = "Não roteirizado", "Roteirizado (fora do app)"

# 01 Autoridade, branding e estratégia
add(1, "Natura x Virgínia: quem tem audiência vende", *IG, "Autoridade em conteúdo, comunidade e vendas", MKT, "Cenário livre; tela verde", "Gravar e roteirizar", NR, "Low-fi; tela verde",
    "Comentar palestra de TikTok Shop ao fundo. Pessoas lembram lançamento da Virgínia, mas não o da Natura; atenção e comunidade levam audiência da internet à loja física. Pertencimento, fotos e identidade social.",
    "A definir", ["estudio"], ["Autoridade"], ["Marcas TikTok Shop", "Empreendedores (gestão de redes)"], "pj-autoridade")
add(2, "Maior erro da sua marca: produtos na farmácia, fora do TikTok Shop", *IG, "Atrair marcas para gestão TikTok Shop", "Marcas interessadas em TikTok Shop / varejistas", "Gravação externa obrigatória: farmácia", "Gravar", RF, "Na farmácia",
    "Mostrar produtos físicos, sobretudo skincare/antissinais, ausentes da Shop. Argumento sobre consumidores 30+ é premissa do conteúdo, a conferir antes de publicar.",
    "Gravação externa", ["farmacia"], ["Atrair marcas TikTok Shop"], ["Marcas TikTok Shop"], "pj-autoridade")
add(3, "Guide Shop: Shein, Virgínia e a loja como experimentação", *IG, "Posicionamento como especialista em conteúdo e comércio", MKT, "Cenário livre", "Roteirizar e gravar", NR, "Tela dividida ou tela verde",
    "Pessoas experimentam presencialmente e compram online/na live; loja física como experiência. Relacionar com estratégia de lojas em áreas movimentadas e necessidade de produto cumprir promessa.",
    "A definir", ["estudio"], ["Autoridade"], ["Marcas TikTok Shop", "Empreendedores (gestão de redes)"], "pj-autoridade")
add(4, "Posso postar minha rotina no Instagram da marca?", *IG, "Educação, autoridade e posicionamento", MKT, "Após retorno a Americana; em casa", "Roteirizar e gravar", NR, "",
    "Responder se cenas cotidianas (lavar louça/roupa) cabem na marca e se pessoas compram da pessoa ou da empresa. Tese: mostrar rotina quando há relação com produto e universo da marca.",
    AMERICANA, ["casa", "lavanderia"], ["Autoridade"], ["Empreendedores (gestão de redes)"], "pj-autoridade",
    takes=[("Lavar louça", ["casa"]), ("Lavar roupa", ["lavanderia", "casa"]), ("Outras atividades domésticas contextualizadas", ["casa"])])
add(5, "Não migre para o TikTok: use-o para atrair clientes ao ecossistema", *IG, "Autoridade e atração de clientes de marketing", MKT, "Após retorno a Americana", "Roteirizar e gravar", NR, "Cenário bonito e contextualizado",
    "TikTok como aquisição; conduzir público ao universo/comunidade da marca, com ofertas de outros tickets. Argumento \"CAC zero\" e anúncios mais caros devem ser tratados como posicionamento/hipótese, não fato absoluto.",
    AMERICANA, ["casa"], ["Autoridade"], ["Empreendedores (gestão de redes)", "Marcas TikTok Shop"], "pj-autoridade")
add(6, "Como preparar o Natal com meu método UTI", *IG, "Atrair clientes de gestão de redes sociais e posicionamento", MKT, "A definir; considerar calendário sazonal", "Planejar, roteirizar e gravar", NR, "",
    "Desenvolver abordagem do método UTI (UGC + TikTok Shop + IA) aplicada à preparação de Natal.",
    "A definir", [], ["Autoridade"], ["Empreendedores (gestão de redes)"], "pj-autoridade")
add(7, "O que é e como funciona meu método UTI", *IG, "Explicar método próprio, posicionamento e atração de clientes", MKT, "A definir", "Planejar, roteirizar e gravar", NR, "",
    "Apresentar pilares UGC, TikTok Shop e IA e como se complementam.",
    "A definir", [], ["Autoridade", "Branding"], ["Empreendedores (gestão de redes)", "Marcas UGC", "Marcas TikTok Shop"], "pj-autoridade")
add(8, "Lavando a Roupa Suja do Marketing", *IG, "Posicionamento, originalidade e autoridade", MKT, "Lavanderia / lavando roupas", "Roteirizar e gravar", NR, "",
    "Criticar promessa de gravar 100 vídeos em um minuto para TikTok Shop ou outros canais: volume sem criatividade gera conteúdos genéricos.",
    "A definir", ["lavanderia"], ["Autoridade", "Branding"], ["Empreendedores (gestão de redes)", "Marcas TikTok Shop"], "pj-autoridade",
    takes=[("Lavar roupa na lavanderia", ["lavanderia"]), ("Contextualização visual do tema", ["lavanderia"])])

# 02 UGC de produtos de verão (viagem)
verao = [
    (9, "Garnier - hidratante vitamina C", RF, "Gravar", "Vídeo UGC do hidratante na praia.", "Hidratante vitamina C", "Garnier"),
    (11, "Aplicativo de viagem", NR, "Planejar, roteirizar e gravar", "Pesquisar/identificar aplicativo visto e desenvolver UGC de verão/viagem.", None, None),
    (12, "Vestido marrom com costas nuas", NR, "Planejar, roteirizar e gravar", "UGC de produto de verão; definir narrativa e cenas.", "Vestido marrom com costas nuas", None),
    (13, "Protetor solar Sallve", NR, "Planejar, roteirizar e gravar", "UGC de produto de verão; definir narrativa e cenas.", "Protetor solar", "Sallve"),
    (14, "Protetor solar corporal", NR, "Planejar, roteirizar e gravar", "UGC de produto de verão; produto/marca a definir.", "Protetor solar corporal", None),
    (15, "Aplicativo Buser", NR, "Planejar, roteirizar e gravar", "UGC de app de viagem; planejar captação pertinente.", None, None),
    (16, "Biquíni", NR, "Planejar, roteirizar e gravar", "UGC de moda praia; marca/produto a definir.", "Biquíni", None),
    (17, "Lisinha Clarinha", NR, "Planejar, roteirizar e gravar", "UGC de verão; identificar produto e definir roteiro.", "Lisinha Clarinha", None),
    (18, "Creme da Popozuda", NR, "Planejar, roteirizar e gravar", "UGC de verão; definir roteiro e takes.", "Creme da Popozuda", None),
]
add(10, "Arvenses - creme", "Portfólio UGC + TikTok Shop", ["Portfólio", "TikTok Shop"], "Portfólio UGC e venda TikTok Shop", UGC_AUD + " + consumidores TikTok Shop",
    "Viagem 24/10-02/11; praia / contexto da viagem", "Planejar, roteirizar e gravar", NR, "",
    "Dois destinos: portfólio UGC e TikTok Shop; criar versões conforme necessário. Takes a acrescentar pela usuária; não inventar.",
    VIAGEM, ["praia"], ["Portfólio", "Vendas"], ["Marcas UGC", "Consumidores TikTok Shop"], "pj-viagem", "fr-verao", product=("Creme", "Arvenses"))
for n, t, rot, etapa, obs, prod, brand in verao:
    add(n, t, *PORT, "Portfólio UGC de verão e atração de marcas", UGC_AUD, "Viagem 24/10-02/11; praia / contexto da viagem", etapa, rot, "",
        obs + " Takes a acrescentar pela usuária; não inventar.", VIAGEM, ["praia"] + (["passeio"] if n in (11, 15) else []),
        ["Portfólio", "Atrair marcas UGC"], ["Marcas UGC"], "pj-viagem", "fr-verao", product=(prod, brand) if prod else None)

# 03 UGC de experiências (viagem)
EXP_AUD = UGC_AUD + " / negócios de turismo e gastronomia"
for n, t, obs, ctx in [
    (19, "UGC da estadia", "Produzir UGC da hospedagem utilizada.", ["hospedagem"]),
    (20, "UGC de restaurantes", "Produzir UGC dos restaurantes visitados; estabelecimentos ainda a definir.", ["restaurante"]),
    (21, "UGC de passeios", "Produzir UGC dos passeios realizados; experiências ainda a definir.", ["passeio", "barco"]),
    (22, "UGC do delivery do mercado", "Produzir UGC da experiência de pedir/receber compras de mercado durante a viagem.", ["mercado", "hospedagem"]),
]:
    add(n, t, *PORT, "Portfólio UGC de experiências; atrair estabelecimentos e marcas", EXP_AUD, "Viagem 24/10-02/11", "Planejar e gravar", NR, "",
        obs + " Referências, roteiros e takes ainda não definidos; acrescentar posteriormente.", VIAGEM, ctx, ["Portfólio", "Atrair marcas UGC"], ["Marcas UGC"], "pj-viagem", "fr-exp")

# 04 Pesca
add(23, "Portfólio de pesca: varas, molinetes, carretilhas e iscas", "Portfólio Michelangelo / UGC", ["Portfólio"], "Criar portfólio de pesca para atrair marcas do nicho",
    "Marcas de pesca e equipamentos esportivos", "Viagem 24/10-02/11; pescarias", "Planejar e gravar", NR, "",
    "Ainda não há lista fechada de produtos nem roteiros. Tratar categorias como frentes de captação, não criar produtos fictícios.",
    VIAGEM, ["pesca"], ["Portfólio"], ["Marcas UGC"], "pj-viagem", "fr-pesca")

# 05 Branding e lifestyle de viagem
BR_GOAL = "Branding pessoal; identificação e atração de marcas UGC"
BR_AUD = UGC_AUD + " + audiência de lifestyle"
GERAL = ["praia", "passeio", "restaurante", "hospedagem"]
for n, t, fmt, obs, ctx in [
    (24, "Me arrumando para a praia de um jeito divertido", "Horizontal", "Adicionar link de referência posteriormente.", ["praia", "hospedagem"]),
    (25, "Takes da viagem com áudio em alta", "Formato a definir", "Escolher áudio/trend posteriormente; cenas podem ser reutilizadas.", GERAL),
    (26, "Como é e quanto custa viajar para Ubatuba", "Formato a definir", "Pesquisar e registrar custos reais da viagem; formato a definir.", GERAL),
    (27, "Tudo o que você precisa saber antes de ir para o lugar X", "Formato a definir", "Definir qual local será o foco.", ["passeio"]),
    (28, "Mosaico com horas do dia e o que estou fazendo", "Horizontal", "Captar cenas ao longo do dia e organizar por horário.", GERAL),
    (29, "Trabalhando na viagem: \"prometi que ia tirar férias\"", "Formato a definir", "Bastidores de trabalho durante a viagem; frase na tela.", ["notebook", "hospedagem"]),
    (30, "Vlog da viagem com música", "Formato a definir", "Compartilhar takes com vlog narrado e demais conteúdos de viagem.", GERAL),
    (31, "Vlog da viagem narrado", "Formato a definir", "Compartilhar takes com vlog musical, mosaico e conteúdos de branding.", GERAL),
]:
    add(n, t, *IG, BR_GOAL, BR_AUD, "Viagem 24/10-02/11", "Planejar e gravar", NR, fmt,
        obs + " Não inventar takes ausentes; cadastrar campo de link de referência.", VIAGEM, ctx, ["Branding", "Atrair marcas UGC"],
        ["Pessoas que acompanham minha rotina", "Marcas UGC"], "pj-viagem", "fr-brand")

# 06 Gastronomia e casal
add(32, "Receitas rústicas preparadas por Michelangelo", "Instagram orgânico + Portfólio UGC", ["Instagram", "Portfólio"], "Branding/lifestyle e portfólio UGC gastronômico",
    "Consumidores e audiência de lifestyle + marcas de gastronomia", "Viagem 24/10-02/11", "Planejar e gravar", NR, "",
    "Ainda não foram escolhidas as receitas; estilo visual rústico. Takes a definir.", VIAGEM, ["cozinha", "hospedagem"], ["Branding", "Portfólio"],
    ["Pessoas que acompanham minha rotina", "Marcas UGC"], "pj-viagem", "fr-gastro")
CASAL_GOAL = "Branding pessoal, lifestyle e relacionamento com audiência"
CASAL_AUD = "Consumidores e audiência de lifestyle + marcas de lifestyle"
for n, t, fmt, obs, ctx in [
    (33, "Cantando uma música em vários lugares", "Horizontal", "Gravar cenas do casal cantando em diferentes lugares; música a definir. Takes ainda não detalhados.", ["praia", "passeio"]),
    (34, "Takes do casal com música da Shakira", "Vertical", "Montagem de cenas do casal; definir música e cenas. Takes ainda não detalhados.", ["praia", "passeio"]),
    (35, "Adivinha o que vamos comer - trend do poke na praia", "Formato a definir", "Trend engraçada de casal envolvendo poke na praia. Takes ainda não detalhados.", ["praia"]),
]:
    add(n, t, *IG, CASAL_GOAL, CASAL_AUD, "Viagem 24/10-02/11", "Planejar e gravar", NR, fmt, obs, VIAGEM, ctx,
        ["Branding", "Relacionamento com audiência"], ["Pessoas que acompanham minha rotina"], "pj-viagem", "fr-gastro")

# 07 Portfólio UGC: tecnologia, apps e casa
TEC_AUD = UGC_AUD + " / marcas de tecnologia, apps ou decoração"
for n, t, obs, ctx in [
    (36, "Aplicativos de tecnologia", "Pesquisar apps para vídeos UGC no nicho tech.", ["notebook"]),
    (37, "Itens de tecnologia", "Mouse, teclado, tablet, fone de ouvido e outros; definir produtos.", ["notebook"]),
    (38, "Ferramentas de inteligência artificial", "Pesquisar IAs que contratam creators e produzir portfólio dedicado.", ["notebook"]),
    (39, "Aplicativos para UGC estilo canvas", "Pesquisar aplicativos e marcas adequadas ao formato \"canvas\" mencionado pela usuária; não confundir com a plataforma Canva.", ["notebook"]),
    (40, "Casa e decoração: móveis", "Gravar clipes dos móveis e elementos de decoração.", ["casa"]),
    (41, "Casa e decoração: aplicação de papel de parede", "Registrar aplicação de papel de parede na parede.", ["casa"]),
]:
    add(n, t, *PORT, "Construção de portfólio e prospecção de marcas", TEC_AUD, "Preferencialmente a partir de 09/11", "Pesquisar referências, planejar, roteirizar e gravar", NR, "",
        obs + " Não há roteiro, referências ou takes definidos.", JAN09, ctx, ["Portfólio", "Atrair marcas UGC"], ["Marcas UGC"], "pj-portfolio", notBefore="2026-11-09")
add(42, "Receitas feitas por Michelangelo (fora da viagem)", *PORT, "Portfólio UGC gastronômico", UGC_AUD + " / marcas de gastronomia", "Preferencialmente a partir de 09/11", "Planejar, roteirizar e gravar", NR, "",
    "Produzir vídeos de receitas com Michelangelo; diferentes do conjunto rústico da viagem, podendo reaproveitar ideias.", JAN09, ["cozinha"], ["Portfólio"], ["Marcas UGC"], "pj-portfolio", notBefore="2026-11-09")
add(43, "Aprendendo a cozinhar - quadro recorrente", "Instagram orgânico + Portfólio UGC", ["Instagram", "Portfólio"], "Branding pessoal e portfólio UGC gastronômico",
    "Consumidores e audiência de lifestyle + marcas de gastronomia", "Preferencialmente a partir de 09/11", "Planejar, roteirizar e gravar", NR, "",
    "Criar quadro recorrente de aprendizado culinário; publicar no Instagram e incluir no portfólio.", JAN09, ["cozinha"], ["Branding", "Portfólio"],
    ["Pessoas que acompanham minha rotina", "Marcas UGC"], "pj-portfolio", notBefore="2026-11-09")

# 08 TikTok Shop: produtos para gravar
SEM = "Produto para vídeos TikTok Shop; ainda sem ideia detalhada."
LINGERIE = [("Usando com música", ["quarto"]), ("Michelangelo chegando", ["quarto", "casa"]), ("Cozinhando", ["cozinha"]), ("Peça esticada na cama", ["quarto"]), ("Closes", ["quarto"])]
shop = [
    (44, "Cadeira de escritório", SEM, ["notebook", "casa"], []),
    (45, "Fechadura da porta", SEM, ["casa"], []),
    (46, "Filtro de água", SEM, ["cozinha"], []),
    (47, "Lavador da privada", SEM, ["casa"], []),
    (48, "Babydoll", "Gravação usando peça com música; com Michelangelo, cozinhando, ele chegando, esticada na cama e detalhes.", ["quarto", "cozinha"], LINGERIE),
    (49, "Camisola", "Mesma linha criativa descrita em conjunto com babydoll; definir versões individuais.", ["quarto", "cozinha"], LINGERIE),
    (50, "Cobertor", "Arrumando/esticando cama com música; versões narradas explicando produto.", ["quarto"],
     [("Esticar cama", ["quarto"]), ("Detalhes", ["quarto"]), ("Versão musical", ["quarto"]), ("Versão narrada", ["quarto"])]),
    (51, "Tênis de academia", "Gravar na academia; com música, falando do tênis e correndo.", ["academia"],
     [("Academia com música", ["academia"]), ("Falando para câmera", ["academia"]), ("Correndo", ["academia", "parque"]), ("Detalhes do tênis", ["academia"])]),
    (52, "Jogo de lençol", "Arrumando a cama, closes, música e narração.", ["quarto"],
     [("Arrumar cama", ["quarto"]), ("Closes", ["quarto"]), ("Versão musical", ["quarto"]), ("Versão narrada", ["quarto"])]),
    (53, "Organizador de pendurar atrás da porta", "Mostrar usos: bonés, bolsas, objetos, higiene e cosméticos. Pesquisar comentários para ideias reais. Mostrar montagem.", ["casa"],
     [("Montagem", ["casa"]), ("Bonés", ["casa"]), ("Bolsas", ["casa"]), ("Porta-trecos", ["casa"]), ("Higiene", ["casa"]), ("Cosméticos", ["casa"])]),
    (54, "Chapa / tábua de fritar", "Michelangelo fazendo lanche; versão musical, narrada e vídeo com frase impactante e apelo visual da comida. Confirmar nome exato do produto.", ["cozinha"],
     [("Preparação do lanche", ["cozinha"]), ("Close comida", ["cozinha"]), ("Musical", ["cozinha"]), ("Narrado", ["cozinha"]), ("Frase impactante", ["cozinha"])]),
    (55, "Potes plásticos", "Teste de água, armazenamento de comida, descongelamento, uso na mala do Michelangelo, comparação com pote que vaza; pesquisar referências.", ["cozinha", "mala"],
     [("Apresentar kit", ["cozinha"]), ("Teste de vedação", ["cozinha"]), ("Colocar comida", ["cozinha"]), ("Descongelar", ["cozinha"]), ("Mala", ["mala"]), ("Comparação vazamento", ["cozinha"])]),
    (56, "Potes de vidro", "Receitas armazenadas, diferentes usos, vedação, kits, unboxing. Há vídeo de purê já gravado para editar.", ["cozinha"],
     [("Receitas", ["cozinha"]), ("Armazenamento", ["cozinha"]), ("Vedação", ["cozinha"]), ("Kits", ["cozinha"]), ("Unboxing", ["cozinha", "casa"])]),
    (57, "Saquinhos para congelar carne", "Organização para quem mora sozinha; versões musical/narrada, vedação, lavagem, antes e depois do congelador.", ["cozinha"],
     [("Congelar carne", ["cozinha"]), ("Música + frase", ["cozinha"]), ("Narração", ["cozinha"]), ("Lavar", ["cozinha"]), ("Vedação", ["cozinha"]), ("Freezer organizado", ["cozinha"]), ("Antes/depois", ["cozinha"])]),
    (58, "Kit de panelas", "Unboxing, cozinhando e teste do ovo que não gruda.", ["cozinha"],
     [("Unboxing", ["cozinha", "casa"]), ("Cozinhar", ["cozinha"]), ("Teste do ovo", ["cozinha"])]),
]
for n, t, obs, ctx, tk in shop:
    add(n, t, *SHOP, "Venda de produtos TikTok Shop", "Consumidores TikTok Shop", "A partir de 09/11; cenário conforme produto", "Planejar, roteirizar e gravar", NR,
        "Múltiplas versões conforme descrição", obs, JAN09, ctx, ["Vendas"], ["Consumidores TikTok Shop"], "pj-shop", takes=tk, product=(t, None), notBefore="2026-11-09")
add(59, "Projetor para quarto", "TikTok Shop + Portfólio UGC", ["TikTok Shop", "Portfólio"], "Venda de produtos TikTok Shop; portfólio UGC", "Consumidores TikTok Shop; marcas UGC",
    "A partir de 09/11; cenário conforme produto", "Planejar, roteirizar e gravar", NR, "Múltiplas versões conforme descrição",
    "Música, detalhes narrados, funcionamento e casal assistindo deitado. Criar também versão UGC de portfólio.", JAN09, ["quarto"], ["Vendas", "Portfólio"],
    ["Consumidores TikTok Shop", "Marcas UGC"], "pj-shop",
    takes=[("Funcionamento", ["quarto"]), ("Detalhes", ["quarto"]), ("Música", ["quarto"]), ("Narração", ["quarto"]), ("Casal deitado", ["quarto"])], product=("Projetor para quarto", None), notBefore="2026-11-09")

# 09 Edição pendente
C.append(dict(n=60, title="Basic - loja de roupa masculina", destino="Publicação / portfólio (destino exato a confirmar)", plats=[], goal="Divulgação do conteúdo e potencial portfólio",
              aud="Audiência da marca e potenciais contratantes (a confirmar)", when="Data de edição/publicação a definir", etapa="Editar e publicar", roteiro="Material já gravado", fmt="",
              notes="Vídeo integralmente gravado. Falta editar e definir canal/data de publicação.", janela="Pode editar agora", ctx=[], objs=["Portfólio"], auds=[], proj="", front="",
              takes=[], product=None, notBefore=None, status="Edição"))
C.append(dict(n=61, title="Potes de vidro - vídeo guardando purê de batata", destino="TikTok Shop", plats=["TikTok Shop"], goal="Venda TikTok Shop", aud="Consumidores TikTok Shop",
              when="Pode editar agora; publicação a agendar", etapa="Editar e publicar", roteiro="Material já gravado", fmt="",
              notes="Vídeo já gravado guardando purê de batata no pote de vidro. É uma peça existente distinta das novas gravações planejadas.", janela="Pode editar agora", ctx=[],
              objs=["Vendas"], auds=["Consumidores TikTok Shop"], proj="pj-shop", front="", takes=[], product=("Potes de vidro", None), notBefore=None, status="Edição"))

# monta coleções
contents, takes, products = [], [], {}
tn = 0
for c in sorted(C, key=lambda x: x["n"]):
    cid = f"c{c['n']:02d}"
    pid = None
    if c["product"]:
        name, brand = c["product"]
        key = (name, brand)
        if key not in products:
            ctx_levels = [{"ctx": x, "level": "principal" if i == 0 else "recomendado"} for i, x in enumerate(c["ctx"])]
            products[key] = {"id": f"pr{len(products)+1:02d}", "name": name + (f" ({brand})" if brand else ""), "brand": brand or "", "category": "",
                             "contexts": ctx_levels, "refIds": [], "priority": "media", "status": "Disponível para gravar", "notes": "Disponibilidade física a confirmar."}
        pid = products[key]["id"]
    contents.append({"id": cid, "order": c["n"], "title": c["title"], "destino": c["destino"], "platforms": c["plats"], "goal": c["goal"], "audienceText": c["aud"],
                     "when": c["when"], "etapa": c["etapa"], "scriptState": c["roteiro"], "formatNote": c["fmt"], "notes": c["notes"], "janela": c["janela"],
                     "contexts": c["ctx"], "objectives": c["objs"], "audiences": c["auds"], "projectId": c["proj"], "frontId": c["front"],
                     "productIds": [pid] if pid else [], "refIds": [], "refLink": "", "status": c.get("status", "Planejamento"),
                     "notBefore": c["notBefore"] or "", "script": {"version": 1, "lines": []}, "createdAt": NOW})
    for desc, ctx in c["takes"]:
        tn += 1
        takes.append({"id": f"t{tn:03d}", "code": f"T-{tn:03d}", "desc": desc, "contexts": ctx, "contentIds": [cid], "productIds": [pid] if pid else [],
                      "status": "pendente", "priority": "media", "fileIds": [], "informal": True, "participant": "Michelangelo" if "Michelangelo" in desc else "",
                      "notes": "Take informado no inventário (descrição informal).", "createdAt": NOW})

trip_ids = [c["id"] for c in contents if c["janela"] == VIAGEM]
jan_ids = [c["id"] for c in contents if c["janela"] == JAN09]
events = [
    {"id": "ev-viagem", "title": "Viagem", "type": "compromisso", "date": "2026-10-24", "endDate": "2026-11-02", "projectId": "pj-viagem",
     "contexts": ["praia", "hospedagem", "restaurante", "passeio", "pesca", "cozinha"], "contentIds": trip_ids, "status": "pendente",
     "notes": "Oportunidades: UGC de experiências, produtos de verão, pescaria, branding, gastronomia e casal."},
    {"id": "ev-evento-shop", "title": "Evento TikTok Shop", "type": "compromisso", "date": "2026-11-04", "endDate": "2026-11-06", "projectId": "pj-evento",
     "contexts": ["evento"], "contentIds": [], "status": "pendente", "notes": "Conteúdos específicos ainda serão planejados."},
    {"id": "ev-janela", "title": "Início da janela de gravação: novos nichos UGC e TikTok Shop", "type": "compromisso", "date": "2026-11-09",
     "contexts": [], "contentIds": jan_ids, "status": "pendente", "notes": "Janela preferencial, não é data obrigatória para cada vídeo."},
]
data = dict(projects=projects, products=list(products.values()), refs=[], ideas=[], contents=contents, takes=takes, files=[], events=events, pubs=[])
for k, v in data.items():
    with open(os.path.join(OUT, f"{k}.json"), "w", encoding="utf-8") as f:
        json.dump({"items": v}, f, ensure_ascii=False)
print({k: len(v) for k, v in data.items()})
print("sem takes:", sum(1 for c in contents if c["status"] == "Planejamento" and not any(c["id"] in t["contentIds"] for t in takes)))
