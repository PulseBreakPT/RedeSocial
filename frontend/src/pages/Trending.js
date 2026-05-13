import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Hash } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";

export default function Trending() {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/trending").then((r) => {
            setTags(r.data);
            setLoading(false);
        });
    }, []);

    return (
        <div data-testid="trending-page">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-2">
                        <TrendingUp size={20} className="text-accent-vermillion" /> Tendências
                    </span>
                }
                subtitle="o que está em alta"
                testid="trending-header"
            />

            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">a carregar...</div>
            ) : tags.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <TrendingUp size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Sem tendências</p>
                    <p className="text-zinc-500 text-sm mt-1">Publica com <span className="text-accent-vermillion">#hashtag</span> para começar.</p>
                </div>
            ) : (
                <div className="divide-y divide-white/[0.05]">
                    {tags.map((t, i) => (
                        <Link
                            key={t.tag}
                            to={`/tag/${t.tag}`}
                            data-testid={`trending-tag-${t.tag}`}
                            className="flex items-center gap-4 px-4 lg:px-5 py-4 active:bg-white/[0.05] lg:hover:bg-white/[0.02] transition"
                        >
                            <div className="w-8 lg:w-10 text-right font-mono text-xl lg:text-2xl text-zinc-700 font-bold">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                                <div className="font-heading text-base lg:text-lg font-bold flex items-center gap-1 truncate">
                                    <Hash size={16} className="text-accent-vermillion" />
                                    {t.tag}
                                </div>
                                <div className="font-mono text-[11px] text-zinc-500 mt-0.5">{t.count} publicações</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
