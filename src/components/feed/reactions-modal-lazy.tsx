'use client';

import dynamic from 'next/dynamic';

const importReactionsModal = () =>
  import('@/components/feed/reactions-modal').then((m) => m.ReactionsModal);

/** Code-split reactions modal — only pulled into the bundle when first opened. */
export const ReactionsModalLazy = dynamic(importReactionsModal, { ssr: false });

/** Warm the modal chunk ahead of a click (e.g. on pointer-enter). */
export function preloadReactionsModal() {
  void importReactionsModal();
}
