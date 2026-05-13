import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays, MapPin } from "lucide-react";
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
    const navigate = useNavigate();
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

    useEffect(() => {
        load();
    }, []);

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
                subtitle="o que está chegando"
                testid="events-header"
                action={
                    <button
                        onClick={() => setCreating(true)}
                        data-testid="new-event-btn"
                        className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-[11px] px-4 py-2 rounded-full hover:bg-[#A78BFA] active:scale-95 flex items-center gap-1.5"
                    >
                        <Plus size={14} /> Criar
                    </button>
                }
            />

            {creating && (
                <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end lg:items-center lg:justify-center p-0 lg:p-4" onClick={() => setCreating(false)}>
                    <form
                        onSubmit={create}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full lg:max-w-md bg-zinc-950 border-t lg:border border-zinc-800 rounded-t-3xl lg:rounded-2xl p-5 lg:p-6 space-y-4 anim-sheet-up lg:anim-fade-up pb-safe max-h-[90vh] overflow-y-auto scroll-mom"
                        data-testid="create-event-form"
                    >
                        <div className="lg:hidden flex justify-center -mt-2 mb-1">
                            <span className="w-10 h-1 rounded-full bg-white/20" />
                        </div>
                        <h2 className="font-heading text-xl lg:text-2xl font-bold">Novo evento</h2>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Título</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                required minLength={3} maxLength={80}
                                data-testid="event-title-input"
                                className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Quando</label>
                            <input
                                type="datetime-local"
                                value={form.starts_at}
                                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                                required
                                data-testid="event-date-input"
                                className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none text-white"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Local</label>
                            <input
                                value={form.location}
                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                maxLength={120}
                                data-testid="event-location-input"
                                className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Descrição</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                maxLength={400} rows={3}
                                data-testid="event-description-input"
                                className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCreating(false)} className="px-5 py-2 border border-zinc-700 rounded-full text-sm">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                data-testid="submit-event-btn"
                                className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-xs px-5 py-2 rounded-full hover:bg-[#A78BFA] active:scale-95"
                            >
                                Criar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">a carregar...</div>
            ) : events.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <CalendarDays size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Nenhum evento agendado</p>
                    <p className="text-zinc-500 text-sm mt-1">Cria o primeiro para reunir a comunidade.</p>
                </div>
            ) : (
                <div className="divide-y divide-white/[0.05]">
                    {events.map((e) => (
                        <div key={e.id} className="px-4 lg:px-5 py-4 lg:py-5 active:bg-white/[0.04] lg:hover:bg-white/[0.02] transition" data-testid={`event-${e.id}`}>
                            <div className="flex items-start gap-3 lg:gap-4">
                                <div className="flex flex-col items-center justify-center w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-accent-vermillion/10 border border-accent-vermillion/30 text-accent-vermillion flex-shrink-0">
                                    <span className="font-mono text-[9px] uppercase">
                                        {new Date(e.starts_at).toLocaleString("pt-BR", { month: "short" })}
                                    </span>
                                    <span className="font-heading text-lg lg:text-xl font-bold leading-none">
                                        {new Date(e.starts_at).getDate()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-heading text-base lg:text-lg font-bold truncate">{e.title}</h3>
                                    <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 mt-1 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <CalendarDays size={12} /> {fmtDate(e.starts_at)}
                                        </span>
                                        {e.location && (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={12} /> {e.location}
                                            </span>
                                        )}
                                    </div>
                                    {e.description && <p className="mt-1.5 text-sm text-zinc-300 line-clamp-2">{e.description}</p>}
                                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                        {e.creator && (
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                                                <Avatar user={e.creator} size={18} />
                                                @{e.creator.username}
                                            </div>
                                        )}
                                        <span className="text-zinc-700">·</span>
                                        <span className="text-xs font-mono text-zinc-500">{e.attendees_count} confirmados</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => attend(e.id)}
                                    data-testid={`attend-${e.id}`}
                                    className={`text-[11px] font-heading font-semibold uppercase tracking-wide rounded-full px-3.5 py-2 transition active:scale-95 flex-shrink-0 ${
                                        e.attending
                                            ? "border border-white/[0.12] hover:bg-accent-vermillion/10 hover:text-accent-vermillion"
                                            : "bg-white text-black hover:bg-zinc-200"
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
