// =============================================================================
// LEGAL ENTITY — fonte única da verdade para identificação societária.
// Enquanto `pending: true`, os documentos mostram um aviso editorial indicando
// que os dados completos serão publicados em ato definitivo após constituição.
// Quando a sociedade for constituída e registada, preencher os campos abaixo
// e definir `pending: false` — o aviso desaparece automaticamente em todas as
// páginas (LegalIndex, Terms, Privacy).
//
// Base legal das menções obrigatórias:
//   - Art. 10.º DL 7/2004 (comércio eletrónico)
//   - Art. 11.º DSA (informação do prestador)
//   - Arts. 24.º e 171.º Código das Sociedades Comerciais
// =============================================================================

export const LEGAL_ENTITY = {
    name: "Lusorae",
    // Quando a sociedade estiver registada, preencher:
    fullName: null,        // ex.: "Lusorae, Lda."
    legalForm: null,       // ex.: "Sociedade por Quotas"
    nipc: null,            // ex.: "515 XXX XXX"
    address: null,         // ex.: "Rua ... , 1000-000 Lisboa, Portugal"
    registryCity: null,    // ex.: "Lisboa"
    registryNumber: null,  // ex.: "matrícula n.º XXX..."
    shareCapital: null,    // ex.: "€ 5.000"
    pending: true,         // true enquanto não houver matrícula definitiva
};

export const LEGAL_CONTACTS = {
    legal:      "legal@lusorae.pt",
    dpo:        "dpo@lusorae.pt",
    privacy:    "privacidade@lusorae.pt",
    report:     "reportar@lusorae.pt",
    appeal:     "recurso@lusorae.pt",
    abuse:      "abuso@lusorae.pt",
    press:      "imprensa@lusorae.pt",
    support:    "apoio@lusorae.pt",
    research:   "investigacao@lusorae.pt",
};
