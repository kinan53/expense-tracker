'use client';

import React, { useState } from 'react';
import {
  X,
  QrCode,
  Send,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  Phone,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCheck,
  Calendar,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  generatePersonSummaryWhatsAppMessage,
  generateExpenseWhatsAppMessage,
  openWhatsApp,
} from '../lib/whatsapp';

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

interface PersonDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  personPhone?: string;
  expenses: Expense[];
  upiId: string;
  payeeName: string;
  onUpdateStatus: (id: string, newStatus: 'pending' | 'received') => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onEditExpense: (expense: Expense) => void;
  onRequestAddPhone: (personName: string, currentPhone?: string) => void;
  onOpenQRModal: (data: {
    amount: number;
    description: string;
    personName: string;
    personPhone: string;
  }) => void;
  onSettleAllForPerson: (personName: string, direction: 'owes_me' | 'i_owe') => Promise<boolean>;
}

export default function PersonDetailsModal({
  isOpen,
  onClose,
  personName,
  personPhone = '',
  expenses,
  upiId,
  payeeName,
  onUpdateStatus,
  onDeleteExpense,
  onEditExpense,
  onRequestAddPhone,
  onOpenQRModal,
  onSettleAllForPerson,
}: PersonDetailsModalProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [settling, setSettling] = useState(false);

  if (!isOpen || !personName) return null;

  // Filter expenses strictly for this person
  const personExpenses = expenses.filter(
    (e) =>
      e.person_name &&
      e.person_name.trim().toLowerCase() === personName.trim().toLowerCase()
  );

  // Latest phone associated with this person
  const currentPhone =
    personPhone ||
    personExpenses.find((e) => e.person_phone)?.person_phone ||
    '';

  // Calculate totals
  const pendingReceivables = personExpenses
    .filter((e) => e.status === 'pending' && e.direction !== 'i_owe')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const settledReceivables = personExpenses
    .filter((e) => e.status === 'received' && e.direction !== 'i_owe')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const pendingPayables = personExpenses
    .filter((e) => e.status === 'pending' && e.direction === 'i_owe')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const settledPayables = personExpenses
    .filter((e) => e.status === 'received' && e.direction === 'i_owe')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const netPending = pendingReceivables - pendingPayables;

  // Filtered list
  const filteredList = personExpenses.filter((e) => {
    if (filter === 'pending') return e.status === 'pending';
    if (filter === 'settled') return e.status === 'received';
    return true;
  });

  const pendingCount = personExpenses.filter((e) => e.status === 'pending').length;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // WhatsApp reminder handler
  const handleSendWhatsAppSummary = () => {
    const isReceivable = pendingReceivables >= pendingPayables;
    const totalAmount = isReceivable ? pendingReceivables : pendingPayables;
    const direction = isReceivable ? 'owes_me' : 'i_owe';

    if (!currentPhone) {
      onRequestAddPhone(personName, '');
      return;
    }

    const message = generatePersonSummaryWhatsAppMessage({
      personName,
      totalPending: totalAmount,
      expenses: personExpenses,
      upiId,
      payeeName,
      direction,
    });

    openWhatsApp(currentPhone, message);
  };

  const handleSendSingleExpenseWhatsApp = (expense: Expense) => {
    const phone = expense.person_phone || currentPhone;
    if (!phone) {
      onRequestAddPhone(personName, '');
      return;
    }

    const message = generateExpenseWhatsAppMessage({
      personName,
      amount: expense.amount,
      description: expense.description,
      upiId,
      payeeName,
    });

    openWhatsApp(phone, message);
  };

  const handleOpenTotalQR = () => {
    const desc =
      personExpenses.filter((e) => e.status === 'pending' && e.direction !== 'i_owe').length > 1
        ? `Settlement (${personExpenses.filter((e) => e.status === 'pending' && e.direction !== 'i_owe').length} items)`
        : personExpenses.find((e) => e.status === 'pending' && e.direction !== 'i_owe')?.description || 'Total Balance';

    onOpenQRModal({
      amount: pendingReceivables,
      description: desc,
      personName,
      personPhone: currentPhone,
    });
  };

  const handleSettleAll = async () => {
    if (!confirm(`Are you sure you want to mark all pending items for ${personName} as settled?`)) {
      return;
    }
    setSettling(true);
    if (pendingReceivables > 0) {
      await onSettleAllForPerson(personName, 'owes_me');
    }
    if (pendingPayables > 0) {
      await onSettleAllForPerson(personName, 'i_owe');
    }
    setSettling(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 md:p-6 backdrop-blur-xs animate-fade-in">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/60 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-extrabold text-base shadow-md shadow-indigo-500/20">
              {personName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
                  {personName}
                </h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {currentPhone ? (
                  <button
                    onClick={() => onRequestAddPhone(personName, currentPhone)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                    title="Click to edit WhatsApp number"
                  >
                    <Phone className="h-3 w-3" />
                    <span>{currentPhone}</span>
                    <Edit3 className="h-2.5 w-2.5 opacity-60 ml-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onRequestAddPhone(personName, '')}
                    className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add WhatsApp Number</span>
                  </button>
                )}
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  {personExpenses.length} {personExpenses.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Balance Cards */}
        <div className="p-4 md:p-5 border-b border-white/10 bg-slate-950/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Receivables Card (Owes You) */}
            <div className={`rounded-xl border p-3.5 transition ${
              pendingReceivables > 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-800/30 border-white/5 text-slate-400'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                  Owes You (Receivable)
                </span>
                {settledReceivables > 0 && (
                  <span className="text-[10px] text-slate-500">
                    Settled: ₹{settledReceivables.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-2xl font-extrabold text-white mt-1">
                ₹{pendingReceivables.toFixed(2)}
              </p>
            </div>

            {/* Payables Card (You Owe) */}
            <div className={`rounded-xl border p-3.5 transition ${
              pendingPayables > 0 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                : 'bg-slate-800/30 border-white/5 text-slate-400'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-rose-400" />
                  You Owe (Payable)
                </span>
                {settledPayables > 0 && (
                  <span className="text-[10px] text-slate-500">
                    Settled: ₹{settledPayables.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-2xl font-extrabold text-white mt-1">
                ₹{pendingPayables.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Net Balance indicator if both sides exist */}
          {pendingReceivables > 0 && pendingPayables > 0 && (
            <div className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold border ${
              netPending >= 0
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
            }`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Net Pending Difference
              </span>
              <span className="font-extrabold text-sm">
                {netPending >= 0 ? `They owe you net +₹${netPending.toFixed(2)}` : `You owe net -₹${Math.abs(netPending).toFixed(2)}`}
              </span>
            </div>
          )}

          {/* Quick Action Bar for Person */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Generate Total QR (when they owe money) */}
            {pendingReceivables > 0 && (
              <button
                onClick={handleOpenTotalQR}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-3.5 py-2 text-xs font-bold text-indigo-300 transition duration-150 cursor-pointer active:scale-98"
              >
                <QrCode className="h-4 w-4" />
                Generate Total QR (₹{pendingReceivables.toFixed(2)})
              </button>
            )}

            {/* Send WhatsApp Reminder */}
            {(pendingReceivables > 0 || pendingPayables > 0) && (
              <button
                onClick={handleSendWhatsAppSummary}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition duration-150 cursor-pointer active:scale-98 shadow-md shadow-emerald-500/20"
              >
                <Send className="h-4 w-4" />
                Send on WhatsApp
              </button>
            )}

            {/* Settle All Button */}
            {pendingCount > 0 && (
              <button
                onClick={handleSettleAll}
                disabled={settling}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 transition duration-150 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4 text-emerald-400" />
                Settle All Pending ({pendingCount})
              </button>
            )}
          </div>
        </div>

        {/* History Header & Filters */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 md:px-5 py-3 bg-slate-950/40">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Transaction History ({filteredList.length})
          </span>

          <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            {(['all', 'pending', 'settled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition cursor-pointer ${
                  filter === tab
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction History List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 custom-scrollbar">
          {filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <AlertCircle className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-400">No transactions found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {filter === 'all'
                  ? 'No entries recorded for this person yet.'
                  : `No ${filter} entries found.`}
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isPending = item.status === 'pending';
              const isOwesMe = item.direction !== 'i_owe';

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/90 p-3.5 transition duration-150 hover:border-white/20 hover:bg-slate-800/40"
                >
                  {/* Status indicator bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isOwesMe
                        ? isPending ? 'bg-amber-500' : 'bg-emerald-500'
                        : isPending ? 'bg-rose-500' : 'bg-slate-500'
                    }`}
                  />

                  <div className="flex items-start justify-between pl-1.5">
                    <div>
                      <h4 className="font-semibold text-white text-sm">
                        {item.description}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          {formatDate(item.created_at)}
                        </span>
                        <span className={`inline-flex items-center text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded-sm ${
                          isOwesMe
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/10'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/10'
                        }`}>
                          {isOwesMe ? 'Receivable' : 'Payable'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right pl-2">
                      <span className={`text-base font-extrabold ${
                        isOwesMe ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        ₹{Number(item.amount).toFixed(2)}
                      </span>
                      <div className="mt-1">
                        <button
                          onClick={() =>
                            onUpdateStatus(item.id, isPending ? 'received' : 'pending')
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                            isPending
                              ? isOwesMe
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title="Click to toggle status"
                        >
                          {isPending ? (
                            <>
                              <Clock className="h-2.5 w-2.5" />
                              Pending
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-2.5 w-2.5" />
                              {isOwesMe ? 'Received' : 'Paid'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-white/5 pt-2.5">
                    {/* Share QR (if owes me & pending) */}
                    {isOwesMe && (
                      <button
                        onClick={() =>
                          onOpenQRModal({
                            amount: Number(item.amount),
                            description: item.description,
                            personName: personName,
                            personPhone: currentPhone,
                          })
                        }
                        className="flex items-center gap-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-1 text-[11px] font-semibold text-indigo-300 transition cursor-pointer"
                        title="Generate QR code for this entry"
                      >
                        <QrCode className="h-3 w-3" />
                        QR
                      </button>
                    )}

                    {/* WhatsApp */}
                    <button
                      onClick={() => handleSendSingleExpenseWhatsApp(item)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-400 transition cursor-pointer"
                      title="Send WhatsApp for this entry"
                    >
                      <Send className="h-3 w-3" />
                      WhatsApp
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => onEditExpense(item)}
                      className="flex items-center gap-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-300 transition cursor-pointer"
                      title="Edit this entry"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.description}"?`)) {
                          onDeleteExpense(item.id);
                        }
                      }}
                      className="rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 p-1 text-red-400 transition cursor-pointer"
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
    </div>
  );
}
