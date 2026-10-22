import React from 'react';
import { LayoutDashboard, Receipt, Plus, Users, Split } from 'lucide-react';
import { NavItem } from './Sidebar';

interface BottomNavProps {
  currentNav: NavItem;
  onNavigate: (nav: NavItem) => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentNav,
  onNavigate,
  onOpenAddModal,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-2 py-1.5 pb-safe">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {/* 1. Hisabrakh (Home) */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors cursor-pointer ${
            currentNav === 'dashboard' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Hisabrakh</span>
        </button>

        {/* 2. History (Transactions) */}
        <button
          onClick={() => onNavigate('transactions')}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors cursor-pointer ${
            currentNav === 'transactions' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px]">History</span>
        </button>

        {/* 3. Center Floating Action Button (100% Symmetrical Dead-Center) */}
        <div className="flex items-center justify-center -mt-5">
          <button
            onClick={onOpenAddModal}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform cursor-pointer"
            aria-label="Add transaction"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. People (Ledgers) */}
        <button
          onClick={() => onNavigate('people')}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors cursor-pointer ${
            currentNav === 'people' || currentNav === 'lending' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">People</span>
        </button>

        {/* 5. Groups (Splits) */}
        <button
          onClick={() => onNavigate('groups')}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors cursor-pointer ${
            currentNav === 'groups' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Split className="w-5 h-5" />
          <span className="text-[10px]">Groups</span>
        </button>
      </div>
    </div>
  );
};
