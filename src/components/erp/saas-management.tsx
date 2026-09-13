'use client';

// FMCore ERP — SaaS Management Panel
// Shows all tenants, usage stats, plan limits, and onboarding flow.
import { useEffect, useState } from 'react';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Building2, Users, Database, CreditCard, Plus, RefreshCw, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Tenant {
  id: string; name: string; slug: string; plan: string; status: string;
  maxUsers: number; maxRecords: number; currentUsers: number; currentRecords: number;
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
  const [signupForm, setSignupForm] = useState({ companyName: '', slug: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'starter' });
  const [signingUp, setSigningUp] = useState(false);

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

  useEffect(() => { loadData(); }, []);

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
        toast.success(`Company "${data.tenant.name}" created! Admin: ${data.admin.name}`);
        setShowSignup(false);
        setSignupForm({ companyName: '', slug: '', adminName: '', adminEmail: '', adminPassword: '', plan: 'starter' });
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

        {/* Signup Form */}
        {showSignup && (
          <div className="p-4 border-b border-[var(--erp-border)] bg-[var(--erp-bg-input)] space-y-2">
            <div className="text-[12px] font-semibold text-[var(--erp-text)]">Onboard New Company</div>
            <div className="grid grid-cols-2 gap-2">
              <input value={signupForm.companyName} onChange={e => setSignupForm({...signupForm, companyName: e.target.value})} placeholder="Company Name" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]" />
              <input value={signupForm.slug} onChange={e => setSignupForm({...signupForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')})} placeholder="slug (e.g. acme-corp)" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px] font-mono" />
              <input value={signupForm.adminName} onChange={e => setSignupForm({...signupForm, adminName: e.target.value})} placeholder="Admin Name" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]" />
              <input value={signupForm.adminEmail} onChange={e => setSignupForm({...signupForm, adminEmail: e.target.value})} placeholder="admin@company.com" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]" />
              <input type="password" value={signupForm.adminPassword} onChange={e => setSignupForm({...signupForm, adminPassword: e.target.value})} placeholder="Password" className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]" />
              <select value={signupForm.plan} onChange={e => setSignupForm({...signupForm, plan: e.target.value})} className="h-8 px-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-card)] text-[11px]">
                <option value="starter">Starter ($49/mo, 10 users)</option>
                <option value="pro">Professional ($149/mo, 50 users)</option>
                <option value="enterprise">Enterprise ($499/mo, 500 users)</option>
              </select>
            </div>
            <button onClick={handleSignup} disabled={signingUp} className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] bg-[var(--erp-accent)] text-white font-medium disabled:opacity-50">
              {signingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Create Company
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
              <div key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--erp-bg-hover)]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[14px]" style={{ background: `linear-gradient(135deg, var(--erp-accent), #009975)` }}>
                  {t.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[var(--erp-text)]">{t.name}</span>
                    <span className="text-[10px] text-[var(--erp-text-muted)] font-mono">@{t.slug}</span>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold', t.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' : t.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400')}>{t.plan}</span>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-semibold', t.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400')}>{t.status}</span>
                  </div>
                  <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5">
                    {t.currentUsers}/{t.maxUsers} users · {t.currentRecords}/{t.maxRecords} records · Created {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
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
