'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings,
  LogOut,
  ReceiptText,
  ListFilter,
  CreditCard,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { openWhatsApp, generatePersonSummaryWhatsAppMessage } from './lib/whatsapp';

// Components
import LoginScreen from './components/LoginScreen';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseSidebar from './components/ExpenseSidebar';
import PeopleBalancesView from './components/PeopleBalancesView';
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

  // Main View Mode: 'form' (Add Entry) | 'owes_me' (Who Owes Me) | 'i_owe' (I Owe)
  const [mainView, setMainView] = useState<'form' | 'owes_me' | 'i_owe'>('form');

  // Global Config Sync
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');

  // Modals and Sidebar Toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Overall totals for quick summary badges
  const { totalReceivable, totalPayable, countReceivablePeople, countPayablePeople } = useMemo(() => {
    const recPeople = new Set<string>();
    const payPeople = new Set<string>();
    let rec = 0;
    let pay = 0;

    for (const exp of expenses) {
      if (exp.status === 'pending') {
        const amt = Number(exp.amount) || 0;
        if (exp.direction === 'i_owe') {
          pay += amt;
          if (exp.person_name) payPeople.add(exp.person_name.toLowerCase().trim());
        } else {
          rec += amt;
          if (exp.person_name) recPeople.add(exp.person_name.toLowerCase().trim());
        }
      }
    }

    return {
      totalReceivable: rec,
      totalPayable: pay,
      countReceivablePeople: recPeople.size,
      countPayablePeople: payPeople.size,
    };
  }, [expenses]);

  // Verify auth on mount and load cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('expense_tracker_auth');
      setIsAuthenticated(auth === 'true');

      // Load cached expenses immediately for instant load
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
      // Fallback
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
      
      // Update local cache
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

  // Realtime Syncing across devices
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

  // Update payment status (Pending <-> Received)
  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'received') => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Update local state to feel immediate
      setExpenses((prev) => {
        const updated = prev.map((exp) =>
          exp.id === id ? { ...exp, status: newStatus } : exp
        );
        localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Failed to update expense status:', err);
      alert('Error updating status. Please try again.');
    }
  };

  // Delete expense
  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      // Update local state
      setExpenses((prev) => {
        const updated = prev.filter((exp) => exp.id !== id);
        localStorage.setItem('expense_tracker_cached_expenses', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert('Error deleting entry. Please try again.');
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

      // Update local state
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

  // Update phone number for a person across all their expenses
  const handleUpdatePersonPhone = async (personName: string, newPhone: string) => {
    const cleanName = personName.trim();
    const cleanPhone = newPhone.trim();

    try {
      // Update in Supabase
      const { error } = await supabase
        .from('expenses')
        .update({ person_phone: cleanPhone })
        .ilike('person_name', cleanName);

      if (error) throw error;
    } catch (err) {
      console.warn('Database phone update note:', err);
    }

    // Always update local state & cache
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

    // Also update current selected person phone if open
    if (
      selectedPerson &&
      selectedPerson.name.toLowerCase() === cleanName.toLowerCase()
    ) {
      setSelectedPerson((prev) => (prev ? { ...prev, phone: cleanPhone } : null));
    }

    // If QR data is for this person, update it
    if (
      qrData.personName &&
      qrData.personName.toLowerCase() === cleanName.toLowerCase()
    ) {
      setQrData((prev) => ({ ...prev, personPhone: cleanPhone }));
    }

    // Generate WhatsApp reminder and trigger
    const personExpenses = expenses.filter(
      (e) =>
        e.person_name &&
        e.person_name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    const pendingReceivables = personExpenses
      .filter((e) => e.status === 'pending' && e.direction !== 'i_owe')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const pendingPayables = personExpenses
      .filter((e) => e.status === 'pending' && e.direction === 'i_owe')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const isReceivable = pendingReceivables >= pendingPayables;
    const totalAmount = isReceivable ? pendingReceivables : pendingPayables;

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

  // Render loading state while checking initial auth
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-10 w-10 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-semibold tracking-wider">Loading Session...</span>
        </div>
      </div>
    );
  }

  // Render password gate if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingCount = expenses.filter((e) => e.status === 'pending').length;

  return (
    <div className="flex h-screen w-full flex-col bg-slate-950 font-sans text-slate-100 overflow-hidden md:flex-row">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-y-auto">
        {/* Navigation Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 md:px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              <ReceiptText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
                Expense Dashboard
              </h1>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Track debts, payments & QR codes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Settings button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
              title="Settings"
            >
              <Settings className="h-4.5 w-4.5" />
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Top Navigation Tabs */}
        <div className="border-b border-white/10 bg-slate-950/50 px-4 md:px-6 py-2.5 backdrop-blur-xs">
          <div className="max-w-4xl mx-auto flex items-center justify-start sm:justify-center gap-2 overflow-x-auto custom-scrollbar">
            {/* New Entry Tab */}
            <button
              onClick={() => setMainView('form')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                mainView === 'form'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Add Entry
            </button>

            {/* Who Owes Me Tab */}
            <button
              onClick={() => setMainView('owes_me')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                mainView === 'owes_me'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 border border-emerald-500/20'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Who Owes Me</span>
              {totalReceivable > 0 && (
                <span className="ml-1 rounded-full bg-emerald-400/20 text-emerald-300 px-2 py-0.5 text-[10px] font-extrabold">
                  ₹{totalReceivable.toFixed(0)} ({countReceivablePeople})
                </span>
              )}
            </button>

            {/* I Owe Someone Tab */}
            <button
              onClick={() => setMainView('i_owe')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                mainView === 'i_owe'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 border border-rose-500/20'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>I Owe</span>
              {totalPayable > 0 && (
                <span className="ml-1 rounded-full bg-rose-400/20 text-rose-300 px-2 py-0.5 text-[10px] font-extrabold">
                  ₹{totalPayable.toFixed(0)} ({countPayablePeople})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-6 flex flex-col items-center max-w-3xl mx-auto w-full space-y-6">
          {/* Welcome Alert / Info if UPI settings not set */}
          {!upiId && (
            <div className="w-full flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
              <CreditCard className="h-5 w-5 shrink-0 animate-bounce" />
              <div>
                <p className="font-bold">Setup Required</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Click the gear icon in the top header to set up your UPI/GPay ID to enable Google Pay QR code generation and WhatsApp reminders!
                </p>
              </div>
            </div>
          )}

          {/* View Mode Switching */}
          {mainView === 'form' ? (
            <div className="w-full space-y-4">
              {/* Quick Summary Banner */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMainView('owes_me')}
                  className="flex items-center justify-between rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 p-3 text-left transition cursor-pointer"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Who Owes Me
                    </span>
                    <p className="text-lg font-extrabold text-white mt-0.5 leading-none">
                      ₹{totalReceivable.toFixed(0)}
                    </p>
                    <span className="text-[10px] text-emerald-300/80 mt-1 block">
                      {countReceivablePeople} people owe you
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setMainView('i_owe')}
                  className="flex items-center justify-between rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 p-3 text-left transition cursor-pointer"
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
                      <ArrowDownLeft className="h-3 w-3" />
                      I Owe
                    </span>
                    <p className="text-lg font-extrabold text-white mt-0.5 leading-none">
                      ₹{totalPayable.toFixed(0)}
                    </p>
                    <span className="text-[10px] text-rose-300/80 mt-1 block">
                      You owe {countPayablePeople} people
                    </span>
                  </div>
                </button>
              </div>

              {/* Add Expense Form */}
              <AddExpenseForm
                onExpenseAdded={fetchExpenses}
                onOpenQRModal={handleOpenQRModal}
                contacts={contacts}
              />
            </div>
          ) : (
            /* People Balances & History View */
            <div className="w-full">
              <PeopleBalancesView
                expenses={expenses}
                activeTab={mainView}
                onTabChange={(tab) => setMainView(tab)}
                onSelectPerson={handleSelectPerson}
                onOpenQRModal={handleOpenQRModal}
                onRequestAddPhone={handleRequestAddPhone}
                onAddNewEntry={() => setMainView('form')}
                upiId={upiId}
                payeeName={payeeName}
              />
            </div>
          )}

          {/* Mobile Entries FAB / Drawer Trigger */}
          <div className="w-full block md:hidden pt-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600/15 border border-indigo-500/20 py-3.5 text-sm font-bold text-indigo-300 hover:bg-indigo-600/20 transition cursor-pointer active:scale-98"
            >
              <ListFilter className="h-4.5 w-4.5" />
              View Activity & Entries ({expenses.length})
              {pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-900 leading-none">
                  {pendingCount} Pending
                </span>
              )}
            </button>
          </div>
        </main>
      </div>

      {/* Sidebar List panel (Desktop & Mobile Drawer) */}
      <ExpenseSidebar
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
        onOpenPeopleView={(tab) => {
          setMainView(tab);
          setSidebarOpen(false);
        }}
        upiId={upiId}
        payeeName={payeeName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Person Details & History Modal */}
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

      {/* Add / Edit WhatsApp Phone Modal */}
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

      {/* QR Code Modal popup */}
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
      />

      {/* App Settings Modal */}
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

      {/* Edit Expense Modal popup */}
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
