'use client';

// Roza FM Suite — Login Screen
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/erp/api';
import { useErpStore } from '@/lib/erp/store';
import { FAIcon } from './icon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User as UserIcon, Loader2, ShieldCheck, ChevronRight } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { username: 'admin',  password: 'admin123',  role: 'Super Admin',  name: 'System Administrator' },
  { username: 'john',   password: 'john123',   role: 'Manager',      name: 'John Smith' },
  { username: 'ahmed',  password: 'ahmed123',  role: 'Technician',   name: 'Ahmed Ali' },
  { username: 'fatima', password: 'fatima123', role: 'HR',           name: 'Fatima Al-Rashid' },
  { username: 'priya',  password: 'priya123',  role: 'Accountant',   name: 'Priya Sharma' },
];

export function LoginScreen() {
  const { setUser, setAuthLoading, theme, setTheme } = useErpStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      if (res.ok && res.user) {
        setUser(res.user);
        toast.success(`Welcome back, ${res.user.name}!`);
      } else {
        setError('Login failed');
      }
    } catch (e: any) {
      setError(e.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError(null);
    // Auto-submit after a short delay
    setTimeout(() => {
      setLoading(true);
      authApi.login(acc.username, acc.password).then((res) => {
        if (res.ok && res.user) {
          setUser(res.user);
          toast.success(`Welcome, ${res.user.name}!`);
        } else {
          setError('Login failed');
          setLoading(false);
        }
      }).catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--erp-bg)] p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, var(--erp-accent) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 relative z-10">
        {/* Left: branding */}
        <div className="hidden lg:flex flex-col justify-center p-8 text-[var(--erp-text)]">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
              style={{ background: 'linear-gradient(135deg, var(--erp-accent), #009975)', fontFamily: 'var(--font-display)' }}
            >
              F
            </div>
            <div>
              <div className="text-[26px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Roza <span className="text-[var(--erp-accent)]">FM Suite</span>
              </div>
              <div className="text-[12px] text-[var(--erp-text-muted)]">Facility Management Suite</div>
            </div>
          </div>

          <h1 className="text-[32px] font-bold leading-tight mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Enterprise facility management, <span className="text-[var(--erp-accent)]">reimagined.</span>
          </h1>
          <p className="text-[14px] text-[var(--erp-text-secondary)] mb-8 max-w-md">
            Dynamic register builder, real-time dashboards, approval workflows, and AI-powered insights — all in one scalable platform.
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { icon: 'fa-gauge-high', label: 'Live KPIs', sub: 'Real-time data' },
              { icon: 'fa-wand-magic-sparkles', label: 'AI Assistant', sub: 'Context-aware' },
              { icon: 'fa-shield-halved', label: 'RBAC', sub: 'Role-based access' },
              { icon: 'fa-database', label: '30 Registers', sub: 'Pre-loaded data' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--erp-bg-card)] border border-[var(--erp-border)]">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--erp-accent-dim)', color: 'var(--erp-accent)' }}>
                  <FAIcon name={f.icon} className="text-[14px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--erp-text)] truncate">{f.label}</div>
                  <div className="text-[10px] text-[var(--erp-text-muted)] truncate">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: login form */}
        <div className="bg-[var(--erp-bg-card)] border border-[var(--erp-border)] rounded-2xl p-6 md:p-8 shadow-xl">
          {/* Mobile branding */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: 'linear-gradient(135deg, var(--erp-accent), #009975)', fontFamily: 'var(--font-display)' }}>
              F
            </div>
            <div>
              <div className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Roza <span className="text-[var(--erp-accent)]">FM Suite</span>
              </div>
              <div className="text-[10px] text-[var(--erp-text-muted)]">Facility Management Suite</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-[22px] font-semibold text-[var(--erp-text)]" style={{ fontFamily: 'var(--font-display)' }}>
              Sign in
            </h2>
            <p className="text-[12px] text-[var(--erp-text-muted)] mt-1">
              Enter your credentials to access your ERP workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-[rgba(239,68,68,0.1)] border border-[var(--erp-danger)]/30 text-[12px] text-[var(--erp-danger)]">
                {error}
              </div>
            )}

            <div>
              <Label className="text-[12px] font-medium text-[var(--erp-text-secondary)] mb-1.5 block">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--erp-text-muted)]" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 pl-10 bg-[var(--erp-bg-input)]"
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[12px] font-medium text-[var(--erp-text-secondary)]">Password</Label>
                <button type="button" className="text-[10px] text-[var(--erp-accent)] hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--erp-text-muted)]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pl-10 pr-10 bg-[var(--erp-bg-input)]"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--erp-text-muted)] hover:text-[var(--erp-text)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[var(--erp-accent)] hover:bg-[var(--erp-accent-hover)] text-[13px] font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-[var(--erp-border)]">
            <div className="flex items-center gap-2 mb-3 text-[11px] text-[var(--erp-text-muted)]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quick login — demo accounts</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => quickLogin(acc)}
                  disabled={loading}
                  className="flex items-center gap-2 p-2 rounded-md border border-[var(--erp-border)] bg-[var(--erp-bg-input)] hover:border-[var(--erp-accent-border)] hover:bg-[var(--erp-accent-dim)] transition-all text-left disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold text-white shrink-0" style={{ background: roleColor(acc.role) }}>
                    {acc.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-[var(--erp-text)] truncate">{acc.name}</div>
                    <div className="text-[9px] text-[var(--erp-text-muted)] truncate">{acc.role} · @{acc.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-[10px] text-[var(--erp-text-muted)]">
            <span>Roza FM Suite v1.0.0 · Schema v2</span>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hover:text-[var(--erp-text)]"
            >
              {theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function roleColor(role: string): string {
  switch (role) {
    case 'Super Admin': return '#DC2626';
    case 'Manager': return '#2563EB';
    case 'Technician': return '#EA580C';
    case 'HR': return '#DB2777';
    case 'Accountant': return '#059669';
    default: return '#64748B';
  }
}
