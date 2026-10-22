export type CurrencyCode = 'INR' | 'NPR' | 'USD' | 'EUR' | 'GBP' | string;

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  precision: number;
  rateToDefault: number;
  isDefault: boolean;
}

export type AccountType = 'cash' | 'bank' | 'digital_wallet' | 'savings' | 'credit_card' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalance: number; // In minor units (e.g. cents/paise)
  currentBalance: number; // In minor units
  institutionName?: string;
  accountNumberMask?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  nickname?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  isArchived: boolean;
  isDefault?: boolean;
}

export type TransactionType =
  | 'income'
  | 'personal_expense'
  | 'money_lent'
  | 'money_borrowed'
  | 'loan_repayment_received'
  | 'loan_repayment_made'
  | 'account_transfer'
  | 'group_expense'
  | 'group_settlement'
  | 'refund'
  | 'expense_reimbursement';

export type TransactionStatus = 'posted' | 'voided' | 'draft';

export interface Transaction {
  id: string;
  date: string; // ISO string YYYY-MM-DDTHH:mm:ss
  type: TransactionType;
  amount: number; // in minor units
  currency: CurrencyCode;
  accountId: string; // primary account
  toAccountId?: string; // for transfers
  categoryId?: string; // for income / expense
  personId?: string; // for lent / borrowed / repayment / group member
  groupId?: string; // for group expenses & settlements
  loanId?: string; // associated loan ID if applicable
  description: string;
  notes?: string;
  tags: string[];
  dueDate?: string;
  status: TransactionStatus;
  receiptDataUrl?: string;
  receiptName?: string;
  exchangeRate: number; // rate to reporting currency at transaction time
  reportingAmount: number; // amount in default reporting currency (minor units)
  isReversal?: boolean;
  reversedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountCategory: AccountCategory;
  entityId: string; // accountId, categoryId, or personId (for receivables/payables)
  entityName: string;
  debit: number; // minor units
  credit: number; // minor units
  currency: CurrencyCode;
}

export interface JournalEntry {
  id: string;
  transactionId: string;
  date: string;
  description: string;
  currency: CurrencyCode;
  isBalanced: boolean;
  createdAt: string;
}

export type LoanType = 'lent' | 'borrowed';
export type LoanStatus = 'outstanding' | 'partially_repaid' | 'fully_repaid' | 'overdue' | 'archived';

export interface Loan {
  id: string;
  personId: string;
  type: LoanType;
  principalAmount: number; // minor units
  currentBalance: number; // remaining unpaid principal in minor units
  currency: CurrencyCode;
  accountId: string;
  startDate: string;
  dueDate?: string;
  description: string;
  status: LoanStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  transactionId: string;
  amount: number; // minor units
  currency: CurrencyCode;
  date: string;
  accountId: string;
  notes?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  currency: CurrencyCode;
  memberPersonIds: string[]; // Person IDs. Special ID '__ME__' indicates the app owner
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface ExpenseSplit {
  personId: string; // Person ID or '__ME__'
  amount: number; // Assigned share in minor units
  percentage?: number;
  shares?: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  transactionId: string;
  payerPersonId: string; // Who paid for it ('__ME__' or Person ID)
  totalAmount: number; // minor units
  currency: CurrencyCode;
  date: string;
  description: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  notes?: string;
  receiptDataUrl?: string;
  createdAt: string;
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  transactionId?: string;
  fromPersonId: string; // Debtor
  toPersonId: string; // Creditor
  amount: number; // minor units
  currency: CurrencyCode;
  date: string;
  status: 'suggested' | 'settled';
  notes?: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number; // Monthly budget limit in minor units
  currency: CurrencyCode;
  monthStr: string; // e.g. "2026-10" or "ALL" for recurring default
  rolloverEnabled: boolean;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number; // minor units
  currentAmount: number; // minor units
  currency: CurrencyCode;
  targetDate: string;
  isCompleted: boolean;
  category?: string;
  createdAt: string;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  title: string;
  type: TransactionType;
  amount: number; // minor units
  currency: CurrencyCode;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  personId?: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate?: string;
  nextOccurrence: string;
  lastGeneratedDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export type ReminderType = 'loan_repayment' | 'bill' | 'settlement' | 'budget_review' | 'custom';

export interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  amount?: number;
  currency?: CurrencyCode;
  type: ReminderType;
  entityId?: string;
  isDismissed: boolean;
  isCompleted: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: 'create' | 'update' | 'void' | 'delete' | 'restore';
  entityType: string;
  entityId: string;
  details: string;
}

export interface AppSettings {
  id: string; // usually 'default'
  theme: 'dark' | 'light';
  defaultCurrency: CurrencyCode;
  hideBalances: boolean;
  appLockEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  autoLockMinutes: number; // 0 = never, 1, 5, 15
  backupReminderDays: number;
  lastBackupDate?: string;
  ownerName: string;
  ownerProfileImage?: string;
  initialized: boolean;
}
