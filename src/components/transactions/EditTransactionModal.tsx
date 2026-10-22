import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Account, Category, Person, Transaction } from '../../types';
import { updateTransaction } from '../../features/accounting/ledgerEngine';
import { toMinorUnits, fromMinorUnits } from '../../lib/money';
import { db } from '../../db/database';
import { Pencil, Calendar, DollarSign, User, AlertCircle, Check } from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: Account[];
  categories: Category[];
  people: Person[];
  onSuccess?: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  accounts,
  categories,
  people,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [personId, setPersonId] = useState('');
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [customPersonName, setCustomPersonName] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (transaction && isOpen) {
      setAmountStr(fromMinorUnits(transaction.amount, 2).toString());
      setDescription(transaction.description || '');
      setDateStr(transaction.date ? transaction.date.substring(0, 10) : new Date().toISOString().substring(0, 10));
      setDueDateStr(transaction.dueDate ? transaction.dueDate.substring(0, 10) : '');
      setAccountId(transaction.accountId || (accounts[0]?.id ?? ''));
      setToAccountId(transaction.toAccountId || '');
      setCategoryId(transaction.categoryId || '');
      setPersonId(transaction.personId || '');
      setNotes(transaction.notes || '');
      setIsNewPerson(false);
      setCustomPersonName('');
      setErrorMessage('');
    }
  }, [transaction, isOpen, accounts]);

  if (!transaction) return null;

  const isPersonRelevant =
    transaction.type === 'money_lent' ||
    transaction.type === 'money_borrowed' ||
    transaction.type === 'loan_repayment_received' ||
    transaction.type === 'loan_repayment_made' ||
    transaction.type === 'group_expense' ||
    transaction.type === 'group_settlement' ||
    Boolean(transaction.personId);

  const isTransfer = transaction.type === 'account_transfer';
  const isLoanOrRepayment =
    transaction.type === 'money_lent' ||
    transaction.type === 'money_borrowed' ||
    transaction.type === 'loan_repayment_received' ||
    transaction.type === 'loan_repayment_made';

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'money_lent':
        return 'Money Lent';
      case 'money_borrowed':
        return 'Money Borrowed';
      case 'loan_repayment_received':
        return 'Repayment Received';
      case 'loan_repayment_made':
        return 'Repayment Paid';
      case 'personal_expense':
        return 'Expense';
      case 'income':
        return 'Income';
      case 'account_transfer':
        return 'Account Transfer';
      case 'group_expense':
        return 'Group Split';
      case 'group_settlement':
        return 'Group Settlement';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please enter a description or title for this entry.');
      return;
    }

    if (!dateStr) {
      setErrorMessage('Please select a valid date.');
      return;
    }

    if (!accountId) {
      setErrorMessage('Please select an account.');
      return;
    }

    try {
      setIsSubmitting(true);

      let effectivePersonId = personId;
      if (isNewPerson) {
        const trimmed = customPersonName.trim();
        if (!trimmed) {
          setErrorMessage('Please enter the person\'s name.');
          setIsSubmitting(false);
          return;
        }
        const nowStr = new Date().toISOString();
        const newId = crypto.randomUUID();
        await db.people.put({
          id: newId,
          name: trimmed,
          tags: [],
          isArchived: false,
          createdAt: nowStr,
          updatedAt: nowStr,
        });
        effectivePersonId = newId;
      }

      const minorUnits = toMinorUnits(parsedAmount, 2);
      const isoDate = new Date(dateStr + 'T12:00:00').toISOString();
      const isoDueDate = dueDateStr ? new Date(dueDateStr + 'T12:00:00').toISOString() : undefined;

      await updateTransaction(transaction.id, {
        amount: minorUnits,
        description: description.trim(),
        date: isoDate,
        dueDate: isoDueDate,
        accountId,
        toAccountId: isTransfer ? toAccountId : undefined,
        categoryId: categoryId || undefined,
        personId: isPersonRelevant ? effectivePersonId || undefined : undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Transaction"
      description={`Update any details if amount, name, date, or contact was entered wrong.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Type Badge */}
        <div className="flex items-center justify-between p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium text-[11px]">Type:</span>
            <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {getTypeLabel(transaction.type)}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {transaction.currency}
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-zinc-300 font-medium mb-1.5 flex items-center justify-between">
            <span>Amount ({transaction.currency})</span>
            <span className="text-[11px] text-zinc-500">Correct if entered wrong</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full text-lg font-bold bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Name / Description */}
        <div>
          <Input
            label="Name / Description"
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Groceries, Lent for rent, Dinner split..."
          />
        </div>

        {/* Date & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Transaction Date</span>
            </label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {isLoanOrRepayment && (
            <div>
              <label className="block text-zinc-300 font-medium mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Due Date (Optional)</span>
              </label>
              <input
                type="date"
                value={dueDateStr}
                onChange={e => setDueDateStr(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Person (if applicable) */}
        {isPersonRelevant && (
          <div className="space-y-2 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Person Involved</span>
              </label>
              <button
                type="button"
                onClick={() => setIsNewPerson(!isNewPerson)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer font-medium"
              >
                {isNewPerson ? 'Select existing contact' : '+ New person name'}
              </button>
            </div>

            {isNewPerson ? (
              <Input
                placeholder="Enter person's name..."
                value={customPersonName}
                onChange={e => setCustomPersonName(e.target.value)}
                autoFocus
              />
            ) : (
              <Select
                value={personId}
                onChange={e => setPersonId(e.target.value)}
                options={[
                  { value: '', label: 'Select person...' },
                  ...people.map(p => ({
                    value: p.id,
                    label: p.nickname ? `${p.name} (${p.nickname})` : p.name,
                  })),
                ]}
              />
            )}
          </div>
        )}

        {/* Account and Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Select
              label="Account / Wallet"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              options={accounts.map(a => ({ value: a.id, label: a.name }))}
            />
          </div>

          {isTransfer ? (
            <div>
              <Select
                label="Destination Account"
                value={toAccountId}
                onChange={e => setToAccountId(e.target.value)}
                options={accounts.filter(a => a.id !== accountId).map(a => ({ value: a.id, label: a.name }))}
              />
            </div>
          ) : (
            <div>
              <Select
                label="Category"
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                options={[
                  { value: '', label: 'No Category' },
                  ...categories.map(c => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <Input
            label="Notes / Remarks (Optional)"
            placeholder="Add any extra detail or reference..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
