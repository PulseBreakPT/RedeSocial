import React from "react";
import { LogIn, KeySquare, ShieldOff, Bug } from "lucide-react";

export function SecurityMini({ data, onSelect }) {
    const rows = [
        { Icon: LogIn,     label: "Logins falhados", value: data?.logins_failed_24h, tone: "danger" },
        { Icon: KeySquare, label: "IPs bloqueados",  value: data?.unique_blocked_ips_24h, tone: "warn" },
        { Icon: ShieldOff, label: "Tokens revogados", value: data?.sessions_revoked_24h, tone: "info" },
        { Icon: Bug,       label: "Ataques bloqueados", value: data?.attacks_blocked_24h, tone: "danger" },
    ];
    const clickable = typeof onSelect === "function";
    const Tag = clickable ? "button" : "div";
    const wrapperProps = clickable
        ? { type: "button", onClick: onSelect, className: "ops-secmini--clickable", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }
        : { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } };
    return (
        <Tag {...wrapperProps}>
            {rows.map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        display: "grid", placeItems: "center",
                        background: `var(--ops-${r.tone}-tint)`,
                        color: `var(--ops-${r.tone}-700)`,
                    }}>
                        <r.Icon size={12} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 10.5, color: "var(--ops-text-faint)", fontFamily: "var(--ops-font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{r.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ops-text)", fontVariantNumeric: "tabular-nums" }}>{Number(r.value || 0).toLocaleString("pt-PT")}</div>
                    </div>
                </div>
            ))}
        </Tag>
    );
}

export default SecurityMini;
