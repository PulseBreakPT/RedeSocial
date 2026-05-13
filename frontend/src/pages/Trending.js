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
                        <TrendingUp size={18} strokeWidth={1.5} className="text-black/70" /> Tendências
                    </span>
                }
                subtitle="Os tópicos mais comentados"
                testid="trending-header"
            />

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : tags.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <TrendingUp size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem novidades</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Sem tendências</h3>
                    <p className="text-black/55 text-sm mt-2">
                        Publica com <span className="text-black font-medium">#hashtag</span> para começar.
                    </p>
                </div>
            ) : (
                <div>
                    {tags.map((t, i) => (
                        <Link
                            key={t.tag}
                            to={`/tag/${t.tag}`}
                            data-testid={`trending-tag-${t.tag}`}
                            className="flex items-center gap-5 px-4 lg:px-6 py-5 hairline-b hover:bg-black/[0.015] transition group"
                        >
                            <div className="w-10 text-right font-display text-[28px] text-black/25 group-hover:text-black/40 transition leading-none">
                                {String(i + 1).padStart(2, "0")}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-display text-[22px] tracking-tight flex items-center gap-1 truncate text-black leading-tight">
                                    <Hash size={15} strokeWidth={1.5} className="text-black/45" />
                                    {t.tag}
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45 mt-1">
                                    {t.count} {t.count === 1 ? "publicação" : "publicações"}
                                </div>
                            </div>
                            <span className="text-black/30 group-hover:text-black/60 font-display text-2xl transition">→</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
