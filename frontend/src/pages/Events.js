import { useEffect, useState } from "react";
import { Plus, CalendarDays, MapPin, X } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { toast } from "sonner";

function fmtDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
}

export default function Events() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", location: "", starts_at: "" });

    const load = () => {
        api.get("/events").then((r) => {
            setEvents(r.data);
            setLoading(false);
        });
    };

    useEffect(() => { load(); }, []);

    const attend = async (id) => {
        try {
            await api.post(`/events/${id}/attend`);
            load();
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    const create = async (e) => {
        e.preventDefault();
        try {
            const iso = new Date(form.starts_at).toISOString();
            await api.post("/events", { ...form, starts_at: iso });
            toast.success("Evento criado");
            setCreating(false);
            setForm({ title: "", description: "", location: "", starts_at: "" });
            load();
        } catch (err) {
            toast.error(formatApiError(err));
        }
    };

    return (
        <div data-testid="events-page">
            <PageHeader
                title="Eventos"
                subtitle="Próximos encontros"
                testid="events-header"
                action={
                    <button
                        onClick={() => setCreating(true)}
                        data-testid="new-event-btn"
                        className="btn-obsidian px-4 py-2 text-[11px] flex items-center gap-1.5"
                    >
                        <Plus size={13} strokeWidth={2} /> Criar
                    </button>
                }
            />

            {creating && (
                <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end lg:items-center lg:justify-center p-0 lg:p-4" onClick={() => setCreating(false)}>
                    <form
                        onSubmit={create}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full lg:max-w-md bg-white border-t lg:border border-black/[0.08] rounded-t-3xl lg:rounded-2xl p-6 lg:p-7 space-y-5 anim-sheet-up lg:anim-fade-up pb-safe max-h-[90vh] overflow-y-auto scroll-mom shadow-[0_-20px_60px_-30px_rgba(13,13,16,0.3)] lg:shadow-[0_20px_60px_-20px_rgba(13,13,16,0.25)]"
                        data-testid="create-event-form"
                    >
                        <div className="lg:hidden flex justify-center -mt-2 mb-1">
                            <span className="w-10 h-1 rounded-full bg-black/15" />
                        </div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="type-overline mb-1">Novo evento</p>
                                <h2 className="font-display text-[28px] tracking-tight leading-none text-black">Evento</h2>
                            </div>
                            <button type="button" onClick={() => setCreating(false)} className="hidden lg:grid w-9 h-9 rounded-full place-items-center hover:bg-black/[0.04] text-black/55">
                                <X size={16} strokeWidth={1.7} />
                            </button>
                        </div>
                        <div>
                            <label className="type-overline">Título</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                required minLength={3} maxLength={80}
                                data-testid="event-title-input"
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="type-overline">Quando</label>
                            <input
                                type="datetime-local"
                                value={form.starts_at}
                                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                                required
                                data-testid="event-date-input"
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition text-black"
                            />
                        </div>
                        <div>
                            <label className="type-overline">Local</label>
                            <input
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                maxLength={120}
                                data-testid="event-location-input"
                                placeholder="Onde se vai realizar?"
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="type-overline">Descrição</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                maxLength={400} rows={3}
                                data-testid="event-description-input"
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] text-black/60 hover:bg-black/[0.04]">
                                Cancelar
                            </button>
                            <button type="submit" data-testid="submit-event-btn" className="btn-obsidian px-5 py-2.5 text-[11px]">
                                Criar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : events.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <CalendarDays size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem eventos</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Nenhum evento agendado</h3>
                    <p className="text-black/55 text-sm mt-2">Cria o primeiro para reunir a comunidade.</p>
                </div>
            ) : (
                <div>
                    {events.map((e) => (
                        <div key={e.id} className="px-4 lg:px-5 py-5 hairline-b hover:bg-black/[0.015] transition" data-testid={`event-${e.id}`}>
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl silver-grad text-black flex-shrink-0 shadow-sm">
                                    <span className="font-mono text-[9px] uppercase tracking-widest text-black/55">
                                        {new Date(e.starts_at).toLocaleString("pt-BR", { month: "short" })}
                                    </span>
                                    <span className="font-display text-[22px] leading-none">
                                        {new Date(e.starts_at).getDate()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-display text-[22px] tracking-tight truncate leading-tight text-black">{e.title}</h3>
                                    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/50 mt-2 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <CalendarDays size={11} strokeWidth={1.6} /> {fmtDate(e.starts_at)}
                                        </span>
                                        {e.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={11} strokeWidth={1.6} /> {e.location}
                                            </span>
                                        )}
                                    </div>
                                    {e.description && <p className="mt-2 text-[14px] text-black/70 line-clamp-2 leading-relaxed">{e.description}</p>}
                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        {e.creator && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-black/50 font-mono">
                                                <Avatar user={e.creator} size={18} />
                                                @{e.creator.username}
                                            </div>
                                        )}
                                        <span className="text-black/20">·</span>
                                        <span className="text-[11px] font-mono text-black/55">{e.attendees_count} confirmados</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => attend(e.id)}
                                    data-testid={`attend-${e.id}`}
                                    className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-4 py-2 transition active:scale-95 flex-shrink-0 ${
                                        e.attending ? "btn-silver" : "btn-obsidian"
                                    }`}
                                >
                                    {e.attending ? "Vou" : "Participar"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
