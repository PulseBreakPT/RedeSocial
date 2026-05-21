import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// ─── Runtime secret-leak guard (defense-in-depth) ──────────────────────────
// Even though craco.config.js refuses to build when a REACT_APP_*SECRET is
// present, we also scrub any secret-named env at runtime so that if an
// attacker types `process.env` in DevTools, they cannot recover anything
// sensitive — only the public REACT_APP_BACKEND_URL remains.
//
// CRA inlines `process.env.REACT_APP_*` literals into the bundle, but the
// runtime `process.env` object on `window` is a thin shim — overwriting keys
// here doesn't change the inlined literals (those are gone before this code
// runs in prod builds), but it does delete any accidental runtime leakage.
try {
    const SECRET_NAME = /(SECRET|PRIVATE|SERVICE[_-]?ROLE|SK[_-]?LIVE|SK[_-]?TEST|STRIPE[_-]?SECRET|OPENAI|ANTHROPIC|GEMINI|FIREBASE[_-]?ADMIN|AWS[_-]?ACCESS|AWS[_-]?SECRET|JWT[_-]?SECRET|DATABASE[_-]?URL|SMTP[_-]?PASS|TWILIO[_-]?TOKEN|SENDGRID[_-]?KEY|WEBHOOK[_-]?SECRET|MONGO[_-]?URL)/i;
    if (typeof process !== "undefined" && process && process.env) {
        for (const k of Object.keys(process.env)) {
            if (SECRET_NAME.test(k)) {
                try { process.env[k] = undefined; } catch { /* sealed */ }
            }
        }
    }
} catch { /* never let security guard crash the app */ }

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
