import React from 'react';
import { useCart } from '../../context/CartContext';
import { formatBDT } from '../../lib/utils';
import { X, Trash2, ShoppingBag, Scissors, ArrowRight, Truck } from 'lucide-react';

interface CartDrawerProps {
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout }) => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    removeItem,
    updateQuantity,
    subtotal,
    customizationTotal,
    deliveryFee,
    deliveryCity,
    setDeliveryCity,
    total
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col justify-between text-xs">
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white font-['Outfit']">
                Your Shopping Bag ({items.length})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                <ShoppingBag className="w-12 h-12 text-zinc-700 stroke-1 mb-3" />
                <p className="text-sm font-semibold text-zinc-300">Your bag is empty</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Browse our curated 24/25 football kits and add your favorite jerseys!
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 px-4 py-2 bg-amber-400 text-black font-bold rounded-xl text-xs"
                >
                  Explore Kits
                </button>
              </div>
            ) : (
              items.map((it) => (
                <div
                  key={it.id}
                  className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex gap-3 relative group"
                >
                  <img
                    src={it.product.images[0] || 'https://placehold.co/100x100'}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover bg-zinc-900 border border-zinc-800 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-xs truncate">{it.product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-bold text-[10px]">
                        Size: {it.size}
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {formatBDT(it.product.selling_price)}
                      </span>
                    </div>

                    {/* Custom Name/Number badge */}
                    {(it.customName || it.customNumber) && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit">
                        <Scissors className="w-3 h-3" />
                        <span className="font-mono font-bold uppercase">
                          {it.customName || ''} #{it.customNumber || ''} (+{formatBDT(it.customizationFee)})
                        </span>
                      </div>
                    )}

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-800/60">
                      <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded">
                        <button
                          onClick={() => updateQuantity(it.id, it.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-white font-mono text-[11px]">
                          {it.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(it.id, it.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(it.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <div className="p-5 border-t border-zinc-800 bg-zinc-950 space-y-3">
              {/* Shipping Destination */}
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Delivery Destination:</span>
                </span>
                <select
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white font-medium"
                >
                  <option value="Dhaka">Dhaka (৳80)</option>
                  <option value="Outside Dhaka">Outside Dhaka (৳150)</option>
                </select>
              </div>

              {/* Subtotal breakdown */}
              <div className="space-y-1 text-zinc-400 pt-1 border-t border-zinc-900">
                <div className="flex justify-between">
                  <span>Jerseys:</span>
                  <span className="text-white font-mono">{formatBDT(subtotal)}</span>
                </div>
                {customizationTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Kit Printing:</span>
                    <span className="text-amber-400 font-mono">+{formatBDT(customizationTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span className="text-white font-mono">{formatBDT(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-sm pt-1.5 border-t border-zinc-800">
                  <span>Total Amount:</span>
                  <span className="text-emerald-400 font-['Outfit'] text-base font-black">
                    {formatBDT(total)}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onOpenCheckout();
                }}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
