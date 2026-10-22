import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../db/database';
import {
  Account,
  AppSettings,
  Budget,
  Category,
  Currency,
  Group,
  GroupExpense,
  GroupSettlement,
  Loan,
  Person,
  RecurringRule,
  Reminder,
  SavingsGoal,
  Transaction,
} from '../types';

export type DateFilterType = 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRangeFromType(type: DateFilterType, customRange?: DateRange): DateRange {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (type) {
    case 'today':
      return { start: startOfDay, end: endOfDay };

    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
      return { start, end: endOfDay };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: endOfDay };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }

    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, end: endOfDay };
    }

    case 'custom':
      return customRange || { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay };

    case 'all':
    default:
      return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
  }
}

export function useFinancialData() {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('this_month');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  // Reactive IndexedDB queries via Dexie
  const settings = useLiveQuery(() => db.settings.get('default')) as AppSettings | undefined;
  const accounts = useLiveQuery(() => db.accounts.where('isArchived').equals(0).toArray(), [], []) as Account[];
  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [], []) as Account[];
  const people = useLiveQuery(() => db.people.toArray(), [], []) as Person[];
  const categories = useLiveQuery(() => db.categories.toArray(), [], []) as Category[];
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), [], []) as Transaction[];
  const loans = useLiveQuery(() => db.loans.toArray(), [], []) as Loan[];
  const groups = useLiveQuery(() => db.groups.toArray(), [], []) as Group[];
  const groupExpenses = useLiveQuery(() => db.groupExpenses.toArray(), [], []) as GroupExpense[];
  const groupSettlements = useLiveQuery(() => db.groupSettlements.toArray(), [], []) as GroupSettlement[];
  const budgets = useLiveQuery(() => db.budgets.toArray(), [], []) as Budget[];
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray(), [], []) as SavingsGoal[];
  const recurringRules = useLiveQuery(() => db.recurringRules.toArray(), [], []) as RecurringRule[];
  const reminders = useLiveQuery(() => db.reminders.toArray(), [], []) as Reminder[];
  const currencies = useLiveQuery(() => db.currencies.toArray(), [], []) as Currency[];

  const currentRange = useMemo(() => getDateRangeFromType(dateFilter, customRange), [dateFilter, customRange]);

  // Filter transactions within selected period
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.status === 'voided') return false;
      const d = new Date(t.date);
      return d >= currentRange.start && d <= currentRange.end;
    });
  }, [transactions, currentRange]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    // 1. Actual Cash Available (positive liquid accounts: cash, bank, savings, wallet)
    let totalCash = 0;
    let totalCreditCardDebt = 0;

    for (const acc of accounts) {
      if (acc.type === 'credit_card') {
        if (acc.currentBalance > 0) {
          totalCreditCardDebt += acc.currentBalance;
        }
      } else {
        totalCash += acc.currentBalance;
      }
    }

    // 2. Receivables: Money others owe me
    // Active loans of type 'lent' with remaining balance
    let totalLoanReceivables = 0;
    let totalLoanLiabilities = 0;
    const overdueLoans: Loan[] = [];
    const now = new Date();

    for (const loan of loans) {
      if (loan.status === 'archived' || loan.currentBalance <= 0) continue;

      if (loan.type === 'lent') {
        totalLoanReceivables += loan.currentBalance;
      } else if (loan.type === 'borrowed') {
        totalLoanLiabilities += loan.currentBalance;
      }

      // Check overdue
      if (loan.dueDate && new Date(loan.dueDate) < now) {
        overdueLoans.push(loan);
      }
    }

    // Total liabilities = Loan liabilities + CC debt
    const totalLiabilities = totalLoanLiabilities + totalCreditCardDebt;
    const totalReceivables = totalLoanReceivables;

    // Net Financial Position
    const netWorth = totalCash + totalReceivables - totalLiabilities;

    // Period calculations
    let periodIncome = 0;
    let periodExpenses = 0;
    let periodLent = 0;
    let periodBorrowed = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'income') {
        periodIncome += t.amount;
      } else if (t.type === 'personal_expense' || t.type === 'group_expense') {
        // If group_expense, only user's share is personal expense
        periodExpenses += t.amount;
      } else if (t.type === 'refund') {
        periodExpenses = Math.max(0, periodExpenses - t.amount);
      } else if (t.type === 'money_lent') {
        periodLent += t.amount;
      } else if (t.type === 'money_borrowed') {
        periodBorrowed += t.amount;
      }
    }

    const netCashFlow = periodIncome - periodExpenses;

    // Category spending breakdown for period
    const catSpendingMap: Record<string, { name: string; color: string; amount: number }> = {};
    for (const t of filteredTransactions) {
      if (t.type === 'personal_expense' || t.type === 'group_expense') {
        const cat = categories.find(c => c.id === t.categoryId);
        const catId = t.categoryId || 'other';
        const name = cat ? cat.name : 'Other Expenses';
        const color = cat?.color || '#64748b';

        if (!catSpendingMap[catId]) {
          catSpendingMap[catId] = { name, color, amount: 0 };
        }
        catSpendingMap[catId].amount += t.amount;
      }
    }

    const categoryBreakdown = Object.values(catSpendingMap).sort((a, b) => b.amount - a.amount);

    return {
      totalCash,
      totalCreditCardDebt,
      totalReceivables,
      totalLiabilities,
      netWorth,
      periodIncome,
      periodExpenses,
      netCashFlow,
      periodLent,
      periodBorrowed,
      overdueLoans,
      categoryBreakdown,
    };
  }, [accounts, loans, filteredTransactions, categories]);

  // 6-month historical monthly cash flow series for Recharts
  const monthlyCashflowSeries = useMemo(() => {
    const months: { monthStr: string; label: string; income: number; expense: number; net: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });

      let inc = 0;
      let exp = 0;

      for (const t of transactions) {
        if (t.status === 'voided') continue;
        if (t.date.startsWith(mStr)) {
          if (t.type === 'income') inc += t.amount;
          else if (t.type === 'personal_expense' || t.type === 'group_expense') exp += t.amount;
        }
      }

      months.push({
        monthStr: mStr,
        label,
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }

    return months;
  }, [transactions]);

  return {
    settings,
    accounts,
    allAccounts,
    people,
    categories,
    transactions,
    filteredTransactions,
    loans,
    groups,
    groupExpenses,
    groupSettlements,
    budgets,
    savingsGoals,
    recurringRules,
    reminders,
    currencies,
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    metrics,
    monthlyCashflowSeries,
  };
}
