import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { Transaction, Loan, Account, Category, Person, Group } from '../types';
import { fromMinorUnits } from '../lib/money';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface ReportsPageProps {
  transactions: Transaction[];
  loans: Loan[];
  accounts: Account[];
  categories: Category[];
  people: Person[];
  groups: Group[];
  hideBalances: boolean;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  transactions,
  loans,
  accounts,
  categories,
  people,
  groups,
  hideBalances,
}) => {
  const [reportType, setReportType] = useState<'income_expense' | 'aging' | 'balance_sheet'>('income_expense');

  // Compute Income vs Expense
  const incomeExpenseSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap: Record<string, number> = {};

    for (const t of transactions) {
      if (t.status === 'voided') continue;
      if (t.type === 'income') totalIncome += t.amount;
      else if (t.type === 'personal_expense' || t.type === 'group_expense') {
        totalExpense += t.amount;
        const catId = t.categoryId || 'other';
        catMap[catId] = (catMap[catId] || 0) + t.amount;
      } else if (t.type === 'refund') {
        totalExpense = Math.max(0, totalExpense - t.amount);
      }
    }

    const sortedCats = Object.entries(catMap)
      .map(([id, amt]) => {
        const cat = categories.find(c => c.id === id);
        return { id, name: cat?.name || 'Other', amount: amt };
      })
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      categories: sortedCats,
    };
  }, [transactions, categories]);

  // Compute Receivables & Payables Aging (0-30, 31-60, 60+ days)
  const agingReport = useMemo(() => {
    const now = new Date().getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const receivables = { '0_30': 0, '31_60': 0, '60_plus': 0 };
    const payables = { '0_30': 0, '31_60': 0, '60_plus': 0 };

    for (const loan of loans) {
      if (loan.status === 'archived' || loan.currentBalance <= 0) continue;
      const loanAgeDays = Math.floor((now - new Date(loan.startDate).getTime()) / dayMs);

      const target = loan.type === 'lent' ? receivables : payables;

      if (loanAgeDays <= 30) target['0_30'] += loan.currentBalance;
      else if (loanAgeDays <= 60) target['31_60'] += loan.currentBalance;
      else target['60_plus'] += loan.currentBalance;
    }

    return { receivables, payables };
  }, [loans]);

  // Compute Balance Sheet Position
  const balanceSheet = useMemo(() => {
    const cashAssets = accounts
      .filter(a => a.type !== 'credit_card')
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const loanReceivables = loans
      .filter(l => l.type === 'lent' && l.status !== 'archived')
      .reduce((sum, l) => sum + l.currentBalance, 0);

    const totalAssets = cashAssets + loanReceivables;

    const ccLiabilities = accounts
      .filter(a => a.type === 'credit_card')
      .reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);

    const loanPayables = loans
      .filter(l => l.type === 'borrowed' && l.status !== 'archived')
      .reduce((sum, l) => sum + l.currentBalance, 0);

    const totalLiabilities = ccLiabilities + loanPayables;
    const netEquity = totalAssets - totalLiabilities;

    return {
      cashAssets,
      loanReceivables,
      totalAssets,
      ccLiabilities,
      loanPayables,
      totalLiabilities,
      netEquity,
    };
  }, [accounts, loans]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Financial Reports & Statements</h2>
          <p className="text-xs text-zinc-400">
            Double-entry reconciled accounting statements and debt aging analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
          >
            Print / PDF Statement
          </Button>
        </div>
      </div>

      {/* Report Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs w-fit">
        <button
          onClick={() => setReportType('income_expense')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            reportType === 'income_expense'
              ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Income & Expense Statement
        </button>
        <button
          onClick={() => setReportType('aging')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            reportType === 'aging'
              ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Debt Aging Analysis
        </button>
        <button
          onClick={() => setReportType('balance_sheet')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            reportType === 'balance_sheet'
              ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Net Worth & Balance Sheet
        </button>
      </div>

      {/* Report Content */}
      {reportType === 'income_expense' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-xs text-zinc-400 font-medium">Total Earned (All Time)</span>
              <div className="mt-1">
                <MoneyDisplay
                  amount={incomeExpenseSummary.totalIncome}
                  hideBalances={hideBalances}
                  size="2xl"
                  colorVariant="positive"
                />
              </div>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-zinc-400 font-medium">Total Spent (All Time)</span>
              <div className="mt-1">
                <MoneyDisplay
                  amount={incomeExpenseSummary.totalExpense}
                  hideBalances={hideBalances}
                  size="2xl"
                  colorVariant="negative"
                />
              </div>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-zinc-400 font-medium">Net Savings Accumulated</span>
              <div className="mt-1">
                <MoneyDisplay
                  amount={incomeExpenseSummary.netSavings}
                  hideBalances={hideBalances}
                  size="2xl"
                  colorVariant="auto"
                />
              </div>
            </Card>
          </div>

          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">Category Spending Distribution</h3>
            <div className="divide-y divide-zinc-800/80 text-xs">
              {incomeExpenseSummary.categories.map(cat => {
                const percent = incomeExpenseSummary.totalExpense > 0
                  ? ((cat.amount / incomeExpenseSummary.totalExpense) * 100).toFixed(1)
                  : '0';

                return (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between">
                    <span className="text-zinc-200 font-medium">{cat.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-500 w-12 text-right">{percent}%</span>
                      <MoneyDisplay amount={cat.amount} hideBalances={hideBalances} size="base" colorVariant="negative" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {reportType === 'aging' && (
        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Receivables Aging (Money Lent)</h3>
              <p className="text-xs text-zinc-400">Aging buckets of outstanding amounts owed to you</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-zinc-500 text-xs">0 - 30 Days (Current)</span>
                <MoneyDisplay amount={agingReport.receivables['0_30']} hideBalances={hideBalances} size="xl" colorVariant="positive" />
              </div>
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-amber-400 text-xs">31 - 60 Days (Aging)</span>
                <MoneyDisplay amount={agingReport.receivables['31_60']} hideBalances={hideBalances} size="xl" colorVariant="positive" />
              </div>
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-rose-400 text-xs">&gt; 60 Days (Delinquent)</span>
                <MoneyDisplay amount={agingReport.receivables['60_plus']} hideBalances={hideBalances} size="xl" colorVariant="positive" />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Payables Aging (Money Borrowed)</h3>
              <p className="text-xs text-zinc-400">Aging buckets of liabilities you owe to others</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-zinc-500 text-xs">0 - 30 Days (Current)</span>
                <MoneyDisplay amount={agingReport.payables['0_30']} hideBalances={hideBalances} size="xl" colorVariant="negative" />
              </div>
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-amber-400 text-xs">31 - 60 Days</span>
                <MoneyDisplay amount={agingReport.payables['31_60']} hideBalances={hideBalances} size="xl" colorVariant="negative" />
              </div>
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                <span className="text-rose-400 text-xs">&gt; 60 Days</span>
                <MoneyDisplay amount={agingReport.payables['60_plus']} hideBalances={hideBalances} size="xl" colorVariant="negative" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {reportType === 'balance_sheet' && (
        <Card className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Personal Balance Sheet Statement</h3>
            <p className="text-xs text-zinc-400">
              Double-entry fundamental accounting identity: Assets = Liabilities + Net Worth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <h4 className="font-semibold text-emerald-400 border-b border-zinc-800 pb-1.5 uppercase text-[11px] tracking-wider">
                1. Assets
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-300">Liquid Cash & Bank Accounts</span>
                  <MoneyDisplay amount={balanceSheet.cashAssets} hideBalances={hideBalances} size="sm" colorVariant="positive" />
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-300">Loan Receivables (Owed by Others)</span>
                  <MoneyDisplay amount={balanceSheet.loanReceivables} hideBalances={hideBalances} size="sm" colorVariant="positive" />
                </div>
                <div className="flex justify-between py-2 font-bold text-zinc-100 border-t border-zinc-800">
                  <span>TOTAL ASSETS</span>
                  <MoneyDisplay amount={balanceSheet.totalAssets} hideBalances={hideBalances} size="base" colorVariant="positive" />
                </div>
              </div>
            </div>

            {/* Liabilities */}
            <div className="space-y-3">
              <h4 className="font-semibold text-rose-400 border-b border-zinc-800 pb-1.5 uppercase text-[11px] tracking-wider">
                2. Liabilities
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-300">Credit Card Debt</span>
                  <MoneyDisplay amount={balanceSheet.ccLiabilities} hideBalances={hideBalances} size="sm" colorVariant="negative" />
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span className="text-zinc-300">Loans Payable (Borrowed from Others)</span>
                  <MoneyDisplay amount={balanceSheet.loanPayables} hideBalances={hideBalances} size="sm" colorVariant="negative" />
                </div>
                <div className="flex justify-between py-2 font-bold text-zinc-100 border-t border-zinc-800">
                  <span>TOTAL LIABILITIES</span>
                  <MoneyDisplay amount={balanceSheet.totalLiabilities} hideBalances={hideBalances} size="base" colorVariant="negative" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
            <span className="font-bold text-sm text-zinc-200">NET FINANCIAL POSITION (NET WORTH):</span>
            <MoneyDisplay amount={balanceSheet.netEquity} hideBalances={hideBalances} size="xl" colorVariant="auto" />
          </div>
        </Card>
      )}
    </div>
  );
};
