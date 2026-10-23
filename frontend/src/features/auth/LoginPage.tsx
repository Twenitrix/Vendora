import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useToast } from '../../providers/ToastProvider';
import { apiClient, extractErrorMessage } from '../../lib/api';
import { DemoAccount } from '../../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@vendora.io');
  const [password, setPassword] = useState('Vendora@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: demoAccounts = [] } = useQuery<DemoAccount[]>({
    queryKey: ['demo-accounts'],
    queryFn: async () => (await apiClient.get('/auth/demo-accounts')).data,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password);
      notify(`Welcome back, ${u.name}`, `Signed in as ${u.roleName.replace(/_/g, ' ')}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDemo = async (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(acc.email, acc.password);
      notify(`Switched to ${u.name}`, `Role: ${u.roleName.replace(/_/g, ' ')}`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0B1220] text-white">
      {/* Left Brand Showcase Panel */}
      <div className="lg:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-[#101C2C] via-[#0B1220] to-[#0d192b] border-b lg:border-b-0 lg:border-r border-slate-800/80 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#36D6B0]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-0 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#36D6B0] text-[#0B1220] flex items-center justify-center font-black text-xl shadow-lg shadow-[#36D6B0]/25">
              V
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight">VENDORA</span>
              <span className="ml-2 text-xs font-mono uppercase px-2 py-0.5 rounded-full bg-[#36D6B0]/15 text-[#36D6B0] border border-[#36D6B0]/30">
                Enterprise v1.0
              </span>
            </div>
          </div>

          <div className="mt-12 max-w-xl">
            <p className="text-xs font-mono uppercase tracking-widest text-[#36D6B0] mb-3">
              Every vendor. Every contract. Every transaction.
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Intelligent Vendor &amp; Source-to-Pay Governance.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Centralize supplier onboarding, compliance verification, master contracts, purchase requisitions,
              3-way invoice matching, and treasury disbursements in one unified enterprise workspace.
            </p>
          </div>

          {/* Feature Pillars */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
            {[
              {
                title: '13-Entity ER Core',
                desc: 'Full relational integrity across vendors, contracts, POs, invoices & payments.',
              },
              {
                title: '6 Role Experiences',
                desc: 'Admin Control, Procurement, Manager, Finance, Employee & Vendor Portal.',
              },
              {
                title: 'Financial Precision',
                desc: 'Backend BigDecimal calculation, PO limit enforcement & audit traceability.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-[#36D6B0] mb-2" />
                <h3 className="text-xs font-bold text-white">{item.title}</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Demo Account Selector */}
        <div className="relative z-10 mt-10 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#36D6B0]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                One-Click Role Demo Accounts (Password: Vendora@2026)
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Click any role to sign in immediately</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={submitting}
                onClick={() => handleSelectDemo(acc)}
                className="text-left p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-[#36D6B0]/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#36D6B0]/15 text-[#36D6B0]">
                    {acc.role.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-white">{acc.badge}</span>
                </div>
                <p className="text-xs font-semibold text-white mt-1.5 truncate">{acc.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{acc.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:w-5/12 p-8 sm:p-12 lg:p-16 flex items-center justify-center bg-white text-[#172033] dark:bg-[#101C2C] dark:text-white">
        <div className="w-full max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#36D6B0] text-xs font-semibold mb-4 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Enterprise RBAC &amp; JWT Security
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Sign in to your workspace</h2>
          <p className="text-sm text-[#667085] dark:text-slate-400 mt-1">
            Enter your organizational or supplier portal credentials below.
          </p>

          {error && (
            <div className="mt-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-slate-300 mb-2">
                Work Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@vendora.io"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 focus:outline-none focus:border-[#36D6B0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#172033] dark:text-slate-300 mb-2">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-[#F5F7FA] dark:bg-[#0B1220] border border-[#E5EAF0] dark:border-slate-700 focus:outline-none focus:border-[#36D6B0]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#101C2C] dark:bg-[#36D6B0] text-white dark:text-[#0B1220] font-bold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Vendora
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#E5EAF0] dark:border-slate-800 flex items-center justify-between text-xs text-[#667085] dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#36D6B0]" />
              Vendora Enterprise Platform
            </span>
            <a
              href="http://localhost:8080/swagger-ui.html"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[#101C2C] dark:text-[#36D6B0] hover:underline"
            >
              OpenAPI / Swagger Docs ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
