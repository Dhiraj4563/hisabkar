import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { Person, Loan, Account, Transaction } from '../types';
import { db } from '../db/database';
import { PersonLedgerPage } from './PersonLedgerPage';
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  UserPlus,
  Phone,
  Mail,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
} from 'lucide-react';

interface PeoplePageProps {
  people: Person[];
  loans: Loan[];
  transactions: Transaction[];
  accounts: Account[];
  hideBalances: boolean;
  selectedPersonId?: string;
  onSelectPerson: (personId?: string) => void;
  onOpenAddModal: (type?: any, personId?: string, loanId?: string, groupId?: string) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onEditLoan?: (loan: Loan) => void;
  onEditPerson?: (person: Person) => void;
}

export const PeoplePage: React.FC<PeoplePageProps> = ({
  people,
  loans,
  transactions,
  accounts,
  hideBalances,
  selectedPersonId,
  onSelectPerson,
  onOpenAddModal,
  onSelectTransaction,
  onEditTransaction,
  onEditLoan,
  onEditPerson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'owed_to_me' | 'i_owe'>('all');
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  // New Person Form State
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // If a person is currently selected, show their individual ledger!
  const currentPerson = people.find(p => p.id === selectedPersonId);
  if (currentPerson) {
    return (
      <PersonLedgerPage
        person={currentPerson}
        transactions={transactions}
        loans={loans}
        accounts={accounts}
        hideBalances={hideBalances}
        onBack={() => onSelectPerson(undefined)}
        onOpenAddModal={onOpenAddModal}
        onSelectTransaction={onSelectTransaction}
        onEditTransaction={onEditTransaction}
        onEditLoan={onEditLoan}
        onEditPerson={onEditPerson}
      />
    );
  }

  // Precalculate balances for each person
  const peopleWithBalances = useMemo(() => {
    return people.map(p => {
      const pLoans = loans.filter(l => l.personId === p.id && l.status !== 'archived');
      let lentBalance = 0;
      let borrowedBalance = 0;

      for (const l of pLoans) {
        if (l.type === 'lent') lentBalance += l.currentBalance;
        else if (l.type === 'borrowed') borrowedBalance += l.currentBalance;
      }

      const net = lentBalance - borrowedBalance;

      return {
        ...p,
        lentBalance,
        borrowedBalance,
        net,
      };
    });
  }, [people, loans]);

  const filteredPeople = useMemo(() => {
    return peopleWithBalances.filter(p => {
      if (filterType === 'owed_to_me' && p.net <= 0) return false;
      if (filterType === 'i_owe' && p.net >= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.nickname || '').toLowerCase().includes(q) ||
          (p.phone || '').includes(q)
        );
      }
      return true;
    });
  }, [peopleWithBalances, filterType, searchQuery]);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPerson: Person = {
      id: crypto.randomUUID(),
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.people.put(newPerson);
    setIsAddPersonOpen(false);
    setName('');
    setNickname('');
    setPhone('');
    setEmail('');
    setNotes('');
  };

  return (
    <div className="space-y-5 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">People & Contacts</h2>
          <p className="text-xs text-zinc-400">
            {people.length} contacts with individual double-entry financial ledgers
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsAddPersonOpen(true)}
          icon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Add Person
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name, nickname, or phone number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({people.length})
          </button>
          <button
            onClick={() => setFilterType('owed_to_me')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'owed_to_me'
                ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Owes Me
          </button>
          <button
            onClick={() => setFilterType('i_owe')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              filterType === 'i_owe'
                ? 'bg-zinc-800 text-rose-400 font-semibold shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            I Owe
          </button>
        </div>
      </div>

      {/* People Grid */}
      {filteredPeople.length === 0 ? (
        <Card className="py-16 text-center text-zinc-500 space-y-3">
          <Users className="w-10 h-10 mx-auto text-zinc-600 stroke-1" />
          <p className="text-sm font-medium">No people found</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Add friends, family, or colleagues manually to track loans, shared bills, and individual ledgers.
          </p>
          <Button size="sm" variant="primary" onClick={() => setIsAddPersonOpen(true)}>
            Add New Person
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map(p => (
            <Card
              key={p.id}
              onClick={() => onSelectPerson(p.id)}
              className="hover:border-zinc-700 transition-all cursor-pointer space-y-3 p-4 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                    {p.name}
                  </h3>
                  {p.nickname && <p className="text-xs text-zinc-400">({p.nickname})</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  {onEditPerson && (
                    <button
                      type="button"
                      title="Edit contact name or details"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPerson(p);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-300">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Remaining Balance Status */}
              <div className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Amount Remaining:</span>
                <div className="text-right">
                  <MoneyDisplay
                    amount={Math.abs(p.net)}
                    hideBalances={hideBalances}
                    size="base"
                    colorVariant={p.net > 0 ? 'positive' : p.net < 0 ? 'negative' : 'neutral'}
                  />
                  <span className="block text-[10px] text-zinc-400 mt-0.5">
                    {p.net > 0 ? 'To be taken from contact' : p.net < 0 ? 'To be given to contact' : 'All settled up'}
                  </span>
                </div>
              </div>

              {/* Contact info snippets */}
              {(p.phone || p.email) && (
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                  {p.phone && (
                    <span className="flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 shrink-0" /> {p.phone}
                    </span>
                  )}
                  {p.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {p.email}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs text-zinc-400">
                <span>View Full Ledger</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Person Modal */}
      <Modal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        title="Add New Person"
        description="Add a contact manually without needing contacts permission."
        maxWidth="md"
      >
        <form onSubmit={handleCreatePerson} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Nickname (Optional)"
            placeholder="e.g. Rahul"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="rahul@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <Input
            label="Notes"
            placeholder="e.g. Flatmate, reliable, collegue"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddPersonOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Person
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
