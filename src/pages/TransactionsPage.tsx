import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { exportTransactionsToCSV } from '../services/backupService';
import {
  Transaction,
  Account,
  Category,
  Person,
  TransactionType,
} from '../types';
import {
  Search,
  Download,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Split,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
} from 'lucide-react';

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  people: Person[];
  hideBalances: boolean;
  onOpenAddModal: () => void;
  onSelectTransaction: (tx: Transaction) => void;
  onEditTransaction?: (tx: Transaction) => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  accounts,
  categories,
  people,
  hideBalances,
  onOpenAddModal,
  onSelectTransaction,
  onEditTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (selectedType !== 'all' && t.type !== selectedType) return false;
      if (selectedAccountId !== 'all' && t.accountId !== selectedAccountId && t.toAccountId !== selectedAccountId)
        return false;
      if (selectedCategoryId !== 'all' && t.categoryId !== selectedCategoryId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesNotes = (t.notes || '').toLowerCase().includes(q);
        const prsn = people.find(p => p.id === t.personId);
        const matchesPerson = prsn ? prsn.name.toLowerCase().includes(q) : false;
        if (!matchesDesc && !matchesNotes && !matchesPerson) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });
  }, [transactions, selectedType, selectedAccountId, selectedCategoryId, searchQuery, sortBy, people]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedTransactions = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const csvContent = exportTransactionsToCSV(filtered);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HisabMate_Transactions_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-20 lg:pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Transaction History</h2>
          <p className="text-xs text-zinc-400">
            {filtered.length} total entries recorded in double-entry ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenAddModal}
            icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search description, notes, friend..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Search className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Type Filter */}
          <Select
            value={selectedType}
            onChange={e => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'income', label: 'Income' },
              { value: 'personal_expense', label: 'Personal Expense' },
              { value: 'money_lent', label: 'Money Lent' },
              { value: 'money_borrowed', label: 'Money Borrowed' },
              { value: 'loan_repayment_received', label: 'Repayment Received' },
              { value: 'loan_repayment_made', label: 'Repayment Made' },
              { value: 'account_transfer', label: 'Account Transfer' },
              { value: 'group_expense', label: 'Group Expense' },
              { value: 'group_settlement', label: 'Group Settlement' },
            ]}
          />

          {/* Account Filter */}
          <Select
            value={selectedAccountId}
            onChange={e => {
              setSelectedAccountId(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Accounts' },
              ...accounts.map(a => ({ value: a.id, label: a.name })),
            ]}
          />

          {/* Sort By */}
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            options={[
              { value: 'date_desc', label: 'Date: Newest First' },
              { value: 'date_asc', label: 'Date: Oldest First' },
              { value: 'amount_desc', label: 'Amount: Highest' },
              { value: 'amount_asc', label: 'Amount: Lowest' },
            ]}
          />
        </div>
      </Card>

      {/* Transactions Table / List */}
      <Card className="p-0 overflow-hidden">
        {paginatedTransactions.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Filter className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm font-medium">No transactions match your filters</p>
            <p className="text-xs text-zinc-400 mt-1">Try resetting search filters or record a new transaction.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {paginatedTransactions.map(tx => {
              const acc = accounts.find(a => a.id === tx.accountId);
              const toAcc = tx.toAccountId ? accounts.find(a => a.id === tx.toAccountId) : undefined;
              const cat = categories.find(c => c.id === tx.categoryId);
              const prsn = people.find(p => p.id === tx.personId);

              const isIncome = tx.type === 'income' || tx.type === 'loan_repayment_received';
              const isExpense = tx.type === 'personal_expense' || tx.type === 'group_expense';

              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isExpense
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {tx.type === 'money_lent' || tx.type === 'money_borrowed' ? (
                        <HandCoins className="w-4 h-4" />
                      ) : tx.type === 'group_expense' ? (
                        <Split className="w-4 h-4" />
                      ) : isIncome ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-100 text-sm">
                          {tx.description || 'Transaction'}
                        </p>
                        {tx.status === 'voided' && (
                          <span className="text-[10px] text-rose-400 font-medium">Voided</span>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-zinc-400 text-xs mt-0.5">
                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>{acc?.name || 'Account'} {toAcc ? `→ ${toAcc.name}` : ''}</span>
                        {cat && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{cat.name}</span>
                          </>
                        )}
                        {prsn && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{prsn.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <MoneyDisplay
                        amount={tx.amount}
                        currency={tx.currency}
                        hideBalances={hideBalances}
                        showSign={isIncome}
                        colorVariant={isIncome ? 'positive' : isExpense ? 'negative' : 'neutral'}
                        size="lg"
                      />
                      <span className="block text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mt-0.5">
                        {tx.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {onEditTransaction && tx.status !== 'voided' && (
                      <button
                        type="button"
                        title="Edit transaction"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTransaction(tx);
                        }}
                        className="p-2 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 border border-transparent hover:border-zinc-700/80 cursor-pointer transition-colors shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 border-t border-zinc-800 text-xs text-zinc-400">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Prev
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                icon={<ChevronRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
