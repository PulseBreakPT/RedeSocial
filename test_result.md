#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Remove a funcionalidade de gamificação da rede social.
  Decisões do utilizador:
    - Remover TUDO: XP/níveis, conquistas/badges, streaks, check-in diário,
      checklist de onboarding com XP, charms, cosmetics, reputação numérica.
    - Endpoints obsoletos devem manter-se vivos a devolver respostas
      vazias/neutras (mais seguro para consumidores antigos).
    - Onboarding modal (sugestão para seguir 5 pessoas) é para manter — não
      é gamificação.

backend:
  - task: "Remoção de gamificação — backend (stubs neutros + remoção de XP/level/streak/reputação de public_user e get_profile)"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Ações executadas no /app/backend/server.py:
              · compute_reputation → devolve {reputation:0, level:0}.
              · level_for_xp → devolve dict neutro (level=0, name="", emoji="").
              · award_xp → no-op {"gained": 0}.
              · daily_checkin → no-op.
              · update_streak_on_post → no-op.
              · evaluate_checklist → devolve checklist vazia.
              · public_user() — REMOVIDOS os campos xp, level, level_name,
                level_emoji, streak_days (já não estão no payload do
                utilizador autenticado nem em /users/{u}).
              · GET /api/users/{u} — já não devolve "reputation" nem "level"
                (rep removido do payload).
              · GET /api/users/{u}/stats — campo "streak" forçado a 0
                (mantemos o campo para compat).
              · GET /api/users/{u}/badges → {earned:[], all:[], totals:{}}.
              · GET /api/badges/narrative → {"badges": []}.
              · GET /api/users/{u}/streak → zeros neutros.
              · GET /api/charms/catalog → [].
              · GET /api/users/{u}/charms → {unlocked:[], equipped:[]}.
              · POST /api/users/me/charms/equip → no-op {equipped:[]}.
              · GET /api/users/{u}/charms-progress → {unlocked_keys:[],
                progress:{}, catalog:[]}.
              · GET /api/cosmetics/catalog → [].
              · POST /api/users/me/cosmetics/equip → no-op (frame e
                sticker forçados a "").
              · GET /api/users/{u}/cosmetics → {frame:null, sticker:null}.
              · POST /users/me/onboard mantido (apenas marca onboarded=true).

            Validar:
              1) Login (admin@vermillion.app / admin123) continua a funcionar;
                 user payload NÃO contém xp / level / level_name / level_emoji
                 / streak_days / reputation.
              2) GET /api/users/admin não devolve "reputation" nem "level".
              3) GET /api/users/admin/stats — campo "streak" presente e == 0.
              4) Todos os endpoints stubbed devolvem JSON válido com forma
                 vazia/neutra (sem 500).
              5) Criar um post (POST /api/posts), comentar, dar like —
                 fluxos normais continuam a funcionar (as chamadas internas
                 a award_xp/daily_checkin/update_streak_on_post agora são
                 no-ops).
              6) /users/me/onboard ainda marca onboarded=true.
              7) /api/users/admin continua a devolver os outros campos
                 normais (posts_count, followers_count, etc.).
        - working: true
          agent: "testing"
          comment: |
            ✅ TODOS OS TESTES PASSARAM (19/19)
            
            Smoke tests executados com credenciais admin@vermillion.app / admin123:
            
            ✓ Test 1 - Login Response Fields:
              - Login bem-sucedido (200 OK)
              - Payload do utilizador NÃO contém campos de gamificação
              - Confirmado: sem xp, level, level_name, level_emoji, streak_days, reputation
            
            ✓ Test 2 - Public Profile (GET /api/users/admin):
              - Endpoint funcional (200 OK)
              - Perfil público NÃO contém "reputation" nem "level"
              - Outros campos normais presentes (posts_count, followers_count, etc.)
            
            ✓ Test 3 - User Stats (GET /api/users/admin/stats):
              - Endpoint funcional (200 OK)
              - Campo "streak" presente e == 0 (mantido para compatibilidade)
            
            ✓ Test 4 - Stubbed Endpoints (10 endpoints testados):
              - GET /api/users/{u}/badges → {earned:[], all:[], totals:{}} ✓
              - GET /api/badges/narrative → {badges:[]} ✓
              - GET /api/users/{u}/streak → todos contadores a 0/null ✓
              - GET /api/charms/catalog → [] ✓
              - GET /api/users/{u}/charms → {unlocked:[], equipped:[]} ✓
              - POST /api/users/me/charms/equip → {equipped:[]} (no-op) ✓
              - GET /api/users/{u}/charms-progress → {unlocked_keys:[], progress:{}, catalog:[]} ✓
              - GET /api/cosmetics/catalog → [] ✓
              - POST /api/users/me/cosmetics/equip → {frame:"", sticker:""} (no-op) ✓
              - GET /api/users/{u}/cosmetics → {frame:null, sticker:null} ✓
              Todos devolvem 200 OK com payloads neutros/vazios conforme esperado.
            
            ✓ Test 5 - Legacy Flows (fluxos não devem rebentar):
              - POST /api/posts (criar post) → 200/201 OK ✓
              - POST /api/posts/{id}/like (dar like) → 200 OK ✓
              - POST /api/posts/{id}/comments (comentar) → 200/201 OK ✓
              - POST /api/users/me/onboard → 200 OK ✓
              - Verificado: flag onboarded=true corretamente definida ✓
            
            Conclusão: Gamificação removida com sucesso. Todos os endpoints
            stubbed funcionam corretamente, campos de gamificação ausentes
            dos payloads de utilizador, e fluxos legacy (criar post, like,
            comentar, onboard) continuam funcionais sem erros 500.
            As chamadas internas a award_xp/daily_checkin/update_streak_on_post
            são no-ops e não quebram nada.

frontend:
  - task: "Remoção de gamificação — UI (sem aba Conquistas, sem badges carousel, sem stats de streak/troféus)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/profile/AboutTabSections.js, /app/frontend/src/pages/Profile.js, /app/frontend/src/pages/profile/ProfileTabContent.js, /app/frontend/src/pages/settings/HubTab.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Mudanças visuais (sem auto-test):
              · Profile.js — removido estado `badges`, `loadBadges`, sem
                chamadas a /users/{u}/badges no carregamento, sem prop
                `badges` em ProfileSummaryCards / AboutTabSections.
              · AboutTabSections.js — secção "Conquistas" removida;
                ActivitySection grid passa de 4 para 3 colunas (streak tile
                removido); função BadgesCarousel removida.
              · ProfileTabContent.js — `BadgesTab` removido (não tinha
                consumidores).
              · settings/HubTab.js — QuickStats reduzidos de 4 para 2
                tiles (Posts + Seguidores); Streak e Conquistas/Troféus
                removidos.
              · Manifesto.js mantido (mensagem "Sem streaks que punam"
                continua a fazer sentido com a remoção).

metadata:
  created_by: "main_agent"
  version: "2.3"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Removida gamificação. Verificar smoke-test dos endpoints stubbed,
        confirmar ausência de XP/level/streak_days/reputation no payload
        do utilizador, e validar que os fluxos legacy (criar post,
        comentar, gostar, seguir, onboard) continuam funcionais — as
        chamadas internas a award_xp / daily_checkin /
        update_streak_on_post agora são no-ops mas continuam a ser
        invocadas (não devem rebentar nada).
        Credenciais: admin@vermillion.app / admin123.
    - agent: "testing"
      message: |
        ✅ GAMIFICATION REMOVAL VALIDATION COMPLETE - ALL TESTS PASSED (19/19)
        
        Comprehensive smoke tests executed successfully:
        • Login works, user payload clean (no xp/level/streak_days/reputation)
        • Public profile clean (no reputation/level fields)
        • Stats endpoint returns streak: 0 (maintained for compatibility)
        • All 10 stubbed endpoints return 200 with neutral/empty payloads
        • Legacy flows work perfectly (create post, like, comment, onboard)
        • No 500 errors, no breaking changes
        
        Backend gamification removal is COMPLETE and WORKING.
        Ready for user acceptance or summary.
    - PostIn extended: images[], poll, scheduled_at, is_draft, reply_audience
    - New constants ALLOWED_REACTIONS = {❤️,🔥,👏,😂,💯,😢}, VALID_AUDIENCES = {everyone,following,mentioned}
    - Helper functions: normalize_images, build_poll, post_is_published, auto_publish_due_posts
    - enrich_post returns: images, edit_history, reactions (per-emoji counts + viewer reacted), poll (with viewer vote), reply_audience, is_draft, scheduled_at
    - POST /api/posts now accepts new fields, creates draft/scheduled when requested, defers mentions/notifications until publish
    - PATCH /api/posts/{id} edit window extended to 24h, pushes edit_history snapshot (last 10)
    - GET /api/posts/drafts (own drafts)
    - GET /api/posts/scheduled (own scheduled future posts)
    - POST /api/posts/{id}/publish (publish a draft / publish-now a scheduled post)
    - POST /api/posts/{id}/vote {option_ids: [str]} — supports allow_multiple, toggles vote
    - POST /api/posts/{id}/react {emoji} — toggles emoji reaction, notifies author
    - Feed/explore/tag/user_posts now filter out drafts and future-scheduled posts (user sees own, others don't)
    - auto_publish_due_posts runs on feed/explore/tag/user_posts to promote scheduled posts
    - Comments: parent_id for nested replies, replies_count maintained, DELETE /api/comments/{id} with recursive cascade, reply_audience enforced on POST /api/posts/{id}/comments

backend:
  - task: "Posts Fase 1 — rich content (images, poll, scheduled, drafts, reactions, audience, edit history)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Phase 1 — superseded by Phase 2 expansion. Don't retest unless Phase 2 changes broke something."

  - task: "Fase 2 — PT social mechanics (trending velocity, moods, badges, regions, collections, members, stats, notif star/snooze, conv pin/archive, tag stats, categories)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Implemented broad backend Phase 2 expansion. Endpoints to test (auth via admin@vermillion.app / admin123 — create a 2nd user only if cross-user behaviour is needed):

            TRENDING (with range filter + velocity %):
              GET /api/trending?range=1h|24h|7d|30d  → list of {tag,count,previous,velocity,is_city}
              GET /api/trending/pessoas?range=7d  → list of public users with trend_score/trend_posts/trend_likes
              GET /api/trending/comunidades?range=7d → list of communities with trend_posts/trend_likes
              GET /api/trending/cidades?range=30d → list of {city,count,previous,velocity}

            EXPLORE:
              GET /api/explore/moods → static moods catalogue with last-7d counts
              GET /api/explore/by-mood?mood=tasca|saudade|fado|festa|cafe|praia|futebol|cultura → posts matching that mood
              GET /api/explore/by-city?city=lisboa|porto|... → posts mentioning that PT city
              GET /api/explore/people (auth) → 15 suggested users with mutual_count + reason

            FEED / EXPLORE filters (extended existing):
              GET /api/posts/feed?mood=tasca&sort=recent|top
              GET /api/posts/explore?mood=fado&sort=trending|recent|top
              enrich_post now returns extra fields: mood (string|null), cities (string[]), shares (int)

            PROFILE EXTRAS:
              GET /api/users/{u}/badges → {earned, all, totals} where all[].earned reflects which of the 14 badge rules apply (verificado, embaixador, popular, maratonista, lenda, veterano, tasqueiro, fadista, madrugador, noctivago, colecionador, conversador, fotografo, viajante)
              GET /api/users/{u}/regions → [{city,count}] aggregated from post hashtags+content

            TAG ANALYTICS:
              GET /api/tags/{tag}/stats → {tag,total,posts_week,posts_prev_week,unique_authors,likes_week,velocity,is_city,city_label,related[]}

            BOOKMARK COLLECTIONS:
              GET /api/bookmark-collections (auth)
              POST /api/bookmark-collections (auth, body {name})
              PATCH /api/bookmark-collections/{id} (rename)
              DELETE /api/bookmark-collections/{id} (also unmaps posts)
              POST /api/posts/{post_id}/collection (auth, body {collection_id|null}) → moves bookmark in/out of collection
              GET /api/posts/bookmarks?collection=<id|uncategorized>  → filter by collection

            COMMUNITIES:
              CommunityIn now accepts optional category (one of cidades|musica|desporto|tasca|cultura|tecnologia|fotografia|moda|viagens|outras). _community_public returns category.
              GET /api/communities/{slug}/members → leaderboard sorted by posts_in_community*2 + likes_in_community
              GET /api/communities/{slug}/stats → {members_count,total_posts,posts_week,posts_prev_week,likes_week,unique_authors_week,velocity,by_day:[7 days]}

            EVENTS:
              EventIn now accepts category (festa|cultura|concerto|desporto|tasca|familia|outros). _event_public returns category.
              GET /api/events?category=<key>&when=upcoming|week|month|past|all → filtered list, sorted by starts_at (asc except past=desc)

            NOTIFICATIONS — star/snooze/delete:
              GET /api/notifications now also returns starred (bool) and snoozed_until (iso|null) and hides currently-snoozed items
              POST /api/notifications/{id}/star → toggles starred
              POST /api/notifications/{id}/snooze {hours=24} → sets snoozed_until and marks as read
              DELETE /api/notifications/{id}
              DELETE /api/notifications (clears all *read* notifications for the user)

            CONVERSATIONS — pin/archive:
              GET /api/conversations?filter=all|pinned|unread|archived → returns pinned/archived flags; pinned conversations sort to top; archived hidden from "all"
              POST /api/conversations/{other_id}/pin → toggle
              POST /api/conversations/{other_id}/archive → toggle

            POST SHARE:
              POST /api/posts/{id}/share → increments shares; enrich_post returns shares count

            CATALOGUE (no auth):
              GET /api/catalog/community-categories
              GET /api/catalog/event-categories
              GET /api/catalog/cities

            Sanity checks to confirm legacy flows still work:
              - /api/posts (create/like/repost/bookmark/comment) unchanged in behaviour
              - /api/posts/feed still works without mood/sort params
              - /api/notifications still works for existing seeded notifications
              - /api/conversations still works without filter param (defaults to all)
              - /api/events works without when/category (defaults to upcoming)
              - /api/trending without range works (defaults to 7d)

frontend:
  - task: "Fase 2 — UI redesign across all routes (tabs, filters, mood chips, categories, collections, badges, map, stats)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/*.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Frontend Phase 2 implemented; do NOT auto-test — wait for explicit user permission."

metadata:
  created_by: "main_agent"
  version: "2.1"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Buttons forensic remediation — Settings prefs cross-device persistence + draft edit flow + new PATCH /posts capabilities (images, scheduled_at, draft bypass of 24h window)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Phase 2 backend complete — broad expansion. Please test ALL endpoints listed in the new "Fase 2" backend task description. Use admin@vermillion.app / admin123 (admin already seeded with PT demo data). Skip Phase 1 retest; only test Phase 2 + legacy sanity checks listed in the task. DO NOT test frontend yet.
    - agent: "main"
      message: |
        UX polish pass (front-end only). Backend endpoints used: GET/POST /api/posts/{id}/comments (with parent_id), DELETE /api/comments/{id} (cascading delete), GET /api/trending (now also consumed for hashtag search results in the right sidebar). Please re-verify just these two endpoints work as the front-end now relies on them more heavily:
          1. POST /api/posts/{post_id}/comments with body {"content":"…","parent_id":"<id>"} → returns enriched comment with replies_count and parent_id
          2. DELETE /api/comments/{comment_id} → returns {"deleted": N} where N includes descendants and removes them transitively
        No new endpoints, no schema changes.
    - agent: "main"
      message: |
        Buttons forensic remediation pass (SSS-tier execution). Frontend-only changes EXCEPT for one extension to PATCH /api/posts/{post_id}.

        BACKEND DELTA (please verify):
          1. PATCH /api/posts/{post_id} — model PostEditIn now accepts:
             - content: Optional[str] (was required)
             - images: Optional[List[str]]  (only honoured for drafts and scheduled)
             - scheduled_at: Optional[str]  (ISO; only honoured for scheduled posts; must be future)
          2. The 24h edit window now applies ONLY to live posts (drafts and scheduled bypass it).
          3. Ownership check unchanged (only author can edit).
          4. Reschedule with non-future date must return 400 "Tem de ser uma data futura".
          5. PATCH on live post with no content (only images) must return 400 because images update is only for drafts/scheduled.
          6. edit_history continues to be capped at 10 entries.

        REGRESSION SANITY:
          - POST /api2/users/me/muted-topics, /feed/signals, /posts/{id}/dismiss, /posts/{id}/why, /posts/{id}/boost, /posts/{id}/note, /posts/{id}/follow-thread, /posts/{id}/collection, /api2/users/{u}/favorite, /api2/notifications/preferences, /api2/users/me/export, PATCH /users/me — all UNCHANGED, only their consumption from the frontend was refactored.
          - Login still demo123 / *@vermillion.demo.

    - agent: "main"
      message: |
        Register page UX redesign + new auth endpoints. Backend delta to validate (NO frontend testing in this round):

        NEW BACKEND ENDPOINT (B-001-register):
          - GET /api/auth/check-username?u=<name> — public, no auth. Returns:
            {available: bool, reason?: str, message: str}
            Reasons: empty | too_short (<3) | too_long (>20) | invalid_chars | reserved | taken
            Reserved list: admin, root, support, vermillion, vm, moderator, mod, help, official, api, anon, anonymous, null, undefined, system, team, staff, bot
            Must compare case-insensitively against db.users.username (stored lowercase).

        BIG CHANGES TO EXISTING AUTH FLOW (B-013/B-014/B-015/B-029):
          1. POST /api/auth/register — same payload, but now ALSO creates a session row (db.sessions) with jti and embeds jti in the JWT. login_alerts_enabled defaults to True.
          2. POST /api/auth/login — payload now optionally accepts totp_code. If user.two_fa_enabled is True, totp_code is required (403 "Código 2FA necessário"); invalid code returns 401 "Código 2FA inválido". On success: creates session + emits "new device" notification (login_alert) when UA/IP is unseen for that user.
          3. POST /api/auth/logout — revokes the current session jti (sessions.revoked=true with reason "logout").
          4. POST /api/auth/change-password — also revokes OTHER non-current sessions (reason "password_change"). Current session stays alive.
          5. POST /api/auth/forgot-password — now also matches users by recovery_email. Response payload includes via_recovery: bool.

          6. NEW: GET /api/auth/sessions — returns all non-revoked sessions for the user as
              [{id (jti), browser, os, device, ip, created_at, last_seen_at, current: bool, source}]
          7. NEW: DELETE /api/auth/sessions/{jti} — revokes one session. Cannot revoke the current session (returns 400).
          8. NEW: POST /api/auth/sessions/revoke-others — revokes all sessions except current.

          9. NEW: GET /api/auth/2fa/status → {enabled, setup_in_progress, backup_codes_left, enabled_at}
          10. NEW: POST /api/auth/2fa/setup → {secret, otpauth_url, qr_data_url (data:image/png;base64,…), issuer, account}. Does NOT activate.
          11. NEW: POST /api/auth/2fa/verify {code} → activates 2FA + returns {ok, backup_codes: [10 strings]}. 401 if code invalid.
          12. NEW: POST /api/auth/2fa/disable {password, code} → requires password + valid TOTP/backup code.
          13. NEW: POST /api/auth/2fa/regenerate-backup {password} → rotates backup codes.

        EXTENDED PATCH /api/users/me:
          - Now accepts recovery_email (validated; must contain @, max 200 chars, must differ from primary email) and login_alerts_enabled (bool).
          - public_user() now exposes two_fa_enabled, recovery_email, login_alerts_enabled, cafezinho_conversations.

        OTHER ENDPOINTS ADDED IN THE SAME PASS:
          - PATCH (effectively POST) /api/messages/{message_id}/manual-read — recipient marks one inbound message as read. Returns 404 if not found, 403 if not recipient. Emits ws "message_read" to sender.
          - POST /api/conversations/{other_user_id}/read-all — bulk manual read for a conversation. Returns {updated}.
          - POST /api/conversations/{other_user_id}/cafezinho — toggles per-conversation Cafezinho. Returns {active: bool}.
          - GET /api/messages/{other_user_id} — response now also returns cafezinho_active: bool, and SKIPS auto-mark-read when (other_user_id in user.cafezinho_conversations) OR user.cafezinho_enabled is True.
          - POST /api/messages and POST /api2/messages/forward — now emit WS "new_message" to recipient.
          - GET /api2/posts/boosts/status — returns {used, cap (=3)}. POST /api2/posts/{id}/boost now enforces cap of 3 active boosts (returns 429), and the ranker (compute_ranking_score) multiplies score by 1.6 when boosted_until > now.

        REGRESSION:
          - Existing seed/admin login: admin@vermillion.app / admin123 still must work (no 2FA on that account by default).
          - Existing tokens issued before this change have no "jti" — get_current_user must still accept them (verified via fallthrough — sessions check only when jti is present).
          - All existing endpoints unchanged.

        Please:
          - Verify all NEW endpoints above (success + auth + ownership + edge cases).
          - Verify Cafezinho auto-read suppression actually works when user has cafezinho_conversations contains the peer id.
          - Verify boost cap (3) is enforced and toggling a boost off does not consume the cap.
          - DO NOT test frontend.


