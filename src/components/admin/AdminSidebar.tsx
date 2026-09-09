import React from 'react';
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  ShoppingBag,
  PlusCircle,
  Users,
  Boxes,
  BarChart3,
  Settings,
  ShieldCheck,
  Store,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type AdminTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'custom-orders'
  | 'customers'
  | 'inventory'
  | 'analytics'
  | 'settings'
  | 'audit';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onSwitchToStore: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  onSwitchToStore
}) => {
  const { profile, role, isSuperAdmin, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'products' as AdminTab, label: 'Products', icon: <Shirt className="w-4 h-4" /> },
    { id: 'categories' as AdminTab, label: 'Categories', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'orders' as AdminTab, label: 'Orders', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'custom-orders' as AdminTab, label: 'Custom Orders', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'inventory' as AdminTab, label: 'Inventory', icon: <Boxes className="w-4 h-4" /> },
    { id: 'customers' as AdminTab, label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings' as AdminTab, label: 'Store Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'audit' as AdminTab, label: 'Audit Logs', icon: <ShieldCheck className="w-4 h-4" /> }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-extrabold text-black font-['Outfit'] text-xl shadow-md">
              11
            </div>
            <div>
              <span className="font-['Outfit'] font-black tracking-wider text-base text-white block leading-none">
                ELEVEN NATION
              </span>
              <span className="text-[10px] tracking-widest text-amber-400 font-semibold uppercase">
                Admin Console
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-zinc-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Management
          </div>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-400 text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <span className={isActive ? 'text-black' : 'text-zinc-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Front Store
          </div>
          <button
            onClick={onSwitchToStore}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20 transition-all cursor-pointer"
          >
            <Store className="w-4 h-4 text-amber-400" />
            <span>Customer Website</span>
          </button>
        </div>

        {/* User Profile & Sign Out footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950">
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-zinc-800 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 border border-zinc-700">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {profile?.full_name || 'Admin'}
                </p>
                <span
                  className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                    isSuperAdmin
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {role}
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                onSwitchToStore();
              }}
              title="Sign Out of Admin"
              className="text-zinc-400 hover:text-rose-400 p-1.5 rounded transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
