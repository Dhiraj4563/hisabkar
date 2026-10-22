import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Account, Category, Group, Loan, Person, TransactionType } from '../../types';
import { postTransaction } from '../../features/accounting/ledgerEngine';
import { toMinorUnits, fromMinorUnits, distributeEqualSplit } from '../../lib/money';
import { db } from '../../db/database';
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  ArrowRightLeft,
  Users,
  CheckCircle2,
  Percent,
  Plus,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  people: Person[];
  groups: Group[];
  loans: Loan[];
  initialType?: TransactionType;
  defaultPersonId?: string;
  defaultGroupId?: string;
  defaultLoanId?: string;
  onSuccess?: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  people,
  groups,
  loans,
  initialType = 'personal_expense',
  defaultPersonId,
  defaultGroupId,
  defaultLoanId,
  onSuccess,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toISOString().substring(0, 10));
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // Person handling (select or type name)
  const [personId, setPersonId] = useState('');
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [customPersonName, setCustomPersonName] = useState('');

  // Group handling (select or type group name)
  const [groupId, setGroupId] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [customGroupName, setCustomGroupName] = useState('');

  const [loanId, setLoanId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset & synchronize defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setAmountStr('');
      setDescription('');
      setErrorMessage('');
      setDateStr(new Date().toISOString().substring(0, 10));
      setIsNewPerson(false);
      setCustomPersonName('');
      setIsNewGroup(false);
      setCustomGroupName('');

      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
        if (accounts.length > 1) {
          setToAccountId(accounts[1].id);
        }
      }

      if (categories.length > 0) {
        const defaultCat = categories.find(c =>
          initialType === 'income' ? c.type === 'income' : c.type === 'expense'
        );
        if (defaultCat) setCategoryId(defaultCat.id);
      }

      const pId = defaultPersonId || (people.length > 0 ? people[0].id : '');
      setPersonId(pId);

      if (defaultGroupId) setGroupId(defaultGroupId);
      else if (groups.length > 0) setGroupId(groups[0].id);

      if (defaultLoanId) {
        setLoanId(defaultLoanId);
        const l = loans.find(x => x.id === defaultLoanId);
        if (l) {
          setPersonId(l.personId);
          setAmountStr(fromMinorUnits(l.currentBalance, 2).toString());
        }
      } else {
        setLoanId('');
      }
    }
  }, [isOpen, initialType, accounts, categories, people, groups, defaultPersonId, defaultGroupId, defaultLoanId, loans]);

  // Adjust categories or matching loans when type changes
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setErrorMessage('');
    setIsNewPerson(false);
    setIsNewGroup(false);

    if (newType === 'income') {
      const incCat = categories.find(c => c.type === 'income');
      if (incCat) setCategoryId(incCat.id);
    } else if (newType === 'personal_expense') {
      const expCat = categories.find(c => c.type === 'expense');
      if (expCat) setCategoryId(expCat.id);
    }

    if (newType === 'loan_repayment_received' || newType === 'loan_repayment_made') {
      const targetType = newType === 'loan_repayment_received' ? 'lent' : 'borrowed';
      const matchingLoan = loans.find(
        l => l.type === targetType && l.currentBalance > 0 && (!personId || l.personId === personId)
      );
      if (matchingLoan) {
        setLoanId(matchingLoan.id);
        setPersonId(matchingLoan.personId);
        if (!amountStr) {
          setAmountStr(fromMinorUnits(matchingLoan.currentBalance, 2).toString());
        }
      }
    }
  };

  // Live repayment context for Collect Money / Pay Loan
  const repaymentContext = useMemo(() => {
    if (type !== 'loan_repayment_received' && type !== 'loan_repayment_made') {
      return null;
    }

    const targetType = type === 'loan_repayment_received' ? 'lent' : 'borrowed';
    const activePersonLoans = loans.filter(
      l => l.type === targetType && l.currentBalance > 0 && l.status !== 'archived' && (personId ? l.personId === personId : true)
    );

    let effectiveLoan = loanId ? loans.find(l => l.id === loanId) : undefined;
    if (!effectiveLoan && activePersonLoans.length > 0) {
      effectiveLoan = activePersonLoans[0];
    }

    const totalOutstanding = effectiveLoan
      ? effectiveLoan.currentBalance
      : activePersonLoans.reduce((sum, l) => sum + l.currentBalance, 0);

    const parsed = parseFloat(amountStr) || 0;
    const minorEntered = toMinorUnits(parsed, 2);
    const newRemaining = Math.max(0, totalOutstanding - minorEntered);
    const isFull = minorEntered >= totalOutstanding && totalOutstanding > 0;
    const isPartial = minorEntered > 0 && minorEntered < totalOutstanding;
    const isOverpay = minorEntered > totalOutstanding && totalOutstanding > 0;

    return {
      activePersonLoans,
      effectiveLoan,
      totalOutstanding,
      minorEntered,
      newRemaining,
      isFull,
      isPartial,
      isOverpay,
      targetType,
    };
  }, [type, loans, personId, loanId, amountStr]);

  const setPartialPercentage = (fraction: number) => {
    if (!repaymentContext || repaymentContext.totalOutstanding <= 0) return;
    const targetMinor = Math.round(repaymentContext.totalOutstanding * fraction);
    setAmountStr(fromMinorUnits(targetMinor, 2).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = parseFloat(amountStr);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount.');
      return;
    }

    const effectiveAccountId = accountId || (accounts.length > 0 ? accounts[0].id : 'acc_cash');

    if (type === 'account_transfer' && effectiveAccountId === toAccountId) {
      setErrorMessage('Source and destination accounts must be different.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Resolve person ID (create new person record if typed)
      let resolvedPersonId = personId;
      let personDisplayName = '';

      const isPersonRequired =
        type === 'money_lent' ||
        type === 'money_borrowed' ||
        type === 'loan_repayment_received' ||
        type === 'loan_repayment_made';

      if (isPersonRequired) {
        if (isNewPerson) {
          const trimmed = customPersonName.trim();
          if (!trimmed) {
            setErrorMessage('Please enter the name of the person.');
            setIsSubmitting(false);
            return;
          }
          const newId = 'person_' + Date.now();
          const nowStr = new Date().toISOString();
          await db.people.put({
            id: newId,
            name: trimmed,
            tags: [],
            isArchived: false,
            createdAt: nowStr,
            updatedAt: nowStr,
          });
          resolvedPersonId = newId;
          personDisplayName = trimmed;
        } else {
          if (!personId && people.length > 0) {
            resolvedPersonId = people[0].id;
          }
          if (!resolvedPersonId) {
            setErrorMessage('Please specify or select a person.');
            setIsSubmitting(false);
            return;
          }
          const pObj = people.find(p => p.id === resolvedPersonId);
          personDisplayName = pObj?.name || 'Contact';
        }
      }

      // Resolve group ID (create new group record if typed)
      let resolvedGroupId = groupId;
      let groupDisplayName = '';

      if (type === 'group_expense') {
        if (isNewGroup || groups.length === 0) {
          const trimmedGroup = customGroupName.trim();
          if (!trimmedGroup) {
            setErrorMessage('Please enter a group name.');
            setIsSubmitting(false);
            return;
          }
          const newGId = 'grp_' + Date.now();
          await db.groups.put({
            id: newGId,
            name: trimmedGroup,
            currency: 'INR',
            memberPersonIds: ['__ME__'],
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          resolvedGroupId = newGId;
          groupDisplayName = trimmedGroup;
        } else {
          if (!resolvedGroupId && groups.length > 0) {
            resolvedGroupId = groups[0].id;
          }
          const gObj = groups.find(g => g.id === resolvedGroupId);
          groupDisplayName = gObj?.name || 'Group';
        }
      }

      // Default description if omitted
      let finalDescription = description.trim();
      if (!finalDescription) {
        if (type === 'income') finalDescription = 'Income received';
        else if (type === 'personal_expense') finalDescription = 'Expense';
        else if (type === 'money_lent') finalDescription = `Lent to ${personDisplayName}`;
        else if (type === 'money_borrowed') finalDescription = `Borrowed from ${personDisplayName}`;
        else if (type === 'loan_repayment_received') finalDescription = `Repayment received from ${personDisplayName}`;
        else if (type === 'loan_repayment_made') finalDescription = `Repayment paid to ${personDisplayName}`;
        else if (type === 'account_transfer') finalDescription = 'Account transfer';
        else if (type === 'group_expense') finalDescription = `Group Split - ${groupDisplayName}`;
      }

      const selectedAccount = accounts.find(a => a.id === effectiveAccountId);
      const currency = selectedAccount?.currency || 'INR';
      const minorUnits = toMinorUnits(parsedAmount, 2);

      // Handle Group Expense splits if applicable
      let userShare = minorUnits;
      let receivables: { personId: string; amount: number }[] = [];

      if (type === 'group_expense' && resolvedGroupId) {
        const group = groups.find(g => g.id === resolvedGroupId);
        if (group && group.memberPersonIds.length > 0) {
          const splits = distributeEqualSplit(minorUnits, group.memberPersonIds);
          const mySplit = splits.find(s => s.personId === '__ME__');
          userShare = mySplit ? mySplit.amount : 0;
          receivables = splits.filter(s => s.personId !== '__ME__').map(s => ({
            personId: s.personId,
            amount: s.amount,
          }));
        }
      }

      await postTransaction({
        type,
        amount: minorUnits,
        currency,
        accountId: effectiveAccountId,
        toAccountId: type === 'account_transfer' ? toAccountId : undefined,
        categoryId: type === 'income' || type === 'personal_expense' || type === 'group_expense' ? categoryId : undefined,
        personId: isPersonRequired ? resolvedPersonId : undefined,
        groupId: type === 'group_expense' ? resolvedGroupId : undefined,
        loanId: (type === 'loan_repayment_received' || type === 'loan_repayment_made') ? (loanId || undefined) : undefined,
        description: finalDescription,
        date: new Date(dateStr + 'T12:00:00').toISOString(),
        userShareAmount: userShare,
        memberReceivables: receivables,
        payerPersonId: '__ME__',
      });

      // Joyful feedback
      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
      } catch {}

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === accountId) || accounts[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Transaction" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Segmented Switcher */}
        <div className="grid grid-cols-4 gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => handleTypeChange('personal_expense')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'personal_expense' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'income' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('loan_repayment_received')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'loan_repayment_received' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HandCoins className="w-4 h-4 text-teal-400" />
            <span>Collect</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('loan_repayment_made')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'loan_repayment_made' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HandCoins className="w-4 h-4 text-violet-400 rotate-180" />
            <span>Pay Loan</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('money_lent')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'money_lent' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HandCoins className="w-4 h-4 text-amber-400" />
            <span>Lend</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('money_borrowed')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'money_borrowed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HandCoins className="w-4 h-4 text-blue-400 rotate-180" />
            <span>Borrow</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('account_transfer')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'account_transfer' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
            <span>Transfer</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('group_expense')}
            className={`py-2 px-1 rounded-lg font-medium transition-colors flex flex-col items-center gap-1 cursor-pointer ${
              type === 'group_expense' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Group Split</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* 1. Core Fields: Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              required
              autoFocus
            />
            {/* Quick partial repayment chips for Collect / Pay Loan */}
            {repaymentContext && repaymentContext.totalOutstanding > 0 && (
              <div className="flex items-center gap-1 pt-0.5">
                <span className="text-[10px] text-zinc-500 mr-0.5 flex items-center gap-0.5">
                  <Percent className="w-2.5 h-2.5" /> Quick:
                </span>
                <button
                  type="button"
                  onClick={() => setPartialPercentage(0.25)}
                  className="px-1.5 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-medium cursor-pointer transition-colors"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setPartialPercentage(0.5)}
                  className="px-1.5 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-medium cursor-pointer transition-colors"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setPartialPercentage(0.75)}
                  className="px-1.5 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-medium cursor-pointer transition-colors"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setPartialPercentage(1.0)}
                  className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded font-medium cursor-pointer transition-colors"
                >
                  100%
                </button>
              </div>
            )}
          </div>
          <Input
            label="Date *"
            type="date"
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            required
          />
        </div>

        {/* 2. Extra Name for Lend & Borrow */}
        {(type === 'money_lent' || type === 'money_borrowed') && (
          <div className="space-y-1.5 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                {type === 'money_lent' ? 'Borrower Name *' : 'Lender Name *'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsNewPerson(!isNewPerson);
                  setCustomPersonName('');
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                {isNewPerson ? (
                  <>
                    <UserCheck className="w-3 h-3" /> Select from contacts
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" /> Enter new person name
                  </>
                )}
              </button>
            </div>

            {isNewPerson || people.length === 0 ? (
              <Input
                placeholder="Enter person's name (e.g. Rahul, Priya, Vikram)"
                value={customPersonName}
                onChange={e => setCustomPersonName(e.target.value)}
                required
                autoFocus={isNewPerson}
              />
            ) : (
              <Select
                value={personId}
                onChange={e => {
                  if (e.target.value === '__NEW__') {
                    setIsNewPerson(true);
                  } else {
                    setPersonId(e.target.value);
                  }
                }}
                options={[
                  ...people.map(p => ({
                    value: p.id,
                    label: `${p.name} ${p.nickname ? `(${p.nickname})` : ''}`,
                  })),
                  { value: '__NEW__', label: '+ Enter a new name...' },
                ]}
              />
            )}
          </div>
        )}

        {/* 3. Extra Name for Collect Money & Pay Loan (With Live Debt Remaining Calculation) */}
        {(type === 'loan_repayment_received' || type === 'loan_repayment_made') && (
          <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 space-y-3">
            <Select
              label={type === 'loan_repayment_received' ? 'Received From (Person) *' : 'Paying To (Person) *'}
              value={personId}
              onChange={e => {
                setPersonId(e.target.value);
                setLoanId('');
              }}
              options={people.map(p => ({
                value: p.id,
                label: `${p.name} ${p.nickname ? `(${p.nickname})` : ''}`,
              }))}
            />

            {/* Real-time partial balance card */}
            {repaymentContext && repaymentContext.totalOutstanding > 0 && (
              <div className="p-3 bg-zinc-900/90 rounded-lg border border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Current Outstanding Debt:</span>
                  <span className="font-semibold text-zinc-200">
                    {fromMinorUnits(repaymentContext.totalOutstanding, 2)} {selectedAccount?.currency || 'INR'}
                  </span>
                </div>

                {repaymentContext.minorEntered > 0 && (
                  <>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Payment Amount:</span>
                      <span className="font-semibold text-emerald-400">
                        - {fromMinorUnits(repaymentContext.minorEntered, 2)} {selectedAccount?.currency || 'INR'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-zinc-200">
                      <span className="font-medium">New Remaining Debt:</span>
                      <span className="font-bold text-zinc-100">
                        {fromMinorUnits(repaymentContext.newRemaining, 2)} {selectedAccount?.currency || 'INR'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5 text-zinc-400">
                      <span>Account Balance Effect:</span>
                      <span className={type === 'loan_repayment_received' ? 'text-emerald-400 font-medium' : 'text-blue-400 font-medium'}>
                        {type === 'loan_repayment_received' ? '+' : '-'}
                        {fromMinorUnits(repaymentContext.minorEntered, 2)} {selectedAccount?.currency || 'INR'} auto-
                        {type === 'loan_repayment_received' ? 'added to' : 'deducted from'} {selectedAccount?.name || 'Account'}
                      </span>
                    </div>

                    <div className="pt-0.5">
                      {repaymentContext.isFull && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Full Settlement: Debt 100% Repaid
                        </span>
                      )}
                      {repaymentContext.isPartial && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          🟡 Partial Repayment: Remaining is {fromMinorUnits(repaymentContext.newRemaining, 2)} {selectedAccount?.currency || 'INR'}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. Extra Name for Groups / Splitwise */}
        {type === 'group_expense' && (
          <div className="space-y-1.5 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">
                Group Name (Split with) *
              </label>
              {groups.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNewGroup(!isNewGroup);
                    setCustomGroupName('');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                >
                  {isNewGroup ? 'Select existing group' : '+ Create new group'}
                </button>
              )}
            </div>

            {isNewGroup || groups.length === 0 ? (
              <Input
                placeholder="Enter group name (e.g. Goa Trip, Flatmates, Weekend Lunch)"
                value={customGroupName}
                onChange={e => setCustomGroupName(e.target.value)}
                required
                autoFocus={isNewGroup}
              />
            ) : (
              <Select
                value={groupId}
                onChange={e => {
                  if (e.target.value === '__NEW__') {
                    setIsNewGroup(true);
                  } else {
                    setGroupId(e.target.value);
                  }
                }}
                options={[
                  ...groups.map(g => ({
                    value: g.id,
                    label: `${g.name} (${g.memberPersonIds.length} members)`,
                  })),
                  { value: '__NEW__', label: '+ Create new group...' },
                ]}
              />
            )}
          </div>
        )}

        {/* 5. Accounts for Transfer */}
        {type === 'account_transfer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
            <Select
              label="From Account *"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              options={accounts.map(a => ({
                value: a.id,
                label: `${a.name} (${a.currency})`,
              }))}
            />
            <Select
              label="To Account *"
              value={toAccountId}
              onChange={e => setToAccountId(e.target.value)}
              options={accounts.map(a => ({
                value: a.id,
                label: `${a.name} (${a.currency})`,
              }))}
            />
          </div>
        )}

        {/* 6. Core Field: Description */}
        <Input
          label="Description"
          placeholder={
            type === 'personal_expense'
              ? 'e.g. Grocery, Lunch, Uber, Movie'
              : type === 'income'
              ? 'e.g. Salary, Freelance project, Dividend'
              : type === 'money_lent'
              ? 'e.g. Movie ticket share, Emergency cash'
              : type === 'money_borrowed'
              ? 'e.g. Borrowed for rent, Travel advance'
              : type === 'group_expense'
              ? 'e.g. Dinner bill, Airbnb booking, Groceries'
              : 'e.g. Transaction description'
          }
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {/* Footer Actions with subtle account indicator if multiple accounts */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div>
            {type !== 'account_transfer' && accounts.length > 1 && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span>Account:</span>
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="bg-transparent text-zinc-300 hover:text-zinc-100 cursor-pointer font-medium outline-none border-b border-zinc-700/60 pb-0.5"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} className="bg-zinc-900 text-zinc-200">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Transaction
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
