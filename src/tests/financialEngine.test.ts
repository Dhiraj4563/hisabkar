import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  fromMinorUnits,
  distributeEqualSplit,
  distributePercentageSplit,
  distributeSharesSplit,
} from '../lib/money';
import { optimizeSettlements, MemberBalance } from '../lib/settlement';
import { buildJournalLines, validateJournalBalance } from '../features/accounting/ledgerEngine';
import { Account } from '../types';

describe('Financial Engine: Money & Currency Precision', () => {
  it('converts decimal amounts to minor units without floating point loss', () => {
    expect(toMinorUnits(10.55, 2)).toBe(1055);
    expect(toMinorUnits('123.45', 2)).toBe(12345);
    expect(toMinorUnits(0.01, 2)).toBe(1);
    expect(toMinorUnits(100, 0)).toBe(100);
  });

  it('converts minor units to major decimal without distortion', () => {
    expect(fromMinorUnits(1055, 2)).toBe(10.55);
    expect(fromMinorUnits(12345, 2)).toBe(123.45);
    expect(fromMinorUnits(1, 2)).toBe(0.01);
  });
});

describe('Financial Engine: Deterministic Remainder Splitting', () => {
  it('splits integer amount equally and distributes remainders deterministically so sum === total', () => {
    const total = 1000; // 1000 minor units
    const participants = ['user_1', 'user_2', 'user_3'];
    const splits = distributeEqualSplit(total, participants);

    // 1000 / 3 = 333 remainder 1. First gets 334, others 333.
    expect(splits[0].amount).toBe(334);
    expect(splits[1].amount).toBe(333);
    expect(splits[2].amount).toBe(333);

    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(total);
  });

  it('splits percentage allocations deterministically and accounts for any rounding gap', () => {
    const total = 5000; // ₹50.00
    const splits = distributePercentageSplit(total, [
      { personId: 'u1', percentage: 33.33 },
      { personId: 'u2', percentage: 33.33 },
      { personId: 'u3', percentage: 33.34 },
    ]);

    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(total);
  });

  it('splits weighted shares deterministically so sum === total', () => {
    const total = 10000;
    const splits = distributeSharesSplit(total, [
      { personId: 'u1', shares: 2 },
      { personId: 'u2', shares: 1 },
      { personId: 'u3', shares: 1 },
    ]);

    const sum = splits.reduce((acc, s) => acc + s.amount, 0);
    expect(sum).toBe(total);
    expect(splits[0].amount).toBe(5000);
    expect(splits[1].amount).toBe(2500);
    expect(splits[2].amount).toBe(2500);
  });
});

describe('Financial Engine: Group Settlement Optimization', () => {
  it('balances all group members to zero net balance with minimal transfers', () => {
    // A paid 300 (share 100 => +200)
    // B paid 0 (share 100 => -100)
    // C paid 0 (share 100 => -100)
    const balances: MemberBalance[] = [
      { personId: 'Alice', paidAmount: 30000, owedAmount: 10000, netBalance: 20000 },
      { personId: 'Bob', paidAmount: 0, owedAmount: 10000, netBalance: -10000 },
      { personId: 'Charlie', paidAmount: 0, owedAmount: 10000, netBalance: -10000 },
    ];

    const transfers = optimizeSettlements(balances, 'INR');

    expect(transfers.length).toBe(2);
    expect(transfers).toContainEqual({
      fromPersonId: 'Bob',
      toPersonId: 'Alice',
      amount: 10000,
      currency: 'INR',
    });
    expect(transfers).toContainEqual({
      fromPersonId: 'Charlie',
      toPersonId: 'Alice',
      amount: 10000,
      currency: 'INR',
    });

    // Verify after transfers, everyone is at 0
    const netAfter: Record<string, number> = { Alice: 20000, Bob: -10000, Charlie: -10000 };
    for (const t of transfers) {
      netAfter[t.fromPersonId] += t.amount;
      netAfter[t.toPersonId] -= t.amount;
    }
    expect(netAfter.Alice).toBe(0);
    expect(netAfter.Bob).toBe(0);
    expect(netAfter.Charlie).toBe(0);
  });
});

describe('Financial Engine: Double-Entry Journal Lines Invariant', () => {
  const dummyAccount: Account = {
    id: 'acc_bank',
    name: 'Bank Account',
    type: 'bank',
    currency: 'INR',
    openingBalance: 10000,
    currentBalance: 10000,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dummyDestAccount: Account = {
    id: 'acc_cash',
    name: 'Cash Wallet',
    type: 'cash',
    currency: 'INR',
    openingBalance: 5000,
    currentBalance: 5000,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('guarantees salary income journal lines are balanced', () => {
    const lines = buildJournalLines(
      'je_1',
      { type: 'income', amount: 5000000, currency: 'INR', accountId: dummyAccount.id, description: 'Salary' },
      dummyAccount
    );
    expect(validateJournalBalance(lines)).toBe(true);
  });

  it('guarantees personal expense journal lines are balanced', () => {
    const lines = buildJournalLines(
      'je_2',
      { type: 'personal_expense', amount: 150000, currency: 'INR', accountId: dummyAccount.id, description: 'Dinner' },
      dummyAccount
    );
    expect(validateJournalBalance(lines)).toBe(true);
  });

  it('guarantees money lent (receivable) journal lines are balanced and not an expense', () => {
    const lines = buildJournalLines(
      'je_3',
      {
        type: 'money_lent',
        amount: 200000,
        currency: 'INR',
        accountId: dummyAccount.id,
        personId: 'friend_1',
        description: 'Lent to friend',
      },
      dummyAccount
    );
    expect(validateJournalBalance(lines)).toBe(true);
    // Ensure no line touches 'expense' category
    expect(lines.some(l => l.accountCategory === 'expense')).toBe(false);
  });

  it('guarantees money borrowed (liability) journal lines are balanced and not income', () => {
    const lines = buildJournalLines(
      'je_4',
      {
        type: 'money_borrowed',
        amount: 300000,
        currency: 'INR',
        accountId: dummyAccount.id,
        personId: 'friend_1',
        description: 'Borrowed from friend',
      },
      dummyAccount
    );
    expect(validateJournalBalance(lines)).toBe(true);
    // Ensure no line touches 'income' category
    expect(lines.some(l => l.accountCategory === 'income')).toBe(false);
  });

  it('guarantees account transfer journal lines are balanced and do not touch income or expense', () => {
    const lines = buildJournalLines(
      'je_5',
      {
        type: 'account_transfer',
        amount: 250000,
        currency: 'INR',
        accountId: dummyAccount.id,
        toAccountId: dummyDestAccount.id,
        description: 'Transfer to cash',
      },
      dummyAccount,
      dummyDestAccount
    );
    expect(validateJournalBalance(lines)).toBe(true);
    expect(lines.every(l => l.accountCategory === 'asset')).toBe(true);
  });

  it('guarantees partial loan repayment received balances and clears receivable', () => {
    const lines = buildJournalLines(
      'je_6',
      {
        type: 'loan_repayment_received',
        amount: 50000, // partial ₹500
        currency: 'INR',
        accountId: dummyAccount.id,
        personId: 'friend_1',
        description: 'Partial repayment from friend',
      },
      dummyAccount
    );
    expect(validateJournalBalance(lines)).toBe(true);
    expect(lines.some(l => l.accountCategory === 'expense' || l.accountCategory === 'income')).toBe(false);
  });

  it('guarantees partial loan repayment made balances and reduces liability', () => {
    const lines = buildJournalLines(
      'je_7',
      {
        type: 'loan_repayment_made',
        amount: 75000, // partial ₹750
        currency: 'INR',
        accountId: dummyAccount.id,
        personId: 'friend_1',
        description: 'Partial repayment to friend',
      },
      dummyAccount
    );
    expect(validateJournalBalance(lines)).toBe(true);
    expect(lines.some(l => l.accountCategory === 'expense' || l.accountCategory === 'income')).toBe(false);
  });

  it('guarantees that an edited transaction amount and description rebuilds balanced journal lines', () => {
    // When user fixes an incorrect amount from 500 to 1250
    const correctedAmount = 125000;
    const lines = buildJournalLines(
      'je_edited',
      {
        type: 'personal_expense',
        amount: correctedAmount,
        currency: 'INR',
        accountId: dummyAccount.id,
        categoryId: 'cat_groceries',
        description: 'Corrected Grocery Bill',
        date: '2026-03-20T12:00:00.000Z',
      },
      dummyAccount,
      undefined,
      'Groceries'
    );
    expect(validateJournalBalance(lines)).toBe(true);
    expect(lines.find(l => l.debit > 0)?.debit).toBe(correctedAmount);
    expect(lines.find(l => l.credit > 0)?.credit).toBe(correctedAmount);
  });
});
