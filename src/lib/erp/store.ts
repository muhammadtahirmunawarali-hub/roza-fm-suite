'use client';

// FMCore ERP — Client state (Zustand)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, RegisterCategory, ColumnDef } from './types';

interface ErpState {
  // navigation
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;

  // tabs
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // theme
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;

  // AI assistant
  aiPanelOpen: boolean;
  setAiPanel: (open: boolean) => void;

  // notifications
  notifPanelOpen: boolean;
  setNotifPanel: (open: boolean) => void;

  // command palette / global search
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  // register builder modal
  builderOpen: boolean;
  setBuilderOpen: (open: boolean) => void;
}

export const useErpStore = create<ErpState>()(
  persist(
    (set, get) => ({
      // ---------- sidebar ----------
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      toggleSidebar: () => {
        const cur = get().sidebarCollapsed;
        set({ sidebarCollapsed: !cur });
      },
      setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),

      // ---------- tabs ----------
      tabs: [{ id: 'dashboard', type: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' }],
      activeTabId: 'dashboard',
      openTab: (tab) =>
        set((s) => {
          const exists = s.tabs.find((t) => t.id === tab.id);
          if (exists) return { activeTabId: tab.id, mobileSidebarOpen: false };
          return { tabs: [...s.tabs, tab], activeTabId: tab.id, mobileSidebarOpen: false };
        }),
      closeTab: (id) =>
        set((s) => {
          const idx = s.tabs.findIndex((t) => t.id === id);
          if (idx === -1) return {};
          const tabs = s.tabs.filter((t) => t.id !== id);
          let activeTabId = s.activeTabId;
          if (activeTabId === id) {
            activeTabId = tabs[Math.max(0, idx - 1)]?.id ?? null;
          }
          return { tabs, activeTabId };
        }),
      setActiveTab: (id) => set({ activeTabId: id }),

      // ---------- theme ----------
      theme: 'dark',
      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      // ---------- AI ----------
      aiPanelOpen: false,
      setAiPanel: (open) => set({ aiPanelOpen: open }),

      // ---------- notifications ----------
      notifPanelOpen: false,
      setNotifPanel: (open) => set({ notifPanelOpen: open }),

      // ---------- command palette ----------
      commandOpen: false,
      setCommandOpen: (open) => set({ commandOpen: open }),

      // ---------- register builder ----------
      builderOpen: false,
      setBuilderOpen: (open) => set({ builderOpen: open }),
    }),
    {
      name: 'fmcore-erp-state',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
        tabs: s.tabs,
        activeTabId: s.activeTabId,
      }),
    },
  ),
);
