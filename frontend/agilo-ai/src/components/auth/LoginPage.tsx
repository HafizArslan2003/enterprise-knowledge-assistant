import React, { useState } from 'react';
import { Shield, Sparkles, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { authenticateUser } from '../../services/api';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('c-level.exec@enterprise.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const auth = await authenticateUser(email, password);
      localStorage.setItem('agilo-access-token', auth.accessToken);
      localStorage.setItem('agilo-token-type', auth.tokenType);
      onLoginSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full overflow-hidden bg-[#F4F8FF] selection:bg-[#38BDF8]/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.16),_transparent_45%)]" />
      <div className="relative flex min-h-screen w-full flex-col lg:flex-row">
        <div className="w-full lg:w-[55%] min-h-[50vh] lg:min-h-screen relative flex items-center justify-center overflow-hidden p-6 lg:p-12">
          <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-[#38BDF8]/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-[#2563EB]/20 blur-3xl" />

          <div className="absolute inset-0 flex flex-col justify-between p-8 lg:p-16 pointer-events-none z-10">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center shadow-lg shadow-[#2563EB]/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-[#0B1F3A]">AGILO AI</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.15 }} className="max-w-xl">
              <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-[#0B1F3A]/20 select-none leading-none mb-3">AGILO AI</h1>
              <div className="space-y-3">
                <span className="inline-block px-3.5 py-1 rounded-full bg-[#2563EB]/15 text-[#1D4ED8] text-xs font-bold uppercase tracking-wider border border-[#2563EB]/30">
                  ENTERPRISE AI ASSISTANT
                </span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#0B1F3A] tracking-tight leading-tight">
                  Intelligent answers from your organization's knowledge.
                </h2>
                <p className="text-[#64748B] text-sm lg:text-base max-w-md pt-1 leading-relaxed">
                  Grounded RAG retrieval, real-time tool calling, and verified citations tailored for modern enterprise teams.
                </p>
              </div>
            </motion.div>

            <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#64748B]">
              <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-[#2563EB]" /> SOC2 Type II Certified</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#22A06B]" /> 256-bit AES Encryption</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.2 }} className="relative z-20 flex w-full max-w-[560px] flex-col items-start gap-4">
            <motion.div animate={{ y: [0, -10, 0], x: [0, 8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="rounded-3xl border border-white/60 bg-white/70 px-5 py-4 shadow-[0_20px_60px_rgba(37,99,235,0.14)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563EB]">Fast answers</p>
              <p className="mt-1 text-sm font-medium text-[#0B1F3A]">Search policy, docs, and product knowledge in seconds.</p>
            </motion.div>
            <motion.div animate={{ y: [0, 10, 0], x: [0, -6, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} className="ml-10 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white px-5 py-4 shadow-[0_20px_60px_rgba(14,116,144,0.12)] backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E]">Live RAG</p>
              <p className="mt-1 text-sm font-medium text-[#0B1F3A]">Grounded responses with verified enterprise context.</p>
            </motion.div>
          </motion.div>
        </div>

        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 z-30">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="w-full max-w-md border border-slate-200/80 rounded-[28px] bg-white/90 p-8 lg:p-10 shadow-[0_30px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            {/* Header */}
            <div className="text-center lg:text-left mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F4F8FF] border border-[#DCE7F5] mb-4 shadow-sm">
              <Sparkles className="w-6 h-6 text-[#2563EB]" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-[#0B1F3A] tracking-tight">Welcome Back</h2>
            <p className="text-[#64748B] text-sm mt-1">
              Sign in to access your enterprise AI assistant.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-2">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition-all shadow-sm"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB] transition-all shadow-sm"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <label className="flex items-center gap-2 text-[#0F172A] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] w-4 h-4"
                />
                Remember me for 30 days
              </label>
              <a href="#forgot" className="text-[#2563EB] font-bold hover:underline">
                Forgot password?
              </a>
            </div>

            {/* VIBRANT SIGN IN BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              style={{ background: 'linear-gradient(to right, #1D4ED8, #2563EB)' }}
              className="w-full py-3.5 px-6 rounded-xl text-white font-bold text-sm shadow-xl shadow-[#2563EB]/30 hover:shadow-2xl hover:shadow-[#2563EB]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-white">Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#DCE7F5]" />
            </div>
            <span className="relative px-3 bg-white text-[11px] font-bold uppercase text-[#64748B] tracking-wider">
              Or continue with
            </span>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onLoginSuccess}
              className="py-2.5 px-4 bg-white border border-[#CBD5E1] hover:border-[#2563EB] rounded-xl text-xs font-bold text-[#0F172A] hover:bg-[#F4F8FF] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={onLoginSuccess}
              className="py-2.5 px-4 bg-white border border-[#CBD5E1] hover:border-[#2563EB] rounded-xl text-xs font-bold text-[#0F172A] hover:bg-[#F4F8FF] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Microsoft
            </button>
          </div>

          {/* Footer prompt */}
          <p className="text-center text-xs text-[#64748B] font-medium mt-6">
            Don't have an account?{' '}
            <a href="#signup" className="text-[#2563EB] font-bold hover:underline">
              Sign up
            </a>
          </p>

          {/* Trust Section */}
          <div className="mt-8 pt-6 border-t border-[#DCE7F5] flex items-center justify-between">
            <div className="flex items-center -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-white flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm">
                CTO
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm">
                PM
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-white flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm">
                ENG
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[#0B1F3A]">Built for modern enterprise teams</div>
              <div className="text-[10px] text-[#64748B] font-medium">Secured & Compliant</div>
            </div>
          </div>
        </motion.div>
      </div>
      </div>
    </main>
  );
};
