'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, Send } from 'lucide-react';

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
      setError('Please enter a valid WhatsApp phone number (at least 7-10 digits).');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm transform overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">WhatsApp Number</h3>
              <p className="text-[11px] text-slate-400">For {personName || 'this person'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Enter WhatsApp Number
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                autoFocus
                placeholder="e.g. 9876543210 or +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              If entering a 10-digit Indian number, +91 will be applied automatically.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 active:scale-98 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Save & Send
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
