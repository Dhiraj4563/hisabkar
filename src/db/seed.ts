import { db } from './database';
import { AppSettings, Category, Currency } from '../types';
import { DEFAULT_CURRENCIES } from '../lib/money';
import { postTransaction } from '../features/accounting/ledgerEngine';

export const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  // Income
  { name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10b981', isArchived: false, isDefault: true },
  { name: 'Freelance', type: 'income', icon: 'Laptop', color: '#06b6d4', isArchived: false, isDefault: true },
  { name: 'Business Income', type: 'income', icon: 'TrendingUp', color: '#3b82f6', isArchived: false, isDefault: true },
  { name: 'Investments & Interest', type: 'income', icon: 'Coins', color: '#8b5cf6', isArchived: false, isDefault: true },
  { name: 'Gifts & Grants', type: 'income', icon: 'Gift', color: '#ec4899', isArchived: false, isDefault: true },
  { name: 'Other Income', type: 'income', icon: 'PlusCircle', color: '#64748b', isArchived: false, isDefault: true },

  // Expenses
  { name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#10b981', isArchived: false, isDefault: true },
  { name: 'Food & Dining', type: 'expense', icon: 'Utensils', color: '#f59e0b', isArchived: false, isDefault: true },
  { name: 'Rent & Housing', type: 'expense', icon: 'Home', color: '#ef4444', isArchived: false, isDefault: true },
  { name: 'Utilities & Bills', type: 'expense', icon: 'Zap', color: '#eab308', isArchived: false, isDefault: true },
  { name: 'Transport & Fuel', type: 'expense', icon: 'Car', color: '#3b82f6', isArchived: false, isDefault: true },
  { name: 'Travel & Trips', type: 'expense', icon: 'Plane', color: '#06b6d4', isArchived: false, isDefault: true },
  { name: 'Shopping & Clothes', type: 'expense', icon: 'ShoppingBag', color: '#ec4899', isArchived: false, isDefault: true },
  { name: 'Healthcare & Medical', type: 'expense', icon: 'Activity', color: '#f43f5e', isArchived: false, isDefault: true },
  { name: 'Education & Courses', type: 'expense', icon: 'BookOpen', color: '#8b5cf6', isArchived: false, isDefault: true },
  { name: 'Entertainment & Fun', type: 'expense', icon: 'Film', color: '#a855f7', isArchived: false, isDefault: true },
  { name: 'Subscriptions', type: 'expense', icon: 'Tv', color: '#6366f1', isArchived: false, isDefault: true },
  { name: 'Personal Care', type: 'expense', icon: 'Smile', color: '#14b8a6', isArchived: false, isDefault: true },
  { name: 'Family & Dependents', type: 'expense', icon: 'Users', color: '#d97706', isArchived: false, isDefault: true },
  { name: 'Other Expenses', type: 'expense', icon: 'MoreHorizontal', color: '#64748b', isArchived: false, isDefault: true },
];

/**
 * Initializes basic default settings, currencies, and categories on first boot.
 */
export async function initializeDatabase(): Promise<void> {
  const existingSettings = await db.settings.get('default');
  if (existingSettings?.initialized) {
    return;
  }

  // 1. Settings
  const defaultSettings: AppSettings = {
    id: 'default',
    theme: 'dark',
    defaultCurrency: 'INR',
    hideBalances: false,
    appLockEnabled: false,
    autoLockMinutes: 0,
    backupReminderDays: 14,
    ownerName: 'You',
    initialized: true,
  };
  await db.settings.put(defaultSettings);

  // 2. Currencies
  for (const curr of Object.values(DEFAULT_CURRENCIES)) {
    const existing = await db.currencies.get(curr.code);
    if (!existing) {
      await db.currencies.put(curr);
    }
  }

  // 3. Categories
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await db.categories.put({
        ...cat,
        id: `cat_${cat.type}_${cat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      });
    }
  }

  // 4. Default Accounts
  const accountCount = await db.accounts.count();
  if (accountCount === 0) {
    const now = new Date().toISOString();
    await db.accounts.bulkPut([
      {
        id: 'acc_cash',
        name: 'Cash in Hand',
        type: 'cash',
        currency: 'INR',
        openingBalance: 0,
        currentBalance: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'acc_bank_primary',
        name: 'Main Bank Account',
        type: 'bank',
        currency: 'INR',
        openingBalance: 0,
        currentBalance: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }
}

/**
 * Seeds comprehensive realistic demo data for testing all modules:
 * - Accounts with realistic balances
 * - Contacts (Rahul, Priya, Amit, Sara)
 * - Lending & borrowing with partial repayment
 * - Goa Trip group with multiple splits and settlements
 * - Monthly budgets and savings goals
 */
export async function seedDemoData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.people,
      db.categories,
      db.transactions,
      db.journalEntries,
      db.journalLines,
      db.loans,
      db.loanRepayments,
      db.groups,
      db.groupExpenses,
      db.groupSettlements,
      db.budgets,
      db.savingsGoals,
      db.recurringRules,
      db.reminders,
    ],
    async () => {
      const now = new Date();
      const nowStr = now.toISOString();

      // Accounts
      await db.accounts.bulkPut([
        {
          id: 'acc_cash',
          name: 'Cash Wallet',
          type: 'cash',
          currency: 'INR',
          openingBalance: 500000, // ₹5,000.00
          currentBalance: 500000,
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        },
        {
          id: 'acc_bank_hdfc',
          name: 'HDFC Savings A/C',
          type: 'bank',
          currency: 'INR',
          openingBalance: 7500000, // ₹75,000.00
          currentBalance: 7500000,
          institutionName: 'HDFC Bank',
          accountNumberMask: '••• 4892',
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        },
        {
          id: 'acc_cc_icici',
          name: 'ICICI Amazon Pay CC',
          type: 'credit_card',
          currency: 'INR',
          openingBalance: 0,
          currentBalance: 0,
          institutionName: 'ICICI Bank',
          accountNumberMask: '••• 9012',
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        },
      ]);

      // People
      const rahulId = 'person_rahul';
      const priyaId = 'person_priya';
      const amitId = 'person_amit';
      const saraId = 'person_sara';

      await db.people.bulkPut([
        {
          id: rahulId,
          name: 'Rahul Sharma',
          nickname: 'Rahul',
          phone: '+91 98765 43210',
          email: 'rahul.s@example.com',
          notes: 'College roommate, reliable for quick UPI settlements',
          tags: ['Friend', 'Roommate'],
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        },
        {
          id: priyaId,
          name: 'Priya Patel',
          nickname: 'Priya',
          phone: '+91 98123 45678',
          email: 'priya.p@example.com',
          notes: 'Colleague at TechWorks',
          tags: ['Colleague', 'Trip Buddy'],
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        },
        {
          id: amitId,
          name: 'Amit Verma',
          nickname: 'Amit',
          phone: '+91 97654 32109',
          email: 'amit.v@example.com',
          notes: 'Gym partner',
          tags: ['Friend'],
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        },
        {
          id: saraId,
          name: 'Sara Khan',
          nickname: 'Sara',
          phone: '+91 99887 76655',
          email: 'sara.k@example.com',
          notes: 'Travel group organizer',
          tags: ['Friend', 'Travel'],
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        },
      ]);

      // Seed transactions using double-entry engine
      // 1. Salary
      await postTransaction({
        type: 'income',
        amount: 8500000, // ₹85,000.00
        currency: 'INR',
        accountId: 'acc_bank_hdfc',
        categoryId: 'cat_income_salary',
        description: 'Monthly Salary - TechWorks India',
        date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      });

      // 2. Rent payment
      await postTransaction({
        type: 'personal_expense',
        amount: 2200000, // ₹22,000.00
        currency: 'INR',
        accountId: 'acc_bank_hdfc',
        categoryId: 'cat_expense_rent___housing',
        description: 'Apartment Rent for October',
        date: new Date(now.getFullYear(), now.getMonth(), 2).toISOString(),
      });

      // 3. Groceries
      await postTransaction({
        type: 'personal_expense',
        amount: 450000, // ₹4,500.00
        currency: 'INR',
        accountId: 'acc_bank_hdfc',
        categoryId: 'cat_expense_groceries',
        description: 'Blinkit Superstore essentials',
        date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
      });

      // 4. Money Lent to Rahul (Loan)
      const loanTx = await postTransaction({
        type: 'money_lent',
        amount: 1000000, // ₹10,000.00
        currency: 'INR',
        accountId: 'acc_bank_hdfc',
        personId: rahulId,
        description: 'Emergency laptop repair loan',
        date: new Date(now.getFullYear(), now.getMonth(), 8).toISOString(),
        dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      });

      // 5. Rahul partial repayment
      await postTransaction({
        type: 'loan_repayment_received',
        amount: 400000, // ₹4,000.00 repaid, ₹6,000 remaining
        currency: 'INR',
        accountId: 'acc_bank_hdfc',
        personId: rahulId,
        loanId: loanTx.id,
        description: 'Partial repayment via GPay',
        date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
      });

      // 6. Money Borrowed from Amit (Liability)
      await postTransaction({
        type: 'money_borrowed',
        amount: 300000, // ₹3,000.00
        currency: 'INR',
        accountId: 'acc_cash',
        personId: amitId,
        description: 'Cash borrowed at weekend market',
        date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(),
        dueDate: new Date(now.getFullYear(), now.getMonth(), 28).toISOString(),
      });

      // 7. Group Creation: "Goa Vacation 🏖️"
      const groupId = 'group_goa_2026';
      await db.groups.put({
        id: groupId,
        name: 'Goa Vacation 🏖️',
        description: 'Beach resort, scooty rental & seafood dinners',
        currency: 'INR',
        memberPersonIds: ['__ME__', rahulId, priyaId, saraId],
        isArchived: false,
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      // Group expense 1: Resort Booking (Paid by user ₹16,000 split equally 4 ways)
      const grpTx1 = await postTransaction({
        type: 'group_expense',
        amount: 1600000, // ₹16,000
        currency: 'INR',
        accountId: 'acc_bank_hdfc',
        categoryId: 'cat_expense_travel___trips',
        groupId,
        description: 'Villa & Resort booking 3 nights',
        userShareAmount: 400000, // ₹4,000 is user's share
        payerPersonId: '__ME__',
        memberReceivables: [
          { personId: rahulId, amount: 400000 },
          { personId: priyaId, amount: 400000 },
          { personId: saraId, amount: 400000 },
        ],
        date: new Date(now.getFullYear(), now.getMonth(), 14).toISOString(),
      });

      await db.groupExpenses.put({
        id: crypto.randomUUID(),
        groupId,
        transactionId: grpTx1.id,
        payerPersonId: '__ME__',
        totalAmount: 1600000,
        currency: 'INR',
        date: new Date(now.getFullYear(), now.getMonth(), 14).toISOString(),
        description: 'Villa & Resort booking 3 nights',
        splitType: 'equal',
        splits: [
          { personId: '__ME__', amount: 400000 },
          { personId: rahulId, amount: 400000 },
          { personId: priyaId, amount: 400000 },
          { personId: saraId, amount: 400000 },
        ],
        createdAt: nowStr,
      });

      // Budgets
      await db.budgets.bulkPut([
        {
          id: 'b_food',
          categoryId: 'cat_expense_food___dining',
          amount: 1200000, // ₹12,000 monthly limit
          currency: 'INR',
          monthStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          rolloverEnabled: false,
          createdAt: nowStr,
        },
        {
          id: 'b_groceries',
          categoryId: 'cat_expense_groceries',
          amount: 800000, // ₹8,000 limit
          currency: 'INR',
          monthStr: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          rolloverEnabled: false,
          createdAt: nowStr,
        },
      ]);

      // Savings Goals
      await db.savingsGoals.bulkPut([
        {
          id: 'sg_emergency',
          name: 'Emergency Rainy Day Fund',
          targetAmount: 20000000, // ₹2,00,000
          currentAmount: 12500000, // ₹1,25,000 (62.5%)
          currency: 'INR',
          targetDate: new Date(now.getFullYear(), 11, 31).toISOString(),
          isCompleted: false,
          createdAt: nowStr,
        },
        {
          id: 'sg_laptop',
          name: 'M3 Pro MacBook Pro',
          targetAmount: 18000000, // ₹1,80,000
          currentAmount: 9000000, // ₹90,000 (50%)
          currency: 'INR',
          targetDate: new Date(now.getFullYear() + 1, 2, 31).toISOString(),
          isCompleted: false,
          createdAt: nowStr,
        },
      ]);

      // Recurring Rules
      await db.recurringRules.put({
        id: 'rec_salary',
        title: 'Monthly Salary TechWorks',
        type: 'income',
        amount: 8500000,
        currency: 'INR',
        accountId: 'acc_bank_hdfc',
        categoryId: 'cat_income_salary',
        frequency: 'monthly',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        nextOccurrence: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
        isActive: true,
        createdAt: nowStr,
      });

      // Reminders
      await db.reminders.bulkPut([
        {
          id: 'rem_rahul_loan',
          title: 'Rahul Laptop Loan balance check',
          dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
          amount: 600000,
          currency: 'INR',
          type: 'loan_repayment',
          entityId: rahulId,
          isDismissed: false,
          isCompleted: false,
          createdAt: nowStr,
        },
        {
          id: 'rem_amit_repay',
          title: 'Pay back Amit ₹3,000 for weekend cash',
          dueDate: new Date(now.getFullYear(), now.getMonth(), 28).toISOString(),
          amount: 300000,
          currency: 'INR',
          type: 'bill',
          entityId: amitId,
          isDismissed: false,
          isCompleted: false,
          createdAt: nowStr,
        },
      ]);
    }
  );
}

/**
 * Resets the entire database safely after user confirmation.
 */
export async function clearAllFinancialData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.people,
      db.categories,
      db.transactions,
      db.journalEntries,
      db.journalLines,
      db.loans,
      db.loanRepayments,
      db.groups,
      db.groupExpenses,
      db.groupSettlements,
      db.budgets,
      db.savingsGoals,
      db.recurringRules,
      db.reminders,
      db.auditEvents,
    ],
    async () => {
      await db.accounts.clear();
      await db.people.clear();
      await db.categories.clear();
      await db.transactions.clear();
      await db.journalEntries.clear();
      await db.journalLines.clear();
      await db.loans.clear();
      await db.loanRepayments.clear();
      await db.groups.clear();
      await db.groupExpenses.clear();
      await db.groupSettlements.clear();
      await db.budgets.clear();
      await db.savingsGoals.clear();
      await db.recurringRules.clear();
      await db.reminders.clear();
      await db.auditEvents.clear();
    }
  );

  // Re-seed essential defaults
  await initializeDatabase();
}
