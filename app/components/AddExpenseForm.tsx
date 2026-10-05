'use client';

import React, { useState } from 'react';
import { Loader2, ArrowUpRight, ArrowDownLeft, X, Phone, User, MessageCircle } from 'lucide-react';
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
  onCancel?: () => void;
}

const QUICK_TAGS = ['Dinner', 'Lunch', 'Groceries', 'Cab / Uber', 'Coffee', 'Rent', 'Travel'];

export default function AddExpenseForm({
  onExpenseAdded,
  onOpenQRModal,
  contacts,
  onCancel,
}: AddExpenseFormProps) {
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

    try {
      const { error: insertError } = await supabase
        .from('expenses')
        .insert([
          {
            description: description.trim(),
            amount: numAmount,
            person_name: personName.trim() || null,
            person_phone: personPhone.trim() || null,
            direction,
            status: 'pending',
          },
        ])
        .select();

      if (insertError) throw insertError;

      const savedAmount = numAmount;
      const savedDesc = description.trim();
      const savedPerson = personName.trim();
      const savedPhone = personPhone.trim();

      // Reset
      setDescription('');
      setAmount('');
      setPersonName('');
      setPersonPhone('');
      setDirection('owes_me');
      setSendWhatsApp(false);
      setError('');

      onExpenseAdded();

      if (direction === 'owes_me' && sendWhatsApp) {
        onOpenQRModal({
          amount: savedAmount,
          description: savedDesc,
          personName: savedPerson,
          personPhone: savedPhone,
        });
      }

      if (onCancel) {
        onCancel();
      }
    } catch (err: any) {
      console.error('Error adding expense:', err);
      setError(err?.message || 'Failed to save entry. Check database connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#12141a] p-4 sm:p-5">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold tracking-tight text-white">
          New Entry
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            className="rounded-lg p-1 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Direction Segmented Control */}
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

        {/* Amount Input */}
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
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-4 py-3 text-lg font-semibold tabular-nums text-white placeholder-zinc-600 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        {/* Description Input + Quick Tags */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            Description
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Dinner, Cab, Groceries"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
          />
          {/* Quick Tags */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setDescription(tag)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                  description === tag
                    ? 'bg-white/20 text-white'
                    : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Person Name & Autocomplete */}
        <div className="relative">
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            {direction === 'owes_me' ? 'Person who owes you' : 'Person you owe'}
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="e.g. Alex"
              value={personName}
              onChange={(e) => {
                setPersonName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#161821] p-1 shadow-xl">
              {suggestions.slice(0, 4).map((contact) => (
                <button
                  key={contact.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPersonName(contact.name);
                    if (contact.phone) {
                      setPersonPhone(contact.phone);
                    }
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

        {/* Phone Input */}
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
            WhatsApp Number (Optional)
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
            <input
              type="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={personPhone}
              onChange={(e) => setPersonPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3.5 py-2.5 text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        {/* Instant WhatsApp QR Prompt if receivable and phone entered */}
        {direction === 'owes_me' && personPhone.trim().length > 0 && (
          <label className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 text-xs text-emerald-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span className="flex items-center gap-1.5 font-medium">
              <MessageCircle className="h-3.5 w-3.5" />
              Open WhatsApp QR share immediately after saving
            </span>
          </label>
        )}

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
            {error}
          </p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Entry</span>
          )}
        </button>
      </form>
    </div>
  );
}
