'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, Send, Loader2 } from 'lucide-react';

interface AddPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  initialPhone?: string;
  onSaveAndSend: (phone: string) => Promise<void> | void;
}

export default function AddPhoneModal({
  isOpen,
  onClose,
  personName,
  initialPhone = '',
  onSaveAndSend,
}: AddPhoneModalProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone || '');
      setError('');
      setLoading(false);
    }
  }, [isOpen, initialPhone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');

    if (!digitsOnly || digitsOnly.length < 7) {
      setError('Please enter a valid phone number (at least 7–10 digits).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSaveAndSend(cleanPhone);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#12141a] p-5 sm:p-6 shadow-2xl safe-area-bottom z-10 max-h-[90dvh] overflow-y-auto no-scrollbar">
        {/* Mobile handle indicator */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-white">
              WhatsApp Contact
            </h3>
            <span className="text-xs text-zinc-400 font-normal">
              for {personName || 'Contact'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="tel"
                inputMode="tel"
                required
                autoFocus
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              10-digit Indian numbers automatically default to +91.
            </p>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-xs font-semibold text-zinc-950 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Save & Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
