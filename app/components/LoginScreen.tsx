'use client';

import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        setError('Incorrect password. Please try again.');
        setLoading(false);
      }
    }, 600); // Add a small delay for a premium loading feel
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20">
        <div className="flex flex-col items-center">
          {/* Logo/Icon */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 ring-4 ring-indigo-500/5 animate-pulse">
            <Lock className="h-8 w-8" />
          </div>
          
          <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Expense Tracker
          </h1>
          <p className="mt-2 text-sm text-slate-400 text-center">
            Enter the admin password to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-slate-500 outline-hidden transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 transition-all duration-200 active:scale-98"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </span>
            ) : (
              'Unlock Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
