'use client';

// Roza FM Suite — Go-Live & Deployment Guide
// How to deploy to Vercel, set up a public website, enable multi-company SaaS,
// and sell the product to customers.
import { useState } from 'react';
import { Rocket, Globe, Users, DollarSign, Server, Cloud, CheckCircle2, Copy, ExternalLink, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function GoLiveGuide() {
  const [tab, setTab] = useState<'deploy' | 'website' | 'saas' | 'sell'>('deploy');

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied: ${label}`);
  };

  return (
    <div className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center gap-2">
        <Rocket className="w-5 h-5 text-[var(--erp-accent)]" />
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--erp-text)]">Go-Live & Deployment Guide</h2>
          <p className="text-[11px] text-[var(--erp-text-muted)]">Deploy to Vercel, set up website, enable multi-company SaaS, sell the product</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)] overflow-x-auto">
        {[
          { id: 'deploy', label: 'Deploy to Vercel', icon: <Cloud className="w-3.5 h-3.5" /> },
          { id: 'website', label: 'Public Website', icon: <Globe className="w-3.5 h-3.5" /> },
          { id: 'saas', label: 'Multi-Company SaaS', icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'sell', label: 'Sell the Product', icon: <DollarSign className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap ${
              tab === t.id ? 'bg-[var(--erp-accent)] text-white' : 'bg-[var(--erp-bg-card)] text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto space-y-4 text-[12px] text-[var(--erp-text-secondary)] leading-relaxed">

        {/* TAB 1: DEPLOY TO VERCEL */}
        {tab === 'deploy' && (
          <div className="space-y-4">
            <Section icon={<Cloud className="w-4 h-4" />} title="Deploy to Vercel (Easiest — 5 minutes)">
              <ol className="ml-4 list-decimal space-y-1.5">
                <li><strong>Push code to GitHub</strong> — create a repo and push your project:
                  <CodeBlock title="Push to GitHub" code={`git init\ngit add .\ngit commit -m "Roza FM Suite production"\ngit remote add origin https://github.com/YOUR_USERNAME/fmcore-erp.git\ngit push -u origin main`} onCopy={() => copy('git init\ngit add .\ngit commit -m "Roza FM Suite"\ngit push origin main', 'Git push')} />
                </li>
                <li><strong>Go to Vercel</strong> — visit <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-[var(--erp-accent)] hover:underline inline-flex items-center gap-0.5">vercel.com/new <ExternalLink className="w-3 h-3" /></a></li>
                <li><strong>Import your repo</strong> — click "Import" next to your GitHub repository</li>
                <li><strong>Configure</strong> — Vercel auto-detects Next.js. Just click "Deploy".</li>
                <li><strong>Add Environment Variables</strong> — in Vercel dashboard → Settings → Environment Variables:
                  <div className="mt-1 text-[10px] text-[var(--erp-text-muted)] font-mono">
                    DATABASE_URL = your-postgres-connection-string<br/>
                    AUTH_SECRET = your-random-secret-key<br/>
                    # Optional (for production SaaS):<br/>
                    STRIPE_SECRET_KEY = sk_live_...<br/>
                    STRIPE_WEBHOOK_SECRET = whsec_...<br/>
                    RESEND_API_KEY = re_...
                  </div>
                </li>
                <li><strong>Set up PostgreSQL</strong> — Vercel Postgres or external (Neon, Supabase, Railway):
                  <div className="mt-1 text-[10px] text-[var(--erp-text-muted)]">
                    Update <code className="text-[var(--erp-accent)]">prisma/schema.prisma</code> provider from <code>"sqlite"</code> to <code>"postgresql"</code>, then run <code className="text-[var(--erp-accent)]">bun run db:push</code>
                  </div>
                </li>
                <li><strong>Deploy!</strong> — Vercel builds and deploys automatically. Your app is live at <code className="text-[var(--erp-accent)]">https://fmcore-erp.vercel.app</code></li>
              </ol>
              <div className="p-3 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] text-[11px] mt-2">
                <strong className="text-[var(--erp-success)]">✅ Result:</strong> Your app is live on the internet! Anyone with the URL can access it. Users can sign up, log in, and use the ERP.
              </div>
            </Section>

            <Section icon={<Server className="w-4 h-4" />} title="Alternative: Self-Hosted VPS">
              <CodeBlock title="VPS deployment (Ubuntu)" code={`# SSH into your server
ssh root@your-server-ip

# Install Node.js 20 + Bun
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
curl -fsSL https://bun.sh/install | bash

# Clone + build
git clone https://github.com/YOUR_USERNAME/fmcore-erp.git
cd fmcore-erp
bun install
bun run db:push
bun run build
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Run with PM2 (keeps alive)
npm install -g pm2
pm2 start "node .next/standalone/server.js" --name fmcore
pm2 startup && pm2 save

# Set up Nginx + SSL
apt install nginx certbot python3-certbot-nginx
# Configure Nginx to proxy localhost:3000
certbot --nginx -d yourdomain.com`} onCopy={() => copy('git clone https://github.com/YOUR_USERNAME/fmcore-erp.git\ncd fmcore-erp\nbun install\nbun run db:push\nbun run build', 'VPS deploy')} />
            </Section>
          </div>
        )}

        {/* TAB 2: PUBLIC WEBSITE */}
        {tab === 'website' && (
          <div className="space-y-4">
            <Section icon={<Globe className="w-4 h-4" />} title="Set Up a Public Website (Marketing + App)">
              <p>The app can serve as BOTH the marketing website AND the ERP application:</p>
              <ol className="ml-4 list-decimal space-y-1.5 mt-2">
                <li><strong>Buy a domain</strong> — e.g., <code className="text-[var(--erp-accent)]">fmcore-erp.com</code> from Namecheap/GoDaddy</li>
                <li><strong>Point to Vercel</strong> — add a CNAME record: <code className="text-[var(--erp-accent)]">fmcore-erp.com → cname.vercel-dns.com</code></li>
                <li><strong>Add domain in Vercel</strong> — dashboard → Settings → Domains → add your domain</li>
                <li><strong>Create a landing page</strong> — add a marketing page at <code className="text-[var(--erp-accent)]">/</code> that shows:
                  <ul className="ml-4 list-disc mt-1 text-[10px]">
                    <li>Product features (35 registers, AI assistant, dashboards, etc.)</li>
                    <li>Pricing plans ($49/$149/$499)</li>
                    <li>"Get Started" button → leads to signup flow</li>
                    <li>Demo login (admin/admin123) for trial</li>
                  </ul>
                </li>
                <li><strong>App at /app</strong> — the ERP lives at <code className="text-[var(--erp-accent)]">/app</code> or a subdomain like <code className="text-[var(--erp-accent)]">app.fmcore-erp.com</code></li>
              </ol>
            </Section>

            <Section icon={<Globe className="w-4 h-4" />} title="Custom Domain Per Company (White-label)">
              <p>For SaaS customers who want their own domain:</p>
              <ul className="ml-4 list-disc space-y-1 mt-1">
                <li><strong>Company A</strong>: <code className="text-[var(--erp-accent)]">erp.company-a.com</code> → your Vercel app</li>
                <li><strong>Company B</strong>: <code className="text-[var(--erp-accent)]">facility.company-b.com</code> → same app, different tenant</li>
                <li><strong>Company C</strong>: <code className="text-[var(--erp-accent)]">maint.company-c.com</code> → same app, different branding</li>
              </ul>
              <p className="mt-1 text-[10px] text-[var(--erp-text-muted)]">Each company adds a CNAME to their domain pointing to your Vercel app. Vercel handles SSL automatically. The app detects the domain and loads the correct tenant + branding.</p>
            </Section>
          </div>
        )}

        {/* TAB 3: MULTI-COMPANY SaaS */}
        {tab === 'saas' && (
          <div className="space-y-4">
            <Section icon={<Building2 className="w-4 h-4" />} title="How Multi-Company SaaS Works">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 my-2">
                <div className="p-3 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                  <div className="text-[20px] mb-1">🏢</div>
                  <div className="text-[12px] font-semibold text-[var(--erp-text)]">Company A</div>
                  <div className="text-[10px] text-[var(--erp-text-muted)]">Plan: Professional ($149/mo)<br/>50 users, 100K records<br/>Custom branding + logo</div>
                </div>
                <div className="p-3 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                  <div className="text-[20px] mb-1">🏭</div>
                  <div className="text-[12px] font-semibold text-[var(--erp-text)]">Company B</div>
                  <div className="text-[10px] text-[var(--erp-text-muted)]">Plan: Starter ($49/mo)<br/>10 users, 10K records<br/>Standard branding</div>
                </div>
                <div className="p-3 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                  <div className="text-[20px] mb-1">🏗️</div>
                  <div className="text-[12px] font-semibold text-[var(--erp-text)]">Company C</div>
                  <div className="text-[10px] text-[var(--erp-text-muted)]">Plan: Enterprise ($499/mo)<br/>500 users, 1M records<br/>SSO + custom domain</div>
                </div>
              </div>
              <p>All companies share the same app instance but have <strong>isolated data</strong> (tenantId). Each company:</p>
              <ul className="ml-4 list-disc space-y-1 mt-1">
                <li>Has their own admin, users, registers, records</li>
                <li>Sees only their own data (no cross-company visibility)</li>
                <li>Pays their own subscription (Stripe billing)</li>
                <li>Can customize branding (logo, colors, app name)</li>
                <li>Has plan-based limits (users, records, storage)</li>
              </ul>
            </Section>

            <Section icon={<Users className="w-4 h-4" />} title="Onboard a New Company (Step by Step)">
              <ol className="ml-4 list-decimal space-y-1.5">
                <li><strong>Super Admin</strong> logs in → Settings → "SaaS Multi-Company" tab</li>
                <li>Clicks <strong>"New Company"</strong> → fills form:
                  <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5 ml-2">
                    Company Name: "Company A" · Slug: "company-a" · Admin: "Alice" · Email: alice@companya.com · Plan: Professional
                  </div>
                </li>
                <li>System creates: Tenant + Admin User (Administrator role + full 41-module permissions) + seeds 46 registers + ~250 sample records + Audit Log (in one transaction)</li>
                <li><strong>Alice's sidebar is fully populated on first login</strong> — she sees all 46 registers (Work Orders, Assets, PM, Inventory, etc.) with test data, NOT an empty shell</li>
                <li>Company A's admin receives login credentials</li>
                <li>Alice logs in → sees only Company A's data (tenantId isolation enforced at the Prisma query layer — no cross-company visibility, ever)</li>
                <li>Alice can create her own users, custom registers, records — all isolated to her tenant</li>
                <li>Alice <strong>cannot</strong> access SaaS Multi-Company, Project Status, or delete other companies (Administrator role, not Super Admin)</li>
                <li>Stripe handles monthly billing ($149/mo for Professional plan)</li>
              </ol>
            </Section>

            <Section icon={<Building2 className="w-4 h-4" />} title="Architecture (How It Works)">
              <div className="font-mono text-[10px] text-[var(--erp-text-muted)] bg-[var(--erp-bg-input)] p-3 rounded-md">
                <div>🌐 Browser → https://app.fmcore-erp.com</div>
                <div>↓</div>
                <div>🖥️ Vercel (Next.js production server)</div>
                <div>↓</div>
                <div>🗄️ PostgreSQL (shared database, tenantId isolation)</div>
                <div>↓</div>
                <div>├── Company A (tenantId: "aaa") → sees only aaa records</div>
                <div>├── Company B (tenantId: "bbb") → sees only bbb records</div>
                <div>└── Company C (tenantId: "ccc") → sees only ccc records</div>
                <div>↓</div>
                <div>💳 Stripe → monthly billing per company</div>
                <div>📧 Resend → email notifications per company</div>
              </div>
            </Section>
          </div>
        )}

        {/* TAB 4: SELL THE PRODUCT */}
        {tab === 'sell' && (
          <div className="space-y-4">
            <Section icon={<DollarSign className="w-4 h-4" />} title="Pricing Plans">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
                <PlanCard name="Starter" price="$49" period="/mo" users="10 users" records="10K records" features={["35 registers", "14 KPIs", "AI Assistant (100 req)", "Email support"]} color="#64748B" />
                <PlanCard name="Professional" price="$149" period="/mo" users="50 users" records="100K records" features={["Everything in Starter", "Unlimited registers", "White-label branding", "Public API", "Priority support", "Custom domain"]} color="#3B82F6" popular />
                <PlanCard name="Enterprise" price="$499" period="/mo" users="500 users" records="1M records" features={["Everything in Pro", "SSO/SAML", "Dedicated support", "SLA 99.9%", "On-premise option", "Custom integrations"]} color="#8B5CF6" />
              </div>
            </Section>

            <Section icon={<DollarSign className="w-4 h-4" />} title="One-Time License (For Desktop App Buyers)">
              <div className="p-3 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                <div className="text-[13px] font-semibold text-[var(--erp-text)]">💰 One-Time License: $999</div>
                <ul className="mt-1 ml-4 list-disc text-[10px] text-[var(--erp-text-muted)]">
                  <li>Desktop app (.exe / .dmg) — installed on buyer's computer</li>
                  <li>Local SQLite database — no internet required</li>
                  <li>Free updates for 1 year</li>
                  <li>Single-machine license (tied to hardware ID)</li>
                  <li>No monthly fees</li>
                </ul>
              </div>
            </Section>

            <Section icon={<Rocket className="w-4 h-4" />} title="Go-to-Market Strategy">
              <ol className="ml-4 list-decimal space-y-1.5">
                <li><strong>Launch on Vercel</strong> — deploy the app, make it publicly accessible</li>
                <li><strong>Create a landing page</strong> — show features, pricing, demo login</li>
                <li><strong>Offer free trial</strong> — 14-day trial with Starter plan (no credit card)</li>
                <li><strong>List on product directories</strong>:
                  <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5 ml-2">
                    • Product Hunt (launch day)<br/>
                    • Capterra / G2 (software directories)<br/>
                    • AlternativeTo / SaaSHub<br/>
                    • LinkedIn (target facility managers)<br/>
                    • Google Ads (keywords: "facility management software", "maintenance ERP")
                  </div>
                </li>
                <li><strong>Target customers</strong>:
                  <div className="text-[10px] text-[var(--erp-text-muted)] mt-0.5 ml-2">
                    • Facility management companies<br/>
                    • Property management firms<br/>
                    • Maintenance contractors<br/>
                    • HVAC/electrical/plumbing service companies<br/>
                    • Building owners with maintenance teams
                  </div>
                </li>
                <li><strong>Demo to prospects</strong> — share the demo URL (admin/admin123) for trial</li>
                <li><strong>Onboard paying customers</strong> — Settings → SaaS Multi-Company → New Company</li>
                <li><strong>Collect payment</strong> — Stripe handles billing automatically (monthly/annual)</li>
              </ol>
            </Section>

            <Section icon={<CheckCircle2 className="w-4 h-4" />} title="What's Ready Now (No More Development Needed)">
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> 35 registers pre-built</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> 14-role RBAC system</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> AI assistant with voice + CRUD</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Dashboard with KPIs + charts</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Multi-tenant SaaS billing</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Public REST API + API keys</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Webhook system</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> PWA (installable)</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Recycle bin</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> 6-language translation</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> White-label branding</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Deployment guide</div>
              </div>
              <div className="p-3 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] text-[11px] mt-2">
                <strong className="text-[var(--erp-success)]">🎉 The product is READY to sell!</strong> Deploy to Vercel, add your domain, set up Stripe, and start onboarding companies.
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Helper Components ----------
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--erp-accent)]">{icon}</span>
        <h3 className="text-[13px] font-semibold text-[var(--erp-text)]">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function CodeBlock({ title, code, onCopy }: { title: string; code: string; onCopy: () => void }) {
  return (
    <div className="my-2 rounded-md border border-[var(--erp-border)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--erp-bg-elevated)] border-b border-[var(--erp-border)]">
        <span className="text-[10px] font-mono text-[var(--erp-text-muted)]">{title}</span>
        <button onClick={onCopy} className="flex items-center gap-1 text-[10px] text-[var(--erp-accent)]">
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <pre className="p-3 bg-[var(--erp-bg-input)] text-[11px] font-mono text-[var(--erp-text)] overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function PlanCard({ name, price, period, users, records, features, color, popular }: any) {
  return (
    <div className={`rounded-lg border p-3 relative ${popular ? 'border-[var(--erp-accent)] bg-[var(--erp-accent-dim)]' : 'border-[var(--erp-border)] bg-[var(--erp-bg-input)]'}`}>
      {popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded-full bg-[var(--erp-accent)] text-white font-semibold">POPULAR</span>}
      <div className="text-[14px] font-bold text-[var(--erp-text)]">{name}</div>
      <div className="text-[22px] font-bold mt-1" style={{ color }}>{price}<span className="text-[11px] text-[var(--erp-text-muted)]">{period}</span></div>
      <div className="text-[10px] text-[var(--erp-text-muted)] mt-1">{users} · {records}</div>
      <ul className="mt-2 space-y-0.5">
        {features.map((f: string, i: number) => <li key={i} className="text-[10px] text-[var(--erp-text-secondary)] flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[var(--erp-success)]" /> {f}</li>)}
      </ul>
    </div>
  );
}

export default GoLiveGuide;
