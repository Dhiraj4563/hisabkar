import React, { useState, useEffect } from 'react';
import { Search, Receipt, User, Split, Wallet, X } from 'lucide-react';
import { Transaction, Person, Group, Account } from '../../types';
import { MoneyDisplay } from '../common/MoneyDisplay';
import { NavItem } from './Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  people: Person[];
  groups: Group[];
  accounts: Account[];
  onSelectResult: (nav: NavItem, entityId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  transactions,
  people,
  groups,
  accounts,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedTransactions = q
    ? transactions
        .filter(
          t =>
            (t.description || '').toLowerCase().includes(q) ||
            (t.notes || '').toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q)
        )
        .slice(0, 5)
    : [];

  const matchedPeople = q
    ? people
        .filter(
          p =>
            p.name.toLowerCase().includes(q) ||
            (p.nickname || '').toLowerCase().includes(q) ||
            (p.phone || '').includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedGroups = q
    ? groups.filter(g => g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)).slice(0, 3)
    : [];

  const matchedAccounts = q
    ? accounts.filter(a => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const hasResults =
    matchedTransactions.length > 0 ||
    matchedPeople.length > 0 ||
    matchedGroups.length > 0 ||
    matchedAccounts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search transactions, friends, groups, accounts..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-300 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          {!q && (
            <div className="py-8 text-center text-zinc-500">
              Type to search any transaction, person, group or account
            </div>
          )}

          {q && !hasResults && (
            <div className="py-8 text-center text-zinc-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {matchedPeople.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                People
              </p>
              {matchedPeople.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectResult('people', p.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-medium text-zinc-200">{p.name}</p>
                      {p.nickname && <p className="text-[10px] text-zinc-400">({p.nickname})</p>}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400">View Ledger →</span>
                </button>
              ))}
            </div>
          )}

          {matchedGroups.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                Groups
              </p>
              {matchedGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    onSelectResult('groups', g.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Split className="w-4 h-4 text-indigo-400" />
                    <p className="font-medium text-zinc-200">{g.name}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400">View Splits →</span>
                </button>
              ))}
            </div>
          )}

          {matchedAccounts.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                Accounts
              </p>
              {matchedAccounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => {
                    onSelectResult('accounts', a.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <p className="font-medium text-zinc-200">{a.name}</p>
                  </div>
                  <MoneyDisplay amount={a.currentBalance} currency={a.currency} size="sm" />
                </button>
              ))}
            </div>
          )}

          {matchedTransactions.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                Transactions
              </p>
              {matchedTransactions.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectResult('transactions', t.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/80 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Receipt className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-200">{t.description}</p>
                      <p className="text-[10px] text-zinc-400">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <MoneyDisplay amount={t.amount} currency={t.currency} size="sm" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
