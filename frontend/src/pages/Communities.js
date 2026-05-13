import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Plus, X } from "lucide-react";
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

    useEffect(() => { load(); }, []);

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
                subtitle="Grupos por interesse"
                testid="communities-header"
                action={
                    <button
                        onClick={() => setCreating(true)}
                        data-testid="new-community-btn"
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
                        className="w-full lg:max-w-md bg-white border-t lg:border border-black/[0.08] rounded-t-3xl lg:rounded-2xl p-6 lg:p-7 space-y-5 anim-sheet-up lg:anim-fade-up pb-safe shadow-[0_-20px_60px_-30px_rgba(13,13,16,0.3)] lg:shadow-[0_20px_60px_-20px_rgba(13,13,16,0.25)]"
                        data-testid="create-community-form"
                    >
                        <div className="lg:hidden flex justify-center -mt-2 mb-1">
                            <span className="w-10 h-1 rounded-full bg-black/15" />
                        </div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="type-overline mb-1">Nova comunidade</p>
                                <h2 className="font-display text-[28px] tracking-tight leading-none text-black">Comunidade</h2>
                            </div>
                            <button type="button" onClick={() => setCreating(false)} className="hidden lg:grid w-9 h-9 rounded-full place-items-center hover:bg-black/[0.04] text-black/55">
                                <X size={16} strokeWidth={1.7} />
                            </button>
                        </div>
                        <div>
                            <label className="type-overline">Nome</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                minLength={3}
                                maxLength={40}
                                data-testid="community-name-input"
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="type-overline">Descrição</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                maxLength={200}
                                rows={3}
                                data-testid="community-description-input"
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] text-black/60 hover:bg-black/[0.04]">
                                Cancelar
                            </button>
                            <button type="submit" data-testid="submit-community-btn" className="btn-obsidian px-5 py-2.5 text-[11px]">
                                Criar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : communities.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Users size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem comunidades</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Nenhuma comunidade ainda</h3>
                    <p className="text-black/55 text-sm mt-2">Cria a primeira e reúne pessoas afins.</p>
                </div>
            ) : (
                <div>
                    {communities.map((c) => (
                        <div key={c.id} className="px-4 lg:px-5 py-5 hairline-b hover:bg-black/[0.015] transition" data-testid={`community-${c.slug}`}>
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl silver-grad grid place-items-center flex-shrink-0 shadow-sm">
                                    <Users size={20} strokeWidth={1.5} className="text-black/70" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/c/${c.slug}`} className="block">
                                        <h3 className="font-display text-[22px] tracking-tight leading-tight hover:underline text-black truncate">
                                            {c.name}
                                        </h3>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45 mt-1">{c.members_count} membros</p>
                                    </Link>
                                    {c.description && <p className="mt-2 text-[14px] text-black/70 line-clamp-2 leading-relaxed">{c.description}</p>}
                                </div>
                                <button
                                    onClick={() => join(c.slug)}
                                    data-testid={`join-${c.slug}`}
                                    className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-4 py-2 transition active:scale-95 flex-shrink-0 ${
                                        c.joined
                                            ? "btn-silver"
                                            : "btn-obsidian"
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
