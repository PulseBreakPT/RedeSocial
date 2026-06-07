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
# CARNAVAIS DE PORTUGAL — Carnaval 2026 = 17 fev (Páscoa = 5 abr)
# Os bairros vivem o Entrudo na semana anterior. UNESCO inclui Podence.
# ---------------------------------------------------------------------------
CARNIVALS_2026 = [
    {"key": "carn_podence",      "title": "Carnaval de Podence",         "subtitle": "Os Caretos · Património Imaterial UNESCO",                "category": "festa_cidade", "region": "norte",    "city": "Macedo de Cavaleiros", "date_iso": "2026-02-14", "end_iso": "2026-02-17", "recurring": False, "emoji": "👹", "theme": "festa"},
    {"key": "carn_torres",       "title": "Carnaval de Torres Vedras",   "subtitle": "“O mais português de Portugal” · matrafonas e cabeçudos",  "category": "festa_cidade", "region": "lisboa",   "city": "Torres Vedras",        "date_iso": "2026-02-13", "end_iso": "2026-02-17", "recurring": False, "emoji": "🎭", "theme": "festa"},
    {"key": "carn_ovar",         "title": "Carnaval de Ovar",            "subtitle": "Escolas de samba e desfile alegórico no Norte",            "category": "festa_cidade", "region": "centro",   "city": "Ovar",                 "date_iso": "2026-02-13", "end_iso": "2026-02-17", "recurring": False, "emoji": "🥁", "theme": "festa"},
    {"key": "carn_estarreja",    "title": "Carnaval de Estarreja",       "subtitle": "Caretos, charolas e o famoso passatempo",                  "category": "festa_cidade", "region": "centro",   "city": "Estarreja",            "date_iso": "2026-02-14", "end_iso": "2026-02-17", "recurring": False, "emoji": "🎉", "theme": "festa"},
    {"key": "carn_loule",        "title": "Carnaval de Loulé",           "subtitle": "O mais antigo do país · corso desde 1906",                 "category": "festa_cidade", "region": "algarve",  "city": "Loulé",                "date_iso": "2026-02-15", "end_iso": "2026-02-17", "recurring": False, "emoji": "🌴", "theme": "festa"},
    {"key": "carn_sesimbra",     "title": "Carnaval de Sesimbra",        "subtitle": "Vila do peixe em modo Entrudo",                            "category": "festa_cidade", "region": "lisboa",   "city": "Sesimbra",             "date_iso": "2026-02-15", "end_iso": "2026-02-17", "recurring": False, "emoji": "🐟", "theme": "festa"},
    {"key": "carn_funchal",      "title": "Carnaval do Funchal",         "subtitle": "Cortejo alegórico e trapalhão · Madeira",                  "category": "festa_cidade", "region": "madeira",  "city": "Funchal",              "date_iso": "2026-02-13", "end_iso": "2026-02-17", "recurring": False, "emoji": "🌺", "theme": "festa"},
    {"key": "caretos_lazarim",   "title": "Caretos de Lazarim",          "subtitle": "Máscaras de madeira · ritual ancestral em Lamego",         "category": "festa_cidade", "region": "norte",    "city": "Lamego",               "date_iso": "2026-02-15", "end_iso": "2026-02-17", "recurring": False, "emoji": "🪵", "theme": "cultura"},
]

# ---------------------------------------------------------------------------
# FESTAS POPULARES, ROMARIAS, FESTAS RELIGIOSAS
# (Pentecostes 2026 = 24 mai; Santo Cristo = 5º dom Páscoa = 10 mai 2026)
# ---------------------------------------------------------------------------
POPULAR_FEASTS = [
    {"key": "festa_cruzes_barcelos","title": "Festa das Cruzes",        "subtitle": "Barcelos · andores, tapetes de flores e galo",            "category": "religioso",    "region": "norte",    "city": "Barcelos",      "date_iso": "2026-05-01", "end_iso": "2026-05-03", "recurring": True,  "emoji": "✝️", "theme": "cultura"},
    {"key": "santo_cristo_pdl",  "title": "Senhor Santo Cristo dos Milagres", "subtitle": "Ponta Delgada · maior festa religiosa dos Açores",   "category": "religioso",    "region": "acores",   "city": "Ponta Delgada", "date_iso": "2026-05-09", "end_iso": "2026-05-12", "recurring": False, "emoji": "⛪", "theme": "saudade"},
    {"key": "festas_es_acores",  "title": "Festas do Divino Espírito Santo", "subtitle": "Açores · Império, sopas e bodos · pós-Pentecostes",  "category": "religioso",    "region": "acores",   "city": "Açores",        "date_iso": "2026-05-24", "end_iso": "2026-06-21", "recurring": False, "emoji": "🕊️", "theme": "saudade"},
    {"key": "sanjoaninas_angra", "title": "Sanjoaninas",                 "subtitle": "Angra do Heroísmo · 10 dias de touradas, cortejos e fogo", "category": "festa_cidade", "region": "acores",   "city": "Angra do Heroísmo", "date_iso": "2026-06-19", "end_iso": "2026-06-28", "recurring": False, "emoji": "🐂", "theme": "festa"},
    {"key": "sra_nazare",        "title": "Festas N. Sra. da Nazaré",    "subtitle": "Nazaré · procissão do mar e arraial",                     "category": "religioso",    "region": "centro",   "city": "Nazaré",        "date_iso": "2026-09-08", "end_iso": "2026-09-13", "recurring": True,  "emoji": "🌊", "theme": "saudade"},
    {"key": "sra_remedios_lam",  "title": "N. Sra. dos Remédios",        "subtitle": "Lamego · uma das maiores romarias do país",               "category": "religioso",    "region": "norte",    "city": "Lamego",        "date_iso": "2026-08-29", "end_iso": "2026-09-08", "recurring": False, "emoji": "⛪", "theme": "cultura"},
    {"key": "sta_joana_aveiro",  "title": "Festas de Santa Joana",       "subtitle": "Aveiro · padroeira e Dia da Cidade",                      "category": "festa_cidade", "region": "centro",   "city": "Aveiro",        "date_iso": "2026-05-12", "recurring": True,  "emoji": "🚣", "theme": "cultura"},
    {"key": "sra_monte_funchal", "title": "N. Sra. do Monte",            "subtitle": "Funchal · romaria de 15 de agosto",                       "category": "religioso",    "region": "madeira",  "city": "Funchal",       "date_iso": "2026-08-14", "end_iso": "2026-08-15", "recurring": True,  "emoji": "⛪", "theme": "saudade"},
    {"key": "festas_lisboa_jun", "title": "Festas de Lisboa",            "subtitle": "Junho inteiro · marchas, arraiais, sardinhas, manjericos", "category": "festa_cidade", "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-06-01", "end_iso": "2026-06-30", "recurring": True,  "emoji": "💃", "theme": "festa"},
    {"key": "festa_flor_madeira","title": "Festa da Flor",               "subtitle": "Funchal · tapete floral e cortejo alegórico",             "category": "festa_cidade", "region": "madeira",  "city": "Funchal",       "date_iso": "2026-04-30", "end_iso": "2026-05-24", "recurring": False, "emoji": "🌷", "theme": "festa"},
    {"key": "festa_vinho_mad",   "title": "Festa do Vinho Madeira",      "subtitle": "Funchal e Estreito · vindima e tradição",                 "category": "gastronomia",  "region": "madeira",  "city": "Funchal",       "date_iso": "2026-08-29", "end_iso": "2026-09-13", "recurring": False, "emoji": "🍷", "theme": "tasca"},
    {"key": "festas_sant_iago",  "title": "Festas de Sant'Iago",         "subtitle": "Setúbal · feira centenária e tasquinhas",                 "category": "festa_cidade", "region": "lisboa",   "city": "Setúbal",       "date_iso": "2026-07-23", "end_iso": "2026-08-09", "recurring": False, "emoji": "🐠", "theme": "tasca"},
    {"key": "sra_boa_viagem",    "title": "N. Sra. da Boa Viagem",       "subtitle": "Setúbal · procissão fluvial no Sado",                     "category": "religioso",    "region": "lisboa",   "city": "Setúbal",       "date_iso": "2026-08-08", "recurring": True,  "emoji": "🛶", "theme": "cultura"},
    {"key": "festas_braganca",   "title": "Festas da Cidade de Bragança","subtitle": "Senhora das Graças · cabeça do distrito em festa",         "category": "festa_cidade", "region": "norte",    "city": "Bragança",      "date_iso": "2026-08-18", "end_iso": "2026-08-22", "recurring": True,  "emoji": "🏰", "theme": "cultura"},
    {"key": "festas_olhao",      "title": "Festival do Marisco · Olhão", "subtitle": "Tradição olhanense · 5 noites na Avenida 5 de Outubro",   "category": "gastronomia",  "region": "algarve",  "city": "Olhão",         "date_iso": "2026-08-10", "end_iso": "2026-08-15", "recurring": False, "emoji": "🦐", "theme": "praia"},
    {"key": "festas_lourinha",   "title": "Festas do Concelho da Lourinhã","subtitle": "Oeste · gastronomia e folclore",                        "category": "festa_cidade", "region": "lisboa",   "city": "Lourinhã",      "date_iso": "2026-08-08", "end_iso": "2026-08-16", "recurring": True,  "emoji": "🍇", "theme": "tasca"},
    {"key": "vindimas_palmela",  "title": "Festas das Vindimas",         "subtitle": "Palmela · pisa do vinho na Igreja Matriz",                "category": "festa_cidade", "region": "lisboa",   "city": "Palmela",       "date_iso": "2026-09-03", "end_iso": "2026-09-07", "recurring": True,  "emoji": "🍇", "theme": "tasca"},
    {"key": "feira_dos_santos",  "title": "Feira dos Santos",            "subtitle": "Chaves · feira franca centenária de outono",              "category": "feira",        "region": "norte",    "city": "Chaves",        "date_iso": "2026-10-28", "end_iso": "2026-11-01", "recurring": True,  "emoji": "🍂", "theme": "tasca"},
]

# ---------------------------------------------------------------------------
# FERIADOS / DIAS DE CIDADE — restantes capitais de distrito e regiões
# ---------------------------------------------------------------------------
MUNICIPAL_DAYS = [
    {"key": "dia_aveiro",        "title": "Dia de Aveiro",              "subtitle": "Sta. Joana Princesa · feriado municipal",                  "category": "festa_cidade", "region": "centro",   "city": "Aveiro",        "date_iso": "2026-05-12", "recurring": True, "emoji": "🚣", "theme": "cultura"},
    {"key": "dia_leiria",        "title": "Dia de Leiria",              "subtitle": "Feriado municipal · castelo e pinhal",                     "category": "festa_cidade", "region": "centro",   "city": "Leiria",        "date_iso": "2026-05-22", "recurring": True, "emoji": "🏰", "theme": "cultura"},
    {"key": "dia_setubal",       "title": "Dia de Setúbal",             "subtitle": "Feriado municipal · S. Tiago / 15 de setembro",            "category": "festa_cidade", "region": "lisboa",   "city": "Setúbal",       "date_iso": "2026-09-15", "recurring": True, "emoji": "🐟", "theme": "praia"},
    {"key": "dia_castelo_b",     "title": "Dia de Castelo Branco",      "subtitle": "Nossa Senhora de Mércoles · feriado municipal",            "category": "festa_cidade", "region": "centro",   "city": "Castelo Branco","date_iso": "2026-05-06", "recurring": True, "emoji": "🏛️", "theme": "cultura"},
    {"key": "dia_beja",          "title": "Dia de Beja",                "subtitle": "S. Sisenando · alma alentejana",                           "category": "festa_cidade", "region": "alentejo", "city": "Beja",          "date_iso": "2026-03-16", "recurring": True, "emoji": "🌾", "theme": "cultura"},
    {"key": "dia_guarda",        "title": "Dia da Guarda",              "subtitle": "Elevação a cidade · feriado municipal",                    "category": "festa_cidade", "region": "centro",   "city": "Guarda",        "date_iso": "2026-11-27", "recurring": True, "emoji": "❄️", "theme": "cultura"},
    {"key": "dia_angra",         "title": "Dia de Angra do Heroísmo",   "subtitle": "Restauração da Cidade · feriado municipal",                "category": "festa_cidade", "region": "acores",   "city": "Angra do Heroísmo", "date_iso": "2026-06-24", "recurring": True, "emoji": "🏝️", "theme": "orgulho"},
    {"key": "dia_horta",         "title": "Dia da Horta",               "subtitle": "Faial · elevação a cidade",                                "category": "festa_cidade", "region": "acores",   "city": "Horta",         "date_iso": "2026-08-04", "recurring": True, "emoji": "⚓", "theme": "saudade"},
    {"key": "dia_madeira",       "title": "Dia da Região Autónoma da Madeira", "subtitle": "Feriado regional · 1 de julho",                     "category": "feriado",      "region": "madeira",  "city": "Madeira",       "date_iso": "2026-07-01", "recurring": True, "emoji": "🌺", "theme": "orgulho"},
    {"key": "dia_acores",        "title": "Dia dos Açores",             "subtitle": "Segunda-feira de Pentecostes · feriado regional",          "category": "feriado",      "region": "acores",   "city": "Açores",        "date_iso": "2026-05-25", "recurring": False, "emoji": "🌋", "theme": "orgulho"},
    {"key": "dia_viana",         "title": "Dia da Cidade de Viana do Castelo","subtitle": "20 de agosto · feriado municipal",                   "category": "festa_cidade", "region": "norte",    "city": "Viana do Castelo", "date_iso": "2026-08-20", "recurring": True, "emoji": "❤️", "theme": "orgulho"},
    {"key": "dia_viseu",         "title": "Dia da Cidade de Viseu",     "subtitle": "21 de setembro · S. Mateus",                               "category": "festa_cidade", "region": "centro",   "city": "Viseu",         "date_iso": "2026-09-21", "recurring": True, "emoji": "🍷", "theme": "cultura"},
    {"key": "dia_portalegre",    "title": "Dia da Cidade de Portalegre","subtitle": "23 de maio · feriado municipal",                           "category": "festa_cidade", "region": "alentejo", "city": "Portalegre",    "date_iso": "2026-05-23", "recurring": True, "emoji": "🏛️", "theme": "cultura"},
    {"key": "dia_santarem",      "title": "Dia de Santarém",            "subtitle": "Capital do gótico · feriado municipal · 19 de março",      "category": "festa_cidade", "region": "centro",   "city": "Santarém",      "date_iso": "2026-03-19", "recurring": True, "emoji": "🐎", "theme": "cultura"},
    {"key": "dia_vila_real",     "title": "Dia de Vila Real",           "subtitle": "13 de outubro · feriado municipal",                        "category": "festa_cidade", "region": "norte",    "city": "Vila Real",     "date_iso": "2026-10-13", "recurring": True, "emoji": "🍇", "theme": "cultura"},
]

# ---------------------------------------------------------------------------
# MAIS FESTIVAIS DE MÚSICA — 2026 confirmados ou fortemente recorrentes
# ---------------------------------------------------------------------------
MORE_MUSIC_FESTIVALS_2026 = [
    {"key": "tremor_acores",     "title": "Tremor",                     "subtitle": "Ponta Delgada · indie e descoberta açoriana",              "category": "festival_musica", "region": "acores",   "city": "Ponta Delgada", "date_iso": "2026-04-07", "end_iso": "2026-04-11", "recurring": False, "emoji": "🌋", "theme": "festa",   "url": "https://tremoracores.com"},
    {"key": "boom_festival_26",  "title": "Boom Festival",              "subtitle": "Idanha-a-Nova · bienal psytrance e cultura visionária",    "category": "festival_musica", "region": "centro",   "city": "Idanha-a-Nova", "date_iso": "2026-07-22", "end_iso": "2026-07-29", "recurring": False, "emoji": "🪐", "theme": "festa",   "url": "https://boomfestival.org"},
    {"key": "milhoes_festa",     "title": "Milhões de Festa",           "subtitle": "Barcelos · rock independente nas piscinas municipais",      "category": "festival_musica", "region": "norte",    "city": "Barcelos",      "date_iso": "2026-07-23", "end_iso": "2026-07-26", "recurring": False, "emoji": "🎸", "theme": "festa"},
    {"key": "reverence_valada",  "title": "Reverence Valada",           "subtitle": "Valada · rock psicadélico junto ao Tejo",                  "category": "festival_musica", "region": "centro",   "city": "Cartaxo",       "date_iso": "2026-09-10", "end_iso": "2026-09-12", "recurring": False, "emoji": "🌀", "theme": "festa"},
    {"key": "forte_montemor",    "title": "Festival Forte",             "subtitle": "Castelo de Montemor-o-Velho · eletrónica fora de horas",   "category": "festival_musica", "region": "centro",   "city": "Montemor-o-Velho", "date_iso": "2026-08-27", "end_iso": "2026-08-30", "recurring": False, "emoji": "⚙️", "theme": "festa"},
    {"key": "festival_med",      "title": "Festival MED",               "subtitle": "Loulé · músicas do mundo no centro histórico",             "category": "festival_musica", "region": "algarve",  "city": "Loulé",         "date_iso": "2026-06-25", "end_iso": "2026-06-28", "recurring": False, "emoji": "🌍", "theme": "praia"},
    {"key": "atlantico_funchal", "title": "Festival do Atlântico",      "subtitle": "Funchal · concursos de pirotecnia ao sábado",              "category": "festival_musica", "region": "madeira",  "city": "Funchal",       "date_iso": "2026-06-06", "end_iso": "2026-06-27", "recurring": False, "emoji": "🎆", "theme": "festa"},
    {"key": "mare_agosto",       "title": "Maré de Agosto",             "subtitle": "Praia Formosa · Santa Maria, Açores",                      "category": "festival_musica", "region": "acores",   "city": "Santa Maria",   "date_iso": "2026-08-20", "end_iso": "2026-08-22", "recurring": False, "emoji": "🌅", "theme": "praia",   "url": "https://maredeagosto.com"},
    {"key": "caixa_alfama",      "title": "Caixa Alfama",               "subtitle": "Bairro de Alfama · maior festival de fado do mundo",       "category": "festival_musica", "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-09-25", "end_iso": "2026-09-26", "recurring": False, "emoji": "🎙️", "theme": "saudade"},
    {"key": "mexefest",          "title": "Vodafone Mexefest",          "subtitle": "Avenida da Liberdade · cidade-festival num dia",           "category": "festival_musica", "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-11-20", "end_iso": "2026-11-21", "recurring": False, "emoji": "🚇", "theme": "festa"},
    {"key": "neopop_viana",      "title": "NEOPOP Electronic Festival", "subtitle": "Forte de Santiago · eletrónica de culto",                  "category": "festival_musica", "region": "norte",    "city": "Viana do Castelo", "date_iso": "2026-08-06", "end_iso": "2026-08-08", "recurring": False, "emoji": "🤖", "theme": "festa",   "url": "https://www.neopopfestival.com"},
    {"key": "misty_fest",        "title": "Misty Fest",                 "subtitle": "Várias cidades · cantautores em salas íntimas (outono)",   "category": "festival_musica", "region": "all",      "city": "Várias",        "date_iso": "2026-10-30", "end_iso": "2026-11-22", "recurring": False, "emoji": "🍂", "theme": "saudade"},
    {"key": "jazz_em_agosto",    "title": "Jazz em Agosto",             "subtitle": "Gulbenkian · jazz contemporâneo no anfiteatro ao ar livre", "category": "festival_musica", "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-07-31", "end_iso": "2026-08-09", "recurring": False, "emoji": "🎷", "theme": "cultura"},
    {"key": "andancas",          "title": "Andanças",                   "subtitle": "Castelo de Vide · danças do mundo, comunidade",            "category": "festival_musica", "region": "alentejo", "city": "Castelo de Vide", "date_iso": "2026-08-04", "end_iso": "2026-08-09", "recurring": False, "emoji": "💃", "theme": "cultura"},
    {"key": "sons_em_transito",  "title": "Sons em Trânsito",           "subtitle": "Capuchos · indie acústico no claustro",                    "category": "festival_musica", "region": "lisboa",   "city": "Almada",        "date_iso": "2026-06-13", "end_iso": "2026-06-14", "recurring": False, "emoji": "🎻", "theme": "cultura"},
    {"key": "santa_casa_alfama_d","title": "Santa Casa Alfama",          "subtitle": "Edição de inverno · fado na catedral",                     "category": "festival_musica", "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-02-27", "end_iso": "2026-02-28", "recurring": False, "emoji": "🎼", "theme": "saudade"},
]

# ---------------------------------------------------------------------------
# MAIS CULTURA — cinema, teatro, literatura, fotografia, arte
# ---------------------------------------------------------------------------
MORE_CULTURE_2026 = [
    {"key": "curtas_vila_conde", "title": "Curtas Vila do Conde",       "subtitle": "Festival Internacional de Curtas-Metragens",               "category": "cultura",      "region": "norte",    "city": "Vila do Conde", "date_iso": "2026-07-04", "end_iso": "2026-07-12", "recurring": False, "emoji": "🎬", "theme": "cultura"},
    {"key": "indiejunior",       "title": "IndieJúnior Allianz",        "subtitle": "Cinema para os mais novos · Vila do Conde / Porto",        "category": "cultura",      "region": "norte",    "city": "Vila do Conde", "date_iso": "2026-04-17", "end_iso": "2026-04-26", "recurring": False, "emoji": "🍿", "theme": "cultura"},
    {"key": "fantasporto",       "title": "Fantasporto",                "subtitle": "Festival Internacional de Cinema do Porto",                "category": "cultura",      "region": "porto",    "city": "Porto",         "date_iso": "2026-02-27", "end_iso": "2026-03-08", "recurring": False, "emoji": "🛸", "theme": "cultura"},
    {"key": "fest_espinho",      "title": "FEST · Novos Cineastas",     "subtitle": "Espinho · novos realizadores e workshops",                 "category": "cultura",      "region": "norte",    "city": "Espinho",       "date_iso": "2026-06-22", "end_iso": "2026-06-28", "recurring": False, "emoji": "🎞️", "theme": "cultura"},
    {"key": "cinanima_espinho",  "title": "Cinanima",                   "subtitle": "Espinho · cinema de animação desde 1976",                  "category": "cultura",      "region": "norte",    "city": "Espinho",       "date_iso": "2026-11-09", "end_iso": "2026-11-15", "recurring": False, "emoji": "🎨", "theme": "cultura"},
    {"key": "fitei_porto",       "title": "FITEI",                      "subtitle": "Festival Internacional de Teatro Expressão Ibérica",       "category": "cultura",      "region": "porto",    "city": "Porto",         "date_iso": "2026-05-21", "end_iso": "2026-05-31", "recurring": False, "emoji": "🎭", "theme": "cultura"},
    {"key": "festival_almada",   "title": "Festival de Almada",         "subtitle": "Teatro · grandes companhias internacionais",               "category": "cultura",      "region": "lisboa",   "city": "Almada",        "date_iso": "2026-07-04", "end_iso": "2026-07-18", "recurring": False, "emoji": "🎟️", "theme": "cultura"},
    {"key": "motelx",            "title": "MOTELx",                     "subtitle": "Lisboa · cinema fantástico e de terror",                   "category": "cultura",      "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-09-08", "end_iso": "2026-09-14", "recurring": False, "emoji": "🩸", "theme": "festa"},
    {"key": "caminhos_cinema",   "title": "Caminhos do Cinema Português","subtitle": "Coimbra · panorama do cinema nacional",                    "category": "cultura",      "region": "centro",   "city": "Coimbra",       "date_iso": "2026-11-21", "end_iso": "2026-11-28", "recurring": False, "emoji": "🎬", "theme": "cultura"},
    {"key": "folio_obidos",      "title": "FOLIO",                      "subtitle": "Óbidos · Festival Literário Internacional",                "category": "cultura",      "region": "centro",   "city": "Óbidos",        "date_iso": "2026-10-08", "end_iso": "2026-10-18", "recurring": False, "emoji": "📕", "theme": "cultura"},
    {"key": "jardins_pl",        "title": "Festival Internacional de Jardins", "subtitle": "Ponte de Lima · jardins efémeros de autor",        "category": "cultura",      "region": "norte",    "city": "Ponte de Lima", "date_iso": "2026-05-30", "end_iso": "2026-10-31", "recurring": False, "emoji": "🌿", "theme": "cultura"},
    {"key": "encontros_imagem",  "title": "Encontros da Imagem",        "subtitle": "Braga · festival internacional de fotografia",             "category": "cultura",      "region": "norte",    "city": "Braga",         "date_iso": "2026-09-18", "end_iso": "2026-10-25", "recurring": False, "emoji": "📷", "theme": "cultura"},
    {"key": "bienal_cerveira",   "title": "Bienal de Arte de Cerveira", "subtitle": "Vila Nova de Cerveira · arte contemporânea",               "category": "cultura",      "region": "norte",    "city": "Vila Nova de Cerveira", "date_iso": "2026-07-18", "end_iso": "2026-09-19", "recurring": False, "emoji": "🖼️", "theme": "cultura"},
    {"key": "comic_con_pt",      "title": "Comic Con Portugal",         "subtitle": "Exponor · cultura pop, banda desenhada, gaming",           "category": "cultura",      "region": "porto",    "city": "Matosinhos",    "date_iso": "2026-09-10", "end_iso": "2026-09-13", "recurring": False, "emoji": "🦸", "theme": "festa",   "url": "https://www.comic-con-portugal.com"},
    {"key": "lisbon_book_fair_in","title": "Festival Silêncio",          "subtitle": "Lisboa · literatura, palco e cinema na rua",               "category": "cultura",      "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-09-17", "end_iso": "2026-09-20", "recurring": False, "emoji": "📚", "theme": "cultura"},
    {"key": "fic_estoril",       "title": "FOLLIA · Festival de Literatura do Estoril","subtitle": "Cascais e Estoril · escritores internacionais","category": "cultura",      "region": "lisboa",   "city": "Cascais",       "date_iso": "2026-05-08", "end_iso": "2026-05-17", "recurring": False, "emoji": "✒️", "theme": "cultura"},
    {"key": "dia_fado",          "title": "Dia Mundial do Fado",        "subtitle": "16 de setembro · concertos por toda a cidade",             "category": "cultura",      "region": "all",      "date_iso": "2026-09-16", "recurring": True,  "emoji": "🎙️", "theme": "saudade"},
    {"key": "dia_poesia",        "title": "Dia Mundial da Poesia",      "subtitle": "21 de março · leituras públicas",                          "category": "cultura",      "region": "all",      "date_iso": "2026-03-21", "recurring": True,  "emoji": "✍️", "theme": "cultura"},
    {"key": "lisbon_design",     "title": "Lisbon Design Week",         "subtitle": "Cidade aberta a estúdios e instalações de autor",          "category": "cultura",      "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-05-27", "end_iso": "2026-05-31", "recurring": False, "emoji": "🎨", "theme": "cultura"},
    {"key": "porto_design_bie",  "title": "Porto Design Biennale",      "subtitle": "Bienal · curadoria europeia",                              "category": "cultura",      "region": "porto",    "city": "Porto",         "date_iso": "2026-09-26", "end_iso": "2026-12-13", "recurring": False, "emoji": "🛋️", "theme": "cultura"},
]

# ---------------------------------------------------------------------------
# GASTRONOMIA — festivais alimentares pelos quatro cantos
# ---------------------------------------------------------------------------
GASTRONOMY_2026 = [
    {"key": "fum_montalegre",    "title": "Feira do Fumeiro de Montalegre","subtitle": "Barroso · porco preto e enchidos do Norte",            "category": "gastronomia",  "region": "norte",    "city": "Montalegre",    "date_iso": "2026-01-23", "end_iso": "2026-01-25", "recurring": False, "emoji": "🥓", "theme": "tasca"},
    {"key": "fum_vinhais",       "title": "Feira do Fumeiro de Vinhais","subtitle": "Trás-os-Montes · maior feira de fumeiro do país",          "category": "gastronomia",  "region": "norte",    "city": "Vinhais",       "date_iso": "2026-02-12", "end_iso": "2026-02-15", "recurring": False, "emoji": "🐖", "theme": "tasca"},
    {"key": "savel_lampreia",    "title": "Festival do Sável e da Lampreia", "subtitle": "Coruche · sabores do Tejo · março/abril",              "category": "gastronomia",  "region": "centro",   "city": "Coruche",       "date_iso": "2026-03-13", "end_iso": "2026-03-22", "recurring": False, "emoji": "🐟", "theme": "tasca"},
    {"key": "chocolate_obidos",  "title": "Festival Internacional de Chocolate", "subtitle": "Óbidos · esculturas e provas dentro da vila",         "category": "gastronomia",  "region": "centro",   "city": "Óbidos",        "date_iso": "2026-03-26", "end_iso": "2026-04-12", "recurring": False, "emoji": "🍫", "theme": "tasca"},
    {"key": "atum_vrsa",         "title": "Festival do Atum",           "subtitle": "Vila Real de Stº António · pesca e cozinha do sotavento",   "category": "gastronomia",  "region": "algarve",  "city": "Vila Real de Stº António", "date_iso": "2026-05-21", "end_iso": "2026-05-24", "recurring": False, "emoji": "🐟", "theme": "praia"},
    {"key": "bacalhau_ilhavo",   "title": "Festival do Bacalhau à Moda de Ílhavo", "subtitle": "Ílhavo · gastronomia bacalhoeira e mar",                "category": "gastronomia",  "region": "centro",   "city": "Ílhavo",        "date_iso": "2026-08-08", "end_iso": "2026-08-16", "recurring": False, "emoji": "🐟", "theme": "tasca"},
    {"key": "sardinha_portimao", "title": "Festival da Sardinha",       "subtitle": "Portimão · zona ribeirinha em modo brasa",                 "category": "gastronomia",  "region": "algarve",  "city": "Portimão",      "date_iso": "2026-08-06", "end_iso": "2026-08-10", "recurring": False, "emoji": "🐟", "theme": "praia"},
    {"key": "polvo_santa_luzia", "title": "Festival do Polvo",          "subtitle": "Santa Luzia · capital do polvo · Tavira",                   "category": "gastronomia",  "region": "algarve",  "city": "Tavira",        "date_iso": "2026-09-04", "end_iso": "2026-09-06", "recurring": False, "emoji": "🐙", "theme": "praia"},
    {"key": "pao_mafra",         "title": "Festival do Pão",            "subtitle": "Mafra · padaria tradicional e fornos a lenha",              "category": "gastronomia",  "region": "lisboa",   "city": "Mafra",         "date_iso": "2026-09-25", "end_iso": "2026-09-27", "recurring": False, "emoji": "🍞", "theme": "tasca"},
    {"key": "porco_bisaro",      "title": "Festival do Porco Bísaro",   "subtitle": "Boticas · raça autóctone do Barroso",                       "category": "gastronomia",  "region": "norte",    "city": "Boticas",       "date_iso": "2026-09-18", "end_iso": "2026-09-20", "recurring": False, "emoji": "🐗", "theme": "tasca"},
    {"key": "castanha_marvao",   "title": "Festival da Castanha de Marvão", "subtitle": "Marvão · castanha do Alentejo no alto da serra",          "category": "gastronomia",  "region": "alentejo", "city": "Marvão",        "date_iso": "2026-11-13", "end_iso": "2026-11-15", "recurring": False, "emoji": "🌰", "theme": "tasca"},
    {"key": "castanha_trancoso", "title": "Festival da Castanha de Trancoso", "subtitle": "Trancoso · serra da Estrela em modo magusto",            "category": "gastronomia",  "region": "centro",   "city": "Trancoso",      "date_iso": "2026-11-01", "end_iso": "2026-11-08", "recurring": False, "emoji": "🌰", "theme": "tasca"},
    {"key": "doce_nazare",       "title": "Festival de Doçaria Conventual", "subtitle": "Alcobaça · pastéis dos mosteiros e conventos",            "category": "gastronomia",  "region": "centro",   "city": "Alcobaça",      "date_iso": "2026-11-20", "end_iso": "2026-11-22", "recurring": False, "emoji": "🍮", "theme": "tasca"},
    {"key": "festa_caracol",     "title": "Festa do Caracol",           "subtitle": "Algarve e Alentejo · sazão à porta de São João",            "category": "gastronomia",  "region": "algarve",  "city": "Várias",        "date_iso": "2026-06-15", "end_iso": "2026-07-31", "recurring": False, "emoji": "🐌", "theme": "tasca"},
    {"key": "festa_borrego",     "title": "Festival do Borrego",        "subtitle": "Nisa · Páscoa alentejana à mesa",                           "category": "gastronomia",  "region": "alentejo", "city": "Nisa",          "date_iso": "2026-04-02", "end_iso": "2026-04-05", "recurring": False, "emoji": "🐑", "theme": "tasca"},
    {"key": "feira_mel_borneses","title": "Festival do Mel e da Castanha", "subtitle": "Macedo de Cavaleiros · doces da Terra Quente",            "category": "gastronomia",  "region": "norte",    "city": "Macedo de Cavaleiros", "date_iso": "2026-11-06", "end_iso": "2026-11-08", "recurring": False, "emoji": "🍯", "theme": "tasca"},
]

# ---------------------------------------------------------------------------
# FEIRAS — comerciais, medievais, do livro, do cavalo
# ---------------------------------------------------------------------------
FAIRS_2026 = [
    {"key": "fil_lisboa",        "title": "FIL · Feira Internacional de Lisboa", "subtitle": "Parque das Nações · agenda inteira do ano (vários eventos)",    "category": "feira",        "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-02-01", "recurring": True, "emoji": "🏗️", "theme": "tasca"},
    {"key": "feira_cavalo_gole", "title": "Feira Nacional do Cavalo",   "subtitle": "Golegã · São Martinho e cavalo lusitano",                  "category": "feira",        "region": "centro",   "city": "Golegã",        "date_iso": "2026-11-04", "end_iso": "2026-11-15", "recurring": False, "emoji": "🐎", "theme": "tasca"},
    {"key": "fatacil_lagoa",     "title": "FATACIL",                    "subtitle": "Lagoa · feira de artesanato, turismo, agricultura",         "category": "feira",        "region": "algarve",  "city": "Lagoa",         "date_iso": "2026-08-13", "end_iso": "2026-08-23", "recurring": False, "emoji": "🛍️", "theme": "praia"},
    {"key": "feira_sta_iria",    "title": "Feira de Santa Iria",        "subtitle": "Faro · maior feira tradicional do Algarve",                 "category": "feira",        "region": "algarve",  "city": "Faro",          "date_iso": "2026-10-15", "end_iso": "2026-10-25", "recurring": False, "emoji": "🎡", "theme": "praia"},
    {"key": "feira_medieval_silves","title": "Feira Medieval de Silves","subtitle": "Castelo de Silves · cortejos e tabernas medievais",         "category": "feira",        "region": "algarve",  "city": "Silves",        "date_iso": "2026-08-08", "end_iso": "2026-08-16", "recurring": False, "emoji": "🏰", "theme": "cultura"},
    {"key": "feira_medieval_obi","title": "Mercado Medieval de Óbidos",  "subtitle": "Vila amuralhada em modo medieval",                          "category": "feira",        "region": "centro",   "city": "Óbidos",        "date_iso": "2026-07-23", "end_iso": "2026-08-02", "recurring": False, "emoji": "⚔️", "theme": "cultura"},
    {"key": "feira_castro_marim","title": "Dias Medievais de Castro Marim", "subtitle": "Castro Marim · 4 dias dentro do castelo",                "category": "feira",        "region": "algarve",  "city": "Castro Marim",  "date_iso": "2026-08-26", "end_iso": "2026-08-30", "recurring": False, "emoji": "🛡️", "theme": "cultura"},
    {"key": "feira_franca_alma","title": "Feira Franca de Almada",       "subtitle": "Cacilhas · gastronomia, animação e doçaria conventual",     "category": "feira",        "region": "lisboa",   "city": "Almada",        "date_iso": "2026-06-12", "end_iso": "2026-06-21", "recurring": False, "emoji": "🎈", "theme": "tasca"},
    {"key": "feira_livro_coim",  "title": "Feira do Livro de Coimbra",  "subtitle": "Avenida Sá da Bandeira · três semanas de livro",            "category": "feira",        "region": "centro",   "city": "Coimbra",       "date_iso": "2026-07-04", "end_iso": "2026-07-19", "recurring": False, "emoji": "📚", "theme": "cultura"},
    {"key": "feira_livro_braga", "title": "Feira do Livro de Braga",    "subtitle": "Avenida Central · entre Sé e Universidade",                 "category": "feira",        "region": "norte",    "city": "Braga",         "date_iso": "2026-06-12", "end_iso": "2026-06-28", "recurring": False, "emoji": "📖", "theme": "cultura"},
    {"key": "ovinis_serpa",      "title": "Ovibeja · Queijo Serpa",     "subtitle": "Queijo de Serpa DOP · prova oficial",                       "category": "feira",        "region": "alentejo", "city": "Serpa",         "date_iso": "2026-02-27", "end_iso": "2026-03-01", "recurring": False, "emoji": "🧀", "theme": "tasca"},
]

# ---------------------------------------------------------------------------
# DESPORTO — provas com calendário fixo e identidade nacional
# ---------------------------------------------------------------------------
SPORTS_2026 = [
    {"key": "meia_lisboa",       "title": "Meia Maratona de Lisboa",    "subtitle": "Ponte 25 de Abril · uma das mais rápidas do mundo",         "category": "desporto",     "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-03-08", "recurring": False, "emoji": "🏃", "theme": "festa"},
    {"key": "maratona_lisboa",   "title": "EDP Maratona de Lisboa",     "subtitle": "Ponte Vasco da Gama · 42,195 km à beira-Tejo",              "category": "desporto",     "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-10-11", "recurring": False, "emoji": "🥇", "theme": "festa"},
    {"key": "maratona_porto",    "title": "Maratona do Porto",          "subtitle": "Largada na Foz do Douro · paisagem ribeirinha",             "category": "desporto",     "region": "porto",    "city": "Porto",         "date_iso": "2026-11-08", "recurring": False, "emoji": "🥈", "theme": "festa"},
    {"key": "rally_portugal",    "title": "WRC Rally de Portugal",      "subtitle": "Matosinhos · etapa europeia do Mundial de Ralis",           "category": "desporto",     "region": "porto",    "city": "Matosinhos",    "date_iso": "2026-05-14", "end_iso": "2026-05-17", "recurring": False, "emoji": "🏎️", "theme": "festa"},
    {"key": "estoril_open",      "title": "Millennium Estoril Open",    "subtitle": "Estádio Nacional · ATP 250 em terra batida",                "category": "desporto",     "region": "lisboa",   "city": "Estoril",       "date_iso": "2026-04-04", "end_iso": "2026-04-12", "recurring": False, "emoji": "🎾", "theme": "festa"},
    {"key": "volta_portugal",    "title": "Volta a Portugal em Bicicleta", "subtitle": "Pelotão atravessa o país de norte a sul",                  "category": "desporto",     "region": "all",      "city": "Várias",        "date_iso": "2026-08-05", "end_iso": "2026-08-16", "recurring": False, "emoji": "🚴", "theme": "festa"},
    {"key": "nazare_tow",        "title": "Nazaré Tow Surfing Challenge","subtitle": "Praia do Norte · ondas gigantes (sazonal · out a mar)",     "category": "desporto",     "region": "centro",   "city": "Nazaré",        "date_iso": "2026-10-15", "end_iso": "2027-03-15", "recurring": False, "emoji": "🏄", "theme": "praia"},
    {"key": "ericeira_pro",      "title": "WSL Ericeira Pro",           "subtitle": "Ribeira d'Ilhas · etapa do circuito mundial de surf",       "category": "desporto",     "region": "lisboa",   "city": "Ericeira",      "date_iso": "2026-10-02", "end_iso": "2026-10-11", "recurring": False, "emoji": "🌊", "theme": "praia"},
    {"key": "final_taca_pt",     "title": "Final da Taça de Portugal",  "subtitle": "Estádio Nacional do Jamor · futebol e cravo",               "category": "desporto",     "region": "lisboa",   "city": "Oeiras",        "date_iso": "2026-05-24", "recurring": False, "emoji": "⚽", "theme": "festa"},
    {"key": "gpfortuna_estoril", "title": "Grande Prémio do Estoril ·  Motociclismo", "subtitle": "Autódromo do Estoril · clássico do verão",            "category": "desporto",     "region": "lisboa",   "city": "Estoril",       "date_iso": "2026-07-25", "end_iso": "2026-07-26", "recurring": False, "emoji": "🏁", "theme": "festa"},
]

# ---------------------------------------------------------------------------
# DATAS CÍVICAS / POPULARES — vivem na agenda emocional do país
# ---------------------------------------------------------------------------
CIVIC_DAYS = [
    {"key": "dia_saudade",       "title": "Dia da Saudade",             "subtitle": "30 de janeiro · palavra intraduzível",                      "category": "civico",       "region": "all",      "date_iso": "2026-01-30", "recurring": True, "emoji": "🌫️", "theme": "saudade"},
    {"key": "dia_namorados",     "title": "Dia dos Namorados",          "subtitle": "São Valentim · 14 de fevereiro",                            "category": "civico",       "region": "all",      "date_iso": "2026-02-14", "recurring": True, "emoji": "💌", "theme": "festa"},
    {"key": "dia_mulher",        "title": "Dia Internacional da Mulher","subtitle": "8 de março",                                                "category": "civico",       "region": "all",      "date_iso": "2026-03-08", "recurring": True, "emoji": "♀️", "theme": "cultura"},
    {"key": "dia_pai",           "title": "Dia do Pai",                 "subtitle": "São José · 19 de março",                                    "category": "civico",       "region": "all",      "date_iso": "2026-03-19", "recurring": True, "emoji": "👨‍👧", "theme": "saudade"},
    {"key": "dia_mae",           "title": "Dia da Mãe",                 "subtitle": "1.º domingo de maio · 3 de maio em 2026",                   "category": "civico",       "region": "all",      "date_iso": "2026-05-03", "recurring": False, "emoji": "👩‍👧", "theme": "saudade"},
    {"key": "dia_crianca",       "title": "Dia da Criança",             "subtitle": "1 de junho · arraial e parques cheios",                     "category": "civico",       "region": "all",      "date_iso": "2026-06-01", "recurring": True, "emoji": "🎈", "theme": "festa"},
    {"key": "lisbon_pride",      "title": "Arraial Lisboa Pride",       "subtitle": "Terreiro do Paço · marcha e arraial LGBTI+",                "category": "civico",       "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-06-20", "recurring": False, "emoji": "🏳️‍🌈", "theme": "festa"},
    {"key": "dia_avos",          "title": "Dia dos Avós",               "subtitle": "26 de julho · S. Joaquim e Sant'Ana",                       "category": "civico",       "region": "all",      "date_iso": "2026-07-26", "recurring": True, "emoji": "🧓", "theme": "saudade"},
    {"key": "halloween_pt",      "title": "Dia das Bruxas",             "subtitle": "31 de outubro · pão por Deus, doces ou travessuras",        "category": "civico",       "region": "all",      "date_iso": "2026-10-31", "recurring": True, "emoji": "🎃", "theme": "festa"},
    {"key": "pao_por_deus",      "title": "Pão por Deus",               "subtitle": "1 de novembro · costume das aldeias do Centro",             "category": "civico",       "region": "all",      "date_iso": "2026-11-01", "recurring": True, "emoji": "🥖", "theme": "saudade"},
]

# ---------------------------------------------------------------------------
# RITMO DE NATAL — mercados, vilas, espetáculos de fim de ano
# ---------------------------------------------------------------------------
CHRISTMAS_TRAIL_2026 = [
    {"key": "obidos_vila_natal", "title": "Óbidos Vila Natal",          "subtitle": "Vila inteira em modo aldeia natalícia",                     "category": "sazonal",      "region": "centro",   "city": "Óbidos",        "date_iso": "2026-11-27", "end_iso": "2026-12-30", "recurring": False, "emoji": "🎅", "theme": "festa"},
    {"key": "perlim_sma_feira",  "title": "Perlim",                     "subtitle": "Santa Maria da Feira · maior parque de Natal do país",      "category": "sazonal",      "region": "norte",    "city": "Santa Maria da Feira", "date_iso": "2026-11-28", "end_iso": "2026-12-30", "recurring": False, "emoji": "🎄", "theme": "festa"},
    {"key": "wonderland_lx",     "title": "Wonderland Lisboa",          "subtitle": "Parque Eduardo VII · roda gigante, pista, mercado",         "category": "sazonal",      "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-11-28", "end_iso": "2026-12-30", "recurring": False, "emoji": "🎡", "theme": "festa"},
    {"key": "vila_natal_setubal","title": "Vila Natal Setúbal",         "subtitle": "Avenida Luísa Todi em luzes",                               "category": "sazonal",      "region": "lisboa",   "city": "Setúbal",       "date_iso": "2026-12-05", "end_iso": "2026-12-30", "recurring": False, "emoji": "💡", "theme": "festa"},
    {"key": "fim_ano_funchal",   "title": "Fim de Ano no Funchal",      "subtitle": "Espetáculo pirotécnico no anfiteatro natural da baía",      "category": "festa_cidade", "region": "madeira",  "city": "Funchal",       "date_iso": "2026-12-31", "recurring": True,  "emoji": "🎆", "theme": "orgulho"},
    {"key": "passagem_porto",    "title": "Passagem de Ano · Avenida dos Aliados", "subtitle": "Porto · réveillon com concertos e fogo",                  "category": "festa_cidade", "region": "porto",    "city": "Porto",         "date_iso": "2026-12-31", "recurring": True,  "emoji": "🎇", "theme": "festa"},
    {"key": "passagem_lx",       "title": "Passagem de Ano · Terreiro do Paço", "subtitle": "Lisboa · concertos e fogo de artifício sobre o Tejo",     "category": "festa_cidade", "region": "lisboa",   "city": "Lisboa",        "date_iso": "2026-12-31", "recurring": True,  "emoji": "🎆", "theme": "festa"},
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
    out.extend(CARNIVALS_2026)
    out.extend(POPULAR_FEASTS)
    out.extend(MUNICIPAL_DAYS)
    out.extend(MORE_MUSIC_FESTIVALS_2026)
    out.extend(MORE_CULTURE_2026)
    out.extend(GASTRONOMY_2026)
    out.extend(FAIRS_2026)
    out.extend(SPORTS_2026)
    out.extend(CIVIC_DAYS)
    out.extend(CHRISTMAS_TRAIL_2026)
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
    "gastronomia":      {"label": "Gastronomia",         "emoji": "🍽️", "color": "#A8324A"},
    "desporto":         {"label": "Desporto",            "emoji": "🏃", "color": "#1F6FB2"},
    "civico":           {"label": "Datas Cívicas",       "emoji": "✊", "color": "#4A4A4A"},
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
