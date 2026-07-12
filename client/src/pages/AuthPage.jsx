import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ onSuccess }) {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'

  // Form state
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // UI state
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const reset = () => {
    setError('');
    setSuccess('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const switchMode = (m) => { reset(); setMode(m); };

  // ── API calls ──────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      login(data.token, data.user);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed.');
      login(data.token, data.user);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared Input ───────────────────────────────────────────────────────────
  const Input = ({ label, id, type = 'text', value, onChange, placeholder, right }) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/50
                     transition-all duration-200"
        />
        {right && (
          <button type="button" tabIndex={-1} onClick={right.onClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {right.icon}
          </button>
        )}
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, #0b0f19 60%)' }}
    >
      {/* Animated bg blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative w-full max-w-md animate-[fadeIn_0.4s_ease-out]">
        {/* ── Card ── */}
        <div className="glass-card rounded-3xl px-8 py-10 shadow-2xl" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.5)' }}>

          {/* ── Logo + Header ── */}
          <div className="flex flex-col items-center mb-8">
            {/* Circular AF logo */}
            <div className="relative mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="text-white text-xl font-bold font-display tracking-tight">AF</span>
              </div>
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md -z-10 scale-125" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white font-display">
              {mode === 'login'  && 'AssetFlow – Login'}
              {mode === 'signup' && 'AssetFlow – Sign Up'}
              {mode === 'forgot' && 'AssetFlow – Reset Password'}
            </h1>
            <p className="mt-1 text-xs text-slate-500 tracking-wide">
              Enterprise Asset Management Platform
            </p>
          </div>

          {/* ── Error / Success Banner ── */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-400">
              <span>✓ {success}</span>
            </div>
          )}

          {/* ══════════════ LOGIN FORM ══════════════ */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input label="Email" id="login-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              <Input label="Password" id="login-pass"
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                right={{ icon: showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />, onClick: () => setShowPass(p => !p) }}
              />

              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors hover:underline underline-offset-2">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full mt-2 py-3 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98]">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</span> : 'Sign In'}
              </button>
            </form>
          )}

          {/* ══════════════ FORGOT FORM ══════════════ */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <Input label="Email" id="forgot-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500
                           disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98]">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending…</span> : 'Send Reset Link'}
              </button>

              <button type="button" onClick={() => switchMode('login')}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1">
                ← Back to login
              </button>
            </form>
          )}

          {/* ══════════════ DIVIDER (only on login) ══════════════ */}
          {mode === 'login' && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-xs text-slate-600 font-medium tracking-widest uppercase">or</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {/* ── New Here? section ── */}
              <div className="rounded-2xl border border-white/[0.07] bg-slate-900/40 px-5 py-4 space-y-3">
                <p className="text-sm font-semibold text-slate-300">New here?</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Signing up creates an <span className="text-slate-400 font-medium">Employee</span> account.
                  Admin and manager roles are assigned later by your administrator.
                </p>
                <button type="button" onClick={() => switchMode('signup')}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-indigo-300 border border-indigo-500/30
                             hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-indigo-200
                             transition-all duration-200 active:scale-[0.98]">
                  Create Account
                </button>
              </div>
            </>
          )}

          {/* ══════════════ SIGNUP FORM ══════════════ */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <Input label="Full Name" id="signup-name" value={name}
                onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
              <Input label="Email" id="signup-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              <Input label="Password" id="signup-pass"
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                right={{ icon: showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />, onClick: () => setShowPass(p => !p) }}
              />

              {/* Role note */}
              <div className="rounded-xl bg-indigo-500/8 border border-indigo-500/20 px-4 py-2.5 text-xs text-indigo-300/80 leading-relaxed">
                ℹ️ Sign up creates an <strong>Employee</strong> account. Admin roles are assigned later by your administrator.
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-indigo-600 to-violet-600
                           hover:from-indigo-500 hover:to-violet-500
                           disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98]">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating…</span> : 'Create Account'}
              </button>

              <button type="button" onClick={() => switchMode('login')}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Already have an account? Sign in
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-700">
          © {new Date().getFullYear()} AssetFlow — Enterprise Operations Platform
        </p>
      </div>
    </div>
  );
}
