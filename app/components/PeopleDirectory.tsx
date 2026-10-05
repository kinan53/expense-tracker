'use client';

import React, { useState, useMemo } from 'react';
import { Search, Users, Phone, ChevronRight, X, Send } from 'lucide-react';
import { generatePersonSummaryWhatsAppMessage, openWhatsApp } from '../lib/whatsapp';

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

interface PeopleDirectoryProps {
  expenses: Expense[];
  onSelectPerson: (personName: string, personPhone?: string) => void;
  onRequestAddPhone: (personName: string, currentPhone?: string) => void;
  upiId: string;
  payeeName: string;
}

export default function PeopleDirectory({
  expenses,
  onSelectPerson,
  onRequestAddPhone,
  upiId,
  payeeName,
}: PeopleDirectoryProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owes_me' | 'i_owe' | 'settled'>('all');

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        pendingOwesMe: number;
        pendingIOwe: number;
        settledCount: number;
        pendingCount: number;
        totalCount: number;
      }
    >();

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
          settledCount: 0,
          pendingCount: 0,
          totalCount: 0,
        });
      }

      const p = map.get(key)!;
      p.totalCount++;
      if (exp.person_phone && !p.phone) p.phone = exp.person_phone;

      if (exp.status === 'pending') {
        p.pendingCount++;
        if (exp.direction === 'i_owe') {
          p.pendingIOwe += Number(exp.amount) || 0;
        } else {
          p.pendingOwesMe += Number(exp.amount) || 0;
        }
      } else {
        p.settledCount++;
      }
    }

    return Array.from(map.values())
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.phone.includes(search);

        if (!matchesSearch) return false;

        if (filterType === 'owes_me') return p.pendingOwesMe > 0;
        if (filterType === 'i_owe') return p.pendingIOwe > 0;
        if (filterType === 'settled') return p.pendingOwesMe === 0 && p.pendingIOwe === 0;

        return true;
      })
      .sort((a, b) => b.pendingOwesMe + b.pendingIOwe - (a.pendingOwesMe + a.pendingIOwe));
  }, [expenses, search, filterType]);

  const handleQuickWhatsApp = (
    e: React.MouseEvent,
    person: { name: string; phone: string; pendingOwesMe: number; pendingIOwe: number }
  ) => {
    e.stopPropagation();
    if (!person.phone) {
      onRequestAddPhone(person.name, '');
      return;
    }

    const personExpenses = expenses.filter(
      (exp) =>
        exp.person_name &&
        exp.person_name.trim().toLowerCase() === person.name.toLowerCase()
    );

    const isReceivable = person.pendingOwesMe >= person.pendingIOwe;
    const totalAmount = isReceivable ? person.pendingOwesMe : person.pendingIOwe;

    const message = generatePersonSummaryWhatsAppMessage({
      personName: person.name,
      totalPending: totalAmount,
      expenses: personExpenses,
      upiId,
      payeeName,
      direction: isReceivable ? 'owes_me' : 'i_owe',
    });

    openWhatsApp(person.phone, message);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search people..."
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

      {/* Filter Chips */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        {(
          [
            { key: 'all', label: 'All Contacts' },
            { key: 'owes_me', label: 'Owes Me' },
            { key: 'i_owe', label: 'I Owe' },
            { key: 'settled', label: 'Settled' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setFilterType(item.key)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer shrink-0 ${
              filterType === item.key
                ? 'bg-white/10 text-white'
                : 'text-zinc-400 hover:text-zinc-200 bg-white/[0.02]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* People List */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#12141a]/60 py-12 px-4 text-center">
          <Users className="mx-auto h-6 w-6 text-zinc-600 mb-2" />
          <p className="text-xs font-medium text-zinc-300">No contacts found</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {search
              ? 'No one matches your search term.'
              : 'Add an expense with a person name to build your ledger directory.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((person) => {
            const hasPending = person.pendingOwesMe > 0 || person.pendingIOwe > 0;

            return (
              <div
                key={person.name}
                onClick={() => onSelectPerson(person.name, person.phone)}
                className="group flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#12141a] p-3.5 sm:p-4 hover:border-white/10 hover:bg-[#161821] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] border border-white/10 font-semibold text-xs text-white">
                    {person.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-medium text-white truncate">
                      {person.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                      {person.phone ? (
                        <span className="flex items-center gap-0.5 text-zinc-400">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{person.phone}</span>
                        </span>
                      ) : (
                        <span>No phone</span>
                      )}
                      <span>•</span>
                      <span>
                        {person.totalCount} {person.totalCount === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {person.pendingOwesMe > 0 && (
                      <span className="block text-xs sm:text-sm font-semibold text-emerald-400 tabular-nums">
                        +₹{person.pendingOwesMe.toFixed(2)}
                      </span>
                    )}
                    {person.pendingIOwe > 0 && (
                      <span className="block text-xs sm:text-sm font-semibold text-rose-400 tabular-nums">
                        -₹{person.pendingIOwe.toFixed(2)}
                      </span>
                    )}
                    {!hasPending && (
                      <span className="text-[11px] text-zinc-500">Settled</span>
                    )}
                  </div>

                  {hasPending && (
                    <button
                      onClick={(e) => handleQuickWhatsApp(e, person)}
                      className="rounded-lg p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                      title="Send WhatsApp Summary"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
