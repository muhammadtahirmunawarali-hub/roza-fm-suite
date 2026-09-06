'use client';

// FMCore ERP — Keyboard Shortcuts Help Modal
// Documents all available keyboard shortcuts in the app.
import { useErpStore } from '@/lib/erp/store';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard, Search, Plus, Bell, Wand2, Settings2, Moon, Sun, FileText } from 'lucide-react';

const SHORTCUTS = [
  { category: 'Navigation', items: [
    { keys: ['Ctrl', 'K'], description: 'Open Command Palette / Global Search', icon: <Search className="w-3.5 h-3.5" /> },
    { keys: ['Esc'], description: 'Close dialog, drawer, or panel', icon: <FileText className="w-3.5 h-3.5" /> },
  ]},
  { category: 'Toolbar Actions', items: [
    { keys: ['Click'], description: 'AI Assistant button — toggle AI panel', icon: <Wand2 className="w-3.5 h-3.5" /> },
    { keys: ['Click'], description: 'Notifications button — toggle notifications panel', icon: <Bell className="w-3.5 h-3.5" /> },
    { keys: ['Click'], description: 'Theme toggle — switch dark/light mode', icon: <Moon className="w-3.5 h-3.5" /> },
    { keys: ['Click'], description: 'Customize button — pin/hide KPIs & charts', icon: <Settings2 className="w-3.5 h-3.5" /> },
  ]},
  { category: 'Register View', items: [
    { keys: ['Click'], description: 'Column headers — sort by that column', icon: <FileText className="w-3.5 h-3.5" /> },
    { keys: ['Type'], description: 'Search box — real-time record search (350ms debounce)', icon: <Search className="w-3.5 h-3.5" /> },
    { keys: ['Click'], description: 'Row checkbox — select for bulk actions', icon: <Plus className="w-3.5 h-3.5" /> },
  ]},
  { category: 'Record Detail Drawer', items: [
    { keys: ['Esc'], description: 'Close drawer (or cancel inline edit if editing)', icon: <FileText className="w-3.5 h-3.5" /> },
    { keys: ['Click'], description: 'Tab buttons — switch between Details / History / Related / Activity', icon: <FileText className="w-3.5 h-3.5" /> },
  ]},
  { category: 'Forms', items: [
    { keys: ['Enter'], description: 'Submit form (in login screen)', icon: <FileText className="w-3.5 h-3.5" /> },
    { keys: ['Esc'], description: 'Cancel form / close dialog', icon: <FileText className="w-3.5 h-3.5" /> },
  ]},
];

export function KeyboardShortcuts({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[var(--erp-accent)]" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUTS.map((group) => (
            <div key={group.category}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--erp-text-muted)] mb-2 flex items-center gap-1.5">
                <div className="flex-1 h-px bg-[var(--erp-border)]" />
                {group.category}
                <div className="flex-1 h-px bg-[var(--erp-border)]" />
              </div>
              <div className="space-y-1.5">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[var(--erp-bg-hover)] transition-colors">
                    <span className="text-[var(--erp-text-muted)] shrink-0">{item.icon}</span>
                    <span className="text-[11px] text-[var(--erp-text-secondary)] flex-1">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((key) => (
                        <kbd key={key} className="px-1.5 py-0.5 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[10px] font-mono font-semibold text-[var(--erp-text)]">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
