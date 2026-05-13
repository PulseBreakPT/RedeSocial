import { useEffect, useState } from "react";
import { Composer } from "../components/Composer";
import { PostCard } from "../components/PostCard";
import { StoriesBar } from "../components/StoriesBar";
import { api } from "../lib/api";

export default function Feed() {
    const [tab, setTab] = useState("following");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async (which = tab) => {
        setLoading(true);
        try {
            const url = which === "following" ? "/posts/feed" : "/posts/explore";
            const { data } = await api.get(url);
            setPosts(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(tab);
        // eslint-disable-next-line
    }, [tab]);

    return (
        <div data-testid="feed-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900">
                <div className="px-5 py-4">
                    <h1 className="font-heading text-xl font-bold tracking-tight">Início</h1>
                </div>
                <div className="grid grid-cols-2">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following"
                        className={`py-3 font-heading font-semibold text-sm transition relative ${
                            tab === "following" ? "text-white" : "text-zinc-500 hover:bg-white/[0.02]"
                        }`}
                    >
                        Seguindo
                        {tab === "following" && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-vermillion rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou"
                        className={`py-3 font-heading font-semibold text-sm transition relative ${
                            tab === "foryou" ? "text-white" : "text-zinc-500 hover:bg-white/[0.02]"
                        }`}
                    >
                        Para você
                        {tab === "foryou" && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-vermillion rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            <StoriesBar />
            <Composer onPosted={(p) => setPosts((prev) => [p, ...prev])} />

            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">carregando feed...</div>
            ) : posts.length === 0 ? (
                <div className="p-10 text-center">
                    <p className="text-zinc-400 font-heading text-lg">
                        {tab === "following" ? "Seu feed está vazio." : "Nenhuma publicação ainda."}
                    </p>
                    <p className="text-zinc-600 font-mono text-sm mt-2">
                        {tab === "following"
                            ? "Siga pessoas ou troque para Para você"
                            : "Seja o primeiro a publicar algo!"}
                    </p>
                </div>
            ) : (
                posts.map((p) => (
                    <PostCard
                        key={p.id}
                        post={p}
                        onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                        onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                    />
                ))
            )}
        </div>
    );
}
