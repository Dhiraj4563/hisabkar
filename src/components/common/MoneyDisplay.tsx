import React from 'react';
import { formatMoney } from '../../lib/money';
import { CurrencyCode } from '../../types';

interface MoneyDisplayProps {
  amount: number; // in minor units
  currency?: CurrencyCode;
  hideBalances?: boolean;
  showSign?: boolean;
  colorVariant?: 'auto' | 'positive' | 'negative' | 'neutral' | 'muted';
  className?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount = 0,
  currency = 'INR',
  hideBalances = false,
  showSign = false,
  colorVariant = 'auto',
  className = '',
  size = 'base',
}) => {
  const formatted = formatMoney(amount, currency, {
    hideBalances,
    showSign,
  });

  let colorClass = 'text-zinc-100';

  if (colorVariant === 'positive' || (colorVariant === 'auto' && amount > 0)) {
    colorClass = 'text-emerald-400';
  } else if (colorVariant === 'negative' || (colorVariant === 'auto' && amount < 0)) {
    colorClass = 'text-rose-400';
  } else if (colorVariant === 'muted') {
    colorClass = 'text-zinc-400';
  } else if (colorVariant === 'neutral') {
    colorClass = 'text-zinc-200';
  }

  const sizeClasses: Record<string, string> = {
    sm: 'text-xs font-medium',
    base: 'text-sm font-semibold',
    lg: 'text-base font-semibold',
    xl: 'text-lg font-bold tracking-tight',
    '2xl': 'text-2xl font-bold tracking-tight',
    '3xl': 'text-3xl font-extrabold tracking-tight',
  };

  return (
    <span className={`inline-flex items-baseline tabular-nums ${sizeClasses[size] || ''} ${colorClass} ${className}`}>
      {formatted}
    </span>
  );
};
