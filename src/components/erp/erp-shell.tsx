'use client';

// Roza FM Suite — Main Shell
// Composes: Sidebar + (Toolbar + TabBar + Content + StatusBar) + AI panel + Notifications + Command Palette + Builder + Shortcuts
// Handles auth gating — shows LoginScreen if user not authenticated.
import { useEffect, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { authApi } from '@/lib/erp/api';
import { Sidebar } from './sidebar';
import { Toolbar } from './toolbar';
import { TabBar } from './tab-bar';
import { StatusBar } from './status-bar';
import { Dashboard } from './dashboard';
import { RegisterView } from './register-view';
import { AiAssistant } from './ai-assistant';
import { NotificationsPanel } from './notifications-panel';
import { CommandPalette } from './command-palette';
import { RegisterBuilder } from './register-builder';
import { ReportsView } from './reports-view';
import { AuditLogsView } from './audit-logs-view';
import { SettingsView } from './settings-view';
import { UsersView } from './users-view';
import { RecycleBinView } from './recycle-bin-view';
import { LoginScreen } from './login-screen';
import { KeyboardShortcuts } from './keyboard-shortcuts';
import { PWARegister, PWAInstallBanner } from './pwa-register';
import { registersApi } from '@/lib/erp/api';

export function ErpShell() {
  const {
    tabs, activeTabId, theme, builderOpen, setBuilderOpen,
    user, authLoading, authChecked, setUser, setAuthLoading, setAuthChecked,
    currency, setCurrency, rtl, setRtl, hasPermission,
  } = useErpStore();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Apply theme + RTL direction to <html> element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Remove all theme classes
      document.documentElement.classList.remove('dark', 'light', 'midnight', 'ocean', 'forest', 'sunset');
      // Add current theme class
      document.documentElement.classList.add(theme);
      // For non-standard themes, also add 'dark' so the dark CSS variables apply
      if (theme !== 'light') {
        document.documentElement.classList.add('dark');
      }
      document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';

      // Apply theme-specific CSS variables
      const themeVars: Record<string, Record<string, string>> = {
        dark: {
          '--erp-bg': '#0a0e1a', '--erp-bg-secondary': '#0f1420', '--erp-bg-card': '#141b2d',
          '--erp-bg-elevated': '#1a2333', '--erp-bg-input': '#0d1320', '--erp-bg-hover': '#1e2840',
          '--erp-border': '#1e2940', '--erp-text': '#e8edf5', '--erp-text-secondary': '#9ba8c0',
          '--erp-text-muted': '#5a6a85', '--erp-accent': '#00D4AA', '--erp-accent-hover': '#00B894',
        },
        light: {
          '--erp-bg': '#f8fafc', '--erp-bg-secondary': '#f1f5f9', '--erp-bg-card': '#ffffff',
          '--erp-bg-elevated': '#ffffff', '--erp-bg-input': '#f8fafc', '--erp-bg-hover': '#f1f5f9',
          '--erp-border': '#e2e8f0', '--erp-text': '#1a202c', '--erp-text-secondary': '#475569',
          '--erp-text-muted': '#94a3b8', '--erp-accent': '#00D4AA', '--erp-accent-hover': '#00B894',
        },
        midnight: {
          '--erp-bg': '#0a0a1a', '--erp-bg-secondary': '#10102a', '--erp-bg-card': '#15153a',
          '--erp-bg-elevated': '#1a1a4a', '--erp-bg-input': '#0d0d25', '--erp-bg-hover': '#202050',
          '--erp-border': '#252560', '--erp-text': '#e0e0ff', '--erp-text-secondary': '#9090d0',
          '--erp-text-muted': '#505080', '--erp-accent': '#6366f1', '--erp-accent-hover': '#5558e3',
        },
        ocean: {
          '--erp-bg': '#001220', '--erp-bg-secondary': '#001a30', '--erp-bg-card': '#002040',
          '--erp-bg-elevated': '#002855', '--erp-bg-input': '#001530', '--erp-bg-hover': '#003060',
          '--erp-border': '#003d70', '--erp-text': '#e0f0ff', '--erp-text-secondary': '#80b0d0',
          '--erp-text-muted': '#407090', '--erp-accent': '#0ea5e9', '--erp-accent-hover': '#0284c7',
        },
        forest: {
          '--erp-bg': '#0a1a0a', '--erp-bg-secondary': '#0f2510', '--erp-bg-card': '#143020',
          '--erp-bg-elevated': '#1a3a28', '--erp-bg-input': '#0d2010', '--erp-bg-hover': '#1e4030',
          '--erp-border': '#1e5030', '--erp-text': '#e0f0e0', '--erp-text-secondary': '#80b080',
          '--erp-text-muted': '#406040', '--erp-accent': '#22c55e', '--erp-accent-hover': '#16a34a',
        },
        sunset: {
          '--erp-bg': '#1a0a0a', '--erp-bg-secondary': '#251010', '--erp-bg-card': '#302018',
          '--erp-bg-elevated': '#3a2820', '--erp-bg-input': '#201010', '--erp-bg-hover': '#403028',
          '--erp-border': '#503830', '--erp-text': '#ffe0e0', '--erp-text-secondary': '#d0a0a0',
          '--erp-text-muted': '#806060', '--erp-accent': '#f97316', '--erp-accent-hover': '#ea580c',
        },
      };

      const vars = themeVars[theme] || themeVars.dark;
      Object.entries(vars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }
  }, [theme, rtl]);

  // Check auth on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAuthLoading(true);
      try {
        const res = await authApi.me();
        if (cancelled) return;
        if (res.ok && res.authenticated && res.user) {
          setUser(res.user);
        } else {
          setUser(null);
        }
      } catch (e) {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load currency + RTL from settings on mount (sync global store)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/erp/settings').then(r => r.json()).then((list: any[]) => {
      if (cancelled || !Array.isArray(list)) return;
      const cur = list.find((s: any) => s.key === 'company.currency');
      const customCur = list.find((s: any) => s.key === 'company.currency_custom');
      if (cur?.value === 'Custom' && customCur?.value) {
        setCurrency(customCur.value);
      } else if (cur?.value && cur.value !== 'Custom') {
        setCurrency(cur.value);
      }
      const rtlSetting = list.find((s: any) => s.key === 'rtl');
      if (rtlSetting?.value === 'true') setRtl(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // Open register by code via custom event (from notification links)
  useEffect(() => {
    const handler = async (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      const regs = await registersApi.list();
      const reg = regs.find((r) => r.code === code);
      if (reg) {
        useErpStore.getState().openTab({ id: `reg_${reg.id}`, type: 'register', label: reg.name, icon: reg.icon, refId: reg.id });
      }
    };
    window.addEventListener('fmcore:open-by-code', handler as EventListener);
    return () => window.removeEventListener('fmcore:open-by-code', handler as EventListener);
  }, []);

  // Keyboard shortcut: Ctrl+/ to open shortcuts help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Show nothing while auth is checking (prevents flash of login screen)
  if (authLoading && !authChecked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--erp-bg)] text-[var(--erp-text-muted)]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center text-white font-bold text-xl animate-pulse" style={{ background: 'linear-gradient(135deg, var(--erp-accent), #009975)' }}>
            F
          </div>
          <div className="text-[13px]">Loading Roza FM Suite...</div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--erp-bg)] text-[var(--erp-text)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Toolbar />
        <TabBar />
        <main className="flex-1 overflow-y-auto bg-[var(--erp-bg)]">
          {activeTab?.type === 'dashboard' && <Dashboard />}
          {activeTab?.type === 'register' && activeTab.refId && <RegisterView registerId={activeTab.refId} />}
          {activeTab?.type === 'reports' && (hasPermission('reports', 'view') ? <ReportsView /> : <NoAccessView module="Reports" />)}
          {activeTab?.type === 'audit' && (hasPermission('audit', 'view') ? <AuditLogsView /> : <NoAccessView module="Audit Logs" />)}
          {activeTab?.type === 'settings' && (hasPermission('settings', 'view') ? <SettingsView /> : <NoAccessView module="Settings" />)}
          {activeTab?.type === 'users' && (hasPermission('users', 'view') ? <UsersView /> : <NoAccessView module="User Management" />)}
          {activeTab?.type === 'recycle' && ((hasPermission('recycle_bin', 'view') || user?.role === 'Super Admin' || user?.role === 'Administrator' || user?.role === 'Manager') ? <RecycleBinView /> : <NoAccessView module="Recycle Bin" />)}
        </main>
        <StatusBar />
      </div>

      {/* Floating panels & modals */}
      <AiAssistant />
      <NotificationsPanel />
      <CommandPalette />
      <RegisterBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <PWARegister />
      <PWAInstallBanner />
    </div>
  );
}

// No-access view for unauthorized tabs
function NoAccessView({ module }: { module: string }) {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[var(--erp-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-[18px] font-semibold text-[var(--erp-text)] mb-2">Access Denied</h2>
        <p className="text-[12px] text-[var(--erp-text-secondary)] mb-1">
          You don&apos;t have permission to access <strong>{module}</strong>.
        </p>
        <p className="text-[11px] text-[var(--erp-text-muted)]">
          Please contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}
