import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import Explore from "./pages/Explore";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Bookmarks from "./pages/Bookmarks";
import Profile from "./pages/Profile";
import PostDetail from "./pages/PostDetail";
import Settings from "./pages/Settings";
import TagPage from "./pages/TagPage";

function App() {
    return (
        <div className="App">
            <AuthProvider>
                <BrowserRouter>
                    <Toaster
                        theme="dark"
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: "#121212",
                                border: "1px solid #27272a",
                                color: "#fafafa",
                                fontFamily: "Geist, sans-serif",
                            },
                        }}
                    />
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Feed />} />
                            <Route path="/explore" element={<Explore />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/messages" element={<Messages />} />
                            <Route path="/messages/:userId" element={<Messages />} />
                            <Route path="/bookmarks" element={<Bookmarks />} />
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
