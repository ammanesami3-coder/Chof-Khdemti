'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Trash2,
  Loader2,
  Users,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/shared/back-button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLang } from '@/lib/i18n/language-context';
import { cn } from '@/lib/utils';
import {
  type ModPerms,
  type ModeratorRow,
  type UserSearchRow,
  createModeratorAccount,
  appointModerator,
  updateModeratorPermissions,
  revokeModerator,
  searchUsersForAppoint,
} from '@/lib/actions/admin-moderators';

const DEFAULT_PERMS: ModPerms = {
  can_delete_posts: false,
  can_delete_comments: false,
  can_ban_users: false,
  can_view_reports: true,
};

const PERM_KEYS = [
  ['can_delete_posts', 'permDeletePosts'],
  ['can_delete_comments', 'permDeleteComments'],
  ['can_ban_users', 'permBanUsers'],
  ['can_view_reports', 'permViewReports'],
] as const;

// ── Small slate-styled toggle ─────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-2.5 transition-colors hover:bg-muted/40',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-slate-800 dark:bg-slate-200' : 'bg-muted-foreground/25',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 dark:bg-slate-900',
            checked ? 'start-0.5 translate-x-5 rtl:-translate-x-5' : 'start-0.5',
          )}
        />
      </button>
    </label>
  );
}

function PermissionToggles({
  perms,
  onChange,
  disabled,
}: {
  perms: ModPerms;
  onChange: (next: ModPerms) => void;
  disabled?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERM_KEYS.map(([key, labelKey]) => (
        <Toggle
          key={key}
          label={t(labelKey)}
          checked={perms[key]}
          disabled={disabled}
          onChange={(v) => onChange({ ...perms, [key]: v })}
        />
      ))}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="size-[18px]" />
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ── Main client ───────────────────────────────────────────────────────────────

type Props = { initialModerators: ModeratorRow[] };

export function ModeratorsClient({ initialModerators }: Props) {
  const { t } = useLang();
  const router = useRouter();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <BackButton fallback="/settings" />
        <div>
          <h1 className="text-2xl font-bold">{t('moderatorsTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('moderatorsSubtitle')}</p>
        </div>
      </div>

      <CreateModeratorSection onDone={() => router.refresh()} />
      <AppointSection onDone={() => router.refresh()} />
      <ManageSection moderators={initialModerators} onDone={() => router.refresh()} />
    </main>
  );
}

// ── 1. Create new moderator account ────────────────────────────────────────────

function CreateModeratorSection({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [perms, setPerms] = useState<ModPerms>(DEFAULT_PERMS);
  const [isPending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await createModeratorAccount({ email, password, username, permissions: perms });
      if (!res.success) {
        toast.error(res.error ?? t('moderationActionFailed'));
        return;
      }
      // Email already had an account → it was promoted to moderator instead.
      toast.success(
        res.data?.promotedExisting
          ? t('moderatorAppointedSuccess')
          : t('moderatorCreatedSuccess'),
      );
      setEmail('');
      setPassword('');
      setUsername('');
      setPerms(DEFAULT_PERMS);
      onDone();
    });
  }

  const valid = email.includes('@') && password.length >= 8 && username.length >= 3;

  return (
    <SectionCard icon={ShieldCheck} title={t('createModeratorTitle')}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            type="email"
            placeholder={t('emailLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
          <Input
            type="text"
            placeholder={t('usernameLabel')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            dir="ltr"
          />
          <Input
            type="password"
            placeholder={t('passwordLabel')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
          />
        </div>
        <PermissionToggles perms={perms} onChange={setPerms} disabled={isPending} />
        <Button
          onClick={submit}
          disabled={!valid || isPending}
          className="w-full bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
          size="lg"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          {isPending ? t('creating') : t('createModeratorBtn')}
        </Button>
      </div>
    </SectionCard>
  );
}

// ── 2. Appoint an existing user ─────────────────────────────────────────────────

function AppointSection({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchRow[]>([]);
  const [selected, setSelected] = useState<UserSearchRow | null>(null);
  const [perms, setPerms] = useState<ModPerms>(DEFAULT_PERMS);
  const [isSearching, startSearch] = useTransition();
  const [isSaving, startSave] = useTransition();

  function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const rows = await searchUsersForAppoint(value);
      setResults(rows);
    });
  }

  function appoint() {
    if (!selected) return;
    startSave(async () => {
      const res = await appointModerator(selected.user_id, perms);
      if (!res.success) {
        toast.error(res.error ?? t('moderationActionFailed'));
        return;
      }
      toast.success(t('moderatorAppointedSuccess'));
      setSelected(null);
      setQuery('');
      setResults([]);
      setPerms(DEFAULT_PERMS);
      onDone();
    });
  }

  return (
    <SectionCard icon={Search} title={t('appointModeratorTitle')}>
      {!selected ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('appointSearchPlaceholder')}
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              className="ps-9"
            />
          </div>

          {isSearching && (
            <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t('searching')}
            </p>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">{t('noUsersFound')}</p>
          )}

          <div className="divide-y divide-border/40">
            {results.map((u) => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => {
                  setSelected(u);
                  setPerms(DEFAULT_PERMS);
                }}
                className="flex w-full items-center gap-3 px-1 py-2.5 text-start transition-colors hover:bg-muted/40"
              >
                <UserAvatar user={{ username: u.username, full_name: u.full_name, avatar_url: u.avatar_url }} size="sm" linkable={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
                {u.role === 'moderator' && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {t('roleModerator')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
            <UserAvatar user={{ username: selected.username, full_name: selected.full_name, avatar_url: selected.avatar_url }} size="md" linkable={false} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{selected.full_name}</p>
              <p className="truncate text-sm text-muted-foreground">@{selected.username}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              {t('cancel')}
            </Button>
          </div>

          <div>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('permsLabel')}
            </p>
            <PermissionToggles perms={perms} onChange={setPerms} disabled={isSaving} />
          </div>

          <Button
            onClick={appoint}
            disabled={isSaving}
            className="w-full bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
            size="lg"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {isSaving ? t('appointing') : t('appoint')}
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

// ── 3. Manage current moderators ────────────────────────────────────────────────

function ManageSection({
  moderators,
  onDone,
}: {
  moderators: ModeratorRow[];
  onDone: () => void;
}) {
  const { t } = useLang();

  return (
    <SectionCard icon={Users} title={t('manageModeratorsTitle')}>
      {moderators.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('noModeratorsYet')}</p>
      ) : (
        <div className="space-y-4">
          {moderators.map((m) => (
            <ModeratorItem key={m.user_id} moderator={m} onDone={onDone} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ModeratorItem({
  moderator,
  onDone,
}: {
  moderator: ModeratorRow;
  onDone: () => void;
}) {
  const { t } = useLang();
  const [perms, setPerms] = useState<ModPerms>(moderator.permissions);
  const [isSaving, startSave] = useTransition();
  const [isRevoking, startRevoke] = useTransition();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const dirty =
    perms.can_delete_posts !== moderator.permissions.can_delete_posts ||
    perms.can_delete_comments !== moderator.permissions.can_delete_comments ||
    perms.can_ban_users !== moderator.permissions.can_ban_users ||
    perms.can_view_reports !== moderator.permissions.can_view_reports;

  function save() {
    startSave(async () => {
      const res = await updateModeratorPermissions(moderator.user_id, perms);
      if (!res.success) {
        toast.error(res.error ?? t('moderationActionFailed'));
        return;
      }
      toast.success(t('savedSuccess'));
      onDone();
    });
  }

  function revoke() {
    startRevoke(async () => {
      const res = await revokeModerator(moderator.user_id);
      if (!res.success) {
        toast.error(res.error ?? t('moderationActionFailed'));
        return;
      }
      toast.success(t('moderatorRevokedSuccess'));
      setConfirmRevoke(false);
      onDone();
    });
  }

  return (
    <div className="rounded-xl border border-border/60 p-3.5">
      <div className="mb-3 flex items-center gap-3">
        <UserAvatar
          user={{ username: moderator.username, full_name: moderator.full_name, avatar_url: moderator.avatar_url }}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{moderator.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">@{moderator.username}</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setConfirmRevoke(true)}
          disabled={isRevoking}
        >
          {isRevoking ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          {t('revokeModeratorBtn')}
        </Button>
      </div>

      <PermissionToggles perms={perms} onChange={setPerms} disabled={isSaving} />

      {dirty && (
        <Button
          onClick={save}
          disabled={isSaving}
          size="sm"
          className="mt-3 bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {isSaving ? t('saving') : t('saveChanges')}
        </Button>
      )}

      <AlertDialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revokeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('revokeConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={revoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('revokeModeratorBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
