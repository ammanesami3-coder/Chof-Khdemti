import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyWebhookSignature,
  mapLemonStatusToDb,
  signBody,
} from '@/lib/lemon-squeezy/webhook-helpers';

// ── Pure helper tests (no DB needed) ─────────────────────────────────────────

const SECRET = 'test-secret-key';

describe('verifyWebhookSignature', () => {
  it('returns true for a correct signature', () => {
    const body = '{"meta":{"event_name":"subscription_created"}}';
    const sig = signBody(body, SECRET);
    expect(verifyWebhookSignature(body, sig, SECRET)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    const body = '{"meta":{"event_name":"subscription_created"}}';
    expect(verifyWebhookSignature(body, 'bad-sig', SECRET)).toBe(false);
  });

  it('returns false when signature is null', () => {
    const body = '{"meta":{"event_name":"subscription_created"}}';
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
  });

  it('returns false when body is tampered after signing', () => {
    const original = '{"meta":{"event_name":"subscription_created"}}';
    const sig = signBody(original, SECRET);
    const tampered = '{"meta":{"event_name":"subscription_cancelled"}}';
    expect(verifyWebhookSignature(tampered, sig, SECRET)).toBe(false);
  });
});

describe('mapLemonStatusToDb', () => {
  it('maps "active" → "active"', () => {
    expect(mapLemonStatusToDb('active')).toBe('active');
  });

  it('maps "past_due" → "past_due"', () => {
    expect(mapLemonStatusToDb('past_due')).toBe('past_due');
  });

  it('maps "cancelled" → "cancelled"', () => {
    expect(mapLemonStatusToDb('cancelled')).toBe('cancelled');
  });

  it('maps "expired" → "cancelled"', () => {
    expect(mapLemonStatusToDb('expired')).toBe('cancelled');
  });

  it('returns null for unknown status', () => {
    expect(mapLemonStatusToDb('paused')).toBeNull();
  });
});

// ── Route handler tests (with supabaseAdmin mock) ─────────────────────────────

// Build a chainable mock for supabase query builder
function buildChain(finalValue: object) {
  const chain: Record<string, unknown> = {};
  ['select', 'eq', 'neq', 'update'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue);
  return chain;
}

const mockChain = buildChain({ data: null, error: null });
const mockFrom = vi.fn().mockReturnValue(mockChain);

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

function makeSig(body: string) {
  return signBody(body, SECRET);
}

function makeRequest(body: string, signature?: string) {
  return new Request('http://localhost/api/lemon/webhook', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      ...(signature !== undefined ? { 'x-signature': signature } : {}),
    },
  });
}

function buildPayload(
  eventName: string,
  userId: string,
  eventId = 'evt-001',
  lsStatus?: string,
) {
  return JSON.stringify({
    meta: {
      event_name: eventName,
      event_id: eventId,
      custom_data: { user_id: userId },
    },
    data: {
      id: 'sub_abc',
      attributes: {
        status: lsStatus ?? 'active',
        customer_id: 'cust_1',
        variant_id: 'var_1',
        renews_at: '2025-07-01T00:00:00Z',
        created_at: '2025-06-01T00:00:00Z',
      },
    },
  });
}

describe('Lemon Squeezy webhook route handler', () => {
  beforeEach(() => {
    process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = SECRET;
    vi.clearAllMocks();
    // Default: event not found (fresh request)
    (mockChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null,
    });
    (mockChain.insert as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('rejects request with invalid signature → 401', async () => {
    const { POST } = await import('@/app/api/lemon/webhook/route');
    const body = buildPayload('subscription_created', 'user-123');
    const res = await POST(makeRequest(body, 'wrong-signature'));
    expect(res.status).toBe(401);
  });

  it('rejects request with missing signature → 401', async () => {
    const { POST } = await import('@/app/api/lemon/webhook/route');
    const body = buildPayload('subscription_created', 'user-123');
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(401);
  });

  it('processes subscription_created → calls update with status=active', async () => {
    const { POST } = await import('@/app/api/lemon/webhook/route');
    const body = buildPayload('subscription_created', 'user-123', 'evt-002');
    const res = await POST(makeRequest(body, makeSig(body)));

    expect(res.status).toBe(200);
    // update was called on the subscriptions table
    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('processes subscription_payment_failed → calls update with status=past_due', async () => {
    const { POST } = await import('@/app/api/lemon/webhook/route');
    const body = buildPayload('subscription_payment_failed', 'user-123', 'evt-003');
    const res = await POST(makeRequest(body, makeSig(body)));

    expect(res.status).toBe(200);
    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'past_due' }),
    );
  });

  it('is idempotent — same event_id returns 200 without calling update again', async () => {
    const { POST } = await import('@/app/api/lemon/webhook/route');
    const body = buildPayload('subscription_created', 'user-123', 'evt-004');
    const sig = makeSig(body);

    // Second request: event already exists
    (mockChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'existing' },
      error: null,
    });

    const res = await POST(makeRequest(body, sig));
    expect(res.status).toBe(200);
    // update should NOT have been called
    expect(mockChain.update).not.toHaveBeenCalled();
  });

  it('rejects webhook without user_id in custom_data → 400', async () => {
    const { POST } = await import('@/app/api/lemon/webhook/route');
    const payload = JSON.stringify({
      meta: {
        event_name: 'subscription_created',
        event_id: 'evt-005',
        custom_data: {}, // no user_id
      },
      data: { id: 'sub_x', attributes: {} },
    });
    const res = await POST(makeRequest(payload, makeSig(payload)));
    expect(res.status).toBe(400);
  });
});
