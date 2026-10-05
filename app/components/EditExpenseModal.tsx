'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownLeft, Loader2, User, Phone } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  person_name: string | null;
  person_phone: string | null;
  status: string;
  created_at: string;
  direction?: string;
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  contacts: { name: string; phone: string }[];
  onSave: (id: string, updatedFields: {
    description: string;
    amount: number;
    person_name: string | null;
    person_phone: string | null;
    direction: string;
    status: string;
  }) => Promise<boolean>;
}

export default function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  contacts,
  onSave,
}: EditExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [direction, setDirection] = useState<'owes_me' | 'i_owe'>('owes_me');
  const [status, setStatus] = useState('pending');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestions = (contacts || []).filter(
    (c) =>
      c.name &&
      c.name.toLowerCase().includes(personName.trim().toLowerCase()) &&
      c.name.toLowerCase() !== personName.trim().toLowerCase()
  );

  useEffect(() => {
    if (isOpen && expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setPersonName(expense.person_name || '');
      setPersonPhone(expense.person_phone || '');
      setDirection((expense.direction as 'owes_me' | 'i_owe') || 'owes_me');
      setStatus(expense.status);
      setError('');
    }
  }, [isOpen, expense]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) {
      setError('Description and amount are required.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    setError('');

    const success = await onSave(expense.id, {
      description: description.trim(),
      amount: numAmount,
      person_name: personName.trim() || null,
      person_phone: personPhone.trim() || null,
      direction,
      status,
    });

    setLoading(false);
    if (success) {
      onClose();
    } else {
      setError('Failed to update entry. Try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#12141a] p-5 sm:p-6 shadow-2xl safe-area-bottom z-10 max-h-[90dvh] overflow-y-auto no-scrollbar">
        {/* Mobile handle indicator */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Edit Entry
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Direction */}
          <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.04]">
            <button
              type="button"
              onClick={() => setDirection('owes_me')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                direction === 'owes_me'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>They owe me</span>
            </button>
            <button
              type="button"
              onClick={() => setDirection('i_owe')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                direction === 'i_owe'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" />
              <span>I owe them</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Amount (₹)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-lg font-medium text-zinc-400">₹</span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-4 py-2.5 text-lg font-semibold tabular-nums text-white placeholder-zinc-600 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-white outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* Person Name & suggestions */}
          <div className="relative">
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Person
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={personName}
                onChange={(e) => {
                  setPersonName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#161821] p-1 shadow-xl">
                {suggestions.slice(0, 4).map((contact) => (
                  <button
                    key={contact.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setPersonName(contact.name);
                      if (contact.phone) setPersonPhone(contact.phone);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left flex items-center justify-between rounded-lg px-3 py-2 text-xs text-zinc-200 hover:bg-white/[0.06] transition cursor-pointer"
                  >
                    <span className="font-medium text-white">{contact.name}</span>
                    {contact.phone && (
                      <span className="text-[11px] text-zinc-400">{contact.phone}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              WhatsApp Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="tel"
                inputMode="tel"
                value={personPhone}
                onChange={(e) => setPersonPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  status === 'pending'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:text-white'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatus('received')}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                  status === 'received'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:text-white'
                }`}
              >
                Settled
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              {error}
            </p>
          )}

          {/* Actions */}
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
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
