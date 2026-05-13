import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Bookmarks from "./pages/Bookmarks";
import Profile from "./pages/Profile";
import PostDetail from "./pages/PostDetail";
import Settings from "./pages/Settings";
import TagPage from "./pages/TagPage";
import Communities from "./pages/Communities";
import Community from "./pages/Community";
import Events from "./pages/Events";
import Trending from "./pages/Trending";
import Drafts from "./pages/Drafts";
import Scheduled from "./pages/Scheduled";

function App() {
    return (
        <div className="App">
            <AuthProvider>
                <BrowserRouter>
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
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot" element={<ForgotPassword />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Feed />} />
                            <Route path="/explore" element={<Explore />} />
                            <Route path="/trending" element={<Trending />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/messages" element={<Messages />} />
                            <Route path="/messages/:userId" element={<Messages />} />
                            <Route path="/bookmarks" element={<Bookmarks />} />
                            <Route path="/drafts" element={<Drafts />} />
                            <Route path="/scheduled" element={<Scheduled />} />
                            <Route path="/communities" element={<Communities />} />
                            <Route path="/c/:slug" element={<Community />} />
                            <Route path="/events" element={<Events />} />
                            <Route path="/u/:username" element={<Profile />} />
                            <Route path="/post/:postId" element={<PostDetail />} />
                            <Route path="/tag/:tag" element={<TagPage />} />
                            <Route path="/settings" element={<Settings />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </div>
    );
}

export default App;
