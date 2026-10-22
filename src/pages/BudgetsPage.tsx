import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { Budget, Category, SavingsGoal, Transaction } from '../types';
import { db } from '../db/database';
import { toMinorUnits, fromMinorUnits, formatMoney } from '../lib/money';
import {
  PieChart,
  Plus,
  Target,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  TrendingUp,
} from 'lucide-react';

interface BudgetsPageProps {
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  categories: Category[];
  transactions: Transaction[];
  hideBalances: boolean;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
  budgets,
  savingsGoals,
  categories,
  transactions,
  hideBalances,
}) => {
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);

  // Budget form state
  const [budgetCatId, setBudgetCatId] = useState('');
  const [budgetAmountStr, setBudgetAmountStr] = useState('');

  // Goal form state
  const [goalName, setGoalName] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalCurrentStr, setGoalCurrentStr] = useState('0');
  const [goalDateStr, setGoalDateStr] = useState('');

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Current month's expenses per category (qualifying expenses only)
  const currentMonthSpending = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.status === 'voided') continue;
      if (t.date.startsWith(currentMonthStr)) {
        if (t.type === 'personal_expense' || t.type === 'group_expense') {
          const catId = t.categoryId || 'other';
          map[catId] = (map[catId] || 0) + t.amount;
        } else if (t.type === 'refund' && t.categoryId) {
          map[t.categoryId] = Math.max(0, (map[t.categoryId] || 0) - t.amount);
        }
      }
    }
    return map;
  }, [transactions, currentMonthStr]);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCatId || !budgetAmountStr) return;

    const amt = toMinorUnits(parseFloat(budgetAmountStr) || 0, 2);
    const newBudget: Budget = {
      id: `b_${crypto.randomUUID()}`,
      categoryId: budgetCatId,
      amount: amt,
      currency: 'INR',
      monthStr: currentMonthStr,
      rolloverEnabled: false,
      createdAt: new Date().toISOString(),
    };

    await db.budgets.put(newBudget);
    setIsAddBudgetOpen(false);
    setBudgetAmountStr('');
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !goalTargetStr) return;

    const targetAmt = toMinorUnits(parseFloat(goalTargetStr) || 0, 2);
    const currentAmt = toMinorUnits(parseFloat(goalCurrentStr) || 0, 2);

    const newGoal: SavingsGoal = {
      id: `sg_${crypto.randomUUID()}`,
      name: goalName.trim(),
      targetAmount: targetAmt,
      currentAmount: currentAmt,
      currency: 'INR',
      targetDate: goalDateStr ? new Date(goalDateStr).toISOString() : new Date().toISOString(),
      isCompleted: currentAmt >= targetAmt,
      createdAt: new Date().toISOString(),
    };

    await db.savingsGoals.put(newGoal);
    setIsAddGoalOpen(false);
    setGoalName('');
    setGoalTargetStr('');
    setGoalCurrentStr('0');
    setGoalDateStr('');
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Budgets & Savings Goals</h2>
          <p className="text-xs text-zinc-400">
            Keep expenses within limits and track future milestone savings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'budgets' ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddBudgetOpen(true)}
              icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
            >
              Set Budget
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddGoalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
            >
              Add Savings Goal
            </Button>
          )}
        </div>
      </div>

      {/* Segmented Tab */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs w-fit">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`px-4 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === 'budgets'
              ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Monthly Budgets ({budgets.length})
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
            activeTab === 'goals'
              ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Savings Goals ({savingsGoals.length})
        </button>
      </div>

      {activeTab === 'budgets' && (
        <div className="space-y-4">
          {budgets.length === 0 ? (
            <Card className="py-16 text-center text-zinc-500 space-y-3">
              <PieChart className="w-10 h-10 mx-auto text-zinc-600 stroke-1" />
              <p className="text-sm font-medium">No budgets defined for this month</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Set monthly spending caps on Groceries, Dining, Rent, or Entertainment to get proactive alerts.
              </p>
              <Button size="sm" variant="primary" onClick={() => setIsAddBudgetOpen(true)}>
                Set Your First Budget
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgets.map(b => {
                const cat = categories.find(c => c.id === b.categoryId);
                const spent = currentMonthSpending[b.categoryId] || 0;
                const percent = Math.min(100, Math.round((spent / b.amount) * 100));
                const isOver = spent > b.amount;
                const isWarning = !isOver && percent >= 80;

                return (
                  <Card key={b.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color || '#10b981' }} />
                        <h3 className="font-semibold text-zinc-100 text-sm">{cat?.name || 'Category'}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-400 font-medium">
                          {percent}% of limit
                        </span>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Actual Spent</span>
                        <MoneyDisplay
                          amount={spent}
                          currency={b.currency}
                          hideBalances={hideBalances}
                          size="base"
                          colorVariant={isOver ? 'negative' : 'neutral'}
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-400 block text-[10px]">Budget Limit</span>
                        <MoneyDisplay
                          amount={b.amount}
                          currency={b.currency}
                          hideBalances={hideBalances}
                          size="base"
                          colorVariant="muted"
                        />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {isOver && (
                      <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Budget exceeded by {formatMoney(spent - b.amount, b.currency)}</span>
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="space-y-4">
          {savingsGoals.length === 0 ? (
            <Card className="py-16 text-center text-zinc-500 space-y-3">
              <Target className="w-10 h-10 mx-auto text-zinc-600 stroke-1" />
              <p className="text-sm font-medium">No savings goals created</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Track goals like an Emergency Fund, New Laptop, Vacation Fund, or Vehicle down-payment.
              </p>
              <Button size="sm" variant="primary" onClick={() => setIsAddGoalOpen(true)}>
                Create Savings Goal
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsGoals.map(g => {
                const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                const isCompleted = g.currentAmount >= g.targetAmount;

                return (
                  <Card key={g.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
                        <span>{g.name}</span>
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Reached
                          </span>
                        )}
                      </h3>
                      <span className="text-xs font-semibold text-emerald-400">{percent}%</span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-zinc-400 block text-[10px]">Saved so far</span>
                        <MoneyDisplay
                          amount={g.currentAmount}
                          currency={g.currency}
                          hideBalances={hideBalances}
                          size="base"
                          colorVariant="positive"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-400 block text-[10px]">Target</span>
                        <MoneyDisplay
                          amount={g.targetAmount}
                          currency={g.currency}
                          hideBalances={hideBalances}
                          size="base"
                          colorVariant="muted"
                        />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {g.targetDate && (
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Target Deadline: {new Date(g.targetDate).toLocaleDateString()}</span>
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Budget Modal */}
      <Modal
        isOpen={isAddBudgetOpen}
        onClose={() => setIsAddBudgetOpen(false)}
        title="Set Category Monthly Budget"
        maxWidth="md"
      >
        <form onSubmit={handleCreateBudget} className="space-y-4">
          <Select
            label="Category *"
            value={budgetCatId}
            onChange={e => setBudgetCatId(e.target.value)}
            options={[
              { value: '', label: '-- Choose Category --' },
              ...expenseCategories.map(c => ({ value: c.id, label: c.name })),
            ]}
            required
          />
          <Input
            label="Monthly Limit Amount *"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={budgetAmountStr}
            onChange={e => setBudgetAmountStr(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddBudgetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Savings Goal Modal */}
      <Modal
        isOpen={isAddGoalOpen}
        onClose={() => setIsAddGoalOpen(false)}
        title="Create Savings Goal"
        maxWidth="md"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <Input
            label="Goal Name *"
            placeholder="e.g. Emergency Fund, Japan Trip 2027"
            value={goalName}
            onChange={e => setGoalName(e.target.value)}
            required
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Target Amount *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={goalTargetStr}
              onChange={e => setGoalTargetStr(e.target.value)}
              required
            />
            <Input
              label="Current Progress Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={goalCurrentStr}
              onChange={e => setGoalCurrentStr(e.target.value)}
            />
          </div>
          <Input
            label="Target Deadline"
            type="date"
            value={goalDateStr}
            onChange={e => setGoalDateStr(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddGoalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Goal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
