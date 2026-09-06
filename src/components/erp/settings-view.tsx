'use client';

// FMCore ERP — Settings view
import { useEffect, useState } from 'react';
import { settingsApi, backupApi } from '@/lib/erp/api';
import type { Setting } from '@/lib/erp/types';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import {
  Download, Upload, RotateCcw, Save, Building2, Palette, FileText,
  Hash, Bell, Database, Shield, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function SettingsView() {
  const { theme, setTheme } = useErpStore();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

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
                  <Select value={settings['company.currency'] || 'AED'} onValueChange={(v) => { update('company.currency', v); update('currency', v); }}>
                    <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['AED', 'USD', 'EUR', 'GBP', 'PKR', 'SAR', 'QAR'].map((c) => (
                        <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            </div>
          )}
        </div>
      </div>
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
