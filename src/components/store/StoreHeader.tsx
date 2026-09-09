import React from 'react';
import { ShoppingBag, Shield, Search, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

interface StoreHeaderProps {
  onOpenAdmin: () => void;
  searchTerm: string;
  onSearchChange: (q: string) => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  onOpenAdmin,
  searchTerm,
  onSearchChange
}) => {
  const { itemCount, setIsCartOpen } = useCart();
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-extrabold text-black font-['Outfit'] text-2xl shadow-lg shadow-amber-500/20">
            11
          </div>
          <div>
            <span className="font-['Outfit'] font-black tracking-wider text-lg sm:text-xl text-white block leading-none">
              ELEVEN NATION
            </span>
            <span className="text-[10px] tracking-widest text-amber-400 font-semibold uppercase">
              Football Jersey House
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search club, kit, or national team (e.g. Madrid, Arsenal)..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Admin Portal Gateway */}
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Open Admin Dashboard"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin Portal</span>
          </button>

          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-500/10"
            title="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5 font-bold" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border-2 border-amber-400 text-white font-bold text-[10px] flex items-center justify-center font-mono">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
