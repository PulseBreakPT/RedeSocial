import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Plus } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { toast } from "sonner";

export default function Communities() {
    const navigate = useNavigate();
    const [communities, setCommunities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: "", description: "" });

    const load = () => {
        api.get("/communities").then((r) => {
            setCommunities(r.data);
            setLoading(false);
        });
    };

    useEffect(() => {
        load();
    }, []);

    const join = async (slug) => {
        try {
            const { data } = await api.post(`/communities/${slug}/join`);
            toast.success(data.joined ? "Entraste na comunidade" : "Saíste da comunidade");
            load();
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    const create = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post("/communities", form);
            toast.success("Comunidade criada");
            setCreating(false);
            setForm({ name: "", description: "" });
            navigate(`/c/${data.slug}`);
        } catch (err) {
            toast.error(formatApiError(err));
        }
    };

    return (
        <div data-testid="communities-page">
            <PageHeader
                title="Comunidades"
                subtitle="encontre sua tribo"
                testid="communities-header"
                action={
                    <button
                        onClick={() => setCreating(true)}
                        data-testid="new-community-btn"
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
                        className="w-full lg:max-w-md bg-zinc-950 border-t lg:border border-zinc-800 rounded-t-3xl lg:rounded-2xl p-5 lg:p-6 space-y-4 anim-sheet-up lg:anim-fade-up pb-safe"
                        data-testid="create-community-form"
                    >
                        <div className="lg:hidden flex justify-center -mt-2 mb-1">
                            <span className="w-10 h-1 rounded-full bg-white/20" />
                        </div>
                        <h2 className="font-heading text-xl lg:text-2xl font-bold">Nova comunidade</h2>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Nome</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                minLength={3}
                                maxLength={40}
                                data-testid="community-name-input"
                                className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Descrição</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                maxLength={200}
                                rows={3}
                                data-testid="community-description-input"
                                className="mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCreating(false)} className="px-5 py-2 border border-zinc-700 rounded-full text-sm">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                data-testid="submit-community-btn"
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
            ) : communities.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <Users size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Nenhuma comunidade ainda</p>
                    <p className="text-zinc-500 text-sm mt-1">Cria a primeira e reúne pessoas com os mesmos interesses.</p>
                </div>
            ) : (
                <div className="divide-y divide-white/[0.05]">
                    {communities.map((c) => (
                        <div key={c.id} className="px-4 lg:px-5 py-4 lg:py-5 active:bg-white/[0.04] lg:hover:bg-white/[0.02] transition" data-testid={`community-${c.slug}`}>
                            <div className="flex items-start gap-3 lg:gap-4">
                                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-accent-vermillion/30 to-zinc-900 grid place-items-center border border-white/[0.06] flex-shrink-0">
                                    <Users size={22} className="text-accent-vermillion" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/c/${c.slug}`} className="block">
                                        <h3 className="font-heading text-base lg:text-lg font-bold hover:text-accent-vermillion transition truncate">{c.name}</h3>
                                        <p className="font-mono text-[11px] text-zinc-500">{c.members_count} membros</p>
                                    </Link>
                                    {c.description && <p className="mt-1.5 text-sm text-zinc-300 line-clamp-2">{c.description}</p>}
                                </div>
                                <button
                                    onClick={() => join(c.slug)}
                                    data-testid={`join-${c.slug}`}
                                    className={`text-[11px] font-heading font-semibold uppercase tracking-wide rounded-full px-3.5 py-2 transition active:scale-95 flex-shrink-0 ${
                                        c.joined
                                            ? "border border-white/[0.12] hover:bg-accent-vermillion/10 hover:text-accent-vermillion"
                                            : "bg-white text-black hover:bg-zinc-200"
                                    }`}
                                >
                                    {c.joined ? "Sair" : "Entrar"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
