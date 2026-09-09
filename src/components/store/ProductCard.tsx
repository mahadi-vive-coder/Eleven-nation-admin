import React from 'react';
import { Product } from '../../types';
import { formatBDT } from '../../lib/utils';
import { Scissors, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const isOutOfStock = product.stock === 0;

  return (
    <div
      onClick={() => onSelect(product)}
      className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 flex flex-col justify-between cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/4] overflow-hidden bg-zinc-950">
        <img
          src={product.images[0] || 'https://placehold.co/600x600?text=Jersey'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Edition & Season Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/80 backdrop-blur-md text-amber-400 border border-amber-400/30 font-['Outfit']">
            {product.edition}
          </span>
          {product.is_new_arrival && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/90 text-black">
              New Kit
            </span>
          )}
        </div>

        {/* Custom Printing Pill */}
        {product.allow_custom_name && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-zinc-700 text-[10px] text-zinc-300 flex items-center gap-1 font-medium">
            <Scissors className="w-3 h-3 text-amber-400" />
            <span>Custom Print</span>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
            <span className="px-3 py-1 bg-rose-600 text-white font-bold text-xs rounded-full uppercase tracking-wider">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            {product.club || product.season}
          </span>
          <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors mt-0.5 line-clamp-1">
            {product.name}
          </h3>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-white font-['Outfit'] block">
              {formatBDT(product.selling_price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.selling_price && (
              <span className="text-xs text-zinc-400 line-through">
                {formatBDT(product.compare_at_price)}
              </span>
            )}
          </div>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-zinc-800 group-hover:bg-amber-400 group-hover:text-black text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>View Kit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
