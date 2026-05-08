export type StatusContentType = 'text' | 'image' | 'video';

export type StatusWithUser = {
  id: string;
  user_id: string;
  content_type: StatusContentType;
  content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  background_color: string;
  text_color: string;
  font_style: string;
  duration: number;
  created_at: string;
  expires_at: string;
  views_count: number;
  likes_count: number;
  viewed: boolean;
  my_reaction: string | null;
  shared_post_id: string | null;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    cover_url: string | null;
  };
};

export type StatusGroup = {
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    cover_url: string | null;
  };
  statuses: StatusWithUser[];
  hasUnviewed: boolean;
};
