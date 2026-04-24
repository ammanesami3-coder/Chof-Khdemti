import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

export function setupLS() {
  lemonSqueezySetup({
    apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
    onError: (err) => console.error('LS error:', err),
  });
}
