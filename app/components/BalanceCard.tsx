'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface BalanceCardProps {
  pendingReceivable: number;
  pendingPayable: number;
  netBalance: number;
  onFilterReceivable?: () => void;
  onFilterPayable?: () => void;
}

export default function BalanceCard({
  pendingReceivable,
  pendingPayable,
  netBalance,
  onFilterReceivable,
  onFilterPayable,
}: BalanceCardProps) {
  const isPositive = netBalance >= 0;

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#12141a] p-4 sm:p-5">
      {/* Top Header: Net Balance */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          Net Pending Balance
        </span>
        <span
          className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${
            netBalance === 0
              ? 'bg-zinc-800 text-zinc-400'
              : isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {netBalance === 0 ? 'All settled' : isPositive ? 'In your favor' : 'You owe balance'}
        </span>
      </div>

      <div className="mt-2">
        <span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-white">
          {netBalance < 0 ? '-' : ''}₹{Math.abs(netBalance).toFixed(2)}
        </span>
      </div>

      {/* Sub Split Cards */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.04]">
        {/* Receivables Card */}
        <button
          type="button"
          onClick={onFilterReceivable}
          className="flex flex-col text-left rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] p-2.5 sm:p-3 transition cursor-pointer"
        >
          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
            <ArrowUpRight className="h-3 w-3 text-emerald-400" />
            <span>Owed to you</span>
          </div>
          <span className="mt-1 text-sm sm:text-base font-semibold tabular-nums text-emerald-400">
            ₹{pendingReceivable.toFixed(2)}
          </span>
        </button>

        {/* Payables Card */}
        <button
          type="button"
          onClick={onFilterPayable}
          className="flex flex-col text-left rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] p-2.5 sm:p-3 transition cursor-pointer"
        >
          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
            <ArrowDownLeft className="h-3 w-3 text-rose-400" />
            <span>You owe</span>
          </div>
          <span className="mt-1 text-sm sm:text-base font-semibold tabular-nums text-rose-400">
            ₹{pendingPayable.toFixed(2)}
          </span>
        </button>
      </div>
    </div>
  );
}
