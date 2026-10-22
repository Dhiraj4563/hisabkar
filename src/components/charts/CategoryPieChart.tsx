import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatMoney, fromMinorUnits } from '../../lib/money';
import { CurrencyCode } from '../../types';

interface CategoryPieChartProps {
  categories: {
    name: string;
    amount: number; // minor units
    color: string;
  }[];
  currency?: CurrencyCode;
  hideBalances?: boolean;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  currency = 'INR',
  hideBalances = false,
}) => {
  const totalAmount = categories.reduce((sum, c) => sum + c.amount, 0);

  if (hideBalances) {
    return (
      <div className="h-64 flex items-center justify-center border border-zinc-800 rounded-xl bg-zinc-950/40 text-zinc-500 text-sm">
        Chart hidden in Privacy Mode
      </div>
    );
  }

  if (categories.length === 0 || totalAmount === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-zinc-800/80 rounded-xl bg-zinc-950/20 text-zinc-500 text-sm">
        <p>No expense data in this period</p>
      </div>
    );
  }

  const chartData = categories.map(c => ({
    name: c.name,
    value: fromMinorUnits(c.amount, 2),
    rawAmount: c.amount,
    color: c.color,
    percentage: totalAmount > 0 ? ((c.amount / totalAmount) * 100).toFixed(1) : '0',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-zinc-100">{data.name}</p>
          <p className="text-zinc-300 font-medium">{formatMoney(data.rawAmount, currency)}</p>
          <p className="text-zinc-400">{data.percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="w-full sm:w-1/2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#18181b" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full sm:w-1/2 space-y-2 max-h-56 overflow-y-auto pr-1">
        {chartData.slice(0, 6).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-zinc-300 truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-medium text-zinc-200">{formatMoney(item.rawAmount, currency)}</span>
              <span className="text-zinc-500 w-9 text-right">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
