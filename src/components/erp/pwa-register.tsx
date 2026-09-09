'use client';
import { useEffect, useState } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  if (!show || !prompt) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-[var(--erp-bg-card)] border border-[var(--erp-accent-border)] rounded-lg p-3 shadow-xl max-w-[280px] flex items-center gap-3">
      <div className="flex-1">
        <div className="text-[11px] font-semibold text-[var(--erp-text)]">Install FMCore ERP</div>
        <div className="text-[10px] text-[var(--erp-text-muted)]">Add to device for quick access</div>
      </div>
      <button onClick={async () => { prompt.prompt(); await prompt.userChoice; setShow(false); }} className="text-[10px] px-2 py-1 rounded bg-[var(--erp-accent)] text-white font-medium">Install</button>
      <button onClick={() => setShow(false)} className="text-[var(--erp-text-muted)] text-[14px]">×</button>
    </div>
  );
}
