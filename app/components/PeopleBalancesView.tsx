'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  Send,
  History,
  Phone,
  Plus,
  AlertCircle,
} from 'lucide-react';
import {
  generatePersonSummaryWhatsAppMessage,
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

interface PersonSummary {
  name: string;
  phone: string;
  pendingReceivables: number;
  settledReceivables: number;
  pendingPayables: number;
  settledPayables: number;
  totalPendingCount: number;
  totalSettledCount: number;
  allExpenses: Expense[];
}

interface PeopleBalancesViewProps {
  expenses: Expense[];
  activeTab: 'owes_me' | 'i_owe';
  onTabChange: (tab: 'owes_me' | 'i_owe') => void;
  onSelectPerson: (personName: string, personPhone?: string) => void;
  onOpenQRModal: (data: {
    amount: number;
    description: string;
    personName: string;
    personPhone: string;
  }) => void;
  onRequestAddPhone: (personName: string, currentPhone?: string) => void;
  onAddNewEntry: () => void;
  upiId: string;
  payeeName: string;
}

export default function PeopleBalancesView({
  expenses,
  activeTab,
  onTabChange,
  onSelectPerson,
  onOpenQRModal,
  onRequestAddPhone,
  onAddNewEntry,
  upiId,
  payeeName,
}: PeopleBalancesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Group all expenses by person name
  const peopleMap = useMemo(() => {
    const map = new Map<string, PersonSummary>();

    for (const exp of expenses) {
      if (!exp.person_name || !exp.person_name.trim()) continue;
      const cleanName = exp.person_name.trim();
      const lowerKey = cleanName.toLowerCase();

      if (!map.has(lowerKey)) {
        map.set(lowerKey, {
          name: cleanName,
          phone: exp.person_phone || '',
          pendingReceivables: 0,
          settledReceivables: 0,
          pendingPayables: 0,
          settledPayables: 0,
          totalPendingCount: 0,
          totalSettledCount: 0,
          allExpenses: [],
        });
      }

      const summary = map.get(lowerKey)!;
      summary.allExpenses.push(exp);

      if (exp.person_phone && !summary.phone) {
        summary.phone = exp.person_phone;
      }

      const isPending = exp.status === 'pending';
      const isOwesMe = exp.direction !== 'i_owe';
      const amt = Number(exp.amount) || 0;

      if (isOwesMe) {
        if (isPending) {
          summary.pendingReceivables += amt;
          summary.totalPendingCount += 1;
        } else {
          summary.settledReceivables += amt;
          summary.totalSettledCount += 1;
        }
      } else {
        if (isPending) {
          summary.pendingPayables += amt;
          summary.totalPendingCount += 1;
        } else {
          summary.settledPayables += amt;
          summary.totalSettledCount += 1;
        }
      }
    }

    return Array.from(map.values());
  }, [expenses]);

  // Overall totals
  const totalReceivables = useMemo(() => {
    return peopleMap.reduce((sum, p) => sum + p.pendingReceivables, 0);
  }, [peopleMap]);

  const totalPayables = useMemo(() => {
    return peopleMap.reduce((sum, p) => sum + p.pendingPayables, 0);
  }, [peopleMap]);

  // Filter list by active tab and search term
  const filteredPeople = useMemo(() => {
    return peopleMap
      .filter((person) => {
        const matchesSearch =
          person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          person.phone.includes(searchTerm);

        if (!matchesSearch) return false;

        if (activeTab === 'owes_me') {
          // Show people with receivables (pending or settled with this direction)
          return person.pendingReceivables > 0 || person.settledReceivables > 0;
        } else {
          // Show people with payables (pending or settled with this direction)
          return person.pendingPayables > 0 || person.settledPayables > 0;
        }
      })
      .sort((a, b) => {
        // Sort by pending amount descending
        if (activeTab === 'owes_me') {
          return b.pendingReceivables - a.pendingReceivables;
        }
        return b.pendingPayables - a.pendingPayables;
      });
  }, [peopleMap, activeTab, searchTerm]);

  // Handle WhatsApp reminder for a person
  const handleWhatsAppClick = (person: PersonSummary) => {
    if (!person.phone) {
      onRequestAddPhone(person.name, '');
      return;
    }

    const isReceivable = activeTab === 'owes_me';
    const amount = isReceivable ? person.pendingReceivables : person.pendingPayables;

    const message = generatePersonSummaryWhatsAppMessage({
      personName: person.name,
      totalPending: amount,
      expenses: person.allExpenses,
      upiId,
      payeeName,
      direction: activeTab,
    });

    openWhatsApp(person.phone, message);
  };

  return (
    <div className="w-full space-y-5 animate-fade-in">
      {/* Top Header & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            Person Balances & Ledgers
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View grouped totals, detailed histories, QR codes, and WhatsApp reminders
          </p>
        </div>

        {/* Tab Toggle: Who Owes Me vs I Owe */}
        <div className="flex p-1 bg-slate-900 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => onTabChange('owes_me')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'owes_me'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
            Who Owes Me ({peopleMap.filter((p) => p.pendingReceivables > 0).length})
          </button>
          <button
            onClick={() => onTabChange('i_owe')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'i_owe'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5 text-rose-400" />
            I Owe Someone ({peopleMap.filter((p) => p.pendingPayables > 0).length})
          </button>
        </div>
      </div>

      {/* Aggregate Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Active Tab Total */}
        <div
          className={`rounded-2xl border p-4.5 backdrop-blur-md transition ${
            activeTab === 'owes_me'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              {activeTab === 'owes_me' ? 'Total People Owe You' : 'Total You Owe People'}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
              {filteredPeople.filter((p) => (activeTab === 'owes_me' ? p.pendingReceivables > 0 : p.pendingPayables > 0)).length} People
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white mt-1.5">
            ₹{activeTab === 'owes_me' ? totalReceivables.toFixed(2) : totalPayables.toFixed(2)}
          </p>
        </div>

        {/* Search Input Box */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4.5 flex flex-col justify-center">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Search People
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by person name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-hidden transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* People Grid */}
      {filteredPeople.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-10 text-center flex flex-col items-center justify-center">
          <div className="rounded-full bg-white/5 p-4 text-slate-500 mb-3">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-white">
            {searchTerm ? 'No matching people found' : `No ${activeTab === 'owes_me' ? 'Receivable' : 'Payable'} records`}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
            {searchTerm
              ? 'Try changing your search keywords.'
              : `You haven't recorded any entries where ${
                  activeTab === 'owes_me' ? 'someone owes you' : 'you owe someone'
                }.`}
          </p>
          <button
            onClick={onAddNewEntry}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-600 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredPeople.map((person) => {
            const pendingAmount =
              activeTab === 'owes_me'
                ? person.pendingReceivables
                : person.pendingPayables;
            const settledAmount =
              activeTab === 'owes_me'
                ? person.settledReceivables
                : person.settledPayables;

            const isFullySettled = pendingAmount === 0;

            return (
              <div
                key={person.name}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-sm transition duration-200 hover:border-white/20 hover:bg-slate-900"
              >
                {/* Visual side accent */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isFullySettled
                      ? 'bg-slate-600'
                      : activeTab === 'owes_me'
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                />

                {/* Top Person Info */}
                <div>
                  <div className="flex items-start justify-between gap-2 pl-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 text-indigo-300 font-extrabold text-sm">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-tight">
                          {person.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {person.phone ? (
                            <button
                              onClick={() => onRequestAddPhone(person.name, person.phone)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                              title="Click to edit phone"
                            >
                              <Phone className="h-2.5 w-2.5" />
                              {person.phone}
                            </button>
                          ) : (
                            <button
                              onClick={() => onRequestAddPhone(person.name, '')}
                              className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                            >
                              <Plus className="h-2.5 w-2.5" />
                              Add Phone
                            </button>
                          )}
                          <span className="text-[10px] text-slate-500">
                            {person.allExpenses.length} total entries
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pending Amount Badge */}
                    <div className="text-right">
                      <span
                        className={`text-xl font-extrabold block leading-tight ${
                          isFullySettled
                            ? 'text-slate-400'
                            : activeTab === 'owes_me'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        ₹{pendingAmount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {isFullySettled ? 'All Settled' : 'Pending Total'}
                      </span>
                    </div>
                  </div>

                  {/* Summary counts pill */}
                  <div className="mt-3.5 flex items-center gap-2 text-xs text-slate-400 pl-1">
                    {settledAmount > 0 && (
                      <span className="text-[11px] text-slate-500">
                        Settled: ₹{settledAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3.5">
                  {/* View Details Button */}
                  <button
                    onClick={() => onSelectPerson(person.name, person.phone)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2 px-3 text-xs font-bold text-slate-200 transition cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-indigo-400" />
                    Details & History
                  </button>

                  {/* Generate QR Button (For Receivables when pending > 0) */}
                  {activeTab === 'owes_me' && pendingAmount > 0 && (
                    <button
                      onClick={() =>
                        onOpenQRModal({
                          amount: pendingAmount,
                          description: `Total Settlement for ${person.name}`,
                          personName: person.name,
                          personPhone: person.phone,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/25 py-2 px-3 text-xs font-bold text-indigo-300 transition cursor-pointer"
                      title="Generate QR code for total amount"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      QR
                    </button>
                  )}

                  {/* WhatsApp Button */}
                  {pendingAmount > 0 && (
                    <button
                      onClick={() => handleWhatsAppClick(person)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 py-2 px-3 text-xs font-bold text-emerald-400 transition cursor-pointer"
                      title="Send summary to WhatsApp"
                    >
                      <Send className="h-3.5 w-3.5" />
                      WhatsApp
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
