'use client';

import React, { useState } from 'react';
import { PlusCircle, Loader2, IndianRupee, User, Phone, FileText, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddExpenseFormProps {
  onExpenseAdded: () => void;
  onOpenQRModal: (expense: {
    amount: number;
    description: string;
    personName: string;
    personPhone: string;
  }) => void;
}

export default function AddExpenseForm({ onExpenseAdded, onOpenQRModal }: AddExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      setError('Please fill in Description and Amount.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert([
          {
            description: description.trim(),
            amount: parseFloat(amount),
            person_name: personName.trim() || null,
            person_phone: personPhone.trim() || null,
            status: 'pending',
          },
        ])
        .select();

      if (insertError) throw insertError;

      // Reset form fields
      setDescription('');
      setAmount('');
      setPersonName('');
      setPersonPhone('');
      setError('');

      // Refresh list
      onExpenseAdded();

      // If user selected "Send Gpay QR", trigger the QR Modal
      if (sendWhatsApp) {
        onOpenQRModal({
          amount: parseFloat(amount),
          description: description.trim(),
          personName: personName.trim(),
          personPhone: personPhone.trim(),
        });
      }
    } catch (err: any) {
      console.error('Error adding expense:', err);
      setError(err.message || 'Failed to add expense. Check your Supabase configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <PlusCircle className="h-5 w-5 text-indigo-400" />
        Add New Expense
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            Description
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Dinner party, Cab fare"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Person Name */}
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <User className="h-3.5 w-3.5 text-slate-500" />
            Person Name (Who owes you)
          </label>
          <input
            type="text"
            placeholder="e.g. Ramesh"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
            placeholder="e.g. +91 98765 43210"
            value={personPhone}
            onChange={(e) => setPersonPhone(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* WhatsApp Checkbox Toggle */}
        {personPhone.trim().length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-sm text-emerald-400 animate-fade-in">
            <input
              type="checkbox"
              id="sendWhatsAppCheckbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/40"
            />
            <label htmlFor="sendWhatsAppCheckbox" className="font-medium cursor-pointer select-none">
              Open WhatsApp QR share on submit
            </label>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 transition active:scale-98"
        >
          {loading ? (
            <>
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Saving Entry...
            </>
          ) : (
            <>
              <PlusCircle className="h-4.5 w-4.5" />
              Save Expense
            </>
          )}
        </button>
      </form>
    </div>
  );
}
