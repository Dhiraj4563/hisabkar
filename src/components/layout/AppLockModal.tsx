import React, { useState } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface AppLockModalProps {
  isLocked: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
}

export const AppLockModal: React.FC<AppLockModalProps> = ({ isLocked, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isLocked) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleVerify = async () => {
    if (!pin) return;
    setIsVerifying(true);
    setError(false);
    const success = await onUnlock(pin);
    if (!success) {
      setError(true);
      setPin('');
    }
    setIsVerifying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 p-4 select-none">
      <div className="w-full max-w-xs flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xl">
          <Lock className="w-8 h-8 text-emerald-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-zinc-100">HisabMate Locked</h2>
          <p className="text-xs text-zinc-400 mt-1">Enter your device PIN to unlock</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                pin.length > i
                  ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                  : 'border border-zinc-700 bg-zinc-900'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Incorrect PIN. Try again.</span>
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-lg font-semibold text-zinc-100 active:scale-95 transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-14 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-xs font-medium text-zinc-400 active:scale-95 transition-all cursor-pointer"
          >
            Del
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-lg font-semibold text-zinc-100 active:scale-95 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleVerify}
            disabled={pin.length === 0 || isVerifying}
            className="h-14 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            <Unlock className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
