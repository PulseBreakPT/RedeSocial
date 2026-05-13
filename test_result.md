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
  Phase 1 of major feature expansion: rich posts. Backend additions to /app/backend/server.py:
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
    - "UX polish pass — dead-click elimination across PostDetail (threaded comments), Composer dropdowns (click-outside/ESC), search (hashtag results + ESC), Stories (full-screen tap zones), Bookmarks (auto-remove on unbookmark), empty-state CTAs, Profile clickable pills, Trending city tag canonicalisation"
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


