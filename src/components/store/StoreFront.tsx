import React, { useState, useMemo } from 'react';
import { Product, Category, Order } from '../../types';
import { StoreHeader } from './StoreHeader';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { CartDrawer } from './CartDrawer';
import { CheckoutModal } from './CheckoutModal';
import { formatBDT } from '../../lib/utils';
import {
  ShieldCheck,
  Truck,
  Scissors,
  CheckCircle2,
  Sparkles,
  Flame,
  ArrowRight,
  Shield
} from 'lucide-react';

interface StoreFrontProps {
  products: Product[];
  categories: Category[];
  onOpenAdmin: () => void;
}

export const StoreFront: React.FC<StoreFrontProps> = ({
  products,
  categories,
  onOpenAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEdition, setSelectedEdition] = useState<string>('all');

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Filter products: active only for customers!
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.status === 'active');
  }, [products]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.club && p.club.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || p.category_id === selectedCategory;

      const matchEdition =
        selectedEdition === 'all' || p.edition === selectedEdition;

      return matchSearch && matchCategory && matchEdition;
    });
  }, [activeProducts, searchTerm, selectedCategory, selectedEdition]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-black py-1.5 px-4 text-center text-xs font-bold font-['Outfit'] tracking-wide">
        🔥 2024/25 EUROPEAN NEW SEASON JERSEYS NOW IN STOCK • CASH ON DELIVERY ACROSS BANGLADESH
      </div>

      {/* Header */}
      <StoreHeader
        onOpenAdmin={onOpenAdmin}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-zinc-800/80 py-12 sm:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950/0 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold tracking-wider uppercase font-['Outfit']">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Kit Boutique • Dhaka, Bangladesh</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-['Outfit'] uppercase leading-tight">
              Wear the Colors of Glory. <br />
              <span className="text-amber-400">Eleven Nation</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
              Explore authentic player-version and fan-issue kits from Europe's biggest clubs and legendary national teams. Featuring official heat-press name and squad number printing.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-4 pt-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>100% Guaranteed Master Quality</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Express 24-48h Delivery</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <Scissors className="w-4 h-4 text-sky-400" />
                <span>Custom Name & Squad Number Print</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
        {/* Filters */}
        <div className="space-y-4">
          {/* League / Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              All Leagues ({activeProducts.length})
            </button>
            {categories.map((cat) => {
              const count = activeProducts.filter((p) => p.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Edition Sub-filter */}
          <div className="flex items-center justify-between gap-4 flex-wrap border-t border-zinc-800/80 pt-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500 font-semibold uppercase text-[10px]">Edition:</span>
              {(['all', 'Fan Version', 'Player Version', 'Retro'] as const).map((ed) => (
                <button
                  key={ed}
                  onClick={() => setSelectedEdition(ed)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedEdition === ed
                      ? 'bg-zinc-800 text-amber-400 font-bold border border-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {ed === 'all' ? 'All Editions' : ed}
                </button>
              ))}
            </div>

            <span className="text-xs text-zinc-400 font-medium">
              Showing <strong className="text-white">{filteredProducts.length}</strong> kits
            </span>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 p-8">
            <Flame className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No jerseys match your selection</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Try adjusting your league filter or searching for another club kit.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedEdition('all');
                setSearchTerm('');
              }}
              className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelect={(prod) => setSelectedProduct(prod)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 mt-20 py-12 text-xs text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center font-black text-black font-['Outfit'] text-lg">
                11
              </div>
              <span className="font-['Outfit'] font-black text-base text-white">ELEVEN NATION</span>
            </div>
            <p className="text-zinc-500 leading-relaxed">
              Dhaka's premium football jersey boutique. Bringing match-day energy and legendary kits straight to your doorstep.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3">Customer Service</h4>
            <ul className="space-y-2 text-zinc-400">
              <li>Track Order with Phone Number</li>
              <li>Size Guide (S to XXL)</li>
              <li>Return & Exchange Policy</li>
              <li>Custom Printing Specifications</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-3">Payment Options</h4>
            <ul className="space-y-2 text-zinc-400">
              <li>Cash on Delivery (Nationwide)</li>
              <li>bKash Merchant Payment</li>
              <li>Nagad Direct Transfer</li>
              <li>Visa / Mastercard (On Request)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider">Store Operations</h4>
            <p className="text-zinc-500">
              Admin & management dashboard for inventory control, order dispatch, and financial profit audit.
            </p>
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 font-bold text-xs"
            >
              <Shield className="w-4 h-4" />
              <span>Launch Admin Dashboard</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 mt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Eleven Nation Football Kit Store. All rights reserved.</p>
          <p className="font-mono text-[11px]">BDT ৳ Pricing • Dhaka, Bangladesh</p>
        </div>
      </footer>

      {/* Global Store Drawers & Modals */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer onOpenCheckout={() => setIsCheckoutOpen(true)} />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(order) => setPlacedOrder(order)}
      />

      {/* Order Placed Success Confirmation Dialog */}
      {placedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white font-['Outfit']">
              Order Confirmed!
            </h3>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Order Reference:</span>
                <span className="font-mono font-bold text-amber-400">{placedOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Bill (BDT):</span>
                <span className="font-bold text-emerald-400 font-['Outfit'] text-sm">
                  {formatBDT(placedOrder.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Delivery To:</span>
                <span className="text-zinc-200">{placedOrder.city}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Thank you for shopping with Eleven Nation! Our courier team will call your phone{' '}
              <strong className="text-white font-mono">{placedOrder.customer_phone}</strong> before dispatching your package.
            </p>

            <button
              onClick={() => setPlacedOrder(null)}
              className="w-full py-2.5 bg-amber-400 text-black font-bold text-xs rounded-xl hover:bg-amber-300"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
