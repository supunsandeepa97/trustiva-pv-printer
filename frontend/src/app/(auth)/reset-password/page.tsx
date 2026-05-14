'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import { AuthAPI } from '@/lib/api';

export default function ResetPasswordPage() {
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    try {
      await AuthAPI.resetPassword({ email, otp, password });
      router.push('/login');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 shadow-glass">
      <Link href="/forgot-password" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="text-white text-2xl font-bold mb-1">Set New Password</h1>
      <p className="text-slate-400 text-sm mb-6">Enter your OTP and new password</p>
      {error && <p className="mb-4 text-red-300 text-sm bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: 'Email', value: email, set: setEmail, type: 'email', placeholder: 'you@company.com' },
          { label: 'OTP Code', value: otp, set: setOtp, type: 'text', placeholder: '123456' },
          { label: 'New Password', value: password, set: setPassword, type: 'password', placeholder: '••••••••' },
          { label: 'Confirm Password', value: confirm, set: setConfirm, type: 'password', placeholder: '••••••••' },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} required
              className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500" />
          </div>
        ))}
        <button type="submit" disabled={loading} className="w-full disabled:opacity-60 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#C9A227,#DDB820)', color: '#0F172A' }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </motion.div>
  );
}
