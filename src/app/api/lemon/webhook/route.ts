import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

// Force Node.js runtime — crypto.timingSafeEqual requires Node, not Edge
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');

  // ── 1. Verify HMAC-SHA256 signature ──────────────────────────────────────
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not configured');
    return new Response('Webhook not configured', { status: 500 });
  }

  if (!signature) {
    console.warn('[webhook] Missing x-signature header');
    return new Response('Invalid signature', { status: 401 });
  }

  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = hmac.update(rawBody).digest('hex');

  // timingSafeEqual requires same-length buffers; different lengths = invalid
  const digestBuf = Buffer.from(digest, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');

  if (
    digestBuf.length !== sigBuf.length ||
    !crypto.timingSafeEqual(digestBuf, sigBuf)
  ) {
    console.warn('[webhook] Signature mismatch');
    return new Response('Invalid signature', { status: 401 });
  }

  // ── 2. Parse payload ──────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const meta = payload.meta as Record<string, unknown> | undefined;
  const eventName = meta?.event_name as string | undefined;
  const customData = meta?.custom_data as Record<string, unknown> | undefined;
  const eventId =
    (meta?.event_id as string | undefined) ??
    (customData?.event_id as string | undefined) ??
    crypto.randomUUID();

  console.log(`[webhook] Received: ${eventName} | event_id: ${eventId}`);

  // ── 3. Idempotency check ──────────────────────────────────────────────────
  const { data: existing } = await supabaseAdmin
    .from('webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existing) {
    console.log(`[webhook] Already processed: ${eventId}`);
    return new Response('Already processed', { status: 200 });
  }

  // ── 4. Persist event record first (idempotency guard) ─────────────────────
  const { error: insertErr } = await supabaseAdmin.from('webhook_events').insert({
    provider: 'lemon_squeezy',
    event_id: eventId,
    event_type: eventName ?? 'unknown',
    payload: payload as unknown as Json,
  });

  // Duplicate key = already inserted in a race → treat as processed
  if (insertErr && insertErr.code === '23505') {
    console.log(`[webhook] Race-condition duplicate: ${eventId}`);
    return new Response('Already processed', { status: 200 });
  }

  // ── 5. Extract user_id from custom data ───────────────────────────────────
  const userId = customData?.user_id as string | undefined;
  if (!userId) {
    console.error(`[webhook] Missing user_id in custom_data for event: ${eventName}`);
    return new Response('Missing user_id', { status: 400 });
  }

  // ── 6. Handle each event ──────────────────────────────────────────────────
  const data = payload.data as Record<string, unknown> | undefined;
  const subAttrs = data?.attributes as Record<string, unknown> | undefined;
  const lemonSubId = data?.id as string | undefined;

  const now = new Date().toISOString();

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_resumed': {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          lemon_subscription_id: lemonSubId ?? null,
          lemon_customer_id: subAttrs?.customer_id?.toString() ?? null,
          lemon_variant_id: subAttrs?.variant_id?.toString() ?? null,
          current_period_start: subAttrs?.created_at
            ? new Date(subAttrs.created_at as string).toISOString()
            : null,
          current_period_end: (subAttrs?.renews_at as string | null) ?? null,
          cancel_at_period_end: false,
          updated_at: now,
        })
        .eq('user_id', userId);
      console.log(
        `[webhook] ${eventName} → status=active | user=${userId} | err=${error?.message ?? 'none'}`,
      );
      break;
    }

    case 'subscription_updated': {
      // Reflect any status change LS pushes (e.g. resumed after past_due)
      const lsStatus = subAttrs?.status as string | undefined;
      const mappedStatus =
        lsStatus === 'active'
          ? 'active'
          : lsStatus === 'past_due'
            ? 'past_due'
            : lsStatus === 'cancelled' || lsStatus === 'expired'
              ? 'cancelled'
              : undefined;

      if (mappedStatus) {
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: mappedStatus,
            current_period_end: (subAttrs?.renews_at as string | null) ?? null,
            cancel_at_period_end:
              (subAttrs?.cancelled as boolean | undefined) ?? false,
            updated_at: now,
          })
          .eq('user_id', userId);
        console.log(
          `[webhook] subscription_updated → status=${mappedStatus} | user=${userId} | err=${error?.message ?? 'none'}`,
        );
      }
      break;
    }

    case 'subscription_payment_success': {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_end: (subAttrs?.renews_at as string | null) ?? null,
          updated_at: now,
        })
        .eq('user_id', userId);
      console.log(
        `[webhook] payment_success → status=active | user=${userId} | err=${error?.message ?? 'none'}`,
      );
      break;
    }

    case 'subscription_payment_failed': {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: now,
        })
        .eq('user_id', userId);
      console.log(
        `[webhook] payment_failed → status=past_due | user=${userId} | err=${error?.message ?? 'none'}`,
      );
      break;
    }

    case 'subscription_cancelled': {
      // Access continues until current_period_end — only flag cancel_at_period_end
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: now,
        })
        .eq('user_id', userId);
      console.log(
        `[webhook] subscription_cancelled → cancel_at_period_end=true | user=${userId} | err=${error?.message ?? 'none'}`,
      );
      break;
    }

    case 'subscription_expired': {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: now,
        })
        .eq('user_id', userId);
      console.log(
        `[webhook] subscription_expired → status=cancelled | user=${userId} | err=${error?.message ?? 'none'}`,
      );
      break;
    }

    default:
      console.log(`[webhook] Unhandled event: ${eventName}`);
  }

  return new Response('OK', { status: 200 });
}
