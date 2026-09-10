'use client';

// FMCore ERP — Sidebar (with permission filtering)
// Shows logo, search, navigation tree (categories → registers), and footer actions.
// Registers the user can't view are hidden from the sidebar.
import { useEffect, useMemo, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { REGISTER_CATEGORIES, type Register, type RegisterCategory } from '@/lib/erp/types';
import { registersApi } from '@/lib/erp/api';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { Plus, Search, ChevronRight, PanelLeftClose, PanelLeftOpen, X, Lock } from 'lucide-react';

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebar, openTab, activeTabId, setBuilderOpen, user, hasPermission } = useErpStore();
  const [registers, setRegisters] = useState<Register[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await registersApi.list();
        if (!cancelled) setRegisters(data);
      } catch (e) {
        console.error('Failed to load registers', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filter registers by user's view permission
  const visibleRegisters = useMemo(() => {
    // Super Admin sees everything
    if (user?.role === 'Super Admin') return registers;
    return registers.filter((r) => hasPermission(r.code, 'view'));
  }, [registers, user, hasPermission]);

  // Group registers by category
  const grouped = useMemo(() => {
    const g: Record<string, Register[]> = {};
    visibleRegisters.forEach((r) => {
      (g[r.category] = g[r.category] || []).push(r);
    });
    return g;
  }, [visibleRegisters]);

  // Filter by search
  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const out: Record<string, Register[]> = {};
    Object.entries(grouped).forEach(([cat, regs]) => {
      const matched = regs.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
      if (matched.length > 0) out[cat] = matched;
    });
    return out;
  }, [grouped, search]);

  const toggleCat = (cat: string) =>
    setCollapsedCats((s) => {
      const next = new Set(s);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  const handleOpenRegister = (r: Register) => {
    openTab({ id: `reg_${r.id}`, type: 'register', label: r.name, icon: r.icon, refId: r.id });
  };

  const sortedCats = Object.values(REGISTER_CATEGORIES).sort((a, b) => a.order - b.order);

  const collapsed = sidebarCollapsed;

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      <aside
        className={cn(
          'flex flex-col bg-[var(--erp-bg-secondary)] border-r border-[var(--erp-border)] transition-all duration-300 z-40',
          // Desktop: part of flex layout
          'hidden md:flex',
          collapsed ? 'md:w-[60px]' : 'md:w-[264px]',
          // Mobile: fixed drawer
          mobileSidebarOpen && 'fixed inset-y-0 left-0 w-[280px] flex md:!flex',
        )}
        style={{ height: '100vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 h-[52px] px-3 border-b border-[var(--erp-border)] shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-base shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--erp-accent), #009975)', fontFamily: 'var(--font-display)' }}
          >
            F
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="font-semibold text-[14px] truncate" style={{ fontFamily: 'var(--font-display)' }}>
                FMCore <span className="text-[var(--erp-accent)]">ERP</span>
              </div>
              <div className="text-[10px] text-[var(--erp-text-muted)] truncate">Facility Management Suite</div>
            </div>
          )}
          <button
            className="ml-auto md:hidden text-[var(--erp-text-secondary)] hover:text-[var(--erp-text)]"
            onClick={() => setMobileSidebar(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-[var(--erp-border)] shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search registers..."
                className="w-full pl-7 pr-2 py-1.5 text-[12px] rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] focus:ring-1 focus:ring-[var(--erp-accent-border)]"
                aria-label="Search registers"
              />
            </div>
          </div>
        )}

        {/* Tree */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5" aria-label="Registers navigation">
          {/* Dashboard item */}
          <SidebarItem
            collapsed={collapsed}
            icon="fa-gauge-high"
            label="Dashboard"
            active={activeTabId === 'dashboard'}
            onClick={() => openTab({ id: 'dashboard', type: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' })}
          />

          {/* Categories */}
          {sortedCats.map((cat) => {
            const regs = filteredGrouped[cat.id] || [];
            if (regs.length === 0 && search.trim()) return null;
            if (regs.length === 0) return null;
            const isCollapsed = collapsedCats.has(cat.id);

            return (
              <div key={cat.id} className="mt-1">
                <button
                  onClick={() => !collapsed && toggleCat(cat.id)}
                  className={cn(
                    'flex items-center w-full text-left rounded-md py-1.5 text-[11px] font-semibold uppercase tracking-wide',
                    collapsed ? 'justify-center px-1' : 'px-2',
                  )}
                  style={{ color: cat.color }}
                  title={collapsed ? cat.name : undefined}
                >
                  {!collapsed && (
                    <ChevronRight className={cn('w-3 h-3 mr-1 transition-transform', !isCollapsed && 'rotate-90')} />
                  )}
                  <FAIcon name={cat.icon} className="text-[11px] shrink-0" />
                  {!collapsed && <span className="ml-2 flex-1 truncate">{cat.name}</span>}
                  {!collapsed && (
                    <span className="text-[10px] text-[var(--erp-text-muted)] bg-[var(--erp-bg-hover)] px-1.5 py-0.5 rounded-full">
                      {regs.length}
                    </span>
                  )}
                </button>

                {!collapsed && !isCollapsed && (
                  <div className="mt-0.5 ml-2 space-y-0.5 border-l border-[var(--erp-border)] pl-1">
                    {regs.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleOpenRegister(r)}
                        className={cn(
                          'flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md text-[12px] transition-colors',
                          activeTabId === `reg_${r.id}`
                            ? 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-medium'
                            : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]',
                        )}
                        title={r.name}
                      >
                        <FAIcon name={r.icon} className="text-[10px] shrink-0" style={{ color: r.color }} />
                        <span className="truncate flex-1">{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div className="my-2 border-t border-[var(--erp-border)]" />

          {/* Reports, Settings, Audit Logs — gated by permission */}
          {hasPermission('reports', 'view') && (
            <SidebarItem
              collapsed={collapsed}
              icon="fa-chart-bar"
              label="Reports"
              active={activeTabId === 'reports'}
              onClick={() => openTab({ id: 'reports', type: 'reports', label: 'Reports', icon: 'fa-chart-bar' })}
            />
          )}
          {hasPermission('audit', 'view') && (
            <SidebarItem
              collapsed={collapsed}
              icon="fa-list-ul"
              label="Audit Logs"
              active={activeTabId === 'audit'}
              onClick={() => openTab({ id: 'audit', type: 'audit', label: 'Audit Logs', icon: 'fa-list-ul' })}
            />
          )}
          {hasPermission('recycle_bin', 'view') && (
            <SidebarItem
              collapsed={collapsed}
              icon="fa-recycle"
              label="Recycle Bin"
              active={activeTabId === 'recycle'}
              onClick={() => openTab({ id: 'recycle', type: 'recycle', label: 'Recycle Bin', icon: 'fa-recycle' })}
            />
          )}
          {hasPermission('settings', 'view') && (
            <SidebarItem
              collapsed={collapsed}
              icon="fa-cog"
              label="Settings"
              active={activeTabId === 'settings'}
              onClick={() => openTab({ id: 'settings', type: 'settings', label: 'Settings', icon: 'fa-cog' })}
            />
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--erp-border)] p-1.5 flex items-center gap-1 shrink-0">
          <button
            onClick={() => setBuilderOpen(true)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-[var(--erp-accent)] hover:bg-[var(--erp-accent-dim)] transition-colors',
              collapsed && 'justify-center w-full',
            )}
            title="New register"
          >
            <Plus className="w-3.5 h-3.5" />
            {!collapsed && <span>New Register</span>}
          </button>
          <button
            onClick={toggleSidebar}
            className={cn(
              'ml-auto p-1.5 rounded-md text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)] transition-colors',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({
  icon, label, active, onClick, collapsed,
}: { icon: string; label: string; active?: boolean; onClick: () => void; collapsed?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center w-full text-left rounded-md py-1.5 text-[12.5px] transition-colors',
        collapsed ? 'justify-center px-1' : 'px-2',
        active
          ? 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-medium'
          : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]',
      )}
      title={collapsed ? label : undefined}
    >
      <FAIcon name={icon} className="text-[12px] shrink-0" />
      {!collapsed && <span className="ml-2 flex-1 truncate">{label}</span>}
    </button>
  );
}
