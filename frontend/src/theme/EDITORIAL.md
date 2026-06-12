# LUSORAE EDITORIAL — Design System

> Design system oficial da app. Nasceu na landing page (`/`) e foi estendido a
> todas as rotas em junho de 2026, substituindo por completo o antigo estilo
> **"fanzine PT"** (bordas grossas 2.5–3px, sombras offset `4px 4px 0`, stickers
> rodados, doodles, fontes manuscritas).

## Ficheiros-fonte

| Ficheiro | Papel |
|---|---|
| `src/theme/editorial.js` | Tokens (`PT`), primitivas de estilo (`ED`), semântica (`SEMANTIC`) |
| `src/components/editorial/Primitives.js` | Sticker, StampCircle, PosterCard, Kicker, Highlight |
| `src/components/PageShell.js` | PageShell, PageHero, PageSection, Chip, FilterBar, Empty |
| `src/index.css` | Classes globais (`.card-lux`, `.btn-obsidian`, `.btn-silver`, `.lusorae-*`, legal-viz) |
| `src/pages/auth/AuthLayout.js` | Shell e primitives das páginas de auth (importa `PT` do tema) |

## Princípios

1. **Fundos claros** — branco puro, `paper` `#F7F5EF`, `cream` `#FBFAF6`.
   Ink `#0A0A0A` apenas em CTAs, navegação ativa e bandas editoriais.
2. **Hairlines** — bordas `1px solid rgba(10,10,10,0.08–0.14)`. Nunca molduras ink grossas.
3. **Profundidade difusa** — sombras multi-camada (`ED.cardShadow`, `ED.softShadow`,
   `ED.ctaShadow`). Nunca sombras offset duras.
4. **Pills & raios generosos** — 999px em botões/chips, 16–24px em cards.
5. **Tipografia Inter** — headlines `font-black tracking-[-0.03em+]`; kickers
   `font-mono uppercase letterSpacing 0.20em` (com dot pulse opcional);
   corpo `font-medium rgba(10,10,10,0.62)`.
6. **Cor portuguesa em acentos** — red/gold/green/azul da bandeira + paleta
   funcional (`telha`, `brasa`, `peixe`, `eucalipto`, `malva`, `laranja`, `atl`,
   `fado`) para reações, badges, moods e notificações. Cor nunca como moldura.
7. **Micro-interações** — hover `translateY(-1px)`, transições ~200ms,
   magnetic CTAs (landing), `lusorae-pulse` para live dots.

## Tokens principais (`PT`)

```
ink #0A0A0A · paper #F7F5EF · cream #FBFAF6 · red #C8102E
gold #FFCC29 · green #046A38 · azul #003F87
```

## Receitas

- **Card**: `background:#fff; border: ED.hairline; borderRadius:16–24; boxShadow: ED.cardShadow`
- **CTA primário**: pill `ED.inkGradient` + texto branco + `ED.ctaShadow`
- **Botão secundário**: pill branca + `ED.border`
- **Chip/tab ativo**: pill `ED.chipGradient` (ou ink sólido) + texto branco
- **Kicker**: mono 10.5–11px uppercase `0.20em` + dot pulse colorido
- **Sticky bars**: `rgba(247,245,239,0.92)` + `backdrop-blur` + hairline inferior

## Rotas migradas (jun 2026)

Feed, Notificações, Perfil (+ sub-componentes), Definições (+ todos os tabs),
Premium, Manifesto, Mensagens, Explorar, Calendário, Legal (índice + páginas),
componentes partilhados (sidebars, mobile bars, menus) e páginas de auth.
