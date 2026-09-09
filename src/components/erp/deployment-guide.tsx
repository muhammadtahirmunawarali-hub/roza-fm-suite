'use client';
import { Rocket, Terminal, Download, Server, Monitor, Cloud, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function DeploymentGuide() {
  const [tab, setTab] = useState<'local' | 'prod' | 'saas'>('local');
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast.success(`Copied: ${label}`); };

  return (
    <div className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center gap-2">
        <Rocket className="w-5 h-5 text-[var(--erp-accent)]" />
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--erp-text)]">Deployment & Installation Guide</h2>
          <p className="text-[11px] text-[var(--erp-text-muted)]">How to install, run, and deploy FMCore ERP</p>
        </div>
      </div>
      <div className="flex gap-1 px-3 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)]">
        {[{id:'local',l:'Local Dev',i:<Monitor className="w-3.5 h-3.5" />},{id:'prod',l:'Production',i:<Server className="w-3.5 h-3.5" />},{id:'saas',l:'SaaS Setup',i:<Cloud className="w-3.5 h-3.5" />}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap ${tab===t.id?'bg-[var(--erp-accent)] text-white':'bg-[var(--erp-bg-card)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]'}`}>{t.i}{t.l}</button>
        ))}
      </div>
      <div className="p-4 max-h-[600px] overflow-y-auto space-y-4 text-[12px] text-[var(--erp-text-secondary)]">
        {tab === 'local' && (
          <div className="space-y-4">
            <div><div className="flex items-center gap-2 mb-2"><Monitor className="w-4 h-4 text-[var(--erp-accent)]" /><h3 className="text-[13px] font-semibold text-[var(--erp-text)]">1. Prerequisites</h3></div><ul className="ml-4 list-disc space-y-1"><li><strong>Node.js 18+</strong> — <a href="https://nodejs.org" target="_blank" className="text-[var(--erp-accent)] hover:underline">Download</a></li><li><strong>Bun</strong> — <a href="https://bun.sh" target="_blank" className="text-[var(--erp-accent)] hover:underline">Install</a></li><li><strong>Git</strong></li></ul></div>
            <div><div className="flex items-center gap-2 mb-2"><Download className="w-4 h-4 text-[var(--erp-accent)]" /><h3 className="text-[13px] font-semibold text-[var(--erp-text)]">2. Clone & Install</h3></div>
              <div className="my-2 rounded-md border border-[var(--erp-border)] overflow-hidden"><div className="flex items-center justify-between px-3 py-1.5 bg-[var(--erp-bg-elevated)]"><span className="text-[10px] font-mono text-[var(--erp-text-muted)]">Commands</span><button onClick={() => copy('git clone <repo> fmcore-erp\ncd fmcore-erp\nbun install\nbun run db:push\nbun run dev', 'install')} className="text-[10px] text-[var(--erp-accent)]"><Copy className="w-3 h-3 inline" /> Copy</button></div><pre className="p-3 bg-[var(--erp-bg-input)] text-[11px] font-mono overflow-x-auto">git clone &lt;repo&gt; fmcore-erp{'\n'}cd fmcore-erp{'\n'}bun install{'\n'}bun run db:push{'\n'}bun run dev</pre></div>
            </div>
            <div className="p-3 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)]"><strong className="text-[var(--erp-success)]">✅ Ready!</strong> Open <code className="text-[var(--erp-accent)]">http://localhost:3000</code>. Login: <strong>admin / admin123</strong></div>
          </div>
        )}
        {tab === 'prod' && (
          <div className="space-y-4">
            <div><div className="flex items-center gap-2 mb-2"><Server className="w-4 h-4 text-[var(--erp-accent)]" /><h3 className="text-[13px] font-semibold text-[var(--erp-text)]">Production Deploy</h3></div>
              <p className="mb-2">Option A: <strong>Vercel</strong> (easiest) — push to GitHub → import on vercel.com → deploy</p>
              <p className="mb-2">Option B: <strong>VPS</strong> — Node.js + PM2 + Nginx:</p>
              <div className="my-2 rounded-md border border-[var(--erp-border)] overflow-hidden"><div className="flex items-center justify-between px-3 py-1.5 bg-[var(--erp-bg-elevated)]"><span className="text-[10px] font-mono text-[var(--erp-text-muted)]">VPS Deploy</span><button onClick={() => copy('bun run build\npm2 start "bun run start" --name fmcore-erp\npm2 startup && pm2 save', 'VPS')} className="text-[10px] text-[var(--erp-accent)]"><Copy className="w-3 h-3 inline" /> Copy</button></div><pre className="p-3 bg-[var(--erp-bg-input)] text-[11px] font-mono overflow-x-auto">bun run build{'\n'}pm2 start "bun run start" --name fmcore-erp{'\n'}pm2 startup && pm2 save</pre></div>
              <p>Option C: <strong>Docker</strong> — Dockerfile + docker-compose with PostgreSQL</p>
            </div>
          </div>
        )}
        {tab === 'saas' && (
          <div className="space-y-4">
            <div><div className="flex items-center gap-2 mb-2"><Cloud className="w-4 h-4 text-[var(--erp-accent)]" /><h3 className="text-[13px] font-semibold text-[var(--erp-text)]">SaaS Configuration</h3></div>
              <ul className="ml-4 list-disc space-y-1">
                <li><strong>Multi-Tenant</strong>: Create tenants via <code className="text-[var(--erp-accent)]">POST /api/erp/tenants</code></li>
                <li><strong>Stripe Billing</strong>: Set <code className="text-[var(--erp-accent)]">STRIPE_SECRET_KEY</code> env var + <code>bun add stripe</code></li>
                <li><strong>Public API</strong>: Create API keys via <code className="text-[var(--erp-accent)]">POST /api/erp/api-keys</code>, use with <code>X-API-Key</code> header</li>
                <li><strong>Webhooks</strong>: Configure outbound event notifications</li>
                <li><strong>SSO</strong>: Dev mode at <code className="text-[var(--erp-accent)]">/api/erp/auth/sso?provider=dev</code></li>
                <li><strong>Branding</strong>: Customize via <code className="text-[var(--erp-accent)]">PUT /api/erp/branding</code></li>
              </ul>
            </div>
            <div className="p-3 rounded-md border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)]"><strong className="text-[var(--erp-warning)]">Dev Mode:</strong> All SaaS APIs work in development mode (logging instead of real Stripe/SMTP). Set env vars for production.</div>
          </div>
        )}
      </div>
    </div>
  );
}
