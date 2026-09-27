'use client';

// Roza FM Suite — Force Password Change Modal
//
// Shown when the logged-in user has `mustChangePassword = true` (set on signup
// or when an admin creates/resets a user). The user MUST set a new password
// before they can use the system — the modal is non-dismissable.
//
// Industry standard: admin-set passwords are temporary. The user picks their own.
import { useState } from 'react';
import { authApi } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Loader2, ShieldAlert, Check } from 'lucide-react';

export function ForcePasswordChangeModal() {
  const { user, setUser } = useErpStore();
  const open = !!user?.mustChangePassword;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // Password strength check (simple but effective)
  const strength = (() => {
    if (!newPassword) return { score: 0, label: '', color: 'var(--erp-text-muted)' };
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) s++;
    if (/\d/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['var(--erp-danger)', 'var(--erp-danger)', 'var(--erp-warning)', 'var(--erp-accent)', 'var(--erp-success)'];
    return { score: s, label: labels[s], color: colors[s] };
  })();

  const canSubmit =
    currentPassword &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      if (res.ok) {
        toast.success('Password changed successfully!');
        // Update the local user to clear the mustChangePassword flag
        if (user) setUser({ ...user, mustChangePassword: false });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(res.error || 'Failed to change password');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* non-dismissable */ }}>
      <DialogContent className="max-w-md p-0 overflow-hidden" style={{ pointerEvents: 'auto' }} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">Change Your Password</DialogTitle>

        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--erp-border)] bg-[rgba(245,158,11,0.05)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgba(245,158,11,0.15)] text-[var(--erp-warning)] shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--erp-text)]">Set Your Password</h2>
            <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">
              Your account is using a temporary password. Please set a new one to continue.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-md bg-[rgba(239,68,68,0.1)] border border-[var(--erp-danger)]/30 text-[11px] text-[var(--erp-danger)]">
              {error}
            </div>
          )}

          {/* Current password */}
          <div>
            <Label className="text-[11px] font-medium text-[var(--erp-text-secondary)] mb-1.5 block">Current Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-9 pl-9 pr-9 bg-[var(--erp-bg-input)] text-[13px]"
                placeholder="Enter current password"
                autoComplete="current-password"
                required
                autoFocus
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <Label className="text-[11px] font-medium text-[var(--erp-text-secondary)] mb-1.5 block">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-9 pl-9 pr-9 bg-[var(--erp-bg-input)] text-[13px]"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {/* Strength meter */}
            {newPassword && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1 rounded-full bg-[var(--erp-bg-input)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }} />
                </div>
                <span className="text-[10px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <Label className="text-[11px] font-medium text-[var(--erp-text-secondary)] mb-1.5 block">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <Input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`h-9 pl-9 pr-9 bg-[var(--erp-bg-input)] text-[13px] ${confirmPassword && confirmPassword !== newPassword ? 'border-[var(--erp-danger)]' : ''}`}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
              />
              {confirmPassword && confirmPassword === newPassword && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-success)]" />
              )}
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-[10px] text-[var(--erp-danger)] mt-1">Passwords don't match</p>
            )}
          </div>

          {/* Requirements */}
          <div className="p-2.5 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)]">
            <div className="text-[10px] font-medium text-[var(--erp-text-muted)] mb-1">Password requirements:</div>
            <ul className="text-[10px] text-[var(--erp-text-secondary)] space-y-0.5">
              <li className={newPassword.length >= 8 ? 'text-[var(--erp-success)]' : ''}>• At least 8 characters</li>
              <li className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-[var(--erp-success)]' : ''}>• Mix of upper and lower case</li>
              <li className={/\d/.test(newPassword) ? 'text-[var(--erp-success)]' : ''}>• At least one number</li>
              <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-[var(--erp-success)]' : ''}>• At least one symbol (recommended)</li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-9 bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)] text-[12px] font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Changing password...
              </>
            ) : (
              'Set New Password'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
