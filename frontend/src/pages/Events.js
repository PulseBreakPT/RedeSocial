import { useEffect, useMemo, useState } from "react";
import { Plus, CalendarDays, MapPin, X, Share2, Search, Users as UsersIcon } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { EVENT_CATEGORIES, categoryLabel } from "../lib/portuguese";
import { toast } from "sonner";

function fmtDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const WHEN_TABS = [
    { key: "upcoming", label: "Próximos" },
    { key: "week", label: "Esta semana" },
    { key: "month", label: "Este mês" },
    { key: "past", label: "Passados" },
];

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [when, setWhen] = useState("upcoming");
    const [cat, setCat] = useState("");
    const [q, setQ] = useState("");
    const [form, setForm] = useState({ title: "", description: "", location: "", starts_at: "", category: "festa" });

    const load = () => {
        setLoading(true);
        const params = new URLSearchParams({ when });
        if (cat) params.set("category", cat);
        api.get(`/events?${params}`).then((r) => { setEvents(r.data); setLoading(false); });
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [when, cat]);

    const filtered = useMemo(() => {
        if (!q.trim()) return events;
        const n = q.toLowerCase();
        return events.filter((e) => (e.title + " " + (e.location || "") + " " + (e.description || "")).toLowerCase().includes(n));
    }, [events, q]);

    const attend = async (id) => { try { await api.post(`/events/${id}/attend`); load(); } catch (e) { toast.error(formatApiError(e)); } };
    const share = async (e) => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/events`); toast.success("Link copiado"); }
        catch { toast.error("Não consegui copiar"); }
    };
    const create = async (e) => {
        e.preventDefault();
        try { const iso = new Date(form.starts_at).toISOString(); await api.post("/events", { ...form, starts_at: iso }); toast.success("Evento criado"); setCreating(false); setForm({ title: "", description: "", location: "", starts_at: "", category: "festa" }); load(); }
        catch (err) { toast.error(formatApiError(err)); }
    };

    return (
        <div data-testid="events-page">
            <PageHeader
                title="Eventos"
                subtitle={`${events.length} eventos`}
                testid="events-header"
                action={<button onClick={() => setCreating(true)} data-testid="new-event-btn" className="btn-obsidian px-4 py-2 text-[11px] flex items-center gap-1.5"><Plus size={13} /> Criar</button>}
            >
                <div className="px-3 lg:px-4 pb-2 flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar eventos..." data-testid="events-search" className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition" />
                        {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                    </div>
                </div>
                <div className="px-3 lg:px-4 flex gap-1 overflow-x-auto scrollbar-hide hairline-t pt-2">
                    {WHEN_TABS.map((t) => (
                        <button key={t.key} onClick={() => setWhen(t.key)} data-testid={`events-when-${t.key}`} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition ${when === t.key ? "tab-grad-on" : "border-transparent text-black hover:text-black"}`}>{t.label}</button>
                    ))}
                </div>
                <div className="px-3 lg:px-4 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setCat("")} className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-medium ${cat === "" ? "chip-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}>Todas</button>
                    {EVENT_CATEGORIES.map((c) => (
                        <button key={c.key} onClick={() => setCat(c.key)} data-testid={`events-cat-${c.key}`} className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium ${cat === c.key ? "chip-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}>
                            <span>{c.emoji}</span> {c.label}
                        </button>
                    ))}
                </div>
            </PageHeader>

            {creating && (
                <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end lg:items-center lg:justify-center p-0 lg:p-4" onClick={() => setCreating(false)}>
                    <form onSubmit={create} onClick={(e) => e.stopPropagation()} className="w-full lg:max-w-md bg-white border-t lg:border border-black/[0.08] rounded-t-3xl lg:rounded-2xl p-6 lg:p-7 space-y-5 anim-sheet-up lg:anim-fade-up pb-safe max-h-[90vh] overflow-y-auto scroll-mom" data-testid="create-event-form">
                        <div className="lg:hidden flex justify-center -mt-2 mb-1"><span className="w-10 h-1 rounded-full bg-black/15" /></div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="type-overline mb-1">Novo evento</p>
                                <h2 className="font-display text-[28px] tracking-tight leading-none text-black">Evento</h2>
                            </div>
                            <button type="button" onClick={() => setCreating(false)} className="hidden lg:grid w-9 h-9 rounded-full place-items-center hover:bg-black/[0.04] text-black/55"><X size={16} /></button>
                        </div>
                        <div>
                            <label className="type-overline">Título</label>
                            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} maxLength={80} data-testid="event-title-input" className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition" />
                        </div>
                        <div>
                            <label className="type-overline">Categoria</label>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {EVENT_CATEGORIES.map((c) => (
                                    <button key={c.key} type="button" onClick={() => setForm({ ...form, category: c.key })} className={`px-2.5 py-2 rounded-xl text-[12px] font-medium border transition ${form.category === c.key ? "chip-on border-transparent" : "bg-white border-black/[0.10] text-black/70 hover:border-black/30"}`}>
                                        <span className="mr-1">{c.emoji}</span>{c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="type-overline">Quando</label>
                            <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required data-testid="event-date-input" className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition text-black" />
                        </div>
                        <div>
                            <label className="type-overline">Local</label>
                            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={120} data-testid="event-location-input" placeholder="Onde se vai realizar?" className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition" />
                        </div>
                        <div>
                            <label className="type-overline">Descrição</label>
                            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={400} rows={3} data-testid="event-description-input" className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none" />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] text-black/60 hover:bg-black/[0.04]">Cancelar</button>
                            <button type="submit" data-testid="submit-event-btn" className="btn-obsidian px-5 py-2.5 text-[11px]">Criar</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : filtered.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <CalendarDays size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem eventos</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Nenhum evento neste filtro</h3>
                    <p className="text-black/55 text-sm mt-2">Cria o primeiro para reunir a comunidade.</p>
                </div>
            ) : (
                <div>
                    {filtered.map((e) => (
                        <div key={e.id} className="px-4 lg:px-5 py-5 hairline-b hover:bg-black/[0.015] transition" data-testid={`event-${e.id}`}>
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl silver-grad text-black flex-shrink-0 shadow-sm">
                                    <span className="font-mono text-[9px] uppercase tracking-widest text-black/55">{new Date(e.starts_at).toLocaleString("pt-PT", { month: "short" })}</span>
                                    <span className="font-display text-[22px] leading-none">{new Date(e.starts_at).getDate()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-display text-[22px] tracking-tight truncate leading-tight text-black">{e.title}</h3>
                                    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/50 mt-2 flex-wrap">
                                        <span className="flex items-center gap-1"><CalendarDays size={11} /> {fmtDate(e.starts_at)}</span>
                                        {e.location && (<span className="flex items-center gap-1"><MapPin size={11} /> {e.location}</span>)}
                                        <span className="bg-black/[0.05] px-1.5 py-0.5 rounded text-black/65 normal-case tracking-normal">{categoryLabel(EVENT_CATEGORIES, e.category)}</span>
                                    </div>
                                    {e.description && <p className="mt-2 text-[14px] text-black/70 line-clamp-2 leading-relaxed">{e.description}</p>}
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        {e.creator && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-black/50 font-mono">
                                                <Avatar user={e.creator} size={18} /> @{e.creator.username}
                                            </div>
                                        )}
                                        <span className="text-black/20">·</span>
                                        <span className="text-[11px] font-mono text-black/55 inline-flex items-center gap-1"><UsersIcon size={11} /> {e.attendees_count} confirmados</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <button onClick={() => attend(e.id)} data-testid={`attend-${e.id}`} className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-4 py-2 transition active:scale-95 ${e.attending ? "chip-on" : "btn-obsidian"}`}>
                                        {e.attending ? "Vou" : "Participar"}
                                    </button>
                                    <button onClick={() => share(e)} title="Partilhar" data-testid={`event-share-${e.id}`} className="w-full text-[10px] font-mono uppercase tracking-[0.14em] text-black hover:text-black inline-flex items-center justify-center gap-1">
                                        <Share2 size={11} /> partilhar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
