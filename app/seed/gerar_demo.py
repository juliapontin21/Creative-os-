"""Gera os dados de demonstração do Creative OS (viagem, TikTok Shop, UGC).
Saída: um JSON por coleção em app/seed/, no formato {"items": [...]} usado pelo banco do app.
Todos os itens têm "demo": true para poderem ser apagados depois."""
import json, os

OUT = os.path.dirname(os.path.abspath(__file__))

projects = [
    {"id": "p1", "name": "Viagem Ubatuba", "start": "2026-11-06", "end": "2026-11-10",
     "objectives": ["Portfólio", "Branding", "Vendas"], "participants": ["Julia", "Michelangelo"],
     "fronts": [
         {"id": "f1", "name": "UGC de experiências", "items": "Hospedagem, restaurantes, passeios"},
         {"id": "f2", "name": "UGC de produtos", "items": "Protetor solar, hidratante, acessórios"},
         {"id": "f3", "name": "Portfólio do Michelangelo", "items": "Vara de pesca, carretilha, acessórios"},
         {"id": "f4", "name": "Gastronomia", "items": "Receitas, preparo de refeições, utensílios"},
         {"id": "f5", "name": "Conteúdo de casal", "items": "Praia, passeios, momentos espontâneos"},
         {"id": "f6", "name": "Marca pessoal", "items": "Bastidores, rotina de trabalho, autoridade"},
         {"id": "f7", "name": "TikTok Shop", "items": "Produtos usados na viagem, reviews"}]},
    {"id": "p2", "name": "Marca pessoal Q4", "start": "2026-10-01", "end": "2026-12-31",
     "objectives": ["Autoridade", "Branding", "Atrair marcas UGC"], "participants": ["Julia"], "fronts": [
         {"id": "f8", "name": "Autoridade UGC"}, {"id": "f9", "name": "Empreendedorismo"}]},
    {"id": "p3", "name": "TikTok Shop out/nov", "start": "2026-10-01", "end": "2026-11-30",
     "objectives": ["Vendas"], "participants": ["Julia"], "fronts": [{"id": "f10", "name": "Fitness"}, {"id": "f11", "name": "Casa"}]},
]

products = [
    {"id": "pr1", "name": "Relógio inteligente FitPulse", "brand": "FitPulse (exemplo)", "category": "Eletrônicos",
     "benefits": "Mede batimentos e passos; notificações no pulso; bateria de 7 dias.", "audience": "Quem treina e quer praticidade",
     "contexts": [{"ctx": "academia", "level": "principal"}, {"ctx": "parque", "level": "recomendado"}, {"ctx": "shopping", "level": "alternativo"}],
     "refIds": ["r6"], "priority": "alta", "status": "Em produção", "available": True},
    {"id": "pr2", "name": "Tênis Run Light", "brand": "Run Light (exemplo)", "category": "Calçados",
     "benefits": "Leve e com amortecimento; bom para esteira e caminhada.", "audience": "Iniciantes na corrida",
     "contexts": [{"ctx": "academia", "level": "principal"}, {"ctx": "parque", "level": "principal"}],
     "refIds": [], "priority": "media", "status": "Disponível para gravar", "available": True},
    {"id": "pr3", "name": "Bolsa Office Tote", "brand": "Tote (exemplo)", "category": "Acessórios",
     "benefits": "Cabe notebook de 15 polegadas; divisórias; não amassa.", "audience": "Mulheres que trabalham fora",
     "contexts": [{"ctx": "reuniao", "level": "principal"}, {"ctx": "evento", "level": "recomendado"}],
     "refIds": [], "priority": "media", "status": "Disponível para gravar", "available": True},
    {"id": "pr4", "name": "Protetor solar FPS 50 toque seco", "brand": "Solar (exemplo)", "category": "Skincare",
     "benefits": "Não deixa branco; resistente à água por 4h; toque seco.", "audience": "Quem vai à praia ou piscina",
     "contexts": [{"ctx": "praia", "level": "principal"}, {"ctx": "piscina", "level": "principal"}, {"ctx": "barco", "level": "recomendado"}],
     "refIds": ["r2"], "priority": "alta", "status": "Em produção", "available": True},
    {"id": "pr5", "name": "Panela antiaderente 24 cm", "brand": "Cozi (exemplo)", "category": "Casa",
     "benefits": "Nada gruda; aquece por igual; lava fácil.", "audience": "Quem cozinha no dia a dia",
     "contexts": [{"ctx": "cozinha", "level": "principal"}], "refIds": ["r4"], "priority": "alta", "status": "Em produção", "available": True},
    {"id": "pr6", "name": "Hidratante corporal pós-sol", "brand": "Solar (exemplo)", "category": "Skincare",
     "benefits": "Alivia a pele depois do sol; cheiro suave.", "audience": "Viajantes",
     "contexts": [{"ctx": "hospedagem", "level": "recomendado"}, {"ctx": "praia", "level": "alternativo"}],
     "refIds": [], "priority": "media", "status": "Disponível para gravar", "available": True},
    {"id": "pr7", "name": "Garrafa térmica 750 ml", "brand": "Térmica (exemplo)", "category": "Acessórios",
     "benefits": "Gelada por 24h; não vaza na bolsa.", "audience": "Quem passa o dia fora",
     "contexts": [{"ctx": "academia", "level": "recomendado"}, {"ctx": "barco", "level": "recomendado"}, {"ctx": "notebook", "level": "alternativo"}],
     "refIds": [], "priority": "baixa", "status": "Disponível para gravar", "available": True},
]

refs = [
    {"id": "r1", "title": "Vlog de viagem com produto no meio da rotina", "url": "",
     "notes": "Produto aparece natural no vlog, sem corte de anúncio.", "why": "Mostra que dá para vender sem parecer publi.",
     "adapt": "Fazer o vlog de Ubatuba com protetor e hidratante aparecendo nos momentos reais.",
     "objectives": ["Branding", "Atrair marcas UGC"], "audiences": ["Marcas UGC", "Pessoas que acompanham minha rotina"],
     "formats": ["Vlog", "Conteúdo de viagem"], "traits": ["Narrativa", "Estilo de edição"], "platforms": ["Instagram", "TikTok"],
     "productIds": ["pr4", "pr6"], "projectIds": ["p1"], "contentIds": ["c3"]},
    {"id": "r2", "title": "Review de protetor na praia sem cenário montado", "url": "",
     "notes": "Gravado na areia, luz natural, mostra o rótulo e a pele sem ficar branca.", "why": "Prova real no contexto de uso.",
     "adapt": "Gancho de prova + reaplicação depois do mergulho.",
     "objectives": ["Vendas"], "audiences": ["Consumidores TikTok Shop"], "formats": ["Review", "Demonstração"],
     "traits": ["Gancho", "Cenário"], "platforms": ["TikTok Shop"], "productIds": ["pr4"], "projectIds": ["p1"], "contentIds": ["c2"],
     "ts": {"hook": "Passei 6 horas no sol e olha minha pele", "benefit": "Não deixa branco e aguenta água",
            "objection": "Protetor resistente à água sempre fica pegajoso", "context": "Praia, depois do mergulho", "style": "Prova em tempo real"}},
    {"id": "r3", "title": "Bastidores: como gravo UGC num dia comum", "url": "",
     "notes": "Criadora mostra o tripé, a luz da janela e o celular. Conta quanto tempo leva.",
     "why": "Posiciona como profissional e explica o processo para marcas.",
     "adapt": "Mostrar que eu aproveito a rotina real para gravar várias marcas no mesmo dia.",
     "objectives": ["Autoridade", "Atrair marcas UGC"], "audiences": ["Marcas UGC"], "formats": ["Bastidores", "Storytelling"],
     "traits": ["Narrativa", "Linguagem"], "platforms": ["Instagram", "LinkedIn"], "contentIds": ["c6"]},
    {"id": "r4", "title": "Receita a dois com a panela em destaque", "url": "",
     "notes": "Casal cozinhando, câmera alta, a panela sempre no centro do quadro.",
     "why": "Produto vira protagonista sem falar dele o tempo todo.",
     "adapt": "Panqueca na pousada com o Michelangelo; close no antiaderente.",
     "objectives": ["Portfólio", "Atrair marcas UGC"], "audiences": ["Marcas UGC"], "formats": ["Conteúdo de casal", "Demonstração"],
     "traits": ["Enquadramento", "Estética"], "platforms": ["Instagram", "Portfólio"], "productIds": ["pr5"], "contentIds": ["c4"]},
    {"id": "r5", "title": "Antes e depois de uma campanha de TikTok Shop", "url": "",
     "notes": "Gestora mostra números de vendas antes e depois de organizar os creators.",
     "why": "Prova de resultado para marcas que querem gestão.",
     "adapt": "Contar o caso de uma campanha que geri, com números autorizados.",
     "objectives": ["Atrair marcas TikTok Shop", "Autoridade"], "audiences": ["Marcas TikTok Shop"], "formats": ["Storytelling"],
     "traits": ["Gancho", "Narrativa"], "platforms": ["Instagram", "LinkedIn"], "contentIds": []},
    {"id": "r6", "title": "Relógio na academia: 3 funções que eu uso", "url": "",
     "notes": "Lista rápida durante o treino, cada função com um close.",
     "why": "Formato de lista prende e mostra uso real.",
     "adapt": "Gravar entre as séries, sem roteiro falado longo.",
     "objectives": ["Vendas"], "audiences": ["Consumidores TikTok Shop"], "formats": ["Demonstração", "Vídeo comercial"],
     "traits": ["Gancho", "Enquadramento"], "platforms": ["TikTok Shop"], "productIds": ["pr1"], "contentIds": ["c7"],
     "ts": {"hook": "3 coisas que meu relógio faz que eu não vivo sem", "benefit": "Praticidade no treino",
            "objection": "Relógio barato não mede direito", "context": "Academia", "style": "Lista com close"}},
    {"id": "r7", "title": "Networking: o que ninguém te conta", "url": "",
     "notes": "Vlog curto em evento com reflexão sobre conexões.",
     "why": "Mostra bastidor do empreendedorismo e gera identificação.",
     "adapt": "Gravar no evento do dia 20 e fechar com uma lição prática.",
     "objectives": ["Branding", "Autoridade"], "audiences": ["Empreendedores (gestão de redes)"], "formats": ["Vlog", "Storytelling"],
     "traits": ["Narrativa"], "platforms": ["Instagram", "LinkedIn"], "contentIds": ["c8"]},
]

ideas = [
    {"id": "i1", "title": "Um dia gravando 5 marcas sem sair da rotina", "desc": "Mostrar como um único passeio rende vários vídeos.",
     "refIds": ["r3"], "audience": "Marcas UGC", "objective": "Atrair marcas UGC", "platform": "Instagram", "format": "Bastidores", "priority": "alta", "status": "Nova"},
    {"id": "i2", "title": "Quanto custa um vídeo UGC (e o que está incluso)", "desc": "Educar marcas sobre escopo e entregáveis.",
     "audience": "Marcas UGC", "objective": "Autoridade", "platform": "Instagram", "format": "Tutorial", "priority": "media", "status": "Nova"},
    {"id": "i3", "title": "3 erros de marcas no TikTok Shop", "desc": "Erros que vejo gerindo campanhas.", "refIds": ["r5"],
     "audience": "Marcas TikTok Shop", "objective": "Atrair marcas TikTok Shop", "platform": "LinkedIn", "format": "Storytelling", "priority": "alta", "status": "Nova"},
    {"id": "i4", "title": "Minha estética de feed explicada", "desc": "Paleta, luz e enquadramentos que repito.",
     "audience": "Pessoas que acompanham minha rotina", "objective": "Branding", "platform": "Instagram", "format": "Bastidores", "priority": "baixa", "status": "Nova"},
    {"id": "i5", "title": "Gestão de redes para negócio local: por onde começar", "desc": "Para empreendedores de Guarulhos.",
     "audience": "Empreendedores (gestão de redes)", "objective": "Autoridade", "platform": "Instagram", "format": "Tutorial", "priority": "media", "status": "Em análise"},
]

def L(scene, text, note="", takes=None, overlay="", transition="", edit=""):
    return {"scene": scene, "text": text, "note": note, "takeIds": takes or [], "overlay": overlay, "transition": transition, "editNote": edit}

contents = [
    {"id": "c1", "title": "UGC Protetor solar na praia", "projectId": "p1", "frontId": "f2", "objectives": ["Portfólio", "Atrair marcas UGC"],
     "audiences": ["Marcas UGC"], "platforms": ["Instagram", "Portfólio"], "format": "Demonstração", "status": "Pronto para gravar",
     "refIds": [], "productIds": ["pr4"], "pubDate": "2026-11-14",
     "script": {"version": 1, "lines": [
         L("Gancho", "Fui testar esse protetor num dia inteiro de praia.", "sorrindo, olhando para a câmera", ["t1"], "6h de sol", "corte seco"),
         L("Prova", "Olha o FPS 50 e o toque seco: não fica branco.", "mostrar o rótulo contra o sol", ["t4"]),
         L("Uso", "Passo antes de caminhar e reaplico depois do mar.", "", ["t2", "t5"], "", "match cut"),
         L("Fecho", "Pele protegida e sem aquele aspecto pegajoso.", "tom leve", ["t3"], "", "", "terminar com plano aberto do mar")]}},
    {"id": "c2", "title": "TikTok Shop Protetor FPS 50", "projectId": "p1", "frontId": "f7", "objectives": ["Vendas"],
     "audiences": ["Consumidores TikTok Shop"], "platforms": ["TikTok Shop"], "format": "Review", "status": "Pronto para gravar",
     "refIds": ["r2"], "productIds": ["pr4"], "pubDate": "2026-11-12",
     "script": {"version": 1, "lines": [
         L("Gancho", "Passei 6 horas no sol e olha minha pele.", "mostrar o rosto de perto", ["t1"]),
         L("Prova", "Mergulhei, reapliquei e continua sem ficar branco.", "", ["t5", "t4"]),
         L("CTA", "Tá no carrinho laranja, aproveita o cupom.", "apontar para baixo")]}},
    {"id": "c3", "title": "Vlog Ubatuba", "projectId": "p1", "frontId": "f1", "objectives": ["Branding", "Relacionamento com audiência"],
     "audiences": ["Pessoas que acompanham minha rotina"], "platforms": ["Instagram", "TikTok"], "format": "Vlog", "status": "Pronto para gravar",
     "refIds": ["r1"], "productIds": ["pr4", "pr6"], "pubDate": "2026-11-16",
     "script": {"version": 1, "lines": [
         L("Abertura", "Cinco dias em Ubatuba, e eu vou te mostrar tudo.", "voz em off", ["t24"]),
         L("Manhã", "Café da manhã na pousada antes da praia.", "", ["t6", "t9"]),
         L("Praia", "Protetor, caminhada e mar.", "", ["t1", "t2", "t3"]),
         L("Noite", "Jantar e brinde para fechar o dia.", "", ["t25"])]}},
    {"id": "c4", "title": "UGC Panela: panqueca na pousada", "projectId": "p1", "frontId": "f4", "objectives": ["Portfólio", "Atrair marcas UGC"],
     "audiences": ["Marcas UGC"], "platforms": ["Instagram", "Portfólio"], "format": "Demonstração", "status": "Pronto para gravar",
     "refIds": ["r4"], "productIds": ["pr5"], "pubDate": "2026-11-15", "editNotes": "Ritmo rápido, cortes no beat, sem narração.",
     "script": {"version": 1, "lines": [
         L("1", "(sem fala) Ingredientes na bancada.", "", ["t6"], "Panqueca de domingo", "corte no beat"),
         L("2", "(sem fala) Mistura e massa na frigideira.", "", ["t7", "t8"]),
         L("3", "(sem fala) A virada, nada gruda.", "", ["t9"], "Nada gruda"),
         L("4", "(sem fala) Prato pronto e prova.", "", ["t10", "t11"])]}},
    {"id": "c5", "title": "Casal na praia", "projectId": "p1", "frontId": "f5", "objectives": ["Engajamento"],
     "audiences": ["Pessoas que acompanham minha rotina"], "platforms": ["Instagram"], "format": "Conteúdo de casal", "status": "Planejamento",
     "refIds": [], "productIds": [], "pubDate": "2026-11-18", "script": {"version": 1, "lines": []}},
    {"id": "c6", "title": "Bastidores: UGC contextualizado", "projectId": "p2", "frontId": "f8", "objectives": ["Autoridade", "Atrair marcas UGC"],
     "audiences": ["Marcas UGC"], "platforms": ["Instagram", "LinkedIn"], "format": "Bastidores", "status": "Em gravação",
     "refIds": ["r3"], "productIds": [], "pubDate": "2026-10-28",
     "script": {"version": 2, "lines": [
         L("Gancho", "Eu não paro o dia para gravar: eu gravo o meu dia.", "firme", ["t17"], "UGC na vida real"),
         L("Processo", "Notebook, celular, luz da janela. É isso.", "", ["t15", "t16"]),
         L("Para marcas", "Seu produto aparece onde ele é usado de verdade.", "olhar para a câmera", [], "", "", "inserir prints de vídeos de clientes")]}},
    {"id": "c7", "title": "Relógio FitPulse na academia", "projectId": "p3", "frontId": "f10", "objectives": ["Vendas"],
     "audiences": ["Consumidores TikTok Shop"], "platforms": ["TikTok Shop"], "format": "Demonstração", "status": "Em gravação",
     "refIds": ["r6"], "productIds": ["pr1"], "pubDate": "2026-10-24",
     "script": {"version": 1, "lines": [
         L("Gancho", "3 coisas que meu relógio faz que eu não vivo sem.", "", ["t12"]),
         L("1 e 2", "Batimentos no treino e notificação sem pegar o celular.", "", ["t12", "t13"]),
         L("3", "E a bateria dura a semana toda.", "", ["t14"]),
         L("CTA", "Link no carrinho laranja.", "")]}},
    {"id": "c8", "title": "Networking e empreendedorismo", "projectId": "p2", "frontId": "f9", "objectives": ["Branding", "Autoridade"],
     "audiences": ["Empreendedores (gestão de redes)"], "platforms": ["Instagram", "LinkedIn"], "format": "Vlog", "status": "Roteirização",
     "refIds": ["r7"], "productIds": [], "pubDate": "2026-11-25",
     "script": {"version": 1, "lines": [
         L("Abertura", "Vim num evento de networking e vou te contar o que ninguém fala.", "andando", ["t18"]),
         L("Meio", "Conexão boa não é trocar cartão, é lembrar da conversa depois.", "", ["t19", "t20"]),
         L("Fecho", "Anota essa: manda mensagem em até 24 horas.", "", ["t21"])]}},
    {"id": "c9", "title": "Portfólio Michelangelo: pesca", "projectId": "p1", "frontId": "f3", "objectives": ["Portfólio"],
     "audiences": ["Marcas UGC"], "platforms": ["Portfólio"], "format": "Demonstração", "status": "Pronto para gravar",
     "refIds": [], "productIds": [], "pubDate": "2026-11-20", "script": {"version": 1, "lines": []}},
]

def T(i, desc, ctx, contents, **kw):
    d = {"id": f"t{i}", "code": f"T-{i:03d}", "desc": desc, "contexts": ctx, "contentIds": contents,
         "status": "pendente", "priority": "media", "productIds": [], "fileIds": []}
    d.update(kw)
    return d

takes = [
    T(1, "Aplicando protetor solar na praia", ["praia"], ["c1", "c2", "c3", "c5"], action="Aplicar produto", framing="Close mãos e rosto", setting="Areia / beira-mar", location="Praia do Félix", productIds=["pr4"], priority="alta", hardToRepeat=True),
    T(2, "Caminhando na praia em plano aberto", ["praia"], ["c1", "c3", "c5"], action="Caminhar", framing="Plano aberto", setting="Areia / beira-mar", location="Praia do Félix", participant="Julia"),
    T(3, "Close dos pés caminhando na areia", ["praia"], ["c3", "c5", "c1"], action="Caminhar", framing="Close pés", setting="Areia / beira-mar", location="Praia do Félix"),
    T(4, "Mostrando o FPS do rótulo contra o sol", ["praia", "piscina"], ["c1", "c2"], action="Mostrar produto", framing="Close produto", setting="Areia / beira-mar", productIds=["pr4"], priority="alta"),
    T(5, "Reaplicando protetor depois do mergulho", ["praia", "piscina"], ["c2", "c1"], action="Aplicar produto", framing="Plano médio", setting="Areia / beira-mar", productIds=["pr4"]),
    T(6, "Ingredientes organizados na bancada", ["cozinha"], ["c4", "c3"], action="Preparar", framing="Top view", setting="Cozinha da pousada", location="Pousada"),
    T(7, "Mãos misturando a massa", ["cozinha"], ["c4"], action="Preparar", framing="Close mãos", setting="Cozinha da pousada"),
    T(8, "Massa entrando na frigideira", ["cozinha"], ["c4", "c3"], action="Cozinhar", framing="Close panela", setting="Cozinha da pousada", productIds=["pr5"], priority="alta"),
    T(9, "Virando a panqueca na panela", ["cozinha"], ["c4", "c5", "c3"], action="Cozinhar", framing="Plano médio", setting="Cozinha da pousada", productIds=["pr5"], priority="alta"),
    T(10, "Close do prato pronto", ["cozinha", "restaurante"], ["c4", "c3"], action="Servir", framing="Close", setting="Cozinha da pousada"),
    T(11, "Michelangelo experimentando a receita", ["cozinha"], ["c4", "c5"], action="Provar", framing="Plano médio", setting="Cozinha da pousada", participant="Michelangelo"),
    T(12, "Relógio mostrando batimentos durante o treino", ["academia"], ["c7"], action="Mostrar produto", framing="Close pulso", setting="Academia", productIds=["pr1"], status="gravado", recordedAt="2026-10-19", fileIds=["fl1"]),
    T(13, "Notificação chegando no pulso entre as séries", ["academia"], ["c7"], action="Mostrar produto", framing="Close pulso", setting="Academia", productIds=["pr1"], priority="alta"),
    T(14, "Tela de bateria do relógio no fim da semana", ["academia", "notebook", "parque"], ["c7"], action="Mostrar produto", framing="Close", setting="Academia", productIds=["pr1"]),
    T(15, "Trabalhando no notebook editando UGC", ["notebook"], ["c6", "c3"], action="Trabalhar", framing="Plano médio lateral", setting="Home office", status="gravado", recordedAt="2026-10-17", fileIds=["fl2"]),
    T(16, "Bancada com produtos de clientes", ["notebook"], ["c6"], action="Mostrar produto", framing="Top view", setting="Home office", status="gravado", recordedAt="2026-10-17", fileIds=["fl3"]),
    T(17, "Celular no tripé gravando um take (bastidor)", ["notebook", "hospedagem"], ["c6"], action="Gravar", framing="Plano aberto", setting="Home office", priority="alta"),
    T(18, "Chegada ao evento", ["evento"], ["c8"], action="Chegar", framing="Plano médio, câmera na mão", setting="Evento", location="Centro de eventos", fixedEventId="e10"),
    T(19, "Ambiente e público do evento", ["evento"], ["c8"], action="Ambiente", framing="Plano aberto", setting="Evento", fixedEventId="e10"),
    T(20, "Conversas e troca de contatos", ["evento"], ["c8"], action="Conversar", framing="Plano médio", setting="Evento", fixedEventId="e10"),
    T(21, "Trecho de palestra", ["evento"], ["c8"], action="Assistir", framing="Plano aberto do palco", setting="Evento", fixedEventId="e10"),
    T(22, "Arremessando a vara de pesca", ["pesca", "praia"], ["c9", "c3"], action="Pescar", framing="Plano aberto", setting="Costão", participant="Michelangelo", priority="alta", hardToRepeat=True),
    T(23, "Close da carretilha recolhendo a linha", ["pesca"], ["c9"], action="Pescar", framing="Close", setting="Costão", participant="Michelangelo"),
    T(24, "Barco saindo do píer", ["barco"], ["c3", "c5"], action="Passeio", framing="Plano aberto", setting="Píer", hardToRepeat=True),
    T(25, "Brinde no restaurante", ["restaurante"], ["c3", "c5"], action="Brindar", framing="Close taças", setting="Restaurante"),
    T(26, "Pôr do sol na sacada da pousada", ["hospedagem"], [], action="Ambiente", framing="Plano aberto", setting="Pousada", status="gravado", recordedAt="2026-10-10", fileIds=["fl4"], spontaneous=True),
]

files = [
    {"id": "fl1", "name": "IMG_4512.MOV", "size": 48234496, "type": "video/quicktime", "date": "2026-10-19", "takeIds": ["t12"], "simulated": True},
    {"id": "fl2", "name": "IMG_4471.MOV", "size": 73400320, "type": "video/quicktime", "date": "2026-10-17", "takeIds": ["t15"], "simulated": True},
    {"id": "fl3", "name": "IMG_4473.MOV", "size": 31457280, "type": "video/quicktime", "date": "2026-10-17", "takeIds": ["t16"], "simulated": True},
    {"id": "fl4", "name": "IMG_4310.MOV", "size": 59768832, "type": "video/quicktime", "date": "2026-10-10", "takeIds": ["t26"], "simulated": True},
]

def E(i, title, typ, date, **kw):
    d = {"id": f"e{i}", "title": title, "type": typ, "date": date, "status": "pendente", "contexts": [], "contentIds": []}
    d.update(kw)
    return d

events = [
    E(1, "Academia", "compromisso", "2026-10-21", time="18:30", contexts=["academia"], location="Academia do bairro", projectId="p3", contentIds=["c7"]),
    E(2, "Gravação: Relógio FitPulse", "gravacao", "2026-10-21", time="18:45", contexts=["academia"], projectId="p3", contentIds=["c7"], fixed=False, sourceId="e1"),
    E(3, "Reunião com cliente", "compromisso", "2026-10-22", time="10:00", contexts=["reuniao"], location="Coworking"),
    E(4, "Edição: Relógio FitPulse", "edicao", "2026-10-22", contentIds=["c7"], projectId="p3", responsible="Julia"),
    E(5, "Edição: Bastidores UGC contextualizado", "edicao", "2026-10-23", contentIds=["c6"], projectId="p2", responsible="Julia"),
    E(6, "Revisão: Bastidores UGC contextualizado", "revisao", "2026-10-26", contentIds=["c6"], projectId="p2", responsible="Julia"),
    E(7, "Viagem Ubatuba", "compromisso", "2026-11-06", endDate="2026-11-10", projectId="p1", location="Ubatuba"),
    E(8, "Café da manhã na pousada", "compromisso", "2026-11-07", time="08:30", contexts=["cozinha", "hospedagem"], projectId="p1", location="Pousada"),
    E(9, "Praia do Félix", "compromisso", "2026-11-07", time="10:00", contexts=["praia"], projectId="p1", location="Praia do Félix", contentIds=["c1", "c2", "c3", "c5"]),
    E(11, "Passeio de barco", "compromisso", "2026-11-08", time="09:00", contexts=["barco"], projectId="p1", location="Píer do Itaguá"),
    E(12, "Restaurante à noite", "compromisso", "2026-11-08", time="20:00", contexts=["restaurante"], projectId="p1"),
    E(13, "Preparar jantar na pousada", "compromisso", "2026-11-09", time="19:00", contexts=["cozinha"], projectId="p1", location="Pousada", contentIds=["c4"]),
    E(14, "Pescaria no costão", "compromisso", "2026-11-09", time="06:30", contexts=["pesca", "praia"], projectId="p1", contentIds=["c9"]),
    E(15, "Gravação: praia (protetor, vlog, casal)", "gravacao", "2026-11-07", time="10:00", contexts=["praia"], projectId="p1", contentIds=["c1", "c2", "c3", "c5"], fixed=True, sourceId="e9"),
    E(16, "Edição: TikTok Shop Protetor", "edicao", "2026-11-10", contentIds=["c2"], projectId="p1", responsible="Julia"),
    E(17, "Edição: UGC Protetor e Panela", "edicao", "2026-11-11", contentIds=["c1", "c4"], projectId="p1", responsible="Julia"),
    E(10, "Evento de networking", "compromisso", "2026-11-20", time="19:00", contexts=["evento"], location="Centro de eventos", projectId="p2", contentIds=["c8"]),
    E(18, "Gravação: Networking e empreendedorismo", "gravacao", "2026-11-20", time="19:00", contexts=["evento"], projectId="p2", contentIds=["c8"], fixed=True, sourceId="e10"),
    E(19, "Edição: Networking", "edicao", "2026-11-22", contentIds=["c8"], projectId="p2", responsible="Julia"),
    E(20, "Revisão: Networking", "revisao", "2026-11-23", contentIds=["c8"], projectId="p2", responsible="Julia"),
]

pubs = [
    {"id": "pb1", "contentId": "c7", "platform": "TikTok Shop", "date": "2026-10-24", "time": "18:00", "format": "Vídeo TikTok Shop", "status": "Programada"},
    {"id": "pb2", "contentId": "c6", "platform": "Instagram", "date": "2026-10-28", "time": "12:00", "format": "Reels", "status": "Programada"},
    {"id": "pb3", "contentId": "c6", "platform": "LinkedIn", "date": "2026-10-29", "time": "09:00", "format": "Vídeo", "status": "Programada"},
    {"id": "pb4", "contentId": "c2", "platform": "TikTok Shop", "date": "2026-11-12", "time": "19:00", "format": "Vídeo TikTok Shop", "status": "Programada"},
    {"id": "pb5", "contentId": "c1", "platform": "Instagram", "date": "2026-11-14", "time": "12:00", "format": "Reels", "status": "Programada"},
    {"id": "pb6", "contentId": "c1", "platform": "Portfólio", "date": "2026-11-17", "format": "Vídeo", "status": "Programada"},
    {"id": "pb7", "contentId": "c4", "platform": "Instagram", "date": "2026-11-15", "time": "11:00", "format": "Reels", "status": "Programada"},
    {"id": "pb8", "contentId": "c3", "platform": "Instagram", "date": "2026-11-16", "time": "18:00", "format": "Reels", "status": "Programada"},
    {"id": "pb9", "contentId": "c3", "platform": "TikTok", "date": "2026-11-16", "time": "20:00", "format": "Vídeo", "status": "Programada"},
    {"id": "pb10", "contentId": "c5", "platform": "Instagram", "date": "2026-11-18", "time": "18:00", "format": "Carrossel", "status": "Programada"},
    {"id": "pb11", "contentId": "c9", "platform": "Portfólio", "date": "2026-11-20", "format": "Vídeo", "status": "Programada"},
    {"id": "pb12", "contentId": "c8", "platform": "Instagram", "date": "2026-11-25", "time": "12:00", "format": "Reels", "status": "Programada"},
]

data = dict(projects=projects, products=products, refs=refs, ideas=ideas, contents=contents, takes=takes, files=files, events=events, pubs=pubs)
for k, v in data.items():
    for x in v:
        x["demo"] = True
    with open(os.path.join(OUT, f"{k}.json"), "w", encoding="utf-8") as f:
        json.dump({"items": v}, f, ensure_ascii=False)
print({k: len(v) for k, v in data.items()})
