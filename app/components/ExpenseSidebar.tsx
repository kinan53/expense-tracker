'use client';

import React, { useState } from 'react';
import { X, Users, Receipt } from 'lucide-react';
import ExpenseList from './ExpenseList';
import PeopleDirectory from './PeopleDirectory';
import BalanceCard from './BalanceCard';

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
  const [tab, setTab] = useState<'entries' | 'people'>('entries');

  const pendingReceivable = expenses
    .filter((e) => e.status === 'pending' && e.direction !== 'i_owe')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const pendingPayable = expenses
    .filter((e) => e.status === 'pending' && e.direction === 'i_owe')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const netBalance = pendingReceivable - pendingPayable;

  const content = (
    <div className="flex h-full flex-col bg-[#090a0f] text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] p-4 shrink-0">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white">
            Ledger & Activity
          </h2>
          <p className="text-[11px] text-zinc-500">
            {expenses.length} recorded entries
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 hover:text-white md:hidden cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Balance Card */}
      <div className="p-4 border-b border-white/[0.06] shrink-0">
        <BalanceCard
          pendingReceivable={pendingReceivable}
          pendingPayable={pendingPayable}
          netBalance={netBalance}
          onFilterReceivable={() => setTab('people')}
          onFilterPayable={() => setTab('people')}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] px-4 pt-2 bg-[#0c0d12] shrink-0">
        <button
          onClick={() => setTab('entries')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            tab === 'entries'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          <span>All Entries ({expenses.length})</span>
        </button>
        <button
          onClick={() => setTab('people')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer ${
            tab === 'people'
              ? 'border-white text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>By Person</span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {tab === 'entries' ? (
          <ExpenseList
            expenses={expenses}
            loading={loading}
            onUpdateStatus={onUpdateStatus}
            onDeleteExpense={onDeleteExpense}
            onEditExpense={onEditExpense}
            onOpenQRModal={onOpenQRModal}
            onSelectPerson={onSelectPerson}
            onRequestAddPhone={onRequestAddPhone}
            upiId={upiId}
            payeeName={payeeName}
          />
        ) : (
          <PeopleDirectory
            expenses={expenses}
            onSelectPerson={onSelectPerson}
            onRequestAddPhone={onRequestAddPhone}
            upiId={upiId}
            payeeName={payeeName}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Panel */}
      <aside className="hidden w-80 lg:w-96 shrink-0 border-l border-white/[0.06] md:flex flex-col h-screen sticky top-0 bg-[#090a0f]">
        {content}
      </aside>

      {/* Mobile Bottom Sheet / Drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity md:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      >
        <div
          className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#090a0f] shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>
    </>
  );
}
