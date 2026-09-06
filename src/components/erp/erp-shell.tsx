'use client';

// FMCore ERP — Main Shell
// Composes: Sidebar + (Toolbar + TabBar + Content + StatusBar) + AI panel + Notifications + Command Palette + Builder
import { useEffect } from 'react';
import { useErpStore } from '@/lib/erp/store';
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
import { registersApi } from '@/lib/erp/api';

export function ErpShell() {
  const { tabs, activeTabId, theme, builderOpen, setBuilderOpen } = useErpStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Apply theme to <html> element (next-themes integration)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
      document.documentElement.style.colorScheme = theme;
    }
  }, [theme]);

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

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--erp-bg)] text-[var(--erp-text)]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Toolbar />
        <TabBar />
        <main className="flex-1 overflow-y-auto bg-[var(--erp-bg)]">
          {activeTab?.type === 'dashboard' && <Dashboard />}
          {activeTab?.type === 'register' && activeTab.refId && <RegisterView registerId={activeTab.refId} />}
          {activeTab?.type === 'reports' && <ReportsView />}
          {activeTab?.type === 'audit' && <AuditLogsView />}
          {activeTab?.type === 'settings' && <SettingsView />}
        </main>
        <StatusBar />
      </div>

      {/* Floating panels & modals */}
      <AiAssistant />
      <NotificationsPanel />
      <CommandPalette />
      <RegisterBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  );
}
