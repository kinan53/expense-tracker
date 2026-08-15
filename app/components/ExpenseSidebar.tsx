'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  QrCode,
  Trash2,
  X,
  Search,
  Filter,
  Users,
  Edit3,
  Send,
  ChevronRight,
  Phone,
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

interface ExpenseSidebarProps {
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
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpenseSidebar({
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
  isOpen,
  onClose,
}: ExpenseSidebarProps) {
  const [sidebarTab, setSidebarTab] = useState<'entries' | 'people'>('entries');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'owes_me' | 'i_owe'>('all');

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.person_name && expense.person_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const itemDirection = expense.direction || 'owes_me';
      const matchesDirection = directionFilter === 'all' || itemDirection === directionFilter;

      return matchesSearch && matchesStatus && matchesDirection;
    });
  }, [expenses, searchTerm, statusFilter, directionFilter]);

  const { pendingReceivable, pendingPayable, netBalance } = React.useMemo(() => {
    const rec = expenses
      .filter((e) => e.status === 'pending' && e.direction !== 'i_owe')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const pay = expenses
      .filter((e) => e.status === 'pending' && e.direction === 'i_owe')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      pendingReceivable: rec,
      pendingPayable: pay,
      netBalance: rec - pay,
    };
  }, [expenses]);

  // Grouped people summaries for sidebar's people tab
  const groupedPeople = React.useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      pendingOwesMe: number;
      pendingIOwe: number;
      totalCount: number;
    }>();

    for (const exp of expenses) {
      if (!exp.person_name) continue;
      const name = exp.person_name.trim();
      const key = name.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          name,
          phone: exp.person_phone || '',
          pendingOwesMe: 0,
          pendingIOwe: 0,
          totalCount: 0,
        });
      }

      const p = map.get(key)!;
      p.totalCount++;
      if (exp.person_phone && !p.phone) p.phone = exp.person_phone;

      if (exp.status === 'pending') {
        if (exp.direction === 'i_owe') {
          p.pendingIOwe += Number(exp.amount) || 0;
        } else {
          p.pendingOwesMe += Number(exp.amount) || 0;
        }
      }
    }

    return Array.from(map.values())
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.phone.includes(searchTerm);

        if (!matchesSearch) return false;

        if (directionFilter === 'owes_me') {
          return p.pendingOwesMe > 0;
        }
        if (directionFilter === 'i_owe') {
          return p.pendingIOwe > 0;
        }
        return true;
      })
      .sort((a, b) => (b.pendingOwesMe + b.pendingIOwe) - (a.pendingOwesMe + a.pendingIOwe));
  }, [expenses, searchTerm, directionFilter]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleSendWhatsAppForExpense = (exp: Expense) => {
    if (!exp.person_name) return;
    if (!exp.person_phone) {
      onRequestAddPhone(exp.person_name, '');
      return;
    }

    const message = generateExpenseWhatsAppMessage({
      personName: exp.person_name,
      amount: exp.amount,
      description: exp.description,
      upiId,
      payeeName,
    });

    openWhatsApp(exp.person_phone, message);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4 md:p-5">
        <div>
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-4.5 w-4.5 md:h-5 md:w-5 text-indigo-400" />
            Activity & Ledgers
          </h2>
          <p className="text-[10px] md:text-xs text-slate-400 mt-0.5">
            {expenses.length} entries recorded
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white md:hidden transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="p-3 md:p-4 border-b border-white/10 bg-slate-950/40 space-y-2.5">
        {/* Clickable Quick Balance Cards that filter people */}
        <div className="grid grid-cols-2 gap-2">
          {/* Who Owes Me Card */}
          <button
            onClick={() => {
              setSidebarTab('people');
              setDirectionFilter('owes_me');
            }}
            className={`flex flex-col text-left rounded-xl border p-2.5 transition cursor-pointer ${
              sidebarTab === 'people' && directionFilter === 'owes_me'
                ? 'bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20'
            }`}
          >
            <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between">
              Who Owes Me <ChevronRight className="h-3 w-3" />
            </span>
            <p className="text-base font-extrabold text-white mt-1 leading-none">
              ₹{pendingReceivable.toFixed(0)}
            </p>
            <span className="text-[10px] text-emerald-300/70 mt-1">
              View details →
            </span>
          </button>

          {/* I Owe Someone Card */}
          <button
            onClick={() => {
              setSidebarTab('people');
              setDirectionFilter('i_owe');
            }}
            className={`flex flex-col text-left rounded-xl border p-2.5 transition cursor-pointer ${
              sidebarTab === 'people' && directionFilter === 'i_owe'
                ? 'bg-rose-500/20 border-rose-500/40 ring-1 ring-rose-500/30'
                : 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20'
            }`}
          >
            <span className="text-[9px] uppercase font-bold text-rose-400 tracking-wider flex items-center justify-between">
              I Owe <ChevronRight className="h-3 w-3" />
            </span>
            <p className="text-base font-extrabold text-white mt-1 leading-none">
              ₹{pendingPayable.toFixed(0)}
            </p>
            <span className="text-[10px] text-rose-300/70 mt-1">
              View details →
            </span>
          </button>
        </div>

        {/* Net Balance Pill */}
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold border ${
            netBalance >= 0
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Net Pending Balance
          </span>
          <span className="font-extrabold text-sm">
            {netBalance >= 0 ? '+' : ''}₹{netBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabs: Entries vs People */}
      <div className="flex border-b border-white/10 px-3 pt-2 bg-slate-950/20">
        <button
          onClick={() => {
            setSidebarTab('entries');
            setDirectionFilter('all');
          }}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
            sidebarTab === 'entries'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          All Entries ({filteredExpenses.length})
        </button>
        <button
          onClick={() => {
            setSidebarTab('people');
            setDirectionFilter('all');
          }}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition cursor-pointer ${
            sidebarTab === 'people'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          By Person ({groupedPeople.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2 p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder={
              sidebarTab === 'entries'
                ? 'Search description or person...'
                : 'Search people...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

        {/* Filter Buttons */}
        <div className="space-y-1.5">
          {/* Status filter only for entries */}
          {sidebarTab === 'entries' && (
            <div className="flex gap-1">
              {(['all', 'pending', 'received'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}

          {/* Direction filter for both entries and people */}
          <div className="flex gap-1">
            {(['all', 'owes_me', 'i_owe'] as const).map((filter) => {
              const label =
                filter === 'all'
                  ? 'All'
                  : filter === 'owes_me'
                  ? 'Who Owes Me'
                  : 'I Owe';
              return (
                <button
                  key={filter}
                  onClick={() => setDirectionFilter(filter)}
                  className={`flex-1 rounded-md py-0.5 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    directionFilter === filter
                      ? 'bg-slate-700 text-white border border-white/10'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="mt-2 text-xs">Loading data...</span>
          </div>
        ) : sidebarTab === 'people' ? (
          /* People Grouped List */
          groupedPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 border border-dashed border-white/5 rounded-xl p-4">
              <Users className="h-7 w-7 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-400">No people records found</p>
            </div>
          ) : (
            groupedPeople.map((person) => (
              <div
                key={person.name}
                onClick={() => onSelectPerson(person.name, person.phone)}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 p-3 hover:border-indigo-500/40 hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs leading-tight group-hover:text-indigo-300 transition">
                      {person.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {person.phone && (
                        <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                          <Phone className="h-2 w-2" />
                          {person.phone}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400">
                        {person.totalCount} {person.totalCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {person.pendingOwesMe > 0 && (
                    <span className="block text-xs font-extrabold text-emerald-400 leading-tight">
                      +₹{person.pendingOwesMe.toFixed(0)}
                    </span>
                  )}
                  {person.pendingIOwe > 0 && (
                    <span className="block text-xs font-extrabold text-rose-400 leading-tight">
                      -₹{person.pendingIOwe.toFixed(0)}
                    </span>
                  )}
                  {person.pendingOwesMe === 0 && person.pendingIOwe === 0 && (
                    <span className="text-[10px] text-slate-500 font-medium">Settled</span>
                  )}
                </div>
              </div>
            ))
          )
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 border border-dashed border-white/5 rounded-xl p-4">
            <Filter className="h-7 w-7 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">No entries match filters</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const isPending = expense.status === 'pending';
            const isOwesMe = expense.direction !== 'i_owe';

            return (
              <div
                key={expense.id}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 p-3 transition duration-150 hover:border-white/20 hover:bg-slate-800/50"
              >
                {/* Visual Accent */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    !isOwesMe
                      ? isPending ? 'bg-rose-500' : 'bg-slate-600'
                      : isPending ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />

                <div className="flex items-start justify-between pl-1">
                  <div>
                    <h4 className="font-semibold text-white text-xs line-clamp-1">
                      {expense.description}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-400 block">
                        {formatDate(expense.created_at)}
                      </span>
                      <span className={`inline-flex items-center text-[8px] font-extrabold uppercase tracking-wider px-1 py-0.2 rounded-xs ${
                        isOwesMe
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {isOwesMe ? 'Receivable' : 'Payable'}
                      </span>
                    </div>

                    {/* Person Link */}
                    {expense.person_name && (
                      <button
                        onClick={() =>
                          onSelectPerson(expense.person_name!, expense.person_phone || undefined)
                        }
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium transition cursor-pointer ${
                          !isOwesMe
                            ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                        title="Click to view full history for this person"
                      >
                        <Users className="h-2.5 w-2.5" />
                        {expense.person_name}
                      </button>
                    )}
                  </div>

                  <div className="text-right pl-2 shrink-0">
                    <span
                      className={`text-sm font-extrabold ${
                        isOwesMe ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ₹{Number(expense.amount).toFixed(2)}
                    </span>
                    <div className="mt-1">
                      <button
                        onClick={() =>
                          onUpdateStatus(expense.id, isPending ? 'received' : 'pending')
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${
                          isPending
                            ? !isOwesMe
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <Clock className="h-2 w-2" />
                            Pending
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-2 w-2" />
                            {isOwesMe ? 'Received' : 'Paid'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Entry Action Buttons */}
                <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-white/5 pt-2">
                  {/* Share QR */}
                  {isOwesMe && (
                    <button
                      onClick={() =>
                        onOpenQRModal({
                          amount: Number(expense.amount),
                          description: expense.description,
                          personName: expense.person_name || '',
                          personPhone: expense.person_phone || '',
                        })
                      }
                      className="flex items-center gap-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-1 text-[10px] font-semibold text-indigo-300 transition cursor-pointer"
                      title="Share QR"
                    >
                      <QrCode className="h-3 w-3" />
                      QR
                    </button>
                  )}

                  {/* Send WhatsApp */}
                  {expense.person_name && (
                    <button
                      onClick={() => handleSendWhatsAppForExpense(expense)}
                      className="flex items-center gap-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-400 transition cursor-pointer"
                      title="Send WhatsApp reminder"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => onEditExpense(expense)}
                    className="flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 transition cursor-pointer"
                    title="Edit entry"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this entry?')) {
                        onDeleteExpense(expense.id);
                      }
                    }}
                    className="rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-1 text-red-400 transition cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-80 md:w-96 shrink-0 border-l border-white/10 md:flex flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      >
        <div
          className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
