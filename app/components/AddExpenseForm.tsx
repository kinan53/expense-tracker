'use client';

import React, { useState } from 'react';
import { PlusCircle, Loader2, IndianRupee, User, Phone, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddExpenseFormProps {
  onExpenseAdded: () => void;
  onOpenQRModal: (expense: {
    amount: number;
    description: string;
    personName: string;
    personPhone: string;
  }) => void;
  contacts: { name: string; phone: string }[];
}

export default function AddExpenseForm({ onExpenseAdded, onOpenQRModal, contacts }: AddExpenseFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [direction, setDirection] = useState<'owes_me' | 'i_owe'>('owes_me');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const suggestions = (contacts || []).filter(
    (c) =>
      c.name &&
      c.name.toLowerCase().includes(personName.trim().toLowerCase()) &&
      c.name.toLowerCase() !== personName.trim().toLowerCase()
  );

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
            direction: direction,
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
      setDirection('owes_me');
      setError('');

      // Refresh list
      onExpenseAdded();

      // If user selected "Send Gpay QR", trigger the QR Modal
      if (direction === 'owes_me' && sendWhatsApp) {
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
        Add New Entry
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Expense Direction Toggle */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Type of Entry
          </label>
          <div className="flex gap-2 p-1 bg-slate-950/60 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setDirection('owes_me')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
                direction === 'owes_me'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              Owed to Me (Receivable)
            </button>
            <button
              type="button"
              onClick={() => setDirection('i_owe')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
                direction === 'i_owe'
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              I Owe Them (Payable)
            </button>
          </div>
        </div>

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
        <div className="space-y-1 relative">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <User className="h-3.5 w-3.5 text-slate-500" />
            {direction === 'owes_me' ? 'Person Name (Who owes you)' : 'Person Name (Who you owe)'}
          </label>
          <input
            type="text"
            placeholder={direction === 'owes_me' ? 'e.g. Ramesh' : 'e.g. Landlord'}
            value={personName}
            onChange={(e) => {
              setPersonName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />

          {/* Autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-md max-h-48 overflow-y-auto custom-scrollbar">
              {suggestions.map((contact) => (
                <button
                  key={contact.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input from blurring
                    setPersonName(contact.name);
                    if (contact.phone) {
                      setPersonPhone(contact.phone);
                    }
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white transition cursor-pointer"
                >
                  <span className="font-medium">{contact.name}</span>
                  {contact.phone && (
                    <span className="text-xs text-slate-500 font-mono">{contact.phone}</span>
                  )}
                </button>
              ))}
            </div>
          )}
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

        {/* WhatsApp Checkbox Toggle (Only relevant when they owe us money) */}
        {direction === 'owes_me' && personPhone.trim().length > 0 && (
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
              Save Entry
            </>
          )}
        </button>
      </form>
    </div>
  );
}
