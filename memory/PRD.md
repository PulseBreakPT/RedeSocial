# Vermillion - Rede Social

## Problem Statement
Cria uma rede social completa e complexa ultra refinada. Sem erros, todos os botões funcionam.

## User Choices
- Auth: Email/password (JWT cookie)
- Features: Posts + DMs real-time
- Images: base64
- AI: none
- Theme: Modern dark (Vermillion accent #FF5722)

## Architecture
- Backend: FastAPI + Motor + MongoDB (UUID string IDs, single server.py)
- Frontend: React 19 + Tailwind + sonner + lucide-react + react-router-dom v7
- Real-time: polling (DMs every 3s, conversations 5s, notifications 8-12s, feed new-posts 30s)
- Theme: dark with Bricolage Grotesque (heading), Geist (body), JetBrains Mono (meta)

## Implemented (latest first)
### Deep mechanics & formulas (2026-05-13)
- Post: views (IntersectionObserver), edit within 15min, pin to profile, quote post
- Profile: StatsCard with engagement rate `(likes + reposts*2 + comments*3) / followers / posts * 100`
- Profile: 30-day activity heatmap (GitHub-style, 5 levels of orange)
- Profile: streak counter (consecutive days posting)
- Profile: profile completion % (bio 20 + avatar 20 + banner 15 + verified 10 + >=1 post 20 + >=3 following 15)
- Profile: mutual followers preview with count
- Post: dropdown menu (copy link, pin/unpin, edit, delete, report)
- Post: edited indicator with timestamp tooltip
- Post: view count (eye icon) with K/M formatting
- Repost: dropdown (Repost / Quote with comment)
- Notifications: filter tabs (Tudo / Menções / Curtidas / Seguidores)
- Messages: react with emoji, delete own message (backend)

### "Feels like a real social network" (super logic)
- Mobile bottom nav (5 icons) + Mobile FAB compose button
- Skeleton loaders (PostSkeleton, ProfileSkeleton, ConvSkeleton)
- Smart timestamps (smartTime) with useLiveTime hook (re-renders every 30s)
- Feed refresh button + "X new posts" pill (polls every 30s)
- Browser tab unread badge `(N) Vermillion · rede social`
- Compose drafts auto-saved to localStorage with restored indicator
- Notification toasts on new arrivals (sonner)
- Typing indicator in DMs (POST /typing + GET /typing-status)
- Keyboard shortcuts: ? (help), n (compose), / (search), g+h/e/t/n/m/p/c/v/b/s
- Composer: emoji picker, paste image from clipboard, character progress ring (SVG)

### Communities + Events + Recovery
- Communities: create/list/join/leave, community feed, members count
- Events: create/list/attend, location, datetime, attendees count
- Password recovery: forgot/reset with dev_token

### Social essentials
- Auth: register/login/logout/me, JWT cookie + bcrypt
- Posts: text+image (base64), feed/explore/bookmarks/tag, like/bookmark/repost
- Comments with @mention notifications
- Stories: 24h ephemeral, viewer count, stories bar with gradient ring
- Real-time DMs: conversation list, chat view, unread count
- Notifications: like/comment/follow/repost/quote/mention with rich icons
- Follow/unfollow, followers/following modal
- Profile: tabs (Posts/Mídia/Curtidas), reputation system, level, online status
- Verified badges, private profile toggle
- Trending hashtags page + sidebar widget
- Hashtag clickable + tag page, @mention auto-link
- Global search (users + posts + tags)
- Onboarding modal with suggested follows
- Image lightbox

## Backend endpoints
Auth: register, login, logout, me, forgot-password, reset-password
Users: GET /users/:u, /:u/posts?tab=, /:u/followers, /:u/following, /:u/stats, /:u/heatmap, /:u/mutual, /:u/follow, /:u/search, /suggestions; PATCH /me, POST /me/onboard
Posts: POST /posts (with quote_of, community_id), GET feed/explore/bookmarks/tag/:t/:id, PATCH /:id (edit), DELETE /:id; POST /:id/like, /:id/bookmark, /:id/repost, /:id/pin, /:id/view
Comments: GET /:id/comments, POST /:id/comments
Stories: POST/GET/view/DELETE
Communities: POST/GET/:slug/join/:slug/posts/mine
Events: POST/GET/:id/attend
Notifications: GET/unread-count/read-all
Messages: GET conversations/unread-count/:id, POST /messages, POST /:id/typing, GET /:id/typing-status, POST /:id/react, DELETE /:id
Trending, Search

## Test Credentials
admin@vermillion.app / admin123 (verified, onboarded)

## Next backlog (P1/P2)
- Group chats (multi-participant DMs)
- Voice messages
- Multi-image carousel per post
- Hashtag/mention autocomplete in composer
- Notification preferences per type (granular)
- Block/Mute user
- Featured/pinned community posts
- Pull-to-refresh on mobile
- WebSocket for true real-time DM
- Profile QR code share
- Calendar export for events (.ics)
