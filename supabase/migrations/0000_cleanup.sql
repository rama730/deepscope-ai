-- ==============================================================================
-- CLEANUP SCRIPT
-- Run this FIRST to wipe the database clean before applying new migrations.
-- ==============================================================================

-- 1. DROP TABLES (Cascade will handle dependent tables/keys)
DROP TABLE IF EXISTS public.notification_metadata CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.project_presence CASCADE;
DROP TABLE IF EXISTS public.project_chat_messages CASCADE;
DROP TABLE IF EXISTS public.project_files CASCADE;
DROP TABLE IF EXISTS public.project_tasks CASCADE;
DROP TABLE IF EXISTS public.project_sprints CASCADE;
DROP TABLE IF EXISTS public.project_applications CASCADE;
DROP TABLE IF EXISTS public.project_collaborators CASCADE;
DROP TABLE IF EXISTS public.project_followers CASCADE;
DROP TABLE IF EXISTS public.project_open_roles CASCADE;
DROP TABLE IF EXISTS public.project_update_links CASCADE;
DROP TABLE IF EXISTS public.project_updates CASCADE;
DROP TABLE IF EXISTS public.project_ideas CASCADE;
DROP TABLE IF EXISTS public.project_roles CASCADE;
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.post_views CASCADE;
DROP TABLE IF EXISTS public.post_reposts CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.poll_votes CASCADE;
DROP TABLE IF EXISTS public.mentions CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.blocks CASCADE;
DROP TABLE IF EXISTS public.mutes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.message_reactions CASCADE;
DROP TABLE IF EXISTS public.typing_indicators CASCADE;
DROP TABLE IF EXISTS public.conversation_metadata CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.skill_endorsements CASCADE;
DROP TABLE IF EXISTS public.experiences CASCADE;
DROP TABLE IF EXISTS public.education CASCADE;
DROP TABLE IF EXISTS public.certifications CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.user_languages CASCADE;
DROP TABLE IF EXISTS public.volunteering CASCADE;
DROP TABLE IF EXISTS public.publications CASCADE;
DROP TABLE IF EXISTS public.social_links CASCADE;
DROP TABLE IF EXISTS public.featured_items CASCADE;
DROP TABLE IF EXISTS public.recommendations CASCADE;

-- 2. DROP TYPES (If any custom types were created)
DROP TYPE IF EXISTS public.project_status CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.task_priority CASCADE;

-- 3. DROP FUNCTIONS (Optional, but good for a full clean)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_post_counters() CASCADE;
DROP FUNCTION IF EXISTS public.update_bookmark_counts() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_profile_strength(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_conversations_with_metadata(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_messages_with_details(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.mark_messages_read(UUID, UUID) CASCADE;

-- ==============================================================================
-- DATABASE IS NOW CLEAN.
-- You can now run migrations 0001 through 0007.
-- ==============================================================================
