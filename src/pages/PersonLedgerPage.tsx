import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import {
  Person,
  Transaction,
  Loan,
  Account,
  TransactionType,
} from '../types';
import {
  ArrowLeft,
  HandCoins,
  Phone,
  Mail,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Scale,
  Calendar,
  Pencil,
} from 'lucide-react';
import { postTransaction } from '../features/accounting/ledgerEngine';

interface PersonLedgerPageProps {
  person: Person;
  transactions: Transaction[];
  loans: Loan[];
  accounts: Account[];
  hideBalances: boolean;
  onBack: () => void;
  onOpenAddModal: (type?: TransactionType, personId?: string, loanId?: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onEditLoan?: (loan: Loan) => void;
  onEditPerson?: (person: Person) => void;
}

export const PersonLedgerPage: React.FC<PersonLedgerPageProps> = ({
  person,
  transactions,
  loans,
  accounts,
  hideBalances,
  onBack,
  onOpenAddModal,
  onSelectTransaction,
  onEditTransaction,
  onEditLoan,
  onEditPerson,
}) => {
  const [isOffsetting, setIsOffsetting] = useState(false);
  const [showOffsetConfirm, setShowOffsetConfirm] = useState(false);

  // Filter transactions for this person
  const personTransactions = useMemo(() => {
    return transactions.filter(t => t.personId === person.id && t.status !== 'voided');
  }, [transactions, person.id]);

  // Filter loans for this person
  const personLoans = useMemo(() => {
    return loans.filter(l => l.personId === person.id && l.status !== 'archived');
  }, [loans, person.id]);

  // Calculate detailed financial aggregates for this person
  const summary = useMemo(() => {
    let totalLent = 0;
    let totalBorrowed = 0;
    let repaymentsReceived = 0;
    let repaymentsMade = 0;
    let outstandingTheyOweMe = 0;
    let outstandingIOweThem = 0;

    for (const l of personLoans) {
      if (l.type === 'lent') {
        totalLent += l.principalAmount;
        outstandingTheyOweMe += l.currentBalance;
        repaymentsReceived += (l.principalAmount - l.currentBalance);
      } else if (l.type === 'borrowed') {
        totalBorrowed += l.principalAmount;
        outstandingIOweThem += l.currentBalance;
        repaymentsMade += (l.principalAmount - l.currentBalance);
      }
    }

    const netBalance = outstandingTheyOweMe - outstandingIOweThem; // positive = they owe me, negative = I owe them

    return {
      totalLent,
      totalBorrowed,
      repaymentsReceived,
      repaymentsMade,
      outstandingTheyOweMe,
      outstandingIOweThem,
      netBalance,
    };
  }, [personLoans]);

  // Handle explicit debt-offset action (Section 8: "Provide an explicit, auditable debt-offset action")
  const handleOffsetDebts = async () => {
    if (summary.outstandingTheyOweMe <= 0 || summary.outstandingIOweThem <= 0) return;
    const offsetAmount = Math.min(summary.outstandingTheyOweMe, summary.outstandingIOweThem);
    if (offsetAmount <= 0) return;

    try {
      setIsOffsetting(true);
      const defaultAccount = accounts[0];
      if (!defaultAccount) throw new Error('No account available for offset.');

      // Record offset transaction that clears receivable and liability
      await postTransaction({
        type: 'loan_repayment_received',
        amount: offsetAmount,
        currency: defaultAccount.currency,
        accountId: defaultAccount.id,
        personId: person.id,
        description: `Debt Offset Reconciliation with ${person.name}`,
        notes: `Mutual debt offset between lent amount and borrowed balance. Amount: ${offsetAmount}`,
      });

      setShowOffsetConfirm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to offset balances.');
    } finally {
      setIsOffsetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Back button & Person Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
            All People
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <span>{person.name}</span>
                {person.nickname && (
                  <span className="text-sm font-normal text-zinc-400">({person.nickname})</span>
                )}
              </h2>
              {onEditPerson && (
                <button
                  type="button"
                  title="Edit contact name or info"
                  onClick={() => onEditPerson(person)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
              {person.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {person.phone}
                </span>
              )}
              {person.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {person.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenAddModal('money_lent', person.id)}
            icon={<HandCoins className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Lend
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenAddModal('money_borrowed', person.id)}
            icon={<HandCoins className="w-3.5 h-3.5 text-blue-400 rotate-180" />}
          >
            Borrow
          </Button>
          {summary.outstandingTheyOweMe > 0 && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onOpenAddModal('loan_repayment_received', person.id)}
              icon={<ArrowDownLeft className="w-3.5 h-3.5 text-teal-400" />}
            >
              Collect Money
            </Button>
          )}
          {summary.outstandingIOweThem > 0 && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onOpenAddModal('loan_repayment_made', person.id)}
              icon={<ArrowUpRight className="w-3.5 h-3.5 text-violet-400" />}
            >
              Pay Debt
            </Button>
          )}
        </div>
      </div>

      {/* Net Position with this Person */}
      <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
              Net Financial Position with {person.name}
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <MoneyDisplay
                amount={Math.abs(summary.netBalance)}
                currency={accounts[0]?.currency || 'INR'}
                hideBalances={hideBalances}
                size="3xl"
                colorVariant={summary.netBalance > 0 ? 'positive' : summary.netBalance < 0 ? 'negative' : 'neutral'}
              />
              <span className="text-xs font-medium text-zinc-400">
                {summary.netBalance > 0
                  ? `${person.name} owes you`
                  : summary.netBalance < 0
                  ? `You owe ${person.name}`
                  : 'All settled up'}
              </span>
            </div>
          </div>

          {/* Explicit Debt Offset Action */}
          {summary.outstandingTheyOweMe > 0 && summary.outstandingIOweThem > 0 && (
            <div>
              {showOffsetConfirm ? (
                <div className="p-3 bg-zinc-950 border border-zinc-700 rounded-xl space-y-2">
                  <p className="text-xs text-zinc-300">
                    Offset matching debts of{' '}
                    <MoneyDisplay
                      amount={Math.min(summary.outstandingTheyOweMe, summary.outstandingIOweThem)}
                      size="sm"
                    />
                    ?
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowOffsetConfirm(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={isOffsetting}
                      onClick={handleOffsetDebts}
                    >
                      Confirm Offset
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOffsetConfirm(true)}
                  icon={<Scale className="w-3.5 h-3.5 text-amber-400" />}
                >
                  Offset Mutual Debts
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* 4 Ledger Columns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1">
          <span className="text-zinc-500">Total Lent to Them</span>
          <MoneyDisplay amount={summary.totalLent} hideBalances={hideBalances} size="lg" colorVariant="positive" />
        </div>
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1">
          <span className="text-zinc-500">Repayments Received</span>
          <MoneyDisplay amount={summary.repaymentsReceived} hideBalances={hideBalances} size="lg" colorVariant="positive" />
        </div>
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1">
          <span className="text-zinc-500">Total Borrowed</span>
          <MoneyDisplay amount={summary.totalBorrowed} hideBalances={hideBalances} size="lg" colorVariant="negative" />
        </div>
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1">
          <span className="text-zinc-500">Repayments Made</span>
          <MoneyDisplay amount={summary.repaymentsMade} hideBalances={hideBalances} size="lg" colorVariant="negative" />
        </div>
      </div>

      {/* Active Loans & Outstanding Balances */}
      {personLoans.filter(l => l.currentBalance > 0).length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-100">Outstanding Loan Contracts</h3>
          <div className="space-y-2">
            {personLoans
              .filter(l => l.currentBalance > 0)
              .map(loan => {
                const percentRepaid = Math.round(
                  ((loan.principalAmount - loan.currentBalance) / loan.principalAmount) * 100
                );
                const isOverdue = loan.dueDate && new Date(loan.dueDate) < new Date();

                return (
                  <div
                    key={loan.id}
                    className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100 text-sm">
                          {loan.description || (loan.type === 'lent' ? 'Loan Lent' : 'Loan Borrowed')}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500">
                        <span>Started {new Date(loan.startDate).toLocaleDateString()}</span>
                        {loan.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Due {new Date(loan.dueDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-zinc-400 text-[10px] font-semibold uppercase tracking-wider block">Amount Remaining</span>
                        <MoneyDisplay
                          amount={loan.currentBalance}
                          currency={loan.currency}
                          hideBalances={hideBalances}
                          size="base"
                          colorVariant={loan.type === 'lent' ? 'positive' : 'negative'}
                        />
                        <span className="text-[10px] text-zinc-500 block">{percentRepaid}% repaid</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {onEditLoan && (
                          <button
                            type="button"
                            title="Edit loan or debt details"
                            onClick={() => onEditLoan(loan)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Button
                          size="sm"
                          variant={loan.type === 'lent' ? 'primary' : 'secondary'}
                          onClick={() =>
                            onOpenAddModal(
                              loan.type === 'lent' ? 'loan_repayment_received' : 'loan_repayment_made',
                              person.id,
                              loan.id
                            )
                          }
                        >
                          {loan.type === 'lent' ? 'Collect' : 'Pay Back'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Transaction History for this person */}
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100">Chronological Ledger History</h3>
        {personTransactions.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No transactions found with {person.name}.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {personTransactions.map(tx => (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className="flex items-center justify-between py-3 hover:bg-zinc-800/40 px-2 rounded-lg cursor-pointer transition-colors text-xs"
              >
                <div>
                  <p className="font-semibold text-zinc-200">{tx.description}</p>
                  <div className="flex items-center gap-2 text-zinc-500 mt-0.5">
                    <span>{new Date(tx.date).toLocaleDateString()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{tx.type.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MoneyDisplay
                    amount={tx.amount}
                    currency={tx.currency}
                    hideBalances={hideBalances}
                    colorVariant={
                      tx.type === 'income' || tx.type === 'loan_repayment_received'
                        ? 'positive'
                        : 'negative'
                    }
                    size="base"
                  />
                  {onEditTransaction && (
                    <button
                      type="button"
                      title="Edit transaction"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTransaction(tx);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
