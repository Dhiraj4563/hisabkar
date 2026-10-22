import { db } from '../db/database';
import { encryptData, decryptData, EncryptedPayload } from '../lib/crypto';
import { fromMinorUnits, toMinorUnits } from '../lib/money';
import { Transaction, Person, Group, Loan, Account } from '../types';

export interface FullBackupPayload {
  version: 1;
  appName: 'HisabMate';
  exportedAt: string;
  data: {
    settings: unknown[];
    currencies: unknown[];
    accounts: Account[];
    people: Person[];
    categories: unknown[];
    transactions: Transaction[];
    journalEntries: unknown[];
    journalLines: unknown[];
    loans: Loan[];
    loanRepayments: unknown[];
    groups: Group[];
    groupExpenses: unknown[];
    groupSettlements: unknown[];
    budgets: unknown[];
    savingsGoals: unknown[];
    recurringRules: unknown[];
    reminders: unknown[];
  };
}

/**
 * Creates a complete JSON backup object of all database tables.
 */
export async function createFullBackup(): Promise<FullBackupPayload> {
  const [
    settings,
    currencies,
    accounts,
    people,
    categories,
    transactions,
    journalEntries,
    journalLines,
    loans,
    loanRepayments,
    groups,
    groupExpenses,
    groupSettlements,
    budgets,
    savingsGoals,
    recurringRules,
    reminders,
  ] = await Promise.all([
    db.settings.toArray(),
    db.currencies.toArray(),
    db.accounts.toArray(),
    db.people.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.journalEntries.toArray(),
    db.journalLines.toArray(),
    db.loans.toArray(),
    db.loanRepayments.toArray(),
    db.groups.toArray(),
    db.groupExpenses.toArray(),
    db.groupSettlements.toArray(),
    db.budgets.toArray(),
    db.savingsGoals.toArray(),
    db.recurringRules.toArray(),
    db.reminders.toArray(),
  ]);

  return {
    version: 1,
    appName: 'HisabMate',
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      currencies,
      accounts,
      people,
      categories,
      transactions,
      journalEntries,
      journalLines,
      loans,
      loanRepayments,
      groups,
      groupExpenses,
      groupSettlements,
      budgets,
      savingsGoals,
      recurringRules,
      reminders,
    },
  };
}

/**
 * Creates an encrypted backup file blob protected by password.
 */
export async function exportEncryptedBackup(password: string): Promise<Blob> {
  const backup = await createFullBackup();
  const encryptedPayload = await encryptData(backup, password);
  const jsonStr = JSON.stringify(encryptedPayload, null, 2);
  return new Blob([jsonStr], { type: 'application/json' });
}

/**
 * Restores all database tables from a backup payload.
 */
export async function restoreFromBackup(payload: FullBackupPayload): Promise<void> {
  if (payload.appName !== 'HisabMate' || payload.version !== 1 || !payload.data) {
    throw new Error('Invalid HisabMate backup file format.');
  }

  const { data } = payload;

  await db.transaction(
    'rw',
    [
      db.settings,
      db.currencies,
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
      // Clear existing records before restore
      await Promise.all([
        db.settings.clear(),
        db.currencies.clear(),
        db.accounts.clear(),
        db.people.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.journalEntries.clear(),
        db.journalLines.clear(),
        db.loans.clear(),
        db.loanRepayments.clear(),
        db.groups.clear(),
        db.groupExpenses.clear(),
        db.groupSettlements.clear(),
        db.budgets.clear(),
        db.savingsGoals.clear(),
        db.recurringRules.clear(),
        db.reminders.clear(),
      ]);

      // Bulk restore all tables
      if (data.settings?.length) await db.settings.bulkPut(data.settings as any);
      if (data.currencies?.length) await db.currencies.bulkPut(data.currencies as any);
      if (data.accounts?.length) await db.accounts.bulkPut(data.accounts);
      if (data.people?.length) await db.people.bulkPut(data.people);
      if (data.categories?.length) await db.categories.bulkPut(data.categories as any);
      if (data.transactions?.length) await db.transactions.bulkPut(data.transactions);
      if (data.journalEntries?.length) await db.journalEntries.bulkPut(data.journalEntries as any);
      if (data.journalLines?.length) await db.journalLines.bulkPut(data.journalLines as any);
      if (data.loans?.length) await db.loans.bulkPut(data.loans);
      if (data.loanRepayments?.length) await db.loanRepayments.bulkPut(data.loanRepayments as any);
      if (data.groups?.length) await db.groups.bulkPut(data.groups);
      if (data.groupExpenses?.length) await db.groupExpenses.bulkPut(data.groupExpenses as any);
      if (data.groupSettlements?.length) await db.groupSettlements.bulkPut(data.groupSettlements as any);
      if (data.budgets?.length) await db.budgets.bulkPut(data.budgets as any);
      if (data.savingsGoals?.length) await db.savingsGoals.bulkPut(data.savingsGoals as any);
      if (data.recurringRules?.length) await db.recurringRules.bulkPut(data.recurringRules as any);
      if (data.reminders?.length) await db.reminders.bulkPut(data.reminders as any);
    }
  );
}

/**
 * Restores from encrypted backup string or object using password.
 */
export async function restoreFromEncryptedBackup(
  encryptedJsonStr: string,
  password: string
): Promise<FullBackupPayload> {
  const payload = JSON.parse(encryptedJsonStr) as EncryptedPayload;
  const decryptedBackup = await decryptData<FullBackupPayload>(payload, password);
  await restoreFromBackup(decryptedBackup);
  return decryptedBackup;
}

/**
 * Generates CSV string for transactions.
 */
export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = [
    'Date',
    'Type',
    'Description',
    'Amount',
    'Currency',
    'Status',
    'Category',
    'Notes',
    'Tags',
  ];

  const rows = transactions.map(t => [
    t.date,
    t.type,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    fromMinorUnits(t.amount, 2).toFixed(2),
    t.currency,
    t.status,
    t.categoryId || '',
    `"${(t.notes || '').replace(/"/g, '""')}"`,
    `"${(t.tags || []).join(', ')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Parses CSV text and extracts transactions preview.
 */
export function parseCSVTransactions(csvText: string): {
  success: boolean;
  rows: Partial<Transaction>[];
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { success: false, rows: [], errors: ['CSV file is empty or missing headers.'] };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  const dateIdx = headers.findIndex(h => h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narration') || h.includes('title'));
  const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('total'));
  const typeIdx = headers.findIndex(h => h.includes('type'));

  if (amountIdx === -1) {
    return { success: false, rows: [], errors: ['Could not detect an Amount column in CSV.'] };
  }

  const rows: Partial<Transaction>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple regex CSV parser for quoted items
    const cols = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rawLine.split(',');
    const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

    const rawAmt = parseFloat(cleanCols[amountIdx]?.replace(/[^0-9.-]/g, '') || '0');
    if (isNaN(rawAmt) || rawAmt === 0) {
      errors.push(`Row ${i + 1}: Invalid or zero amount.`);
      continue;
    }

    const isNegative = rawAmt < 0;
    const absAmt = Math.abs(rawAmt);
    const dateStr = dateIdx !== -1 && cleanCols[dateIdx] ? cleanCols[dateIdx] : new Date().toISOString();
    const desc = descIdx !== -1 && cleanCols[descIdx] ? cleanCols[descIdx] : 'Imported transaction';
    const type = typeIdx !== -1 && cleanCols[typeIdx] ? (cleanCols[typeIdx] as any) : isNegative ? 'personal_expense' : 'income';

    rows.push({
      date: dateStr,
      description: desc,
      amount: toMinorUnits(absAmt, 2),
      currency: 'INR',
      type: type,
      status: 'posted',
      tags: ['imported'],
    });
  }

  return { success: rows.length > 0, rows, errors };
}
