import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Group, GroupExpense, GroupSettlement, Person, Account, Transaction } from '../types';
import { GroupDetailPage } from './GroupDetailPage';
import { db } from '../db/database';
import { Split, Plus, Users, ArrowRight } from 'lucide-react';
import { MoneyDisplay } from '../components/common/MoneyDisplay';

interface GroupsPageProps {
  groups: Group[];
  groupExpenses: GroupExpense[];
  groupSettlements: GroupSettlement[];
  people: Person[];
  accounts: Account[];
  transactions: Transaction[];
  hideBalances: boolean;
  selectedGroupId?: string;
  onSelectGroup: (groupId?: string) => void;
  onOpenAddExpense: (groupId: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const GroupsPage: React.FC<GroupsPageProps> = ({
  groups,
  groupExpenses,
  groupSettlements,
  people,
  accounts,
  transactions,
  hideBalances,
  selectedGroupId,
  onSelectGroup,
  onOpenAddExpense,
  onSelectTransaction,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(['__ME__']);

  // If a group is selected, render the detailed Group view
  const currentGroup = groups.find(g => g.id === selectedGroupId);
  if (currentGroup) {
    return (
      <GroupDetailPage
        group={currentGroup}
        groupExpenses={groupExpenses}
        groupSettlements={groupSettlements}
        people={people}
        accounts={accounts}
        transactions={transactions}
        hideBalances={hideBalances}
        onBack={() => onSelectGroup(undefined)}
        onOpenAddExpense={onOpenAddExpense}
        onSelectTransaction={onSelectTransaction}
      />
    );
  }

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || undefined,
      currency: accounts[0]?.currency || 'INR',
      memberPersonIds: selectedMemberIds,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.groups.put(newGroup);
    setIsCreateOpen(false);
    setName('');
    setDescription('');
    setSelectedMemberIds(['__ME__']);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Group Expense Splitting</h2>
          <p className="text-xs text-zinc-400">
            Manage trips, roommates, dinner bills, and settle balances with minimal transfers
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
        >
          Create New Group
        </Button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Card className="py-16 text-center text-zinc-500 space-y-3">
          <Split className="w-10 h-10 mx-auto text-zinc-600 stroke-1" />
          <p className="text-sm font-medium">No expense groups created yet</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Create a group for an upcoming vacation, apartment rent, or shared project to automatically split bills.
          </p>
          <Button size="sm" variant="primary" onClick={() => setIsCreateOpen(true)}>
            Create First Group
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(group => {
            const expList = groupExpenses.filter(e => e.groupId === group.id);
            const totalSpending = expList.reduce((sum, e) => sum + e.totalAmount, 0);

            return (
              <Card
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="hover:border-zinc-700 transition-all cursor-pointer p-4 space-y-3 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{group.description}</p>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Split className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total Group Spending:</span>
                  <MoneyDisplay
                    amount={totalSpending}
                    currency={group.currency}
                    hideBalances={hideBalances}
                    size="base"
                    colorVariant="neutral"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{group.memberPersonIds.length} members</span>
                  </span>
                  <div className="flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
                    <span>View Settlements</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Group"
        description="Add a group to split expenses among friends, flatmates, or colleagues."
        maxWidth="md"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Input
            label="Group Name *"
            placeholder="e.g. Goa Trip 2026, Flat 402 Rent, Weekend Dinner"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Description (Optional)"
            placeholder="e.g. Flight tickets, resort stay, shared meals"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">
              Select Members Participating in Group
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800 text-xs">
              {/* You (Me) */}
              <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes('__ME__')}
                  onChange={() => handleToggleMember('__ME__')}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                <span className="font-semibold text-zinc-200">You (Me)</span>
              </label>

              {people.map(p => (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(p.id)}
                    onChange={() => handleToggleMember(p.id)}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span className="text-zinc-300">{p.name} {p.nickname ? `(${p.nickname})` : ''}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
