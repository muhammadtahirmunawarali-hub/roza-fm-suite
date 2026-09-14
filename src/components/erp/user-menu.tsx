'use client';

// FMCore ERP — User Menu (dropdown from toolbar profile)
import { useEffect, useRef, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { authApi } from '@/lib/erp/api';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LogOut, User as UserIcon, Settings as SettingsIcon, ChevronDown, ShieldCheck, Clock, Building2 } from 'lucide-react';
import { formatDate, formatTimeAgo } from '@/lib/erp/utils';

const ROLE_COLORS: Record<string, string> = {
  'Super Admin':   '#DC2626',
  'Administrator': '#7C3AED',
  'Manager':       '#2563EB',
  'Accountant':    '#059669',
  'Sales Manager': '#D97706',
  'Purchasing':    '#0891B2',
  'Storekeeper':   '#65A30D',
  'HR':            '#DB2777',
  'Technician':    '#EA580C',
  'Employee':      '#64748B',
  'Viewer':        '#94A3B8',
};

export function UserMenu() {
  const { user, userMenuOpen, setUserMenu, logout, openTab, theme, setTheme } = useErpStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Click outside to close
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen, setUserMenu]);

  if (!user) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
      toast.success(`Goodbye, ${user.name}!`);
      logout();
    } catch (e: any) {
      toast.error('Logout failed', { description: e.message });
    } finally {
      setLoggingOut(false);
    }
  };

  const roleColor = ROLE_COLORS[user.role] || '#64748B';
  const initials = (user.avatar || user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')).toUpperCase();

  return (
    <>
      {/* Trigger (always rendered in toolbar) */}
      <button
        onClick={() => setUserMenu(!userMenuOpen)}
        className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-[var(--erp-bg-hover)] transition-colors"
        aria-label="User menu"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[12px] text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}
        >
          {initials}
        </div>
        <div className="hidden lg:block leading-tight text-left">
          <div className="text-[12px] font-medium text-[var(--erp-text)] truncate max-w-[140px]">{user.name}</div>
          <div className="text-[10px] text-[var(--erp-text-muted)] truncate max-w-[140px]">{user.role}</div>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[var(--erp-text-muted)] transition-transform', userMenuOpen && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {userMenuOpen && (
        <div
          ref={menuRef}
          className="absolute top-[52px] right-3 w-[280px] bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg shadow-xl overflow-hidden z-50"
          style={{ animation: 'dropdownIn 0.15s ease-out' }}
        >
          <style>{`@keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          {/* User info header */}
          <div className="p-4 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)]">
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-[16px] text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--erp-text)] truncate">{user.name}</div>
                <div className="text-[11px] text-[var(--erp-text-muted)] truncate">{user.email}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white" style={{ background: roleColor }}>
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {user.role}
                  </span>
                  {user.tenantId && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] border border-[var(--erp-accent-border)]">
                      <Building2 className="w-2.5 h-2.5" />
                      Tenant User
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div className="flex items-center gap-1 text-[var(--erp-text-muted)]">
                <FAIcon name="fa-building-user" className="text-[10px]" />
                <span>{user.department || '—'}</span>
              </div>
              <div className="flex items-center gap-1 text-[var(--erp-text-muted)]">
                <Clock className="w-2.5 h-2.5" />
                <span>{user.lastLoginAt ? `Last: ${formatTimeAgo(user.lastLoginAt)}` : 'First login'}</span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <MenuButton icon={<UserIcon className="w-3.5 h-3.5" />} label="My Profile" onClick={() => { setUserMenu(false); toast.info('Profile page coming soon'); }} />
            <MenuButton icon={<SettingsIcon className="w-3.5 h-3.5" />} label="Settings" onClick={() => { setUserMenu(false); openTab({ id: 'settings', type: 'settings', label: 'Settings', icon: 'fa-cog' }); }} />
            {user.role === 'Super Admin' || user.role === 'Administrator' ? (
              <MenuButton icon={<FAIcon name="fa-users-gear" />} label="Manage Users" onClick={() => { setUserMenu(false); openTab({ id: 'users', type: 'users', label: 'Users', icon: 'fa-users-gear' }); }} />
            ) : null}
            <MenuButton
              icon={theme === 'dark' ? <FAIcon name="fa-sun" /> : <FAIcon name="fa-moon" />}
              label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); }}
            />
          </div>

          {/* Logout */}
          <div className="border-t border-[var(--erp-border)] p-1">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12px] text-[var(--erp-danger)] hover:bg-[rgba(239,68,68,0.1)] transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)] transition-colors"
    >
      <span className="text-[var(--erp-text-muted)] shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}
