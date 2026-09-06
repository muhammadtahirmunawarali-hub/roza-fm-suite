'use client';

// FMCore ERP — Users Management view (admin only)
import { useEffect, useState } from 'react';
import { usersApi } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import type { User } from '@/lib/erp/types';
import { ROLES } from '@/lib/erp/seed';
import { cn } from '@/lib/utils';
import { formatDate, formatTimeAgo } from '@/lib/erp/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Search, Plus, Pencil, Trash2, Users as UsersIcon, ShieldCheck, Loader2, X, Mail, User as UserIcon, Lock } from 'lucide-react';
import { EmptyStateIllustration } from './empty-state-illustration';

const ROLE_COLORS: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.color]));

export function UsersView() {
  const { user: currentUser } = useErpStore();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'Active').length,
    inactive: users.filter((u) => u.status === 'Inactive').length,
    admins: users.filter((u) => u.role === 'Super Admin' || u.role === 'Administrator').length,
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      if (editing) {
        await usersApi.update(editing.id, data);
        toast.success(`User "${data.name}" updated`);
      } else {
        await usersApi.create(data);
        toast.success(`User "${data.name}" created`);
      }
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error('Failed to save user', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await usersApi.remove(deleteTarget.id);
      toast.success(`User "${deleteTarget.name}" deactivated`);
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error('Failed to deactivate user', { description: e.message });
    }
  };

  if (currentUser?.role !== 'Super Admin' && currentUser?.role !== 'Administrator') {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--erp-bg-hover)] flex items-center justify-center mb-3">
          <Lock className="w-7 h-7 text-[var(--erp-text-muted)]" />
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--erp-text)] mb-1">Access denied</h3>
        <p className="text-[12px] text-[var(--erp-text-muted)] max-w-sm">
          You need Administrator or Super Admin privileges to access the Users Management module.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-card)]">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.05))', color: '#7C3AED' }}>
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-[var(--erp-text)]" style={{ fontFamily: 'var(--font-display)' }}>User Management</h1>
              <p className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">
                Manage user accounts, roles, and permissions.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="h-8 text-[12px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add User
          </Button>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 mt-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--erp-success)]" />
            Active {stats.active}
          </span>
          <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--erp-text-muted)]" />
            Inactive {stats.inactive}
          </span>
          <span className="flex items-center gap-1.5 text-[var(--erp-text-muted)]">
            <span className="w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />
            Admins {stats.admins}
          </span>
          <span className="text-[var(--erp-text-muted)]">·</span>
          <span className="text-[var(--erp-text-secondary)]">{stats.total} total users</span>
        </div>

        {/* Search + filter */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or username..."
              className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] focus:outline-none focus:border-[var(--erp-accent)] focus:ring-1 focus:ring-[var(--erp-accent-border)]"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-8 text-[12px] bg-[var(--erp-bg-input)] w-[160px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-[12px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                    {r.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-[var(--erp-bg-hover)] rounded-md animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <EmptyStateIllustration type="no-users" size={120} className="mb-3" />
            <h3 className="text-[14px] font-semibold text-[var(--erp-text)] mb-1">No users found</h3>
            <p className="text-[12px] text-[var(--erp-text-muted)] max-w-sm">
              {search || roleFilter !== 'all'
                ? 'Try adjusting your filters to find users.'
                : 'Click "Add User" to create the first user.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">User</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Role</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Department</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Last Login</th>
                <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wide text-[var(--erp-text-secondary)] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, idx) => {
                const roleColor = ROLE_COLORS[u.role] || '#64748B';
                const initials = (u.avatar || u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')).toUpperCase();
                return (
                  <tr
                    key={u.id}
                    className={cn(
                      'border-b border-[var(--erp-border)] hover:bg-[var(--erp-bg-hover)] transition-colors',
                      idx % 2 === 1 && 'bg-[var(--erp-bg)]/40',
                      u.id === currentUser?.id && 'bg-[var(--erp-accent-dim)]/40',
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[11px] text-white shrink-0" style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-medium text-[var(--erp-text)] truncate">
                            {u.name}
                            {u.id === currentUser?.id && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-[var(--erp-accent-dim)] text-[var(--erp-accent)] font-semibold">YOU</span>}
                          </div>
                          <div className="text-[10px] text-[var(--erp-text-muted)] truncate">{u.email} · @{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: roleColor }}>
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--erp-text-secondary)]">{u.department || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                          u.status === 'Active'
                            ? 'bg-[rgba(16,185,129,0.15)] text-[var(--erp-success)]'
                            : u.status === 'Inactive'
                            ? 'bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]'
                            : 'bg-[rgba(239,68,68,0.15)] text-[var(--erp-danger)]'
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--erp-text-muted)]">
                      {u.lastLoginAt ? (
                        <span title={formatDate(u.lastLoginAt)}>{formatTimeAgo(u.lastLoginAt)}</span>
                      ) : (
                        <span className="text-[var(--erp-text-muted)]">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          title="Edit user"
                          onClick={() => { setEditing(u); setFormOpen(true); }}
                          className="p-1.5 rounded text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-text)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            title="Deactivate user"
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded text-[var(--erp-text-muted)] hover:bg-[var(--erp-bg-hover)] hover:text-[var(--erp-danger)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* User form modal */}
      <UserFormDialog
        open={formOpen}
        user={editing}
        saving={saving}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate user "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the user's status to "Inactive" and invalidate all their active sessions. They will no longer be able to log in.
              This action can be reversed by reactivating the user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[var(--erp-danger)] hover:bg-[var(--erp-danger)]/90"
            >
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserFormDialog({
  open, user, saving, onClose, onSave,
}: { open: boolean; user: User | null; saving: boolean; onClose: () => void; onSave: (data: any) => void }) {
  // Use a `key` on the inner form component to reset state when user changes
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-[var(--erp-accent)]" />
            {user ? `Edit User — ${user.name}` : 'Add New User'}
          </DialogTitle>
        </DialogHeader>
        <UserFormBody key={user?.id || 'new'} user={user} saving={saving} onClose={onClose} onSave={onSave} />
      </DialogContent>
    </Dialog>
  );
}

function UserFormBody({
  user, saving, onClose, onSave,
}: { user: User | null; saving: boolean; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'Viewer');
  const [department, setDepartment] = useState(user?.department || '');
  const [status, setStatus] = useState(user?.status || 'Active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !username) {
      toast.error('Name, email, and username are required');
      return;
    }
    if (!user && !password) {
      toast.error('Password is required for new users');
      return;
    }
    const data: any = { name, email, username, role, department, status };
    if (password) data.password = password;
    onSave(data);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label className="text-[11px] mb-1">Full Name *</Label>
          <div className="relative">
            <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 pl-8 text-[12px] bg-[var(--erp-bg-input)]" placeholder="e.g. Sara Khan" required autoFocus />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] mb-1">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 pl-8 text-[12px] bg-[var(--erp-bg-input)]" placeholder="name@example.com" required />
            </div>
          </div>
          <div>
            <Label className="text-[11px] mb-1">Username *</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="h-9 text-[12px] bg-[var(--erp-bg-input)]" placeholder="username" required />
          </div>
        </div>
        <div>
          <Label className="text-[11px] mb-1">
            Password {user ? <span className="text-[var(--erp-text-muted)] font-normal">(leave blank to keep current)</span> : <span className="text-[var(--erp-danger)]">*</span>}
          </Label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--erp-text-muted)]" />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 pl-8 text-[12px] bg-[var(--erp-bg-input)]" placeholder={user ? '••••••••' : 'Enter password'} required={!user} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-[11px] mb-1">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-[12px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] mb-1">Department</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="h-9 text-[12px] bg-[var(--erp-bg-input)]" placeholder="e.g. Maintenance" />
          </div>
          <div>
            <Label className="text-[11px] mb-1">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 text-[12px] bg-[var(--erp-bg-input)]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active" className="text-[12px]">Active</SelectItem>
                <SelectItem value="Inactive" className="text-[12px]">Inactive</SelectItem>
                <SelectItem value="Suspended" className="text-[12px]">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {role && (
          <div className="p-2.5 rounded-md bg-[var(--erp-bg-input)] border border-[var(--erp-border)] text-[11px]">
            <div className="font-medium text-[var(--erp-text-secondary)] mb-1">{role} role permissions:</div>
            <div className="text-[var(--erp-text-muted)]">{ROLES.find((r) => r.id === role)?.description || '—'}</div>
          </div>
        )}
      </form>
      <DialogFooter className="border-t border-[var(--erp-border)] pt-3">
        <Button variant="outline" onClick={onClose} disabled={saving} className="h-9 text-[12px]">
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving} className="h-9 text-[12px] bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)]">
          {saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</> : (user ? 'Save Changes' : 'Create User')}
        </Button>
      </DialogFooter>
    </>
  );
}
