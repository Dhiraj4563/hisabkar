import React from 'react';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { formatMoney } from '../lib/money';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  AlertCircle,
  Split,
  ChevronRight,
  Users,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import {
  Account,
  Category,
  Group,
  Loan,
  Person,
  Transaction,
  TransactionType,
} from '../types';
import { NavItem } from '../components/layout/Sidebar';

interface DashboardPageProps {
  metrics: {
    totalCash: number;
    totalCreditCardDebt: number;
    totalReceivables: number;
    totalLiabilities: number;
    netWorth: number;
    periodIncome: number;
    periodExpenses: number;
    netCashFlow: number;
    periodLent: number;
    periodBorrowed: number;
    overdueLoans: Loan[];
    categoryBreakdown: { name: string; color: string; amount: number }[];
  };
  monthlyCashflowSeries: {
    label: string;
    income: number;
    expense: number;
    net: number;
  }[];
  recentTransactions: Transaction[];
  accounts: Account[];
  people: Person[];
  categories: Category[];
  groups: Group[];
  loans?: Loan[];
  hideBalances: boolean;
  onNavigate: (nav: NavItem, entityId?: string) => void;
  onOpenAddModal: (type?: TransactionType, personId?: string, loanId?: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  accounts,
  people,
  loans = [],
  hideBalances,
  onNavigate,
  onOpenAddModal,
}) => {
  // Helper to extract person initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || '??';
  };

  // Find active loans
  const activeLoans = loans.filter(l => l.currentBalance > 0 && l.status !== 'archived');

  // Group active lent loans by person (Money to be taken / receivables)
  const peopleToCollect = React.useMemo(() => {
    const map = new Map<string, {
      personId: string;
      name: string;
      nickname?: string;
      phone?: string;
      amount: number;
      originalAmount: number;
      repaidAmount: number;
      currency: string;
      latestLoanId: string;
      loanCount: number;
      hasOverdue: boolean;
    }>();

    const now = new Date();

    activeLoans
      .filter(l => l.type === 'lent')
      .forEach(l => {
        const p = people.find(person => person.id === l.personId);
        const name = p?.name || l.description || 'Contact';
        const isOverdue = !!(l.dueDate && new Date(l.dueDate) < now);
        const existing = map.get(l.personId);

        if (existing) {
          existing.amount += l.currentBalance;
          existing.originalAmount += l.principalAmount;
          existing.repaidAmount += Math.max(0, l.principalAmount - l.currentBalance);
          existing.loanCount += 1;
          if (isOverdue) existing.hasOverdue = true;
        } else {
          map.set(l.personId, {
            personId: l.personId,
            name,
            nickname: p?.nickname,
            phone: p?.phone,
            amount: l.currentBalance,
            originalAmount: l.principalAmount,
            repaidAmount: Math.max(0, l.principalAmount - l.currentBalance),
            currency: l.currency,
            latestLoanId: l.id,
            loanCount: 1,
            hasOverdue: isOverdue,
          });
        }
      });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [activeLoans, people]);

  // Group active borrowed loans by person (Money to be given / payables)
  const peopleToPay = React.useMemo(() => {
    const map = new Map<string, {
      personId: string;
      name: string;
      nickname?: string;
      phone?: string;
      amount: number;
      originalAmount: number;
      repaidAmount: number;
      currency: string;
      latestLoanId: string;
      loanCount: number;
      hasOverdue: boolean;
    }>();

    const now = new Date();

    activeLoans
      .filter(l => l.type === 'borrowed')
      .forEach(l => {
        const p = people.find(person => person.id === l.personId);
        const name = p?.name || l.description || 'Contact';
        const isOverdue = !!(l.dueDate && new Date(l.dueDate) < now);
        const existing = map.get(l.personId);

        if (existing) {
          existing.amount += l.currentBalance;
          existing.originalAmount += l.principalAmount;
          existing.repaidAmount += Math.max(0, l.principalAmount - l.currentBalance);
          existing.loanCount += 1;
          if (isOverdue) existing.hasOverdue = true;
        } else {
          map.set(l.personId, {
            personId: l.personId,
            name,
            nickname: p?.nickname,
            phone: p?.phone,
            amount: l.currentBalance,
            originalAmount: l.principalAmount,
            repaidAmount: Math.max(0, l.principalAmount - l.currentBalance),
            currency: l.currency,
            latestLoanId: l.id,
            loanCount: 1,
            hasOverdue: isOverdue,
          });
        }
      });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [activeLoans, people]);

  const totalToCollect = peopleToCollect.reduce((sum, item) => sum + item.amount, 0);
  const totalToPay = peopleToPay.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-5 pb-20 lg:pb-12 max-w-4xl mx-auto pt-2">
      {/* 1. Quick Actions Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onOpenAddModal('personal_expense')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 hover:bg-zinc-850 text-xs font-medium text-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
          <span>Expense</span>
        </button>

        <button
          onClick={() => onOpenAddModal('income')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 hover:bg-zinc-850 text-xs font-medium text-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          <span>Income</span>
        </button>

        <button
          onClick={() => onOpenAddModal('loan_repayment_received')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-teal-500/40 hover:bg-zinc-850 text-xs font-medium text-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <HandCoins className="w-3.5 h-3.5 text-teal-400" />
          <span>Collect Repayment</span>
        </button>

        <button
          onClick={() => onOpenAddModal('loan_repayment_made')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 hover:bg-zinc-850 text-xs font-medium text-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <HandCoins className="w-3.5 h-3.5 text-violet-400 rotate-180" />
          <span>Pay Debt</span>
        </button>

        <button
          onClick={() => onOpenAddModal('money_lent')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-850 text-xs font-medium text-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <HandCoins className="w-3.5 h-3.5 text-amber-400" />
          <span>Lend</span>
        </button>

        <button
          onClick={() => onOpenAddModal('money_borrowed')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 hover:bg-zinc-850 text-xs font-medium text-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <HandCoins className="w-3.5 h-3.5 text-blue-400 rotate-180" />
          <span>Borrow</span>
        </button>

        <button
          onClick={() => onOpenAddModal('group_expense')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-850 text-xs font-medium text-zinc-200 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
        >
          <Split className="w-3.5 h-3.5 text-indigo-400" />
          <span>Split</span>
        </button>
      </div>

      {/* Overdue Alert Banner if any */}
      {metrics.overdueLoans.length > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-200">
              <strong>{metrics.overdueLoans.length} Overdue Debt{metrics.overdueLoans.length > 1 ? 's' : ''}:</strong> please check outstanding balances.
            </span>
          </div>
          <button
            onClick={() => onNavigate('lending')}
            className="text-amber-300 font-semibold hover:underline cursor-pointer"
          >
            Review &rarr;
          </button>
        </div>
      )}

      {/* 2. Compact Financial Overview Strip */}
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
          {/* Net Financial Position */}
          <div className="space-y-1 sm:pr-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Net Position
            </span>
            <MoneyDisplay
              amount={metrics.netWorth}
              hideBalances={hideBalances}
              size="xl"
              colorVariant="auto"
            />
            <p className="text-[10px] text-zinc-500">Cash + Receivables - Debt</p>
          </div>

          {/* Amount To Be Taken (Remaining) */}
          <div
            onClick={() => onNavigate('lending')}
            className="space-y-1 sm:px-4 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-emerald-300">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium">To Be Taken</span>
            </div>
            <MoneyDisplay
              amount={totalToCollect}
              hideBalances={hideBalances}
              size="lg"
              colorVariant="positive"
            />
            <p className="text-[10px] text-zinc-500">
              {peopleToCollect.length} contact{peopleToCollect.length === 1 ? '' : 's'} to collect from
            </p>
          </div>

          {/* Amount To Be Given (Remaining) */}
          <div
            onClick={() => onNavigate('lending')}
            className="space-y-1 pt-3 sm:pt-0 sm:px-4 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-rose-300">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[11px] font-medium">To Be Given</span>
            </div>
            <MoneyDisplay
              amount={totalToPay}
              hideBalances={hideBalances}
              size="lg"
              colorVariant="negative"
            />
            <p className="text-[10px] text-zinc-500">
              {peopleToPay.length} contact{peopleToPay.length === 1 ? '' : 's'} to pay back
            </p>
          </div>

          {/* Liquid Cash */}
          <div
            onClick={() => onNavigate('accounts')}
            className="space-y-1 pt-3 sm:pt-0 sm:pl-4 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200">
              <Wallet className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] font-medium">Liquid Cash</span>
            </div>
            <MoneyDisplay
              amount={metrics.totalCash}
              hideBalances={hideBalances}
              size="lg"
              colorVariant="neutral"
            />
            <p className="text-[10px] text-zinc-500">{accounts.length} accounts</p>
          </div>
        </div>
      </div>

      {/* 3. Person-Centric Lending & Borrowing Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: To Be Taken (Money Lent / Receivables) */}
        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/70 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
                      To Be Taken
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                      {peopleToCollect.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Money lent to contacts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <MoneyDisplay
                    amount={totalToCollect}
                    hideBalances={hideBalances}
                    size="sm"
                    colorVariant="positive"
                  />
                </div>
                <button
                  onClick={() => onNavigate('people')}
                  className="text-[11px] text-zinc-400 hover:text-emerald-400 cursor-pointer p-1 rounded hover:bg-zinc-800 transition-colors"
                  title="View all people"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {peopleToCollect.length === 0 ? (
              <div className="py-7 px-4 text-center rounded-lg border border-dashed border-zinc-800/80 bg-zinc-950/40 space-y-2 mt-3">
                <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400/70" />
                <p className="text-xs font-medium text-zinc-300">No money to be taken</p>
                <p className="text-[11px] text-zinc-500">
                  All lent money has been collected and settled.
                </p>
                <button
                  onClick={() => onOpenAddModal('money_lent')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Lend Money</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50 text-xs mt-1">
                {peopleToCollect.slice(0, 5).map(personItem => (
                  <div
                    key={personItem.personId}
                    onClick={() => onNavigate('people', personItem.personId)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-zinc-850/60 rounded-xl cursor-pointer transition-colors group border border-transparent hover:border-zinc-800/70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center justify-center shrink-0">
                        {getInitials(personItem.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors text-sm truncate">
                            {personItem.name}
                          </p>
                          {personItem.nickname && (
                            <span className="text-[11px] text-zinc-400 truncate">
                              ({personItem.nickname})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          {personItem.repaidAmount > 0 ? (
                            <span>
                              Repaid: <span className="text-emerald-400 font-medium">{formatMoney(personItem.repaidAmount, personItem.currency, { hideBalances })}</span> of {formatMoney(personItem.originalAmount, personItem.currency, { hideBalances })}
                            </span>
                          ) : (
                            <span>Lent to contact</span>
                          )}
                          {personItem.hasOverdue && (
                            <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 rounded text-[10px]">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          Amount Remaining
                        </span>
                        <MoneyDisplay
                          amount={personItem.amount}
                          currency={personItem.currency}
                          hideBalances={hideBalances}
                          size="base"
                          colorVariant="positive"
                        />
                        <span className="text-[10px] text-zinc-400 block font-medium">To be taken</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddModal(
                            'loan_repayment_received',
                            personItem.personId,
                            personItem.latestLoanId
                          );
                        }}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition-all cursor-pointer whitespace-nowrap active:scale-[0.97]"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {peopleToCollect.length > 5 && (
            <button
              onClick={() => onNavigate('people')}
              className="w-full text-center py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border-t border-zinc-800/60 transition-colors"
            >
              + {peopleToCollect.length - 5} more people to collect from &rarr;
            </button>
          )}
        </div>

        {/* Right: To Be Given (Money Borrowed / Payables) */}
        <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/70 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
                      To Be Given
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-400 font-medium">
                      {peopleToPay.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Money borrowed from contacts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <MoneyDisplay
                    amount={totalToPay}
                    hideBalances={hideBalances}
                    size="sm"
                    colorVariant="negative"
                  />
                </div>
                <button
                  onClick={() => onNavigate('people')}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 cursor-pointer p-1 rounded hover:bg-zinc-800 transition-colors"
                  title="View all people"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {peopleToPay.length === 0 ? (
              <div className="py-7 px-4 text-center rounded-lg border border-dashed border-zinc-800/80 bg-zinc-950/40 space-y-2 mt-3">
                <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-400/70" />
                <p className="text-xs font-medium text-zinc-300">No money to be given</p>
                <p className="text-[11px] text-zinc-500">
                  You have zero outstanding borrowings or debts owed.
                </p>
                <button
                  onClick={() => onOpenAddModal('money_borrowed')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700/60 text-zinc-300 text-[11px] font-medium cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Record Borrowing</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50 text-xs mt-1">
                {peopleToPay.slice(0, 5).map(personItem => (
                  <div
                    key={personItem.personId}
                    onClick={() => onNavigate('people', personItem.personId)}
                    className="py-3 px-2 flex items-center justify-between hover:bg-zinc-850/60 rounded-xl cursor-pointer transition-colors group border border-transparent hover:border-zinc-800/70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center shrink-0">
                        {getInitials(personItem.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="font-semibold text-zinc-100 group-hover:text-rose-300 transition-colors text-sm truncate">
                            {personItem.name}
                          </p>
                          {personItem.nickname && (
                            <span className="text-[11px] text-zinc-400 truncate">
                              ({personItem.nickname})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          {personItem.repaidAmount > 0 ? (
                            <span>
                              Paid back: <span className="text-rose-400 font-medium">{formatMoney(personItem.repaidAmount, personItem.currency, { hideBalances })}</span> of {formatMoney(personItem.originalAmount, personItem.currency, { hideBalances })}
                            </span>
                          ) : (
                            <span>Borrowed from contact</span>
                          )}
                          {personItem.hasOverdue && (
                            <span className="text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.2 rounded text-[10px]">
                              Due soon
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                          Amount Remaining
                        </span>
                        <MoneyDisplay
                          amount={personItem.amount}
                          currency={personItem.currency}
                          hideBalances={hideBalances}
                          size="base"
                          colorVariant="negative"
                        />
                        <span className="text-[10px] text-zinc-400 block font-medium">To be given</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddModal(
                            'loan_repayment_made',
                            personItem.personId,
                            personItem.latestLoanId
                          );
                        }}
                        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-all cursor-pointer whitespace-nowrap active:scale-[0.97]"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {peopleToPay.length > 5 && (
            <button
              onClick={() => onNavigate('people')}
              className="w-full text-center py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border-t border-zinc-800/60 transition-colors"
            >
              + {peopleToPay.length - 5} more people to pay &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
