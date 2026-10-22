import Dexie, { type Table } from 'dexie';
import {
  Account,
  AppSettings,
  AuditEvent,
  Budget,
  Category,
  Currency,
  Group,
  GroupExpense,
  GroupSettlement,
  JournalEntry,
  JournalLine,
  Loan,
  LoanRepayment,
  Person,
  RecurringRule,
  Reminder,
  SavingsGoal,
  Transaction,
} from '../types';

export class HisabMateDatabase extends Dexie {
  settings!: Table<AppSettings, string>;
  currencies!: Table<Currency, string>;
  accounts!: Table<Account, string>;
  people!: Table<Person, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  journalEntries!: Table<JournalEntry, string>;
  journalLines!: Table<JournalLine, string>;
  loans!: Table<Loan, string>;
  loanRepayments!: Table<LoanRepayment, string>;
  groups!: Table<Group, string>;
  groupExpenses!: Table<GroupExpense, string>;
  groupSettlements!: Table<GroupSettlement, string>;
  budgets!: Table<Budget, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  recurringRules!: Table<RecurringRule, string>;
  reminders!: Table<Reminder, string>;
  auditEvents!: Table<AuditEvent, string>;

  constructor() {
    super('HisabMateDB');
    this.version(1).stores({
      settings: 'id',
      currencies: 'code',
      accounts: 'id, type, currency, isArchived, createdAt',
      people: 'id, name, isArchived, createdAt',
      categories: 'id, type, isArchived',
      transactions: 'id, date, type, accountId, categoryId, personId, groupId, loanId, status, createdAt',
      journalEntries: 'id, transactionId, date, isBalanced',
      journalLines: 'id, journalEntryId, accountCategory, entityId, currency',
      loans: 'id, personId, type, status, accountId, startDate, dueDate',
      loanRepayments: 'id, loanId, transactionId, date',
      groups: 'id, isArchived, createdAt',
      groupExpenses: 'id, groupId, transactionId, payerPersonId, date',
      groupSettlements: 'id, groupId, transactionId, fromPersonId, toPersonId, status, date',
      budgets: 'id, categoryId, monthStr',
      savingsGoals: 'id, targetDate, isCompleted',
      recurringRules: 'id, nextOccurrence, isActive',
      reminders: 'id, dueDate, type, isDismissed, isCompleted',
      auditEvents: 'id, timestamp, entityType, entityId',
    });
  }
}

export const db = new HisabMateDatabase();
