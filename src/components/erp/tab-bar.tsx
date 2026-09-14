'use client';

// Roza FM Suite — Tab Bar (with Excel-like Tab Navigator dropdown)
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { TabNavigator } from './tab-navigator';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useErpStore();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center h-[40px] border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)] shrink-0">
      <div className="flex items-center h-full overflow-x-auto no-scrollbar flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'group flex items-center gap-2 h-full px-3 text-[12px] border-r border-[var(--erp-border)] min-w-[120px] max-w-[220px] transition-colors shrink-0',
              activeTabId === tab.id
                ? 'bg-[var(--erp-bg)] text-[var(--erp-text)] font-medium'
                : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]',
            )}
            title={tab.label}
          >
            <FAIcon name={tab.icon} className="text-[11px] shrink-0 text-[var(--erp-accent)]" />
            <span className="flex-1 truncate text-left">{tab.label}</span>
            {tab.id !== 'dashboard' && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); closeTab(tab.id); } }}
                className="opacity-0 group-hover:opacity-100 hover:bg-[var(--erp-bg-active)] rounded p-0.5 cursor-pointer"
                aria-label={`Close ${tab.label}`}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Excel-like Tab Navigator dropdown */}
      <TabNavigator />
    </div>
  );
}
