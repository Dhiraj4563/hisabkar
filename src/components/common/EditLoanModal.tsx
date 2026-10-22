import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Loan, Person, Account } from '../../types';
import { updateLoan } from '../../features/accounting/ledgerEngine';
import { toMinorUnits, fromMinorUnits } from '../../lib/money';
import { db } from '../../db/database';
import { Calendar, User, AlertCircle, Check } from 'lucide-react';

interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  people: Person[];
  accounts: Account[];
  onSuccess?: () => void;
}

export const EditLoanModal: React.FC<EditLoanModalProps> = ({
  isOpen,
  onClose,
  loan,
  people,
  accounts,
  onSuccess,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [personId, setPersonId] = useState('');
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [customPersonName, setCustomPersonName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (loan && isOpen) {
      setAmountStr(fromMinorUnits(loan.principalAmount, 2).toString());
      setPersonId(loan.personId);
      setDescription(loan.description || '');
      setDueDateStr(loan.dueDate ? loan.dueDate.substring(0, 10) : '');
      setIsNewPerson(false);
      setCustomPersonName('');
      setErrorMessage('');
    }
  }, [loan, isOpen]);

  if (!loan) return null;

  const isLent = loan.type === 'lent';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setIsSubmitting(true);

      let effectivePersonId = personId;
      if (isNewPerson) {
        const trimmed = customPersonName.trim();
        if (!trimmed) {
          setErrorMessage('Please enter the contact person\'s name.');
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
      const isoDueDate = dueDateStr ? new Date(dueDateStr + 'T12:00:00').toISOString() : undefined;

      await updateLoan(loan.id, {
        principalAmount: minorUnits,
        personId: effectivePersonId,
        description: description.trim() || undefined,
        dueDate: isoDueDate,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update loan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLent ? 'Edit Lent Record' : 'Edit Borrowed Record'}
      description="Update amount, person name, or due date if entered incorrectly."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="flex items-center justify-between p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium text-[11px]">Type:</span>
            <span
              className={`font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded border ${
                isLent
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}
            >
              {isLent ? 'Money Lent (To Take)' : 'Money Borrowed (To Give)'}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {loan.currency}
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
            <span>Principal Amount ({loan.currency})</span>
            <span className="text-[11px] text-zinc-500">Correct if entered wrong</span>
          </label>
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

        {/* Person Involved */}
        <div className="space-y-2 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-zinc-300 font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Person / Contact</span>
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
              placeholder="Enter contact name..."
              value={customPersonName}
              onChange={e => setCustomPersonName(e.target.value)}
              autoFocus
            />
          ) : (
            <Select
              value={personId}
              onChange={e => setPersonId(e.target.value)}
              options={people.map(p => ({
                value: p.id,
                label: p.nickname ? `${p.name} (${p.nickname})` : p.name,
              }))}
            />
          )}
        </div>

        {/* Description */}
        <div>
          <Input
            label="Description / Purpose"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Travel loan, Emergency funds..."
          />
        </div>

        {/* Due Date */}
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

        {/* Actions */}
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
