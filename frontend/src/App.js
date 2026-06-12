import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider } from "./context/AuthContext";
import { PremiumProvider } from "./context/PremiumContext";
import { PublicSettingsProvider } from "./context/PublicSettingsContext";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { CookieBanner } from "./components/CookieBanner";
import { ConfirmDialogHost } from "./components/ConfirmDialog";
import { ScrollToTopOnNavigate } from "./components/ScrollToTopOnNavigate";

// Páginas carregadas sob demanda (code-splitting por rota). Corta o bundle
// inicial: cada página vira um chunk próprio, e libs que só servem uma rota
// (recharts no Admin, react-day-picker no Settings) saem do main.js.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Feed = lazy(() => import("./pages/Feed"));
const Explore = lazy(() => import("./pages/Explore"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Messages = lazy(() => import("./pages/Messages"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Profile = lazy(() => import("./pages/Profile"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const TagPage = lazy(() => import("./pages/TagPage"));
const Communities = lazy(() => import("./pages/Communities"));
const Mesas = lazy(() => import("./pages/Mesas"));
const Topologia = lazy(() => import("./pages/Topologia"));
const Community = lazy(() => import("./pages/Community"));
const Trending = lazy(() => import("./pages/Trending"));
const Drafts = lazy(() => import("./pages/Drafts"));
const Scheduled = lazy(() => import("./pages/Scheduled"));
const LegalIndex = lazy(() => import("./pages/legal/LegalIndex"));
const Vision = lazy(() => import("./pages/legal/Vision"));
const Terms = lazy(() => import("./pages/legal/Terms"));
const Privacy = lazy(() => import("./pages/legal/Privacy"));
const Cookies = lazy(() => import("./pages/legal/Cookies"));
const CommunityGuidelines = lazy(() => import("./pages/legal/CommunityGuidelines"));
const Manifesto = lazy(() => import("./pages/Manifesto"));
const Landing = lazy(() => import("./pages/Landing"));
const Visitors = lazy(() => import("./pages/Visitors"));
const SeriesPage = lazy(() => import("./pages/SeriesPage"));
const StoryArchive = lazy(() => import("./pages/StoryArchive"));
const Admin = lazy(() => import("./pages/Admin"));
const Premium = lazy(() => import("./pages/Premium"));
const Calendario = lazy(() => import("./pages/Calendario"));

function RouteFallback() {
    return (
        <div className="min-h-screen grid place-items-center">
            <p className="type-overline">a carregar…</p>
        </div>
    );
}

function App() {
    // Activa scroll suave global (CSS-only; respeita prefers-reduced-motion).
    useEffect(() => {
        try {
            document.documentElement.classList.add("smooth-scroll");
            document.body.classList.add("smooth-scroll");
        } catch {}
        return () => {
            try {
                document.documentElement.classList.remove("smooth-scroll");
                document.body.classList.remove("smooth-scroll");
            } catch {}
        };
    }, []);
    return (
        <div className="App">
            <PublicSettingsProvider>
                <AuthProvider>
                    <PremiumProvider>
                    <BrowserRouter>
                        <ScrollToTopOnNavigate />
                        <AnnouncementBanner />
                        <Toaster
                        theme="light"
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: "#ffffff",
                                border: "1px solid rgba(0,0,0,0.08)",
                                color: "#0d0d10",
                                fontFamily: "Geist, sans-serif",
                                boxShadow: "0 8px 24px -8px rgba(0,0,0,0.12)",
                            },
                        }}
                    />
                    <Suspense fallback={<RouteFallback />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot" element={<ForgotPassword />} />
                        {/* Public legal pages — accessible without auth */}
                        <Route path="/legal" element={<LegalIndex />} />
                        <Route path="/legal/vision" element={<Vision />} />
                        <Route path="/legal/terms" element={<Terms />} />
                        <Route path="/legal/privacy" element={<Privacy />} />
                        <Route path="/legal/cookies" element={<Cookies />} />
                        <Route path="/legal/community" element={<CommunityGuidelines />} />
                        <Route path="/manifesto" element={<Manifesto />} />
                        <Route path="/" element={<Landing />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/feed" element={<Feed />} />
                            <Route path="/explore" element={<Explore />} />
                            <Route path="/trending" element={<Trending />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/messages" element={<Messages />} />
                            <Route path="/messages/:userId" element={<Messages />} />
                            <Route path="/bookmarks" element={<Bookmarks />} />
                            <Route path="/drafts" element={<Drafts />} />
                            <Route path="/scheduled" element={<Scheduled />} />
                            <Route path="/communities" element={<Communities />} />
                            <Route path="/mesas" element={<Mesas />} />
                            <Route path="/topologia" element={<Topologia />} />
                            <Route path="/c/:slug" element={<Community />} />
                            <Route path="/u/:username" element={<Profile />} />
                            <Route path="/post/:postId" element={<PostDetail />} />
                            <Route path="/tag/:tag" element={<TagPage />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/premium" element={<Premium />} />
                            <Route path="/calendario" element={<Calendario />} />
                            <Route path="/visitors" element={<Visitors />} />
                            <Route path="/series/:seriesId" element={<SeriesPage />} />
                            <Route path="/stories/archive" element={<StoryArchive />} />
                        </Route>
                        {/* Admin panel uses its own minimalist chrome */}
                        <Route
                            element={
                                <ProtectedRoute>
                                    <AdminLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="/admin" element={<Admin />} />
                        </Route>
                    </Routes>
                    </Suspense>
                    <CookieBanner />
                    <ConfirmDialogHost />
                </BrowserRouter>
                    </PremiumProvider>
                </AuthProvider>
            </PublicSettingsProvider>
        </div>
    );
}

export default App;
