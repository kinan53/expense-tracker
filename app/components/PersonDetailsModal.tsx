'use client';

import React, { useState } from 'react';
import {
  X,
  QrCode,
  Send,
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

  const personExpenses = expenses.filter(
    (e) =>
      e.person_name &&
      e.person_name.trim().toLowerCase() === personName.trim().toLowerCase()
  );

  const currentPhone =
    personPhone ||
    personExpenses.find((e) => e.person_phone)?.person_phone ||
    '';

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
      });
    } catch {
      return dateStr;
    }
  };

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
        : personExpenses.find((e) => e.status === 'pending' && e.direction !== 'i_owe')?.description || 'Balance';

    onOpenQRModal({
      amount: pendingReceivables,
      description: desc,
      personName,
      personPhone: currentPhone,
    });
  };

  const handleSettleAll = async () => {
    if (!confirm(`Mark all pending entries for ${personName} as settled?`)) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-white/10 bg-[#12141a] shadow-2xl safe-area-bottom z-10 max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Mobile handle indicator */}
        <div className="mx-auto mb-2 mt-3 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4 sm:p-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-white font-semibold text-sm">
              {personName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-white leading-tight">
                {personName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {currentPhone ? (
                  <button
                    onClick={() => onRequestAddPhone(personName, currentPhone)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <Phone className="h-2.5 w-2.5" />
                    <span>{currentPhone}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onRequestAddPhone(personName, '')}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>Add Phone</span>
                  </button>
                )}
                <span className="text-zinc-600 text-[10px]">•</span>
                <span className="text-[11px] text-zinc-500">
                  {personExpenses.length} {personExpenses.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary Balance & Quick Actions */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#0d0e14] shrink-0 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                <span>Owes you</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-white mt-0.5">
                ₹{pendingReceivables.toFixed(2)}
              </p>
              {settledReceivables > 0 && (
                <span className="text-[10px] text-zinc-500">
                  Settled: ₹{settledReceivables.toFixed(0)}
                </span>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                <ArrowDownLeft className="h-3 w-3 text-rose-400" />
                <span>You owe</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-white mt-0.5">
                ₹{pendingPayables.toFixed(2)}
              </p>
              {settledPayables > 0 && (
                <span className="text-[10px] text-zinc-500">
                  Settled: ₹{settledPayables.toFixed(0)}
                </span>
              )}
            </div>
          </div>

          {/* Net Note */}
          {pendingReceivables > 0 && pendingPayables > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs">
              <span className="text-zinc-400">Net Balance</span>
              <span className="font-semibold text-white tabular-nums">
                {netPending >= 0 ? `+₹${netPending.toFixed(2)}` : `-₹${Math.abs(netPending).toFixed(2)}`}
              </span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap gap-2 pt-1">
            {pendingReceivables > 0 && (
              <button
                onClick={handleOpenTotalQR}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2 text-xs font-medium text-white transition cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Total QR (₹{pendingReceivables.toFixed(0)})</span>
              </button>
            )}

            {(pendingReceivables > 0 || pendingPayables > 0) && (
              <button
                onClick={handleSendWhatsAppSummary}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2 text-xs font-semibold text-zinc-950 transition cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>WhatsApp Summary</span>
              </button>
            )}

            {pendingCount > 0 && (
              <button
                onClick={handleSettleAll}
                disabled={settling}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2 text-xs font-medium text-zinc-300 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Settle All ({pendingCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5 bg-[#12141a] shrink-0">
          <span className="text-xs text-zinc-400 font-medium">
            History ({filteredList.length})
          </span>
          <div className="flex rounded-lg bg-white/[0.04] p-0.5">
            {(['all', 'pending', 'settled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-md px-2.5 py-1 text-xs capitalize transition cursor-pointer ${
                  filter === tab
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 custom-scrollbar">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <AlertCircle className="mx-auto h-6 w-6 text-zinc-600 mb-1.5" />
              <p className="text-xs">No transactions in this view</p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isPending = item.status === 'pending';
              const isOwesMe = item.direction !== 'i_owe';

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-medium text-white line-clamp-1">
                        {item.description}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDate(item.created_at)}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-sm ${
                          isOwesMe
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {isOwesMe ? 'Receivable' : 'Payable'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-semibold tabular-nums ${
                        isOwesMe ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isOwesMe ? '+' : '-'}₹{Number(item.amount).toFixed(2)}
                      </span>
                      <div className="mt-1">
                        <button
                          onClick={() =>
                            onUpdateStatus(item.id, isPending ? 'received' : 'pending')
                          }
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition cursor-pointer ${
                            isPending
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {isPending ? 'Pending' : 'Settled'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions for this row */}
                  <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-white/[0.04] pt-2">
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
                        className="rounded-lg bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 text-[11px] text-zinc-300 transition cursor-pointer flex items-center gap-1"
                        title="QR Code"
                      >
                        <QrCode className="h-3 w-3" />
                        <span>QR</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSendSingleExpenseWhatsApp(item)}
                      className="rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 text-[11px] transition cursor-pointer flex items-center gap-1"
                      title="WhatsApp Reminder"
                    >
                      <Send className="h-3 w-3" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => onEditExpense(item)}
                      className="rounded-lg p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete "${item.description}"?`)) {
                          onDeleteExpense(item.id);
                        }
                      }}
                      className="rounded-lg p-1 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                      title="Delete"
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
    </div>
  );
}
