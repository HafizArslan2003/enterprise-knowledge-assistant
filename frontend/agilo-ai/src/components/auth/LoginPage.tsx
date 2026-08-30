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
    <main className={`h-screen w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden ${isAdmin ? 'bg-black' : 'bg-[#0B1F3A]'}`}>
      <div className={`relative w-full max-w-[1400px] h-full max-h-[820px] rounded-2xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.35)] ${isAdmin ? 'border border-slate-800' : 'border border-white/10'}`}>
        <div className="relative flex h-full w-full flex-col lg:flex-row">
          
          {/* LEFT PANEL */}
          <div className={`hidden lg:flex w-[46%] h-full relative items-center justify-center overflow-hidden p-10 ${isAdmin ? 'bg-[#0a0a0a]' : ''}`}>
            {!isAdmin && (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, #0B1F3A 0%, #1D4ED8 55%, #2563EB 75%, #38BDF8 100%)',
                  }}
                />
                <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#38BDF8]/20 blur-3xl animate-pulseGlow" />
                <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[#22D3EE]/15 blur-3xl animate-pulseGlow" />
                <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:36px_36px]" />
              </>
            )}
            {isAdmin && (
              <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
            )}

            <div className="relative z-10 flex flex-col justify-between w-full h-full">
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${isAdmin ? 'bg-slate-800 text-white' : 'bg-white/15 border border-white/25 backdrop-blur-md'}`}>
                  {isAdmin ? <Shield className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">AGILO AI</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="max-w-lg"
              >
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${isAdmin ? 'bg-slate-800 text-slate-300' : 'bg-white/15 text-white border border-white/25 backdrop-blur-md'}`}>
                  {isAdmin ? 'System Administration' : 'Enterprise AI Assistant'}
                </span>
                <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {isAdmin ? 'Secure access to system controls.' : "Intelligent answers from your organization's knowledge."}
                </h2>
                <p className="text-white/70 text-sm max-w-md pt-3 leading-relaxed">
                  {isAdmin ? 'Manage users, view system metrics, and control document indices.' : 'Grounded RAG retrieval, real-time tool calling, and verified citations.'}
                </p>
              </motion.div>

              <div className="flex items-center gap-5 text-[11px] font-semibold text-white/75">
                <span className="flex items-center gap-1.5"><Shield className={`w-3.5 h-3.5 ${isAdmin ? 'text-slate-400' : 'text-[#BFE3FF]'}`} /> SOC2 Type II</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className={`w-3.5 h-3.5 ${isAdmin ? 'text-slate-400' : 'text-[#7CF5C4]'}`} /> AES-256 Encrypted</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className={`w-full lg:w-[54%] h-full flex items-center justify-center p-5 sm:p-8 lg:p-10 ${isAdmin ? 'bg-[#111]' : 'bg-[#F8FAFF]'}`}>
            <div className="w-full max-w-[420px]">
              
              {/* Type Switcher */}
              <div className="flex justify-end mb-8">
                <button
                  onClick={() => setMode(isAdmin ? 'employee_login' : 'admin_login')}
                  className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all ${
                    isAdmin 
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  {isAdmin ? 'Switch to Employee' : 'Login as Admin'}
                </button>
              </div>

              <div className="mb-8 text-center">
                <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isAdmin ? 'text-white' : 'text-[#0B1F3A]'}`}>
                  {mode === 'employee_login' ? 'Welcome Back' : mode === 'employee_register' ? 'Create Account' : 'Admin Login'}
                </h2>
                <p className={`text-xs mt-2 ${isAdmin ? 'text-slate-400' : 'text-[#64748B]'}`}>
                  {mode === 'employee_login' ? 'Sign in to your employee portal.' : mode === 'employee_register' ? 'Join your team workspace.' : 'Sign in to access the administration dashboard.'}
                </p>
              </div>

              {!isAdmin && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-white border border-[#DCE7F5] mb-6 shadow-sm">
                  <button
                    type="button"
                    onClick={() => { setMode('employee_login'); setErrorMsg(null); }}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      mode === 'employee_login' ? 'bg-[#EEF3FF] text-[#1D4ED8] border border-[#DCE7F5]' : 'text-[#64748B]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('employee_register'); setErrorMsg(null); }}
                    className={`py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      mode === 'employee_register' ? 'bg-[#EEF3FF] text-[#1D4ED8] border border-[#DCE7F5]' : 'text-[#64748B]'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}

              <AnimatePresence mode="wait">
                {(mode === 'employee_login' || mode === 'admin_login') ? (
                  <motion.form
                    key="login-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isAdmin ? 'text-slate-400' : 'text-[#0B1F3A]'}`}>
                        Username or Email
                      </label>
                      <div className="relative">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`w-full pl-10 pr-3 py-3 rounded-lg text-sm font-medium focus:outline-none transition-all ${
                            isAdmin 
                              ? 'bg-[#1A1A1A] border-slate-800 text-white border focus:border-slate-500 placeholder-slate-600' 
                              : 'bg-white border-[#CBD5E1] text-[#0F172A] border focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder-slate-400 shadow-sm'
                          }`}
                          placeholder={isAdmin ? "admin" : "you@company.com"}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isAdmin ? 'text-slate-400' : 'text-[#0B1F3A]'}`}>
                        Password
                      </label>
                      <div className="relative">
                        <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isAdmin ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full pl-10 pr-3 py-3 rounded-lg text-sm font-medium focus:outline-none transition-all ${
                            isAdmin 
                              ? 'bg-[#1A1A1A] border-slate-800 text-white border focus:border-slate-500 placeholder-slate-600' 
                              : 'bg-white border-[#CBD5E1] text-[#0F172A] border focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder-slate-400 shadow-sm'
                          }`}
                          placeholder="••••••••••••"
                          required
                        />
                      </div>
                    </div>

                    {!isAdmin && (
                      <div className="flex items-center justify-between text-[11px] font-medium pt-1">
                        <label className="flex items-center gap-1.5 text-[#0F172A] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] w-3.5 h-3.5"
                          />
                          Remember me
                        </label>
                        <a href="#forgot" className="text-[#2563EB] font-bold hover:underline">
                          Forgot password?
                        </a>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      style={!isAdmin ? { background: 'linear-gradient(to right, #1D4ED8, #2563EB)' } : undefined}
                      className={`w-full py-2.5 px-6 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60 ${
                        isAdmin 
                          ? 'bg-white text-black hover:bg-slate-200' 
                          : 'text-white shadow-lg shadow-[#2563EB]/25 hover:shadow-xl hover:shadow-[#2563EB]/35'
                      }`}
                    >
                      {isLoading ? (
                        <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isAdmin ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'}`} />
                      ) : (
                        <>
                          <span>{isAdmin ? 'Access Admin Console' : 'Sign In to Workspace'}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register-form"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    onSubmit={handleRegister}
                    className="space-y-2.5"
                  >
                    <div>
                      <label className="block text-[10px] font-bold text-[#0B1F3A] uppercase tracking-wider mb-1">
                        Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                        <input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
                          placeholder="jane.doe"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#0B1F3A] uppercase tracking-wider mb-1">
                        Work Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
                          placeholder="you@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-[#0B1F3A] uppercase tracking-wider mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                          <input
                            type="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full pl-9 pr-2 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
                            placeholder="Min 6 chars"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#0B1F3A] uppercase tracking-wider mb-1">
                          Confirm
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                          <input
                            type="password"
                            value={regConfirm}
                            onChange={(e) => setRegConfirm(e.target.value)}
                            className="w-full pl-9 pr-2 py-2 bg-white border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all"
                            placeholder="Re-enter"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      style={{ background: 'linear-gradient(to right, #1D4ED8, #2563EB)' }}
                      className="w-full py-2.5 px-6 rounded-lg text-white font-bold text-sm shadow-lg shadow-[#2563EB]/25 hover:shadow-xl hover:shadow-[#2563EB]/35 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60 !mt-4"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="text-white">Create Account</span>
                          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="text-center text-[11px] text-[#64748B] font-medium mt-4">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setErrorMsg(null); }}
                      className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrorMsg(null); }}
                      className="text-[#2563EB] font-bold hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              <div className="mt-5 pt-4 border-t border-[#DCE7F5] flex items-center justify-between">
                <div className="flex items-center -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-white flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm">
                    CTO
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 border-2 border-white flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm">
                    PM
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-white flex items-center justify-center text-[9px] font-extrabold text-white shadow-sm">
                    ENG
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-[#0B1F3A]">Built for enterprise teams</div>
                  <div className="text-[9px] text-[#64748B] font-medium">Secured & Compliant</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};