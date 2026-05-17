/**
 * Global imperative confirm / prompt dialogs.
 *
 * Replaces native window.confirm / window.prompt with on-brand modals.
 * Usage:
 *   import { confirmDialog, promptDialog } from "@/components/ConfirmDialog";
 *
 *   const ok = await confirmDialog({
 *       title: "Apagar publicação?",
 *       description: "Esta ação não pode ser desfeita.",
 *       confirmText: "Apagar",
 *       danger: true,
 *   });
 *   if (!ok) return;
 *
 *   const name = await promptDialog({
 *       title: "Nova coleção",
 *       label: "Nome da coleção",
 *       placeholder: "Ex: Receitas favoritas",
 *       defaultValue: "",
 *   });
 *   if (name === null) return; // user cancelled
 *
 * Mount <ConfirmDialogHost /> once at the application root.
 */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const subscribers = new Set();

function emit(payload) {
    for (const fn of subscribers) fn(payload);
}

export function confirmDialog({
    title = "Confirmar",
    description = "",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    danger = false,
} = {}) {
    return new Promise((resolve) => {
        emit({
            type: "confirm",
            title,
            description,
            confirmText,
            cancelText,
            danger,
            resolve,
        });
    });
}

export function promptDialog({
    title = "Introduz um valor",
    description = "",
    label = "",
    placeholder = "",
    defaultValue = "",
    confirmText = "Guardar",
    cancelText = "Cancelar",
    multiline = false,
    maxLength = null,
    required = true,
} = {}) {
    return new Promise((resolve) => {
        emit({
            type: "prompt",
            title,
            description,
            label,
            placeholder,
            defaultValue,
            confirmText,
            cancelText,
            multiline,
            maxLength,
            required,
            resolve,
        });
    });
}

export function ConfirmDialogHost() {
    const [stack, setStack] = useState([]);
    const inputRef = useRef(null);
    const [tempValue, setTempValue] = useState("");

    useEffect(() => {
        const handler = (payload) => {
            setStack((prev) => [...prev, { ...payload, id: Math.random().toString(36).slice(2) }]);
            if (payload.type === "prompt") setTempValue(payload.defaultValue || "");
        };
        subscribers.add(handler);
        return () => subscribers.delete(handler);
    }, []);

    const top = stack[stack.length - 1];

    useEffect(() => {
        if (!top) return;
        if (top.type === "prompt") {
            setTempValue(top.defaultValue || "");
            setTimeout(() => inputRef.current?.focus(), 30);
        }
    }, [top?.id, top?.type, top?.defaultValue]);

    useEffect(() => {
        if (!top) return;
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                resolve(top.type === "prompt" ? null : false);
            } else if (e.key === "Enter" && top.type === "confirm") {
                e.preventDefault();
                resolve(true);
            } else if (e.key === "Enter" && top.type === "prompt" && !top.multiline) {
                e.preventDefault();
                handlePromptOk();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line
    }, [top?.id, tempValue]);

    const resolve = (val) => {
        if (!top) return;
        top.resolve(val);
        setStack((prev) => prev.slice(0, -1));
    };

    const handlePromptOk = () => {
        if (!top) return;
        const val = (tempValue || "").trim();
        if (top.required && !val) return;
        resolve(val);
    };

    if (!top) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
            data-testid="confirm-dialog-host"
            aria-modal="true"
            role="dialog"
        >
            <div
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
                onClick={() => resolve(top.type === "prompt" ? null : false)}
            />
            <div
                className="relative w-full sm:w-[420px] max-w-[92vw] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-black/[0.06] overflow-hidden animate-[fadeIn_0.15s_ease-out]"
                data-testid={top.type === "prompt" ? "prompt-dialog" : "confirm-dialog"}
            >
                <div className="px-5 pt-5 pb-3 flex items-start gap-3">
                    {top.danger && (
                        <div className="w-9 h-9 rounded-full bg-red-soft/10 grid place-items-center shrink-0 text-red-soft">
                            <AlertTriangle size={17} strokeWidth={1.8} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold text-[15.5px] tracking-tight text-black">
                            {top.title}
                        </div>
                        {top.description && (
                            <div className="text-[12.5px] text-black/60 leading-relaxed mt-1.5">
                                {top.description}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => resolve(top.type === "prompt" ? null : false)}
                        className="text-black/40 hover:text-black tap-shrink -mt-1"
                        aria-label="Fechar"
                    >
                        <X size={16} />
                    </button>
                </div>

                {top.type === "prompt" && (
                    <div className="px-5 pb-2">
                        {top.label && (
                            <label className="type-overline">{top.label}</label>
                        )}
                        {top.multiline ? (
                            <textarea
                                ref={inputRef}
                                value={tempValue}
                                maxLength={top.maxLength || undefined}
                                onChange={(e) => setTempValue(e.target.value)}
                                placeholder={top.placeholder}
                                rows={3}
                                className="vm-input mt-1.5 resize-none"
                                data-testid="prompt-input"
                            />
                        ) : (
                            <input
                                ref={inputRef}
                                value={tempValue}
                                maxLength={top.maxLength || undefined}
                                onChange={(e) => setTempValue(e.target.value)}
                                placeholder={top.placeholder}
                                className="vm-input mt-1.5"
                                data-testid="prompt-input"
                            />
                        )}
                        {top.maxLength && (
                            <div className="mt-1 text-right text-[10.5px] font-mono tabular-nums text-black/40">
                                {tempValue.length}/{top.maxLength}
                            </div>
                        )}
                    </div>
                )}

                <div className="px-5 py-4 flex items-center justify-end gap-2 bg-black/[0.015] border-t border-black/[0.04]">
                    <button
                        onClick={() => resolve(top.type === "prompt" ? null : false)}
                        className="px-4 py-2 rounded-full text-[12.5px] font-medium text-black/65 hover:text-black hover:bg-black/[0.04] tap-shrink"
                        data-testid="confirm-cancel"
                    >
                        {top.cancelText}
                    </button>
                    <button
                        onClick={() => (top.type === "prompt" ? handlePromptOk() : resolve(true))}
                        disabled={top.type === "prompt" && top.required && !(tempValue || "").trim()}
                        className={
                            "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-medium tap-shrink transition disabled:opacity-40 " +
                            (top.danger
                                ? "bg-red-soft text-white hover:bg-red-soft/90"
                                : "btn-obsidian")
                        }
                        data-testid="confirm-ok"
                    >
                        {top.confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
