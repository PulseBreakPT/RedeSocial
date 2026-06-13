import { useEffect, useState, useRef } from "react";
import { PT } from "../theme/editorial";

// =============================================================================
// LUSORAE — First Post Celebration
// Animação efémera + confete + mensagem "Bem-vindo à conversa portuguesa"
// Disparado pelo evento "lusorae:first-post" emitido pelo Composer.
// =============================================================================

const PIECES = 36;
const COLORS = [PT.ink, PT.red, PT.gold, "#a3b18a", "#588157", "#bc4749"];

function rand(min, max) {
    return min + Math.random() * (max - min);
}

export function FirstPostCelebration() {
    const [show, setShow] = useState(false);
    const [pieces, setPieces] = useState([]);
    const timerRef = useRef(null);

    useEffect(() => {
        const handler = () => {
            // build confetti pieces
            const arr = Array.from({ length: PIECES }, () => ({
                left: rand(0, 100),
                delay: rand(0, 0.3),
                duration: rand(2.2, 3.5),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                size: rand(6, 12),
                rotate: rand(-180, 180),
                shape: Math.random() > 0.5 ? "rect" : "circle",
            }));
            setPieces(arr);
            setShow(true);
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setShow(false), 4200);
        };
        window.addEventListener("lusorae:first-post", handler);
        return () => {
            window.removeEventListener("lusorae:first-post", handler);
            clearTimeout(timerRef.current);
        };
    }, []);

    if (!show) return null;

    return (
        <div
            data-testid="first-post-celebration"
            className="fixed inset-0 z-[9999] pointer-events-none"
            aria-live="polite"
        >
            {/* Backdrop wash */}
            <div
                className="absolute inset-0 anim-fade-in"
                style={{
                    background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.45) 0%, rgba(247,245,239,0) 60%)",
                }}
            />

            {/* Confetti */}
            {pieces.map((p, i) => (
                <span
                    key={i}
                    style={{
                        position: "absolute",
                        left: `${p.left}%`,
                        top: "-12px",
                        width: p.size,
                        height: p.shape === "rect" ? p.size * 1.5 : p.size,
                        background: p.color,
                        borderRadius: p.shape === "rect" ? 2 : 999,
                        transform: `rotate(${p.rotate}deg)`,
                        animation: `lusorae-confetti-fall ${p.duration}s cubic-bezier(0.22,0.61,0.36,1) ${p.delay}s forwards`,
                        opacity: 0.95,
                    }}
                />
            ))}

            {/* Center card */}
            <div className="absolute inset-x-0 top-[28%] flex justify-center">
                <div
                    className="rounded-3xl px-8 py-6 text-center"
                    style={{
                        background: "rgba(255,255,255,0.94)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid rgba(10,10,10,0.08)",
                        boxShadow: "0 30px 80px -20px rgba(10,10,10,0.32), 0 8px 20px -10px rgba(10,10,10,0.18)",
                        animation: "lusorae-celebrate-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
                    }}
                >
                    <p
                        className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] mb-3"
                        style={{ color: "rgba(10,10,10,0.5)" }}
                    >
                        ✦ Primeira publicação ✦
                    </p>
                    <h2
                        className="font-black tracking-tight leading-tight"
                        style={{ fontSize: "clamp(26px, 4vw, 36px)", color: PT.ink }}
                    >
                        Bem-vindo à <span style={{ color: PT.red }}>conversa portuguesa</span>.
                    </h2>
                    <p
                        className="mt-3 text-[14px] font-medium"
                        style={{ color: "rgba(10,10,10,0.65)" }}
                    >
                        A tua voz já cá está. Agora é só conversar.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes lusorae-confetti-fall {
                    0%   { transform: translateY(-10px) rotate(0deg); opacity: 0; }
                    10%  { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 1; }
                }
                @keyframes lusorae-celebrate-pop {
                    0%   { transform: scale(0.6) translateY(20px); opacity: 0; }
                    60%  { transform: scale(1.04) translateY(-4px); opacity: 1; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
