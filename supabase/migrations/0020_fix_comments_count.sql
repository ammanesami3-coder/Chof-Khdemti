-- Recalculate comments_count for all posts from actual data.
-- Fixes posts where the trigger existed but count was never seeded
-- (e.g. comments inserted before migration 0003 was applied).
UPDATE public.posts
SET comments_count = (
  SELECT COUNT(*)
  FROM public.comments c
  WHERE c.post_id = posts.id
);
