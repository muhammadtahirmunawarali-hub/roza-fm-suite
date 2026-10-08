'use client';
// Roza FM Suite — Legal Pages (ToS + Privacy) dialog
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Shield, X, Clock, Mail } from 'lucide-react';

type LegalDoc = 'terms' | 'privacy';

export function LegalPagesDialog({ open, onClose, initial = 'terms' }: { open: boolean; onClose: () => void; initial?: LegalDoc }) {
  const [doc, setDoc] = useState<LegalDoc>(initial);
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Legal Documents</DialogTitle>
        <div className="flex flex-col h-[80vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--erp-border)] bg-[var(--erp-bg-secondary)]">
            <div className="flex items-center gap-2">
              <button onClick={() => setDoc('terms')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium ${doc === 'terms' ? 'bg-[var(--erp-accent)] text-white' : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]'}`}><FileText className="w-3.5 h-3.5" /> Terms of Service</button>
              <button onClick={() => setDoc('privacy')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium ${doc === 'privacy' ? 'bg-[var(--erp-accent)] text-white' : 'text-[var(--erp-text-secondary)] hover:bg-[var(--erp-bg-hover)]'}`}><Shield className="w-3.5 h-3.5" /> Privacy Policy</button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded text-[var(--erp-text-muted)] hover:text-[var(--erp-text)] hover:bg-[var(--erp-bg-hover)]"><X className="w-4 h-4" /></button>
          </div>
          <ScrollArea className="flex-1 px-6 py-5">
            {doc === 'terms' ? <TermsOfService /> : <PrivacyPolicy />}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LegalSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (<section><h2 className="text-[14px] font-semibold text-[var(--erp-text)] mb-1.5 flex items-baseline gap-2"><span className="text-[var(--erp-accent)] font-mono text-[11px]">{n}.</span>{title}</h2><div className="ml-4 space-y-2 text-[12px] text-[var(--erp-text-secondary)] leading-relaxed">{children}</div></section>);
}

function TermsOfService() {
  return (
    <div className="space-y-4">
      <header className="border-b border-[var(--erp-border)] pb-3 mb-2"><h1 className="text-[20px] font-bold text-[var(--erp-text)] mb-1">Terms of Service</h1><div className="flex items-center gap-3 text-[10px] text-[var(--erp-text-muted)]"><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div></header>
      <LegalSection n="1" title="Acceptance of Terms"><p>By accessing or using the Roza FM Suite platform, you agree to be bound by these Terms. If you do not agree, you must not use the Service.</p></LegalSection>
      <LegalSection n="2" title="Account Security"><p>You are responsible for maintaining the security of your credentials. Passwords are bcrypt-hashed and never stored in plaintext. You must not share your credentials with third parties.</p></LegalSection>
      <LegalSection n="3" title="Billing & Payment"><p>Subscriptions are billed monthly via Stripe. You authorize automatic recurring charges until cancellation. All fees are non-refundable except where required by law. You may cancel anytime via the Stripe Customer Portal.</p></LegalSection>
      <LegalSection n="4" title="Acceptable Use"><p>You agree not to: access another company&apos;s data, reverse engineer the Service, exceed plan limits, or use the Service for unlawful purposes. Multi-tenant isolation is enforced at the database layer.</p></LegalSection>
      <LegalSection n="5" title="Data Ownership"><p>You retain all rights to data you enter. We act as a data processor. You may export your data at any time. Upon cancellation, data is retained for 30 days then permanently deleted.</p></LegalSection>
      <LegalSection n="6" title="Security & Tenant Isolation"><p>We implement: bcrypt password hashing, TLS encryption, per-tenant data isolation (tenantId at query layer), Cloudflare R2 storage, role-based access control (14 roles × 41 modules), and audit logging.</p></LegalSection>
      <LegalSection n="7" title="Subprocessors"><p>Vercel (hosting), Neon/PostgreSQL (database), Cloudflare R2 (file storage), Stripe (payments), Resend (email). We do not sell your data.</p></LegalSection>
      <LegalSection n="8" title="Disclaimers & Liability"><p>The Service is provided &quot;as is&quot; without warranties. Our total liability is limited to the amount paid in the 12 months preceding any claim.</p></LegalSection>
      <LegalSection n="9" title="Termination"><p>You may cancel anytime. We may suspend accounts for non-payment or violations. Data is deleted 30 days after termination.</p></LegalSection>
      <LegalSection n="10" title="Governing Law"><p>These Terms are governed by the laws of the United Arab Emirates. Disputes are resolved in the courts of Dubai, UAE.</p></LegalSection>
      <LegalSection n="11" title="Contact"><p>Questions? Email <a href="mailto:legal@roza-fm-suite.com" className="text-[var(--erp-accent)] hover:underline">legal@roza-fm-suite.com</a></p></LegalSection>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="space-y-4">
      <header className="border-b border-[var(--erp-border)] pb-3 mb-2"><h1 className="text-[20px] font-bold text-[var(--erp-text)] mb-1">Privacy Policy</h1><div className="flex items-center gap-3 text-[10px] text-[var(--erp-text-muted)]"><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div></header>
      <LegalSection n="1" title="Overview"><p>We act as a data processor on behalf of our customers. Each customer organization is the data controller responsible for personal data they enter.</p></LegalSection>
      <LegalSection n="2" title="Data We Collect"><p>Account data (name, email, username), business data (work orders, assets, employees), billing data (via Stripe), and usage/security data (login timestamps, IP, audit logs).</p></LegalSection>
      <LegalSection n="3" title="Multi-Tenant Isolation"><p>Your data is architecturally isolated. Every database query includes a tenantId filter. Company A cannot access Company B&apos;s data. Even our platform admins don&apos;t see your business data.</p></LegalSection>
      <LegalSection n="4" title="Data Sharing"><p>We do not sell your data. We share only with subprocessors: Vercel, Neon, Cloudflare R2, Stripe, Resend — all GDPR-compliant.</p></LegalSection>
      <LegalSection n="5" title="Security"><p>bcrypt password hashing, HTTPS/TLS, database encryption at rest, per-tenant file isolation in R2, RBAC, httpOnly session cookies, audit logging.</p></LegalSection>
      <LegalSection n="6" title="Cookies"><p>One httpOnly session cookie (7-day expiry) + localStorage for theme/preferences. NO analytics or advertising cookies.</p></LegalSection>
      <LegalSection n="7" title="Your Rights"><p>You may: access your data (Backup feature), rectify (edit profile), erasure (contact us), portability (JSON export), object to processing. Contact us within 30 days.</p></LegalSection>
      <LegalSection n="8" title="Data Retention"><p>Active accounts: retained while subscribed. Cancelled: 30-day export window then deleted. Audit logs: 12 months. Recycle bin: 30 days.</p></LegalSection>
      <LegalSection n="9" title="International Transfers"><p>Data may be processed in UAE, US, and EU. We rely on Standard Contractual Clauses for lawful transfers.</p></LegalSection>
      <LegalSection n="10" title="Contact"><p>Privacy questions? Email <a href="mailto:privacy@roza-fm-suite.com" className="text-[var(--erp-accent)] hover:underline">privacy@roza-fm-suite.com</a></p></LegalSection>
    </div>
  );
}
