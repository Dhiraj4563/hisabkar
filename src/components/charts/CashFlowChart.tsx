import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fromMinorUnits, formatMoney } from '../../lib/money';
import { CurrencyCode } from '../../types';

interface CashFlowChartProps {
  data: {
    label: string;
    income: number; // minor units
    expense: number; // minor units
    net: number;
  }[];
  currency?: CurrencyCode;
  hideBalances?: boolean;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({
  data,
  currency = 'INR',
  hideBalances = false,
}) => {
  const chartData = data.map(d => ({
    label: d.label,
    Income: fromMinorUnits(d.income, 2),
    Expenses: fromMinorUnits(d.expense, 2),
  }));

  if (hideBalances) {
    return (
      <div className="h-64 flex items-center justify-center border border-zinc-800 rounded-xl bg-zinc-950/40 text-zinc-500 text-sm">
        Chart hidden in Privacy Mode
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-zinc-200">{label}</p>
          <p className="text-emerald-400">
            Income: {formatMoney(payload[0]?.value * 100, currency)}
          </p>
          <p className="text-rose-400">
            Expenses: {formatMoney(payload[1]?.value * 100, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
          />
          <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
