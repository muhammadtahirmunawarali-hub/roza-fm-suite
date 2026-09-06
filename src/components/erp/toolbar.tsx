'use client';

// FMCore ERP — Top Toolbar
import { useEffect, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';
import { Menu, Search, RefreshCw, Sun, Moon, Bell, Wand2 } from 'lucide-react';
import { notificationsApi } from '@/lib/erp/api';

export function Toolbar() {
  const {
    toggleSidebar, setMobileSidebar, theme, toggleTheme,
    setAiPanel, aiPanelOpen,
    setNotifPanel, notifPanelOpen,
    setCommandOpen, tabs, activeTabId,
  } = useErpStore();

  const [unreadCount, setUnreadCount] = useState(0);
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      setNow(new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }));
    };
    tick();
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const notifs = await notificationsApi.list();
        if (!cancelled) setUnreadCount(notifs.filter((n) => !n.isRead).length);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [notifPanelOpen]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const breadcrumb = activeTab ? activeTab.label : 'Dashboard';

  return (
    <header
      className="relative flex items-center gap-2 h-[52px] px-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)] shrink-0"
      style={{ zIndex: 20 }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="p-2 rounded-md hover:bg-[var(--erp-bg-hover)] text-[var(--erp-text-secondary)] md:hidden"
          onClick={() => setMobileSidebar(true)}
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <button
          className="hidden md:flex p-2 rounded-md hover:bg-[var(--erp-bg-hover)] text-[var(--erp-text-secondary)]"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--erp-text-muted)] min-w-0">
          <FAIcon name="fa-house" className="text-[10px]" />
          <span className="text-[var(--erp-text-muted)]">/</span>
          <span className="text-[var(--erp-text-secondary)] font-medium truncate">{breadcrumb}</span>
        </div>
      </div>

      {/* Center search */}
      <div className="flex-1 flex justify-center px-2">
        <button
          onClick={() => setCommandOpen(true)}
          className="hidden md:flex items-center gap-2 w-full max-w-md px-3 py-1.5 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] hover:border-[var(--erp-accent-border)] transition-colors text-[var(--erp-text-muted)] text-[12px]"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search everything...</span>
          <kbd className="px-1.5 py-0.5 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[10px] font-mono">Ctrl+K</kbd>
        </button>
        <button
          onClick={() => setCommandOpen(true)}
          className="md:hidden p-2 rounded-md hover:bg-[var(--erp-bg-hover)] text-[var(--erp-text-secondary)]"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <ToolbarBtn icon={<RefreshCw className="w-4 h-4" />} title="Refresh" onClick={() => window.location.reload()} />
        <ToolbarBtn
          icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          title="Toggle theme"
          onClick={toggleTheme}
        />
        <ToolbarBtn
          icon={<Wand2 className="w-4 h-4" />}
          title="AI Assistant"
          active={aiPanelOpen}
          onClick={() => setAiPanel(!aiPanelOpen)}
        />
        <ToolbarBtn
          icon={<Bell className="w-4 h-4" />}
          title="Notifications"
          active={notifPanelOpen}
          onClick={() => setNotifPanel(!notifPanelOpen)}
          badge={unreadCount > 0 ? unreadCount : undefined}
        />
        <div className="flex items-center gap-1 pl-2 ml-1 border-l border-[var(--erp-border)]">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function ToolbarBtn({
  icon, title, onClick, active, badge,
}: { icon: React.ReactNode; title: string; onClick: () => void; active?: boolean; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-md transition-colors',
        active
          ? 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)]'
          : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]',
      )}
      title={title}
      aria-label={title}
    >
      {icon}
      {badge !== undefined && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: 'var(--erp-danger)' }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}
