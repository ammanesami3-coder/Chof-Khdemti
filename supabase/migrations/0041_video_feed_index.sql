-- Add stored generated column so the video feed filter is a simple boolean
-- equality check instead of relying on JSONB @> containment through PostgREST.
-- PostgreSQL computes the expression for all existing rows automatically.

ALTER TABLE public.posts
  ADD COLUMN has_video boolean GENERATED ALWAYS AS (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(media) AS elem
      WHERE elem->>'type' = 'video'
    )
  ) STORED;

-- Partial B-tree index: only covers video posts, keeps the index small and
-- makes ORDER BY created_at DESC, id DESC on the video feed fast.
CREATE INDEX posts_has_video_created_idx
  ON public.posts (created_at DESC, id DESC)
  WHERE has_video = true;
