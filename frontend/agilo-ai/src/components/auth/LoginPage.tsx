import React, { useState } from 'react';
import { Shield, Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
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

    if (regPassword !== regConfirm) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

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

  return (
    <main className={`relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden transition-colors duration-1000 ${isAdmin ? 'bg-[#050505]' : 'bg-[#0f172a]'}`}>
      
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isAdmin ? (
          <>
            {/* Admin Background: Cyber/Matrix vibe */}
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />
            <motion.div 
              animate={{ 
                backgroundPosition: ['0% 0%', '100% 100%'],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_50%)]"
            />
            {/* Moving scanline */}
            <motion.div
              animate={{ top: ['-10%', '110%'] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            />
          </>
        ) : (
          <>
            {/* Employee Background: Soft, vibrant glowing orbs */}
            <div className="absolute inset-0 bg-[#0f172a]" />
            <motion.div
              animate={{ 
                x: [0, 100, -100, 0],
                y: [0, -100, 100, 0],
                scale: [1, 1.2, 0.8, 1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]"
            />
            <motion.div
              animate={{ 
                x: [0, -150, 150, 0],
                y: [0, 150, -150, 0],
                scale: [1, 0.8, 1.2, 1]
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/20 rounded-full blur-[120px]"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-sky-400/10 rounded-full blur-[100px]"
            />
          </>
        )}
      </div>

      {/* Main Container - Glassmorphism */}
      <motion.div 
        layout
        className={`relative z-10 w-full max-w-6xl flex flex-col lg:flex-row rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl border ${
          isAdmin 
            ? 'bg-black/40 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]' 
            : 'bg-white/10 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.37)]'
        }`}
      >
        {/* Left Side: Branding & Info */}
        <div className={`hidden lg:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden ${isAdmin ? 'bg-black/60' : 'bg-gradient-to-br from-blue-900/40 to-indigo-900/40'}`}>
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-16"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-xl border ${isAdmin ? 'bg-white/5 border-white/10' : 'bg-white/20 border-white/30'} shadow-xl`}>
                {isAdmin ? <Shield className="w-6 h-6 text-white" /> : <Sparkles className="w-6 h-6 text-white" />}
              </div>
              <span className="text-2xl font-black tracking-tight text-white">AGILO AI</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-6 backdrop-blur-md border ${isAdmin ? 'bg-white/5 text-slate-300 border-white/10' : 'bg-white/20 text-white border-white/30'}`}>
                {isAdmin ? 'System Administration' : 'Enterprise Intelligence'}
              </span>
              <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight mb-6">
                {isAdmin ? 'Secure Access to Core Systems' : 'Your Knowledge, Amplified'}
              </h1>
              <p className={`text-lg leading-relaxed ${isAdmin ? 'text-slate-400' : 'text-blue-100/80'}`}>
                {isAdmin 
                  ? 'Advanced management interface for RAG infrastructure, user access control, and vector database analytics.' 
                  : 'Instantly retrieve, analyze, and synthesize insights from your entire corporate knowledge base.'}
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative z-10 flex items-center gap-6 text-sm font-semibold text-white/60"
          >
            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /> Enterprise Grade</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-400" /> End-to-End Encrypted</span>
          </motion.div>
        </div>

        {/* Right Side: Login Form */}
        <div className={`w-full lg:w-[55%] p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative ${isAdmin ? 'bg-[#0a0a0a]' : 'bg-white/5'}`}>
          <div className="w-full max-w-md mx-auto">
            
            {/* Mode Switcher */}
            <div className="flex justify-end mb-12">
              <button
                onClick={() => setMode(isAdmin ? 'employee_login' : 'admin_login')}
                className={`group relative overflow-hidden px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  isAdmin 
                    ? 'text-white border border-white/20 hover:bg-white/10' 
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}
              >
                <span className="relative z-10">{isAdmin ? 'Switch to Employee' : 'Admin Login'}</span>
              </button>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
                {mode === 'employee_login' ? 'Welcome Back' : mode === 'employee_register' ? 'Join Workspace' : 'Admin Portal'}
              </h2>
              <p className={`text-sm ${isAdmin ? 'text-slate-400' : 'text-blue-200/60'}`}>
                {mode === 'employee_login' ? 'Sign in to access your AI assistant.' : mode === 'employee_register' ? 'Create your employee account.' : 'Authenticate to manage the system.'}
              </p>
            </div>

            {!isAdmin && (
              <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => { setMode('employee_login'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    mode === 'employee_login' ? 'bg-white text-blue-900 shadow-lg' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('employee_register'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    mode === 'employee_register' ? 'bg-white text-blue-900 shadow-lg' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 flex items-center gap-3 backdrop-blur-sm"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {(mode === 'employee_login' || mode === 'admin_login') ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider ${isAdmin ? 'text-slate-400' : 'text-blue-200/80'}`}>Username or Email</label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isAdmin ? 'text-slate-500 group-focus-within:text-white' : 'text-blue-300/50 group-focus-within:text-white'}`} />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl text-base font-medium transition-all duration-300 focus:outline-none backdrop-blur-md ${
                          isAdmin 
                            ? 'bg-white/5 border border-white/10 text-white focus:border-white/30 focus:bg-white/10 placeholder-slate-600' 
                            : 'bg-white/10 border border-white/20 text-white focus:border-blue-400 focus:bg-white/20 focus:ring-4 focus:ring-blue-400/20 placeholder-blue-200/30'
                        }`}
                        placeholder={isAdmin ? "admin" : "you@company.com"}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider ${isAdmin ? 'text-slate-400' : 'text-blue-200/80'}`}>Password</label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isAdmin ? 'text-slate-500 group-focus-within:text-white' : 'text-blue-300/50 group-focus-within:text-white'}`} />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl text-base font-medium transition-all duration-300 focus:outline-none backdrop-blur-md ${
                          isAdmin 
                            ? 'bg-white/5 border border-white/10 text-white focus:border-white/30 focus:bg-white/10 placeholder-slate-600' 
                            : 'bg-white/10 border border-white/20 text-white focus:border-blue-400 focus:bg-white/20 focus:ring-4 focus:ring-blue-400/20 placeholder-blue-200/30'
                        }`}
                        placeholder="••••••••••••"
                        required
                      />
                    </div>
                  </div>

                  {!isAdmin && (
                    <div className="flex items-center justify-between text-sm pt-2">
                      <label className="flex items-center gap-2 text-white/80 cursor-pointer hover:text-white transition-colors">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/30 w-4 h-4 transition-all"
                        />
                        Remember me
                      </label>
                      <a href="#forgot" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                        Forgot password?
                      </a>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-4 mt-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer group ${
                      isAdmin 
                        ? 'bg-white text-black hover:bg-slate-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:bg-white/50' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100'
                    }`}
                  >
                    {isLoading ? (
                      <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isAdmin ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} />
                    ) : (
                      <>
                        <span>{isAdmin ? 'Access System' : 'Sign In'}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">Username</label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50 group-focus-within:text-white transition-colors" />
                        <input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400 focus:bg-white/20 placeholder-blue-200/30"
                          placeholder="johndoe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50 group-focus-within:text-white transition-colors" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400 focus:bg-white/20 placeholder-blue-200/30"
                          placeholder="you@company.com"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50 group-focus-within:text-white transition-colors" />
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400 focus:bg-white/20 placeholder-blue-200/30"
                        placeholder="••••••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-blue-200/80">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/50 group-focus-within:text-white transition-colors" />
                      <input
                        type="password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 rounded-lg text-sm font-medium transition-all bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400 focus:bg-white/20 placeholder-blue-200/30"
                        placeholder="••••••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 mt-2 rounded-lg font-bold text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:hover:translate-y-0"
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
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </main>
  );
};