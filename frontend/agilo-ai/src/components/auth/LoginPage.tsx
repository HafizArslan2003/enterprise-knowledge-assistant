import React, { useState } from 'react';
import { Shield, Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authenticateUser, registerUser } from '../../services/api';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type Mode = 'employee_login' | 'employee_register' | 'admin_login';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<Mode>('employee_login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const auth = await authenticateUser(email, password);
      localStorage.setItem('agilo-access-token', auth.accessToken);
      localStorage.setItem('agilo-token-type', auth.tokenType);
      onLoginSuccess();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Login failed');
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

  const isAdmin = mode === 'admin_login';

  // ─── EMPLOYEE THEME (matches dashboard: #0B1F3A navy + #2563EB blue) ───────
  const employeeTheme = {
    bg: 'bg-[#060f1e]',
    leftPanel: 'bg-gradient-to-br from-[#0B1F3A] via-[#0d2548] to-[#091830]',
    rightPanel: 'bg-[#071427]',
    card: 'bg-[#0B1F3A]/80 border-[#1E3A5F]/60 shadow-[0_32px_80px_rgba(0,0,0,0.6)]',
    label: 'text-[#38BDF8]/80',
    input: 'bg-[#0f2744] border border-[#1E3A5F] text-white focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/20 placeholder-[#2563EB]/20',
    icon: 'text-[#38BDF8]/40 group-focus-within:text-[#38BDF8]',
    badge: 'bg-[#2563EB]/10 text-[#38BDF8] border-[#2563EB]/20',
    tagline: 'text-[#38BDF8]',
    body: 'text-[#7DB9E8]/70',
    btn: 'bg-gradient-to-r from-[#2563EB] to-[#38BDF8] text-white shadow-lg shadow-[#2563EB]/30 hover:shadow-[#2563EB]/50 hover:scale-[1.02]',
    switchBtn: 'bg-[#0f2744] text-[#38BDF8] border border-[#1E3A5F] hover:bg-[#1E3A5F]',
    tabActive: 'bg-gradient-to-r from-[#2563EB] to-[#38BDF8] text-white shadow-md',
    tabInactive: 'text-[#38BDF8]/50 hover:text-[#38BDF8]',
    tabBar: 'bg-[#0f2744] border border-[#1E3A5F]',
    spinner: 'border-white/30 border-t-white',
    orb1: 'bg-[#2563EB]/25',
    orb2: 'bg-[#38BDF8]/15',
    orb3: 'bg-[#0B1F3A]/40',
    features: [
      { icon: <Sparkles className="w-4 h-4 text-[#38BDF8]" />, text: 'AI-Powered Search' },
      { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, text: 'End-to-End Encrypted' },
      { icon: <Zap className="w-4 h-4 text-amber-400" />, text: 'Instant Answers' },
    ],
  };

  // ─── ADMIN THEME (deep navy premium + gold/cobalt accents) ─────────────────
  const adminTheme = {
    bg: 'bg-[#040d18]',
    leftPanel: 'bg-gradient-to-br from-[#040d18] via-[#071a30] to-[#040d18]',
    rightPanel: 'bg-[#02080f]',
    card: 'bg-[#071220]/90 border-[#1a3354]/70 shadow-[0_32px_80px_rgba(0,0,0,0.8)]',
    label: 'text-[#4A9EDB]/80',
    input: 'bg-[#071a2e] border border-[#1a3354] text-white focus:border-[#1D4ED8] focus:ring-4 focus:ring-[#1D4ED8]/20 placeholder-[#1D4ED8]/15',
    icon: 'text-[#4A9EDB]/30 group-focus-within:text-[#4A9EDB]',
    badge: 'bg-[#1D4ED8]/10 text-[#4A9EDB] border-[#1D4ED8]/20',
    tagline: 'text-[#4A9EDB]',
    body: 'text-[#4A9EDB]/50',
    btn: 'bg-gradient-to-r from-[#1D4ED8] to-[#1E40AF] text-white shadow-lg shadow-[#1D4ED8]/30 hover:shadow-[#1D4ED8]/50 hover:scale-[1.02] border border-[#3B82F6]/20',
    switchBtn: 'bg-[#071a2e] text-[#4A9EDB] border border-[#1a3354] hover:bg-[#0d2644]',
    tabActive: '',
    tabInactive: '',
    tabBar: '',
    spinner: 'border-white/20 border-t-[#4A9EDB]',
    orb1: 'bg-[#1D4ED8]/20',
    orb2: 'bg-[#3B82F6]/10',
    orb3: 'bg-[#1E40AF]/15',
    features: [
      { icon: <Shield className="w-4 h-4 text-[#4A9EDB]" />, text: 'Full System Access' },
      { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, text: 'Enterprise Grade Security' },
      { icon: <Zap className="w-4 h-4 text-[#4A9EDB]" />, text: 'Real-time Analytics' },
    ],
  };

  const t = isAdmin ? adminTheme : employeeTheme;

  return (
    <main className={`relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden transition-colors duration-700 ${t.bg}`}>

      {/* ── Animated Background Orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid overlay */}
        {isAdmin && (
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(74,158,219,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(74,158,219,0.8)_1px,transparent_1px)] [background-size:48px_48px]" />
        )}
        <motion.div
          animate={{ x: [0, 80, -80, 0], y: [0, -80, 80, 0], scale: [1, 1.15, 0.9, 1] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-1/4 left-1/4 w-[28rem] h-[28rem] ${t.orb1} rounded-full blur-[130px]`}
        />
        <motion.div
          animate={{ x: [0, -120, 120, 0], y: [0, 120, -120, 0], scale: [1, 0.85, 1.2, 1] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute bottom-1/4 right-1/4 w-[34rem] h-[34rem] ${t.orb2} rounded-full blur-[140px]`}
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[44rem] h-[44rem] ${t.orb3} rounded-full blur-[120px]`}
        />
        {isAdmin && (
          <motion.div
            animate={{ top: ['-5%', '105%'] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#1D4ED8]/30 to-transparent shadow-[0_0_12px_rgba(29,78,216,0.4)]"
          />
        )}
      </div>

      {/* ── Main Card ── */}
      <motion.div
        layout
        className={`relative z-10 w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl border ${t.card}`}
      >
        {/* ── Left Panel: Branding ── */}
        <div className={`hidden lg:flex w-[42%] flex-col justify-between p-12 relative overflow-hidden ${t.leftPanel}`}>
          {/* subtle top-right glow */}
          <div className={`absolute -top-20 -right-20 w-64 h-64 ${t.orb1} rounded-full blur-[80px] opacity-60`} />
          <div className={`absolute -bottom-20 -left-20 w-48 h-48 ${t.orb2} rounded-full blur-[80px] opacity-40`} />

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-14"
            >
              <div className={`w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-white/10`}>
                <img src="/logo.png" alt="Agilo AI" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white block leading-none">AGILO AI</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${t.tagline}`}>
                  {isAdmin ? 'Admin Console' : 'Enterprise Assistant'}
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] mb-5 border ${t.badge}`}>
                {isAdmin ? 'System Administration' : 'Enterprise Intelligence'}
              </span>
              <h1 className="text-4xl xl:text-[2.6rem] font-black text-white leading-[1.1] tracking-tight mb-5">
                {isAdmin ? 'Secure System\nAccess Portal' : 'Your Knowledge,\nAmplified'}
              </h1>
              <p className={`text-base leading-relaxed ${t.body}`}>
                {isAdmin
                  ? 'Advanced management interface for RAG infrastructure, access control, and vector database analytics.'
                  : 'Instantly retrieve, analyze, and synthesize insights from your entire corporate knowledge base.'}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 flex flex-col gap-3"
          >
            {t.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm font-semibold text-white/50">
                {f.icon}
                <span>{f.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right Panel: Form ── */}
        <div className={`w-full lg:w-[58%] p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative ${t.rightPanel}`}>
          {/* top-right corner glow */}
          <div className={`absolute top-0 right-0 w-48 h-48 ${t.orb1} rounded-full blur-[90px] opacity-30 pointer-events-none`} />

          <div className="w-full max-w-md mx-auto relative z-10">

            {/* Switch button */}
            <div className="flex justify-end mb-10">
              <button
                onClick={() => { setMode(isAdmin ? 'employee_login' : 'admin_login'); setErrorMsg(null); setEmail(''); setPassword(''); }}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${t.switchBtn}`}
              >
                {isAdmin ? '← Employee Login' : 'Admin Login →'}
              </button>
            </div>

            {/* Heading */}
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                {mode === 'employee_login' ? 'Welcome Back' : mode === 'employee_register' ? 'Join Workspace' : 'Admin Portal'}
              </h2>
              <p className={`text-sm ${t.body}`}>
                {mode === 'employee_login'
                  ? 'Sign in to access your AI assistant.'
                  : mode === 'employee_register'
                  ? 'Create your employee account.'
                  : 'Authenticate to manage the system.'}
              </p>
            </div>

            {/* Sign In / Sign Up toggle (employees only) */}
            {!isAdmin && (
              <div className={`flex p-1 rounded-xl ${t.tabBar} mb-7`}>
                <button
                  type="button"
                  onClick={() => { setMode('employee_login'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${mode === 'employee_login' ? t.tabActive : t.tabInactive}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('employee_register'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${mode === 'employee_register' ? t.tabActive : t.tabInactive}`}
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Error */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Forms ── */}
            <AnimatePresence mode="wait">
              {(mode === 'employee_login' || mode === 'admin_login') ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  {/* Username / Email */}
                  <div className="space-y-1.5">
                    <label className={`text-[11px] font-bold uppercase tracking-wider ${t.label}`}>
                      Username or Email
                    </label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${t.icon}`} />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none backdrop-blur-sm ${t.input}`}
                        placeholder={isAdmin ? 'admin' : 'you@company.com'}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className={`text-[11px] font-bold uppercase tracking-wider ${t.label}`}>
                      Password
                    </label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors ${t.icon}`} />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none backdrop-blur-sm ${t.input}`}
                        placeholder="••••••••••••"
                        required
                      />
                    </div>
                  </div>

                  {!isAdmin && (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <label className="flex items-center gap-2 text-white/60 cursor-pointer hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-white/20 bg-white/10 text-[#2563EB] focus:ring-[#2563EB]/30 w-4 h-4"
                        />
                        Remember me
                      </label>
                      <a href="#forgot" className={`font-semibold transition-colors ${isAdmin ? 'text-[#4A9EDB] hover:text-[#7EC8E3]' : 'text-[#38BDF8] hover:text-[#7EC8E3]'}`}>
                        Forgot password?
                      </a>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 mt-2 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-60 disabled:hover:scale-100 ${t.btn}`}
                  >
                    {isLoading ? (
                      <div className={`w-5 h-5 border-2 rounded-full animate-spin ${t.spinner}`} />
                    ) : (
                      <>
                        <span>{isAdmin ? 'Access System' : 'Sign In'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                /* ── Register Form ── */
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Username</label>
                      <div className="relative group">
                        <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${t.icon}`} />
                        <input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className={`w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all focus:outline-none ${t.input}`}
                          placeholder="johndoe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Email</label>
                      <div className="relative group">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${t.icon}`} />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className={`w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all focus:outline-none ${t.input}`}
                          placeholder="you@company.com"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Password</label>
                    <div className="relative group">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${t.icon}`} />
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className={`w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all focus:outline-none ${t.input}`}
                        placeholder="••••••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Confirm Password</label>
                    <div className="relative group">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${t.icon}`} />
                      <input
                        type="password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        className={`w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all focus:outline-none ${t.input}`}
                        placeholder="••••••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 mt-1 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:hover:scale-100 ${t.btn}`}
                  >
                    {isLoading ? (
                      <div className={`w-5 h-5 border-2 rounded-full animate-spin ${t.spinner}`} />
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </main>
  );
};