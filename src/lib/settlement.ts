import { CurrencyCode } from '../types';

export interface MemberBalance {
  personId: string;
  paidAmount: number; // in minor units
  owedAmount: number; // assigned share of expenses in minor units
  netBalance: number; // paidAmount - owedAmount (+ to receive, - to pay)
}

export interface SuggestedTransfer {
  fromPersonId: string; // Debtor (pays)
  toPersonId: string; // Creditor (receives)
  amount: number; // minor units
  currency: CurrencyCode;
}

/**
 * Optimizes debt settlement using a deterministic greedy algorithm.
 * 1. Matches the biggest debtor with the biggest creditor.
 * 2. Transits the minimum of (debt, credit) between them.
 * 3. Continues until all non-zero balances are settled.
 *
 * Guaranteed properties:
 * - Deterministic: same inputs produce identical transfer schedules.
 * - Converges in at most N - 1 transfers (where N is number of unbalanced participants).
 * - Leaves all participants with exactly 0 net balance.
 */
export function optimizeSettlements(
  balances: MemberBalance[],
  currency: CurrencyCode = 'INR'
): SuggestedTransfer[] {
  // Filter members with non-zero balances
  // Create mutable working copies
  const debtors: { personId: string; amount: number }[] = [];
  const creditors: { personId: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.netBalance < -0) {
      debtors.push({ personId: b.personId, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0) {
      creditors.push({ personId: b.personId, amount: b.netBalance });
    }
  }

  // Sort descending by amount for greedy matching, with personId tie-breaker for determinism
  debtors.sort((a, b) => b.amount - a.amount || a.personId.localeCompare(b.personId));
  creditors.sort((a, b) => b.amount - a.amount || a.personId.localeCompare(b.personId));

  const transfers: SuggestedTransfer[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    if (debtor.amount === 0) {
      dIdx++;
      continue;
    }
    if (creditor.amount === 0) {
      cIdx++;
      continue;
    }

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      transfers.push({
        fromPersonId: debtor.personId,
        toPersonId: creditor.personId,
        amount: transferAmount,
        currency,
      });

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return transfers;
}
