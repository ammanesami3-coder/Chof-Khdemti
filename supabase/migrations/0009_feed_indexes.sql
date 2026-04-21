-- Feed performance indexes
create index if not exists idx_posts_author_created
  on public.posts(author_id, created_at desc);

create index if not exists idx_posts_created_desc
  on public.posts(created_at desc);

create index if not exists idx_comments_post_created
  on public.comments(post_id, created_at desc);

create index if not exists idx_likes_user_post
  on public.likes(user_id, post_id);

create index if not exists idx_follows_follower
  on public.follows(follower_id);
