import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Defined OUTSIDE AuthPage — stable reference prevents focus loss on re-render
function AuthInput({ label, id, type = 'text', value, onChange, placeholder, showToggle, onTogglePassword, showPass }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-violet-700 uppercase tracking-widest">
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
          className="w-full bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-900
                     placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50
                     focus:border-violet-400 transition-all duration-200"
        />
        {showToggle && (
          <button type="button" tabIndex={-1} onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition-colors">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthPage({ onSuccess }) {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => { setError(''); setSuccess(''); setName(''); setEmail(''); setPassword(''); };
  const switchMode = (m) => { reset(); setMode(m); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      login(data.token, data.user);
      onSuccess?.();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed.');
      login(data.token, data.user);
      onSuccess?.();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');
      setSuccess(data.message || 'If this email exists, a reset link has been sent.');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)' }}>

      {/* Decorative bg blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-violet-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-[fadeIn_0.4s_ease-out]">
        {/* Card */}
        <div className="bg-white rounded-3xl px-8 py-10 shadow-xl shadow-violet-200/60 border border-violet-100">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg shadow-violet-300/50 bg-white border border-violet-100">
                <img src="/logo.png" alt="AssetFlow Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-violet-900 font-display">
              {mode === 'login'  && 'AssetFlow – Login'}
              {mode === 'signup' && 'AssetFlow – Sign Up'}
              {mode === 'forgot' && 'Reset Password'}
            </h1>
            <p className="mt-1 text-xs text-slate-400 tracking-wide">Enterprise Asset Management Platform</p>
          </div>

          {/* Banners */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <AuthInput label="Email" id="login-email" type="email"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              <AuthInput label="Password" id="login-pass"
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                showToggle onTogglePassword={() => setShowPass(p => !p)} showPass={showPass} />

              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-xs text-violet-600 hover:text-violet-800 hover:underline underline-offset-2 transition-colors">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full mt-1 py-3 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-violet-600 to-indigo-600
                           hover:from-violet-700 hover:to-indigo-700
                           disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-violet-200 transition-all duration-200 active:scale-[0.98]">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</span>
                  : 'Sign In'}
              </button>
            </form>
          )}

          {/* FORGOT */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <AuthInput label="Email" id="forgot-email" type="email"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700
                           disabled:opacity-50 shadow-lg shadow-violet-200 transition-all active:scale-[0.98]">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending…</span>
                  : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => switchMode('login')}
                className="w-full text-xs text-slate-400 hover:text-violet-700 transition-colors">
                ← Back to login
              </button>
            </form>
          )}

          {/* DIVIDER (login only) */}
          {mode === 'login' && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-violet-100" />
                <span className="text-xs text-slate-400 font-medium tracking-widest uppercase">or</span>
                <div className="flex-1 h-px bg-violet-100" />
              </div>
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4 space-y-3">
                <p className="text-sm font-semibold text-violet-900">New here?</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Signing up creates an <span className="text-violet-700 font-semibold">Employee</span> account.
                  Admin and manager roles are assigned later by your administrator.
                </p>
                <button type="button" onClick={() => switchMode('signup')}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-violet-700 border border-violet-300
                             hover:bg-violet-100 hover:border-violet-400 transition-all duration-200 active:scale-[0.98]">
                  Create Account
                </button>
              </div>
            </>
          )}

          {/* SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <AuthInput label="Full Name" id="signup-name"
                value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
              <AuthInput label="Email" id="signup-email" type="email"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              <AuthInput label="Password" id="signup-pass"
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                showToggle onTogglePassword={() => setShowPass(p => !p)} showPass={showPass} />

              <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-2.5 text-xs text-violet-700 leading-relaxed">
                ℹ️ Sign up creates an <strong>Employee</strong> account. Admin roles are assigned later.
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white
                           bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700
                           disabled:opacity-50 shadow-lg shadow-violet-200 transition-all active:scale-[0.98]">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating…</span>
                  : 'Create Account'}
              </button>
              <button type="button" onClick={() => switchMode('login')}
                className="w-full text-xs text-slate-400 hover:text-violet-700 transition-colors">
                ← Already have an account? Sign in
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} AssetFlow — Enterprise Operations Platform
        </p>
      </div>
    </div>
  );
}
