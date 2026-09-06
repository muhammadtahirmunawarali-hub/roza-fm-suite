'use client';

// FMCore ERP — Command Palette (Ctrl+K) — global search + quick actions
import { useEffect, useState, useMemo } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { registersApi, searchApi, backupApi } from '@/lib/erp/api';
import type { Register } from '@/lib/erp/types';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { Search, Plus, Download, RotateCcw, Moon, Sun, Bell, Wand2, FileText, History, Settings as SettingsIcon, Database } from 'lucide-react';
import { toast } from 'sonner';

export function CommandPalette() {
  const {
    commandOpen, setCommandOpen,
    openTab, toggleTheme, theme,
    setAiPanel, setNotifPanel, setBuilderOpen,
  } = useErpStore();
  const [query, setQuery] = useState('');
  const [registers, setRegisters] = useState<Register[]>([]);
  const [searchResults, setSearchResults] = useState<{ registerId: string; registerName: string; records: any[] }[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    registersApi.list().then(setRegisters).catch(() => {});
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === 'Escape' && commandOpen) setCommandOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandOpen, setCommandOpen]);

  // Debounced global search
  useEffect(() => {
    if (!commandOpen) { setQuery(''); setSearchResults([]); return; }
    if (query.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchApi.search(query);
        setSearchResults(results);
      } catch {} finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, commandOpen]);

  // Build command list
  const commands = useMemo(() => {
    const cmds: { id: string; label: string; hint?: string; icon: React.ReactNode; action: () => void; group: string }[] = [];

    // Navigation
    cmds.push({ id: 'nav-dash', label: 'Dashboard', hint: 'Go to dashboard', icon: <FAIcon name="fa-gauge-high" />, group: 'Navigation', action: () => openTab({ id: 'dashboard', type: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' }) });
    cmds.push({ id: 'nav-reports', label: 'Reports', icon: <FAIcon name="fa-chart-bar" />, group: 'Navigation', action: () => openTab({ id: 'reports', type: 'reports', label: 'Reports', icon: 'fa-chart-bar' }) });
    cmds.push({ id: 'nav-audit', label: 'Audit Logs', icon: <History className="w-4 h-4" />, group: 'Navigation', action: () => openTab({ id: 'audit', type: 'audit', label: 'Audit Logs', icon: 'fa-list-ul' }) });
    cmds.push({ id: 'nav-settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" />, group: 'Navigation', action: () => openTab({ id: 'settings', type: 'settings', label: 'Settings', icon: 'fa-cog' }) });

    // Actions
    cmds.push({ id: 'act-new-reg', label: 'Create new register', hint: 'Open Register Builder', icon: <Plus className="w-4 h-4" />, group: 'Actions', action: () => setBuilderOpen(true) });
    cmds.push({ id: 'act-ai', label: 'Open AI Assistant', icon: <Wand2 className="w-4 h-4" />, group: 'Actions', action: () => setAiPanel(true) });
    cmds.push({ id: 'act-notif', label: 'View notifications', icon: <Bell className="w-4 h-4" />, group: 'Actions', action: () => setNotifPanel(true) });
    cmds.push({ id: 'act-theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />, group: 'Actions', action: toggleTheme });
    cmds.push({ id: 'act-backup', label: 'Export backup (JSON)', icon: <Download className="w-4 h-4" />, group: 'Actions', action: exportBackup });
    cmds.push({ id: 'act-reset', label: 'Reset & re-seed database', icon: <RotateCcw className="w-4 h-4" />, group: 'Actions', action: resetDb });

    // Registers
    registers.forEach((r) => {
      cmds.push({
        id: `reg-${r.id}`,
        label: r.name,
        hint: `${r.category} · ${r.columns.length} cols`,
        icon: <FAIcon name={r.icon} />,
        group: 'Registers',
        action: () => openTab({ id: `reg_${r.id}`, type: 'register', label: r.name, icon: r.icon, refId: r.id }),
      });
    });

    return cmds;
  }, [registers, theme, openTab, setAiPanel, setNotifPanel, setBuilderOpen, toggleTheme]);

  // Filter commands by query
  const filteredCmds = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || (c.hint?.toLowerCase().includes(q) || false));
  }, [commands, query]);

  // Combined flat list for keyboard nav
  const flatItems = useMemo(() => {
    const items: { type: 'cmd' | 'search'; cmd?: typeof filteredCmds[0]; result?: { registerId: string; registerName: string; record: any } }[] = [];
    filteredCmds.forEach((c) => items.push({ type: 'cmd', cmd: c }));
    searchResults.forEach((r) => r.records.slice(0, 3).forEach((rec) => items.push({ type: 'search', result: { registerId: r.registerId, registerName: r.registerName, record: rec } })));
    return items;
  }, [filteredCmds, searchResults]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const handleSelect = (idx: number) => {
    const item = flatItems[idx];
    if (!item) return;
    if (item.type === 'cmd' && item.cmd) {
      item.cmd.action();
      setCommandOpen(false);
    } else if (item.type === 'search' && item.result) {
      openTab({ id: `reg_${item.result.registerId}`, type: 'register', label: item.result.registerName, icon: 'fa-table', refId: item.result.registerId });
      setCommandOpen(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(flatItems.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); handleSelect(activeIdx); }
  };

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden top-[15%] translate-y-0">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--erp-border)]">
          <Search className="w-4 h-4 text-[var(--erp-text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search records or type a command..."
            className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder:text-[var(--erp-text-muted)]"
          />
          <kbd className="px-1.5 py-0.5 rounded border border-[var(--erp-border)] text-[10px] font-mono text-[var(--erp-text-muted)]">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[450px] overflow-y-auto py-1">
          {flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-[var(--erp-text-muted)] text-[12px]">
              {searching ? 'Searching...' : query ? 'No results found' : 'Type to search or pick a command'}
            </div>
          ) : (
            <>
              {/* Group commands */}
              {['Navigation', 'Actions', 'Registers'].map((group) => {
                const items = filteredCmds.filter((c) => c.group === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--erp-text-muted)]">{group}</div>
                    {items.map((c) => {
                      const idx = flatItems.findIndex((i) => i.type === 'cmd' && i.cmd?.id === c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelect(idx)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                            activeIdx === idx ? 'bg-[var(--erp-accent-dim)]' : 'hover:bg-[var(--erp-bg-hover)]',
                          )}
                        >
                          <span className="w-5 text-[var(--erp-text-secondary)]" style={activeIdx === idx ? { color: 'var(--erp-accent)' } : {}}>
                            {c.icon}
                          </span>
                          <span className="flex-1 text-[12.5px] text-[var(--erp-text)]">{c.label}</span>
                          {c.hint && <span className="text-[10px] text-[var(--erp-text-muted)]">{c.hint}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mb-1">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--erp-text-muted)]">
                    Records ({searchResults.reduce((s, r) => s + r.records.length, 0)})
                  </div>
                  {searchResults.map((r) => r.records.slice(0, 3).map((rec, i) => {
                    const idx = flatItems.findIndex((it) => it.type === 'search' && it.result?.registerId === r.registerId && it.result?.record.id === rec.id);
                    const firstField = Object.values(rec.data).find((v) => v !== null && v !== undefined && v !== '' && !Array.isArray(v));
                    return (
                      <button
                        key={`${r.registerId}-${rec.id}-${i}`}
                        onClick={() => handleSelect(idx)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                          activeIdx === idx ? 'bg-[var(--erp-accent-dim)]' : 'hover:bg-[var(--erp-bg-hover)]',
                        )}
                      >
                        <FileText className="w-4 h-4 text-[var(--erp-text-muted)]" />
                        <span className="flex-1 text-[12.5px] text-[var(--erp-text)] truncate">
                          {String(firstField || `Record #${rec.sequence}`)}
                        </span>
                        <span className="text-[10px] text-[var(--erp-text-muted)] px-1.5 py-0.5 rounded bg-[var(--erp-bg-hover)]">{r.registerName}</span>
                      </button>
                    );
                  }))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-[var(--erp-border)] flex items-center justify-between text-[10px] text-[var(--erp-text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-[var(--erp-border)]">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-[var(--erp-border)]">↵</kbd> select</span>
          </div>
          <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {registers.length} registers indexed</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function exportBackup() {
  try {
    const backup = await backupApi.export();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fmcore-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exported successfully');
  } catch (e: any) {
    toast.error('Backup failed', { description: e.message });
  }
}

async function resetDb() {
  if (!confirm('This will erase all data and re-seed sample data. Continue?')) return;
  try {
    const res = await fetch('/api/erp/reset', { method: 'POST' });
    const data = await res.json();
    toast.success(`Database reset — ${data.registers} registers, ${data.records} records`);
    setTimeout(() => window.location.reload(), 800);
  } catch (e: any) {
    toast.error('Reset failed', { description: e.message });
  }
}
