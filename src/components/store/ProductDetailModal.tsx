import React, { useState } from 'react';
import { Product } from '../../types';
import { formatBDT } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useToast } from '../common/Toast';
import { X, Scissors, ShoppingBag, Check, ShieldAlert, Sparkles } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose
}) => {
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [quantity, setQuantity] = useState(1);
  const [enableCustomization, setEnableCustomization] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState('');

  if (!isOpen || !product) return null;

  const currentSizeStock =
    product.sizes.find((s) => s.size === selectedSize)?.stock || 0;
  const isOutOfStock = currentSizeStock === 0;

  const customFee = enableCustomization ? product.customization_fee : 0;
  const itemUnitPrice = product.selling_price + customFee;
  const totalItemPrice = itemUnitPrice * quantity;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      showToast(`Size ${selectedSize} is currently out of stock.`, 'error');
      return;
    }
    if (quantity > currentSizeStock) {
      showToast(`Only ${currentSizeStock} units available in size ${selectedSize}.`, 'error');
      return;
    }

    addItem(
      product,
      selectedSize,
      quantity,
      enableCustomization ? customName.toUpperCase() : undefined,
      enableCustomization ? customNumber : undefined
    );

    showToast(`Added ${quantity}x ${product.name} (${selectedSize}) to cart!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block font-['Outfit']">
              {product.edition} • {product.club || product.season}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white line-clamp-1">
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Jersey Preview & Custom Kit Badge */}
            <div className="space-y-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
                <img
                  src={product.images[0] || 'https://placehold.co/600x600'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />

                {/* Custom Name/Number Overlay Simulation on Jersey Back */}
                {enableCustomization && (customName || customNumber) && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 mb-2">
                      Kit Printing Simulation
                    </span>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-white uppercase drop-shadow-md">
                      {customName || 'NAME'}
                    </span>
                    <span className="text-6xl sm:text-7xl font-black font-mono text-amber-400 leading-none mt-1 drop-shadow-lg">
                      {customNumber || '00'}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-3 font-semibold uppercase">
                      Official Vinyl Heat-Press (+{formatBDT(product.customization_fee)})
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-amber-400 transition-colors"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Options & Checkout details */}
            <div className="space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Price Display */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white font-['Outfit']">
                      {formatBDT(product.selling_price)}
                    </span>
                    {product.compare_at_price && product.compare_at_price > product.selling_price && (
                      <span className="text-sm text-zinc-400 line-through">
                        {formatBDT(product.compare_at_price)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                    Free Dhaka delivery on orders over ৳4,000
                  </p>
                </div>

                {/* Size Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
                      Select Size
                    </span>
                    <span className="text-zinc-400 text-[11px]">
                      {currentSizeStock > 0 ? (
                        <span className="text-emerald-400 font-semibold">
                          {currentSizeStock} in stock
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold">Sold Out</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => {
                      const stock = product.sizes.find((s) => s.size === sz)?.stock || 0;
                      const isSelected = selectedSize === sz;
                      const isSzOut = stock === 0;

                      return (
                        <button
                          key={sz}
                          type="button"
                          disabled={isSzOut}
                          onClick={() => setSelectedSize(sz)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                              : isSzOut
                              ? 'bg-zinc-950 text-zinc-600 border border-zinc-800/60 cursor-not-allowed'
                              : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700'
                          }`}
                        >
                          <span>{sz}</span>
                          <span className="text-[9px] font-mono opacity-80">{stock} left</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Name & Number Toggle */}
                {product.allow_custom_name && (
                  <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-white">Custom Player Kit Printing</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableCustomization}
                          onChange={(e) => setEnableCustomization(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-400"></div>
                      </label>
                    </div>

                    {enableCustomization && (
                      <div className="pt-2 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-200">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] text-zinc-400 mb-0.5">
                              Name on Back (Capitalized)
                            </label>
                            <input
                              type="text"
                              maxLength={12}
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                              placeholder="e.g. MBAPPE"
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="w-20">
                            <label className="block text-[10px] text-zinc-400 mb-0.5">
                              Number
                            </label>
                            <input
                              type="text"
                              maxLength={2}
                              value={customNumber}
                              onChange={(e) => setCustomNumber(e.target.value)}
                              placeholder="9"
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-amber-400">
                          +৳{product.customization_fee} printing fee added to jersey price
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center gap-3">
                  <span className="text-zinc-300 font-bold uppercase text-[11px]">Quantity</span>
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-white rounded hover:bg-zinc-800 text-sm font-bold"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-white font-mono">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(currentSizeStock, q + 1))}
                      className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-white rounded hover:bg-zinc-800 text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div className="pt-2 border-t border-zinc-800 text-zinc-400 leading-relaxed text-[11px]">
                    {product.description}
                  </div>
                )}
              </div>

              {/* Total & Add to Cart button */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Total Price:</span>
                  <span className="text-xl font-bold text-emerald-400 font-['Outfit']">
                    {formatBDT(totalItemPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Sold Out' : 'Add to Shopping Cart'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
