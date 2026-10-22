import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { formatMoney } from '../lib/money';
import { Loan, Person, Account, TransactionType } from '../types';
import {
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
} from 'lucide-react';

interface LendingPageProps {
  loans: Loan[];
  people: Person[];
  accounts: Account[];
  hideBalances: boolean;
  onOpenAddModal: (type?: TransactionType, personId?: string, loanId?: string) => void;
  onNavigateToPerson: (personId: string) => void;
  onEditLoan?: (loan: Loan) => void;
}

export const LendingPage: React.FC<LendingPageProps> = ({
  loans,
  people,
  accounts,
  hideBalances,
  onOpenAddModal,
  onNavigateToPerson,
  onEditLoan,
}) => {
  const [filter, setFilter] = useState<'all' | 'lent' | 'borrowed' | 'overdue' | 'settled'>('all');

  const now = new Date();

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      if (l.status === 'archived') return false;
      if (filter === 'lent' && l.type !== 'lent') return false;
      if (filter === 'borrowed' && l.type !== 'borrowed') return false;
      if (filter === 'settled' && l.status !== 'fully_repaid') return false;
      if (filter === 'overdue') {
        return l.status !== 'fully_repaid' && l.dueDate && new Date(l.dueDate) < now;
      }
      if (filter !== 'settled' && l.status === 'fully_repaid') return false;
      return true;
    });
  }, [loans, filter, now]);

  // Aggregate metrics
  const totalReceivables = useMemo(() => {
    return loans
      .filter(l => l.type === 'lent' && l.status !== 'archived')
      .reduce((sum, l) => sum + l.currentBalance, 0);
  }, [loans]);

  const totalPayables = useMemo(() => {
    return loans
      .filter(l => l.type === 'borrowed' && l.status !== 'archived')
      .reduce((sum, l) => sum + l.currentBalance, 0);
  }, [loans]);

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Lending & Borrowing</h2>
          <p className="text-xs text-zinc-400">
            Track loans, receivables, liabilities, and partial repayments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenAddModal('money_borrowed')}
            icon={<HandCoins className="w-3.5 h-3.5 text-blue-400 rotate-180" />}
          >
            Borrow Money
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onOpenAddModal('money_lent')}
            icon={<HandCoins className="w-3.5 h-3.5" />}
          >
            Lend Money
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-emerald-500/20">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium">Total Receivables (Lent to Others)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <MoneyDisplay
            amount={totalReceivables}
            hideBalances={hideBalances}
            size="2xl"
            colorVariant="positive"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Not counted as expense: this remains your asset
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-rose-500/20">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium">Total Liabilities (Borrowed from Others)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <MoneyDisplay
            amount={totalPayables}
            hideBalances={hideBalances}
            size="2xl"
            colorVariant="negative"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            Not counted as income: this is a liability to be repaid
          </p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs overflow-x-auto scrollbar-none">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All Active
        </button>
        <button
          onClick={() => setFilter('lent')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filter === 'lent'
              ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Money Lent
        </button>
        <button
          onClick={() => setFilter('borrowed')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filter === 'borrowed'
              ? 'bg-zinc-800 text-blue-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Money Borrowed
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filter === 'overdue'
              ? 'bg-zinc-800 text-amber-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Overdue
        </button>
        <button
          onClick={() => setFilter('settled')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            filter === 'settled'
              ? 'bg-zinc-800 text-zinc-200 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Fully Repaid
        </button>
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card className="py-16 text-center text-zinc-500 space-y-3">
          <HandCoins className="w-10 h-10 mx-auto text-zinc-600 stroke-1" />
          <p className="text-sm font-medium">No loans found</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Record a loan when you lend money to a contact or borrow funds.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button size="sm" variant="primary" onClick={() => onOpenAddModal('money_lent')}>
              Lend Money
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onOpenAddModal('money_borrowed')}>
              Borrow Money
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map(loan => {
            const person = people.find(p => p.id === loan.personId);
            const account = accounts.find(a => a.id === loan.accountId);
            const isLent = loan.type === 'lent';
            const isOverdue = loan.dueDate && new Date(loan.dueDate) < now && loan.currentBalance > 0;
            const repaidAmount = loan.principalAmount - loan.currentBalance;
            const percentRepaid = Math.round((repaidAmount / loan.principalAmount) * 100);

            return (
              <Card
                key={loan.id}
                className="hover:border-zinc-700 transition-colors p-4 space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      <HandCoins className={`w-4 h-4 ${!isLent ? 'rotate-180' : ''}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => person && onNavigateToPerson(person.id)}
                          className="font-bold text-zinc-100 text-sm sm:text-base hover:text-emerald-400 cursor-pointer transition-colors text-left"
                        >
                          {person?.name || 'Contact'}
                        </button>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            isLent
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                          }`}
                        >
                          {isLent ? 'Lent' : 'Borrowed'}
                        </span>
                        {loan.status === 'fully_repaid' ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Fully Repaid
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-medium">
                            {loan.status === 'partially_repaid' ? 'Partially Repaid' : 'Outstanding'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-zinc-400 text-xs mt-1">
                        {loan.description && (
                          <>
                            <span className="text-zinc-300 font-medium">{loan.description}</span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{account?.name || 'Account'}</span>
                        <span aria-hidden="true">·</span>
                        <span>Started {new Date(loan.startDate).toLocaleDateString()}</span>
                        {loan.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className={isOverdue ? 'text-amber-400 font-semibold' : ''}>
                              Due {new Date(loan.dueDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLent ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {isLent ? 'Amount Remaining (To Take)' : 'Amount Remaining (To Give)'}
                      </span>
                      <MoneyDisplay
                        amount={loan.currentBalance}
                        currency={loan.currency}
                        hideBalances={hideBalances}
                        size="xl"
                        colorVariant={isLent ? 'positive' : 'negative'}
                      />
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        Original: {formatMoney(loan.principalAmount, loan.currency, { hideBalances })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onEditLoan && loan.status !== 'archived' && (
                        <button
                          type="button"
                          title="Edit loan or debt details"
                          onClick={() => onEditLoan(loan)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {loan.currentBalance > 0 && (
                        <Button
                          size="sm"
                          variant={isLent ? 'primary' : 'secondary'}
                          onClick={() =>
                            onOpenAddModal(
                              isLent ? 'loan_repayment_received' : 'loan_repayment_made',
                              loan.personId,
                              loan.id
                            )
                          }
                        >
                          {isLent ? 'Collect' : 'Pay Back'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>
                      Repaid: <strong className="text-zinc-200">{percentRepaid}%</strong> ({formatMoney(repaidAmount, loan.currency, { hideBalances })})
                    </span>
                    <span>
                      Amount Remaining: <strong className={isLent ? 'text-emerald-400' : 'text-blue-400'}>{formatMoney(loan.currentBalance, loan.currency, { hideBalances })}</strong>
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        loan.status === 'fully_repaid'
                          ? 'bg-emerald-500'
                          : isLent
                          ? 'bg-emerald-400'
                          : 'bg-blue-400'
                      }`}
                      style={{ width: `${Math.min(100, percentRepaid)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
