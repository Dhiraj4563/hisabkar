import React, { useState, useEffect } from 'react';
import { useFinancialData } from './hooks/useFinancialData';
import { useAppLock } from './hooks/useAppLock';
import { initializeDatabase } from './db/seed';
import { db } from './db/database';
import { Sidebar, NavItem } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { AddTransactionModal } from './components/transactions/AddTransactionModal';
import { EditTransactionModal } from './components/transactions/EditTransactionModal';
import { EditLoanModal } from './components/common/EditLoanModal';
import { EditPersonModal } from './components/common/EditPersonModal';
import { ProfileModal } from './components/common/ProfileModal';
import { TransactionDetailsModal } from './components/transactions/TransactionDetailsModal';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { AppLockModal } from './components/layout/AppLockModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { PeoplePage } from './pages/PeoplePage';
import { LendingPage } from './pages/LendingPage';
import { GroupsPage } from './pages/GroupsPage';
import { AccountsPage } from './pages/AccountsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringPage } from './pages/RecurringPage';
import { ReportsPage } from './pages/ReportsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { SettingsPage } from './pages/SettingsPage';

import { Transaction, TransactionType, Loan, Person } from './types';

export default function App() {
  const [currentNav, setCurrentNav] = useState<NavItem>('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState<string | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialType, setAddModalInitialType] = useState<TransactionType>('personal_expense');
  const [addModalPersonId, setAddModalPersonId] = useState<string | undefined>(undefined);
  const [addModalGroupId, setAddModalGroupId] = useState<string | undefined>(undefined);
  const [addModalLoanId, setAddModalLoanId] = useState<string | undefined>(undefined);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Initialize DB on mount
  useEffect(() => {
    initializeDatabase().catch(console.error);
  }, []);

  // Reactive financial queries & calculations
  const financial = useFinancialData();
  const { isLocked, unlockWithPin, enableLock, disableLock } = useAppLock(financial.settings);

  const hideBalances = financial.settings?.hideBalances ?? false;

  const handleTogglePrivacy = async () => {
    if (financial.settings) {
      await db.settings.put({
        ...financial.settings,
        hideBalances: !hideBalances,
      });
    }
  };

  const handleOpenAddModal = (
    type: TransactionType = 'personal_expense',
    personId?: string,
    loanId?: string,
    groupId?: string
  ) => {
    setAddModalInitialType(type);
    setAddModalPersonId(personId);
    setAddModalLoanId(loanId);
    setAddModalGroupId(groupId);
    setIsAddModalOpen(true);
  };

  const handleNavigate = (nav: NavItem, entityId?: string) => {
    setCurrentNav(nav);
    if (nav === 'people') {
      setSelectedPersonId(entityId);
    } else if (nav === 'groups') {
      setSelectedGroupId(entityId);
    }
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getPageTitle = (): { title: string; subtitle?: string } => {
    switch (currentNav) {
      case 'dashboard':
        return { title: 'Hisabrakh' };
      case 'transactions':
        return { title: 'Transactions Ledger', subtitle: 'Balanced double-entry journal records' };
      case 'people':
        return { title: 'People & Ledgers', subtitle: 'Individual debt tracking and balance reconciliation' };
      case 'lending':
        return { title: 'Lending & Debt', subtitle: 'Manage receivables, borrowings, and repayments' };
      case 'groups':
        return { title: 'Group Expense Splits', subtitle: 'Optimized debt settlement algorithm' };
      case 'accounts':
        return { title: 'Accounts & Wallets', subtitle: 'Cash, bank balances, and card liabilities' };
      case 'budgets':
        return { title: 'Budgets & Savings Goals', subtitle: 'Spending limits and milestone tracking' };
      case 'recurring':
        return { title: 'Recurring Schedules', subtitle: 'Salary, rent, bills, and subscriptions' };
      case 'reports':
        return { title: 'Financial Reports', subtitle: 'Balance sheet, aging reports, and cash flow' };
      case 'calendar':
        return { title: 'Calendar & Dues', subtitle: 'Monthly schedule of loan deadlines and recurring bills' };
      case 'import_export':
        return { title: 'Backup & Restore', subtitle: 'Encrypted AES-GCM backups and CSV migration' };
      case 'settings':
        return { title: 'Settings & Security', subtitle: 'App lock, currencies, and demo mode' };
      default:
        return { title: 'Hisabrakh' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-zinc-950">
      {/* App Lock Screen when locked */}
      <AppLockModal isLocked={isLocked} onUnlock={unlockWithPin} />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          currentNav={currentNav}
          onNavigate={handleNavigate}
          hideBalances={hideBalances}
          onTogglePrivacy={handleTogglePrivacy}
          onOpenAddModal={() => handleOpenAddModal('personal_expense')}
          ownerName={financial.settings?.ownerName}
          ownerProfileImage={financial.settings?.ownerProfileImage}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header Bar */}
          <Header
            title={title}
            subtitle={subtitle}
            dateFilter={financial.dateFilter}
            onDateFilterChange={financial.setDateFilter}
            hideBalances={hideBalances}
            onTogglePrivacy={handleTogglePrivacy}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenAddModal={() => handleOpenAddModal('personal_expense')}
            showDateFilter={currentNav === 'reports'}
            ownerName={financial.settings?.ownerName}
            ownerProfileImage={financial.settings?.ownerProfileImage}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />

          {/* Page Routing */}
          <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
            {currentNav === 'dashboard' && (
              <DashboardPage
                metrics={financial.metrics}
                monthlyCashflowSeries={financial.monthlyCashflowSeries}
                recentTransactions={financial.transactions}
                accounts={financial.accounts}
                people={financial.people}
                categories={financial.categories}
                groups={financial.groups}
                loans={financial.loans}
                hideBalances={hideBalances}
                onNavigate={handleNavigate}
                onOpenAddModal={handleOpenAddModal}
                onSelectTransaction={setSelectedTransaction}
              />
            )}

            {currentNav === 'transactions' && (
              <TransactionsPage
                transactions={financial.transactions}
                accounts={financial.accounts}
                categories={financial.categories}
                people={financial.people}
                hideBalances={hideBalances}
                onOpenAddModal={() => handleOpenAddModal('personal_expense')}
                onSelectTransaction={setSelectedTransaction}
                onEditTransaction={setEditingTransaction}
              />
            )}

            {currentNav === 'people' && (
              <PeoplePage
                people={financial.people}
                loans={financial.loans}
                transactions={financial.transactions}
                accounts={financial.accounts}
                hideBalances={hideBalances}
                selectedPersonId={selectedPersonId}
                onSelectPerson={setSelectedPersonId}
                onOpenAddModal={handleOpenAddModal}
                onSelectTransaction={setSelectedTransaction}
                onEditTransaction={setEditingTransaction}
                onEditLoan={setEditingLoan}
                onEditPerson={setEditingPerson}
              />
            )}

            {currentNav === 'lending' && (
              <LendingPage
                loans={financial.loans}
                people={financial.people}
                accounts={financial.accounts}
                hideBalances={hideBalances}
                onOpenAddModal={handleOpenAddModal}
                onNavigateToPerson={personId => handleNavigate('people', personId)}
                onEditLoan={setEditingLoan}
              />
            )}

            {currentNav === 'groups' && (
              <GroupsPage
                groups={financial.groups}
                groupExpenses={financial.groupExpenses}
                groupSettlements={financial.groupSettlements}
                people={financial.people}
                accounts={financial.accounts}
                transactions={financial.transactions}
                hideBalances={hideBalances}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
                onOpenAddExpense={groupId => handleOpenAddModal('group_expense', undefined, undefined, groupId)}
                onSelectTransaction={setSelectedTransaction}
              />
            )}

            {currentNav === 'accounts' && (
              <AccountsPage
                accounts={financial.allAccounts}
                transactions={financial.transactions}
                hideBalances={hideBalances}
                onOpenTransferModal={() => handleOpenAddModal('account_transfer')}
                onSelectTransaction={setSelectedTransaction}
              />
            )}

            {currentNav === 'budgets' && (
              <BudgetsPage
                budgets={financial.budgets}
                savingsGoals={financial.savingsGoals}
                categories={financial.categories}
                transactions={financial.transactions}
                hideBalances={hideBalances}
              />
            )}

            {currentNav === 'recurring' && (
              <RecurringPage
                recurringRules={financial.recurringRules || []}
                accounts={financial.accounts}
                categories={financial.categories}
                hideBalances={hideBalances}
              />
            )}

            {currentNav === 'reports' && (
              <ReportsPage
                transactions={financial.filteredTransactions}
                loans={financial.loans}
                accounts={financial.accounts}
                categories={financial.categories}
                people={financial.people}
                groups={financial.groups}
                hideBalances={hideBalances}
              />
            )}

            {currentNav === 'calendar' && (
              <CalendarPage
                loans={financial.loans}
                reminders={financial.reminders}
                recurringRules={financial.recurringRules || []}
                people={financial.people}
                hideBalances={hideBalances}
              />
            )}

            {currentNav === 'import_export' && (
              <ImportExportPage
                transactions={financial.transactions}
                onDataRestored={() => window.location.reload()}
              />
            )}

            {currentNav === 'settings' && (
              <SettingsPage
                settings={financial.settings}
                currencies={financial.currencies}
                onEnableLock={enableLock}
                onDisableLock={disableLock}
                onDataReset={() => window.location.reload()}
                onOpenProfile={() => setIsProfileModalOpen(true)}
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentNav={currentNav}
        onNavigate={handleNavigate}
        onOpenAddModal={() => handleOpenAddModal('personal_expense')}
      />

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        accounts={financial.accounts}
        categories={financial.categories}
        people={financial.people}
        groups={financial.groups}
        loans={financial.loans}
        initialType={addModalInitialType}
        defaultPersonId={addModalPersonId}
        defaultLoanId={addModalLoanId}
        defaultGroupId={addModalGroupId}
      />

      <TransactionDetailsModal
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        accounts={financial.accounts}
        categories={financial.categories}
        people={financial.people}
        groups={financial.groups}
        onEdit={setEditingTransaction}
      />

      <EditTransactionModal
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        accounts={financial.accounts}
        categories={financial.categories}
        people={financial.people}
      />

      <EditLoanModal
        isOpen={!!editingLoan}
        loan={editingLoan}
        onClose={() => setEditingLoan(null)}
        people={financial.people}
        accounts={financial.accounts}
      />

      <EditPersonModal
        isOpen={!!editingPerson}
        person={editingPerson}
        onClose={() => setEditingPerson(null)}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        settings={financial.settings}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        transactions={financial.transactions}
        people={financial.people}
        groups={financial.groups}
        accounts={financial.accounts}
        onSelectResult={(nav, entityId) => {
          handleNavigate(nav, entityId);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
}
