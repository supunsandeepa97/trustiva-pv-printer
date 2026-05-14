'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await login(email.trim(), password);
      router.push('/payments');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Check your credentials.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl p-8"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(201,162,39,0.25)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,162,39,0.1) inset',
      }}
    >
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold mb-1" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>
          Sign In
        </h1>
        <p className="text-sm" style={{ color: 'rgba(201,162,39,0.5)' }}>Access your finance printing dashboard</p>
      </div>

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 bg-red-500/20 border border-red-500/40 text-red-200 text-sm rounded-lg px-4 py-3"
        >
          {errorMsg}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(201,162,39,0.8)' }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm transition outline-none"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(201,162,39,0.2)',
            }}
            onFocus={e => { e.currentTarget.style.border = '1px solid rgba(201,162,39,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,162,39,0.12)'; }}
            onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(201,162,39,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            placeholder="you@company.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(201,162,39,0.8)' }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm transition outline-none pr-11"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(201,162,39,0.2)',
              }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(201,162,39,0.7)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,162,39,0.12)'; }}
              onBlur={e  => { e.currentTarget.style.border = '1px solid rgba(201,162,39,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition"
              style={{ color: 'rgba(201,162,39,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#C9A227')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,162,39,0.5)')}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#C9A227' }}
            />
            <span className="text-sm" style={{ color: 'rgba(201,162,39,0.6)' }}>Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm transition"
            style={{ color: '#C9A227' }}
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: loading ? 'rgba(201,162,39,0.6)' : 'linear-gradient(135deg, #C9A227 0%, #DDB820 100%)',
            color: '#0F172A',
            boxShadow: '0 4px 20px rgba(201,162,39,0.4)',
            fontFamily: 'Montserrat, Inter, sans-serif',
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: 'rgba(201,162,39,0.5)' }}>
        Don&apos;t have access?{' '}
        <Link href="/signup" className="font-semibold transition" style={{ color: '#C9A227' }}>
          Request Access
        </Link>
      </p>

      <p className="mt-3 text-center text-xs" style={{ color: 'rgba(201,162,39,0.3)' }}>
        Trustiva Print Suite v1.0 · Enterprise Finance Edition
      </p>
    </motion.div>
  );
}
