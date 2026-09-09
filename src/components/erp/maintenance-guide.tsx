'use client';

// FMCore ERP — Maintenance & Update Guide
// How to add features, fix bugs, and update the app after deployment.
// Also includes Desktop App (.exe) plan and Final Audit Checklist.
import { useState } from 'react';
import { FAIcon } from './icon';
import {
  Wrench, Bug, Plus, RefreshCw, Download, Monitor, CheckCircle2,
  Copy, Terminal, GitBranch, Package, Shield, AlertTriangle, FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export function MaintenanceGuide() {
  const [tab, setTab] = useState<'update' | 'desktop' | 'audit'>('update');

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied: ${label}`);
  };

  return (
    <div className="rounded-lg border border-[var(--erp-border)] bg-[var(--erp-bg-card)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--erp-border)] flex items-center gap-2">
        <Wrench className="w-5 h-5 text-[var(--erp-accent)]" />
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--erp-text)]">Maintenance, Desktop App & Final Audit</h2>
          <p className="text-[11px] text-[var(--erp-text-muted)]">How to update, fix bugs, build .exe, and audit the app</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)]">
        {[
          { id: 'update', label: 'Update & Fix Bugs', icon: <RefreshCw className="w-3.5 h-3.5" /> },
          { id: 'desktop', label: 'Desktop App (.exe)', icon: <Monitor className="w-3.5 h-3.5" /> },
          { id: 'audit', label: 'Final Audit', icon: <FileCheck className="w-3.5 h-3.5" /> },
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

        {/* TAB 1: UPDATE & FIX BUGS */}
        {tab === 'update' && (
          <div className="space-y-4">
            <Section icon={<Plus className="w-4 h-4" />} title="How to Add a New Feature">
              <ol className="ml-4 list-decimal space-y-1">
                <li><strong>Edit the code</strong> — modify files in <code className="text-[var(--erp-accent)]">src/components/erp/</code> or <code className="text-[var(--erp-accent)]">src/app/api/erp/</code></li>
                <li><strong>Test locally</strong> — the dev server auto-reloads: <code className="text-[var(--erp-accent)]">bun run dev</code></li>
                <li><strong>Check lint</strong> — <code className="text-[var(--erp-accent)]">bun run lint</code></li>
                <li><strong>Push schema changes</strong> — if you changed <code className="text-[var(--erp-accent)]">prisma/schema.prisma</code>, run <code className="text-[var(--erp-accent)]">bun run db:push</code></li>
                <li><strong>Build for production</strong> — <code className="text-[var(--erp-accent)]">bun run build</code></li>
                <li><strong>Deploy</strong> — copy <code className="text-[var(--erp-accent)]">.next/standalone/</code> to your server, or push to Vercel</li>
              </ol>
            </Section>

            <Section icon={<Bug className="w-4 h-4" />} title="How to Fix a Bug">
              <ol className="ml-4 list-decimal space-y-1">
                <li><strong>Find the error</strong> — check <code className="text-[var(--erp-accent)]">dev.log</code> for server errors, or browser console (F12) for client errors</li>
                <li><strong>Locate the file</strong> — the error message usually contains the file path</li>
                <li><strong>Edit the file</strong> — fix the bug in the source code</li>
                <li><strong>Dev server auto-reloads</strong> — no need to restart, just refresh the browser</li>
                <li><strong>Verify the fix</strong> — test the affected feature in the browser</li>
                <li><strong>Build + deploy</strong> — once verified, run <code className="text-[var(--erp-accent)]">bun run build</code> and deploy</li>
              </ol>
            </Section>

            <Section icon={<RefreshCw className="w-4 h-4" />} title="How to Update the Deployed App">
              <CodeBlock
                title="Update production server"
                code={`# 1. Pull latest code (if using Git)
git pull origin main

# 2. Install any new dependencies
bun install

# 3. Push any schema changes
bun run db:push

# 4. Rebuild
bun run build

# 5. Copy static files to standalone
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# 6. Restart the server
pkill -f "server.js"
node .next/standalone/server.js &`}
                onCopy={() => copy('git pull origin main\nbun install\nbun run db:push\nbun run build', 'Update commands')}
              />
            </Section>

            <Section icon={<GitBranch className="w-4 h-4" />} title="Version Management">
              <ul className="ml-4 list-disc space-y-1">
                <li><strong>Version number</strong>: Update in <code className="text-[var(--erp-accent)]">package.json</code> → <code className="text-[var(--erp-accent)]">"version": "1.0.0"</code></li>
                <li><strong>Changelog</strong>: Keep a <code className="text-[var(--erp-accent)]">CHANGELOG.md</code> file documenting each version's changes</li>
                <li><strong>Git tags</strong>: <code className="text-[var(--erp-accent)]">git tag v1.1.0 && git push --tags</code> to mark releases</li>
                <li><strong>Backup before update</strong>: Use Settings → Backup & Reset → Export to download a JSON backup</li>
              </ul>
            </Section>

            <div className="p-3 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] text-[11px]">
              <strong className="text-[var(--erp-success)]">💡 Pro Tip:</strong> The dev server auto-reloads when you save a file. You don&apos;t need to restart it for code changes — only for <code className="text-[var(--erp-accent)]">next.config.ts</code> or <code className="text-[var(--erp-accent)]">.env</code> changes.
            </div>
          </div>
        )}

        {/* TAB 2: DESKTOP APP (.exe) */}
        {tab === 'desktop' && (
          <div className="space-y-4">
            <Section icon={<Monitor className="w-4 h-4" />} title="Desktop App Plan (.exe / .dmg / .AppImage)">
              <p>Package the web app as a native desktop application using <strong>Tauri</strong> (recommended) or <strong>Electron</strong>. This gives users a double-click installer with offline capability, system tray, and auto-updates.</p>
            </Section>

            <Section icon={<Package className="w-4 h-4" />} title="Option A: Tauri (Recommended — Tiny Bundle)">
              <CodeBlock
                title="Setup Tauri (8 days effort)"
                code={`# 1. Install Tauri CLI
bun add -D @tauri-apps/cli

# 2. Initialize Tauri
bunx tauri init
# → Frontend dist: ../.next/standalone
# → Dev command: bun run dev
# → Build command: bun run build

# 3. Configure tauri.conf.json
# Set window title: "FMCore ERP"
# Set width: 1400, height: 900
# Set fullscreen: false

# 4. Build the desktop app
bunx tauri build

# 5. Output:
# Windows: .msi installer (in src-tauri/target/release/bundle/msi/)
# macOS: .dmg (in src-tauri/target/release/bundle/dmg/)
# Linux: .deb / .AppImage`}
                onCopy={() => copy('bun add -D @tauri-apps/cli\nbunx tauri init\nbunx tauri build', 'Tauri setup')}
              />
              <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                <div className="p-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                  <div className="font-semibold text-[var(--erp-text)]">✅ Tauri Pros</div>
                  <div className="text-[var(--erp-text-muted)] mt-1">• Tiny bundle (~3-10MB)<br/>• Low memory (~50MB)<br/>• Uses system webview<br/>• Rust backend (fast, secure)</div>
                </div>
                <div className="p-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                  <div className="font-semibold text-[var(--erp-text)]">⚠ Tauri Cons</div>
                  <div className="text-[var(--erp-text-muted)] mt-1">• Less mature than Electron<br/>• Rust required for native APIs<br/>• Smaller community</div>
                </div>
              </div>
            </Section>

            <Section icon={<Package className="w-4 h-4" />} title="Option B: Electron (Mature — Larger Bundle)">
              <CodeBlock
                title="Setup Electron (10 days effort)"
                code={`# 1. Install Electron + builder
bun add -D electron electron-builder

# 2. Create main.js (Electron entry)
# const { app, BrowserWindow } = require('electron');
# app.whenReady().then(() => {
#   const win = new BrowserWindow({ width: 1400, height: 900 });
#   win.loadURL('http://localhost:3000'); // dev
#   // or win.loadFile('.next/standalone/index.html'); // prod
# });

# 3. Add to package.json:
# "build": {
#   "appId": "com.fmcore.erp",
#   "win": { "target": "nsis" },
#   "mac": { "target": "dmg" }
# }

# 4. Build
bun run electron-builder

# 5. Output:
# Windows: .exe installer (in dist/)
# macOS: .dmg (in dist/)`}
                onCopy={() => copy('bun add -D electron electron-builder', 'Electron setup')}
              />
              <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                <div className="p-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                  <div className="font-semibold text-[var(--erp-text)]">✅ Electron Pros</div>
                  <div className="text-[var(--erp-text-muted)] mt-1">• Mature (VS Code, Slack, Discord)<br/>• Full Node.js access<br/>• Auto-update via electron-updater<br/>• Large community</div>
                </div>
                <div className="p-2 rounded border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
                  <div className="font-semibold text-[var(--erp-text)]">⚠ Electron Cons</div>
                  <div className="text-[var(--erp-text-muted)] mt-1">• Large bundle (~150MB)<br/>• Higher memory (~200MB)<br/>• Ships full Chromium</div>
                </div>
              </div>
            </Section>

            <Section icon={<CheckCircle2 className="w-4 h-4" />} title="Desktop-Exclusive Features">
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> System tray icon + notifications</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Offline mode (sync on reconnect)</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Global keyboard shortcuts</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Native file dialogs</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Auto-launch on startup</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Auto-update (background)</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Barcode/QR scanning (camera)</div>
                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Local backup (SQLite snapshot)</div>
              </div>
            </Section>

            <Section icon={<Shield className="w-4 h-4" />} title="One-Time Buyer License Model">
              <p>For one-time buyers (not SaaS subscription):</p>
              <ul className="ml-4 list-disc space-y-1 text-[11px]">
                <li><strong>Generate license keys</strong> — each buyer gets a unique key tied to their machine ID</li>
                <li><strong>Offline activation</strong> — the .exe checks the license key locally (no internet required after activation)</li>
                <li><strong>Free updates for 1 year</strong> — buyers get a download link for new .exe versions</li>
                <li><strong>Pricing suggestion</strong>: $499 one-time per installation (vs $49/mo SaaS subscription)</li>
              </ul>
            </Section>
          </div>
        )}

        {/* TAB 3: FINAL AUDIT */}
        {tab === 'audit' && (
          <div className="space-y-4">
            <Section icon={<FileCheck className="w-4 h-4" />} title="Final Audit Checklist">
              <p>Before deploying to production, verify each item below:</p>
            </Section>

            <AuditGroup title="🔐 Security" items={[
              'All API routes have authentication checks (getCurrentUser)',
              'Settings API requires settings:edit permission for POST/PUT',
              'Records API requires create/edit/delete permissions',
              'Users API requires admin role for create/delete',
 'Cookie is httpOnly + secure (production)',
              'Password is not returned in API responses',
              'API keys are masked in GET responses',
              'SQL injection prevention (Prisma parameterized queries)',
              'XSS prevention (React auto-escapes, no dangerouslySetInnerHTML from user input)',
              'CSRF protection (sameSite: lax on cookies)',
            ]} />

            <AuditGroup title="📊 Data Integrity" items={[
              'All records have auto-increment sequence numbers',
              'Soft-delete (isDeleted) works correctly — data not permanently lost',
              'Audit log captures all CRUD operations with user ID',
              'Schema migration is idempotent (safe to run multiple times)',
              'Backup export includes all registers, records, settings, notifications',
              'Backup import restores correctly (tested)',
            ]} />

            <AuditGroup title="🎨 UI/UX" items={[
              'Login screen renders correctly (dark theme)',
              'Sidebar shows only permitted registers per role',
              'Dashboard KPIs show real data (not hardcoded)',
              'Currency syncs from Settings → Dashboard → Registers → Forms',
              'Print layout renders correctly (company header, fields, signatures)',
              'Mobile responsive (sidebar collapses, tables scroll)',
              'Dark/light theme toggle works',
              'RTL layout works when enabled',
              'Error boundaries show actual error message (not generic)',
            ]} />

            <AuditGroup title="🤖 AI Assistant" items={[
              'AI can answer questions ("How many open work orders?")',
              'AI can create records ("Create a WO for Pump-05")',
              'AI can update records ("Update WO-0001 status to Completed")',
              'AI can delete records ("Delete WO-0003")',
              'AI can guide users ("How do I change currency?")',
              'AI fallback works if LLM fails (pattern-matched responses)',
              'AI audit log captures all AI actions',
            ]} />

            <AuditGroup title="⚡ Performance" items={[
              'Page loads in < 3 seconds (first load)',
              'API responses < 500ms (excluding LLM calls)',
              'No memory leaks (server stays under 2GB)',
              'Database queries are indexed (sequence, registerId)',
              'Pagination works (pageSize, page params)',
              'Dev server doesn\'t crash after 10+ requests',
            ]} />

            <AuditGroup title="🚀 Deployment" items={[
              'Production build succeeds without errors (bun run build)',
              'Standalone server starts correctly (node .next/standalone/server.js)',
              'Static files copied to standalone (public/, .next/static/)',
              'Environment variables documented (.env)',
              'Database file persists across restarts (db/custom.db)',
              'PWA manifest + service worker load correctly',
              'Font Awesome loads locally (no CDN dependency)',
            ]} />

            <div className="p-3 rounded-md border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)]">
              <div className="text-[12px] font-bold text-[#10B981] mb-1">✅ Sign-off</div>
              <p className="text-[11px] text-[var(--erp-text-secondary)]">
                Once all items above are verified, the app is ready for production deployment.
                Tag the release: <code className="text-[var(--erp-accent)]">git tag v1.0.0 && git push --tags</code>
              </p>
            </div>
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
        <button onClick={onCopy} className="flex items-center gap-1 text-[10px] text-[var(--erp-accent)] hover:text-[var(--erp-accent-hover)]">
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <pre className="p-3 bg-[var(--erp-bg-input)] text-[11px] font-mono text-[var(--erp-text)] overflow-x-auto whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

function AuditGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-3 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)]">
      <div className="text-[12px] font-semibold text-[var(--erp-text)] mb-2">{title}</div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px] text-[var(--erp-text-secondary)]">
            <span className="w-4 h-4 rounded border border-[var(--erp-border)] shrink-0 mt-0.5 flex items-center justify-center text-[8px] text-[var(--erp-text-muted)]">☐</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MaintenanceGuide;
