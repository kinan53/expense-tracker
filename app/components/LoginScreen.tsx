'use client';

import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    const expectedPassword =
      localStorage.getItem('expense_tracker_custom_password') ||
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD ||
      'admin123';

    setTimeout(() => {
      if (password === expectedPassword) {
        localStorage.setItem('expense_tracker_auth', 'true');
        onLoginSuccess();
      } else {
        setError('Incorrect passcode');
        setLoading(false);
      }
    }, 350);
  };

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#090a0f] px-6 safe-area-top safe-area-bottom">
      <div className="w-full max-w-xs">
        {/* Minimal glyph */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-300">
            <Lock className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Ledger
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Enter passcode to unlock your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Passcode"
              className="w-full rounded-xl border border-white/10 bg-[#12141a] px-4 py-3.5 text-center text-white tracking-widest placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying
              </span>
            ) : (
              <>
                <span>Unlock</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] text-zinc-600">
          Default password is <span className="font-mono text-zinc-400">admin123</span>
        </p>
      </div>
    </div>
  );
}
