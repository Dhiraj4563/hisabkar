import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Transaction, Account, Category, Person, Group, JournalLine } from '../../types';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { voidTransaction } from '../../features/accounting/ledgerEngine';
import { db } from '../../db/database';
import { Receipt, Calendar, User, Split, Wallet, AlertTriangle, Undo2, Pencil } from 'lucide-react';

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  people: Person[];
  groups: Group[];
  onVoidSuccess?: () => void;
  onEdit?: (tx: Transaction) => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  isOpen,
  onClose,
  accounts,
  categories,
  people,
  groups,
  onVoidSuccess,
  onEdit,
}) => {
  const [journalLines, setJournalLines] = useState<JournalLine[]>([]);
  const [isVoiding, setIsVoiding] = useState(false);
  const [showConfirmVoid, setShowConfirmVoid] = useState(false);

  useEffect(() => {
    if (transaction) {
      setShowConfirmVoid(false);
      // Fetch associated journal lines
      db.journalEntries
        .where('transactionId')
        .equals(transaction.id)
        .first()
        .then(entry => {
          if (entry) {
            db.journalLines.where('journalEntryId').equals(entry.id).toArray().then(setJournalLines);
          } else {
            setJournalLines([]);
          }
        });
    }
  }, [transaction]);

  if (!transaction) return null;

  const account = accounts.find(a => a.id === transaction.accountId);
  const toAccount = transaction.toAccountId ? accounts.find(a => a.id === transaction.toAccountId) : undefined;
  const category = categories.find(c => c.id === transaction.categoryId);
  const person = people.find(p => p.id === transaction.personId);
  const group = groups.find(g => g.id === transaction.groupId);

  const handleVoid = async () => {
    try {
      setIsVoiding(true);
      await voidTransaction(transaction.id, 'User requested reversal');
      onVoidSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to void transaction');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction.description || 'Transaction Details'}
      description={`ID: ${transaction.id.substring(0, 8)}... · Status: ${transaction.status.toUpperCase()}`}
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs text-zinc-300">
        {/* Hero Amount */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
          <div>
            <span className="text-[11px] text-zinc-400 block uppercase tracking-wider font-semibold">
              Transaction Amount
            </span>
            <MoneyDisplay
              amount={transaction.amount}
              currency={transaction.currency}
              size="2xl"
              colorVariant={
                transaction.type === 'income'
                  ? 'positive'
                  : transaction.type === 'personal_expense'
                  ? 'negative'
                  : 'neutral'
              }
            />
          </div>
          {transaction.status === 'voided' && (
            <span className="text-rose-400 border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 rounded-md font-semibold text-xs">
              VOIDED / REVERSED
            </span>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date & Time
            </span>
            <p className="font-medium text-zinc-200">
              {new Date(transaction.date).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Account
            </span>
            <p className="font-medium text-zinc-200">
              {account?.name || 'Primary'} {toAccount ? `→ ${toAccount.name}` : ''}
            </p>
          </div>

          {category && (
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500">Category</span>
              <p className="font-medium text-zinc-200">{category.name}</p>
            </div>
          )}

          {person && (
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Person
              </span>
              <p className="font-medium text-zinc-200">{person.name}</p>
            </div>
          )}

          {group && (
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Split className="w-3.5 h-3.5" /> Group
              </span>
              <p className="font-medium text-zinc-200">{group.name}</p>
            </div>
          )}

          {transaction.dueDate && (
            <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-1">
              <span className="text-amber-400">Due Date</span>
              <p className="font-medium text-amber-300">
                {new Date(transaction.dueDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {transaction.notes && (
          <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800">
            <span className="text-zinc-500 block mb-1">Notes / References:</span>
            <p className="text-zinc-300">{transaction.notes}</p>
          </div>
        )}

        {/* Receipt Attachment preview */}
        {transaction.receiptDataUrl && (
          <div className="space-y-2">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
              <Receipt className="w-4 h-4 text-emerald-400" /> Attached Receipt
            </span>
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl max-h-56 overflow-hidden flex items-center justify-center">
              <img
                src={transaction.receiptDataUrl}
                alt="Receipt"
                className="max-h-52 object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Double-Entry Ledger Lines Inspection */}
        {journalLines.length > 0 && (
          <div className="space-y-2">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px] block">
              Double-Entry Journal Lines (Balanced)
            </span>
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-2.5">Account / Entity</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5 text-right">Debit</th>
                    <th className="p-2.5 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/60 font-mono">
                  {journalLines.map(l => (
                    <tr key={l.id}>
                      <td className="p-2.5 text-zinc-300">{l.entityName}</td>
                      <td className="p-2.5 text-zinc-400 uppercase text-[10px]">
                        {l.accountCategory}
                      </td>
                      <td className="p-2.5 text-right text-emerald-400">
                        {l.debit > 0 ? (l.debit / 100).toFixed(2) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-rose-400">
                        {l.credit > 0 ? (l.credit / 100).toFixed(2) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Void / Reversal Action */}
        {transaction.status === 'posted' && (
          <div className="pt-3 border-t border-zinc-800">
            {showConfirmVoid ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3">
                <div className="flex items-start gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs">
                    Reversing will post balancing adjustment entries into the ledger and update your account
                    balances. This action maintains full audit integrity.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowConfirmVoid(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={isVoiding}
                    onClick={handleVoid}
                    icon={<Undo2 className="w-3.5 h-3.5" />}
                  >
                    Confirm Reversal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-[11px] text-zinc-500">Need to correct this entry?</span>
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onClose();
                        onEdit(transaction);
                      }}
                      icon={<Pencil className="w-3.5 h-3.5" />}
                    >
                      Edit Entry
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConfirmVoid(true)}
                    icon={<Undo2 className="w-3.5 h-3.5" />}
                  >
                    Void & Reverse
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
