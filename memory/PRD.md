# Lusorae — Product Requirements

## Original Problem Statement
- "Mostra a preview do meu site" — restaurar e mostrar preview da app
- "Remove textos relacionados a leis ou algoritmos, existem muitos na landingpage, login e registo sobre o usuário não ser tratado como algoritmo etc..." — Limpar a UI de jargão legal/algorítmico

## User Language
- Portuguese (PT-PT). Responder sempre em português.

## Architecture
- Frontend: React + Tailwind (Yarn, craco)
- Backend: FastAPI (uvicorn via supervisor)
- DB: MongoDB
- Pages relevantes: `Landing.js`, `Login.js`, `Register.js`
- Componente global: `components/CookieBanner.js`

## Implemented (Feb 2026)
- ✅ Ambiente restaurado (.env, deps, supervisor)
- ✅ `Landing.js` — removidos textos sobre RGPD/algoritmos/leis
- ✅ `Login.js` — removidos textos sobre RGPD/algoritmos/leis
- ✅ `Register.js` — removido disclaimer redundante no rodapé do form e jargão "Revogável a qualquer momento nas Definições" no consent marketing
- ✅ `CookieBanner.js` — texto humanizado, mantendo conformidade RGPD ("Os teus dados, à tua maneira" + redação simplificada)

## Backlog (Possible Next)
- P1: Auditar páginas internas (feed, perfil, definições) para o mesmo tom humano
- P1: Verificar `quem está à mesa` (linha sobreposta na Landing — pode ser intencional de design)
- P2: Confirmar copy do botão `Crjar conta` no Login (parece typo "Criar")
- P2: Microcopy unificada (kicker, stickers) entre as 3 páginas auth

## Notes
- Textos legais completos vivem em páginas dedicadas: `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/manifesto`, `/diretrizes` — NÃO devem aparecer em landing/auth.
- Compliance mínima mantida: checkbox de Termos + idade (RGPD obrigatório para registo).
