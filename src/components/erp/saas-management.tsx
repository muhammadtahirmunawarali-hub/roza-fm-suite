'use client';

// Roza FM Suite — SaaS Management Panel
// Shows all tenants, usage stats, plan limits, and onboarding flow.
import { useEffect, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Building2, Users, Database, CreditCard, Plus, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Trash2, Pencil, Save, X, HardDrive, Mail } from 'lucide-react';

interface Tenant {
  id: string; name: string; slug: string; plan: string; status: string;
  maxUsers: number; maxRecords: number; maxStorageMb?: number; currentUsers: number; currentRecords: number;
  stripeCustomerId: string | null; createdAt: string;
}

interface Usage {
  users: { current: number; limit: number };
  records: { current: number; limit: number };
  registers: { current: number; unlimited: boolean };
  auditLogs: { current: number };
  storage: { uploads: string; limit: string };
}

export function SaasManagement() {
  const { user, hasPermission } = useErpStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({ companyName: '', slug: '', adminName: '', adminEmail: '', plan: 'starter' });
  const [signingUp, setSigningUp] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ tenantName: string; adminName: string; username: string; email: string; tempPassword?: string; emailSent: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ plan: 'starter', status: 'active', maxUsers: 10, maxRecords: 10000, maxStorageMb: 1024 });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, usageRes] = await Promise.all([
        fetch('/api/erp/saas/tenants'),
        fetch('/api/erp/saas/usage'),
      ]);
      const tData = await tenantsRes.json();
      const uData = await usageRes.json();
      if (tData.ok) setTenants(tData.tenants);
      if (uData.ok) setUsage(uData.usage);
    } catch (e: any) {
      toast.error('Failed to load SaaS data', { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadSafe = async () => {
      setLoading(true);
      try {
        const [tenantsRes, usageRes] = await Promise.all([
          fetch('/api/erp/saas/tenants'),
          fetch('/api/erp/saas/usage'),
        ]);
        const tData = await tenantsRes.json();
        const uData = await usageRes.json();
        if (!cancelled && tData.ok) setTenants(tData.tenants);
        if (!cancelled && uData.ok) setUsage(uData.usage);
      } catch (e: any) {
        if (!cancelled) toast.error('Failed to load SaaS data', { description: e.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadSafe();
    return () => { cancelled = true; };
  }, []);

  const handleSignup = async () => {
    setSigningUp(true);
    try {
      const res = await fetch('/api/erp/saas/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (data.ok) {
        // Show the created credentials (temp password only displayed if email wasn't sent — dev fallback)
        setCreatedCreds({
          tenantName: data.tenant.name,
          adminName: data.admin.name,
          username: data.admin.username,
          email: data.admin.email,
          tempPassword: data.tempPassword, // only present when email wasn't sent
          emailSent: data.emailSent,
        });
        toast.success(`Company "${data.tenant.name}" created!`, {
          description: data.emailSent
            ? `Welcome email sent to ${data.admin.email}`
            : 'Email service not configured — temp password shown below',
        });
        setShowSignup(false);
        setSignupForm({ companyName: '', slug: '', adminName: '', adminEmail: '', plan: 'starter' });
        loadData();
      } else {
        toast.error('Signup failed', { description: data.error });
      }
    } catch (e: any) {
      toast.error('Signup failed', { description: e.message });
    } finally {
      setSigningUp(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/erp/saas/tenants/${confirmDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Tenant "${confirmDelete.name}" deleted`, { description: 'All users belonging to this tenant were removed. Demo data is untouched.' });
        setTenants(tenants.filter(t => t.id !== confirmDelete.id));
        setConfirmDelete(null);
      } else {
        toast.error('Delete failed', { description: data.error });
      }
    } catch (e: any) {
      toast.error('Delete failed', { description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      plan: tenant.plan,
      status: tenant.status,
      maxUsers: tenant.maxUsers,
      maxRecords: tenant.maxRecords,
      maxStorageMb: tenant.maxStorageMb || 1024,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTenant) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/erp/saas/tenants/${editingTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Tenant "${editingTenant.name}" updated`);
        setTenants(tenants.map(t => t.id === editingTenant.id ? { ...t, ...editForm } : t));
        setEditingTenant(null);
      } else {
        toast.error('Update failed', { description: data.error });
      }
    } catch (e: any) {
      toast.error('Update failed', { description: e.message });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[var(--erp-accent)]" /></div>;

  return (
    <div className="space-y-4">
      {/* Usage Overview */}
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <UsageCard icon={<Users className="w-4 h-4" />} label="Users" current={usage.users.current} limit={usage.users.limit} color="#3B82F6" />
          <UsageCard icon={<Database className="w-4 h-4" />} label="Records" current={usage.records.current} limit={usage.records.limit} color="#10B981" />
          <UsageCard icon={<Building2 className="w-4 h-4" />} label="Registers" current={usage.registers.current} limit={0} unlimited={usage.registers.unlimited} color="#8B5CF6" />
          <UsageCard icon={<CreditCard className="w-4 h-4" />} label="Storage" text={usage.storage.uploads} limitText={usage.storage.limit} color="#F59E0B" />
        </div>
      )}

      {/* Tenants List */}
      <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[var(--erp-text)] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--erp-accent)]" /> Companies (Tenants)
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-1.5 rounded hover:bg-[var(--erp-bg-hover)] text-[var(--erp-text-muted)]"><RefreshCw className="w-3.5 h-3.5" /></button>
            {user?.role === 'Super Admin' && (
              <button onClick={() => setShowSignup(!showSignup)} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] bg-[var(--erp-accent)] text-white font-medium hover:bg-[var(--erp-accent-hover)]">
                <Plus className="w-3.5 h-3.5" /> New Company
              </button>
            )}
          </div>
        </div>

        {/* Credentials display (after successful signup) */}
        {createdCreds && (
          <div className="p-4 border-b border-[var(--erp-border)] bg-[rgba(16,185,129,0.05)]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--erp-success)]/15 text-[var(--erp-success)] shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[var(--erp-text)]">
                  {createdCreds.tenantName} is ready!
                </div>
                <div className="text-[11px] text-[var(--erp-text-muted)] mt-0.5">
                  {createdCreds.emailSent
                    ? <>Welcome email sent to <strong>{createdCreds.email}</strong>. The admin can sign in and will be prompted to set their own password.</>
                    : <>Email service not configured (set <code className="text-[var(--erp-accent)]">RESEND_API_KEY</code> to send real emails). Share these credentials securely:</>
                  }
                </div>
              </div>
              <button onClick={() => setCreatedCreds(null)} className="text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] p-1 rounded hover:bg-[var(--erp-bg-hover)]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {!createdCreds.emailSent && createdCreds.tempPassword && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="p-2 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)]">
                  <div className="text-[9px] text-[var(--erp-text-muted)] uppercase tracking-wide">Username</div>
                  <div className="text-[11px] font-mono text-[var(--erp-text)] mt-0.5">{createdCreds.username}</div>
                </div>
                <div className="p-2 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)]">
                  <div className="text-[9px] text-[var(--erp-text-muted)] uppercase tracking-wide">Temp password</div>
                  <div className="text-[11px] font-mono text-[var(--erp-text)] mt-0.5">{createdCreds.tempPassword}</div>
                </div>
                <div className="p-2 rounded-md bg-[var(--erp-bg-card)] border border-[var(--erp-border)]">
                  <div className="text-[9px] text-[var(--erp-text-muted)] uppercase tracking-wide">Admin</div>
                  <div className="text-[11px] text-[var(--erp-text)] mt-0.5 truncate">{createdCreds.adminName}</div>
                </div>
              </div>
            )}
            {createdCreds.emailSent && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--erp-text-secondary)] mt-2">
                <Mail className="w-3.5 h-3.5 text-[var(--erp-success)]" />
                <span>Email delivered to <strong>{createdCreds.email}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Signup Form */}
        {showSignup && (
          <div className="p-4 border-b border-[var(--erp-border)] bg-[var(--erp-bg-input)] space-y-2">
            <div className="text-[12px] font-semibold text-[var(--erp-text)]">Onboard New Company</div>
            <div className="text-[10px] text-[var(--erp-text-muted)] flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span>A secure temp password will be auto-generated and emailed to the admin.</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={signupForm.companyName} onChange={e => setSignupForm({...signupForm, companyName: e.target.value})} placeholder="Company Name" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]" />
              <input value={signupForm.slug} onChange={e => setSignupForm({...signupForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')})} placeholder="slug (e.g. acme-corp)" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px] font-mono" />
              <input value={signupForm.adminName} onChange={e => setSignupForm({...signupForm, adminName: e.target.value})} placeholder="Admin Name" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]" />
              <input value={signupForm.adminEmail} onChange={e => setSignupForm({...signupForm, adminEmail: e.target.value})} placeholder="admin@company.com" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]" />
              <select value={signupForm.plan} onChange={e => setSignupForm({...signupForm, plan: e.target.value})} className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px] col-span-2">
                <option value="starter">Starter ($49/mo, 10 users, 1GB)</option>
                <option value="pro">Professional ($149/mo, 50 users, 10GB)</option>
                <option value="enterprise">Enterprise ($499/mo, 500 users, 100GB)</option>
              </select>
            </div>
            <button onClick={handleSignup} disabled={signingUp || !signupForm.companyName || !signupForm.slug || !signupForm.adminName || !signupForm.adminEmail} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] bg-[var(--erp-accent)] text-white font-medium disabled:opacity-50">
              {signingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Create Company & Send Invite
            </button>
          </div>
        )}

        {/* Tenant list */}
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-[var(--erp-text-muted)] text-[12px]">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No companies yet. Click "New Company" to onboard your first tenant.
          </div>
        ) : (
          <div className="divide-y divide-[var(--erp-border)]">
            {tenants.map(t => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[14px]" style={{ background: `linear-gradient(135deg, var(--erp-accent), #009975)` }}>
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-[var(--erp-text)]">{t.name}</span>
                      <span className="text-[10px] text-[var(--erp-text-muted)] font-mono">@{t.slug}</span>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold', t.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' : t.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' : t.plan === 'custom' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-500/20 text-slate-400')}>{t.plan}</span>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold', t.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>{t.status}</span>
                    </div>
                    <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
                      <span><Users className="w-2.5 h-2.5 inline mr-0.5" />{t.currentUsers}/{t.maxUsers} users</span>
                      <span>·</span>
                      <span><Database className="w-2.5 h-2.5 inline mr-0.5" />{t.currentRecords}/{t.maxRecords} records</span>
                      <span>·</span>
                      <span><HardDrive className="w-2.5 h-2.5 inline mr-0.5" />{((t.maxStorageMb || 1024) / 1024).toFixed(0)} GB storage</span>
                      <span>·</span>
                      <span>Created {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  {user?.role === 'Super Admin' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(t)}
                        disabled={editingTenant?.id === t.id}
                        className="p-1.5 rounded text-[var(--erp-text-muted)] hover:text-[var(--erp-accent)] hover:bg-[var(--erp-bg-hover)] transition-colors disabled:opacity-30"
                        title="Edit tenant (plan, limits, storage)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t)}
                        className="p-1.5 rounded text-[var(--erp-text-muted)] hover:text-[var(--erp-danger)] hover:bg-[var(--erp-bg-hover)] transition-colors"
                        title="Delete tenant + all its users"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Edit form (inline, shown when editing this tenant) */}
                {editingTenant?.id === t.id && (
                  <div className="mt-3 p-3 rounded-lg border border-[var(--erp-accent-border)] bg-[var(--erp-bg-input)] space-y-2">
                    <div className="text-[11px] font-semibold text-[var(--erp-accent)] flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Edit {t.name}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] text-[var(--erp-text-muted)] uppercase">Plan</label>
                        <select value={editForm.plan} onChange={e => setEditForm({...editForm, plan: e.target.value})} className="w-full h-7 px-1.5 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[10px]">
                          <option value="starter">Starter</option>
                          <option value="pro">Professional</option>
                          <option value="enterprise">Enterprise</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-[var(--erp-text-muted)] uppercase">Status</label>
                        <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full h-7 px-1.5 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[10px]">
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="trial">Trial</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-[var(--erp-text-muted)] uppercase">Max Users</label>
                        <input type="number" value={editForm.maxUsers} onChange={e => setEditForm({...editForm, maxUsers: Number(e.target.value)})} className="w-full h-7 px-1.5 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[10px]" />
                      </div>
                      <div>
                        <label className="text-[9px] text-[var(--erp-text-muted)] uppercase">Max Records</label>
                        <input type="number" value={editForm.maxRecords} onChange={e => setEditForm({...editForm, maxRecords: Number(e.target.value)})} className="w-full h-7 px-1.5 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[10px]" />
                      </div>
                    </div>
                    {/* Storage upgrade */}
                    <div className="flex items-center gap-2 pt-1">
                      <HardDrive className="w-3 h-3 text-[var(--erp-warning)]" />
                      <label className="text-[10px] text-[var(--erp-text-secondary)]">Storage limit:</label>
                      <select
                        value={editForm.maxStorageMb}
                        onChange={e => setEditForm({...editForm, maxStorageMb: Number(e.target.value)})}
                        className="h-7 px-1.5 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[10px]"
                      >
                        <option value={1024}>1 GB</option>
                        <option value={5120}>5 GB</option>
                        <option value={10240}>10 GB</option>
                        <option value={51200}>50 GB</option>
                        <option value={102400}>100 GB</option>
                        <option value={512000}>500 GB</option>
                        <option value={1048576}>1 TB</option>
                      </select>
                      <span className="text-[9px] text-[var(--erp-text-muted)]">({(editForm.maxStorageMb / 1024).toFixed(1)} GB)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] bg-[var(--erp-accent)] text-white font-medium disabled:opacity-50"
                      >
                        {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingTenant(null)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] border border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Billing Plans */}
      <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-4">
        <h3 className="text-[13px] font-semibold text-[var(--erp-text)] mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-[var(--erp-accent)]" /> Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'Starter', price: 49, users: 10, records: '10K', features: ['35 registers', '14 KPIs', 'AI (100 req/mo)', 'Email support'], color: '#64748B' },
            { name: 'Professional', price: 149, users: 50, records: '100K', features: ['Everything in Starter', 'Unlimited registers', 'White-label', 'Public API', 'Priority support'], color: '#3B82F6', popular: true },
            { name: 'Enterprise', price: 499, users: 500, records: '1M', features: ['Everything in Pro', 'SSO/SAML', 'Dedicated support', 'SLA 99.9%', 'On-premise option'], color: '#8B5CF6' },
          ].map(plan => (
            <div key={plan.name} className={cn('rounded-lg border p-3 relative', plan.popular ? 'border-[var(--erp-accent)] bg-[var(--erp-accent-dim)]' : 'border-[var(--erp-border)] bg-[var(--erp-bg-input)]')}>
              {plan.popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full bg-[var(--erp-accent)] text-white font-semibold">POPULAR</span>}
              <div className="text-[14px] font-bold text-[var(--erp-text)]">{plan.name}</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: plan.color }}>${plan.price}<span className="text-[11px] text-[var(--erp-text-muted)]">/mo</span></div>
              <div className="text-[10px] text-[var(--erp-text-muted)] mt-1">{plan.users} users · {plan.records} records</div>
              <ul className="mt-2 space-y-0.5">
                {plan.features.map((f, i) => <li key={i} className="text-[10px] text-[var(--erp-text-secondary)] flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[var(--erp-success)]" /> {f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Delete tenant confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-lg border border-[var(--erp-danger)]/50 bg-[var(--erp-bg-card)] p-6 max-w-md w-full space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--erp-danger)]" />
              <h3 className="text-[14px] font-semibold text-[var(--erp-text)]">Delete company "{confirmDelete.name}"?</h3>
            </div>
            <p className="text-[12px] text-[var(--erp-text-muted)]">
              This will permanently delete:
            </p>
            <ul className="text-[11px] text-[var(--erp-text-secondary)] space-y-1 ml-4 list-disc">
              <li>The tenant record ({confirmDelete.name})</li>
              <li>All users belonging to this tenant ({confirmDelete.currentUsers} user{confirmDelete.currentUsers !== 1 ? 's' : ''})</li>
            </ul>
            <div className="p-2 rounded-md bg-[rgba(16,185,129,0.08)] border border-[var(--erp-success)]/30 text-[11px] text-[var(--erp-success)]">
              ✓ <strong>Safe:</strong> Super Admin's demo data and other companies' data are NOT affected.
            </div>
            <p className="text-[11px] text-[var(--erp-danger)]">
              ⚠️ This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-md text-[11px] border border-[var(--erp-border)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTenant}
                disabled={deleting}
                className="px-3 py-1.5 rounded-md text-[11px] bg-[var(--erp-danger)] text-white font-medium hover:bg-[var(--erp-danger)]/90 disabled:opacity-50 flex items-center gap-1"
              >
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsageCard({ icon, label, current, limit, unlimited, text, limitText, color }: any) {
  const pct = unlimited ? 0 : limit > 0 ? Math.round((current / limit) * 100) : 0;
  const isWarning = pct > 80;
  // Text-based cards (like storage) don't have a numeric current/limit
  const isTextCard = text !== undefined;
  return (
    <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wide text-[var(--erp-text-muted)] font-semibold">{label}</span>
      </div>
      <div className="text-[18px] font-bold text-[var(--erp-text)]">{text !== undefined ? text : current}</div>
      {isTextCard ? (
        // Text-based card (e.g. Storage): show limitText as the limit
        <div className="text-[10px] text-[var(--erp-text-muted)]">/ {limitText || 'No limit'}</div>
      ) : (
        <>
          <div className="text-[10px] text-[var(--erp-text-muted)]">{unlimited ? 'Unlimited' : `/ ${limit} limit`}</div>
          {!unlimited && limit > 0 && (
            <div className="mt-1.5 w-full h-1.5 rounded-full bg-[var(--erp-bg-hover)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: isWarning ? '#EF4444' : color }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
