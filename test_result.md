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
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: |
            Implemented all Phase 1 endpoints. Need full integration test:
            1. Create post with images[] (max 4), confirm enriched response includes images
            2. Create post with poll (options >= 2, ends_in_minutes optional), vote (single + multiple), verify counts and viewer_voted_for, confirm /vote rejects after ends_at
            3. Create scheduled post (scheduled_at > now), confirm hidden from /feed and /explore for other users but visible for self via /users/me/... and /posts/scheduled. Confirm auto_publish promotes once time passes (set scheduled_at to ~5s future, sleep, re-fetch /feed)
            4. Create draft (is_draft=true), confirm appears in /posts/drafts but not /feed; call /posts/{id}/publish, confirm visible everywhere afterwards
            5. Edit post within 24h, confirm edit_history populated and content updated; expect 400 after >24h (skip if not testable)
            6. React with each emoji in ALLOWED_REACTIONS, confirm toggle behaviour, confirm 400 on invalid emoji like "🙈", confirm notifications row created for author
            7. Reply audience: create post with reply_audience="following" as user A; user B (not followed by A) tries to comment → 403; A follows B → still 403 (rule: only people A follows); reply_audience="mentioned": only mentioned usernames in content can reply
            8. Nested comments: POST comment with parent_id, confirm parent.replies_count increments; DELETE parent comment cascade deletes replies; deleting a leaf decrements parent.replies_count
            9. Confirm normal flow unbroken: legacy "image" field still works, /like still toggles ❤️ counter, /repost still works, /comments without parent_id still works.
            Credentials: admin@vermillion.app / admin123 (see /app/memory/test_credentials.md)

frontend:
  - task: "Posts Fase 1 — UI for rich content"
    implemented: false
    working: "NA"
    file: "/app/frontend/src/components/Composer.js, PostCard.js, Feed.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Frontend will be built AFTER backend testing passes. Don't test frontend yet."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Posts Fase 1 — rich content (images, poll, scheduled, drafts, reactions, audience, edit history)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Phase 1 backend implementation complete. Please test exclusively the new endpoints listed in the task description. Use admin@vermillion.app/admin123 to register/login and create a second user (e.g. testuser2@vermillion.app/test1234) for cross-user scenarios (reply audience, reactions notifying author, scheduled visibility). DO NOT test frontend yet.
