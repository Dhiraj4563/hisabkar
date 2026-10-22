import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Users,
  HandCoins,
  Split,
  Wallet,
  PieChart,
  Repeat,
  BarChart3,
  Calendar,
  ArrowDownUp,
  Settings,
  Eye,
  EyeOff,
  ShieldCheck,
  Plus,
  User,
  Camera,
} from 'lucide-react';

export type NavItem =
  | 'dashboard'
  | 'transactions'
  | 'people'
  | 'lending'
  | 'groups'
  | 'accounts'
  | 'budgets'
  | 'recurring'
  | 'reports'
  | 'calendar'
  | 'import_export'
  | 'settings';

interface SidebarProps {
  currentNav: NavItem;
  onNavigate: (nav: NavItem) => void;
  hideBalances: boolean;
  onTogglePrivacy: () => void;
  onOpenAddModal: () => void;
  ownerName?: string;
  ownerProfileImage?: string;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onNavigate,
  hideBalances,
  onTogglePrivacy,
  onOpenAddModal,
  ownerName,
  ownerProfileImage,
  onOpenProfile,
}) => {
  const navItems: { id: NavItem; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Hisabrakh', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt className="w-4 h-4" /> },
    { id: 'people', label: 'People & Ledgers', icon: <Users className="w-4 h-4" /> },
    { id: 'lending', label: 'Lending & Debt', icon: <HandCoins className="w-4 h-4" /> },
    { id: 'groups', label: 'Group Expenses', icon: <Split className="w-4 h-4" /> },
    { id: 'accounts', label: 'Accounts & Wallets', icon: <Wallet className="w-4 h-4" /> },
    { id: 'budgets', label: 'Budgets & Goals', icon: <PieChart className="w-4 h-4" /> },
    { id: 'recurring', label: 'Recurring Rules', icon: <Repeat className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar & Dues', icon: <Calendar className="w-4 h-4" /> },
    { id: 'import_export', label: 'Backup & Restore', icon: <ArrowDownUp className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings & Security', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-zinc-950 border-r border-zinc-800/80 sticky top-0 shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-zinc-950 font-black text-lg">H</span>
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-zinc-100">Hisabrakh</h1>
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <div className="px-4 py-4">
        <button
          onClick={onOpenAddModal}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs tracking-wide shadow-md shadow-emerald-500/10 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = currentNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-zinc-800/90 text-emerald-400 font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
              }`}
            >
              <span className={isActive ? 'text-emerald-400' : 'text-zinc-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Utility Bar */}
      <div className="p-3 border-t border-zinc-800/80 space-y-2">
        {onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer text-left group"
          >
            {ownerProfileImage ? (
              <img
                src={ownerProfileImage}
                alt={ownerName || 'Profile'}
                className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                {ownerName ? ownerName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                {ownerName || 'User'}
              </p>
              <p className="text-[10px] text-zinc-400">Update Profile</p>
            </div>
            <Camera className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
          </button>
        )}

        <button
          onClick={onTogglePrivacy}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {hideBalances ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-zinc-400" />}
            <span>Privacy Mode</span>
          </span>
          <span className="text-[10px] text-zinc-400">{hideBalances ? 'Hidden' : 'Visible'}</span>
        </button>

        <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Device Encrypted</span>
          </span>
          <span>v1.0 Offline</span>
        </div>
      </div>
    </aside>
  );
};
