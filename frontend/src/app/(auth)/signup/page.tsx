'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Send, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AuthAPI } from '@/lib/api';

export default function SignupPage() {
  const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '', message: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  function setField(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(201,162,39,0.2)',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.border = '1px solid rgba(201,162,39,0.7)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,162,39,0.12)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.border = '1px solid rgba(201,162,39,0.2)';
    e.currentTarget.style.boxShadow = 'none';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.company_name.trim()) { setError('Company name is required.'); return; }
    if (form.password.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await AuthAPI.signupRequest(form);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Request failed. Please try again.';
      setError(msg);
    } finally { setLoading(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-8 w-full"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(201,162,39,0.25)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,162,39,0.1) inset',
      }}
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: '#10B981' }} />
            <h2 className="text-white text-xl font-bold mb-2" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
              Request Submitted!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(201,162,39,0.6)' }}>
              Your company registration request has been submitted. The platform admin will review and activate your account.
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6">
              <h1 className="text-white text-2xl font-bold mb-1" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
                Register Company
              </h1>
              <p className="text-sm" style={{ color: 'rgba(201,162,39,0.5)' }}>
                Create a new company account on Trustiva.
              </p>
            </div>

            {error && (
              <motion.div
                role="alert" aria-live="polite"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="mb-4 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg px-4 py-3"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(201,162,39,0.8)' }}>Company Name</label>
                <input type="text" value={form.company_name} onChange={setField('company_name')} required
                  placeholder="Your company or organisation name" autoComplete="organization"
                  className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(201,162,39,0.8)' }}>Your Full Name</label>
                <input type="text" value={form.name} onChange={setField('name')} required
                  placeholder="Your full name" autoComplete="name"
                  className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(201,162,39,0.8)' }}>Email Address</label>
                <input type="email" value={form.email} onChange={setField('email')} required
                  placeholder="you@company.com" autoComplete="email"
                  className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(201,162,39,0.8)' }}>Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={setField('password')} required
                    placeholder="••••••••" minLength={6} autoComplete="new-password"
                    className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition pr-11"
                    style={inputStyle} onFocus={focus} onBlur={blur} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition p-1"
                    style={{ color: 'rgba(201,162,39,0.5)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#C9A227')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,162,39,0.5)')}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(201,162,39,0.8)' }}>
                  Message <span style={{ color: 'rgba(201,162,39,0.4)' }}>(optional)</span>
                </label>
                <textarea value={form.message} onChange={setField('message')} rows={2}
                  placeholder="Tell us about your company or use case"
                  className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm outline-none transition resize-none"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: loading ? 'rgba(201,162,39,0.6)' : 'linear-gradient(135deg,#C9A227 0%,#DDB820 100%)',
                  color: '#0F172A',
                  boxShadow: '0 4px 20px rgba(201,162,39,0.4)',
                  fontFamily: 'Montserrat, Inter, sans-serif',
                }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? 'Submitting…' : 'Register Company'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm" style={{ color: 'rgba(201,162,39,0.5)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold transition" style={{ color: '#C9A227' }}>
                Sign In
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
