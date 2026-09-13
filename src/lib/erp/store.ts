'use client';

// FMCore ERP — Client state (Zustand)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, User } from './types';

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
  theme: 'dark' | 'light' | 'midnight' | 'ocean' | 'forest' | 'sunset';
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

  // global currency (synced from Settings)
  currency: string;
  setCurrency: (c: string) => void;

  // RTL (right-to-left) layout
  rtl: boolean;
  setRtl: (r: boolean) => void;

  // Language / locale (multi-language support)
  language: string;
  setLanguage: (lang: string) => void;

  // user menu (top-right dropdown)
  userMenuOpen: boolean;
  setUserMenu: (open: boolean) => void;

  // auth
  user: User | null;
  authLoading: boolean;
  authChecked: boolean;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthChecked: (checked: boolean) => void;
  logout: () => void;

  // permission check
  hasPermission: (module: string, action: string) => boolean;

  // pending action for newly-opened register tab (e.g. 'add-record' when clicking "New Work Order" from dashboard)
  pendingAction: { tabId: string; action: string } | null;
  setPendingAction: (action: { tabId: string; action: string } | null) => void;
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
      toggleTheme: () => set((s) => { const themes = ['dark', 'light', 'midnight', 'ocean', 'forest', 'sunset'] as const; const idx = themes.indexOf(s.theme as any); return { theme: themes[(idx + 1) % themes.length] }; }),

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

      // ---------- currency ----------
      currency: 'AED',
      setCurrency: (c) => set({ currency: c }),

      // ---------- RTL ----------
      rtl: false,
      setRtl: (r) => set({ rtl: r }),

      // ---------- Language ----------
      language: 'en',
      setLanguage: (lang) => set({ language: lang, rtl: lang === 'ar' || lang === 'ur' }),

      // ---------- user menu ----------
      userMenuOpen: false,
      setUserMenu: (open) => set({ userMenuOpen: open }),

      // ---------- auth ----------
      user: null,
      authLoading: true,
      authChecked: false,
      setUser: (user) => set({ user, authLoading: false, authChecked: true }),
      setAuthLoading: (loading) => set({ authLoading: loading }),
      setAuthChecked: (checked) => set({ authChecked: checked }),
      logout: () => set({ user: null, userMenuOpen: false, tabs: [{ id: 'dashboard', type: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' }], activeTabId: 'dashboard' }),

      // ---------- permission check ----------
      hasPermission: (module, action) => {
        const u = get().user;
        if (!u) return false;
        if (u.role === 'Super Admin') return true;
        const perm = (u.permissions || []).find((p: any) => p.module === module);
        return !!perm && perm.actions.includes(action);
      },

      // ---------- pending action (e.g. auto-open Add Record from dashboard quick action) ----------
      pendingAction: null,
      setPendingAction: (action) => set({ pendingAction: action }),
    }),
    {
      name: 'fmcore-erp-state',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
        tabs: s.tabs,
        activeTabId: s.activeTabId,
        user: s.user,
        currency: s.currency,
        rtl: s.rtl,
        language: s.language,
      }),
    },
  ),
);
