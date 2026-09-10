'use client';

// FMCore ERP — Main Shell
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
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
      document.documentElement.style.colorScheme = theme;
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
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
          <div className="text-[13px]">Loading FMCore ERP...</div>
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
