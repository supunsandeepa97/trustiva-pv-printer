'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { AuthAPI } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await AuthAPI.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-8 shadow-glass"
    >
      <Link href="/login" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>

      {sent ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Check your inbox</h2>
          <p className="text-slate-400 text-sm">If an account exists for <strong className="text-white">{email}</strong>, an OTP has been sent. Check your server logs for the code.</p>
          <Link href="/reset-password" className="mt-6 inline-block px-6 py-2.5 rounded-xl text-sm font-semibold transition" style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
            Enter OTP →
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-white text-2xl font-bold mb-1">Reset Password</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your email to receive a reset OTP</p>
          {error && <p className="mb-4 text-red-300 text-sm bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-lg">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="you@company.com"
              required
            />
            <button type="submit" disabled={loading} className="w-full disabled:opacity-60 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
}
