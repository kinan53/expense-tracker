'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, LogOut, ReceiptText, ListFilter, CreditCard } from 'lucide-react';
import { supabase } from './lib/supabase';

// Components
import LoginScreen from './components/LoginScreen';
import AddExpenseForm from './components/AddExpenseForm';
import ExpenseSidebar from './components/ExpenseSidebar';
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

  // Modals and Sidebar Toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  
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
  const contacts = React.useMemo(() => {
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
      const { data, error } = await supabase
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
    
    // SWR logic: Only show loading spinner if cache is empty
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
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === id ? { ...exp, status: newStatus } : exp))
      );
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
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
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
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === id ? { ...exp, ...updatedFields } : exp))
      );
      return true;
    } catch (err) {
      console.error('Failed to update expense:', err);
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
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-slate-950/80 px-6 py-4.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
              <ReceiptText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-tight leading-none">Expense Dashboard</h1>
              <span className="text-[10px] text-slate-400 mt-1 block">Simple Payment Tracker</span>
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

        {/* Content Container */}
        <main className="flex-1 p-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-6">
          {/* Welcome Alert / Info if settings not set */}
          {!upiId && (
            <div className="w-full flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400">
              <CreditCard className="h-5 w-5 shrink-0 animate-bounce" />
              <div>
                <p className="font-bold">Setup Required</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Click the gear icon above to set up your UPI/GPay ID to enable GPay QR code generation and WhatsApp sharing!
                </p>
              </div>
            </div>
          )}

          {/* Form wrapper */}
          <div className="w-full">
            <AddExpenseForm
              onExpenseAdded={fetchExpenses}
              onOpenQRModal={handleOpenQRModal}
              contacts={contacts}
            />
          </div>

          {/* Mobile Entries FAB Toggle */}
          <div className="w-full block md:hidden pt-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600/15 border border-indigo-500/20 py-3.5 text-sm font-bold text-indigo-300 hover:bg-indigo-600/20 transition cursor-pointer active:scale-98"
            >
              <ListFilter className="h-4.5 w-4.5" />
              View Entries ({expenses.length})
              {pendingCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-900 leading-none">
                  {pendingCount} Pending
                </span>
              )}
            </button>
          </div>
        </main>
      </div>

      {/* Sidebar List panel */}
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
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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
