import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { Account, Category, RecurringFrequency, RecurringRule, TransactionType } from '../types';
import { db } from '../db/database';
import { postTransaction } from '../features/accounting/ledgerEngine';
import { toMinorUnits } from '../lib/money';
import { Repeat, Plus, Play, CheckCircle2, Clock, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RecurringPageProps {
  recurringRules: RecurringRule[];
  accounts: Account[];
  categories: Category[];
  hideBalances: boolean;
}

export const RecurringPage: React.FC<RecurringPageProps> = ({
  recurringRules,
  accounts,
  categories,
  hideBalances,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TransactionType>('personal_expense');
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDateStr, setStartDateStr] = useState(new Date().toISOString().substring(0, 10));

  const handleProcessDueRules = async () => {
    try {
      setIsProcessing(true);
      setProcessMessage('');
      const now = new Date();
      let processedCount = 0;

      for (const rule of recurringRules) {
        if (!rule.isActive) continue;

        const nextDate = new Date(rule.nextOccurrence);
        if (nextDate <= now) {
          // Rule is due! Check if not already generated on this date
          const dateStr = nextDate.toISOString();

          await postTransaction({
            type: rule.type,
            amount: rule.amount,
            currency: rule.currency,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            description: `[Recurring] ${rule.title}`,
            date: dateStr,
            notes: `Auto-generated from recurring rule ${rule.title}`,
          });

          // Calculate next occurrence
          const advancedDate = new Date(nextDate);
          if (rule.frequency === 'daily') advancedDate.setDate(advancedDate.getDate() + 1);
          else if (rule.frequency === 'weekly') advancedDate.setDate(advancedDate.getDate() + 7);
          else if (rule.frequency === 'monthly') advancedDate.setMonth(advancedDate.getMonth() + 1);
          else if (rule.frequency === 'yearly') advancedDate.setFullYear(advancedDate.getFullYear() + 1);

          rule.lastGeneratedDate = dateStr;
          rule.nextOccurrence = advancedDate.toISOString();
          await db.recurringRules.put(rule);
          processedCount++;
        }
      }

      if (processedCount > 0) {
        setProcessMessage(`Successfully posted ${processedCount} due recurring transaction${processedCount > 1 ? 's' : ''}!`);
        try {
          confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
        } catch {}
      } else {
        setProcessMessage('All recurring rules are currently up-to-date.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process recurring transactions');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amountStr || !accountId) return;

    const amt = toMinorUnits(parseFloat(amountStr) || 0, 2);
    const curr = accounts.find(a => a.id === accountId)?.currency || 'INR';

    const newRule: RecurringRule = {
      id: `rec_${crypto.randomUUID()}`,
      title: title.trim(),
      type,
      amount: amt,
      currency: curr,
      accountId,
      categoryId: categoryId || undefined,
      frequency,
      startDate: new Date(startDateStr).toISOString(),
      nextOccurrence: new Date(startDateStr).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await db.recurringRules.put(newRule);
    setIsAddOpen(false);
    setTitle('');
    setAmountStr('');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Recurring Transactions</h2>
          <p className="text-xs text-zinc-400">
            Automate monthly salary, subscriptions, rent, and loan payments without duplicates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            isLoading={isProcessing}
            onClick={handleProcessDueRules}
            icon={<Play className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Process Due Entries
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            Add Recurring Rule
          </Button>
        </div>
      </div>

      {processMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{processMessage}</span>
        </div>
      )}

      {/* Rules Grid */}
      {recurringRules.length === 0 ? (
        <Card className="py-16 text-center text-zinc-500 space-y-3">
          <Repeat className="w-10 h-10 mx-auto text-zinc-600 stroke-1" />
          <p className="text-sm font-medium">No recurring rules configured</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Set up automatic schedules for monthly salary, Netflix/Spotify subscriptions, gym fees, or rent.
          </p>
          <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)}>
            Create First Rule
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurringRules.map(rule => {
            const acc = accounts.find(a => a.id === rule.accountId);
            const cat = categories.find(c => c.id === rule.categoryId);
            const isDue = new Date(rule.nextOccurrence) <= new Date();

            return (
              <Card key={rule.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-100 text-sm">{rule.title}</h3>
                    <p className="text-xs text-zinc-400 capitalize">
                      {rule.frequency} · {rule.type.replace('_', ' ')}
                    </p>
                  </div>
                  {isDue ? (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                      Due Now
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded font-medium">
                      Active
                    </span>
                  )}
                </div>

                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Scheduled Amount:</span>
                  <MoneyDisplay
                    amount={rule.amount}
                    currency={rule.currency}
                    hideBalances={hideBalances}
                    size="base"
                    colorVariant={rule.type === 'income' ? 'positive' : 'negative'}
                  />
                </div>

                <div className="text-[11px] text-zinc-400 space-y-1 pt-1 border-t border-zinc-800/60">
                  <p>Account: {acc?.name || 'Primary'}</p>
                  {cat && <p>Category: {cat.name}</p>}
                  <p className="flex items-center gap-1.5 text-zinc-300">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Next Due: {new Date(rule.nextOccurrence).toLocaleDateString()}</span>
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Recurring Rule Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="New Recurring Schedule"
        maxWidth="md"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Input
            label="Schedule Title *"
            placeholder="e.g. Netflix Subscription, Office Rent, Monthly Salary"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Transaction Type *"
              value={type}
              onChange={e => setType(e.target.value as any)}
              options={[
                { value: 'personal_expense', label: 'Expense (Bill / Subscription)' },
                { value: 'income', label: 'Income (Salary / Dividend)' },
              ]}
            />
            <Select
              label="Frequency *"
              value={frequency}
              onChange={e => setFrequency(e.target.value as any)}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'yearly', label: 'Yearly' },
                { value: 'daily', label: 'Daily' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Amount *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              required
            />
            <Input
              label="Start / Next Date *"
              type="date"
              value={startDateStr}
              onChange={e => setStartDateStr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Account *"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              options={[
                { value: '', label: '-- Select Account --' },
                ...accounts.map(a => ({ value: a.id, label: a.name })),
              ]}
              required
            />
            <Select
              label="Category"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              options={[
                { value: '', label: '-- Select Category --' },
                ...categories
                  .filter(c => (type === 'income' ? c.type === 'income' : c.type === 'expense'))
                  .map(c => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
