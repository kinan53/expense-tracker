'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  QrCode,
  Send,
  Edit3,
  Trash2,
  User,
  Clock,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';
import { generateExpenseWhatsAppMessage, openWhatsApp } from '../lib/whatsapp';

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

interface ExpenseListProps {
  expenses: Expense[];
  loading: boolean;
  onUpdateStatus: (id: string, newStatus: 'pending' | 'received') => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onEditExpense: (expense: Expense) => void;
  onOpenQRModal: (expense: {
    amount: number;
    description: string;
    personName: string;
    personPhone: string;
  }) => void;
  onSelectPerson: (personName: string, personPhone?: string) => void;
  onRequestAddPhone: (personName: string, currentPhone?: string) => void;
  upiId: string;
  payeeName: string;
}

export default function ExpenseList({
  expenses,
  loading,
  onUpdateStatus,
  onDeleteExpense,
  onEditExpense,
  onOpenQRModal,
  onSelectPerson,
  onRequestAddPhone,
  upiId,
  payeeName,
}: ExpenseListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'owes_me' | 'i_owe'>('all');

  const filtered = useMemo(() => {
    return expenses.filter((item) => {
      const matchSearch =
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        (item.person_name && item.person_name.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const itemDir = item.direction || 'owes_me';
      const matchDirection = directionFilter === 'all' || itemDir === directionFilter;

      return matchSearch && matchStatus && matchDirection;
    });
  }, [expenses, search, statusFilter, directionFilter]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSendWhatsApp = (item: Expense) => {
    if (!item.person_name) return;
    if (!item.person_phone) {
      onRequestAddPhone(item.person_name, '');
      return;
    }

    const message = generateExpenseWhatsAppMessage({
      personName: item.person_name,
      amount: item.amount,
      description: item.description,
      upiId,
      payeeName,
    });

    openWhatsApp(item.person_phone, message);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by note or person..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#12141a] pl-9 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition focus:border-white/30 focus:ring-1 focus:ring-white/20"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 rounded-md p-0.5 text-zinc-500 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* Status filter chips */}
        <div className="flex rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.04] shrink-0">
          {(['all', 'pending', 'received'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer capitalize ${
                statusFilter === filter
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {filter === 'received' ? 'Settled' : filter}
            </button>
          ))}
        </div>

        {/* Direction filter chips */}
        <div className="flex rounded-lg bg-white/[0.04] p-0.5 border border-white/[0.04] shrink-0">
          {(
            [
              { key: 'all', label: 'All types' },
              { key: 'owes_me', label: 'Owes me' },
              { key: 'i_owe', label: 'I owe' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setDirectionFilter(item.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                directionFilter === item.key
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Stream */}
      {loading ? (
        <div className="py-12 text-center text-zinc-500">
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent mb-2" />
          <p className="text-xs">Loading entries...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#12141a]/60 py-12 px-4 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-zinc-600 mb-2" />
          <p className="text-xs font-medium text-zinc-300">No entries found</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {search || statusFilter !== 'all' || directionFilter !== 'all'
              ? 'Try changing your search or filter settings.'
              : 'Add your first expense entry using the + button.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isPending = item.status === 'pending';
            const isOwesMe = item.direction !== 'i_owe';

            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-white/[0.06] bg-[#12141a] p-3.5 sm:p-4 hover:border-white/10 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Top Row: Description */}
                    <h3 className="text-sm font-medium text-white truncate">
                      {item.description}
                    </h3>

                    {/* Metadata Row: Person & Date */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {item.person_name ? (
                        <button
                          onClick={() =>
                            onSelectPerson(item.person_name!, item.person_phone || undefined)
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition cursor-pointer"
                        >
                          <User className="h-2.5 w-2.5 text-zinc-500" />
                          <span>{item.person_name}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500">General</span>
                      )}

                      <span className="text-[11px] text-zinc-500">
                        {formatDate(item.created_at)}
                      </span>

                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded-sm ${
                          isOwesMe
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {isOwesMe ? 'Receivable' : 'Payable'}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Amount & Status toggle */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm sm:text-base font-semibold tabular-nums ${
                        isOwesMe ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isOwesMe ? '+' : '-'}₹{Number(item.amount).toFixed(2)}
                    </div>

                    <button
                      onClick={() =>
                        onUpdateStatus(item.id, isPending ? 'received' : 'pending')
                      }
                      className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition cursor-pointer ${
                        isPending
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700/80 hover:text-zinc-200'
                      }`}
                      title="Tap to toggle pending / settled"
                    >
                      {isPending ? (
                        <>
                          <Clock className="h-2.5 w-2.5" />
                          <span>Pending</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-2.5 w-2.5" />
                          <span>Settled</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Quick Action Tooling */}
                <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-white/[0.04] pt-2.5">
                  {isOwesMe && (
                    <button
                      onClick={() =>
                        onOpenQRModal({
                          amount: Number(item.amount),
                          description: item.description,
                          personName: item.person_name || '',
                          personPhone: item.person_phone || '',
                        })
                      }
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white transition cursor-pointer"
                      title="Share QR"
                    >
                      <QrCode className="h-3 w-3" />
                      <span>QR</span>
                    </button>
                  )}

                  {item.person_name && (
                    <button
                      onClick={() => handleSendWhatsApp(item)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 text-[11px] font-medium transition cursor-pointer"
                      title="Send WhatsApp Reminder"
                    >
                      <Send className="h-3 w-3" />
                      <span>WhatsApp</span>
                    </button>
                  )}

                  <button
                    onClick={() => onEditExpense(item)}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.04] transition cursor-pointer"
                    title="Edit entry"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete "${item.description}"?`)) {
                        onDeleteExpense(item.id);
                      }
                    }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
