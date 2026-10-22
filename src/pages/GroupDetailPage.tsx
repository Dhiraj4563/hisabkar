import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { Group, GroupExpense, GroupSettlement, Person, Account, Transaction } from '../types';
import { optimizeSettlements, MemberBalance, SuggestedTransfer } from '../lib/settlement';
import { fromMinorUnits, toMinorUnits } from '../lib/money';
import { postTransaction } from '../features/accounting/ledgerEngine';
import { db } from '../db/database';
import {
  ArrowLeft,
  Plus,
  Split,
  ArrowRight,
  CheckCircle2,
  Users,
  Download,
  Receipt,
  User,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GroupDetailPageProps {
  group: Group;
  groupExpenses: GroupExpense[];
  groupSettlements: GroupSettlement[];
  people: Person[];
  accounts: Account[];
  transactions: Transaction[];
  hideBalances: boolean;
  onBack: () => void;
  onOpenAddExpense: (groupId: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const GroupDetailPage: React.FC<GroupDetailPageProps> = ({
  group,
  groupExpenses,
  groupSettlements,
  people,
  accounts,
  transactions,
  hideBalances,
  onBack,
  onOpenAddExpense,
  onSelectTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'balances' | 'expenses' | 'settlements'>('balances');
  const [isSettling, setIsSettling] = useState(false);

  // Group-specific expenses & settlements
  const expenses = useMemo(() => {
    return groupExpenses.filter(e => e.groupId === group.id);
  }, [groupExpenses, group.id]);

  const settlements = useMemo(() => {
    return groupSettlements.filter(s => s.groupId === group.id);
  }, [groupSettlements, group.id]);

  // Compute member balances for this group
  const memberBalances: MemberBalance[] = useMemo(() => {
    const memberMap: Record<string, { paid: number; owed: number }> = {};

    for (const memId of group.memberPersonIds) {
      memberMap[memId] = { paid: 0, owed: 0 };
    }

    // Accumulate expenses
    for (const exp of expenses) {
      if (!memberMap[exp.payerPersonId]) {
        memberMap[exp.payerPersonId] = { paid: 0, owed: 0 };
      }
      memberMap[exp.payerPersonId].paid += exp.totalAmount;

      for (const sp of exp.splits) {
        if (!memberMap[sp.personId]) {
          memberMap[sp.personId] = { paid: 0, owed: 0 };
        }
        memberMap[sp.personId].owed += sp.amount;
      }
    }

    // Adjust for already recorded settlements
    for (const set of settlements) {
      if (set.status === 'settled') {
        if (memberMap[set.fromPersonId]) {
          memberMap[set.fromPersonId].paid += set.amount;
        }
        if (memberMap[set.toPersonId]) {
          memberMap[set.toPersonId].owed += set.amount;
        }
      }
    }

    return Object.entries(memberMap).map(([personId, data]) => ({
      personId,
      paidAmount: data.paid,
      owedAmount: data.owed,
      netBalance: data.paid - data.owed,
    }));
  }, [expenses, settlements, group.memberPersonIds]);

  // Optimize debt settlements
  const suggestedTransfers: SuggestedTransfer[] = useMemo(() => {
    return optimizeSettlements(memberBalances, group.currency);
  }, [memberBalances, group.currency]);

  const getMemberName = (id: string): string => {
    if (id === '__ME__') return 'You (Me)';
    const p = people.find(x => x.id === id);
    return p ? p.name : 'Unknown';
  };

  // Record a suggested settlement directly into the double-entry accounting ledger
  const handleRecordSettlement = async (transfer: SuggestedTransfer) => {
    try {
      setIsSettling(true);
      const defaultAccount = accounts[0];
      if (!defaultAccount) throw new Error('No account found for recording payment.');

      const nowStr = new Date().toISOString();
      const settlementId = crypto.randomUUID();

      // If user is either payer or receiver, post financial transaction
      let txId: string | undefined;
      if (transfer.fromPersonId === '__ME__' || transfer.toPersonId === '__ME__') {
        const isUserPayer = transfer.fromPersonId === '__ME__';
        const otherPersonId = isUserPayer ? transfer.toPersonId : transfer.fromPersonId;

        const tx = await postTransaction({
          type: isUserPayer ? 'group_settlement' : 'loan_repayment_received',
          amount: transfer.amount,
          currency: transfer.currency,
          accountId: defaultAccount.id,
          personId: otherPersonId,
          groupId: group.id,
          description: `Group Settlement: ${group.name} (${getMemberName(transfer.fromPersonId)} → ${getMemberName(transfer.toPersonId)})`,
          notes: `Settled split debt of ${fromMinorUnits(transfer.amount, 2)} ${transfer.currency}`,
        });
        txId = tx.id;
      }

      // Record in group settlements table
      await db.groupSettlements.put({
        id: settlementId,
        groupId: group.id,
        transactionId: txId,
        fromPersonId: transfer.fromPersonId,
        toPersonId: transfer.toPersonId,
        amount: transfer.amount,
        currency: transfer.currency,
        date: nowStr,
        status: 'settled',
        notes: `Recorded on ${new Date().toLocaleDateString()}`,
        createdAt: nowStr,
      });

      try {
        confetti({ particleCount: 35, spread: 70, origin: { y: 0.7 } });
      } catch {}
    } catch (err: any) {
      alert(err.message || 'Failed to record settlement');
    } finally {
      setIsSettling(false);
    }
  };

  const totalGroupSpending = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
            All Groups
          </Button>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <span>{group.name}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {group.memberPersonIds.length} members · Total Spending:{' '}
              <MoneyDisplay amount={totalGroupSpending} currency={group.currency} size="sm" colorVariant="neutral" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onOpenAddExpense(group.id)}
            icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            Add Group Expense
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'balances'
              ? 'bg-zinc-800 text-emerald-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Balances & Settlements ({suggestedTransfers.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-zinc-800 text-emerald-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Expenses History ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            activeTab === 'settlements'
              ? 'bg-zinc-800 text-emerald-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Settled Records ({settlements.length})
        </button>
      </div>

      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* Member Net Balances Table */}
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">Member Contributions & Fair Shares</h3>
            <div className="divide-y divide-zinc-800/80 text-xs">
              {memberBalances.map(mb => {
                const isPositive = mb.netBalance > 0;
                const isNegative = mb.netBalance < 0;

                return (
                  <div key={mb.personId} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-300">
                        {getMemberName(mb.personId).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-100">{getMemberName(mb.personId)}</p>
                        <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
                          <span>Paid: <MoneyDisplay amount={mb.paidAmount} currency={group.currency} hideBalances={hideBalances} size="sm" colorVariant="muted" /></span>
                          <span aria-hidden="true">·</span>
                          <span>Share: <MoneyDisplay amount={mb.owedAmount} currency={group.currency} hideBalances={hideBalances} size="sm" colorVariant="muted" /></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <MoneyDisplay
                        amount={Math.abs(mb.netBalance)}
                        currency={group.currency}
                        hideBalances={hideBalances}
                        size="base"
                        colorVariant={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
                      />
                      <span className="block text-[10px] text-zinc-400 mt-0.5">
                        {isPositive ? 'Gets back' : isNegative ? 'Owes group' : 'Settled'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Optimized Settlement Plan */}
          <Card className="space-y-4 border-indigo-500/20 bg-gradient-to-br from-zinc-900 to-zinc-950">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Split className="w-4 h-4 text-indigo-400" />
                  <span>Optimal Debt Settlement Plan</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Greedy debtor-creditor algorithm computes minimum cash transfers required to settle the group
                </p>
              </div>
            </div>

            {suggestedTransfers.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <p className="text-sm font-semibold text-zinc-300">All balances are completely settled!</p>
                <p className="text-xs text-zinc-500">No transfers needed at this time.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {suggestedTransfers.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-rose-400">{getMemberName(st.fromPersonId)}</span>
                      <span className="text-zinc-500 flex items-center gap-1">
                        pays <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-semibold text-emerald-400">{getMemberName(st.toPersonId)}</span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <MoneyDisplay
                        amount={st.amount}
                        currency={st.currency}
                        hideBalances={hideBalances}
                        size="lg"
                        colorVariant="neutral"
                      />
                      <Button
                        size="sm"
                        variant="emerald"
                        isLoading={isSettling}
                        onClick={() => handleRecordSettlement(st)}
                      >
                        Record as Paid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'expenses' && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-100">Group Expense Log</h3>
          {expenses.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No expenses added to this group yet. Click &ldquo;Add Group Expense&rdquo; above.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {expenses.map(exp => (
                <div key={exp.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-zinc-200">{exp.description}</p>
                    <div className="flex items-center gap-2 text-zinc-500 mt-0.5">
                      <span>{new Date(exp.date).toLocaleDateString()}</span>
                      <span aria-hidden="true">·</span>
                      <span>Paid by {getMemberName(exp.payerPersonId)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{exp.splitType} Split</span>
                    </div>
                  </div>
                  <MoneyDisplay amount={exp.totalAmount} currency={exp.currency} hideBalances={hideBalances} size="base" />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'settlements' && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-100">Recorded Group Settlements</h3>
          {settlements.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No settlements recorded for this group yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {settlements.map(set => (
                <div key={set.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-200">
                        {getMemberName(set.fromPersonId)} paid {getMemberName(set.toPersonId)}
                      </p>
                      <p className="text-zinc-500 text-[10px]">{new Date(set.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <MoneyDisplay amount={set.amount} currency={set.currency} hideBalances={hideBalances} size="base" colorVariant="positive" />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
