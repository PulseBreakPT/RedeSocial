import { useEffect, useMemo, useState } from "react";
import { Plus, CalendarDays, MapPin, X, Share2, Search, Users as UsersIcon } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageShell, PageHero, FilterBar, Chip, Grid, Empty } from "../components/PageShell";
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

    const attend = async (id) => { try { await api.post(`/events/${id}/attend`); load(); } catch (e) { toastApiError(e); } };
    const share = async (e) => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/events`); toast.success("Link copiado"); }
        catch { toast.error("Não consegui copiar"); }
    };
    const create = async (e) => {
        e.preventDefault();
        try { const iso = new Date(form.starts_at).toISOString(); await api.post("/events", { ...form, starts_at: iso }); toast.success("Evento criado"); setCreating(false); setForm({ title: "", description: "", location: "", starts_at: "", category: "festa" }); load(); }
        catch (err) { toastApiError(err); }
    };

    return (
        <PageShell max="max-w-6xl">
            <PageHero
                icon={CalendarDays}
                title="Eventos"
                subtitle={`${events.length} eventos · do arraial ao fado, passa pela tasca`}
                actions={
                    <button onClick={() => setCreating(true)} data-testid="new-event-btn" className="btn-obsidian px-4 py-2 text-[11px] flex items-center gap-1.5">
                        <Plus size={13} /> Criar
                    </button>
                }
            />

            <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Pesquisar eventos..."
                        data-testid="events-search"
                        className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition"
                    />
                    {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                </div>
            </div>

            <FilterBar>
                {WHEN_TABS.map((t) => (
                    <Chip key={t.key} active={when === t.key} onClick={() => setWhen(t.key)} testid={`events-when-${t.key}`}>
                        {t.label}
                    </Chip>
                ))}
                <span className="text-black/15 mx-1">·</span>
                <Chip active={cat === ""} onClick={() => setCat("")}>Todas</Chip>
                {EVENT_CATEGORIES.map((c) => (
                    <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)} testid={`events-cat-${c.key}`}>
                        {c.emoji} {c.label}
                    </Chip>
                ))}
            </FilterBar>

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
                <Empty
                    icon={CalendarDays}
                    title="Nenhum evento neste filtro"
                    body="Cria o primeiro para reunir a comunidade."
                    cta="Criar evento"
                    ctaOnClick={() => setCreating(true)}
                />
            ) : (
                <Grid cols={2} gap={4} data-testid="events-grid">
                    {filtered.map((e) => (
                        <div
                            key={e.id}
                            data-testid={`event-${e.id}`}
                            className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden hover:border-black/25 hover:shadow-md transition"
                        >
                            <div className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl silver-grad text-black flex-shrink-0 shadow-sm">
                                        <span className="font-mono text-[9px] uppercase tracking-widest text-black/55">{new Date(e.starts_at).toLocaleString("pt-PT", { month: "short" })}</span>
                                        <span className="font-display text-[22px] leading-none">{new Date(e.starts_at).getDate()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-display text-[18px] tracking-tight leading-tight text-black truncate">{e.title}</h3>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/50 mt-1 truncate">
                                            {fmtDate(e.starts_at)}
                                        </p>
                                        {e.location && (
                                            <p className="font-mono text-[10px] text-black/55 mt-0.5 flex items-center gap-1 truncate">
                                                <MapPin size={10} /> {e.location}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                                    <span className="bg-black/[0.05] px-1.5 py-0.5 rounded text-[10px] font-mono text-black/65">
                                        {categoryLabel(EVENT_CATEGORIES, e.category)}
                                    </span>
                                    <span className="text-[10px] font-mono text-black/55 inline-flex items-center gap-1">
                                        <UsersIcon size={10} /> {e.attendees_count}
                                    </span>
                                </div>
                                {e.description && <p className="text-[13px] text-black/65 line-clamp-2 mb-3">{e.description}</p>}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => attend(e.id)}
                                        data-testid={`attend-${e.id}`}
                                        className={`flex-1 text-[11px] font-heading font-medium rounded-full px-3 py-1.5 transition ${e.attending ? "chip-on" : "btn-obsidian"}`}
                                    >
                                        {e.attending ? "Vou ✓" : "Participar"}
                                    </button>
                                    <button
                                        onClick={() => share(e)}
                                        title="Partilhar"
                                        data-testid={`event-share-${e.id}`}
                                        className="px-3 py-1.5 rounded-full border border-black/15 text-black/65 hover:border-black/40 hover:text-black transition"
                                    >
                                        <Share2 size={11} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </Grid>
            )}
        </PageShell>
    );
}
