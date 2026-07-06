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
  Smartphone,
  Edit3,
} from 'lucide-react';

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
  isOpen,
  onClose,
}: ExpenseSidebarProps) {
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
    const rec = filteredExpenses
      .filter((e) => e.status === 'pending' && e.direction !== 'i_owe')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const pay = filteredExpenses
      .filter((e) => e.status === 'pending' && e.direction === 'i_owe')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      pendingReceivable: rec,
      pendingPayable: pay,
      netBalance: rec - pay,
    };
  }, [filteredExpenses]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4 md:p-5">
        <div>
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-4.5 w-4.5 md:h-5 md:w-5 text-indigo-400" />
            Expense Tracker Entries
          </h2>
          <p className="text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1">
            Tracking {expenses.length} total entries
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white md:hidden transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="p-3 md:p-5 border-b border-white/10 bg-slate-950/40">
        {/* Mobile View: 3 items in a single horizontal row */}
        <div className="flex md:hidden gap-1.5 text-[11px] font-semibold">
          {/* Net Balance */}
          <div className={`flex-1 rounded-lg border px-2 py-1.5 transition duration-200 ${
            netBalance >= 0 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none">Net Bal</span>
            <p className="font-extrabold mt-0.5 leading-none">
              {netBalance >= 0 ? '+' : ''}₹{netBalance.toFixed(0)}
            </p>
          </div>
          {/* Receivable */}
          <div className="flex-1 rounded-lg bg-slate-800/40 border border-white/5 px-2 py-1.5">
            <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none">Receivable</span>
            <p className="font-extrabold text-emerald-400 mt-0.5 leading-none">₹{pendingReceivable.toFixed(0)}</p>
          </div>
          {/* Payable */}
          <div className="flex-1 rounded-lg bg-slate-800/40 border border-white/5 px-2 py-1.5">
            <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none">Payable</span>
            <p className="font-extrabold text-rose-400 mt-0.5 leading-none">₹{pendingPayable.toFixed(0)}</p>
          </div>
        </div>

        {/* Desktop View: Stacked layout */}
        <div className="hidden md:flex flex-col gap-3">
          {/* Net Balance row */}
          <div className={`rounded-xl border p-4 transition duration-200 ${
            netBalance >= 0 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Net Pending Balance</span>
            <p className="text-2xl font-extrabold mt-0.5">
              {netBalance >= 0 ? '+' : ''}₹{netBalance.toFixed(2)}
            </p>
          </div>

          {/* Breakdown split row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-slate-800/40 border border-white/5 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Receivable</span>
              <p className="text-sm font-extrabold text-emerald-400 mt-0.5">₹{pendingReceivable.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-slate-800/40 border border-white/5 p-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payable</span>
              <p className="text-sm font-extrabold text-rose-400 mt-0.5">₹{pendingPayable.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="space-y-2 md:space-y-3 p-3 md:p-5 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-2 md:top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search entries or names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-1.5 md:py-2 text-sm text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

        {/* Filter Buttons */}
        <div className="space-y-2">
          {/* Status Filters */}
          <div className="flex gap-1.5">
            {(['all', 'pending', 'received'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 rounded-lg py-1 md:py-1.5 text-xs font-semibold uppercase tracking-wider transition duration-150 cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/10'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Type / Direction Filters */}
          <div className="flex gap-1.5">
            {(['all', 'owes_me', 'i_owe'] as const).map((filter) => {
              const filterLabel = 
                filter === 'all' ? 'All Types' :
                filter === 'owes_me' ? 'Receivable' : 'Payable';
              return (
                <button
                  key={filter}
                  onClick={() => setDirectionFilter(filter)}
                  className={`flex-1 rounded-lg py-0.5 md:py-1 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition duration-150 cursor-pointer ${
                    directionFilter === filter
                      ? 'bg-slate-700 text-white shadow-md border border-white/5'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {filterLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="mt-3 text-xs">Loading entries...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 border border-dashed border-white/5 rounded-xl p-4">
            <Filter className="h-8 w-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">No entries found</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting filters or adding a new expense.</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const isPending = expense.status === 'pending';
            return (
              <div
                key={expense.id}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900 p-4 transition duration-200 hover:border-white/20 hover:bg-slate-800/50"
              >
                {/* Visual Accent border for status */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    expense.direction === 'i_owe'
                      ? (isPending ? 'bg-rose-500/80' : 'bg-slate-500/80')
                      : (isPending ? 'bg-amber-500/80' : 'bg-emerald-500/80')
                  }`}
                />

                <div className="flex items-start justify-between pl-1">
                  <div>
                    <h4 className="font-semibold text-white text-sm line-clamp-1">{expense.description}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 block">{formatDate(expense.created_at)}</span>
                      <span className={`inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded-sm ${
                        expense.direction === 'i_owe'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/10'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10'
                      }`}>
                        {expense.direction === 'i_owe' ? 'Payable' : 'Receivable'}
                      </span>
                    </div>

                    {/* Person Details */}
                    {expense.person_name && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                          expense.direction === 'i_owe'
                            ? 'bg-rose-500/10 text-rose-300'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}>
                          <Users className="h-2.5 w-2.5" />
                          {expense.person_name}
                        </span>
                        {expense.person_phone && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <Smartphone className="h-2.5 w-2.5" />
                            {expense.person_phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right pl-2">
                    <span className={`text-base font-extrabold ${
                      expense.direction === 'i_owe' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      ₹{Number(expense.amount).toFixed(2)}
                    </span>
                    <div className="mt-2">
                      <button
                        onClick={() =>
                          onUpdateStatus(expense.id, isPending ? 'received' : 'pending')
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition duration-150 cursor-pointer ${
                          isPending
                            ? (expense.direction === 'i_owe'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20')
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <Clock className="h-2.5 w-2.5" />
                            Pending
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-2.5 w-2.5" />
                            {expense.direction === 'i_owe' ? 'Paid' : 'Received'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Entry Action Buttons */}
                <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-white/5 pt-3 opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  {/* Option to send GPay QR code (whatsapp style) */}
                  {expense.direction !== 'i_owe' && (
                    <button
                      onClick={() =>
                        onOpenQRModal({
                          amount: Number(expense.amount),
                          description: expense.description,
                          personName: expense.person_name || '',
                          personPhone: expense.person_phone || '',
                        })
                      }
                      className="flex items-center gap-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2.5 py-1.5 text-xs font-semibold text-indigo-300 transition duration-150 cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Share QR
                    </button>
                  )}

                  {/* Edit Expense */}
                  <button
                    onClick={() => onEditExpense(expense)}
                    className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition duration-150 cursor-pointer"
                    title="Edit Entry"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  {/* Delete Expense */}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this expense entry?')) {
                        onDeleteExpense(expense.id);
                      }
                    }}
                    className="rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-1.5 text-red-400 transition duration-150 cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
      {/* Desktop Sidebar (visible on md and up) */}
      <aside className="hidden w-80 md:w-96 shrink-0 border-l border-white/10 md:flex flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible on mobile when toggled open) */}
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
