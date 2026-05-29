'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Eye,
  MessageSquare,
  MessageCircle,
  Clock,
  LogOut,
  Activity,
  Lock,
  Wifi,
  PenLine,
  Users,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { BackButton } from '@/components/shared/back-button';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/lib/i18n/language-context';
import { myPrivacyStore } from '@/lib/presence/my-privacy-store';

type VisibilityOption = 'everyone' | 'followers' | 'none';

type VisibilitySettings = {
  profileVisibility: VisibilityOption;
  whoCanMessage: VisibilityOption;
  whoCanComment: VisibilityOption;
  whoCanSeeFollowers: VisibilityOption;
  whoCanSeeFollowing: VisibilityOption;
};

/** Maps each visibility setting to its `profiles` table column. */
const VISIBILITY_COLUMN: Record<keyof VisibilitySettings, string> = {
  profileVisibility: 'profile_visibility',
  whoCanMessage: 'who_can_message',
  whoCanComment: 'who_can_comment',
  whoCanSeeFollowers: 'who_can_see_followers',
  whoCanSeeFollowing: 'who_can_see_following',
};

/** Presence toggles — `show*` is the user-facing value (true = visible). */
type PresenceSettings = {
  showOnline: boolean;
  showLastSeen: boolean;
  showTyping: boolean;
};

const VISIBILITY_DEFAULTS: VisibilitySettings = {
  profileVisibility: 'everyone',
  whoCanMessage: 'everyone',
  whoCanComment: 'everyone',
  whoCanSeeFollowers: 'everyone',
  whoCanSeeFollowing: 'everyone',
};

/** Apply a presence toggle to the live store (used app-wide, instantly). */
function applyPresenceToStore(key: keyof PresenceSettings, hidden: boolean): void {
  if (key === 'showOnline') myPrivacyStore.set({ onlineHidden: hidden });
  else if (key === 'showLastSeen') myPrivacyStore.set({ lastSeenHidden: hidden });
  else myPrivacyStore.set({ typingHidden: hidden });
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      dir="ltr"
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-input'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: VisibilityOption; label: string }[];
  value: VisibilityOption;
  onChange: (val: VisibilityOption) => void;
}) {
  return (
    <div className="mt-3 flex gap-1.5 rounded-xl bg-muted/50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all duration-200 ${
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PrivacyCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`size-5 ${iconColor}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`size-5 ${iconColor}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  const router = useRouter();
  const { t } = useLang();
  const [visibility, setVisibility] = useState<VisibilitySettings>(VISIBILITY_DEFAULTS);
  const [presence, setPresence] = useState<PresenceSettings>({
    showOnline: true,
    showLastSeen: true,
    showTyping: true,
  });
  const [mounted, setMounted] = useState(false);
  const [savingKey, setSavingKey] = useState<keyof PresenceSettings | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    async function init() {
      // The DB is the source of truth for both presence and visibility.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('profiles')
          .select(
            'last_seen_hidden, online_hidden, typing_hidden, profile_visibility, who_can_message, who_can_comment, who_can_see_followers, who_can_see_following',
          )
          .eq('user_id', user.id)
          .single();
        if (data) {
          setPresence({
            showOnline: !data.online_hidden,
            showLastSeen: !data.last_seen_hidden,
            showTyping: !data.typing_hidden,
          });
          setVisibility({
            profileVisibility: (data.profile_visibility as VisibilityOption) ?? 'everyone',
            whoCanMessage: (data.who_can_message as VisibilityOption) ?? 'everyone',
            whoCanComment: (data.who_can_comment as VisibilityOption) ?? 'everyone',
            whoCanSeeFollowers: (data.who_can_see_followers as VisibilityOption) ?? 'everyone',
            whoCanSeeFollowing: (data.who_can_see_following as VisibilityOption) ?? 'everyone',
          });
        }
      }
      setMounted(true);
    }
    void init();
  }, []);

  /**
   * Update a visibility setting: optimistic local update, persist to the
   * `profiles` row, roll back on failure. These settings are enforced
   * server-side (profile page, comment action, conversation creation).
   */
  const updateVisibility = useCallback(
    async <K extends keyof VisibilitySettings>(key: K, value: VisibilitySettings[K]) => {
      const prevValue = visibility[key];
      if (prevValue === value) return;
      setVisibility((prev) => ({ ...prev, [key]: value }));

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let saveFailed = !user;
      if (user) {
        const patch = { [VISIBILITY_COLUMN[key]]: value };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('profiles')
          .update(patch)
          .eq('user_id', user.id);
        saveFailed = !!error;
      }

      if (saveFailed) {
        setVisibility((prev) => ({ ...prev, [key]: prevValue }));
        toast.error(t('operationFailed'));
        return;
      }
      toast.success(t('privacySavedToast'));
    },
    [t, visibility],
  );

  /**
   * Toggle a presence setting. The flow:
   *  1. optimistic local state update,
   *  2. myPrivacyStore.set() — applies across the app instantly (no reload),
   *  3. persist to the DB; roll back both on failure.
   */
  const updatePresence = useCallback(
    async (key: keyof PresenceSettings, nextShow: boolean) => {
      // `show` is the inverse of the `*_hidden` DB column / store flag.
      const hidden = !nextShow;
      setSavingKey(key);
      setPresence((prev) => ({ ...prev, [key]: nextShow }));
      applyPresenceToStore(key, hidden); // instant, app-wide

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let saveFailed = false;
      if (user) {
        const patch =
          key === 'showOnline'
            ? { online_hidden: hidden }
            : key === 'showLastSeen'
              ? { last_seen_hidden: hidden }
              : { typing_hidden: hidden };
        const { error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('user_id', user.id);
        saveFailed = !!error;
      }

      if (saveFailed) {
        // Roll back local state + the live store.
        setPresence((prev) => ({ ...prev, [key]: !nextShow }));
        applyPresenceToStore(key, !hidden);
        setSavingKey(null);
        toast.error(t('operationFailed'));
        return;
      }
      setSavingKey(null);
      toast.success(t('privacySavedToast'));
    },
    [t],
  );

  const handleSignOutAll = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
      router.push('/login');
    } finally {
      setIsSigningOut(false);
    }
  }, [router]);

  const visibilityOptions: { value: VisibilityOption; label: string }[] = [
    { value: 'everyone', label: t('everyoneOption') },
    { value: 'followers', label: t('followersOnlyOption') },
    { value: 'none', label: t('noOneOption') },
  ];

  const messageOptions: { value: VisibilityOption; label: string }[] = [
    { value: 'everyone', label: t('everyoneOption') },
    { value: 'followers', label: t('followersOnlyOption') },
  ];

  if (!mounted) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallback="/settings" />
        <h1 className="text-2xl font-bold">{t('privacyAndSecurity')}</h1>
      </div>

      {/* ── Privacy Settings ── */}
      <section className="mb-5">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('privacySettingsSection')}
        </h2>
        <div className="space-y-3">
          <PrivacyCard
            icon={Eye}
            iconBg="bg-teal-50 dark:bg-teal-950/40"
            iconColor="text-teal-600 dark:text-teal-400"
            title={t('profileVisibilityLabel')}
            description={t('profileVisibilityDesc')}
          >
            <SegmentedControl
              options={visibilityOptions}
              value={visibility.profileVisibility}
              onChange={(val) => updateVisibility('profileVisibility', val)}
            />
          </PrivacyCard>

          <PrivacyCard
            icon={MessageSquare}
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            iconColor="text-blue-600 dark:text-blue-400"
            title={t('whoCanMessageLabel')}
            description={t('whoCanMessageDesc')}
          >
            <SegmentedControl
              options={messageOptions}
              value={visibility.whoCanMessage}
              onChange={(val) => updateVisibility('whoCanMessage', val)}
            />
          </PrivacyCard>

          <PrivacyCard
            icon={MessageCircle}
            iconBg="bg-purple-50 dark:bg-purple-950/40"
            iconColor="text-purple-600 dark:text-purple-400"
            title={t('whoCanCommentLabel')}
            description={t('whoCanCommentDesc')}
          >
            <SegmentedControl
              options={visibilityOptions}
              value={visibility.whoCanComment}
              onChange={(val) => updateVisibility('whoCanComment', val)}
            />
          </PrivacyCard>

          <PrivacyCard
            icon={Users}
            iconBg="bg-indigo-50 dark:bg-indigo-950/40"
            iconColor="text-indigo-600 dark:text-indigo-400"
            title={t('whoCanSeeFollowersLabel')}
            description={t('whoCanSeeFollowersDesc')}
          >
            <SegmentedControl
              options={visibilityOptions}
              value={visibility.whoCanSeeFollowers}
              onChange={(val) => updateVisibility('whoCanSeeFollowers', val)}
            />
          </PrivacyCard>

          <PrivacyCard
            icon={UserCheck}
            iconBg="bg-pink-50 dark:bg-pink-950/40"
            iconColor="text-pink-600 dark:text-pink-400"
            title={t('whoCanSeeFollowingLabel')}
            description={t('whoCanSeeFollowingDesc')}
          >
            <SegmentedControl
              options={visibilityOptions}
              value={visibility.whoCanSeeFollowing}
              onChange={(val) => updateVisibility('whoCanSeeFollowing', val)}
            />
          </PrivacyCard>
        </div>

        <p className="mt-2.5 px-1 text-[11px] leading-relaxed text-muted-foreground/60">
          {t('privacyFollowersHint')}
        </p>
      </section>

      {/* ── Presence Settings ── */}
      <section className="mb-5">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('presenceSettingsSection')}
        </h2>
        <div className="space-y-3">
          <ToggleCard
            icon={Wifi}
            iconBg="bg-green-50 dark:bg-green-950/40"
            iconColor="text-green-600 dark:text-green-400"
            title={t('showOnlineLabel')}
            description={t('showOnlineDesc')}
            checked={presence.showOnline}
            disabled={savingKey === 'showOnline'}
            onChange={() => updatePresence('showOnline', !presence.showOnline)}
          />
          <ToggleCard
            icon={Clock}
            iconBg="bg-orange-50 dark:bg-orange-950/40"
            iconColor="text-orange-500 dark:text-orange-400"
            title={t('showLastSeenLabel')}
            description={t('showLastSeenDesc')}
            checked={presence.showLastSeen}
            disabled={savingKey === 'showLastSeen'}
            onChange={() => updatePresence('showLastSeen', !presence.showLastSeen)}
          />
          <ToggleCard
            icon={PenLine}
            iconBg="bg-sky-50 dark:bg-sky-950/40"
            iconColor="text-sky-600 dark:text-sky-400"
            title={t('showTypingLabel')}
            description={t('showTypingDesc')}
            checked={presence.showTyping}
            disabled={savingKey === 'showTyping'}
            onChange={() => updatePresence('showTyping', !presence.showTyping)}
          />
        </div>

        <p className="mt-2.5 px-1 text-[11px] leading-relaxed text-muted-foreground/60">
          {t('presenceReciprocityHint')}
        </p>
      </section>

      {/* ── Security Settings ── */}
      <section className="mb-5">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('securitySettingsSectionLabel')}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm divide-y divide-border/40">
          {/* 2FA — coming soon */}
          <div className="flex items-center gap-3 px-4 py-3.5 opacity-50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/40">
              <Shield className="size-5 text-green-600 dark:text-green-400" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{t('twoFactorAuthLabel')}</p>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t('comingSoon')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('twoFactorAuthDesc')}
              </p>
            </div>
            <Lock className="size-4 text-muted-foreground/40" />
          </div>

          {/* Login activity — coming soon */}
          <div className="flex items-center gap-3 px-4 py-3.5 opacity-50">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/40">
              <Activity className="size-5 text-sky-600 dark:text-sky-400" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{t('loginActivityLabel')}</p>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t('comingSoon')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('loginActivityDesc')}
              </p>
            </div>
            <Lock className="size-4 text-muted-foreground/40" />
          </div>

          {/* Sign out all devices */}
          {!showSignOutConfirm ? (
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="group flex w-full items-center gap-3 px-4 py-3.5 text-start transition-all hover:bg-muted/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 transition-transform group-hover:scale-105">
                <LogOut className="size-5 text-destructive" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-destructive">
                  {t('signOutAllDevices')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('signOutAllDevicesDesc')}
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm font-semibold">
                {t('signOutAllDevices')}?
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('signOutAllConfirmDesc')}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSignOutAll}
                  disabled={isSigningOut}
                  className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-destructive/90 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      {t('signingOutAll')}
                    </span>
                  ) : (
                    t('confirm')
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 rounded-xl border border-border py-2 text-sm font-medium transition-all hover:bg-muted"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
