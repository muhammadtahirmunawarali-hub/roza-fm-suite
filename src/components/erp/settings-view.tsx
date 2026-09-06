'use client';

// FMCore ERP — Settings view (with Saved Views management tab)
import { useEffect, useState } from 'react';
import { settingsApi, backupApi, savedViewsApi, statsApi, type SavedViewMeta, type SystemStats } from '@/lib/erp/api';
import type { Setting } from '@/lib/erp/types';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { EmptyStateIllustration } from './empty-state-illustration';
import {
  Download, Upload, RotateCcw, Save, Building2, Palette, FileText,
  Hash, Bell, Database, Shield, Info, Bookmark, Trash2, Globe, Lock, Pencil,
  Search, Filter as FilterIcon, ArrowUpDown, Check, X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/erp/utils';

export function SettingsView() {
  const { theme, setTheme, currency, setCurrency } = useErpStore();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [savedViews, setSavedViews] = useState<SavedViewMeta[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewSearch, setViewSearch] = useState('');
  const [editTarget, setEditTarget] = useState<SavedViewMeta | null>(null);
  const [editName, setEditName] = useState('');
  const [editShared, setEditShared] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    settingsApi.list().then((list: Setting[]) => {
      const map: Record<string, string> = {};
      list.forEach((s) => (map[s.key] = s.value));
      setSettings(map);
    }).catch(() => {});
  }, []);

  const loadSavedViews = () => {
    setViewsLoading(true);
    savedViewsApi.listAll().then((views) => {
      setSavedViews(views);
    }).catch(() => {}).finally(() => setViewsLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'saved-views') loadSavedViews();
    if (activeTab === 'about') {
      statsApi.get().then(setSystemStats).catch(() => {});
    }
  }, [activeTab]);

  const handleDeleteView = async (id: string, name: string) => {
    try {
      await savedViewsApi.remove(id);
      toast.success(`Deleted view "${name}"`);
      setSavedViews((v) => v.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error('Failed to delete view', { description: e.message });
    }
  };

  const handleEditView = (view: SavedViewMeta) => {
    setEditTarget(view);
    setEditName(view.name);
    setEditShared(view.isShared);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editName.trim()) {
      toast.error('View name cannot be empty');
      return;
    }
    setEditSaving(true);
    try {
      await savedViewsApi.update({
        id: editTarget.id,
        name: editName.trim(),
        isShared: editShared,
      });
      toast.success(`Updated view "${editName}"`);
      setEditTarget(null);
      setEditName('');
      setEditShared(false);
      loadSavedViews();
    } catch (e: any) {
      toast.error('Failed to update view', { description: e.message });
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    settingsApi.list().then((list: Setting[]) => {
      const map: Record<string, string> = {};
      list.forEach((s) => (map[s.key] = s.value));
      setSettings(map);
    }).catch(() => {});
  }, []);

  const update = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const items = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await settingsApi.bulkSet(items);
      toast.success(`${items.length} settings saved`);
    } catch (e: any) {
      toast.error('Failed to save settings', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const exportBackup = async () => {
    try {
      const backup = await backupApi.export();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fmcore-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported');
    } catch (e: any) {
      toast.error('Backup failed', { description: e.message });
    }
  };

  const importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!confirm('Importing will REPLACE all current data. Continue?')) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await backupApi.import(data);
        toast.success('Backup imported successfully');
        setTimeout(() => window.location.reload(), 800);
      } catch (e: any) {
        toast.error('Import failed', { description: e.message });
      }
    };
    input.click();
  };

  const resetDb = async () => {
    if (!confirm('This will erase ALL data and re-seed sample data. Continue?')) return;
    try {
      const res = await fetch('/api/erp/reset', { method: 'POST' });
      const data = await res.json();
      toast.success(`Database reset — ${data.registers} registers, ${data.records} records`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error('Reset failed', { description: e.message });
    }
  };

  const TABS = [
    { id: 'company',     label: 'Company',        icon: <Building2 className="w-4 h-4" /> },
    { id: 'appearance',  label: 'Appearance',    icon: <Palette className="w-4 h-4" /> },
    { id: 'numbering',   label: 'Document #',    icon: <Hash className="w-4 h-4" /> },
    { id: 'saved-views', label: 'Saved Views',   icon: <Bookmark className="w-4 h-4" /> },
    { id: 'backup',      label: 'Backup & Reset', icon: <Database className="w-4 h-4" /> },
    { id: 'about',       label: 'About',         icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--erp-bg-hover)] text-[var(--erp-text-secondary)]">
            <FAIcon name="fa-cog" />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--erp-text)]" style={{ fontFamily: 'var(--font-display)' }}>Settings</h1>
            <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">Configure your ERP system</p>
          </div>
        </div>
        <Button onClick={saveAll} disabled={saving} className="h-9 text-[12px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sub-tabs */}
        <nav className="w-[180px] border-r border-[var(--erp-border)] bg-[var(--erp-bg-secondary)] p-2 hidden md:block shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-[12px] transition-colors ${
                activeTab === t.id
                  ? 'bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-medium'
                  : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Mobile tabs */}
          <div className="md:hidden flex gap-1 mb-4 overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] whitespace-nowrap ${
                  activeTab === t.id ? 'bg-[var(--erp-accent)] text-white' : 'bg-[var(--erp-bg-card)] text-[var(--erp-text-secondary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'company' && (
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-[15px] font-semibold text-[var(--erp-text)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--erp-accent)]" /> Company Profile
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Company Name" value={settings['company.name'] || ''} onChange={(v) => update('company.name', v)} />
                <Field label="Tax Number (TRN)" value={settings['company.tax_number'] || ''} onChange={(v) => update('company.tax_number', v)} />
                <Field label="Phone" value={settings['company.phone'] || ''} onChange={(v) => update('company.phone', v)} />
                <Field label="Email" value={settings['company.email'] || ''} onChange={(v) => update('company.email', v)} />
                <Field label="Address" value={settings['company.address'] || ''} onChange={(v) => update('company.address', v)} fullWidth />
                <Field label="Country" value={settings['company.country'] || ''} onChange={(v) => update('company.country', v)} />
                <Field label="Fiscal Year" value={settings['company.fiscal_year'] || ''} onChange={(v) => update('company.fiscal_year', v)} />
                <div>
                  <Label className="text-[11px] mb-1">Currency</Label>
                  <div className="flex items-center gap-2">
                    <Select value={settings['company.currency'] || currency} onValueChange={(v) => { update('company.currency', v); update('currency', v); setCurrency(v); }}>
                      <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)] w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['AED', 'USD', 'EUR', 'GBP', 'PKR', 'SAR', 'QAR', 'INR', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD', 'Custom'].map((c) => (
                          <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(settings['company.currency'] === 'Custom' || currency === 'Custom') && (
                      <Input
                        value={settings['company.currency_custom'] || ''}
                        onChange={(e) => { update('company.currency_custom', e.target.value.toUpperCase()); setCurrency(e.target.value.toUpperCase()); }}
                        className="h-9 text-[12px] bg-[var(--erp-bg-input)] w-[80px]"
                        placeholder="e.g. BHD"
                        maxLength={5}
                      />
                    )}
                    <span className="text-[10px] text-[var(--erp-text-muted)]">
                      Symbol: {settings['company.currency'] === 'Custom' ? (settings['company.currency_custom'] || '—') : (settings['company.currency'] || currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-[15px] font-semibold text-[var(--erp-text)] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--erp-accent)]" /> Appearance
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(['dark', 'light'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTheme(t); update('theme', t); }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      theme === t
                        ? 'border-[var(--erp-accent)] bg-[var(--erp-accent-dim)]'
                        : 'border-[var(--erp-border)] hover:border-[var(--erp-text-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FAIcon name={t === 'dark' ? 'fa-moon' : 'fa-sun'} className="text-[16px]" />
                      <span className="text-[13px] font-medium capitalize text-[var(--erp-text)]">{t} Mode</span>
                    </div>
                    <div className="text-[11px] text-[var(--erp-text-muted)]">
                      {t === 'dark' ? 'Easy on the eyes, great for low-light environments' : 'Clean and bright, ideal for daytime use'}
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <Label className="text-[11px] mb-1">Date Format</Label>
                <Select value={settings['date_format'] || 'DD/MM/YYYY'} onValueChange={(v) => update('date_format', v)}>
                  <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)] w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map((c) => (
                      <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activeTab === 'numbering' && (
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-[15px] font-semibold text-[var(--erp-text)] flex items-center gap-2">
                <Hash className="w-4 h-4 text-[var(--erp-accent)]" /> Document Numbering
              </h2>
              <p className="text-[12px] text-[var(--erp-text-muted)]">
                Document numbers are auto-generated from sequence counters. The prefix is derived from the column name (e.g. "WO Number" → WO-0001).
                This is a system-managed feature — no manual configuration needed.
              </p>
              <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md p-4">
                <div className="text-[11px] uppercase text-[var(--erp-text-muted)] mb-2">Sample document numbers</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px]">
                  {['WO-0001', 'PM-0001', 'PTW-0001', 'INV-0001', 'AST-0001', 'VND-0001'].map((n) => (
                    <div key={n} className="font-mono text-[var(--erp-accent)] bg-[var(--erp-bg-input)] px-2 py-1 rounded">{n}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-[15px] font-semibold text-[var(--erp-text)] flex items-center gap-2">
                <Database className="w-4 h-4 text-[var(--erp-accent)]" /> Backup & Reset
              </h2>
              <div className="space-y-3">
                <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <Download className="w-5 h-5 text-[var(--erp-accent)] mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-[var(--erp-text)]">Export Backup</div>
                      <p className="text-[11px] text-[var(--erp-text-muted)] mt-1">
                        Download a JSON file containing all registers, records, settings, notifications, and audit logs.
                        Use this to migrate between environments or for safekeeping.
                      </p>
                    </div>
                    <Button onClick={exportBackup} variant="outline" size="sm" className="h-8 text-[12px]">
                      <Download className="w-3.5 h-3.5 mr-1" /> Export
                    </Button>
                  </div>
                </div>

                <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-[var(--erp-info)] mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-[var(--erp-text)]">Import Backup</div>
                      <p className="text-[11px] text-[var(--erp-text-muted)] mt-1">
                        Restore from a previously exported JSON file. This will REPLACE all current data — make sure to export first.
                      </p>
                    </div>
                    <Button onClick={importBackup} variant="outline" size="sm" className="h-8 text-[12px]">
                      <Upload className="w-3.5 h-3.5 mr-1" /> Import
                    </Button>
                  </div>
                </div>

                <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-danger)] rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <RotateCcw className="w-5 h-5 text-[var(--erp-danger)] mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-[var(--erp-danger)]">Reset Database</div>
                      <p className="text-[11px] text-[var(--erp-text-muted)] mt-1">
                        Erase everything and re-seed the sample data. This action cannot be undone.
                      </p>
                    </div>
                    <Button onClick={resetDb} variant="outline" size="sm" className="h-8 text-[12px] border-[var(--erp-danger)] text-[var(--erp-danger)] hover:bg-[var(--erp-danger)] hover:text-white">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'saved-views' && (
            <div className="space-y-4 max-w-3xl">
              <h2 className="text-[15px] font-semibold text-[var(--erp-text)] flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[var(--erp-accent)]" /> Saved Views Management
              </h2>
              <p className="text-[11px] text-[var(--erp-text-muted)] -mt-2">
                Manage all saved filter views across registers. Delete views you no longer need.
              </p>

              {/* Search bar */}
              {savedViews.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
                  <input
                    value={viewSearch}
                    onChange={(e) => setViewSearch(e.target.value)}
                    placeholder="Search saved views..."
                    className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] focus:ring-1 focus:ring-[var(--erp-accent-border)]"
                  />
                </div>
              )}

              {/* Stats */}
              {savedViews.length > 0 && (
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
                    <Bookmark className="w-3 h-3" />
                    {savedViews.length} total views
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
                    <Globe className="w-3 h-3 text-[var(--erp-accent)]" />
                    {savedViews.filter((v) => v.isShared).length} shared
                  </span>
                  <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
                    <Lock className="w-3 h-3" />
                    {savedViews.filter((v) => !v.isShared).length} private
                  </span>
                </div>
              )}

              {/* Views list */}
              {viewsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-[var(--erp-bg-hover)] rounded-md animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
              ) : savedViews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <EmptyStateIllustration type="no-views" size={120} className="mb-3" />
                  <h3 className="text-[14px] font-semibold text-[var(--erp-text)] mb-1">No saved views yet</h3>
                  <p className="text-[12px] text-[var(--erp-text-muted)] max-w-sm">
                    Save filter combinations from any register view to quickly access them later.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedViews
                    .filter((v) => !viewSearch.trim() || v.name.toLowerCase().includes(viewSearch.toLowerCase()) || v.registerName.toLowerCase().includes(viewSearch.toLowerCase()))
                    .map((view) => (
                      <div
                        key={view.id}
                        className="group flex items-center gap-3 p-3 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-card)] hover:border-[var(--erp-accent-border)] transition-colors"
                      >
                        {/* Register icon */}
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: view.registerColor + '20', color: view.registerColor }}
                        >
                          <FAIcon name={view.registerIcon} className="text-[12px]" />
                        </div>

                        {/* View info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium text-[var(--erp-text)] truncate">{view.name}</span>
                            {view.isShared ? (
                              <Globe className="w-3 h-3 text-[var(--erp-accent)] shrink-0" />
                            ) : (
                              <Lock className="w-3 h-3 text-[var(--erp-text-muted)] shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1.5 mt-0.5">
                            <span>{view.registerName}</span>
                            <span>·</span>
                            <span>Updated {formatTimeAgo(view.updatedAt)}</span>
                          </div>
                          {/* Filter badges */}
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {view.hasSearch && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--erp-bg-input)] text-[var(--erp-text-secondary)] flex items-center gap-0.5">
                                <Search className="w-2 h-2" /> Search
                              </span>
                            )}
                            {view.filterCount > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--erp-bg-input)] text-[var(--erp-text-secondary)] flex items-center gap-0.5">
                                <FilterIcon className="w-2 h-2" /> {view.filterCount} filter{view.filterCount === 1 ? '' : 's'}
                              </span>
                            )}
                            {view.hasSort && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--erp-bg-input)] text-[var(--erp-text-secondary)] flex items-center gap-0.5">
                                <ArrowUpDown className="w-2 h-2" /> Sorted
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Edit + Delete buttons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleEditView(view)}
                            className="p-2 rounded-md text-[var(--erp-text-muted)] hover:text-[var(--erp-accent)] hover:bg-[var(--erp-bg-hover)] transition-all"
                            title="Rename view"
                            aria-label={`Edit view ${view.name}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteView(view.id, view.name)}
                            className="p-2 rounded-md text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)] hover:bg-[rgba(239,68,68,0.1)] transition-all"
                            title="Delete view"
                            aria-label={`Delete view ${view.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-[15px] font-semibold text-[var(--erp-text)] flex items-center gap-2">
                <Info className="w-4 h-4 text-[var(--erp-accent)]" /> About FMCore ERP
              </h2>
              <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div><span className="text-[var(--erp-text-muted)]">App Version:</span> <span className="text-[var(--erp-text)] font-mono">{settings['app_version'] || '1.0.0'}</span></div>
                  <div><span className="text-[var(--erp-text-muted)]">Schema Version:</span> <span className="text-[var(--erp-text)] font-mono">{settings['schema_version'] || '1'}</span></div>
                  <div><span className="text-[var(--erp-text-muted)]">Framework:</span> <span className="text-[var(--erp-text)]">Next.js 16 + TypeScript</span></div>
                  <div><span className="text-[var(--erp-text-muted)]">Database:</span> <span className="text-[var(--erp-text)]">SQLite (Prisma)</span></div>
                </div>
                <div className="text-[12px] text-[var(--erp-text-secondary)] pt-3 border-t border-[var(--erp-border)]">
                  FMCore ERP is a dynamic register & form builder for enterprise facility management.
                  Built with a SaaS-ready architecture — every record carries tenant/company/branch fields
                  ready for future multi-tenant migration.
                </div>
              </div>

              {/* System Stats Grid */}
              {systemStats && (
                <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-md p-4">
                  <h3 className="text-[12px] font-semibold text-[var(--erp-text)] flex items-center gap-2 mb-3">
                    <Database className="w-3.5 h-3.5 text-[var(--erp-accent)]" /> System Statistics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <StatCard label="Registers" value={systemStats.registers} icon="fa-table-list" color="#64748B" />
                    <StatCard label="Records" value={systemStats.records} icon="fa-database" color="#06B6D4" />
                    <StatCard label="Users" value={systemStats.users} icon="fa-users" color="#3B82F6" />
                    <StatCard label="Active Users" value={systemStats.activeUsers} icon="fa-user-check" color="#10B981" />
                    <StatCard label="Audit Logs" value={systemStats.auditLogs} icon="fa-list-ul" color="#8B5CF6" />
                    <StatCard label="Notifications" value={systemStats.notifications} icon="fa-bell" color="#F59E0B" />
                    <StatCard label="Unread Notifs" value={systemStats.unreadNotifs} icon="fa-bell" color="#EF4444" />
                    <StatCard label="Saved Views" value={systemStats.savedViews} icon="fa-bookmark" color="#EC4899" />
                    <StatCard label="Active Sessions" value={systemStats.activeSessions} icon="fa-key" color="#06B6D4" />
                    <StatCard label="Settings" value={systemStats.settings} icon="fa-cog" color="#94A3B8" />
                    <StatCard label="Dashboard Prefs" value={systemStats.dashboardPrefs} icon="fa-gauge-high" color="#10B981" />
                    <StatCard label="Inactive Users" value={systemStats.inactiveUsers} icon="fa-user-slash" color="#EF4444" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Saved View Dialog */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !editSaving && setEditTarget(null)}>
          <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg max-w-md w-full p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Pencil className="w-4 h-4 text-[var(--erp-accent)]" />
              <h3 className="text-[14px] font-semibold text-[var(--erp-text)]">Rename Saved View</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] mb-1 block">View Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-[12px] h-9 bg-[var(--erp-bg-input)]"
                  placeholder="Enter view name..."
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                <button
                  type="button"
                  onClick={() => setEditShared(!editShared)}
                  className={cn(
                    'flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded transition-colors',
                    editShared
                      ? 'text-[var(--erp-accent)] bg-[var(--erp-accent-dim)]'
                      : 'text-[var(--erp-text-muted)] hover:bg-[var(--erp-bg-hover)]',
                  )}
                >
                  {editShared ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {editShared ? 'Shared with all users' : 'Private (only you)'}
                </button>
              </div>
              <div className="text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1">
                <Bookmark className="w-3 h-3" />
                Register: {editTarget.registerName}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)} disabled={editSaving} className="h-8 text-[11px]">
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={editSaving || !editName.trim()} className="h-8 text-[11px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
                {editSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                {editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, fullWidth, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; fullWidth?: boolean; type?: string }) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <Label className="text-[11px] mb-1">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-[12px] bg-[var(--erp-bg-input)]"
      />
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)] hover:border-[var(--erp-accent-border)] transition-colors">
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: color + '20', color }}
      >
        <FAIcon name={icon} className="text-[12px]" />
      </div>
      <div className="min-w-0">
        <div className="text-[16px] font-bold text-[var(--erp-text)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {value.toLocaleString()}
        </div>
        <div className="text-[9px] uppercase tracking-wide text-[var(--erp-text-muted)] truncate">{label}</div>
      </div>
    </div>
  );
}
