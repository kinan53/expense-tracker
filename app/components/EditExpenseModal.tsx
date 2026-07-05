'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, IndianRupee, User, Phone, FileText, Loader2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  person_name: string | null;
  person_phone: string | null;
  status: string;
  created_at: string;
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onSave: (id: string, updatedFields: {
    description: string;
    amount: number;
    person_name: string | null;
    person_phone: string | null;
    status: string;
  }) => Promise<boolean>;
}

export default function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  onSave,
}: EditExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setPersonName(expense.person_name || '');
      setPersonPhone(expense.person_phone || '');
      setStatus(expense.status);
      setError('');
    }
  }, [isOpen, expense]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      setError('Description and Amount are required.');
      return;
    }

    setLoading(true);
    setError('');

    const success = await onSave(expense.id, {
      description: description.trim(),
      amount: parseFloat(amount),
      person_name: personName.trim() || null,
      person_phone: personPhone.trim() || null,
      status,
    });

    setLoading(false);
    if (success) {
      onClose();
    } else {
      setError('Failed to update expense. Try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl transition-all animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-indigo-400" />
            Edit Expense Entry
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Description */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              Description
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <IndianRupee className="h-3.5 w-3.5 text-slate-500" />
              Amount (INR)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Person Name */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <User className="h-3.5 w-3.5 text-slate-500" />
              Person Name
            </label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Person Phone */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Phone className="h-3.5 w-3.5 text-slate-500" />
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={personPhone}
              onChange={(e) => setPersonPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Status Select */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-white outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="pending">Pending</option>
              <option value="received">Received</option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

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
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 active:scale-98 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
