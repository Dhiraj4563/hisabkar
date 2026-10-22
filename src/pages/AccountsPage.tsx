import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { Account, AccountType, Transaction } from '../types';
import { db } from '../db/database';
import { postTransaction } from '../features/accounting/ledgerEngine';
import {
  Wallet,
  Building2,
  CreditCard,
  Plus,
  ArrowRightLeft,
  PiggyBank,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { toMinorUnits } from '../lib/money';

interface AccountsPageProps {
  accounts: Account[];
  transactions: Transaction[];
  hideBalances: boolean;
  onOpenTransferModal: () => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({
  accounts,
  transactions,
  hideBalances,
  onOpenTransferModal,
  onSelectTransaction,
}) => {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [openingBalanceStr, setOpeningBalanceStr] = useState('0');
  const [institution, setInstitution] = useState('');
  const [accountMask, setAccountMask] = useState('');

  // Total assets (non-credit cards) vs total liabilities (credit cards)
  const totalAssets = accounts
    .filter(a => a.type !== 'credit_card')
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const totalCCDebt = accounts
    .filter(a => a.type === 'credit_card')
    .reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const minorUnits = toMinorUnits(parseFloat(openingBalanceStr) || 0, 2);
    const nowStr = new Date().toISOString();

    const newAccount: Account = {
      id: `acc_${crypto.randomUUID()}`,
      name: name.trim(),
      type,
      currency: 'INR',
      openingBalance: minorUnits,
      currentBalance: minorUnits,
      institutionName: institution.trim() || undefined,
      accountNumberMask: accountMask.trim() ? `••• ${accountMask.trim()}` : undefined,
      isArchived: false,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    await db.accounts.put(newAccount);

    // If opening balance > 0, post an opening equity transaction into double-entry ledger
    if (minorUnits > 0 && type !== 'credit_card') {
      await postTransaction({
        type: 'income',
        amount: minorUnits,
        currency: 'INR',
        accountId: newAccount.id,
        description: `Opening Balance for ${newAccount.name}`,
        notes: 'Initial account balance equity setup',
      });
    }

    setIsAddAccountOpen(false);
    setName('');
    setOpeningBalanceStr('0');
    setInstitution('');
    setAccountMask('');
  };

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'cash':
        return <Wallet className="w-5 h-5 text-emerald-400" />;
      case 'bank':
        return <Building2 className="w-5 h-5 text-blue-400" />;
      case 'credit_card':
        return <CreditCard className="w-5 h-5 text-rose-400" />;
      case 'savings':
        return <PiggyBank className="w-5 h-5 text-purple-400" />;
      case 'digital_wallet':
        return <Smartphone className="w-5 h-5 text-amber-400" />;
      default:
        return <Wallet className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Accounts & Wallets</h2>
          <p className="text-xs text-zinc-400">
            Real cash, bank balances, digital wallets, and credit cards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenTransferModal}
            icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
          >
            Transfer Between Accounts
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddAccountOpen(true)}
            icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          >
            Add Account
          </Button>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-emerald-500/20">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            Total Cash & Bank Assets
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalAssets}
              hideBalances={hideBalances}
              size="2xl"
              colorVariant="positive"
            />
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Available liquid funds across all cash and bank accounts</p>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-rose-500/20">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            Total Credit Card Outstanding
          </span>
          <div className="mt-1">
            <MoneyDisplay
              amount={totalCCDebt}
              hideBalances={hideBalances}
              size="2xl"
              colorVariant="negative"
            />
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Revolving credit liability to be paid to card issuer
          </p>
        </Card>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => {
          const isCC = acc.type === 'credit_card';

          return (
            <Card key={acc.id} className="p-4 space-y-3 relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100 text-sm">{acc.name}</h3>
                    <p className="text-xs text-zinc-400 capitalize">
                      {acc.type.replace('_', ' ')} {acc.accountNumberMask ? `· ${acc.accountNumberMask}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400">{isCC ? 'Current Dues:' : 'Available Balance:'}</span>
                <MoneyDisplay
                  amount={acc.currentBalance}
                  currency={acc.currency}
                  hideBalances={hideBalances}
                  size="lg"
                  colorVariant={isCC ? 'negative' : 'positive'}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>{acc.institutionName || 'Self Managed'}</span>
                <span>Active</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        title="Add Financial Account"
        description="Add a bank account, cash wallet, digital wallet, or credit card."
        maxWidth="md"
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <Input
            label="Account Name *"
            placeholder="e.g. HDFC Salary A/C, Cash in Hand, ICICI Amazon CC"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Account Type *"
            value={type}
            onChange={e => setType(e.target.value as AccountType)}
            options={[
              { value: 'bank', label: 'Bank Account' },
              { value: 'cash', label: 'Cash in Hand / Wallet' },
              { value: 'digital_wallet', label: 'Digital Wallet (Paytm, Apple Pay)' },
              { value: 'credit_card', label: 'Credit Card (Liability)' },
              { value: 'savings', label: 'Savings & Fixed Deposit' },
              { value: 'other', label: 'Other Custom Account' },
            ]}
          />

          <Input
            label="Opening Balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={openingBalanceStr}
            onChange={e => setOpeningBalanceStr(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Institution Name"
              placeholder="e.g. HDFC, Chase, SBI"
              value={institution}
              onChange={e => setInstitution(e.target.value)}
            />
            <Input
              label="Last 4 Digits Mask"
              placeholder="e.g. 4892"
              maxLength={4}
              value={accountMask}
              onChange={e => setAccountMask(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddAccountOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
