'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Shield, CreditCard, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUpiId: string;
  initialPayeeName: string;
  onSave: (upiId: string, payeeName: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  initialUpiId,
  initialPayeeName,
  onSave,
}: SettingsModalProps) {
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUpiId(initialUpiId);
      setPayeeName(initialPayeeName);
      if (typeof window !== 'undefined') {
        setCustomPassword(localStorage.getItem('expense_tracker_custom_password') || '');
      }
    }
  }, [isOpen, initialUpiId, initialPayeeName]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpiId = upiId.trim();
    const cleanPayeeName = payeeName.trim();

    localStorage.setItem('expense_tracker_upi_id', cleanUpiId);
    localStorage.setItem('expense_tracker_payee_name', cleanPayeeName);
    
    if (customPassword.trim()) {
      localStorage.setItem('expense_tracker_custom_password', customPassword.trim());
    } else {
      localStorage.removeItem('expense_tracker_custom_password');
    }

    try {
      // Attempt syncing to Supabase table
      await supabase.from('app_settings').upsert({
        id: 1,
        upi_id: cleanUpiId,
        payee_name: cleanPayeeName,
      });
    } catch (err) {
      console.warn('Failed to sync settings to Supabase database (ensure table app_settings exists):', err);
    }

    onSave(cleanUpiId, cleanPayeeName);

    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">App Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* UPI ID */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
              Google Pay / UPI ID
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@okaxis"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-[11px] text-slate-500">
              Used to generate Google Pay QR codes and deep links.
            </p>
          </div>

          {/* Payee Name */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <User className="h-3.5 w-3.5 text-indigo-400" />
              Payee Name (Your Name)
            </label>
            <input
              type="text"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Custom Admin Password */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              Custom Admin Password
            </label>
            <input
              type="password"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              placeholder="Leave empty to use env default"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-98 transition"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </form>

        {/* Success Toast inside modal */}
        {showSavedToast && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-xs animate-fade-in">
            <div className="flex flex-col items-center gap-2 text-emerald-400">
              <div className="rounded-full bg-emerald-500/10 p-3 ring-4 ring-emerald-500/5">
                <Save className="h-6 w-6" />
              </div>
              <span className="font-semibold text-lg text-white">Settings Saved!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
