-- Check if posts exist and what columns they have
SELECT
  id,
  content,
  user_id,
  created_at,
  is_reply,
  parent_post_id,
  reply_count
FROM
  public.posts
ORDER BY
  created_at DESC
LIMIT
  5;
