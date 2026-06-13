# -*- coding: utf-8 -*-
"""
LUSORAE — SEED NETWORK REALISM ENGINE Ω
=========================================
50 personas portuguesas com voz humana real. Dados curados manualmente.

REGRAS DE AUTENTICIDADE:
- Nomes reais portugueses (Inês, Tiago, Margarida — não "Helena Rosa" inventada)
- Usernames imperfeitos (ines.s_94, t_almeida, _mar_gomes, miguel.faria.92)
- Bios curtas, irónicas, por vezes auto-depreciativas, NUNCA "vibes positivas"
- Profissões reais (caixa do Pingo Doce, técnica de farmácia, motorista da Carris)
- Tópicos do dia a dia (autocarro atrasado, pastel a 1,50€, jogo do Benfica)
- Sem emojis em cascata, sem hashtags compulsivas, sem "amantes da vida"
- Misturar humor seco, frustração, momentos banais, recomendações casuais
- Pontuação imperfeita: vírgulas a faltar, "tava" em vez de "estava", lower case mid-sentence

ESTRUTURA DE PERSONA:
  (id, first, last, username, age, city, region, freguesia, prof_short,
   bio, team, mood, interests[], voice_tag, p_daily_post,
   p_comment_on_followed, p_reply, p_dm, photo_brief)

VOICE TAGS (cada uma com bundle de posts em VOICES):
  ironica_noite       — sarcástica, posta tarde, frustrada
  cansada_honesta     — exausta do trabalho, autocritica
  pai_cansado         — quotidiano dos filhos
  mae_cansada         — quotidiano + organização familiar
  estudante_caotica   — universidade, ressacas, prazos
  surfista_chill      — paz, mar, devagarinho
  sportinguista       — futebol, frustração, esperança
  benfiquista         — futebol, gozo aos rivais
  portista            — futebol, norte, atitude
  empreendedor        — vendas, hustle, café
  freelancer_design   — clientes maus, refs, AirPods
  tech_dev            — produtividade, código, café
  jornalista_local    — eventos, contexto, política
  reformado_aldeia    — vida calma, jardim, RTP
  velhote_lisboa      — café da tarde, jornal, sotaque
  cozinheira_caseira  — receitas, mercado, fim de semana
  estudante_porto     — universidade, baixa, repúblicas
  acoriana            — Ponta Delgada, mar, neblina
  madeirense          — Funchal, hiper-local
  algarvio_inverno    — Faro, mar fora de época
  alentejano_calmo    — Évora, devagar
  fan_cinema          — filmes, recomendações, ironia
  livreira            — sebos, autores, FNAC
  cafe_pasteleiro     — manhãs, pastéis, conversas balcão
  mae_trabalhadora    — equilibrio, casa, café à pressa
  professor_secund    — ensino, alunos, RTP3
  enfermeira_urgencia — turnos, cansaço, café requentado
  motorista_carris    — trânsito, passageiros, Lisboa
  vendedora_loja      — clientes, salário, horas extra
  programador_remoto  — laptop, café especialty, gatos
  artista_visual      — exposições, atelier, frustração
  musico_local        — concertos, bar, mochila
  empresario_pme      — fornecedores, IVA, contas
  jovem_emigrante     — saudades, Berlim/Londres
  estudante_erasmus   — fora, comparações, saudade
  pesca_recreativa    — barco, madrugada, mar
  caminheira_norte    — trilhos, botas, neblina
  jardineiro_amador   — vasos, tomates, varanda
  gamer_pc            — Steam, latência, café às 2h
  fotografo_amador    — câmara analógica, filme, lisboa
  mecanico_terra      — oficina, óleo, ferramenta
  taxista_porto       — passageiros, GPS, Marquês
  jovem_pai_lisboa    — bebé, fralda, sono
  noiva_25            — casamento, custos, IKEA
  divorciada_45       — recomeço, ginásio, terapia
  reformada_porto     — netos, café, missa
  hipster_caixa       — alfama, bar craft beer, vinil
  imigrante_lisboa    — brasileira em Lisboa, perspetiva
  estudante_medicina  — exames, plantões, cansaço
  voluntaria_animal   — gatos abrigo, cinismo, doçura
  arquiteta_jovem     — projetos, sketch, café Graça
"""

# ════════════════════════════════════════════════════════════════════════════
# 50 PERSONAS — distribuição demográfica realista
# ════════════════════════════════════════════════════════════════════════════
# Distribuição etária PT (aprox INE 2024):
#   18-24: 10 personas (20%)
#   25-34: 15 personas (30%)
#   35-44: 12 personas (24%)
#   45-54: 8 personas  (16%)
#   55+  : 5 personas  (10%)
#
# Distribuição geográfica (concentração real PT):
#   Lisboa: 12 | Porto: 8 | Braga: 4 | Coimbra: 4 | Aveiro: 3 | Faro: 3
#   Setúbal: 3 | Leiria: 3 | Viseu: 3 | Funchal: 4 | Ponta Delgada: 3

PERSONAS = [
    # ── 18-24 ───────────────────────────────────────────────────────────────
    (1, "Mariana", "Silva", "marianamuse", 22, "Lisboa", "lisboa", "Arroios",
     "estudante de comunicação @ FCSH",
     "estatística vai ser a minha sentença ✦ cigarettes after sex on loop",
     "nenhum", "cafe", ["cinema","universidade","fotografia","musica"],
     "ironica_noite", 0.55, 0.65, 0.7, 0.25,
     "selfie no quarto, luz amarela do candeeiro IKEA, t-shirt larga do irmão, cabelo molhado pós-duche, espelho com pingos de água"),

    (2, "Tomás", "Almeida", "t_almeida", 21, "Porto", "norte", "Cedofeita",
     "estudante engenharia FEUP, faço uber eats à noite",
     "FEUP. uber eats. café da Mãe. nada mais.",
     "fcp", "cafe", ["futebol","gaming","tecnologia","universidade"],
     "estudante_porto", 0.4, 0.5, 0.55, 0.2,
     "selfie no patamar do prédio, capacete de scooter ao ombro, mochila uber eats laranja, luz do corredor"),

    (3, "Inês", "Costa", "inescosta_19", 19, "Coimbra", "centro", "Sé Nova",
     "1.º ano direito · escudeira a tempo inteiro",
     "queda das fitas, vinho da manga, lágrimas. três coisas que aprendi.",
     "scp", "festa", ["universidade","musica","cinema","futebol"],
     "estudante_caotica", 0.5, 0.7, 0.7, 0.3,
     "selfie de grupo de capa preta na escadaria da Sé Velha, rímel a escorrer, copo de vinho na mão"),

    (4, "Diogo", "Ferreira", "didiferreira", 23, "Braga", "norte", "São Vicente",
     "ESEnf · plantões à conta. sobrevivente.",
     "no turno da noite a beber máquina de café porreiro",
     "slb", "cafe", ["futebol","universidade","corrida","gaming"],
     "estudante_medicina", 0.35, 0.5, 0.5, 0.15,
     "selfie no espelho dos balneários do hospital, jaleca azul amarrotada, olheiras pesadas, luz fluorescente fria"),

    (5, "Beatriz", "Rocha", "bia.rocha", 24, "Lisboa", "lisboa", "Alvalade",
     "design de moda · ESAD · loja vintage Príncipe Real fim de semana",
     "obcecada com a década errada · vinis · botas usadas",
     "scp", "fado", ["cinema","fotografia","musica","cultura"],
     "fotografo_amador", 0.6, 0.6, 0.6, 0.2,
     "fotografia analógica scan, ela sentada no chão do atelier, lã pelo chão, óculos enormes, parede branca, granulada"),

    (6, "Rafael", "Pinto", "rafa.pinto", 20, "Setúbal", "lisboa", "São Sebastião",
     "estudante turismo + monitor de surf Costa da Caparica",
     "ondulação 1.5m / vento NE / vamos para a água",
     "nenhum", "praia", ["surf","fotografia","viagens","musica"],
     "surfista_chill", 0.4, 0.45, 0.5, 0.2,
     "fotografia de telemóvel pré-amanhecer, ele no parque de estacionamento da Caparica, sweat com capuz, prancha debaixo do braço, areia nos pés descalços"),

    (7, "Carolina", "Mendes", "carol_mendes_", 22, "Aveiro", "centro", "Glória",
     "ESTGA · marketing digital · três estágios não pagos no CV",
     "se mais um cliente disser 'fica giro mas pode mudar tudo' eu choro",
     "nenhum", "cafe", ["fotografia","tecnologia","musica","empreendedorismo"],
     "freelancer_design", 0.5, 0.6, 0.65, 0.25,
     "selfie ao espelho da casa de banho do co-work, MacBook na mão, café Delta na outra, luz natural pela janela"),

    (8, "Miguel", "Faria", "miguelfaria92_", 24, "Funchal", "madeira", "São Pedro",
     "guia turístico + estudante online",
     "feito aos turistas e à neblina · funchal · só.",
     "nenhum", "praia", ["caminhadas","fotografia","futebol","cinema"],
     "madeirense", 0.45, 0.5, 0.5, 0.15,
     "fotografia no miradouro do pico dos barcelos, ele de costas a olhar para a cidade, mochila pequena, vento na camisola"),

    (9, "Joana", "Pereira", "jojo.p", 21, "Ponta Delgada", "acores", "São Sebastião",
     "estudante UAc · biologia marinha. costas vivas.",
     "alga · cetáceo · neblina · café à beira-mar",
     "nenhum", "praia", ["surf","caminhadas","fotografia","musica"],
     "acoriana", 0.35, 0.5, 0.55, 0.2,
     "selfie de telemóvel na traseira do barco oceanográfico, casaco fluorescente, cabelo molhado, ondas, céu cinzento"),

    (10, "Pedro", "Oliveira", "pedrolv", 23, "Viseu", "centro", "Viseu",
     "técnico de informática · jogos · café às 3h",
     "Steam é família. trabalho? família tóxica.",
     "fcp", "tasca", ["gaming","tecnologia","cinema","series"],
     "gamer_pc", 0.5, 0.55, 0.6, 0.2,
     "selfie ao espelho do quarto, monitor 27' ao fundo com lobby do CS, hoodie cinza, luz roxa de LED de fundo"),

    # ── 25-34 ───────────────────────────────────────────────────────────────
    (11, "Sofia", "Marques", "sofia.marques", 27, "Lisboa", "lisboa", "Santa Maria Maior",
     "enfermeira urgência Sta Maria · cafezada profissional",
     "três cafés · um turno · zero arrependimentos.",
     "scp", "cafe", ["corrida","cinema","cafe","series"],
     "enfermeira_urgencia", 0.55, 0.55, 0.6, 0.2,
     "selfie máscara cirúrgica azul abaixo do queixo, cabelo apanhado, mancha de iodo na manga, luz fluorescente"),

    (12, "André", "Lopes", "andrelopes_pt", 29, "Porto", "norte", "Aldoar",
     "programador back-end na Critical · café da Manteigaria > tudo",
     "python > tudo, café > tudo o resto. discutível.",
     "fcp", "cafe", ["tecnologia","gaming","cinema","futebol"],
     "tech_dev", 0.5, 0.55, 0.55, 0.15,
     "selfie ao espelho da casa de banho do co-work UpTec, polo cinza, AirPods Pro, café Delta na bancada de mármore"),

    (13, "Catarina", "Antunes", "_cat_antunes", 31, "Braga", "norte", "São Vítor",
     "jornalista local · Diário do Minho · 7 anos de carteira",
     "tudo o que sei aprendi nas câmaras municipais. infelizmente.",
     "slb", "cafe", ["cinema","livros","cultura","cafe"],
     "jornalista_local", 0.55, 0.7, 0.7, 0.3,
     "selfie de braço estendido em assembleia municipal, casaco de ganga, bloco de notas físico, microfone em primeiro plano"),

    (14, "João", "Tavares", "joaotavares", 33, "Lisboa", "lisboa", "Penha de França",
     "freelancer designer · 2 gatos · 3 plantas mortas",
     "as plantas morrem porque dou-lhes amor. é o que dizem.",
     "scp", "cafe", ["cinema","tecnologia","series","fotografia"],
     "freelancer_design", 0.5, 0.55, 0.6, 0.2,
     "fotografia do gato preto a dormir no MacBook, secretária com pilha de Moleskines, copo Delta no fundo desfocado"),

    (15, "Rita", "Nunes", "rita.nunes.94", 30, "Coimbra", "centro", "São Martinho do Bispo",
     "professora 2.º ciclo · 30 alunos · 0 paciência depois das 16h",
     "português + português + portugueses. amo o meu trabalho. juro.",
     "scp", "cultura", ["livros","cinema","cultura","jardinagem"],
     "professor_secund", 0.4, 0.55, 0.55, 0.2,
     "selfie ao espelho da sala de professores, blazer cinza, óculos quadrados, pilha de testes ao fundo, luz fria de manhã"),

    (16, "Ricardo", "Sousa", "rsousa_pt", 28, "Setúbal", "lisboa", "Setúbal",
     "engenheiro civil obra · botas com cimento · F1 ao domingo",
     "obra > café > obra. ciclo perfeito.",
     "slb", "tasca", ["futebol","motas","gaming","series"],
     "empresario_pme", 0.4, 0.5, 0.5, 0.15,
     "selfie no estaleiro, capacete amarelo desafivelado, colete refletor, sol contra a câmara"),

    (17, "Margarida", "Cunha", "mguidacunha", 26, "Lisboa", "lisboa", "Estrela",
     "arquiteta jovem · 1.º ano de gabinete · sem fins de semana",
     "AutoCAD à madrugada e café da Graça. simples.",
     "nenhum", "cafe", ["arquitetura","cinema","fotografia","cafe"],
     "arquiteta_jovem", 0.5, 0.55, 0.6, 0.2,
     "selfie no atelier, mesa coberta de sketches, régua escalimétrica, café num copo de papel, óculos redondos"),

    (18, "Filipe", "Carvalho", "filipecarvalho", 32, "Aveiro", "centro", "Vera Cruz",
     "técnico Bosch · ciclismo amador · 3 km a pé até ao trabalho",
     "subo a serra de aire por castigo voluntário",
     "fcp", "cafe", ["corrida","caminhadas","gaming","cafe"],
     "tech_dev", 0.4, 0.5, 0.5, 0.15,
     "fotografia bicicleta encostada a muro caiado, paisagem dunar de S. Jacinto ao fundo, vento, luz fria"),

    (19, "Ana", "Reis", "anareisxx", 29, "Funchal", "madeira", "Santa Luzia",
     "técnica de farmácia · mãe da Matilde (4 anos)",
     "matilde acordou às 5:30. dormi 3h. é o que é.",
     "nenhum", "cafe", ["familia","cinema","series","livros"],
     "mae_cansada", 0.45, 0.55, 0.55, 0.2,
     "selfie no carro estacionado, filha ao colo a dormir, ela de óculos escuros, sol contra-luz pelo para-brisas"),

    (20, "Hugo", "Ribeiro", "hugogadfly", 34, "Porto", "norte", "Bonfim",
     "músico (baixista) + barman no Plano B · 4h por noite a dormir",
     "Bonfim 04:23. ainda há mosca. ainda há cerveja.",
     "fcp", "tasca", ["musica","cinema","cafe","series"],
     "musico_local", 0.55, 0.6, 0.65, 0.25,
     "fotografia analógica granulada, ele atrás da barra do Plano B, contra-luz da garrafeira amarela, t-shirt preta surrada"),

    (21, "Daniela", "Gonçalves", "dani.g_", 27, "Faro", "algarve", "Sé",
     "técnica social RAA · gosta do mar de Outubro · café Pingo Doce",
     "vivo aqui o ano todo. vocês só vêm em agosto. é diferente.",
     "nenhum", "praia", ["caminhadas","cinema","livros","fotografia"],
     "algarvio_inverno", 0.4, 0.55, 0.55, 0.2,
     "fotografia em praia do garrão, areia, vento na camisola de gola alta, ela de pernas cruzadas, lata de sumo Compal vazia"),

    (22, "Bruno", "Magalhães", "brunomag", 31, "Braga", "norte", "Maximinos",
     "comercial autopeças · adepto Sp. Braga · 80mil km/ano",
     "Hyundai i30. 80 mil km. uma alma.",
     "outro", "tasca", ["futebol","motas","cafe","series"],
     "empresario_pme", 0.4, 0.55, 0.55, 0.15,
     "selfie de telemóvel dentro do carro, fato pré-amassado, gravata afrouxada, parque de bombas Galp ao fundo"),

    (23, "Beatriz", "Lima", "beatrizlima_", 26, "Lisboa", "lisboa", "Marvila",
     "produtora cultural · LX Factory · só janta às 22h",
     "exposições · pizzas a meio do mês · prazos sempre.",
     "scp", "cultura", ["cinema","cultura","musica","fotografia"],
     "artista_visual", 0.6, 0.65, 0.65, 0.25,
     "selfie de fim de noite no carro Uber, batom escorrido, blazer preto, cabelo despenteado, luz neon laranja do exterior"),

    (24, "Tiago", "Vieira", "tvieira88", 36, "Leiria", "centro", "Pousos",
     "engenheiro mecânico · pai do Martim · runner amador",
     "Martim 2 anos. eu 36. sinto-me 70.",
     "fcp", "futebol", ["futebol","corrida","caminhadas","familia"],
     "pai_cansado", 0.45, 0.6, 0.55, 0.2,
     "selfie no quintal de casa, ele de calções e t-shirt suada após corrida, filho ao colo a dormir, sol da manhã"),

    (25, "Marta", "Ramos", "martaramos.94", 30, "Coimbra", "centro", "Almedina",
     "investigadora pós-doc biologia · UC · escreve papers · adora o Mondego",
     "PhD em ecologia. ainda não consegui matar o cacto.",
     "scp", "cultura", ["caminhadas","livros","cinema","jardinagem"],
     "professor_secund", 0.4, 0.55, 0.55, 0.15,
     "selfie na sebenta do laboratório, óculos protetores na cabeça, jaleca branca, microscópio ao fundo"),

    # ── 35-44 ───────────────────────────────────────────────────────────────
    (26, "Paulo", "Santos", "paulopt", 38, "Lisboa", "lisboa", "Olivais",
     "motorista Carris 758 · 22 anos ao volante",
     "758 às 7:14. todos os dias. há 22 anos. é amor por castigo.",
     "slb", "tasca", ["futebol","cafe","motas","familia"],
     "motorista_carris", 0.45, 0.55, 0.55, 0.15,
     "selfie no autocarro vazio antes de começar o turno, painel iluminado, sol nascente pelo para-brisas, casaco azul Carris"),

    (27, "Cláudia", "Henriques", "claudia.h_", 41, "Porto", "norte", "Paranhos",
     "professora secundária Filosofia · 2 filhos · vinho ao jantar",
     "três crianças. duas minhas. um divórcio. um cão.",
     "fcp", "cultura", ["livros","cinema","familia","cultura"],
     "mae_cansada", 0.5, 0.65, 0.65, 0.25,
     "selfie cozinha de manhã, cabelo apanhado mal, cafeteira italiana ao lume, criança ao fundo a chorar"),

    (28, "Nuno", "Coelho", "nunocoelho_x", 37, "Lisboa", "lisboa", "Beato",
     "co-founder startup HR-tech · 9 anos · ainda não tira férias",
     "vamos lançar a v3 em março. é o que digo desde dezembro.",
     "scp", "cafe", ["empreendedorismo","tecnologia","cinema","cafe"],
     "empreendedor", 0.55, 0.6, 0.55, 0.25,
     "selfie no Hub Criativo do Beato, sweat preta, Apple Watch, café no copo de cartão, mesas comunitárias ao fundo"),

    (29, "Helena", "Batista", "helenabp", 43, "Setúbal", "lisboa", "São Sebastião",
     "vendedora El Corte Inglés · mãe da Beatriz (16)",
     "comissões em janeiro, ar à descoberta em julho. é o ciclo.",
     "scp", "cafe", ["cinema","series","cafe","familia"],
     "vendedora_loja", 0.4, 0.55, 0.55, 0.15,
     "selfie ao espelho do balneário do trabalho, fardamento preto, batom vermelho, óculos na cabeça, expressão neutra"),

    (30, "Vasco", "Moreira", "vascomoreira", 39, "Braga", "norte", "São Victor",
     "empresário de loja de móveis · negócio dos pais · adora pesca",
     "loja de móveis há 15 anos. clientes a dizer 'já volto'. ainda espero.",
     "outro", "pesca", ["pesca","futebol","motas","tasca"],
     "empresario_pme", 0.4, 0.5, 0.5, 0.15,
     "fotografia barco de pesca de manhã cedo na ria, ele com casaco impermeável amarelo, cana de pesca, sol baixo"),

    (31, "Susana", "Fonseca", "su_fonseca", 36, "Faro", "algarve", "Conceição",
     "cozinheira em restaurante familiar · pão fermentação natural",
     "pão sem glúten, vão pedir os clientes. nem em sonhos.",
     "scp", "tasca", ["culinaria","familia","cafe","series"],
     "cozinheira_caseira", 0.5, 0.6, 0.6, 0.2,
     "fotografia na cozinha, mãos com farinha, tatuagem de andorinha no antebraço, blusa preta, balcão de mármore"),

    (32, "Carlos", "Ferreira", "carlosfer1980", 44, "Aveiro", "centro", "Esgueira",
     "técnico Bosch · pai da Joana e do Salvador · corredor de meias maratonas",
     "filhos · meia maratona · Bosch · ciclo eterno.",
     "fcp", "futebol", ["corrida","futebol","familia","gaming"],
     "pai_cansado", 0.4, 0.55, 0.5, 0.15,
     "selfie pós-corrida, dorsal 1247 ao peito, suor, fundo: meta meia maratona Aveiro, copo de água na mão"),

    (33, "Alice", "Esteves", "alice.esteves", 42, "Coimbra", "centro", "Sé Nova",
     "advogada · mãe de gémeos · runner",
     "gémeos de 8. dois clientes difíceis. ginásio às 6h. sou feliz.",
     "scp", "cultura", ["corrida","livros","cinema","familia"],
     "mae_trabalhadora", 0.45, 0.55, 0.55, 0.2,
     "selfie depois do ginásio, top desportivo, cabelo apanhado, garrafa de água Luso, espelho com gotas"),

    (34, "Luís", "Pacheco", "luispacheco", 40, "Viseu", "centro", "Coração de Jesus",
     "comercial vinhos do Dão · provador certificado · pai do Salvador (10)",
     "Dão. só Dão. sempre Dão.",
     "fcp", "tasca", ["culinaria","caminhadas","livros","familia"],
     "empresario_pme", 0.45, 0.55, 0.55, 0.2,
     "fotografia adega, copo de tinto contra-luz na vela, ele de fato escuro, pormenor da rolha em primeiro plano"),

    (35, "Patrícia", "Loureiro", "patpatpat", 38, "Funchal", "madeira", "Imaculado Coração de Maria",
     "técnica administrativa hospital · 2 cães · solteira",
     "dois rafeiros, um sofá. fim de semana planeado.",
     "nenhum", "praia", ["caminhadas","cinema","series","fotografia"],
     "madeirense", 0.4, 0.5, 0.55, 0.2,
     "fotografia dos dois rafeiros ao colo no sofá bege, ela de pijama, café numa caneca quase a cair"),

    (36, "Joaquim", "Salgado", "joaquim.salgado", 44, "Ponta Delgada", "acores", "Fajã de Cima",
     "pescador local · ilha de São Miguel · 25 anos no mar",
     "pesca à linha. 25 anos. o oceano respeita quem sabe esperar.",
     "outro", "pesca", ["pesca","familia","caminhadas","futebol"],
     "pesca_recreativa", 0.3, 0.45, 0.5, 0.15,
     "fotografia ao amanhecer no barco de pesca, ele com pelica impermeável, sardinha na mão, mar revolto"),

    (37, "Fernanda", "Brito", "fbrito70", 42, "Leiria", "centro", "Marrazes",
     "técnica seguros · adora jardinagem · tomates cherry na varanda",
     "tomates cherry · varanda · vizinha invejosa. equilíbrio.",
     "scp", "cafe", ["jardinagem","cinema","series","familia"],
     "jardineiro_amador", 0.45, 0.6, 0.6, 0.2,
     "fotografia da varanda, vasos de tomateiros, regador de plástico verde, mãos com terra, manhã"),

    # ── 45-54 ───────────────────────────────────────────────────────────────
    (38, "Manuel", "Cardoso", "manel.cardoso", 51, "Lisboa", "lisboa", "Graça",
     "taxista 23 anos · adora Sporting · café Brasileira ao meio-dia",
     "Sporting · café da Brasileira · meu táxi. 3 amores.",
     "scp", "tasca", ["futebol","cafe","motas","tasca"],
     "taxista_porto", 0.5, 0.6, 0.6, 0.2,
     "selfie dentro do táxi parado no Marquês, camisa branca aberta, óculos escuros, taxímetro a ler 8,50€"),

    (39, "Isabel", "Castro", "isabelcastro", 49, "Porto", "norte", "Foz do Douro",
     "professora aposentada · dá explicações · 3 netos",
     "professora reformada. dou explicações por amor. mentira: por dinheiro.",
     "fcp", "cultura", ["livros","cinema","familia","jardinagem"],
     "reformada_porto", 0.4, 0.65, 0.65, 0.2,
     "selfie em casa, sala com móveis dos anos 80, mesa com livros didáticos abertos, neto a fazer desenho ao lado"),

    (40, "Rui", "Ascensão", "rui.ascensao", 47, "Setúbal", "lisboa", "Azeitão",
     "veterinário rural · 4 cães e 7 gatos · adora pesca",
     "veterinário rural. pacientes a pagar com vinho do Moscatel. negócio.",
     "scp", "tasca", ["pesca","familia","tasca","series"],
     "pesca_recreativa", 0.4, 0.55, 0.6, 0.2,
     "fotografia ele a tratar bezerro no estábulo, jaleca azul, luvas pretas, sol pela porta aberta"),

    (41, "Cristina", "Vidal", "cristinavidal_", 46, "Braga", "norte", "São José de São Lázaro",
     "técnica RH numa têxtil · 22 anos na mesma empresa · pai dela faleceu este ano",
     "23 anos na têxtil. desisti de discutir com a chefia.",
     "outro", "cafe", ["livros","cinema","series","familia"],
     "vendedora_loja", 0.35, 0.55, 0.55, 0.15,
     "selfie no escritório da empresa, cabelo curto, fardamento branco da empresa, papel A4 atrás cheio de notas"),

    (42, "Vítor", "Marinho", "vitor.marinho", 48, "Aveiro", "centro", "Vera Cruz",
     "professor de educação física secundária · 25 anos · ainda joga 5x5",
     "5x5 às quartas. perco para miúdos. teimoso.",
     "fcp", "futebol", ["futebol","corrida","caminhadas","cinema"],
     "professor_secund", 0.4, 0.5, 0.5, 0.15,
     "selfie ao lado do balneário da escola, fato de treino azul-marinho, suor, óculos esquecidos no cabelo"),

    (43, "Lúcia", "Tavares", "lucia.tavares", 45, "Faro", "algarve", "São Pedro",
     "agente imobiliária · divorciada · começou a fazer hot yoga",
     "divorciei aos 44. hot yoga aos 45. nasceu uma mulher nova.",
     "nenhum", "praia", ["caminhadas","cinema","livros","cultura"],
     "divorciada_45", 0.5, 0.6, 0.6, 0.25,
     "selfie ao espelho do estúdio de yoga, top e leggings pretos, tapete enrolado, pés descalços"),

    (44, "Mário", "Sequeira", "mariosequeira", 53, "Leiria", "centro", "Leiria",
     "técnico da EDP · 30 anos · pai casado, 2 filhos crescidos",
     "30 anos na EDP. tenho histórias de cortes que vocês não acreditam.",
     "slb", "tasca", ["motas","pesca","futebol","cafe"],
     "mecanico_terra", 0.35, 0.5, 0.5, 0.15,
     "selfie de capacete EDP, colete refletor, mão suja, poste elétrico ao fundo, sol baixo"),

    (45, "Conceição", "Brandão", "conceicaobrandao", 52, "Coimbra", "centro", "Almedina",
     "livreira no centro · 28 anos no Diário de Coimbra antes · gosta de gatos",
     "passei do Diário de Coimbra para a livraria. desci no salário, subi na vida.",
     "scp", "cultura", ["livros","cinema","cultura","familia"],
     "livreira", 0.4, 0.65, 0.65, 0.2,
     "fotografia dentro da livraria, ela sentada num banco, livro na mão, prateleiras altas atrás, luz quente"),

    # ── 55+ ─────────────────────────────────────────────────────────────────
    (46, "Joaquim", "Pires", "jpires55", 62, "Lisboa", "lisboa", "Areeiro",
     "reformado da CGD · viúvo · 2 filhos · 4 netos",
     "reformei-me da Caixa em 2022. 40 anos. tenho saudades. as vezes.",
     "slb", "tasca", ["futebol","cafe","jardinagem","familia"],
     "velhote_lisboa", 0.35, 0.65, 0.65, 0.15,
     "selfie no café da esquina, camisa de manga curta, chapéu de palha, cup de café no balcão, jornal Record desdobrado"),

    (47, "Maria", "Almeida", "maria.almeida.55", 64, "Porto", "norte", "Vitória",
     "reformada · costureira durante 38 anos · 6 netos",
     "costureira reformada. 38 anos. ainda arranjo bainhas para a vizinhança.",
     "fcp", "cultura", ["familia","cinema","jardinagem","cafe"],
     "reformada_porto", 0.4, 0.65, 0.65, 0.2,
     "selfie em casa, sala com tapeçaria, máquina de costura Singer ao fundo, óculos na ponta do nariz, sorriso pequeno"),

    (48, "Henrique", "Vaz", "henriquevaz", 67, "Funchal", "madeira", "Monte",
     "reformado · ex-funcionário hotel · cultiva couves no Monte",
     "trabalhei 41 anos em hotel. agora cultivo couves. continuo sem dormir.",
     "outro", "tasca", ["jardinagem","pesca","familia","caminhadas"],
     "reformado_aldeia", 0.3, 0.55, 0.55, 0.1,
     "fotografia ele de boina, mãos com terra, varanda de pedra do Monte, couves enormes em primeiro plano"),

    (49, "Antónia", "Borges", "toniaborges", 58, "Viseu", "centro", "Viseu",
     "psicóloga clínica · 30 anos de prática · viúva há 5",
     "psicóloga há 30 anos. desisti de aconselhar familiares.",
     "scp", "cultura", ["livros","cinema","cultura","caminhadas"],
     "divorciada_45", 0.45, 0.6, 0.65, 0.2,
     "selfie em consultório, paredes brancas, estante com livros de psicanálise, cadeira de couro castanha, luz natural"),

    (50, "Augusto", "Marques", "augustomar", 71, "Ponta Delgada", "acores", "Lagoa",
     "reformado · ex-marinheiro · ainda pesca à linha aos sábados",
     "atlantico inteiro. 45 anos. ainda lhe tenho medo.",
     "outro", "pesca", ["pesca","familia","caminhadas","tasca"],
     "reformado_aldeia", 0.25, 0.5, 0.55, 0.1,
     "fotografia ele de boina e camisola de algodão grosso azul, cana ao lado, oceano cinza-azul ao fundo, vento"),
]

# ════════════════════════════════════════════════════════════════════════════
# VOICES — bibliotecas de posts por voz/temperamento
# Cada voz tem 6-12 fragmentos crus. O seeder distribui-os pelos posters
# com a voz correspondente + adapta variações.
# Marcações: $cidade $time $hashtag $bairro são substituídos pelo seeder
# para criar variação sem perder voz.
# ════════════════════════════════════════════════════════════════════════════

VOICES = {
    "ironica_noite": [
        "três da manhã. acordada. obrigada cérebro.",
        "spotify wrapped disse-me coisas que eu nao queria saber sobre mim este ano",
        "tinder em 2026 é como vasculhar a feira da ladra à procura do amor da tua vida",
        "esta semana atualizei 4 apps e nenhuma estava melhor depois",
        "hoje pus 2 alarmes e mesmo assim cheguei tarde. é um talento.",
        "fui ao supermercado fazer uma coisa e voltei com seis. clássico.",
        "ninguém me avisou que ser adulta era 90% da vida a abrir a app do banco e a fechar logo a seguir",
        "se eu fosse rica comprava-me umas auriculares que cancelam a minha mãe",
        "às vezes só quero ir para casa. mas estou em casa. essa é a parte gira.",
        "agora sou eu a ter de mandar atestados médicos a alguém. envelheci.",
    ],
    "cansada_honesta": [
        "fim de turno. cheiro a álcool em gel. já não distingo as horas.",
        "almoço hoje: pastel de bacalhau requentado da máquina. é o que há.",
        "fiz contas. trabalho em fevereiro para pagar o IRS de março. faz sentido?",
        "expressão favorita da minha chefe: 'fica giro mas vamos pensar melhor'. é só pensar.",
        "alguém me explica porque é que a máquina de café da empresa só funciona quando vai o técnico",
        "três cafés. um turno. zero arrependimentos.",
        "saí às 22h. cheguei a casa às 23h15. carris 758 estava cheio outra vez.",
        "hoje tive 12h de trabalho e 0 paciência. troca justa.",
    ],
    "pai_cansado": [
        "o miúdo dorme 3 horas seguidas e eu sinto-me um deus.",
        "fralda número 4 hoje. não conto mais.",
        "encontrei uma chupeta no bolso do casaco da reunião de pais. já não me ralo.",
        "as 8h vão demorar até as 17h. e as 17h vão chegar de repente.",
        "filho 2 anos. eu 36. sinto-me 70. matemática estranha.",
        "domingo planeado: lego, papas, lego, papas, lego.",
        "miúda pediu ipad às 6h. negociei até às 6h05. perdi.",
    ],
    "mae_cansada": [
        "matilde acordou às 5:30. dormi 3h. é o que é.",
        "lavar roupa branca, roupa de cor, roupa colorida, roupa preta. cada uma com a sua personalidade.",
        "perdi a paciência ao fim de 3 minutos no IKEA. recorde pessoal.",
        "fui à reunião de pais. vim de lá com 4 tarefas e 0 respostas.",
        "café desta manhã: três goles, depois esfriou. crónica de uma mãe.",
        "hoje a filha disse 'a mãe é a minha melhor amiga'. e logo a seguir 'só durante o jantar'.",
    ],
    "estudante_caotica": [
        "tenho 4 cadeiras e zero estratégia",
        "encontro de antigos colegas → 'então o que estás a fazer?' → falo durante 8 segundos antes de mudar de assunto",
        "queda das fitas hoje. vinho da manga, lágrimas. boa terça-feira.",
        "três cafés da máquina e o vento da serra. é o suficiente.",
        "às vezes acho que estudo. depois lembro-me que não.",
        "FCSH 18h biblioteca cheia. a hora portuguesa.",
    ],
    "surfista_chill": [
        "ondulação 1.5m. vento NE. café e vamos.",
        "água a 15°. não me digam para ir trabalhar.",
        "sunset na caparica. nada bate isto.",
        "perdeste a hora aqui esta manhã. um surreal.",
        "praia vazia em fevereiro. melhor segredo do país.",
    ],
    "sportinguista": [
        "outro empate. previsível.",
        "amorim era nosso e tivemos a coragem de o deixar ir. genialidade.",
        "tinto e jogo do Sporting. fim de semana resolvido.",
        "se o Pote acerta ao quarto poste, não estou aqui a falar com ninguém.",
        "para sportinguista é treino. nasce-se, aprende-se a sofrer, e segue-se.",
    ],
    "benfiquista": [
        "águia velha sempre. 38 títulos não se esquecem.",
        "estádio cheio outra vez. luz vermelha.",
        "amanhã tenho viagem mas amanhã também tenho jogo. logo se vê.",
        "filho a aprender a dizer 'glorioso' antes de 'mamã'. faço bem o meu trabalho.",
    ],
    "portista": [
        "Pinto da Costa para sempre. ponto.",
        "dragões eternos. é assim.",
        "Cávado a transbordar outra vez. e o resto da gente?",
        "porto não é apenas uma cidade. é uma certeza.",
    ],
    "empreendedor": [
        "v3 vai sair em março. é o que digo desde dezembro.",
        "outro pitch deck. outro café. outras 4 horas de sono.",
        "ronda series A fechada. champanhe? não, vamos trabalhar.",
        "quando o investidor diz 'come back in 6 months' = 'queremos passar'",
        "8º produto-market-fit que tento. desta vez é diferente.",
    ],
    "freelancer_design": [
        "cliente: 'pode ficar mais alegre?'. eu: define alegre.",
        "este briefing tem 4 linhas. e 17 referências do pinterest.",
        "rejeitei o quinto cliente este mês por causa de prazos impossíveis. orgulho? medo? sei lá.",
        "o cliente quer um pop. pop como em 'pop art' ou pop como em 'pop-tarts'?",
        "AirPods ON. mundo OFF. produtividade ON.",
    ],
    "tech_dev": [
        "três horas a debugar para descobrir que era um espaço a mais.",
        "passei a tarde a tentar perceber porque é que o cliente não consegue clicar no botão. consegue. o problema é querer clicar.",
        "café Delta da Manteigaria é diferente. discutível, mas é.",
        "vim para o co-work para me concentrar. agora levo 2h a conversar.",
        "se a Tabnine sugerir mais uma vez vou usá-la só por desespero.",
    ],
    "jornalista_local": [
        "câmara municipal hoje: 7 pessoas a discutirem placas de WC durante 40 minutos. democracia.",
        "deita esse parágrafo. não merece a manchete.",
        "outra agenda perdida em festa popular. dois anos no jornal e ainda não aprendi.",
        "PSD/CDS coligação. surpresa zero.",
        "fim de semana em festas locais. sabes, jornalista de bairro.",
    ],
    "reformado_aldeia": [
        "couves estão a engordar bem este ano. chuva ajudou.",
        "passei a manhã no quintal. nao trocava por nada.",
        "vejo o telejornal e desligo. já não vale a pena.",
        "vizinha emprestou-me ovos. ovos da galinha dela. sabem diferentes.",
        "o gato deita-se em cima do jornal sempre que quero ler. ele sabe.",
    ],
    "velhote_lisboa": [
        "café à tarde na Brasileira como há 30 anos.",
        "antes pagava 30 escudos. hoje 1,50€. faz a conta.",
        "vejo o jornal. mais um sucesso da nossa governação. ó pá.",
        "o miúdo do café cortou o cabelo. ainda lhe estranho.",
        "ontem fui ao Marquês. estava igual há 40 anos. menos.",
    ],
    "cozinheira_caseira": [
        "Bacalhau à Brás hoje. receita da minha avó.",
        "mercado às 8h vale por todo o dia.",
        "compras no Continente: 6 ovos, 1 alho, 14 coisas que nao precisava.",
        "fim de semana = caldeirada. é lei.",
        "o pão de centeio do alentejo. nao ha igual.",
    ],
    "estudante_porto": [
        "Cedofeita às 23h. ainda há gente. ainda há vinho.",
        "Bonfim 04:23 ainda há mosca",
        "FEUP a esta hora é um lugar triste",
        "Café Piolho. não tenho energia para explicar.",
        "Ribeira hoje cheia de turistas. nostalgia da Ribeira sem ninguém.",
    ],
    "acoriana": [
        "neblina há 3 dias. é a personalidade da ilha.",
        "café Mascote ao pequeno-almoço. infalível.",
        "lagoa do fogo hoje. azul que não se acredita.",
        "saí da loja, chovia. entrei no carro, sol. atravessei o pontal, granizo. SMG resumo.",
        "cetáceos ao largo. dia bom.",
    ],
    "madeirense": [
        "monte de manhã. funicular não. caminhei.",
        "neblina baixa hoje. típico.",
        "espetada de carne na pedra hoje. domingo.",
        "miradouro do Pico dos Barcelos vazio hoje. raro.",
        "Levada do Norte. três horas a pé. valeu cada passo.",
    ],
    "algarvio_inverno": [
        "praia em fevereiro. só os locais. assim queremos.",
        "ria formosa vazia. cinco aves migratórias e eu.",
        "agosto vou de férias. para a serra. fugir do barulho.",
        "Vilamoura em fevereiro tem só portugueses. é diferente.",
    ],
    "alentejano_calmo": [
        "Évora ao fim da tarde. silêncio é a melhor música.",
        "vinho tinto da Borba. dia bom.",
        "Cromeleque dos Almendres ao nascer do sol. ninguém.",
    ],
    "fan_cinema": [
        "vi 'After Sun' outra vez. mesmo tomar conta de mim mesma.",
        "Almodóvar entrega sempre. trist e bonito.",
        "Saramago já dizia: cuidado com os filmes franceses.",
        "Manoel de Oliveira faz-me bem. lentidão como religião.",
    ],
    "livreira": [
        "livro de Saramago hoje. relido para a 7.ª vez.",
        "FNAC tem desconto. recomendo para o último romance da Cláudia Lucas Chéu.",
        "sebenta da Almedina cheira a infância.",
        "Pessoa, em poesia: 'tudo vale a pena se a alma não é pequena'. sempre.",
    ],
    "cafe_pasteleiro": [
        "primeira fornada às 5h30. cliente regular já à espera.",
        "pastel a 1,50€ agora. antes 1,20€. é o que é.",
        "comprei farinha portuguesa. queijinho fresco. fim de semana resolvido.",
    ],
    "mae_trabalhadora": [
        "manhã = caos. dois filhos. tinto à noite. equilíbrio.",
        "reunião no Zoom com a câmara desligada. dei banho ao filho. coisas que ninguém precisa de saber.",
        "café à pressa. é o que é.",
    ],
    "professor_secund": [
        "30 alunos. 0 paciência depois das 16h.",
        "testes para corrigir. já chegamos a sexta-feira.",
        "explicar 'a tabuada' a um adolescente de 15 anos. quem disse que a vida era fácil?",
        "RTP3 ligada em casa. companhia de fundo.",
    ],
    "enfermeira_urgencia": [
        "turno duplo. cafezinho a 3€ na máquina. quem precisa de dormir?",
        "ontem 47 entradas no SU. perdi a conta às horas.",
        "doente educado. raro. agradeci.",
    ],
    "motorista_carris": [
        "758 às 7:14. todos os dias. há 22 anos.",
        "turistas a perguntar a hora do autocarro 28. ainda não cheguei à reforma.",
        "trânsito hoje no Saldanha. surpresa.",
        "ar condicionado avariado de novo. agosto vai ser cómico.",
    ],
    "vendedora_loja": [
        "domingo de saldos. clientes a tirar a paciência. tudo normal.",
        "comissões em janeiro. ar à descoberta em julho. é o ciclo.",
    ],
    "programador_remoto": [
        "stack overflow é a minha segunda família.",
        "café especialty Quinta da Manteigaria. é diferente. ou sou eu.",
        "trabalhar de casa: dois gatos a ajudar.",
    ],
    "artista_visual": [
        "exposição amanhã. 18h. Lx Factory. estado emocional: 7 cafés.",
        "ninguém me prepara para um vernissage. nunca.",
        "outro projeto rejeitado pela DGArtes. mais um.",
    ],
    "musico_local": [
        "bar fechou ao 4h. fui a pé. Bonfim 05:00.",
        "Plano B noite cheia. cerveja a 2,50€.",
        "ensaio amanhã às 11h. dormir? Quem?",
        "novo single no spotify. 47 streams. três da minha mãe.",
    ],
    "empresario_pme": [
        "fornecedor a meter desculpas. tudo a tempo, ele diz.",
        "IVA do trimestre. já cá canta.",
        "loja aberta 6 dias por semana há 15 anos. ainda preciso de explicar?",
    ],
    "jovem_emigrante": [
        "Berlim hoje -3º. cá em Lisboa? não sei. quero saber? sim.",
        "natal sem família outra vez. quem disse que doía a primeira vez nunca emigrou de verdade.",
        "vou ao supermercado e procuro Compal. nada.",
    ],
    "estudante_erasmus": [
        "Itália hoje 22°. inverno mesmo gentil.",
        "tentei explicar à colega italiana o que é pastel de nata. ela viu fotos. ainda não percebeu.",
        "fim de erasmus em maio. e depois?",
    ],
    "pesca_recreativa": [
        "barco às 5h. mar revolto. fica para outro dia.",
        "linha. cana. silêncio. essencial.",
        "robalo pescado ontem. assado no sal. fim de semana resolvido.",
    ],
    "caminheira_norte": [
        "Gerês hoje 4 horas a pé. compensa.",
        "trilho dos sete vales. compensa cada passo. e cada bolha.",
        "botas novas. dois dias para amaciar.",
    ],
    "jardineiro_amador": [
        "tomate cherry da varanda. agora sim. fevereiro!",
        "as plantas morrem porque dou-lhes amor. é o que dizem.",
        "vizinho do 3.º andar comentou as minhas plantas. orgulho!",
        "manjericão a brotar. esperança nova.",
    ],
    "gamer_pc": [
        "Steam: 247 jogos. jogados: 12. é um luxo.",
        "internet caiu durante competição. CGD agradece-me a paciência.",
        "café às 2h. partidas até às 4h. é a vida.",
    ],
    "fotografo_amador": [
        "primeira foto com Mamiya RB67. demorei 6 meses a juntar coragem.",
        "rolinho TX 35mm revelado hoje. acho que perdi metade.",
        "lisboa de manhã cedo. ninguém. é quando ela é mais bonita.",
    ],
    "mecanico_terra": [
        "30 anos a fazer cortes. tenho histórias que vocês não acreditam.",
        "óleo nas mãos. cheira a trabalho.",
        "novo poste no posto da Galp. trabalho na chuva.",
    ],
    "taxista_porto": [
        "rua Católica ontem fechada. desviou-me 20 minutos.",
        "passageira a dormir no banco de trás. já cá canta.",
        "Marquês hoje cheio às 18h. surpresa.",
        "café da Brasileira ao meio-dia. tradição que não muda.",
    ],
    "jovem_pai_lisboa": [
        "bebé acordou às 4h. eu acordei às 4h e 5 minutos. competição.",
        "fraldas a 0,18€ cada. faço contas a noite inteira.",
        "passou a primeira semana de creche. sobrevivi. ele também.",
    ],
    "noiva_25": [
        "casamento em junho. orçamento em pânico.",
        "fui ao IKEA escolher cortinas. saí com 7 plantas. clássico.",
        "lista de convidados: 130. tio segundo da minha avó eliminado.",
    ],
    "divorciada_45": [
        "divorciei aos 44. hot yoga aos 45. uma mulher nova.",
        "casa só minha. silêncio. café sozinha às 8h. lindo.",
        "tinder aos 45. uma viagem.",
    ],
    "reformada_porto": [
        "netos a almoçar. cozinha cheia. coração cheio.",
        "missa às 9h aos domingos. tradição.",
        "vejo as novelas da SIC. é uma péssima companhia. mas é companhia.",
    ],
    "hipster_caixa": [
        "vinil novo. Lula Pena. perfeito para café da manhã.",
        "alfama em fevereiro. sem turistas. ouro.",
        "craft beer a 4€ no bar do Largo. é caro mas vale.",
    ],
    "imigrante_lisboa": [
        "saudades do açaí. ninguém aqui entende açaí. eu desisti.",
        "trabalhar em Portugal: salário menor, mas qualidade de vida real. eu fico.",
        "português europeu tem 'isso aí' em forma de 'ya'. levei meses a perceber.",
    ],
    "estudante_medicina": [
        "ECG normal. sinto-me orgulhosa.",
        "exame de fisiologia em duas semanas. preparada? não.",
        "no hospital às 7h. saí às 19h. café? três.",
    ],
    "voluntaria_animal": [
        "12 gatos no abrigo. vou começar a ouvir nomes deles em sonhos.",
        "adoção de domingo. duas famílias maravilhosas. três que não passaram do entrevistador.",
        "esterilização gratuita amanhã. divulguem.",
    ],
    "arquiteta_jovem": [
        "autoCAD às 23h. classico.",
        "no atelier ouvi 'simplifica' 14 vezes. já me agarrei à régua.",
        "café da Graça é melhor que o do escritório. discutível, mas é.",
    ],
}

# ════════════════════════════════════════════════════════════════════════════
# COMMENT FRAGMENTS — reações humanas curtas por tipo
# O seeder mistura por contexto + voz da pessoa que comenta.
# ════════════════════════════════════════════════════════════════════════════

COMMENTS = {
    "agree": [
        "exatamente isto.",
        "também penso isto há anos.",
        "tal e qual aqui em casa.",
        "isto isto.",
        "exatamente. sentes-te como eu.",
        "agora és tu a falar.",
        "já estou farta de explicar isto a quem nao entende",
        "perfeitamente dito.",
        "eu não conseguia explicar tão bem.",
        "eu pensava que era só eu. ainda bem que não.",
    ],
    "disagree": [
        "discordo completamente. mas tudo bem.",
        "não me parece. mas cada um.",
        "uhm. não sei.",
        "não concordo. já te explico depois.",
        "tens razão em partes. mas tens de ver o outro lado.",
        "eu vejo de outra forma. mas respeito.",
    ],
    "joke": [
        "morri. literalmente.",
        "kkk",
        "ai pá. já não consigo respirar.",
        "isto é demais.",
        "outra vez tu? deixa-me em paz.",
        "ainda bem que escreveste isto. eu pensei e nao tinha coragem.",
        "perfeito. mesmo o que eu precisava.",
        "fiz-te capturas de ecrã. para o grupo.",
    ],
    "question": [
        "onde foi isto?",
        "que estabelecimento é esse?",
        "tens a referência?",
        "podes contar mais?",
        "quanto custou?",
        "achas que vale a pena lá ir?",
        "como é que descobriste?",
        "ainda há tempo de me incluir?",
        "qual é a marca?",
    ],
    "follow_up": [
        "no fim de semana digo-te.",
        "vou tentar amanhã.",
        "vai a guardado.",
        "obrigada pela dica. vou ver.",
        "espero por ti.",
        "depois conto-te.",
        "ok ok ok dou nota mental.",
    ],
    "empathy": [
        "abraço apertado.",
        "que dia. respira.",
        "estou contigo.",
        "se precisares de alguma coisa.",
        "também acordei mal hoje. somos.",
        "sinto-te. mesmo.",
    ],
    "praise_light": [
        "que bonito.",
        "isto é arte.",
        "fixe.",
        "linda.",
        "perfeito.",
        "boa.",
        "obrigada por partilhares isto.",
    ],
    "irony": [
        "claro que sim. claro que sim.",
        "como sempre.",
        "exatamente como esperado.",
        "ó pá. ó pá.",
        "é a vida.",
        "isto é mesmo Portugal.",
    ],
    "city_local": [
        "se passares pelo Príncipe Real diz-me.",
        "ali no Marquês também é assim.",
        "no Porto é igual mas com chuva.",
        "em Braga é exatamente o mesmo.",
        "Coimbra mesmo coisa.",
        "saudades dessa zona.",
    ],
}

# ════════════════════════════════════════════════════════════════════════════
# HASHTAG POOL — usados com baixa frequência (utilizadores PT usam poucos)
# ════════════════════════════════════════════════════════════════════════════
HASHTAGS = {
    "futebol":   ["benfica", "sporting", "fcporto", "primeiraliga", "jogo"],
    "cidade":    ["lisboa", "porto", "braga", "coimbra", "aveiro", "funchal", "faro"],
    "musica":    ["fado", "musicaportuguesa", "concerto", "vinil"],
    "praia":     ["surf", "atlantico", "ondas", "ericeira"],
    "cafe":      ["pastel", "bica", "manteigaria"],
    "cultura":   ["livros", "saramago", "pessoa", "almodovar"],
    "humor":     [],
    "tasca":     ["tasca", "petiscos"],
}

# ════════════════════════════════════════════════════════════════════════════
# FOLLOW EDGES — distribuição realista
# Construído programaticamente pelo seeder com base em:
#   - mesma cidade (60% probabilidade de seguir alguém da mesma cidade)
#   - mesmos interesses (40%)
#   - aleatório (15% — descoberta orgânica)
# Resultado: cada pessoa segue 10-80 outras, com clusters por cidade/interesse
# ════════════════════════════════════════════════════════════════════════════

# (configuração no seeder)
