'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, User, Lock } from 'lucide-react';
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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUpiId(initialUpiId);
      setPayeeName(initialPayeeName);
      if (typeof window !== 'undefined') {
        setCustomPassword(localStorage.getItem('expense_tracker_custom_password') || '');
      }
      setSaved(false);
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
      await supabase.from('app_settings').upsert({
        id: 1,
        upi_id: cleanUpiId,
        payee_name: cleanPayeeName,
      });
    } catch (err) {
      console.warn('Failed to sync settings to Supabase table:', err);
    }

    onSave(cleanUpiId, cleanPayeeName);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#12141a] p-5 sm:p-6 shadow-2xl safe-area-bottom z-10 max-h-[90dvh] overflow-y-auto no-scrollbar">
        {/* Mobile drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* UPI ID */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              UPI / Google Pay ID
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okaxis"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Used to generate direct UPI QR codes and links for repayments.
            </p>
          </div>

          {/* Payee Name */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Payee Name (Your display name)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                required
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Alex Smith"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          {/* Custom Password */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Admin Passcode
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Default: admin123"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Leave blank to keep the default system passcode.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
