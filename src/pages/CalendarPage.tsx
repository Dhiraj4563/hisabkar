import React, { useState, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { Loan, Reminder, RecurringRule, Person } from '../types';
import { db } from '../db/database';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  HandCoins,
  Receipt,
} from 'lucide-react';

interface CalendarPageProps {
  loans: Loan[];
  reminders: Reminder[];
  recurringRules: RecurringRule[];
  people: Person[];
  hideBalances: boolean;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  loans,
  reminders,
  recurringRules,
  people,
  hideBalances,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Collect all events for this month:
  // 1. Loans with due dates
  // 2. Reminders
  // 3. Recurring rules next occurrence
  const monthEvents = useMemo(() => {
    const events: {
      dateStr: string; // YYYY-MM-DD
      day: number;
      title: string;
      amount?: number;
      currency?: string;
      type: 'receivable_due' | 'payable_due' | 'bill' | 'reminder';
      isOverdue: boolean;
      entityId?: string;
    }[] = [];

    const now = new Date();

    // Loans
    for (const l of loans) {
      if (l.currentBalance <= 0 || l.status === 'archived' || !l.dueDate) continue;
      const d = new Date(l.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const prsn = people.find(p => p.id === l.personId);
        events.push({
          dateStr: l.dueDate.substring(0, 10),
          day: d.getDate(),
          title: l.type === 'lent' ? `Collect from ${prsn?.name || 'Contact'}` : `Repay ${prsn?.name || 'Contact'}`,
          amount: l.currentBalance,
          currency: l.currency,
          type: l.type === 'lent' ? 'receivable_due' : 'payable_due',
          isOverdue: d < now,
          entityId: l.id,
        });
      }
    }

    // Reminders
    for (const rem of reminders) {
      if (rem.isCompleted || rem.isDismissed) continue;
      const d = new Date(rem.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        events.push({
          dateStr: rem.dueDate.substring(0, 10),
          day: d.getDate(),
          title: rem.title,
          amount: rem.amount,
          currency: rem.currency,
          type: 'reminder',
          isOverdue: d < now,
          entityId: rem.id,
        });
      }
    }

    // Recurring Rules
    for (const rec of recurringRules) {
      if (!rec.isActive) continue;
      const d = new Date(rec.nextOccurrence);
      if (d.getFullYear() === year && d.getMonth() === month) {
        events.push({
          dateStr: rec.nextOccurrence.substring(0, 10),
          day: d.getDate(),
          title: rec.title,
          amount: rec.amount,
          currency: rec.currency,
          type: 'bill',
          isOverdue: d < now,
          entityId: rec.id,
        });
      }
    }

    return events;
  }, [loans, reminders, recurringRules, people, year, month]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Calendar & Due Dates</h2>
          <p className="text-xs text-zinc-400">
            Keep track of debt deadlines, recurring bill dates, and incoming receivables
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={prevMonth} icon={<ChevronLeft className="w-4 h-4" />}>
            Prev
          </Button>
          <span className="text-xs font-semibold text-zinc-200 px-2 min-w-[120px] text-center">
            {monthLabel}
          </span>
          <Button size="sm" variant="outline" onClick={nextMonth} icon={<ChevronRight className="w-4 h-4" />} iconPosition="right">
            Next
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="p-4 space-y-4">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-zinc-400 text-xs py-2 border-b border-zinc-800">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 auto-rows-fr">
          {/* Empty prefix slots */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[80px] p-1.5 rounded-lg bg-zinc-950/20 opacity-30" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayEvents = monthEvents.filter(e => e.day === dayNum);
            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-[85px] p-2 rounded-xl border text-xs flex flex-col justify-between transition-colors ${
                  isToday
                    ? 'bg-zinc-900 border-emerald-500/60 shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-xs ${
                      isToday ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.some(e => e.isOverdue) && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>

                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev, eIdx) => (
                    <div
                      key={eIdx}
                      className={`px-1.5 py-0.5 rounded text-[10px] truncate leading-tight font-medium ${
                        ev.type === 'receivable_due'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : ev.type === 'payable_due'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-zinc-500 block">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Events List for this Month */}
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100">Scheduled Deadlines for {monthLabel}</h3>
        {monthEvents.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No deadlines or recurring bills scheduled for this month.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800 text-xs">
            {monthEvents.map((ev, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      ev.type === 'receivable_due'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : ev.type === 'payable_due'
                        ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}
                  >
                    {ev.type === 'receivable_due' || ev.type === 'payable_due' ? (
                      <HandCoins className="w-4 h-4" />
                    ) : (
                      <Receipt className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-200">{ev.title}</p>
                    <p className="text-zinc-500 text-[11px]">Due on {ev.dateStr}</p>
                  </div>
                </div>

                <div className="text-right">
                  {ev.amount && (
                    <MoneyDisplay
                      amount={ev.amount}
                      currency={ev.currency}
                      hideBalances={hideBalances}
                      size="base"
                      colorVariant={ev.type === 'receivable_due' ? 'positive' : 'negative'}
                    />
                  )}
                  {ev.isOverdue && (
                    <span className="block text-[10px] text-rose-400 font-medium">Overdue</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
