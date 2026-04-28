'use client';

import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const STORAGE_KEY = 'soundEnabled';

export function SoundSettings() {
  const [enabled, setEnabled] = useState(true);

  // Read preference once on mount (avoids SSR mismatch)
  useEffect(() => {
    setEnabled(localStorage.getItem(STORAGE_KEY) !== 'false');
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          {enabled ? (
            <Volume2 className="size-4 text-foreground" />
          ) : (
            <VolumeX className="size-4 text-muted-foreground" />
          )}
        </span>
        <div>
          <p className="font-medium leading-tight">أصوات الإشعارات</p>
          <p className="text-sm text-muted-foreground">
            {enabled ? 'مفعّلة — ستسمع صوتاً عند كل رسالة أو إشعار جديد' : 'معطّلة'}
          </p>
        </div>
      </div>

      {/* Toggle switch */}
      {/* dir="ltr" keeps thumb direction consistent in RTL layouts */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        dir="ltr"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          enabled ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
