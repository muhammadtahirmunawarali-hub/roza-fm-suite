'use client';

// Roza FM Suite — Notifications Panel
import { useEffect, useState } from 'react';
import { notificationsApi } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import type { NotificationItem, NotificationSeverity } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/erp/utils';
import { Bell, X, CheckCheck, BellOff } from 'lucide-react';
import { toast } from 'sonner';

const SEVERITY_ICON: Record<NotificationSeverity, string> = {
  critical: 'fa-triangle-exclamation',
  warning: 'fa-circle-exclamation',
  info: 'fa-circle-info',
  success: 'fa-circle-check',
};

const SEVERITY_COLOR: Record<NotificationSeverity, string> = {
  critical: 'var(--erp-danger)',
  warning: 'var(--erp-warning)',
  info: 'var(--erp-info)',
  success: 'var(--erp-success)',
};

export function NotificationsPanel() {
  const { notifPanelOpen, setNotifPanel, openTab } = useErpStore();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await notificationsApi.list());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (notifPanelOpen) load();
  }, [notifPanelOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setItems((arr) => arr.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch (e: any) { toast.error('Failed to mark as read'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (e: any) { toast.error('Failed to mark all as read'); }
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) handleMarkRead(n.id);
    if (n.link) {
      // link format: /?tab=<code>
      const m = n.link.match(/tab=([^&]+)/);
      if (m) {
        // We'll resolve tab by code in the sidebar; just close the panel
        setNotifPanel(false);
        // Use a custom event so sidebar can pick up
        window.dispatchEvent(new CustomEvent('fmcore:open-by-code', { detail: m[1] }));
      }
    }
  };

  if (!notifPanelOpen) return null;

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setNotifPanel(false)} />
      <aside
        className="fixed right-0 top-0 bottom-0 w-full sm:w-[380px] bg-[var(--erp-bg-secondary)] border-l border-[var(--erp-border)] flex flex-col z-50 shadow-xl"
        style={{ animation: 'slideIn 0.25s ease-out' }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        <div className="flex items-center justify-between px-4 h-[52px] border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--erp-bg-hover)] flex items-center justify-center relative">
              <Bell className="w-4 h-4 text-[var(--erp-text-secondary)]" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-[var(--erp-danger)]">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[var(--erp-text)]">Notifications</div>
              <div className="text-[10px] text-[var(--erp-text-muted)]">{unread} unread · {items.length} total</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] px-2 py-1 rounded-md text-[var(--erp-accent)] hover:bg-[var(--erp-accent-dim)] transition-colors flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all
              </button>
            )}
            <button onClick={() => setNotifPanel(false)} className="p-2 rounded-md text-[var(--erp-text-muted)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]" aria-label="Close notifications">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="text-center py-6 text-[var(--erp-text-muted)] text-[12px]">Loading...</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="w-10 h-10 text-[var(--erp-text-muted)] mb-2" />
              <p className="text-[12px] text-[var(--erp-text-muted)]">No notifications</p>
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  n.isRead
                    ? 'bg-[var(--erp-bg-card)] border-[var(--erp-border)]'
                    : 'bg-[var(--erp-bg-elevated)] border-[var(--erp-accent-border)] hover:border-[var(--erp-accent)]',
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: SEVERITY_COLOR[n.severity] + '20', color: SEVERITY_COLOR[n.severity] }}
                  >
                    <FAIcon name={SEVERITY_ICON[n.severity]} className="text-[12px]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[12px] font-semibold text-[var(--erp-text)] truncate">{n.title}</div>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-[var(--erp-accent)] shrink-0" />}
                    </div>
                    <div className="text-[11px] text-[var(--erp-text-secondary)] mt-0.5 line-clamp-2">{n.message}</div>
                    <div className="text-[10px] text-[var(--erp-text-muted)] mt-1 flex items-center gap-1">
                      <span className="uppercase tracking-wide font-medium" style={{ color: SEVERITY_COLOR[n.severity] }}>{n.severity}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
