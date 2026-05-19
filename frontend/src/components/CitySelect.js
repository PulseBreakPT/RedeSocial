import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, X, Check } from "lucide-react";
import { PT_CITIES, PT_REGIONS, searchCities, getCityById } from "../lib/pt_cities";

/**
 * Combobox de cidades portuguesas com:
 *   · pesquisa fuzzy (acentos ignorados, "olhao" → "Olhão")
 *   · agrupamento por região (Norte, Centro, Lisboa, Alentejo, Algarve, Madeira, Açores)
 *   · cartão cultural ao selecionar (alcunha + descrição PT-PT)
 *   · teclado (↑ ↓ Enter Esc)
 *
 * Props:
 *   value         id da cidade selecionada (string | null)
 *   onChange      (city|null) => void   recebe o objecto inteiro
 *   placeholder   string
 *   showCard      boolean (default true) — mostra cartão cultural
 *   compact       boolean (default false) — modo input curto sem cartão
 */
export function CitySelect({
    value,
    onChange,
    placeholder = "Pesquisa a tua cidade…",
    showCard = true,
    compact = false,
    testid = "city-select",
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    const wrapRef = useRef(null);

    const selected = useMemo(() => getCityById(value), [value]);

    const results = useMemo(() => searchCities(query, 60), [query]);

    // Group by region when no query
    const grouped = useMemo(() => {
        if (query.trim()) return null;
        const g = {};
        for (const c of results) {
            (g[c.region] = g[c.region] || []).push(c);
        }
        return PT_REGIONS.map(r => ({ ...r, cities: g[r.key] || [] })).filter(r => r.cities.length);
    }, [query, results]);

    // Click outside
    useEffect(() => {
        const onDoc = (e) => {
            if (!wrapRef.current?.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    // Keyboard nav
    const onKey = (e) => {
        if (!open) {
            if (e.key === "ArrowDown" || e.key === "Enter") {
                setOpen(true);
                e.preventDefault();
            }
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(results.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const c = results[active];
            if (c) {
                pick(c);
            }
        } else if (e.key === "Escape") {
            setOpen(false);
        }
    };

    const pick = (city) => {
        onChange?.(city);
        setQuery("");
        setOpen(false);
        setActive(0);
        inputRef.current?.blur();
    };

    const clear = () => {
        onChange?.(null);
        setQuery("");
        inputRef.current?.focus();
    };

    return (
        <div className="relative" ref={wrapRef} data-testid={testid}>
            {/* Input */}
            <div className={`relative group ${selected && !open ? "" : ""}`}>
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    {selected && !open ? (
                        <MapPin size={15} className="text-coral" />
                    ) : (
                        <Search size={15} className="text-black/40" />
                    )}
                </div>
                <input
                    ref={inputRef}
                    data-testid={`${testid}-input`}
                    type="text"
                    value={open ? query : (selected?.name || "")}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        setActive(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKey}
                    placeholder={placeholder}
                    className="vm-input"
                    style={{ paddingLeft: "2.25rem", paddingRight: "2.25rem" }}
                    autoComplete="off"
                    spellCheck={false}
                />
                {(selected || query) && (
                    <button
                        type="button"
                        onClick={clear}
                        data-testid={`${testid}-clear`}
                        className="absolute inset-y-0 right-2 px-1.5 text-black/35 hover:text-black/70"
                        aria-label="Limpar"
                        tabIndex={-1}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div
                    data-testid={`${testid}-dropdown`}
                    className="absolute z-30 left-0 right-0 mt-1.5 max-h-[280px] overflow-y-auto rounded-xl border border-black/[0.08] bg-white shadow-xl"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {results.length === 0 && (
                        <div className="px-4 py-6 text-center text-[12.5px] text-black/55">
                            Nenhuma cidade encontrada para <strong>“{query}”</strong>.
                        </div>
                    )}
                    {grouped ? (
                        grouped.map((group) => (
                            <div key={group.key}>
                                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-3 py-1.5 text-[10.5px] uppercase tracking-[0.12em] font-mono text-black/45 border-b border-black/[0.05]">
                                    {group.label}
                                </div>
                                {group.cities.map((c) => {
                                    const idx = results.indexOf(c);
                                    return (
                                        <CityRow
                                            key={c.id}
                                            city={c}
                                            active={idx === active}
                                            onPick={() => pick(c)}
                                            onHover={() => setActive(idx)}
                                        />
                                    );
                                })}
                            </div>
                        ))
                    ) : (
                        results.map((c, i) => (
                            <CityRow
                                key={c.id}
                                city={c}
                                active={i === active}
                                onPick={() => pick(c)}
                                onHover={() => setActive(i)}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Cultural card */}
            {!compact && showCard && selected && !open && (
                <div
                    data-testid={`${testid}-card`}
                    className="mt-3 rounded-xl border border-black/[0.08] bg-paper grain isolate p-4 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                    <div className="flex items-baseline gap-2">
                        <span aria-hidden className="silver-foil text-[15px] leading-none translate-y-0.5">◆</span>
                        <div className="flex-1">
                            <p className="font-display text-[18px] leading-tight tracking-tight text-black">
                                {selected.name},{" "}
                                <span className="silver-foil italic font-normal">{selected.nickname}</span>
                            </p>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-black/75">
                                {selected.description}
                            </p>
                            <p className="mt-2 text-[10.5px] uppercase tracking-[0.12em] font-mono text-black/45">
                                {selected.district} · {PT_REGIONS.find(r => r.key === selected.region)?.label || selected.region}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CityRow({ city, active, onPick, onHover }) {
    return (
        <button
            type="button"
            onClick={onPick}
            onMouseEnter={onHover}
            data-testid={`city-row-${city.id}`}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${
                active ? "bg-black/[0.05]" : "hover:bg-black/[0.03]"
            }`}
        >
            <MapPin size={13} className="text-black/40 shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[13.5px] font-medium text-black truncate">{city.name}</span>
                    <span className="text-[11px] text-black/45 truncate">— {city.nickname}</span>
                </div>
            </div>
            {active && <Check size={12} className="text-coral shrink-0" />}
        </button>
    );
}
