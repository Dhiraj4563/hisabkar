import React from 'react';
import { DateFilterType } from '../../hooks/useFinancialData';
import { Search, Eye, EyeOff, Plus, User, Camera } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  dateFilter: DateFilterType;
  onDateFilterChange: (filter: DateFilterType) => void;
  hideBalances: boolean;
  onTogglePrivacy: () => void;
  onOpenSearch: () => void;
  onOpenAddModal: () => void;
  showDateFilter?: boolean;
  ownerName?: string;
  ownerProfileImage?: string;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  dateFilter,
  onDateFilterChange,
  hideBalances,
  onTogglePrivacy,
  onOpenSearch,
  onOpenAddModal,
  showDateFilter = true,
  ownerName,
  ownerProfileImage,
  onOpenProfile,
}) => {
  const filterOptions: { id: DateFilterType; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_year', label: 'This Year' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-8 py-3 flex flex-row items-center justify-between gap-2 sm:gap-4 min-w-0">
      {/* Title & profile icon on the left */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
        {onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            title="Click to change profile picture"
            aria-label="Change profile picture"
            className="relative group p-0.5 rounded-full ring-2 ring-emerald-500/40 hover:ring-emerald-400 transition-all cursor-pointer shrink-0 focus:outline-none"
          >
            {ownerProfileImage ? (
              <img
                src={ownerProfileImage}
                alt={ownerName || 'User'}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-zinc-800 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm">
                {ownerName ? ownerName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 border border-zinc-950 flex items-center justify-center text-zinc-950 shadow-xs">
              <Camera className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[2.5]" />
            </span>
          </button>
        )}

        <div className="min-w-0">
          <h2 className="text-base sm:text-xl font-bold tracking-tight text-zinc-100 truncate">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Action controls on the right side */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
        {/* Date Filter Segmented Control (if applicable) */}
        {showDateFilter && (
          <div className="hidden sm:flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs overflow-x-auto scrollbar-none">
            {filterOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => onDateFilterChange(opt.id)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  dateFilter === opt.id
                    ? 'bg-zinc-800 text-emerald-400 font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer shrink-0"
          title="Search transactions, people, groups (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden lg:inline text-[10px] bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 rounded text-zinc-400">
            ⌘K
          </kbd>
        </button>

        {/* Privacy toggle */}
        <button
          onClick={onTogglePrivacy}
          className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer shrink-0"
          title={hideBalances ? 'Show Balances' : 'Hide Balances (Privacy)'}
          aria-label="Toggle privacy masking"
        >
          {hideBalances ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Quick Add Button */}
        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
          onClick={onOpenAddModal}
        >
          <span className="hidden xs:inline">Add</span>
        </Button>
      </div>
    </header>
  );
};
