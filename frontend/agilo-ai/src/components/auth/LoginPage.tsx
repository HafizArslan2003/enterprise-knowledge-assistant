import React, { useState } from 'react';
import { Shield, Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2, Zap, Eye, EyeOff } from 'lucide-react';
import { authenticateUser, registerUser } from '../../services/api';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type Mode = 'employee_login' | 'employee_register' | 'admin_login';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<Mode>('employee_login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = mode === 'admin_login';

  const switchMode = (next: Mode) => {
    setErrorMsg(null);
    setIdentifier('');
    setPassword('');
    setMode(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const auth = await authenticateUser(identifier, password);
      localStorage.setItem('agilo-access-token', auth.accessToken);
      localStorage.setItem('agilo-token-type', auth.tokenType);
      onLoginSuccess();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Login failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (regPassword !== regConfirm) { setErrorMsg('Passwords do not match'); return; }
    if (regPassword.length < 6) { setErrorMsg('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      await registerUser(regUsername, regEmail, regPassword);
      const auth = await authenticateUser(regUsername, regPassword);
      localStorage.setItem('agilo-access-token', auth.accessToken);
      localStorage.setItem('agilo-token-type', auth.tokenType);
      onLoginSuccess();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Theme tokens ── */
  const emp = {
    page: 'bg-slate-950',
    sidebar: 'bg-gradient-to-b from-blue-950 to-slate-950 border-r border-blue-900/30',
    accent: '#3B82F6',
    accentLight: '#93C5FD',
    badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    label: 'text-blue-300/70',
    input: 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    btn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40',
    tabActive: 'bg-blue-600 text-white shadow',
    tabInactive: 'text-slate-400 hover:text-white',
    switchBtn: 'text-blue-400 hover:text-blue-300',
    features: [
      { icon: <Sparkles className="w-4 h-4 text-blue-400" />, text: 'AI-Powered Knowledge Search' },
      { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, text: 'Role-Based Document Access' },
      { icon: <Zap className="w-4 h-4 text-amber-400" />, text: 'Instant RAG Answers' },
    ],
    heading: 'Enterprise\nKnowledge Assistant',
    sub: 'Access your company knowledge base instantly. Search documents, get AI-powered answers.',
  };

  const adm = {
    page: 'bg-slate-950',
    sidebar: 'bg-gradient-to-b from-indigo-950 to-slate-950 border-r border-indigo-900/30',
    accent: '#6366F1',
    accentLight: '#A5B4FC',
    badge: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    label: 'text-indigo-300/70',
    input: 'bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
    btn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/40',
    tabActive: '',
    tabInactive: '',
    switchBtn: 'text-indigo-400 hover:text-indigo-300',
    features: [
      { icon: <Shield className="w-4 h-4 text-indigo-400" />, text: 'Full System Administration' },
      { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, text: 'User & Document Management' },
      { icon: <Zap className="w-4 h-4 text-amber-400" />, text: 'Analytics & Audit Logs' },
    ],
    heading: 'Admin\nControl Panel',
    sub: 'Manage users, documents, system settings and monitor the RAG pipeline.',
  };

  const t = isAdmin ? adm : emp;

  return (
    <main className={`min-h-screen w-full flex items-stretch ${t.page}`}>

      {/* ── Left Sidebar: Branding ── */}
      <aside className={`hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-12 ${t.sidebar}`}>
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <img src="/logo.png" alt="Agilo AI" className="w-8 h-8 object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none">AGILO AI</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {isAdmin ? 'Admin Console' : 'Enterprise Assistant'}
              </span>
            </div>
          </div>

          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 ${t.badge}`}>
            {isAdmin ? 'System Administration' : 'Enterprise Intelligence'}
          </span>

          <h1 className="text-4xl font-black text-white leading-[1.1] tracking-tight mb-5 whitespace-pre-line">
            {t.heading}
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            {t.sub}
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4">
          {t.features.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                {f.icon}
              </div>
              <span className="text-sm font-medium text-slate-300">{f.text}</span>
            </div>
          ))}
          <p className="text-xs text-slate-600 pt-4">
            © {new Date().getFullYear()} Agilo AI · All rights reserved
          </p>
        </div>
      </aside>

      {/* ── Right Panel: Form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">

          {/* Switch Admin/Employee */}
          <div className="flex justify-end mb-8">
            <button
              type="button"
              onClick={() => switchMode(isAdmin ? 'employee_login' : 'admin_login')}
              className={`text-xs font-semibold transition-colors ${t.switchBtn}`}
            >
              {isAdmin ? '← Switch to Employee Login' : 'Admin Login →'}
            </button>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight mb-1">
              {mode === 'employee_login' ? 'Welcome back' : mode === 'employee_register' ? 'Create account' : 'Admin access'}
            </h2>
            <p className="text-sm text-slate-400">
              {mode === 'employee_login'
                ? 'Sign in with your username or email.'
                : mode === 'employee_register'
                ? 'Register a new employee account.'
                : 'Enter admin credentials to continue.'}
            </p>
          </div>

          {/* Employee tab toggle */}
          {!isAdmin && (
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 mb-7 gap-1">
              <button
                type="button"
                onClick={() => switchMode('employee_login')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'employee_login' ? t.tabActive : t.tabInactive}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('employee_register')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'employee_register' ? t.tabActive : t.tabInactive}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* ── Login Form ── */}
          {(mode === 'employee_login' || mode === 'admin_login') && (
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Identifier */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${t.label}`}>
                  {isAdmin ? 'Username' : 'Username or Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-colors focus:outline-none ${t.input}`}
                    placeholder={isAdmin ? 'admin' : 'username or email@company.com'}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${t.label}`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm transition-colors focus:outline-none ${t.input}`}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 mt-1 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${t.btn}`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isAdmin ? 'Access System' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Register Form ── */}
          {mode === 'employee_register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className={`w-full pl-9 pr-3 py-3 rounded-xl text-sm transition-colors focus:outline-none ${t.input}`}
                      placeholder="johndoe"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className={`w-full pl-9 pr-3 py-3 rounded-xl text-sm transition-colors focus:outline-none ${t.input}`}
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className={`w-full pl-9 pr-10 py-3 rounded-xl text-sm transition-colors focus:outline-none ${t.input}`}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowRegPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    className={`w-full pl-9 pr-3 py-3 rounded-xl text-sm transition-colors focus:outline-none ${t.input}`}
                    placeholder="••••••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 mt-1 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${t.btn}`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
};