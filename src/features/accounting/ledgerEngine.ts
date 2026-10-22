import { db } from '../../db/database';
import {
  Account,
  AuditEvent,
  JournalEntry,
  JournalLine,
  Loan,
  LoanRepayment,
  Transaction,
  TransactionType,
} from '../../types';

export interface PostTransactionParams {
  type: TransactionType;
  amount: number; // in minor units
  currency: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  personId?: string;
  groupId?: string;
  loanId?: string;
  description: string;
  date?: string; // ISO
  dueDate?: string;
  notes?: string;
  tags?: string[];
  receiptDataUrl?: string;
  receiptName?: string;
  exchangeRate?: number;
  // For group expenses
  userShareAmount?: number; // minor units
  memberReceivables?: { personId: string; amount: number }[];
  payerPersonId?: string; // if someone else paid
}

/**
 * Creates balanced journal lines for a transaction.
 * Guarantees sum(debits) === sum(credits).
 */
export function buildJournalLines(
  journalEntryId: string,
  tx: PostTransactionParams,
  account: Account,
  toAccount?: Account,
  categoryName: string = 'General',
  personName: string = 'Contact'
): JournalLine[] {
  const lines: JournalLine[] = [];
  const curr = tx.currency;
  const amt = tx.amount;

  switch (tx.type) {
    case 'income':
      // Debit Asset (Cash/Bank), Credit Income
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'income',
        entityId: tx.categoryId || 'cat_income_general',
        entityName: categoryName,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;

    case 'personal_expense':
      // Debit Expense, Credit Asset (or CC liability)
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'expense',
        entityId: tx.categoryId || 'cat_expense_general',
        entityName: categoryName,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: account.type === 'credit_card' ? 'liability' : 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;

    case 'money_lent':
      // Debit Receivable (Person), Credit Asset (Cash/Bank)
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: tx.personId || 'unknown_person',
        entityName: `Receivable: ${personName}`,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;

    case 'money_borrowed':
      // Debit Asset (Cash/Bank), Credit Liability (Person)
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'liability',
        entityId: tx.personId || 'unknown_person',
        entityName: `Loan Payable: ${personName}`,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;

    case 'loan_repayment_received':
      // Money lent is repaid: Debit Asset (Cash/Bank), Credit Receivable (Person)
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: tx.personId || 'unknown_person',
        entityName: `Receivable Cleared: ${personName}`,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;

    case 'loan_repayment_made':
      // Money borrowed is repaid: Debit Liability (Person), Credit Asset (Cash/Bank)
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'liability',
        entityId: tx.personId || 'unknown_person',
        entityName: `Loan Liability Cleared: ${personName}`,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;

    case 'account_transfer':
      // Debit Destination Asset, Credit Source Asset
      if (toAccount) {
        lines.push({
          id: crypto.randomUUID(),
          journalEntryId,
          accountCategory: 'asset',
          entityId: toAccount.id,
          entityName: toAccount.name,
          debit: amt,
          credit: 0,
          currency: curr,
        });
        lines.push({
          id: crypto.randomUUID(),
          journalEntryId,
          accountCategory: 'asset',
          entityId: account.id,
          entityName: account.name,
          debit: 0,
          credit: amt,
          currency: curr,
        });
      }
      break;

    case 'group_expense':
      // If user paid:
      // Debit User's share as Expense
      // Debit Receivables from each participant
      // Credit Cash/Bank for total amount
      if (!tx.payerPersonId || tx.payerPersonId === '__ME__') {
        const userShare = tx.userShareAmount ?? amt;
        if (userShare > 0) {
          lines.push({
            id: crypto.randomUUID(),
            journalEntryId,
            accountCategory: 'expense',
            entityId: tx.categoryId || 'cat_expense_shared',
            entityName: `Shared Expense: ${categoryName}`,
            debit: userShare,
            credit: 0,
            currency: curr,
          });
        }
        if (tx.memberReceivables && tx.memberReceivables.length > 0) {
          for (const rec of tx.memberReceivables) {
            lines.push({
              id: crypto.randomUUID(),
              journalEntryId,
              accountCategory: 'asset',
              entityId: rec.personId,
              entityName: `Group Receivable (${rec.personId})`,
              debit: rec.amount,
              credit: 0,
              currency: curr,
            });
          }
        }
        lines.push({
          id: crypto.randomUUID(),
          journalEntryId,
          accountCategory: account.type === 'credit_card' ? 'liability' : 'asset',
          entityId: account.id,
          entityName: account.name,
          debit: 0,
          credit: amt,
          currency: curr,
        });
      } else {
        // Someone else paid, user owes userShare
        const userShare = tx.userShareAmount ?? 0;
        lines.push({
          id: crypto.randomUUID(),
          journalEntryId,
          accountCategory: 'expense',
          entityId: tx.categoryId || 'cat_expense_shared',
          entityName: `Shared Expense: ${categoryName}`,
          debit: userShare,
          credit: 0,
          currency: curr,
        });
        lines.push({
          id: crypto.randomUUID(),
          journalEntryId,
          accountCategory: 'liability',
          entityId: tx.payerPersonId,
          entityName: `Group Payable to ${personName}`,
          debit: 0,
          credit: userShare,
          currency: curr,
        });
      }
      break;

    case 'group_settlement':
      // Group settlement payment between user and a member
      if (tx.personId) {
        // Did user pay or receive?
        // If amt went out of account, user paid member: Debit Liability / Receivable, Credit Account
        lines.push({
          id: crypto.randomUUID(),
          journalEntryId,
          accountCategory: 'liability',
          entityId: tx.personId,
          entityName: `Settlement: ${personName}`,
          debit: amt,
          credit: 0,
          currency: curr,
        });
        lines.push({
          id: crypto.randomUUID(),
          journalEntryId,
          accountCategory: 'asset',
          entityId: account.id,
          entityName: account.name,
          debit: 0,
          credit: amt,
          currency: curr,
        });
      }
      break;

    case 'refund':
      // Debit Cash/Bank asset, Credit Expense Category (reducing expense)
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'expense',
        entityId: tx.categoryId || 'cat_expense_general',
        entityName: categoryName,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;

    case 'expense_reimbursement':
      // Debit Cash/Bank asset, Credit Receivable
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: account.id,
        entityName: account.name,
        debit: amt,
        credit: 0,
        currency: curr,
      });
      lines.push({
        id: crypto.randomUUID(),
        journalEntryId,
        accountCategory: 'asset',
        entityId: tx.personId || 'reimbursement_clearing',
        entityName: `Reimbursement Cleared: ${personName}`,
        debit: 0,
        credit: amt,
        currency: curr,
      });
      break;
  }

  return lines;
}

/**
 * Validates that journal lines balance: sum(debits) === sum(credits).
 */
export function validateJournalBalance(lines: JournalLine[]): boolean {
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  return totalDebit === totalCredit;
}

/**
 * Posts a transaction into the double-entry accounting ledger atomically.
 */
export async function postTransaction(params: PostTransactionParams): Promise<Transaction> {
  if (params.amount <= 0) {
    throw new Error('Transaction amount must be strictly positive.');
  }

  return await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.people,
      db.transactions,
      db.journalEntries,
      db.journalLines,
      db.loans,
      db.loanRepayments,
      db.auditEvents,
    ],
    async () => {
      const account = await db.accounts.get(params.accountId);
      if (!account) throw new Error(`Account ${params.accountId} not found.`);

      let toAccount: Account | undefined;
      if (params.toAccountId) {
        toAccount = await db.accounts.get(params.toAccountId);
        if (!toAccount) throw new Error(`Destination account ${params.toAccountId} not found.`);
      }

      let categoryName = 'General';
      if (params.categoryId) {
        const cat = await db.categories.get(params.categoryId);
        if (cat) categoryName = cat.name;
      }

      let personName = 'Contact';
      if (params.loanId && !params.personId) {
        const targetLoan = await db.loans.get(params.loanId);
        if (targetLoan) {
          params.personId = targetLoan.personId;
        }
      }

      if (params.personId && params.personId !== '__ME__') {
        const person = await db.people.get(params.personId);
        if (person) personName = person.name;
      }

      const txId = crypto.randomUUID();
      const journalEntryId = crypto.randomUUID();
      const dateStr = params.date || new Date().toISOString();
      const nowStr = new Date().toISOString();

      // Build and validate journal lines
      const lines = buildJournalLines(
        journalEntryId,
        params,
        account,
        toAccount,
        categoryName,
        personName
      );

      const isBalanced = validateJournalBalance(lines);
      if (!isBalanced) {
        const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
        throw new Error(
          `Accounting integrity error: Journal entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
        );
      }

      // Update account balances based on transaction type
      const amt = params.amount;
      switch (params.type) {
        case 'income':
        case 'loan_repayment_received':
        case 'refund':
        case 'expense_reimbursement':
          account.currentBalance += amt;
          break;

        case 'personal_expense':
          if (account.type === 'credit_card') {
            account.currentBalance += amt; // CC liability increases
          } else {
            account.currentBalance -= amt;
          }
          break;

        case 'money_lent':
        case 'loan_repayment_made':
          account.currentBalance -= amt;
          break;

        case 'money_borrowed':
          account.currentBalance += amt;
          break;

        case 'account_transfer':
          account.currentBalance -= amt;
          if (toAccount) {
            toAccount.currentBalance += amt;
            toAccount.updatedAt = nowStr;
            await db.accounts.put(toAccount);
          }
          break;

        case 'group_expense':
          if (!params.payerPersonId || params.payerPersonId === '__ME__') {
            if (account.type === 'credit_card') {
              account.currentBalance += amt;
            } else {
              account.currentBalance -= amt;
            }
          }
          break;

        case 'group_settlement':
          // By convention, if user paid out
          account.currentBalance -= amt;
          break;
      }

      account.updatedAt = nowStr;
      await db.accounts.put(account);

      // Handle loan management if this is a loan or repayment
      if (params.type === 'money_lent' || params.type === 'money_borrowed') {
        const loan: Loan = {
          id: txId, // Loan ID matches original transaction ID
          personId: params.personId || '',
          type: params.type === 'money_lent' ? 'lent' : 'borrowed',
          principalAmount: amt,
          currentBalance: amt,
          currency: params.currency,
          accountId: params.accountId,
          startDate: dateStr,
          dueDate: params.dueDate,
          description: params.description,
          status: 'outstanding',
          notes: params.notes,
          createdAt: nowStr,
          updatedAt: nowStr,
        };
        await db.loans.put(loan);
      } else if (
        params.type === 'loan_repayment_received' ||
        params.type === 'loan_repayment_made'
      ) {
        let remainingToDeduct = amt;
        const targetType = params.type === 'loan_repayment_received' ? 'lent' : 'borrowed';

        // 1. If specific loanId is provided, deduct from that loan first
        if (params.loanId) {
          const loan = await db.loans.get(params.loanId);
          if (loan) {
            const deduct = Math.min(loan.currentBalance, remainingToDeduct);
            loan.currentBalance -= deduct;
            loan.status = loan.currentBalance === 0 ? 'fully_repaid' : 'partially_repaid';
            loan.updatedAt = nowStr;
            await db.loans.put(loan);

            const repayment: LoanRepayment = {
              id: crypto.randomUUID(),
              loanId: loan.id,
              transactionId: txId,
              amount: deduct,
              currency: params.currency,
              date: dateStr,
              accountId: params.accountId,
              notes: params.notes,
              createdAt: nowStr,
            };
            await db.loanRepayments.put(repayment);
            remainingToDeduct -= deduct;

            if (!params.personId) {
              params.personId = loan.personId;
            }
          }
        }

        // 2. If there's still remaining amount to deduct and personId exists, deduct from other active loans (FIFO)
        if (remainingToDeduct > 0 && params.personId) {
          const personLoans = await db.loans
            .where('personId')
            .equals(params.personId)
            .filter(l => l.type === targetType && l.currentBalance > 0 && l.id !== params.loanId && l.status !== 'archived')
            .sortBy('startDate');

          for (const loan of personLoans) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(loan.currentBalance, remainingToDeduct);
            loan.currentBalance -= deduct;
            loan.status = loan.currentBalance === 0 ? 'fully_repaid' : 'partially_repaid';
            loan.updatedAt = nowStr;
            await db.loans.put(loan);

            const repayment: LoanRepayment = {
              id: crypto.randomUUID(),
              loanId: loan.id,
              transactionId: txId,
              amount: deduct,
              currency: params.currency,
              date: dateStr,
              accountId: params.accountId,
              notes: params.notes,
              createdAt: nowStr,
            };
            await db.loanRepayments.put(repayment);
            remainingToDeduct -= deduct;
          }
        }
      }

      // Create transaction record
      const transaction: Transaction = {
        id: txId,
        date: dateStr,
        type: params.type,
        amount: amt,
        currency: params.currency,
        accountId: params.accountId,
        toAccountId: params.toAccountId,
        categoryId: params.categoryId,
        personId: params.personId,
        groupId: params.groupId,
        loanId: params.loanId || (params.type === 'money_lent' || params.type === 'money_borrowed' ? txId : undefined),
        description: params.description,
        notes: params.notes,
        tags: params.tags || [],
        dueDate: params.dueDate,
        status: 'posted',
        receiptDataUrl: params.receiptDataUrl,
        receiptName: params.receiptName,
        exchangeRate: params.exchangeRate || 1.0,
        reportingAmount: Math.round(amt * (params.exchangeRate || 1.0)),
        createdAt: nowStr,
        updatedAt: nowStr,
      };

      await db.transactions.put(transaction);

      // Create Journal Entry & Lines
      const journalEntry: JournalEntry = {
        id: journalEntryId,
        transactionId: txId,
        date: dateStr,
        description: params.description,
        currency: params.currency,
        isBalanced: true,
        createdAt: nowStr,
      };

      await db.journalEntries.put(journalEntry);
      for (const line of lines) {
        await db.journalLines.put(line);
      }

      // Record audit event
      const audit: AuditEvent = {
        id: crypto.randomUUID(),
        timestamp: nowStr,
        action: 'create',
        entityType: 'transaction',
        entityId: txId,
        details: `Posted ${params.type} transaction of ${amt} ${params.currency}`,
      };
      await db.auditEvents.put(audit);

      return transaction;
    }
  );
}

/**
 * Voids/Reverses a transaction safely with double-entry integrity.
 */
export async function voidTransaction(transactionId: string, reason: string = 'User voided'): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.accounts,
      db.transactions,
      db.journalEntries,
      db.journalLines,
      db.loans,
      db.loanRepayments,
      db.auditEvents,
    ],
    async () => {
      const tx = await db.transactions.get(transactionId);
      if (!tx) throw new Error('Transaction not found');
      if (tx.status === 'voided') throw new Error('Transaction is already voided');

      const account = await db.accounts.get(tx.accountId);
      if (!account) throw new Error('Associated account not found');

      const nowStr = new Date().toISOString();
      const amt = tx.amount;

      // Reverse account balance impacts
      switch (tx.type) {
        case 'income':
        case 'loan_repayment_received':
        case 'refund':
        case 'expense_reimbursement':
          account.currentBalance -= amt;
          break;

        case 'personal_expense':
          if (account.type === 'credit_card') {
            account.currentBalance -= amt;
          } else {
            account.currentBalance += amt;
          }
          break;

        case 'money_lent':
        case 'loan_repayment_made':
          account.currentBalance += amt;
          break;

        case 'money_borrowed':
          account.currentBalance -= amt;
          break;

        case 'account_transfer':
          account.currentBalance += amt;
          if (tx.toAccountId) {
            const toAccount = await db.accounts.get(tx.toAccountId);
            if (toAccount) {
              toAccount.currentBalance -= amt;
              toAccount.updatedAt = nowStr;
              await db.accounts.put(toAccount);
            }
          }
          break;

        case 'group_expense':
        case 'group_settlement':
          account.currentBalance += amt;
          break;
      }

      account.updatedAt = nowStr;
      await db.accounts.put(account);

      // Revert loan changes if any
      if (tx.loanId) {
        const loan = await db.loans.get(tx.loanId);
        if (loan) {
          if (tx.type === 'money_lent' || tx.type === 'money_borrowed') {
            loan.status = 'archived';
          } else if (tx.type === 'loan_repayment_received' || tx.type === 'loan_repayment_made') {
            loan.currentBalance += amt;
            loan.status = 'outstanding';
          }
          loan.updatedAt = nowStr;
          await db.loans.put(loan);
        }
      }

      // Mark transaction as voided
      tx.status = 'voided';
      tx.updatedAt = nowStr;
      tx.notes = (tx.notes ? tx.notes + ' | ' : '') + `VOIDED: ${reason}`;
      await db.transactions.put(tx);

      // Create reversing journal entry
      const originalEntry = await db.journalEntries.where('transactionId').equals(tx.id).first();
      if (originalEntry) {
        const origLines = await db.journalLines.where('journalEntryId').equals(originalEntry.id).toArray();
        const reversalEntryId = crypto.randomUUID();

        const revEntry: JournalEntry = {
          id: reversalEntryId,
          transactionId: tx.id,
          date: nowStr,
          description: `REVERSAL: ${originalEntry.description} (${reason})`,
          currency: originalEntry.currency,
          isBalanced: true,
          createdAt: nowStr,
        };
        await db.journalEntries.put(revEntry);

        for (const line of origLines) {
          // Swap debit and credit to balance out
          const revLine: JournalLine = {
            id: crypto.randomUUID(),
            journalEntryId: reversalEntryId,
            accountCategory: line.accountCategory,
            entityId: line.entityId,
            entityName: `REVERSAL: ${line.entityName}`,
            debit: line.credit,
            credit: line.debit,
            currency: line.currency,
          };
          await db.journalLines.put(revLine);
        }
      }

      await db.auditEvents.put({
        id: crypto.randomUUID(),
        timestamp: nowStr,
        action: 'void',
        entityType: 'transaction',
        entityId: tx.id,
        details: `Voided transaction ${tx.id}. Reason: ${reason}`,
      });
    }
  );
}

export interface UpdateTransactionParams {
  amount?: number; // minor units
  description?: string;
  date?: string; // ISO string
  dueDate?: string;
  categoryId?: string;
  accountId?: string;
  toAccountId?: string;
  personId?: string;
  notes?: string;
}

/**
 * Updates an existing transaction, adjusting account balances, linked loans,
 * and rebuilding balanced journal lines cleanly.
 */
export async function updateTransaction(
  transactionId: string,
  params: UpdateTransactionParams
): Promise<Transaction> {
  return await db.transaction(
    'rw',
    [
      db.accounts,
      db.categories,
      db.people,
      db.transactions,
      db.journalEntries,
      db.journalLines,
      db.loans,
      db.loanRepayments,
      db.auditEvents,
    ],
    async () => {
      const tx = await db.transactions.get(transactionId);
      if (!tx) throw new Error('Transaction not found');
      if (tx.status === 'voided') throw new Error('Cannot edit a voided transaction');

      const oldAmt = tx.amount;
      const newAmt = params.amount !== undefined ? params.amount : oldAmt;
      if (newAmt <= 0) {
        throw new Error('Transaction amount must be strictly positive.');
      }

      const nowStr = new Date().toISOString();
      const oldAccount = await db.accounts.get(tx.accountId);
      if (!oldAccount) throw new Error('Original account not found');

      // 1. Revert financial impact of the old transaction on old account
      switch (tx.type) {
        case 'income':
        case 'loan_repayment_received':
        case 'refund':
        case 'expense_reimbursement':
          oldAccount.currentBalance -= oldAmt;
          break;

        case 'personal_expense':
          if (oldAccount.type === 'credit_card') {
            oldAccount.currentBalance -= oldAmt;
          } else {
            oldAccount.currentBalance += oldAmt;
          }
          break;

        case 'money_lent':
        case 'loan_repayment_made':
        case 'group_expense':
        case 'group_settlement':
          oldAccount.currentBalance += oldAmt;
          break;

        case 'money_borrowed':
          oldAccount.currentBalance -= oldAmt;
          break;

        case 'account_transfer':
          oldAccount.currentBalance += oldAmt;
          if (tx.toAccountId) {
            const oldTo = await db.accounts.get(tx.toAccountId);
            if (oldTo) {
              oldTo.currentBalance -= oldAmt;
              oldTo.updatedAt = nowStr;
              await db.accounts.put(oldTo);
            }
          }
          break;
      }

      // Determine target account
      const effectiveAccountId = params.accountId || tx.accountId;
      let targetAccount = oldAccount;

      if (effectiveAccountId !== oldAccount.id) {
        oldAccount.updatedAt = nowStr;
        await db.accounts.put(oldAccount);

        const fetchedTarget = await db.accounts.get(effectiveAccountId);
        if (!fetchedTarget) throw new Error('Selected target account not found');
        targetAccount = fetchedTarget;
      }

      // 2. Apply new transaction impact on target account
      switch (tx.type) {
        case 'income':
        case 'loan_repayment_received':
        case 'refund':
        case 'expense_reimbursement':
          targetAccount.currentBalance += newAmt;
          break;

        case 'personal_expense':
          if (targetAccount.type === 'credit_card') {
            targetAccount.currentBalance += newAmt;
          } else {
            targetAccount.currentBalance -= newAmt;
          }
          break;

        case 'money_lent':
        case 'loan_repayment_made':
        case 'group_expense':
        case 'group_settlement':
          targetAccount.currentBalance -= newAmt;
          break;

        case 'money_borrowed':
          targetAccount.currentBalance += newAmt;
          break;

        case 'account_transfer': {
          targetAccount.currentBalance -= newAmt;
          const targetToId = params.toAccountId !== undefined ? params.toAccountId : tx.toAccountId;
          if (targetToId) {
            const newTo = await db.accounts.get(targetToId);
            if (newTo) {
              newTo.currentBalance += newAmt;
              newTo.updatedAt = nowStr;
              await db.accounts.put(newTo);
            }
          }
          break;
        }
      }

      targetAccount.updatedAt = nowStr;
      await db.accounts.put(targetAccount);

      // 3. Update associated loan if applicable
      const effectivePersonId = params.personId !== undefined ? params.personId : tx.personId;

      if (tx.loanId) {
        const loan = await db.loans.get(tx.loanId);
        if (loan) {
          if (tx.type === 'money_lent' || tx.type === 'money_borrowed') {
            const delta = newAmt - oldAmt;
            loan.principalAmount = Math.max(0, loan.principalAmount + delta);
            loan.currentBalance = Math.max(0, loan.currentBalance + delta);
            if (effectivePersonId) loan.personId = effectivePersonId;
            if (params.dueDate !== undefined) loan.dueDate = params.dueDate;
            if (params.description) loan.description = params.description;
            loan.status =
              loan.currentBalance === 0
                ? 'fully_repaid'
                : loan.currentBalance < loan.principalAmount
                ? 'partially_repaid'
                : 'outstanding';
            loan.updatedAt = nowStr;
            await db.loans.put(loan);
          } else if (tx.type === 'loan_repayment_received' || tx.type === 'loan_repayment_made') {
            // Revert old repayment, apply new repayment
            loan.currentBalance = Math.max(0, loan.currentBalance + oldAmt - newAmt);
            loan.status =
              loan.currentBalance === 0
                ? 'fully_repaid'
                : loan.currentBalance < loan.principalAmount
                ? 'partially_repaid'
                : 'outstanding';
            loan.updatedAt = nowStr;
            await db.loans.put(loan);

            const repayment = await db.loanRepayments.where('transactionId').equals(tx.id).first();
            if (repayment) {
              repayment.amount = newAmt;
              if (params.date) repayment.date = params.date;
              repayment.accountId = targetAccount.id;
              await db.loanRepayments.put(repayment);
            }
          }
        }
      }

      // 4. Update the transaction record
      tx.amount = newAmt;
      if (params.description !== undefined) tx.description = params.description;
      if (params.date !== undefined) tx.date = params.date;
      if (params.dueDate !== undefined) tx.dueDate = params.dueDate;
      if (params.categoryId !== undefined) tx.categoryId = params.categoryId;
      if (params.personId !== undefined) tx.personId = params.personId;
      if (params.notes !== undefined) tx.notes = params.notes;
      tx.accountId = targetAccount.id;
      if (params.toAccountId !== undefined) tx.toAccountId = params.toAccountId;
      tx.reportingAmount = Math.round(newAmt * (tx.exchangeRate || 1.0));
      tx.updatedAt = nowStr;
      await db.transactions.put(tx);

      // 5. Rebuild balanced journal entry and journal lines
      let catName = 'General';
      if (tx.categoryId) {
        const c = await db.categories.get(tx.categoryId);
        if (c) catName = c.name;
      }
      let personName = 'Contact';
      if (tx.personId && tx.personId !== '__ME__') {
        const p = await db.people.get(tx.personId);
        if (p) personName = p.name;
      }

      const origEntry = await db.journalEntries.where('transactionId').equals(tx.id).first();
      if (origEntry) {
        await db.journalLines.where('journalEntryId').equals(origEntry.id).delete();
        origEntry.date = tx.date;
        origEntry.description = tx.description;
        origEntry.currency = tx.currency;
        await db.journalEntries.put(origEntry);

        const toAccount = tx.toAccountId ? await db.accounts.get(tx.toAccountId) : undefined;
        const newLines = buildJournalLines(
          origEntry.id,
          {
            type: tx.type,
            amount: newAmt,
            currency: tx.currency,
            accountId: tx.accountId,
            toAccountId: tx.toAccountId,
            categoryId: tx.categoryId,
            personId: tx.personId,
            groupId: tx.groupId,
            loanId: tx.loanId,
            description: tx.description,
            date: tx.date,
            dueDate: tx.dueDate,
            notes: tx.notes,
          },
          targetAccount,
          toAccount,
          catName,
          personName
        );

        for (const l of newLines) {
          await db.journalLines.put(l);
        }
      }

      // 6. Record audit event
      await db.auditEvents.put({
        id: crypto.randomUUID(),
        timestamp: nowStr,
        action: 'update',
        entityType: 'transaction',
        entityId: tx.id,
        details: `Updated ${tx.type} transaction: amount=${newAmt}, date=${tx.date}, desc=${tx.description}`,
      });

      return tx;
    }
  );
}

export interface UpdateLoanParams {
  personId?: string;
  principalAmount?: number; // minor units
  dueDate?: string;
  description?: string;
}

/**
 * Updates a loan contract, adjusting principal balance and synchronizing
 * the originating lent/borrowed transaction.
 */
export async function updateLoan(loanId: string, params: UpdateLoanParams): Promise<Loan> {
  return await db.transaction(
    'rw',
    [
      db.loans,
      db.transactions,
      db.accounts,
      db.categories,
      db.people,
      db.journalEntries,
      db.journalLines,
      db.loanRepayments,
      db.auditEvents,
    ],
    async () => {
      const loan = await db.loans.get(loanId);
      if (!loan) throw new Error('Loan not found');

      const nowStr = new Date().toISOString();
      const oldPrincipal = loan.principalAmount;
      const newPrincipal = params.principalAmount !== undefined ? params.principalAmount : oldPrincipal;
      const diff = newPrincipal - oldPrincipal;

      loan.principalAmount = newPrincipal;
      loan.currentBalance = Math.max(0, loan.currentBalance + diff);
      if (params.personId) loan.personId = params.personId;
      if (params.dueDate !== undefined) loan.dueDate = params.dueDate;
      if (params.description !== undefined) loan.description = params.description;
      loan.status =
        loan.currentBalance === 0
          ? 'fully_repaid'
          : loan.currentBalance < loan.principalAmount
          ? 'partially_repaid'
          : 'outstanding';
      loan.updatedAt = nowStr;
      await db.loans.put(loan);

      // Find the originating transaction if any and sync it
      const originTx = await db.transactions
        .where('loanId')
        .equals(loan.id)
        .filter(t => t.type === 'money_lent' || t.type === 'money_borrowed')
        .first();

      if (originTx) {
        await updateTransaction(originTx.id, {
          amount: newPrincipal,
          personId: params.personId || loan.personId,
          dueDate: params.dueDate !== undefined ? params.dueDate : loan.dueDate,
          description: params.description !== undefined ? params.description : originTx.description,
        });
      }

      return loan;
    }
  );
}
