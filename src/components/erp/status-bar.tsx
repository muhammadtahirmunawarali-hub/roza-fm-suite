'use client';

// Roza FM Suite — Status Bar (sticky footer)
import { useEffect, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';

export function StatusBar() {
  const { tabs, activeTabId, user } = useErpStore();
  const [now, setNow] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <footer
      className="flex items-center justify-between h-[30px] px-3 border-t border-[var(--erp-border)] bg-[var(--erp-bg-secondary)] text-[11px] text-[var(--erp-text-muted)] shrink-0"
      aria-label="Status bar"
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--erp-success)]" />
          Ready
        </span>
        {activeTab && (
          <>
            <span className="text-[var(--erp-text-muted)]">·</span>
            <span>{activeTab.label}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline">Roza FM Suite v1.0.0</span>
        <span className="text-[var(--erp-text-muted)]">·</span>
        <span className="hidden md:inline">{user ? `${user.name} · ${user.role}` : 'Not signed in'}</span>
        <span className="text-[var(--erp-text-muted)] hidden md:inline">·</span>
        <span className="tabular-nums">{now}</span>
      </div>
    </footer>
  );
}
