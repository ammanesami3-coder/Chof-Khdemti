'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

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

type CreateStatusInput = {
  content_type: StatusContentType;
  content?: string;
  media_url?: string;
  thumbnail_url?: string;
  background_color?: string;
  text_color?: string;
  font_style?: string;
  duration?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_SELECT =
  'id, user_id, content_type, content, media_url, thumbnail_url, background_color, text_color, font_style, duration, created_at, expires_at, views_count, likes_count' as const;

// ── getActiveStatuses ─────────────────────────────────────────────────────────

export async function getActiveStatuses(): Promise<StatusGroup[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  const relevantIds = [...followingIds, user.id];

  const now = new Date().toISOString();

  const { data: rawStatuses } = await supabase
    .from('status_updates')
    .select(STATUS_SELECT)
    .in('user_id', relevantIds)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (!rawStatuses || rawStatuses.length === 0) return [];

  const statusIds = rawStatuses.map((s) => s.id);
  const userIds = [...new Set(rawStatuses.map((s) => s.user_id))];

  const [usersRes, profilesRes, viewsRes, likesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', userIds),
    supabase.from('profiles').select('user_id, avatar_url, cover_url').in('user_id', userIds),
    supabase
      .from('status_views')
      .select('status_id')
      .eq('viewer_id', user.id)
      .in('status_id', statusIds),
    supabase
      .from('status_likes')
      .select('status_id, reaction')
      .eq('user_id', user.id)
      .in('status_id', statusIds),
  ]);

  const usersMap = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const profilesMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const viewedIds = new Set((viewsRes.data ?? []).map((v) => v.status_id));
  const reactionsMap = new Map(
    (likesRes.data ?? []).map((l) => [l.status_id, l.reaction]),
  );

  // Build StatusWithUser[]
  const statuses: StatusWithUser[] = rawStatuses
    .map((s) => {
      const u = usersMap.get(s.user_id);
      if (!u) return null;
      return {
        id: s.id,
        user_id: s.user_id,
        content_type: s.content_type as StatusContentType,
        content: s.content,
        media_url: s.media_url,
        thumbnail_url: s.thumbnail_url,
        background_color: s.background_color,
        text_color: s.text_color,
        font_style: s.font_style,
        duration: s.duration,
        created_at: s.created_at,
        expires_at: s.expires_at,
        views_count: s.views_count,
        likes_count: s.likes_count,
        viewed: viewedIds.has(s.id) || s.user_id === user.id,
        my_reaction: reactionsMap.get(s.id) ?? null,
        user: {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          avatar_url: profilesMap.get(s.user_id)?.avatar_url ?? null,
          cover_url: profilesMap.get(s.user_id)?.cover_url ?? null,
        },
      };
    })
    .filter((s): s is StatusWithUser => s !== null);

  // Group by user (ordered: own group first, then by earliest unviewed/viewed)
  const groupMap = new Map<string, StatusGroup>();

  // Maintain insertion order: own first, then follows in order of statuses
  const orderedUserIds: string[] = [];

  for (const s of statuses) {
    if (!groupMap.has(s.user_id)) {
      orderedUserIds.push(s.user_id);
      groupMap.set(s.user_id, {
        user: s.user,
        statuses: [],
        hasUnviewed: false,
      });
    }
    const group = groupMap.get(s.user_id)!;
    group.statuses.push(s);
    if (!s.viewed) group.hasUnviewed = true;
  }

  // Sort: own group first, then groups with unviewed, then viewed
  const ownId = user.id;
  const groups = orderedUserIds.map((id) => groupMap.get(id)!).sort((a, b) => {
    if (a.user.id === ownId) return -1;
    if (b.user.id === ownId) return 1;
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    return 0;
  });

  return groups;
}

// ── createStatus ──────────────────────────────────────────────────────────────

export async function createStatus(
  input: CreateStatusInput,
): Promise<{ data?: StatusWithUser; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  // Validate
  if (input.content_type === 'text') {
    if (!input.content?.trim()) return { error: 'اكتب شيئاً في حالتك' };
    if (input.content.length > 500) return { error: 'الحد الأقصى 500 حرف' };
  } else {
    if (!input.media_url) return { error: 'يجب تحميل ملف' };
  }

  const [userRes, profileRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').eq('id', user.id).single(),
    supabase.from('profiles').select('avatar_url, cover_url').eq('user_id', user.id).single(),
  ]);

  if (!userRes.data) return { error: 'المستخدم غير موجود' };

  const { data: status, error } = await supabase
    .from('status_updates')
    .insert({
      user_id: user.id,
      content_type: input.content_type,
      content: input.content?.trim() ?? null,
      media_url: input.media_url ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      background_color: input.background_color ?? '#1877F2',
      text_color: input.text_color ?? '#FFFFFF',
      font_style: input.font_style ?? 'default',
      duration: input.duration ?? 5,
    })
    .select(STATUS_SELECT)
    .single();

  if (error) return { error: error.message };

  revalidatePath('/feed');

  return {
    data: {
      id: status.id,
      user_id: status.user_id,
      content_type: status.content_type as StatusContentType,
      content: status.content,
      media_url: status.media_url,
      thumbnail_url: status.thumbnail_url,
      background_color: status.background_color,
      text_color: status.text_color,
      font_style: status.font_style,
      duration: status.duration,
      created_at: status.created_at,
      expires_at: status.expires_at,
      views_count: 0,
      likes_count: 0,
      viewed: true,
      my_reaction: null,
      user: {
        id: userRes.data.id,
        username: userRes.data.username,
        full_name: userRes.data.full_name,
        avatar_url: profileRes.data?.avatar_url ?? null,
        cover_url: profileRes.data?.cover_url ?? null,
      },
    },
  };
}

// ── viewStatus ────────────────────────────────────────────────────────────────

export async function viewStatus(statusId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('status_views')
    .upsert({ status_id: statusId, viewer_id: user.id }, { onConflict: 'status_id,viewer_id' });
}

// ── toggleStatusLike ──────────────────────────────────────────────────────────

export async function toggleStatusLike(
  statusId: string,
  reaction = 'like',
): Promise<{ liked: boolean; reaction: string | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { liked: false, reaction: null, error: 'يجب تسجيل الدخول' };

  const { data: existing } = await supabase
    .from('status_likes')
    .select('id, reaction')
    .eq('status_id', statusId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    if (existing.reaction === reaction) {
      // Unlike
      await supabase.from('status_likes').delete().eq('id', existing.id);
      return { liked: false, reaction: null };
    }
    // Switch reaction
    await supabase
      .from('status_likes')
      .update({ reaction })
      .eq('id', existing.id);
    return { liked: true, reaction };
  }

  // New like
  const { error } = await supabase
    .from('status_likes')
    .insert({ status_id: statusId, user_id: user.id, reaction });

  if (error) return { liked: false, reaction: null, error: error.message };
  return { liked: true, reaction };
}

// ── replyToStatus ─────────────────────────────────────────────────────────────

export async function replyToStatus(
  statusId: string,
  content: string,
): Promise<{ conversationId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول' };

  const { data: status } = await supabase
    .from('status_updates')
    .select('user_id')
    .eq('id', statusId)
    .single();

  if (!status) return { error: 'الحالة غير موجودة' };
  if (status.user_id === user.id) return { error: 'لا يمكنك الرد على حالتك' };

  const { data: usersData } = await supabase
    .from('users')
    .select('id, account_type')
    .in('id', [user.id, status.user_id]);

  const currentUserData = usersData?.find((u) => u.id === user.id);
  const statusOwner = usersData?.find((u) => u.id === status.user_id);

  if (!currentUserData || !statusOwner) return { error: 'خطأ في البيانات' };

  let artisanId: string;
  let customerId: string;

  if (
    currentUserData.account_type === 'artisan' &&
    statusOwner.account_type === 'customer'
  ) {
    artisanId = currentUserData.id;
    customerId = statusOwner.id;
  } else if (
    currentUserData.account_type === 'customer' &&
    statusOwner.account_type === 'artisan'
  ) {
    artisanId = statusOwner.id;
    customerId = currentUserData.id;
  } else {
    return { error: 'يمكن التواصل بين الحرفي والزبون فقط' };
  }

  // Find or create conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('artisan_id', artisanId)
    .eq('customer_id', customerId)
    .maybeSingle();

  let conversationId: string;

  if (existing) {
    conversationId = existing.id;
  } else {
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({ artisan_id: artisanId, customer_id: customerId })
      .select('id')
      .single();
    if (convErr || !newConv) return { error: 'تعذّر إنشاء محادثة' };
    conversationId = newConv.id;
  }

  const { error: msgErr } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: content.trim(),
    reply_to_status_id: statusId,
  });

  if (msgErr) return { error: msgErr.message };
  return { conversationId };
}

// ── deleteStatus ──────────────────────────────────────────────────────────────

export async function deleteStatus(
  statusId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'يجب تسجيل الدخول أولاً' };

  const { error } = await supabase
    .from('status_updates')
    .delete()
    .eq('id', statusId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/feed');
  return {};
}

// ── getStatusViewers ──────────────────────────────────────────────────────────

export async function getStatusViewers(statusId: string): Promise<
  { username: string; full_name: string; avatar_url: string | null; reaction: string | null }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Only the status owner can see viewers
  const { data: status } = await supabase
    .from('status_updates')
    .select('user_id')
    .eq('id', statusId)
    .single();

  if (!status || status.user_id !== user.id) return [];

  const [viewsRes, likesRes] = await Promise.all([
    supabase.from('status_views').select('viewer_id').eq('status_id', statusId),
    supabase.from('status_likes').select('user_id, reaction').eq('status_id', statusId),
  ]);

  if (!viewsRes.data || viewsRes.data.length === 0) return [];

  const viewerIds = viewsRes.data.map((v) => v.viewer_id);
  const reactionsMap = new Map((likesRes.data ?? []).map((l) => [l.user_id, l.reaction as string]));

  const [usersRes, profilesRes] = await Promise.all([
    supabase.from('users').select('id, username, full_name').in('id', viewerIds),
    supabase.from('profiles').select('user_id, avatar_url').in('user_id', viewerIds),
  ]);

  const profilesMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.user_id, p]),
  );

  return (usersRes.data ?? []).map((u) => ({
    username: u.username,
    full_name: u.full_name,
    avatar_url: profilesMap.get(u.id)?.avatar_url ?? null,
    reaction: reactionsMap.get(u.id) ?? null,
  }));
}

// ── getActiveStatusForUser ────────────────────────────────────────────────────

export async function getActiveStatusForUser(
  userId: string,
): Promise<StatusGroup | null> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data: rawStatuses } = await supabase
    .from('status_updates')
    .select(STATUS_SELECT)
    .eq('user_id', userId)
    .gt('expires_at', now)
    .order('created_at', { ascending: false });

  if (!rawStatuses || rawStatuses.length === 0) return null;

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const statusIds = rawStatuses.map((s) => s.id);

  const [userRes, profileRes, viewsRes, likesRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, full_name')
      .eq('id', userId)
      .single(),
    supabase
      .from('profiles')
      .select('user_id, avatar_url, cover_url')
      .eq('user_id', userId)
      .single(),
    authUser
      ? supabase
          .from('status_views')
          .select('status_id')
          .eq('viewer_id', authUser.id)
          .in('status_id', statusIds)
      : Promise.resolve({ data: [] as { status_id: string }[] }),
    authUser
      ? supabase
          .from('status_likes')
          .select('status_id, reaction')
          .eq('user_id', authUser.id)
          .in('status_id', statusIds)
      : Promise.resolve({ data: [] as { status_id: string; reaction: string }[] }),
  ]);

  if (!userRes.data) return null;

  const viewedIds = new Set((viewsRes.data ?? []).map((v) => v.status_id));
  const reactionsMap = new Map(
    (likesRes.data ?? []).map((l) => [l.status_id, l.reaction]),
  );

  const userProfile = {
    id: userRes.data.id,
    username: userRes.data.username,
    full_name: userRes.data.full_name,
    avatar_url: profileRes.data?.avatar_url ?? null,
    cover_url: profileRes.data?.cover_url ?? null,
  };

  const statuses: StatusWithUser[] = rawStatuses.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    content_type: s.content_type as StatusContentType,
    content: s.content,
    media_url: s.media_url,
    thumbnail_url: s.thumbnail_url,
    background_color: s.background_color,
    text_color: s.text_color,
    font_style: s.font_style,
    duration: s.duration,
    created_at: s.created_at,
    expires_at: s.expires_at,
    views_count: s.views_count,
    likes_count: s.likes_count,
    viewed: viewedIds.has(s.id) || s.user_id === authUser?.id,
    my_reaction: reactionsMap.get(s.id) ?? null,
    user: userProfile,
  }));

  return {
    user: userProfile,
    statuses,
    hasUnviewed: statuses.some((s) => !s.viewed),
  };
}
