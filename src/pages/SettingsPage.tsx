import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { AppSettings, Currency } from '../types';
import { db } from '../db/database';
import { clearAllFinancialData } from '../db/seed';
import {
  Settings,
  Lock,
  Unlock,
  Coins,
  Database,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  User,
  Camera,
} from 'lucide-react';

interface SettingsPageProps {
  settings?: AppSettings;
  currencies: Currency[];
  onEnableLock: (pin: string, autoLockMinutes?: number) => Promise<void>;
  onDisableLock: (pin: string) => Promise<boolean>;
  onDataReset: () => void;
  onOpenProfile?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  currencies,
  onEnableLock,
  onDisableLock,
  onDataReset,
  onOpenProfile,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [autoLockMin, setAutoLockMin] = useState(settings?.autoLockMinutes || 5);
  const [isSettingLock, setIsSettingLock] = useState(false);
  const [isRemovingLock, setIsRemovingLock] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggleLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      alert('PIN must be at least 4 digits');
      return;
    }

    if (settings?.appLockEnabled) {
      // Disabling lock
      setIsRemovingLock(true);
      const success = await onDisableLock(pinInput);
      if (success) {
        setMessage('App lock removed successfully.');
        setPinInput('');
      } else {
        alert('Incorrect existing PIN.');
      }
      setIsRemovingLock(false);
    } else {
      // Enabling lock
      setIsSettingLock(true);
      await onEnableLock(pinInput, autoLockMin);
      setMessage('App lock enabled! The app will prompt for PIN after inactivity.');
      setPinInput('');
      setIsSettingLock(false);
    }
  };

  const handleConfirmClear = async () => {
    try {
      setIsClearing(true);
      await clearAllFinancialData();
      setShowClearConfirm(false);
      setMessage('All financial records have been wiped clean.');
      onDataReset();
    } catch (err: any) {
      alert(err.message || 'Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleCurrencyChange = async (code: string) => {
    if (!settings) return;
    await db.settings.put({
      ...settings,
      defaultCurrency: code,
    });
    setMessage(`Default reporting currency updated to ${code}.`);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-zinc-100">Settings & Security</h2>
        <p className="text-xs text-zinc-400">
          Device PIN lock, multi-currency defaults, and local data management
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* User Profile & Image */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            {settings?.ownerProfileImage ? (
              <img
                src={settings.ownerProfileImage}
                alt={settings.ownerName || 'User'}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-zinc-950 font-bold text-lg flex items-center justify-center shadow-md">
                {settings?.ownerName ? settings.ownerName.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {settings?.ownerName || 'Hisabrakh User'}
            </h3>
            <p className="text-xs text-zinc-400">Personalize your avatar and profile photo</p>
          </div>
        </div>

        {onOpenProfile && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenProfile}
            icon={<Camera className="w-3.5 h-3.5" />}
          >
            Update Profile Image
          </Button>
        )}
      </Card>

      {/* 1. App Lock & Inactivity PIN */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Device PIN Lock & Auto-Lock</h3>
            <p className="text-xs text-zinc-400">
              Locks the application after inactivity using device-local SHA-256 salted PIN hash
            </p>
          </div>
        </div>

        <form onSubmit={handleToggleLock} className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="password"
              label={settings?.appLockEnabled ? 'Current PIN to Disable' : 'Set 4-6 Digit PIN'}
              placeholder="••••"
              maxLength={6}
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              required
            />

            {!settings?.appLockEnabled && (
              <Select
                label="Auto-Lock Timer"
                value={autoLockMin.toString()}
                onChange={e => setAutoLockMin(parseInt(e.target.value))}
                options={[
                  { value: '1', label: 'After 1 Minute Inactivity' },
                  { value: '5', label: 'After 5 Minutes (Default)' },
                  { value: '15', label: 'After 15 Minutes' },
                  { value: '0', label: 'Never (Lock only on restart)' },
                ]}
              />
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant={settings?.appLockEnabled ? 'danger' : 'primary'}
              isLoading={isSettingLock || isRemovingLock}
              icon={settings?.appLockEnabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            >
              {settings?.appLockEnabled ? 'Disable PIN Lock' : 'Enable Device Lock'}
            </Button>
          </div>
        </form>
      </Card>

      {/* 2. Default Reporting Currency */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Default Currency</h3>
            <p className="text-xs text-zinc-400">
              Used as primary reporting currency for balances and financial summaries
            </p>
          </div>
        </div>

        <div className="max-w-xs">
          <Select
            value={settings?.defaultCurrency || 'INR'}
            onChange={e => handleCurrencyChange(e.target.value)}
            options={currencies.map(c => ({
              value: c.code,
              label: `${c.name} (${c.symbol})`,
            }))}
          />
        </div>
      </Card>

      {/* 3. Danger Zone: Wipe All Records */}
      <Card className="p-5 space-y-4 border-rose-500/20 bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-rose-200">Reset All Local Financial Data</h3>
            <p className="text-xs text-rose-300/70">
              Irreversible: permanently removes all transactions, people, loans, and accounts from IndexedDB
            </p>
          </div>
        </div>

        <Button
          variant="danger"
          onClick={() => setShowClearConfirm(true)}
          icon={<Trash2 className="w-4 h-4" />}
        >
          Wipe Local Database
        </Button>
      </Card>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Double Confirmation: Wipe Database"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Are you completely sure you want to delete all financial ledgers, accounts, groups, and transactions?
              This operation cannot be reversed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isClearing} onClick={handleConfirmClear}>
              Yes, Delete All Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
