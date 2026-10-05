'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings,
  LogOut,
  Plus,
  Receipt,
  Users,
  AlertCircle,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { openWhatsApp, generatePersonSummaryWhatsAppMessage } from './lib/whatsapp';

// Components
import LoginScreen from './components/LoginScreen';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseList from './components/ExpenseList';
import PeopleDirectory from './components/PeopleDirectory';
import BalanceCard from './components/BalanceCard';
import PersonDetailsModal from './components/PersonDetailsModal';
import AddPhoneModal from './components/AddPhoneModal';
import QRModal from './components/QRModal';
import SettingsModal from './components/SettingsModal';
import EditExpenseModal from './components/EditExpenseModal';

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

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Global Config Sync
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');

  // Mobile navigation tab: 'activity' | 'add' | 'people'
  const [activeTab, setActiveTab] = useState<'activity' | 'add' | 'people'>('activity');

  // Desktop right-panel tab: 'add' | 'people'
  const [desktopRightTab, setDesktopRightTab] = useState<'add' | 'people'>('add');

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Person Details Ledger Modal
  const [selectedPerson, setSelectedPerson] = useState<{
    name: string;
    phone?: string;
  } | null>(null);

  // Add Phone Modal
  const [phoneModalState, setPhoneModalState] = useState<{
    isOpen: boolean;
    personName: string;
    currentPhone?: string;
  }>({
    isOpen: false,
    personName: '',
    currentPhone: '',
  });

  // QR Code details
  const [qrData, setQrData] = useState<{
    amount: number;
    description: string;
    personName: string;
    personPhone: string;
  }>({
    amount: 0,
    description: '',
    personName: '',
    personPhone: '',
  });

  // Edit details
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Compute contacts list for autocomplete suggestions
  const contacts = useMemo(() => {
    const list: { name: string; phone: string }[] = [];
    const seen = new Set<string>();

    for (const exp of expenses) {
      if (exp.person_name) {
        const nameClean = exp.person_name.trim();
        const nameLower = nameClean.toLowerCase();
        if (!seen.has(nameLower)) {
          seen.add(nameLower);
          list.push({
            name: nameClean,
            phone: exp.person_phone || '',
          });
        }
      }
    }
    return list;
  }, [expenses]);

  // Balance computations
  const { pendingReceivable, pendingPayable, netBalance } = useMemo(() => {
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

  // Verify auth on mount and load cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('expense_tracker_auth');
      setIsAuthenticated(auth === 'true');

      // Load cached expenses immediately
      const cached = localStorage.getItem('expense_tracker_cached_expenses');
      if (cached) {
        try {
          setExpenses(JSON.parse(cached));
          setLoading(false);
        } catch (e) {
          console.warn('Failed to parse cached expenses:', e);
        }
      }
    }
  }, []);

  // Fetch shared configurations from Supabase or fallback
  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data) {
        setUpiId(data.upi_id || '');
        setPayeeName(data.payee_name || '');
        localStorage.setItem('expense_tracker_upi_id', data.upi_id || '');
        localStorage.setItem('expense_tracker_payee_name', data.payee_name || '');
      } else {
        setUpiId(localStorage.getItem('expense_tracker_upi_id') || '');
        setPayeeName(localStorage.getItem('expense_tracker_payee_name') || '');
      }
    } catch (err) {
      console.warn('Failed to load settings from database:', err);
      setUpiId(localStorage.getItem('expense_tracker_upi_id') || '');
      setPayeeName(localStorage.getItem('expense_tracker_payee_name') || '');
    }
  }, []);

  // Fetch expenses from Supabase
  const fetchExpenses = useCallback(async () => {
    if (!isAuthenticated) return;

    const hasCache = expenses.length > 0;
    if (!hasCache) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const fetchedExpenses = data || [];
      setExpenses(fetchedExpenses);
      localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(fetchedExpenses));
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, expenses.length]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchExpenses();
      fetchSettings();
    }
  }, [isAuthenticated, fetchExpenses, fetchSettings]);

  // Realtime Syncing
  useEffect(() => {
    if (!isAuthenticated) return;

    const expensesChannel = supabase
      .channel('expenses-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel('settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [isAuthenticated, fetchExpenses, fetchSettings]);

  // Status toggle
  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'received') => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setExpenses((prev) => {
        const updated = prev.map((exp) =>
          exp.id === id ? { ...exp, status: newStatus } : exp
        );
        localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Failed to update expense status:', err);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      setExpenses((prev) => {
        const updated = prev.filter((exp) => exp.id !== id);
        localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // Save edited expense
  const handleEditSave = async (
    id: string,
    updatedFields: {
      description: string;
      amount: number;
      person_name: string | null;
      person_phone: string | null;
      direction: string;
      status: string;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update(updatedFields)
        .eq('id', id);

      if (error) throw error;

      setExpenses((prev) => {
        const updated = prev.map((exp) =>
          exp.id === id ? { ...exp, ...updatedFields } : exp
        );
        localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(updated));
        return updated;
      });
      return true;
    } catch (err) {
      console.error('Failed to update expense:', err);
      return false;
    }
  };

  // Update phone number
  const handleUpdatePersonPhone = async (personName: string, newPhone: string) => {
    const cleanName = personName.trim();
    const cleanPhone = newPhone.trim();

    try {
      const { error } = await supabase
        .from('expenses')
        .update({ person_phone: cleanPhone })
        .ilike('person_name', cleanName);

      if (error) throw error;
    } catch (err) {
      console.warn('Database phone update note:', err);
    }

    setExpenses((prev) => {
      const updated = prev.map((exp) =>
        exp.person_name &&
        exp.person_name.trim().toLowerCase() === cleanName.toLowerCase()
          ? { ...exp, person_phone: cleanPhone }
          : exp
      );
      localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(updated));
      return updated;
    });

    if (
      selectedPerson &&
      selectedPerson.name.toLowerCase() === cleanName.toLowerCase()
    ) {
      setSelectedPerson((prev) => (prev ? { ...prev, phone: cleanPhone } : null));
    }

    if (
      qrData.personName &&
      qrData.personName.toLowerCase() === cleanName.toLowerCase()
    ) {
      setQrData((prev) => ({ ...prev, personPhone: cleanPhone }));
    }

    const personExpenses = expenses.filter(
      (e) =>
        e.person_name &&
        e.person_name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    const pendingRec = personExpenses
      .filter((e) => e.status === 'pending' && e.direction !== 'i_owe')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const pendingPay = personExpenses
      .filter((e) => e.status === 'pending' && e.direction === 'i_owe')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const isReceivable = pendingRec >= pendingPay;
    const totalAmount = isReceivable ? pendingRec : pendingPay;

    const message = generatePersonSummaryWhatsAppMessage({
      personName: cleanName,
      totalPending: totalAmount > 0 ? totalAmount : (qrData.amount || 0),
      expenses: personExpenses,
      upiId,
      payeeName,
      direction: isReceivable ? 'owes_me' : 'i_owe',
    });

    openWhatsApp(cleanPhone, message);
  };

  // Settle all pending expenses for a person
  const handleSettleAllForPerson = async (
    personName: string,
    direction: 'owes_me' | 'i_owe'
  ): Promise<boolean> => {
    const cleanName = personName.trim();
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: 'received' })
        .ilike('person_name', cleanName)
        .eq('direction', direction)
        .eq('status', 'pending');

      if (error) throw error;

      setExpenses((prev) => {
        const updated = prev.map((exp) => {
          if (
            exp.person_name &&
            exp.person_name.trim().toLowerCase() === cleanName.toLowerCase() &&
            (exp.direction || 'owes_me') === direction &&
            exp.status === 'pending'
          ) {
            return { ...exp, status: 'received' };
          }
          return exp;
        });
        localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(updated));
        return updated;
      });
      return true;
    } catch (err) {
      console.error('Failed to settle all expenses for person:', err);
      return false;
    }
  };

  const handleOpenQRModal = (data: {
    amount: number;
    description: string;
    personName: string;
    personPhone: string;
  }) => {
    setQrData(data);
    setQrOpen(true);
  };

  const handleSelectPerson = (name: string, phone?: string) => {
    setSelectedPerson({ name, phone });
  };

  const handleRequestAddPhone = (name: string, currentPhone?: string) => {
    setPhoneModalState({
      isOpen: true,
      personName: name,
      currentPhone: currentPhone || '',
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('expense_tracker_auth');
    setIsAuthenticated(false);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Initial Auth Loading
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#090a0f] text-zinc-500">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
      </div>
    );
  }

  // Password Lock
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-[#090a0f] text-zinc-100 antialiased selection:bg-white/10 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#090a0f]/85 backdrop-blur-md safe-area-top">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-white">
              Ledger
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              ({expenses.length})
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {!upiId && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/15 transition cursor-pointer"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Configure UPI</span>
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="Lock / Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* UPI Missing Warning Banner for Mobile */}
      {!upiId && (
        <div className="sm:hidden px-4 pt-3">
          <div
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Tap to configure your UPI ID for QR payments</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-400">Setup</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        {/* Desktop Layout (md and above): 2-Column Responsive Workspace */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-6 items-start">
          {/* Left Column (7 cols): Balance Card + Expense Feed */}
          <div className="md:col-span-7 space-y-4">
            <BalanceCard
              pendingReceivable={pendingReceivable}
              pendingPayable={pendingPayable}
              netBalance={netBalance}
              onFilterReceivable={() => setDesktopRightTab('people')}
              onFilterPayable={() => setDesktopRightTab('people')}
            />

            <div className="pt-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Activity Feed
              </h2>
              <ExpenseList
                expenses={expenses}
                loading={loading}
                onUpdateStatus={handleUpdateStatus}
                onDeleteExpense={handleDeleteExpense}
                onEditExpense={(expense) => {
                  setEditingExpense(expense);
                  setEditOpen(true);
                }}
                onOpenQRModal={handleOpenQRModal}
                onSelectPerson={handleSelectPerson}
                onRequestAddPhone={handleRequestAddPhone}
                upiId={upiId}
                payeeName={payeeName}
              />
            </div>
          </div>

          {/* Right Column (5 cols): Switcher between "New Entry" and "People Directory" */}
          <div className="md:col-span-5 space-y-4 sticky top-20">
            {/* Desktop Segmented Tab Switcher */}
            <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.04]">
              <button
                type="button"
                onClick={() => setDesktopRightTab('add')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                  desktopRightTab === 'add'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Entry</span>
              </button>
              <button
                type="button"
                onClick={() => setDesktopRightTab('people')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                  desktopRightTab === 'people'
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>People & Ledgers</span>
              </button>
            </div>

            {/* Desktop Right Content */}
            {desktopRightTab === 'add' ? (
              <AddExpenseForm
                onExpenseAdded={fetchExpenses}
                onOpenQRModal={handleOpenQRModal}
                contacts={contacts}
              />
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-[#12141a] p-4 sm:p-5">
                <h3 className="text-sm font-semibold tracking-tight text-white mb-3">
                  People Directory
                </h3>
                <PeopleDirectory
                  expenses={expenses}
                  onSelectPerson={handleSelectPerson}
                  onRequestAddPhone={handleRequestAddPhone}
                  upiId={upiId}
                  payeeName={payeeName}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout (< md): Smooth Single Screen Flow tailored for iPhone 15 */}
        <div className="md:hidden space-y-4">
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <BalanceCard
                pendingReceivable={pendingReceivable}
                pendingPayable={pendingPayable}
                netBalance={netBalance}
                onFilterReceivable={() => setActiveTab('people')}
                onFilterPayable={() => setActiveTab('people')}
              />

              <div className="pt-1">
                <ExpenseList
                  expenses={expenses}
                  loading={loading}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteExpense={handleDeleteExpense}
                  onEditExpense={(expense) => {
                    setEditingExpense(expense);
                    setEditOpen(true);
                  }}
                  onOpenQRModal={handleOpenQRModal}
                  onSelectPerson={handleSelectPerson}
                  onRequestAddPhone={handleRequestAddPhone}
                  upiId={upiId}
                  payeeName={payeeName}
                />
              </div>
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-4">
              <AddExpenseForm
                onExpenseAdded={() => {
                  fetchExpenses();
                  setActiveTab('activity');
                }}
                onOpenQRModal={handleOpenQRModal}
                contacts={contacts}
                onCancel={() => setActiveTab('activity')}
              />
            </div>
          )}

          {activeTab === 'people' && (
            <div className="space-y-4">
              <BalanceCard
                pendingReceivable={pendingReceivable}
                pendingPayable={pendingPayable}
                netBalance={netBalance}
              />

              <div className="pt-1">
                <PeopleDirectory
                  expenses={expenses}
                  onSelectPerson={handleSelectPerson}
                  onRequestAddPhone={handleRequestAddPhone}
                  upiId={upiId}
                  payeeName={payeeName}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Floating Bottom Bar for iPhone 15 ergonomics */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.08] bg-[#0c0d12]/95 backdrop-blur-lg safe-area-bottom">
        <div className="flex items-center justify-around px-4 py-2">
          {/* Feed Tab */}
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex flex-col items-center gap-1 py-1 px-4 text-[11px] font-medium transition cursor-pointer ${
              activeTab === 'activity' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Activity</span>
          </button>

          {/* Quick Add Action (Prominent) */}
          <button
            onClick={() => setActiveTab('add')}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition cursor-pointer active:scale-95 shadow-lg ${
              activeTab === 'add'
                ? 'bg-white text-zinc-950 font-bold'
                : 'bg-white text-zinc-950 hover:bg-zinc-200'
            }`}
            title="Add New Entry"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>

          {/* People Tab */}
          <button
            onClick={() => setActiveTab('people')}
            className={`flex flex-col items-center gap-1 py-1 px-4 text-[11px] font-medium transition cursor-pointer ${
              activeTab === 'people' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>People</span>
          </button>
        </div>
      </nav>

      {/* Modals & Bottom Sheets */}
      {selectedPerson && (
        <PersonDetailsModal
          isOpen={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          personName={selectedPerson.name}
          personPhone={selectedPerson.phone}
          expenses={expenses}
          upiId={upiId}
          payeeName={payeeName}
          onUpdateStatus={handleUpdateStatus}
          onDeleteExpense={handleDeleteExpense}
          onEditExpense={(exp) => {
            setEditingExpense(exp);
            setEditOpen(true);
          }}
          onRequestAddPhone={handleRequestAddPhone}
          onOpenQRModal={handleOpenQRModal}
          onSettleAllForPerson={handleSettleAllForPerson}
        />
      )}

      <AddPhoneModal
        isOpen={phoneModalState.isOpen}
        onClose={() =>
          setPhoneModalState({ isOpen: false, personName: '', currentPhone: '' })
        }
        personName={phoneModalState.personName}
        initialPhone={phoneModalState.currentPhone}
        onSaveAndSend={(newPhone) =>
          handleUpdatePersonPhone(phoneModalState.personName, newPhone)
        }
      />

      <QRModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        amount={qrData.amount}
        description={qrData.description}
        personName={qrData.personName}
        personPhone={qrData.personPhone}
        upiId={upiId}
        payeeName={payeeName}
        onRequestAddPhone={handleRequestAddPhone}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialUpiId={upiId}
        initialPayeeName={payeeName}
        onSave={(newUpiId, newPayeeName) => {
          setUpiId(newUpiId);
          setPayeeName(newPayeeName);
        }}
      />

      <EditExpenseModal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        contacts={contacts}
        onSave={handleEditSave}
      />
    </div>
  );
}
