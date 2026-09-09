import React, { useState, useEffect } from 'react';
import { Menu, Plus, Database, Clock, Shield, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { UserRole } from '../../types';

interface AdminHeaderProps {
  onOpenSidebar: () => void;
  onOpenAddProduct: () => void;
  onOpenCustomOrder: () => void;
  onRefreshData?: () => Promise<void> | void;
  isRefreshing?: boolean;
  onSwitchToStore?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onOpenSidebar,
  onOpenAddProduct,
  onOpenCustomOrder,
  onRefreshData,
  isRefreshing = false,
  onSwitchToStore
}) => {
  const { role, isSuperAdmin, signOut } = useAuth();
  const [dhakaTime, setDhakaTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      try {
        const str = new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        setDhakaTime(str);
      } catch {
        setDhakaTime(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Dhaka: <strong className="text-zinc-200 font-mono">{dhakaTime}</strong> (GMT+6)</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Supabase status badge */}
        <div
          title={
            isSupabaseConfigured
              ? 'Connected to real Supabase database'
              : 'Supabase credentials missing. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings.'
          }
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium ${
            isSupabaseConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {isSupabaseConfigured ? 'Supabase Live' : 'Supabase Disconnected'}
          </span>
        </div>

        {/* Read-only Verified Security Role Badge */}
        <div
          title={`Authenticated with verified ${role} permissions`}
          className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs"
        >
          <Shield className={`w-3.5 h-3.5 ${isSuperAdmin ? 'text-amber-400' : 'text-sky-400'}`} />
          <span className="font-semibold text-zinc-300">
            {role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Customer'}
          </span>
        </div>

        {/* Refresh Data button */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Fetch latest data from Supabase"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}

        {/* Quick actions */}
        <button
          onClick={onOpenCustomOrder}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Custom Order</span>
        </button>

        <button
          onClick={onOpenAddProduct}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Product</span>
        </button>

        {/* Sign Out of Admin Area */}
        <button
          onClick={async () => {
            await signOut();
            onSwitchToStore?.();
          }}
          title="Sign out and return to storefront"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-rose-300 bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-900/50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
