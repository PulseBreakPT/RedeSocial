import React, { useEffect, useMemo, useState } from "react";
import {
    Users as UsersIcon, FileText, MessageSquare, Mail,
    Flag, ShieldOff,
} from "lucide-react";
import { api } from "../../lib/api";
import { useAdminLive } from "../../hooks/useAdminLive";
import { KpiCard } from "../../components/admin/KpiCard";
import { MiniKpi } from "../../components/admin/MiniKpi";
import { Widget } from "../../components/admin/Widget";
import { LineChart } from "../../components/admin/LineChart";
import { ServiceStatus } from "../../components/admin/ServiceStatus";
import { ActivityTicker } from "../../components/admin/ActivityTicker";
import { UrgentReports } from "../../components/admin/UrgentReports";
import { TrendsList } from "../../components/admin/TrendsList";
import { TopPosts } from "../../components/admin/TopPosts";
import { GeoDistribution } from "../../components/admin/GeoDistribution";
import { ModerationQueues } from "../../components/admin/ModerationQueues";
import { SystemMini } from "../../components/admin/SystemMini";
import { SecurityMini } from "../../components/admin/SecurityMini";
import { DeployMini } from "../../components/admin/DeployMini";
import { WebSocketMini } from "../../components/admin/WebSocketMini";

function Skeleton({ height = 80 }) {
    return <div className="ops-skel" style={{ height, borderRadius: 14, width: "100%" }} />;
}

export function Cockpit({ onNavigate, timeRange = "15m", onChangeTimeRange }) {
    const { data, error, loading, refresh, wsState, activity } = useAdminLive({ pollMs: 8000, window: timeRange });
    const [timeline, setTimeline] = useState(null);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [urgentReports, setUrgentReports] = useState([]);

    // Fetch timeline whenever window changes
    useEffect(() => {
        let cancelled = false;
        async function run() {
            setTimelineLoading(true);
            try {
                const { data: t } = await api.get(`/admin/cockpit/timeline?window=${encodeURIComponent(timeRange)}`);
                if (!cancelled) setTimeline(t);
            } catch {
                if (!cancelled) setTimeline(null);
            } finally {
                if (!cancelled) setTimelineLoading(false);
            }
        }
        run();
        const id = setInterval(run, 30000); // refresh chart every 30s
        return () => { cancelled = true; clearInterval(id); };
    }, [timeRange]);

    // Fetch top urgent reports separately (4)
    useEffect(() => {
        let cancelled = false;
        async function run() {
            try {
                const { data: r } = await api.get("/admin/reports?status=open&limit=4");
                if (!cancelled) {
                    const items = (r && r.items || r || []).map((rr) => {
                        const reason = (rr.reason || "").toLowerCase();
                        const urgent_tokens = ["assedio", "assédio", "harass", "odio", "ódio", "hate", "ameaca", "ameaca", "threat", "csam", "menor", "doxx", "suicide"];
                        const spam_tokens = ["spam", "scam", "phishing"];
                        let queue = "review";
                        if (urgent_tokens.some(t => reason.includes(t))) queue = "urgent";
                        else if (spam_tokens.some(t => reason.includes(t))) queue = "spam";
                        return {
                            id: rr.id,
                            created_at: rr.created_at,
                            kind: rr.kind,
                            reason: rr.reason,
                            target_username: rr.target_username || (rr.target && rr.target.username) || "",
                            queue,
                        };
                    });
                    setUrgentReports(items);
                }
            } catch {
                if (!cancelled) setUrgentReports([]);
            }
        }
        run();
        const id = setInterval(run, 15000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    const kpis = (data && data.realtime && data.realtime.kpis) || {};
    const series = useMemo(() => {
        if (!timeline || !timeline.series) return [];
        return [
            { key: "users",    label: "Utilizadores", color: "#0e7490", data: timeline.series.users || [] },
            { key: "posts",    label: "Publicações",  color: "#2563eb", data: timeline.series.posts || [] },
            { key: "comments", label: "Comentários",  color: "#7c3aed", data: timeline.series.comments || [] },
            { key: "messages", label: "Mensagens",    color: "#d97706", data: timeline.series.messages || [] },
        ];
    }, [timeline]);

    const services = (data && data.services && data.services.services) || [];
    const queues = (data && data.queues && data.queues.queues) || {};
    const geo = data && data.geo;
    const systemMini = data && data.system_mini;
    const securityMini = data && data.security_mini;
    const deploy = data && data.deploy;
    const topPosts = (data && data.top_posts && data.top_posts.items) || [];
    const trending = (data && data.trending && data.trending.items) || [];

    // WebSocket mini — derive sockets count from services
    const wsService = services.find((s) => s.key === "websocket");
    const wsDetail = wsService && wsService.detail || "";
    let wsSockets = 0, wsUsers = 0;
    const m = wsDetail.match(/(\d+)\s+sockets\s·\s(\d+)\s+users/);
    if (m) { wsSockets = parseInt(m[1], 10) || 0; wsUsers = parseInt(m[2], 10) || 0; }

    // Time-range label for KPI "vs ..." sub
    const deltaSub = ({ "15m": "vs 15m anteriores", "1h": "vs hora anterior", "24h": "vs 24h anteriores", "7d": "vs 7d anteriores" }[timeRange]) || "vs anterior";
    const kpiLabel = ({ "15m": "/ 15 min", "1h": "/ hora", "24h": "/ 24h", "7d": "/ 7d" }[timeRange]) || "";

    const onJumpQueue = () => onNavigate && onNavigate("reports");

    return (
        <div className="ops-cockpit" data-testid="admin-cockpit">
            {/* Error banner — honest, no fake recovery */}
            {error && (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--ops-danger-tint)", color: "var(--ops-danger-700)", fontSize: 12.5 }}>
                    Falha a obter o cockpit: {error}. <button onClick={refresh} style={{ textDecoration: "underline", background: "none", border: "none", color: "inherit", cursor: "pointer" }}>Tentar novamente</button>
                </div>
            )}

            {/* ── KPI strip ───────────────────────────────────────────── */}
            <div className="ops-kpi-strip" data-testid="admin-kpi-strip">
                {loading && !data ? (
                    Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={120} />)
                ) : (
                    <>
                        <KpiCard
                            label="Utilizadores online"
                            value={kpis.users_online && kpis.users_online.value}
                            delta={kpis.users_online && kpis.users_online.delta_pct}
                            deltaSub={deltaSub}
                            sparkline={kpis.users_online && kpis.users_online.sparkline}
                            tone="realtime"
                            icon={() => <UsersIcon size={13} />}
                            data-testid="kpi-online"
                            onClick={() => onNavigate && onNavigate("sessions")}
                        />
                        <KpiCard
                            label={`Publicações ${kpiLabel}`}
                            value={kpis.posts_per_window && kpis.posts_per_window.value}
                            delta={kpis.posts_per_window && kpis.posts_per_window.delta_pct}
                            deltaSub={deltaSub}
                            sparkline={kpis.posts_per_window && kpis.posts_per_window.sparkline}
                            tone="info"
                            icon={() => <FileText size={13} />}
                            data-testid="kpi-posts"
                            onClick={() => onNavigate && onNavigate("posts")}
                        />
                        <KpiCard
                            label={`Comentários ${kpiLabel}`}
                            value={kpis.comments_per_window && kpis.comments_per_window.value}
                            delta={kpis.comments_per_window && kpis.comments_per_window.delta_pct}
                            deltaSub={deltaSub}
                            sparkline={kpis.comments_per_window && kpis.comments_per_window.sparkline}
                            tone="system"
                            icon={() => <MessageSquare size={13} />}
                            data-testid="kpi-comments"
                            onClick={() => onNavigate && onNavigate("comments")}
                        />
                        <KpiCard
                            label={`Mensagens ${kpiLabel}`}
                            value={kpis.messages_per_window && kpis.messages_per_window.value}
                            delta={kpis.messages_per_window && kpis.messages_per_window.delta_pct}
                            deltaSub={deltaSub}
                            sparkline={kpis.messages_per_window && kpis.messages_per_window.sparkline}
                            tone="warn"
                            icon={() => <Mail size={13} />}
                            data-testid="kpi-messages"
                        />
                        <KpiCard
                            label="Reports pendentes"
                            value={kpis.reports_open && kpis.reports_open.value}
                            delta={kpis.reports_open && kpis.reports_open.delta_pct}
                            deltaSub={deltaSub}
                            sparkline={kpis.reports_open && kpis.reports_open.sparkline}
                            tone="danger"
                            inverted
                            icon={() => <Flag size={13} />}
                            data-testid="kpi-reports"
                            onClick={() => onNavigate && onNavigate("reports")}
                        />
                        <KpiCard
                            label={`Ataques bloqueados ${kpiLabel}`}
                            value={kpis.attacks_blocked && kpis.attacks_blocked.value}
                            delta={kpis.attacks_blocked && kpis.attacks_blocked.delta_pct}
                            deltaSub={deltaSub}
                            sparkline={kpis.attacks_blocked && kpis.attacks_blocked.sparkline}
                            tone="danger"
                            inverted
                            icon={() => <ShieldOff size={13} />}
                            data-testid="kpi-attacks"
                            onClick={() => onNavigate && onNavigate("security")}
                        />
                    </>
                )}
            </div>

            {/* ── Main grid: chart+services  |  ticker+reports ──────────── */}
            <div className="ops-cockpit-main">
                {/* Left column: chart + services */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="ops-cockpit-center">
                        <Widget
                            title="Atividade da plataforma"
                            sub={timeline ? `· ${timeline.num_buckets} buckets · ${Math.round(timeline.bucket_seconds / 60)}min` : ""}
                            info={{
                                title: "Atividade agregada no tempo",
                                body: "Quantos eventos (utilizadores únicos, posts, comentários, mensagens) ocorreram em cada bucket de tempo da janela seleccionada. Útil para detectar picos súbitos vs. tendência calma.",
                                source: `GET /api/admin/cockpit/timeline?window=${timeRange}`,
                            }}
                            data-testid="cockpit-widget-timeline"
                        >
                            {timelineLoading && !timeline ? (
                                <Skeleton height={240} />
                            ) : (
                                <LineChart
                                    series={series}
                                    labels={(timeline && timeline.labels) || []}
                                    height={240}
                                />
                            )}
                        </Widget>
                        <Widget
                            title="Estado dos serviços"
                            info={{
                                title: "Health de subsistemas",
                                body: "Status em tempo real do FastAPI, MongoDB, WebSocket gateway e armazenamento. Cada linha mostra latência real ou erro. Clica num serviço para abrir detalhes em Sistema.",
                                source: "GET /api/admin/cockpit/services",
                            }}
                            action={{ label: "Ver detalhes →", onClick: () => onNavigate && onNavigate("system") }}
                            data-testid="cockpit-widget-services"
                        >
                            {loading && !data ? <Skeleton height={200} /> : (
                                <ServiceStatus services={services} onSelect={() => onNavigate && onNavigate("system")} />
                            )}
                        </Widget>
                    </div>

                    {/* Mini KPIs (4) */}
                    <div className="ops-mini-kpi-strip">
                        {loading && !data ? (
                            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={84} />)
                        ) : (
                            <>
                                <MiniKpi
                                    label="Spikes de spam"
                                    value={(data && data.security_mini && data.security_mini.tokens_invalid_24h) || 0}
                                    delta={null}
                                    sparkline={kpis.attacks_blocked && kpis.attacks_blocked.sparkline}
                                    tone="danger"
                                    inverted
                                    onClick={() => onNavigate && onNavigate("security")}
                                    title="Tokens inválidos detectados nas últimas 24h. Vai para Segurança."
                                />
                                <MiniKpi
                                    label="Falhas de autenticação"
                                    value={(data && data.security_mini && data.security_mini.logins_failed_24h) || 0}
                                    delta={null}
                                    sparkline={kpis.attacks_blocked && kpis.attacks_blocked.sparkline}
                                    tone="warn"
                                    inverted
                                    onClick={() => onNavigate && onNavigate("security")}
                                    title="Tentativas de login com credenciais erradas (24h). Vai para Segurança."
                                />
                                <MiniKpi
                                    label="Novas sessões (15m)"
                                    value={(kpis.users_online && (kpis.users_online.sparkline || []).reduce((a, b) => a + b, 0)) || 0}
                                    delta={kpis.users_online && kpis.users_online.delta_pct}
                                    sparkline={kpis.users_online && kpis.users_online.sparkline}
                                    tone="success"
                                    onClick={() => onNavigate && onNavigate("sessions")}
                                    title="Soma de utilizadores online por bucket nos últimos 15min. Vai para Sessões."
                                />
                                <MiniKpi
                                    label="Reports criados (15m)"
                                    value={(kpis.reports_open && (kpis.reports_open.sparkline || []).reduce((a, b) => a + b, 0)) || 0}
                                    delta={kpis.reports_open && kpis.reports_open.delta_pct}
                                    sparkline={kpis.reports_open && kpis.reports_open.sparkline}
                                    tone="warn"
                                    inverted
                                    onClick={() => onNavigate && onNavigate("reports")}
                                    title="Reports abertos por bucket nos últimos 15min. Vai para Reports."
                                />
                            </>
                        )}
                    </div>

                    {/* Trio: trends | top posts | geo */}
                    <div className="ops-cockpit-trio">
                        <Widget
                            title="Tendências em alta"
                            info={{
                                title: "Hashtags em ascensão",
                                body: "Tags com maior velocity (variação de uso) na última hora. Inclui contagem absoluta e setas de variação. Clica numa tag para abrir gestão em Hashtags.",
                                source: "GET /api/admin/cockpit/trending",
                            }}
                            action={{ label: "Ver todas →", onClick: () => onNavigate && onNavigate("hashtags") }}
                            data-testid="cockpit-widget-trending"
                        >
                            {loading && !data ? <Skeleton height={160} /> : <TrendsList items={trending} onSelect={() => onNavigate && onNavigate("hashtags")} />}
                        </Widget>
                        <Widget
                            title="Top publicações"
                            sub="· últimas 24h"
                            info={{
                                title: "Posts com mais engagement",
                                body: "Ordenado por score real (likes + 2×comments + 3×reposts) das últimas 24h. Clica num post para abrir detalhes em Publicações.",
                                source: "GET /api/admin/cockpit/top_posts",
                            }}
                            action={{ label: "Ver todas →", onClick: () => onNavigate && onNavigate("posts") }}
                            data-testid="cockpit-widget-topposts"
                        >
                            {loading && !data ? <Skeleton height={160} /> : <TopPosts items={topPosts} onSelect={() => onNavigate && onNavigate("posts")} />}
                        </Widget>
                        <Widget
                            title="Distribuição geográfica"
                            sub={geo && geo.total_users ? `· ${Number(geo.total_users).toLocaleString("pt-PT")} utilizadores` : ""}
                            info={{
                                title: "Onde estão os teus utilizadores",
                                body: "Distribuição por região PT declarada no perfil. Inclui % do total e contagem absoluta. Útil para campanhas regionais. Clica numa região para abrir o directório filtrado.",
                                source: "GET /api/admin/cockpit/geo",
                            }}
                            action={{ label: "Relatório →", onClick: () => onNavigate && onNavigate("users") }}
                            data-testid="cockpit-widget-geo"
                        >
                            {loading && !data ? <Skeleton height={160} /> : (
                                <GeoDistribution rows={(geo && geo.rows) || []} hasData={!!(geo && geo.has_data)} totalUsers={geo && geo.total_users} onSelect={() => onNavigate && onNavigate("users")} />
                            )}
                        </Widget>
                    </div>
                </div>

                {/* Right rail: live ticker + urgent reports */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                    <Widget
                        title="Atividade ao vivo"
                        sub={wsState === "live" ? "· ws ligado" : "· a sondar"}
                        info={{
                            title: "Stream de eventos da plataforma",
                            body: "Reports, ações administrativas, eventos de auth e ws_connect. Quando o WebSocket está ligado os eventos chegam em <1s; caso contrário fazemos polling a cada 8s. Clica num evento para abrir o contexto.",
                            source: "WS cockpit_event · POLL /api/admin/cockpit/snapshot",
                        }}
                        bodyClass="ops-widget__body--flush"
                        action={{ label: "Auditoria →", onClick: () => onNavigate && onNavigate("audit") }}
                        data-testid="cockpit-widget-activity"
                    >
                        {loading && !data && activity.length === 0 ? <div style={{ padding: 16 }}><Skeleton height={140} /></div> : (
                            <ActivityTicker items={activity.slice(0, 12)} onClickItem={(it) => {
                                if (!it) return;
                                if (it.kind === "new_report") onNavigate && onNavigate("reports");
                                else if (it.kind === "admin_action") onNavigate && onNavigate("audit");
                                else if (it.kind === "auth_event") onNavigate && onNavigate("security");
                                else onNavigate && onNavigate("audit");
                            }} />
                        )}
                    </Widget>
                    <Widget
                        title="Reports urgentes"
                        sub={urgentReports.length ? `· ${urgentReports.length}` : ""}
                        info={{
                            title: "Reports com prioridade máxima",
                            body: "Filtrados automaticamente por palavras-chave críticas (assédio, ódio, ameaça, doxx, menor, CSAM). Devem ser resolvidos em <1h. Clica para abrir o report no separador Reports.",
                            source: "GET /api/admin/reports?status=open&limit=4",
                        }}
                        bodyClass="ops-widget__body--flush"
                        action={{ label: "Ver todos →", onClick: () => onNavigate && onNavigate("reports") }}
                        data-testid="cockpit-widget-urgent"
                    >
                        <UrgentReports items={urgentReports} onClickItem={() => onNavigate && onNavigate("reports")} />
                    </Widget>
                </div>
            </div>

            {/* ── Bottom row: dense status widgets ──────────────────────── */}
            <div className="ops-cockpit-bottom">
                <Widget
                    title="WebSocket"
                    sub="· in-process"
                    info={{
                        title: "Gateway realtime",
                        body: "Sockets abertos para feed, notificações e mensagens. Quando um utilizador usa várias abas/dispositivos cria múltiplos sockets — daí 'sockets' poder ser >'users'.",
                        source: "derived from /api/admin/cockpit/services",
                    }}
                    data-testid="cockpit-widget-ws"
                >
                    <WebSocketMini sockets={wsSockets} users={wsUsers} live={wsState === "live"} onClick={() => onNavigate && onNavigate("system")} />
                </Widget>
                <Widget
                    title="Segurança (24h)"
                    info={{
                        title: "Resumo de eventos de segurança",
                        body: "Logins falhados, tokens JWT inválidos, eventos críticos e auto-lockouts nas últimas 24h. Painel completo em Segurança.",
                        source: "GET /api/admin/cockpit/security_mini",
                    }}
                    action={{ label: "Detalhes →", onClick: () => onNavigate && onNavigate("security") }}
                    data-testid="cockpit-widget-security"
                >
                    {securityMini ? <SecurityMini data={securityMini} onSelect={() => onNavigate && onNavigate("security")} /> : <Skeleton height={80} />}
                </Widget>
                <Widget
                    title="Sistema"
                    info={{
                        title: "Saúde do backend",
                        body: "Uptime do processo, CPU host (load avg), uso de memória e latência média p50 das últimas requisições /api. Detalhes por subsistema em Sistema.",
                        source: "GET /api/admin/cockpit/system_mini",
                    }}
                    action={{ label: "Detalhes →", onClick: () => onNavigate && onNavigate("system") }}
                    data-testid="cockpit-widget-system"
                >
                    {systemMini ? <SystemMini data={systemMini} onSelect={() => onNavigate && onNavigate("system")} /> : <Skeleton height={80} />}
                </Widget>
                <Widget
                    title="Filas de moderação"
                    info={{
                        title: "Carga das filas humanas",
                        body: "Itens por resolver agrupados por queue (urgent, spam, review). Picos aqui indicam necessidade de mais moderadores ou ajuste de filtros automáticos.",
                        source: "GET /api/admin/cockpit/queues",
                    }}
                    action={{ label: "Filas →", onClick: onJumpQueue }}
                    data-testid="cockpit-widget-queues"
                >
                    <ModerationQueues queues={queues} onJump={onJumpQueue} />
                </Widget>
                <Widget
                    title="Deploy"
                    info={{
                        title: "Versão em produção",
                        body: "Versão git/build em execução, ambiente (development/staging/production) e timestamp do último arranque. Reinícios pode indicar deploy ou crash recovery.",
                        source: "GET /api/admin/cockpit/deploy",
                    }}
                    data-testid="cockpit-widget-deploy"
                >
                    {deploy ? <DeployMini data={deploy} /> : <Skeleton height={80} />}
                </Widget>
                <Widget
                    title="Auditoria"
                    info={{
                        title: "Histórico imutável de ações admin",
                        body: "Toda ação em /api/admin/* fica registada com actor, alvo, payload e timestamp. Não pode ser apagado. Útil para responsabilização e revisão a posteriori.",
                        source: "GET /api/admin/audit",
                    }}
                    action={{ label: "Histórico →", onClick: () => onNavigate && onNavigate("audit") }}
                    data-testid="cockpit-widget-audit-mini"
                >
                    <div style={{ fontSize: 12, color: "var(--ops-text-faint)" }}>
                        {activity.filter((a) => a.kind === "admin_action").length} ações severas nas últimas observações.
                    </div>
                    <div style={{ marginTop: 8 }}>
                        {activity.filter((a) => a.kind === "admin_action").slice(0, 3).map((a) => (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => onNavigate && onNavigate("audit")}
                                className="ops-cockpit__audit-row"
                                data-testid={`cockpit-audit-row-${a.id}`}
                            >
                                {a.title}
                            </button>
                        ))}
                        {activity.filter((a) => a.kind === "admin_action").length === 0 && (
                            <div style={{ fontSize: 11, color: "var(--ops-text-ghost)" }}>Nenhuma ação severa recente.</div>
                        )}
                    </div>
                </Widget>
            </div>
        </div>
    );
}

export default Cockpit;
