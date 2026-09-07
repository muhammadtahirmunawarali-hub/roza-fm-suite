'use client';

// FMCore ERP — Checklist Builder
// A specialized builder for creating checklist templates with scope-based
// presets (Marine, Soft Services, Landscape, MEP, Civil, Security, Fire
// Protection) plus fully custom scopes. Used alongside the Checklist
// Templates register (RegisterView handles CRUD on the templates themselves;
// this builder handles the *items* inside each template).
import { useEffect, useMemo, useState } from 'react';
import { FAIcon } from './icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Download,
  Copy,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
export type ChecklistCategory = 'info' | 'warning' | 'critical';

export interface ChecklistItem {
  text: string;
  category: ChecklistCategory;
  required: boolean;
  notes: string;
}

export interface ScopeTemplate {
  icon: string;
  color: string;
  label: string;
  items: ChecklistItem[];
}

// ------------------------------------------------------------
// Pre-defined scope templates (hardcoded — these are the
// "official" FMCore checklist presets; users can load & edit
// any of them, or build a fully custom scope from scratch).
// ------------------------------------------------------------
export const SCOPE_TEMPLATES: Record<string, ScopeTemplate> = {
  marine: {
    icon: 'fa-anchor',
    color: '#0891B2',
    label: 'Marine',
    items: [
      { text: 'Verify port facility access permits', category: 'critical', required: true, notes: 'Check with port authority' },
      { text: 'Inspect life jackets and buoyancy aids', category: 'critical', required: true, notes: 'Minimum 2 per crew' },
      { text: 'Confirm weather conditions acceptable', category: 'warning', required: true, notes: 'Wind < 25 knots' },
      { text: 'Check communication equipment (VHF radio)', category: 'info', required: true, notes: 'Test channel 16' },
      { text: 'Verify mooring lines and fenders', category: 'info', required: false, notes: '' },
      { text: 'Inspect hull for damage before departure', category: 'warning', required: true, notes: 'Photo documentation' },
      { text: 'Confirm emergency procedures briefed to crew', category: 'critical', required: true, notes: 'Sign-off required' },
    ],
  },
  soft_services: {
    icon: 'fa-broom',
    color: '#10B981',
    label: 'Soft Services',
    items: [
      { text: 'Verify cleaning supplies stocked', category: 'info', required: true, notes: '' },
      { text: 'Inspect high-touch surfaces sanitized', category: 'warning', required: true, notes: 'Door handles, switches, rails' },
      { text: 'Check restrooms for supplies (soap, paper)', category: 'info', required: true, notes: '' },
      { text: 'Verify waste segregation followed', category: 'info', required: false, notes: '' },
      { text: 'Inspect floor cleanliness (no stains)', category: 'info', required: true, notes: '' },
      { text: 'Check glass surfaces streak-free', category: 'info', required: false, notes: '' },
      { text: 'Verify pest control bait stations intact', category: 'warning', required: true, notes: 'Monthly check' },
    ],
  },
  landscape: {
    icon: 'fa-tree',
    color: '#16A34A',
    label: 'Landscape',
    items: [
      { text: 'Inspect irrigation system operation', category: 'warning', required: true, notes: 'Check all zones' },
      { text: 'Verify plant health (no wilting/disease)', category: 'info', required: true, notes: '' },
      { text: 'Check mulch levels adequate', category: 'info', required: false, notes: 'Min 5cm depth' },
      { text: 'Inspect lawn mowing quality', category: 'info', required: true, notes: '' },
      { text: 'Verify weed control applied', category: 'warning', required: false, notes: 'Quarterly' },
      { text: 'Check tree stakes and ties secure', category: 'info', required: true, notes: 'After storms' },
      { text: 'Confirm fertilizer schedule followed', category: 'info', required: false, notes: '' },
    ],
  },
  mep: {
    icon: 'fa-bolt',
    color: '#F59E0B',
    label: 'MEP (Mechanical/Electrical/Plumbing)',
    items: [
      { text: 'Inspect HVAC plant operation (chillers, AHUs)', category: 'critical', required: true, notes: 'Log temperatures' },
      { text: 'Verify electrical panel temperatures normal', category: 'warning', required: true, notes: 'Thermal scan' },
      { text: 'Check plumbing for leaks', category: 'warning', required: true, notes: 'All fixtures' },
      { text: 'Inspect fire pump operation', category: 'critical', required: true, notes: 'Weekly test' },
      { text: 'Verify BMS alarms and alerts active', category: 'warning', required: true, notes: '' },
      { text: 'Check generator fuel level and battery', category: 'warning', required: true, notes: 'Min 75% fuel' },
      { text: 'Inspect water tank levels and chlorination', category: 'info', required: false, notes: 'Monthly' },
    ],
  },
  civil: {
    icon: 'fa-building',
    color: '#64748B',
    label: 'Civil',
    items: [
      { text: 'Inspect structure for cracks (≥ 3mm)', category: 'warning', required: true, notes: 'Photo document' },
      { text: 'Check settlement indicators', category: 'warning', required: true, notes: '' },
      { text: 'Verify waterproofing integrity', category: 'critical', required: true, notes: 'Roofs, basements' },
      { text: 'Inspect expansion joints', category: 'info', required: false, notes: '' },
      { text: 'Check concrete spalling', category: 'warning', required: true, notes: '' },
      { text: 'Verify drainage channels clear', category: 'info', required: true, notes: '' },
    ],
  },
  security: {
    icon: 'fa-shield-halved',
    color: '#DC2626',
    label: 'Security',
    items: [
      { text: 'Verify perimeter fencing intact', category: 'critical', required: true, notes: '' },
      { text: 'Test CCTV cameras operational', category: 'critical', required: true, notes: 'All angles covered' },
      { text: 'Check access control system (cards/biometric)', category: 'warning', required: true, notes: '' },
      { text: 'Verify security personnel on post', category: 'critical', required: true, notes: '' },
      { text: 'Inspect lighting (perimeter and parking)', category: 'warning', required: true, notes: '' },
      { text: 'Test alarm systems', category: 'critical', required: true, notes: 'Monthly test' },
      { text: 'Verify visitor log maintained', category: 'info', required: false, notes: '' },
    ],
  },
  fire_protection: {
    icon: 'fa-fire-extinguisher',
    color: '#EF4444',
    label: 'Fire Protection',
    items: [
      { text: 'Verify fire extinguishers in date and charged', category: 'critical', required: true, notes: 'Monthly' },
      { text: 'Test fire alarm panels', category: 'critical', required: true, notes: '' },
      { text: 'Inspect sprinkler heads unobstructed', category: 'warning', required: true, notes: '' },
      { text: 'Verify fire hose reels accessible', category: 'warning', required: true, notes: '' },
      { text: 'Check emergency exit signs illuminated', category: 'critical', required: true, notes: '' },
      { text: 'Test smoke detectors', category: 'critical', required: true, notes: 'Quarterly' },
      { text: 'Verify fire doors close and latch', category: 'warning', required: true, notes: '' },
    ],
  },
};

// ------------------------------------------------------------
// Category visual config
// ------------------------------------------------------------
const CATEGORY_META: Record<ChecklistCategory, {
  label: string;
  icon: typeof Info;
  color: string;
  bg: string;
}> = {
  info: { label: 'Info', icon: Info, color: 'var(--erp-info)', bg: 'rgba(8,145,178,0.12)' },
  warning: { label: 'Warning', icon: AlertTriangle, color: 'var(--erp-warning)', bg: 'rgba(217,119,6,0.12)' },
  critical: { label: 'Critical', icon: AlertCircle, color: 'var(--erp-danger)', bg: 'rgba(220,38,38,0.12)' },
};

const LS_KEY = (id: string) => `fmcore:checklist:${id}`;

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export interface ChecklistBuilderProps {
  /** Optional. If provided, the builder attempts to load that template's
   *  items from localStorage cache (until SEED-1 ships the real API). */
  templateId?: string;
}

export function ChecklistBuilder({ templateId }: ChecklistBuilderProps) {
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [customScope, setCustomScope] = useState('');
  const [loading, setLoading] = useState(false);

  // ---- Load existing template items if templateId is provided ----
  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    try {
      const cached = typeof window !== 'undefined'
        ? window.localStorage.getItem(LS_KEY(templateId))
        : null;
      if (cached) {
        const parsed = JSON.parse(cached) as {
          scope?: string;
          customScope?: string;
          templateName?: string;
          items?: ChecklistItem[];
        };
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
          setTemplateName(parsed.templateName || '');
          setCustomScope(parsed.customScope || '');
          setSelectedScope(parsed.scope || '');
          toast.success(`Loaded "${parsed.templateName || templateId}" (${parsed.items.length} items)`);
        }
      } else {
        // No cached copy — start fresh, but pre-fill template name
        setTemplateName(`Checklist ${templateId}`);
      }
    } catch (e: any) {
      toast.error('Failed to load template from cache', { description: e?.message });
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  // ---- Derived values ----
  const activeScopeLabel = selectedScope
    ? SCOPE_TEMPLATES[selectedScope]?.label
    : customScope || '—';

  const activeScopeColor = selectedScope
    ? SCOPE_TEMPLATES[selectedScope]?.color
    : 'var(--erp-text-muted)';

  const activeScopeIcon = selectedScope
    ? SCOPE_TEMPLATES[selectedScope]?.icon
    : 'fa-clipboard-list';

  const stats = useMemo(() => {
    const total = items.length;
    const required = items.filter((i) => i.required).length;
    const critical = items.filter((i) => i.category === 'critical').length;
    const warning = items.filter((i) => i.category === 'warning').length;
    const info = items.filter((i) => i.category === 'info').length;
    const empty = items.filter((i) => !i.text.trim()).length;
    return { total, required, critical, warning, info, empty };
  }, [items]);

  // ---- Mutations ----
  const loadScope = (scope: string) => {
    const tmpl = SCOPE_TEMPLATES[scope];
    if (!tmpl) return;
    setSelectedScope(scope);
    setCustomScope(''); // Clear custom scope when a preset is picked
    setItems(tmpl.items.map((i) => ({ ...i })));
    if (!templateName) {
      setTemplateName(`${tmpl.label} Checklist`);
    }
  };

  const startEmpty = () => {
    setSelectedScope('');
    setItems([{ text: '', category: 'info' as ChecklistCategory, required: false, notes: '' }]);
    if (customScope && !templateName) {
      setTemplateName(`${customScope} Checklist`);
    }
  };

  const addItem = () =>
    setItems((arr) => [
      ...arr,
      { text: '', category: 'info', required: false, notes: '' },
    ]);

  const duplicateItem = (idx: number) =>
    setItems((arr) => {
      const next = [...arr];
      next.splice(idx + 1, 0, { ...next[idx] });
      return next;
    });

  const removeItem = (idx: number) =>
    setItems((arr) => arr.filter((_, i) => i !== idx));

  const moveItem = (idx: number, dir: -1 | 1) =>
    setItems((arr) => {
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      const next = [...arr];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const updateItem = (idx: number, patch: Partial<ChecklistItem>) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  // ---- Export ----
  const exportJson = () => {
    if (items.length === 0) {
      toast.error('Nothing to export — add at least one item');
      return;
    }
    const scope = selectedScope || customScope || 'custom';
    const data = {
      templateId: templateId || null,
      scope,
      scopeLabel: SCOPE_TEMPLATES[selectedScope]?.label || customScope || null,
      templateName: templateName || `${scope} checklist`,
      totalItems: items.length,
      items,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist_${(templateName || scope || 'template')
      .replace(/\s+/g, '_')
      .toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} checklist items`);
  };

  // ---- Save as Template ----
  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one item before saving');
      return;
    }
    // Persist to localStorage as a stand-in until SEED-1 ships the API.
    if (templateId) {
      try {
        window.localStorage.setItem(
          LS_KEY(templateId),
          JSON.stringify({
            scope: selectedScope,
            customScope,
            templateName,
            items,
            updatedAt: new Date().toISOString(),
          }),
        );
      } catch (e: any) {
        toast.error('Could not persist to cache', { description: e?.message });
      }
    }
    toast.success(`Template "${templateName}" saved`, {
      description: `${items.length} items · Scope: ${activeScopeLabel}`,
    });
    setSaveDialogOpen(false);
  };

  const hasItems = items.length > 0;

  // ------------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold flex items-center gap-2">
              <FAIcon name="fa-list-check" className="text-[var(--erp-accent)]" />
              Checklist Builder
              {templateId && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]">
                  {templateId}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">
              Pre-built templates for Marine, Soft Services, Landscape, MEP, Civil, Security, and Fire Protection scopes — plus custom scopes.
            </p>
          </div>
          {hasItems && (
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-[var(--erp-text-muted)] shrink-0">
              <span><strong className="text-[var(--erp-text)]">{stats.total}</strong> items</span>
              <span><strong className="text-[var(--erp-text)]">{stats.required}</strong> required</span>
              <span style={{ color: 'var(--erp-danger)' }}><strong>{stats.critical}</strong> critical</span>
              {stats.empty > 0 && (
                <span className="text-[var(--erp-warning)]">{stats.empty} empty</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[var(--erp-text-muted)] text-[12px]">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading template…
          </div>
        ) : (
          <>
            {/* Active scope banner */}
            {hasItems && (selectedScope || customScope) && (
              <div
                className="flex items-center gap-3 p-3 rounded-md border"
                style={{
                  borderColor: activeScopeColor + '55',
                  background: activeScopeColor + '12',
                }}
              >
                <span
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: activeScopeColor + '22', color: activeScopeColor }}
                >
                  <FAIcon name={activeScopeIcon} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[var(--erp-text)]">
                    {activeScopeLabel}
                  </div>
                  <div className="text-[10px] text-[var(--erp-text-muted)]">
                    {items.length} items · {stats.required} required · {stats.critical} critical
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedScope(''); setItems([]); }}
                  className="p-1 rounded text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] hover:bg-[var(--erp-bg-hover)]"
                  aria-label="Clear scope"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Scope selector grid */}
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--erp-text-muted)] mb-2">
                Select a Scope Template
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(SCOPE_TEMPLATES).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => loadScope(key)}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-md border text-[11px] font-medium transition-colors text-left',
                      selectedScope === key
                        ? 'border-[var(--erp-accent)] bg-[var(--erp-accent-dim)] text-[var(--erp-accent)]'
                        : 'border-[var(--erp-border)] bg-[var(--erp-bg-card)] hover:bg-[var(--erp-bg-hover)] text-[var(--erp-text-secondary)]',
                    )}
                  >
                    <span
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: tmpl.color + '20', color: tmpl.color }}
                    >
                      <FAIcon name={tmpl.icon} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate">{tmpl.label}</div>
                      <div className="text-[9px] text-[var(--erp-text-muted)]">
                        {tmpl.items.length} items
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom scope input */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Input
                  placeholder="Or enter custom scope (e.g. Data Center, Aviation, Healthcare)"
                  value={customScope}
                  onChange={(e) => setCustomScope(e.target.value)}
                  className="h-8 text-[12px] bg-[var(--erp-bg-input)] pr-7"
                />
                {customScope && (
                  <button
                    onClick={() => setCustomScope('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
                    aria-label="Clear custom scope"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={startEmpty}
                className="h-8 text-[11px]"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Start Empty
              </Button>
            </div>

            {/* Items list */}
            {hasItems && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-wide text-[var(--erp-text-muted)]">
                    Checklist Items ({items.length})
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                      className="h-7 text-[11px]"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportJson}
                      disabled={items.length === 0}
                      className="h-7 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSaveDialogOpen(true)}
                      disabled={items.length === 0}
                      className="h-7 text-[11px]"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" /> Save as Template
                    </Button>
                  </div>
                </div>

                {items.map((item, idx) => {
                  const catMeta = CATEGORY_META[item.category];
                  const CatIcon = catMeta.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-card)]"
                    >
                      {/* Item # */}
                      <span className="text-[10px] font-mono text-[var(--erp-text-muted)] pt-1.5 w-6 text-right shrink-0">
                        {idx + 1}.
                      </span>

                      {/* Required checkbox */}
                      <div className="pt-1.5">
                        <Checkbox
                          checked={item.required}
                          onCheckedChange={(v) => updateItem(idx, { required: v === true })}
                          aria-label="Required"
                        />
                      </div>

                      {/* Category badge */}
                      <span
                        className="mt-0.5 w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ background: catMeta.bg, color: catMeta.color }}
                        title={catMeta.label}
                      >
                        <CatIcon className="w-3 h-3" />
                      </span>

                      {/* Text + notes */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <Input
                          value={item.text}
                          onChange={(e) => updateItem(idx, { text: e.target.value })}
                          placeholder="Checklist item description…"
                          className="h-8 text-[12px] bg-[var(--erp-bg-input)]"
                        />
                        <Textarea
                          value={item.notes}
                          onChange={(e) => updateItem(idx, { notes: e.target.value })}
                          placeholder="Notes (optional)…"
                          rows={1}
                          className="min-h-[28px] text-[10px] py-1 bg-[var(--erp-bg-input)] resize-none"
                        />
                      </div>

                      {/* Category selector */}
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateItem(idx, { category: e.target.value as ChecklistCategory })
                        }
                        className="h-8 text-[10px] px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)] shrink-0 focus:outline-none focus:border-[var(--erp-accent)]"
                        aria-label="Category"
                      >
                        <option value="info">ℹ Info</option>
                        <option value="warning">⚠ Warning</option>
                        <option value="critical">🚨 Critical</option>
                      </select>

                      {/* Move + duplicate + delete */}
                      <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                        <button
                          onClick={() => moveItem(idx, -1)}
                          disabled={idx === 0}
                          className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveItem(idx, 1)}
                          disabled={idx === items.length - 1}
                          className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => duplicateItem(idx)}
                          className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
                          aria-label="Duplicate"
                          title="Duplicate item"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeItem(idx)}
                          className="text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)]"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state when no items */}
            {!hasItems && (
              <div className="text-center py-10 text-[var(--erp-text-muted)] text-[12px]">
                <FAIcon
                  name="fa-clipboard-list"
                  className="text-[28px] mb-2 opacity-50"
                />
                <div>Select a scope template above, or click “Start Empty” to build a custom checklist from scratch.</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Save as Template dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Checklist Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Template name (e.g. MEP Daily Plant Room Inspection)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-9 text-[12px] bg-[var(--erp-bg-input)]"
              autoFocus
            />
            <p className="text-[11px] text-[var(--erp-text-muted)]">
              Scope: {activeScopeLabel} · {items.length} items ·{' '}
              {stats.required} required · {stats.critical} critical
            </p>
            {stats.empty > 0 && (
              <p className="text-[11px] text-[var(--erp-warning)]">
                ⚠ {stats.empty} item(s) have empty descriptions — they will be
                saved as-is.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChecklistBuilder;
