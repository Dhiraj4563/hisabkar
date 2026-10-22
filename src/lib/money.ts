import { Currency, CurrencyCode } from '../types';

export const DEFAULT_CURRENCIES: Record<CurrencyCode, Currency> = {
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    precision: 2,
    rateToDefault: 1.0,
    isDefault: true,
  },
  NPR: {
    code: 'NPR',
    name: 'Nepalese Rupee',
    symbol: 'रू',
    precision: 2,
    rateToDefault: 1.6, // 1 INR ~ 1.6 NPR
    isDefault: false,
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    precision: 2,
    rateToDefault: 0.012,
    isDefault: false,
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    precision: 2,
    rateToDefault: 0.011,
    isDefault: false,
  },
  GBP: {
    code: 'British Pound',
    name: 'British Pound',
    symbol: '£',
    precision: 2,
    rateToDefault: 0.0094,
    isDefault: false,
  },
};

/**
 * Converts decimal amount string or number to integer minor units (e.g. $10.50 -> 1050 cents)
 */
export function toMinorUnits(amount: number | string, precision: number = 2): number {
  if (typeof amount === 'string') {
    amount = parseFloat(amount) || 0;
  }
  const multiplier = Math.pow(10, precision);
  return Math.round(amount * multiplier);
}

/**
 * Converts integer minor units back to standard float (e.g. 1050 cents -> 10.5)
 */
export function fromMinorUnits(minorUnits: number, precision: number = 2): number {
  const divisor = Math.pow(10, precision);
  return (minorUnits || 0) / divisor;
}

/**
 * Formats minor units into an attractive formatted string.
 * Supports privacy masking (`••••`).
 */
export function formatMoney(
  minorUnits: number = 0,
  currencyCode: CurrencyCode = 'INR',
  options?: {
    hideBalances?: boolean;
    showSign?: boolean;
    precision?: number;
    customCurrencies?: Record<string, Currency>;
  }
): string {
  if (options?.hideBalances) {
    return '••••••';
  }

  const currencies = { ...DEFAULT_CURRENCIES, ...(options?.customCurrencies || {}) };
  const curr = currencies[currencyCode] || {
    code: currencyCode,
    symbol: currencyCode,
    precision: options?.precision ?? 2,
  };

  const precision = options?.precision ?? curr.precision;
  const isNegative = minorUnits < 0;
  const absUnits = Math.abs(minorUnits);
  const major = fromMinorUnits(absUnits, precision);

  let formattedNumber = major.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  if (currencyCode === 'USD' || currencyCode === 'EUR' || currencyCode === 'GBP') {
    formattedNumber = major.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }

  const sign = isNegative ? '-' : options?.showSign && minorUnits > 0 ? '+' : '';
  return `${sign}${curr.symbol}${formattedNumber}`;
}

/**
 * Deterministically splits an integer total amount into N equal shares.
 * Any remainder pennies/paise are distributed 1 unit to the first remainder recipients,
 * ensuring that sum(shares) === totalAmount ALWAYS.
 */
export function distributeEqualSplit(
  totalMinorUnits: number,
  participants: string[]
): { personId: string; amount: number }[] {
  if (!participants.length) return [];
  if (participants.length === 1) {
    return [{ personId: participants[0], amount: totalMinorUnits }];
  }

  const count = participants.length;
  const baseShare = Math.floor(totalMinorUnits / count);
  const remainder = totalMinorUnits - baseShare * count;

  return participants.map((personId, index) => ({
    personId,
    amount: baseShare + (index < remainder ? 1 : 0),
  }));
}

/**
 * Splits an integer amount by percentage weights deterministically.
 */
export function distributePercentageSplit(
  totalMinorUnits: number,
  splits: { personId: string; percentage: number }[]
): { personId: string; amount: number }[] {
  if (!splits.length) return [];

  let allocated = 0;
  const result: { personId: string; amount: number }[] = [];

  for (let i = 0; i < splits.length; i++) {
    const s = splits[i];
    if (i === splits.length - 1) {
      // Last participant gets the exact remainder to eliminate any rounding mismatch
      result.push({ personId: s.personId, amount: totalMinorUnits - allocated });
    } else {
      const share = Math.round((totalMinorUnits * s.percentage) / 100);
      result.push({ personId: s.personId, amount: share });
      allocated += share;
    }
  }

  return result;
}

/**
 * Splits an integer amount by weighted shares deterministically.
 */
export function distributeSharesSplit(
  totalMinorUnits: number,
  splits: { personId: string; shares: number }[]
): { personId: string; amount: number }[] {
  if (!splits.length) return [];
  const totalShares = splits.reduce((sum, s) => sum + Math.max(0, s.shares), 0);
  if (totalShares <= 0) return distributeEqualSplit(totalMinorUnits, splits.map(s => s.personId));

  let allocated = 0;
  const result: { personId: string; amount: number }[] = [];

  for (let i = 0; i < splits.length; i++) {
    const s = splits[i];
    if (i === splits.length - 1) {
      result.push({ personId: s.personId, amount: totalMinorUnits - allocated });
    } else {
      const share = Math.round((totalMinorUnits * s.shares) / totalShares);
      result.push({ personId: s.personId, amount: share });
      allocated += share;
    }
  }

  return result;
}
