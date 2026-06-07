"""
Curated Portuguese events dataset — feriados, dias da cidade, festivais de
música, cultura, eventos religiosos e sazonais.

Curadoria atualizada (junho 2026) com base em fontes oficiais (visitportugal,
sites oficiais dos festivais, câmaras municipais, agenda lx, visit algarve, etc.).

Schema de cada evento:
  {
    "key":         identificador estável e único (snake_case)
    "title":       nome curto (ex.: "MEO Sudoeste")
    "subtitle":    descrição editorial de uma linha (opcional)
    "category":    feriado | festa_cidade | festival_musica | cultura
                   | religioso | sazonal | feira
    "region":      lisboa | porto | algarve | centro | alentejo | norte
                   | acores | madeira | all
    "city":        cidade/concelho (opcional)
    "date_iso":    data inicial (YYYY-MM-DD). Para eventos recorrentes anuais
                   sem ano fixo, usar o ano corrente em runtime.
    "end_iso":     data final (YYYY-MM-DD) — opcional para eventos multi-dia
    "recurring":   bool — se True, repete-se todos os anos no mesmo MM-DD
    "emoji":       emoji ilustrativo
    "theme":       chave para mood/coloração (festa | cultura | saudade |
                   praia | tasca | orgulho)
    "url":         link oficial (opcional)
  }

Festas móveis (Carnaval, Páscoa, Corpo de Deus, etc.) são pré-calculadas
para o ano 2026 e tabelas futuras podem ser adicionadas conforme necessário.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# FERIADOS NACIONAIS (recorrentes)
# ---------------------------------------------------------------------------
NATIONAL_HOLIDAYS = [
    {"key": "ano_novo",         "title": "Ano Novo",                       "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-01-01", "recurring": True,  "emoji": "🎆", "theme": "festa"},
    {"key": "25_abril",         "title": "25 de Abril",                    "subtitle": "Dia da Liberdade",                    "category": "feriado", "region": "all", "date_iso": "2026-04-25", "recurring": True,  "emoji": "🌹", "theme": "cultura"},
    {"key": "dia_trabalhador",  "title": "Dia do Trabalhador",             "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-05-01", "recurring": True,  "emoji": "✊", "theme": "cultura"},
    {"key": "dia_portugal",     "title": "Dia de Portugal",                "subtitle": "Portugal, Camões e das Comunidades",  "category": "feriado", "region": "all", "date_iso": "2026-06-10", "recurring": True,  "emoji": "🇵🇹", "theme": "orgulho"},
    {"key": "assuncao",         "title": "Assunção de Nossa Senhora",      "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-08-15", "recurring": True,  "emoji": "⛪", "theme": "cultura"},
    {"key": "republica",        "title": "Implantação da República",       "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-10-05", "recurring": True,  "emoji": "🇵🇹", "theme": "cultura"},
    {"key": "todos_santos",     "title": "Todos os Santos",                "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-11-01", "recurring": True,  "emoji": "🕯️", "theme": "saudade"},
    {"key": "restauracao",      "title": "Restauração da Independência",   "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-12-01", "recurring": True,  "emoji": "🇵🇹", "theme": "cultura"},
    {"key": "imaculada",        "title": "Imaculada Conceição",            "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-12-08", "recurring": True,  "emoji": "⛪", "theme": "cultura"},
    {"key": "consoada",         "title": "Consoada",                       "subtitle": "Véspera de Natal",                    "category": "feriado", "region": "all", "date_iso": "2026-12-24", "recurring": True,  "emoji": "🎄", "theme": "saudade"},
    {"key": "natal",            "title": "Natal",                          "subtitle": "Feriado nacional",                    "category": "feriado", "region": "all", "date_iso": "2026-12-25", "recurring": True,  "emoji": "🎄", "theme": "saudade"},
    {"key": "passagem",         "title": "Passagem de Ano",                "subtitle": "Réveillon",                           "category": "feriado", "region": "all", "date_iso": "2026-12-31", "recurring": True,  "emoji": "🎇", "theme": "festa"},
]

# ---------------------------------------------------------------------------
# FERIADOS MÓVEIS — pré-calculados para 2026
# Páscoa 2026 = 5 de abril
#   Carnaval (Terça) = Páscoa − 47 dias  → 17/02/2026
#   Sexta-feira Santa = Páscoa − 2 dias  → 03/04/2026
#   Domingo de Páscoa                    → 05/04/2026
#   Corpo de Deus = Páscoa + 60 dias     → 04/06/2026
# ---------------------------------------------------------------------------
MOVABLE_HOLIDAYS_2026 = [
    {"key": "carnaval_2026",       "title": "Carnaval",                "subtitle": "Terça-feira de Entrudo · Tolerância de ponto",                "category": "feriado",  "region": "all", "date_iso": "2026-02-17", "recurring": False, "emoji": "🎭", "theme": "festa"},
    {"key": "sexta_santa_2026",    "title": "Sexta-feira Santa",       "subtitle": "Feriado nacional móvel",                                      "category": "feriado",  "region": "all", "date_iso": "2026-04-03", "recurring": False, "emoji": "✝️", "theme": "cultura"},
    {"key": "pascoa_2026",         "title": "Páscoa",                  "subtitle": "Domingo de Páscoa",                                           "category": "feriado",  "region": "all", "date_iso": "2026-04-05", "recurring": False, "emoji": "🐣", "theme": "cultura"},
    {"key": "corpo_deus_2026",     "title": "Corpo de Deus",           "subtitle": "Feriado nacional móvel",                                      "category": "feriado",  "region": "all", "date_iso": "2026-06-04", "recurring": False, "emoji": "⛪", "theme": "cultura"},
]

# ---------------------------------------------------------------------------
# FESTAS DAS CIDADES / FERIADOS MUNICIPAIS
# ---------------------------------------------------------------------------
CITY_FEASTS = [
    {"key": "santo_antonio",       "title": "Santo António",            "subtitle": "Marchas, sardinha e manjerico — Lisboa em festa",     "category": "festa_cidade", "region": "lisboa",   "city": "Lisboa",         "date_iso": "2026-06-13", "recurring": True, "emoji": "🌿", "theme": "festa"},
    {"key": "vespera_santo_ant",   "title": "Santo António · Marchas",  "subtitle": "Avenida da Liberdade · marchas populares",            "category": "festa_cidade", "region": "lisboa",   "city": "Lisboa",         "date_iso": "2026-06-12", "recurring": True, "emoji": "💃", "theme": "festa"},
    {"key": "sao_joao_porto",      "title": "São João do Porto",        "subtitle": "Martelos, manjericos e fogo no Douro",                "category": "festa_cidade", "region": "porto",    "city": "Porto",          "date_iso": "2026-06-24", "recurring": True, "emoji": "🔨", "theme": "festa"},
    {"key": "vespera_sao_joao",    "title": "Véspera de São João",      "subtitle": "Porto em festa toda a noite",                         "category": "festa_cidade", "region": "porto",    "city": "Porto",          "date_iso": "2026-06-23", "recurring": True, "emoji": "🔥", "theme": "festa"},
    {"key": "sao_joao_braga",      "title": "São João de Braga",        "subtitle": "Cidade dos Arcebispos em festa popular",              "category": "festa_cidade", "region": "norte",    "city": "Braga",          "date_iso": "2026-06-24", "recurring": True, "emoji": "👑", "theme": "festa"},
    {"key": "sao_pedro_evora",     "title": "São Pedro · Évora",        "subtitle": "Dia da cidade · feriado municipal",                   "category": "festa_cidade", "region": "alentejo", "city": "Évora",          "date_iso": "2026-06-29", "recurring": True, "emoji": "🐟", "theme": "festa"},
    {"key": "rainha_santa_coimbra","title": "Rainha Santa Isabel",      "subtitle": "Festas em honra · Coimbra · feriado municipal",       "category": "festa_cidade", "region": "centro",   "city": "Coimbra",        "date_iso": "2026-07-04", "recurring": True, "emoji": "👑", "theme": "cultura"},
    {"key": "dia_funchal",         "title": "Dia da Cidade do Funchal", "subtitle": "Feriado municipal · Madeira",                         "category": "festa_cidade", "region": "madeira",  "city": "Funchal",        "date_iso": "2026-08-21", "recurring": True, "emoji": "🌺", "theme": "festa"},
    {"key": "dia_faro",            "title": "Dia de Faro",              "subtitle": "Elevação a cidade · feriado municipal",               "category": "festa_cidade", "region": "algarve",  "city": "Faro",           "date_iso": "2026-09-07", "recurring": True, "emoji": "🌅", "theme": "praia"},
    {"key": "dia_lisboa_oficial",  "title": "Dia da Cidade de Lisboa",  "subtitle": "Coincide com Santo António · 13 de junho",            "category": "festa_cidade", "region": "lisboa",   "city": "Lisboa",         "date_iso": "2026-06-13", "recurring": True, "emoji": "🏛️", "theme": "orgulho"},
    {"key": "dia_porto_oficial",   "title": "Dia da Cidade do Porto",   "subtitle": "Coincide com São João · 24 de junho",                 "category": "festa_cidade", "region": "porto",    "city": "Porto",          "date_iso": "2026-06-24", "recurring": True, "emoji": "🏛️", "theme": "orgulho"},
    {"key": "gualterianas",        "title": "Festas Gualterianas",      "subtitle": "Guimarães · 1º fim-de-semana de agosto",              "category": "festa_cidade", "region": "norte",    "city": "Guimarães",      "date_iso": "2026-08-01", "end_iso": "2026-08-03", "recurring": False, "emoji": "🏰", "theme": "cultura"},
    {"key": "festas_lourosa",      "title": "Festas do Mar",            "subtitle": "Cascais · 10 dias de concertos junto à baía",         "category": "festa_cidade", "region": "lisboa",   "city": "Cascais",        "date_iso": "2026-08-19", "end_iso": "2026-08-29", "recurring": False, "emoji": "🌊", "theme": "praia"},
    {"key": "romaria_agonia",      "title": "Romaria N. Sra. da Agonia","subtitle": "Viana do Castelo · maior romaria do país",            "category": "festa_cidade", "region": "norte",    "city": "Viana do Castelo","date_iso":"2026-08-20", "end_iso": "2026-08-23", "recurring": False, "emoji": "⛪", "theme": "cultura"},
    {"key": "feira_sao_mateus",    "title": "Feira de São Mateus",      "subtitle": "Viseu · a feira mais antiga da Península Ibérica",    "category": "festa_cidade", "region": "centro",   "city": "Viseu",          "date_iso": "2026-08-08", "end_iso": "2026-09-20", "recurring": False, "emoji": "🎡", "theme": "festa"},
    {"key": "tabuleiros_tomar",    "title": "Festa dos Tabuleiros",     "subtitle": "Tomar · quadrienal · regresso em 2027",               "category": "festa_cidade", "region": "centro",   "city": "Tomar",          "date_iso": "2027-07-04", "end_iso": "2027-07-12", "recurring": False, "emoji": "🌾", "theme": "cultura"},
]

# ---------------------------------------------------------------------------
# FESTIVAIS DE MÚSICA — datas 2026 confirmadas
# ---------------------------------------------------------------------------
MUSIC_FESTIVALS_2026 = [
    {"key": "iminente_pri_2026",   "title": "Festival Iminente",       "subtitle": "Belém · arte urbana + música",                         "category": "festival_musica", "region": "lisboa",   "city": "Lisboa",       "date_iso": "2026-05-29", "end_iso": "2026-05-31", "recurring": False, "emoji": "🎨", "theme": "cultura", "url": "https://iminente.pt"},
    {"key": "primavera_porto_26",  "title": "Primavera Sound Porto",   "subtitle": "Parque da Cidade · indie, pop e eletrónica",           "category": "festival_musica", "region": "porto",    "city": "Porto",        "date_iso": "2026-06-11", "end_iso": "2026-06-14", "recurring": False, "emoji": "🎸", "theme": "festa",   "url": "https://primaverasound.com/pt/porto"},
    {"key": "rock_in_rio_26",      "title": "Rock in Rio Lisboa",      "subtitle": "Parque Tejo · 4 dias de cidade do rock",               "category": "festival_musica", "region": "lisboa",   "city": "Lisboa",       "date_iso": "2026-06-20", "end_iso": "2026-06-28", "recurring": False, "emoji": "🎤", "theme": "festa",   "url": "https://rockinriolisboa.pt"},
    {"key": "being_gathering_26",  "title": "Being Gathering",         "subtitle": "Boomland · eletrónica e cultura visionária",           "category": "festival_musica", "region": "centro",   "city": "Idanha-a-Nova","date_iso": "2026-07-01", "end_iso": "2026-07-05", "recurring": False, "emoji": "🌀", "theme": "festa",   "url": "https://www.being-gathering.org"},
    {"key": "nos_alive_26",        "title": "NOS Alive",               "subtitle": "Passeio Marítimo de Algés · cartaz internacional",     "category": "festival_musica", "region": "lisboa",   "city": "Algés",        "date_iso": "2026-07-09", "end_iso": "2026-07-11", "recurring": False, "emoji": "⚡", "theme": "festa",   "url": "https://nosalive.com"},
    {"key": "edp_cool_jazz_26",    "title": "EDP Cool Jazz",           "subtitle": "Hipódromo Manuel Possolo · jazz, soul e world",        "category": "festival_musica", "region": "lisboa",   "city": "Cascais",      "date_iso": "2026-07-10", "end_iso": "2026-07-25", "recurring": False, "emoji": "🎷", "theme": "praia",   "url": "https://edpcooljazz.com"},
    {"key": "marés_vivas_26",      "title": "MEO Marés Vivas",         "subtitle": "Vila Nova de Gaia · pop, rock e hits",                 "category": "festival_musica", "region": "porto",    "city": "Gaia",         "date_iso": "2026-07-16", "end_iso": "2026-07-18", "recurring": False, "emoji": "🌊", "theme": "praia",   "url": "https://maresvivas.meo.pt"},
    {"key": "super_bock_sr_26",    "title": "Super Bock Super Rock",   "subtitle": "Herdade do Cabeço da Flauta · Meco",                    "category": "festival_musica", "region": "lisboa",   "city": "Sesimbra",     "date_iso": "2026-07-16", "end_iso": "2026-07-18", "recurring": False, "emoji": "🤘", "theme": "festa",   "url": "https://superbocksuperrock.pt"},
    {"key": "fmm_sines_26",        "title": "FMM Sines",               "subtitle": "Festival Músicas do Mundo · castelo e praia",          "category": "festival_musica", "region": "alentejo", "city": "Sines",        "date_iso": "2026-07-17", "end_iso": "2026-07-25", "recurring": False, "emoji": "🌍", "theme": "cultura", "url": "https://www.fmmsines.pt"},
    {"key": "bons_sons_26",        "title": "Bons Sons",               "subtitle": "Cem Soldos · só com música portuguesa",                 "category": "festival_musica", "region": "centro",   "city": "Tomar",        "date_iso": "2026-08-13", "end_iso": "2026-08-16", "recurring": False, "emoji": "🪕", "theme": "cultura", "url": "https://bonssons.com"},
    {"key": "paredes_coura_26",    "title": "Vodafone Paredes de Coura","subtitle": "Praia fluvial do Taboão · o festival mais cool",       "category": "festival_musica", "region": "norte",    "city": "Paredes de Coura","date_iso": "2026-08-12", "end_iso": "2026-08-15", "recurring": False, "emoji": "🎶", "theme": "festa",   "url": "https://www.vodafoneparedesdecoura.com"},
    {"key": "festival_crato_26",   "title": "Festival do Crato",       "subtitle": "Alto Alentejo · música, povo e tradição",              "category": "festival_musica", "region": "alentejo", "city": "Crato",        "date_iso": "2026-08-19", "end_iso": "2026-08-22", "recurring": False, "emoji": "🌾", "theme": "tasca",   "url": "https://festivaldocrato.com"},
    {"key": "vagos_metal_26",      "title": "Vagos Metal Fest",        "subtitle": "Quinta do Ega · maior festival de metal nacional",     "category": "festival_musica", "region": "centro",   "city": "Vagos",        "date_iso": "2026-08-13", "end_iso": "2026-08-15", "recurring": False, "emoji": "🤘", "theme": "festa",   "url": "https://vagosmetalfest.eu"},
    {"key": "festa_avante_26",     "title": "Festa do Avante!",        "subtitle": "Quinta da Atalaia · Amora · 1º fim-de-semana setembro", "category": "festival_musica", "region": "lisboa",   "city": "Seixal",       "date_iso": "2026-09-04", "end_iso": "2026-09-06", "recurring": False, "emoji": "🌹", "theme": "cultura", "url": "https://www.festadoavante.pcp.pt"},
    {"key": "festival_f_26",       "title": "Festival F",              "subtitle": "Centro Histórico de Faro · só artistas nacionais",     "category": "festival_musica", "region": "algarve",  "city": "Faro",         "date_iso": "2026-09-03", "end_iso": "2026-09-05", "recurring": False, "emoji": "🎵", "theme": "praia",   "url": "https://www.festivalf.pt"},
    {"key": "sumol_summer_26",     "title": "Sumol Summer Fest",       "subtitle": "Praia de Ribeira d'Ilhas · Ericeira",                  "category": "festival_musica", "region": "lisboa",   "city": "Ericeira",     "date_iso": "2026-07-03", "end_iso": "2026-07-04", "recurring": False, "emoji": "🏄", "theme": "praia",   "url": "https://www.sumolsummerfest.com"},
    {"key": "iminente_out_26",     "title": "Iminente · Outono",       "subtitle": "Edição de outono junto ao Tejo",                       "category": "festival_musica", "region": "lisboa",   "city": "Lisboa",       "date_iso": "2026-10-09", "end_iso": "2026-10-11", "recurring": False, "emoji": "🍂", "theme": "cultura", "url": "https://iminente.pt"},
]

# ---------------------------------------------------------------------------
# CULTURA, FEIRAS, EVENTOS RELIGIOSOS, SAZONAIS
# ---------------------------------------------------------------------------
CULTURE_AND_OTHER_2026 = [
    # Cultura / Tech / Livro
    {"key": "feira_livro_lx_26",   "title": "Feira do Livro de Lisboa","subtitle": "Parque Eduardo VII · cerca de três semanas",           "category": "feira",    "region": "lisboa",   "city": "Lisboa",    "date_iso": "2026-05-28", "end_iso": "2026-06-14", "recurring": False, "emoji": "📚", "theme": "cultura"},
    {"key": "feira_livro_porto_26","title": "Feira do Livro do Porto", "subtitle": "Jardins do Palácio de Cristal",                        "category": "feira",    "region": "porto",    "city": "Porto",     "date_iso": "2026-08-28", "end_iso": "2026-09-13", "recurring": False, "emoji": "📖", "theme": "cultura"},
    {"key": "web_summit_26",       "title": "Web Summit",              "subtitle": "Altice Arena · 70k+ inovadores em Lisboa",             "category": "cultura",  "region": "lisboa",   "city": "Lisboa",    "date_iso": "2026-11-09", "end_iso": "2026-11-12", "recurring": False, "emoji": "🚀", "theme": "cultura", "url": "https://websummit.com"},
    {"key": "indielisboa_26",      "title": "IndieLisboa",             "subtitle": "Festival Internacional de Cinema Independente",        "category": "cultura",  "region": "lisboa",   "city": "Lisboa",    "date_iso": "2026-04-30", "end_iso": "2026-05-10", "recurring": False, "emoji": "🎬", "theme": "cultura"},
    {"key": "doclisboa_26",        "title": "DocLisboa",               "subtitle": "Festival Internacional de Cinema · documentário",      "category": "cultura",  "region": "lisboa",   "city": "Lisboa",    "date_iso": "2026-10-15", "end_iso": "2026-10-25", "recurring": False, "emoji": "🎞️", "theme": "cultura"},
    {"key": "leffest_26",          "title": "Lisbon & Estoril Film",   "subtitle": "LEFFEST · cinema de autor",                             "category": "cultura",  "region": "lisboa",   "city": "Lisboa",    "date_iso": "2026-11-06", "end_iso": "2026-11-15", "recurring": False, "emoji": "🎥", "theme": "cultura"},
    {"key": "monstra_lx_26",       "title": "Monstra Lisboa",          "subtitle": "Festival de Animação de Lisboa",                       "category": "cultura",  "region": "lisboa",   "city": "Lisboa",    "date_iso": "2026-03-18", "end_iso": "2026-03-29", "recurring": False, "emoji": "🐉", "theme": "cultura"},
    {"key": "queima_fitas_co_26",  "title": "Queima das Fitas",        "subtitle": "Coimbra · maior festa académica do país",              "category": "cultura",  "region": "centro",   "city": "Coimbra",   "date_iso": "2026-05-01", "end_iso": "2026-05-08", "recurring": False, "emoji": "🎓", "theme": "festa"},
    {"key": "queima_porto_26",     "title": "Queima das Fitas do Porto","subtitle": "Académica do Porto · semana mítica",                  "category": "cultura",  "region": "porto",    "city": "Porto",     "date_iso": "2026-05-03", "end_iso": "2026-05-10", "recurring": False, "emoji": "🎓", "theme": "festa"},
    {"key": "ovibeja_26",          "title": "Ovibeja",                 "subtitle": "Beja · maior feira agrícola do Alentejo",              "category": "feira",    "region": "alentejo", "city": "Beja",      "date_iso": "2026-04-22", "end_iso": "2026-04-26", "recurring": False, "emoji": "🐑", "theme": "tasca"},
    {"key": "feira_nacional_agric","title": "Feira Nacional de Agricultura","subtitle": "Santarém · capital do cavalo",                    "category": "feira",    "region": "centro",   "city": "Santarém",  "date_iso": "2026-06-06", "end_iso": "2026-06-14", "recurring": False, "emoji": "🐎", "theme": "tasca"},

    # Religioso
    {"key": "fatima_13_05",        "title": "Peregrinação a Fátima · maio", "subtitle": "13 de maio · aniversário das aparições",           "category": "religioso","region": "centro",   "city": "Fátima",    "date_iso": "2026-05-13", "recurring": True,  "emoji": "🕯️", "theme": "saudade"},
    {"key": "fatima_13_10",        "title": "Peregrinação a Fátima · outubro","subtitle": "13 de outubro · última aparição",                "category": "religioso","region": "centro",   "city": "Fátima",    "date_iso": "2026-10-13", "recurring": True,  "emoji": "🕯️", "theme": "saudade"},
    {"key": "dia_reis",            "title": "Dia de Reis",             "subtitle": "Cantar as janeiras e bolo-rei",                        "category": "religioso","region": "all",      "date_iso": "2026-01-06", "recurring": True,  "emoji": "👑", "theme": "cultura"},
    {"key": "sao_martinho",        "title": "São Martinho · Magusto",  "subtitle": "Castanhas, jeropiga e verão de São Martinho",          "category": "religioso","region": "all",      "date_iso": "2026-11-11", "recurring": True,  "emoji": "🌰", "theme": "tasca"},

    # Sazonais
    {"key": "primavera_eq",        "title": "Início da Primavera",     "subtitle": "Equinócio · dias e noites equilibrados",               "category": "sazonal",  "region": "all",      "date_iso": "2026-03-20", "recurring": True,  "emoji": "🌸", "theme": "praia"},
    {"key": "verao_solst",         "title": "Início do Verão",         "subtitle": "Solstício · o dia mais longo do ano",                  "category": "sazonal",  "region": "all",      "date_iso": "2026-06-21", "recurring": True,  "emoji": "☀️", "theme": "praia"},
    {"key": "outono_eq",           "title": "Início do Outono",        "subtitle": "Equinócio · as folhas caem",                           "category": "sazonal",  "region": "all",      "date_iso": "2026-09-22", "recurring": True,  "emoji": "🍂", "theme": "saudade"},
    {"key": "inverno_solst",       "title": "Início do Inverno",       "subtitle": "Solstício · a noite mais longa",                       "category": "sazonal",  "region": "all",      "date_iso": "2026-12-21", "recurring": True,  "emoji": "❄️", "theme": "saudade"},
    {"key": "regresso_aulas",      "title": "Regresso às aulas",       "subtitle": "Semana de retoma do calendário escolar",               "category": "sazonal",  "region": "all",      "date_iso": "2026-09-14", "recurring": True,  "emoji": "✏️", "theme": "saudade"},
    {"key": "irs_limite",          "title": "Último dia do IRS",       "subtitle": "Entrega da declaração de IRS",                         "category": "sazonal",  "region": "all",      "date_iso": "2026-06-30", "recurring": True,  "emoji": "💸", "theme": "tasca"},
]


# ---------------------------------------------------------------------------
# DATASET COMPLETO — ordem cronológica é aplicada em runtime
# ---------------------------------------------------------------------------
def all_events() -> list[dict]:
    """Retorna a lista completa, sem ordenação. A ordenação por data é feita
    no endpoint (depende do ano corrente para eventos recorrentes)."""
    out: list[dict] = []
    out.extend(NATIONAL_HOLIDAYS)
    out.extend(MOVABLE_HOLIDAYS_2026)
    out.extend(CITY_FEASTS)
    out.extend(MUSIC_FESTIVALS_2026)
    out.extend(CULTURE_AND_OTHER_2026)
    return out


# Catálogo de categorias com rótulo, emoji e cor (token PT visual)
CATEGORY_META = {
    "feriado":          {"label": "Feriados",            "emoji": "🇵🇹", "color": "#E03A2F"},
    "festa_cidade":     {"label": "Festas das Cidades",  "emoji": "🎉", "color": "#FFCC00"},
    "festival_musica":  {"label": "Festivais",           "emoji": "🎶", "color": "#0A0A0B"},
    "cultura":          {"label": "Cultura",             "emoji": "🎨", "color": "#0B6E4F"},
    "religioso":        {"label": "Religioso",           "emoji": "⛪", "color": "#5C4A8A"},
    "sazonal":          {"label": "Sazonal",             "emoji": "🍃", "color": "#7E8D85"},
    "feira":            {"label": "Feiras",              "emoji": "🛍️", "color": "#C78D2E"},
}

REGION_META = {
    "all":      {"label": "Nacional"},
    "lisboa":   {"label": "Lisboa & Vale"},
    "porto":    {"label": "Porto & Norte"},
    "norte":    {"label": "Norte"},
    "centro":   {"label": "Centro"},
    "alentejo": {"label": "Alentejo"},
    "algarve":  {"label": "Algarve"},
    "madeira":  {"label": "Madeira"},
    "acores":   {"label": "Açores"},
}
