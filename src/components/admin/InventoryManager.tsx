import React, { useState } from 'react';
import { Product, InventoryLog, SizeInventory } from '../../types';
import { formatBDT } from '../../lib/utils';
import {
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  DollarSign,
  Package,
  TrendingUp,
  X
} from 'lucide-react';
import { useToast } from '../common/Toast';

interface InventoryManagerProps {
  products: Product[];
  lowStockThreshold: number;
  onAdjustStock: (
    productId: string,
    size: 'S' | 'M' | 'L' | 'XL' | 'XXL',
    changeAmount: number,
    reason: string
  ) => Promise<void>;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  lowStockThreshold,
  onAdjustStock
}) => {
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all');

  // Adjustment Modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustSize, setAdjustSize] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('L');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustAmount, setAdjustAmount] = useState(5);
  const [adjustReason, setAdjustReason] = useState('New shipment received from factory');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const isOut = p.stock === 0;
    const isLow = p.stock > 0 && p.stock <= lowStockThreshold;

    if (filterStock === 'out') return matchSearch && isOut;
    if (filterStock === 'low') return matchSearch && (isLow || isOut);
    return matchSearch;
  });

  // Calculate high-level inventory valuation
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalAssetCost = products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);
  const totalRetailValue = products.reduce((sum, p) => sum + (p.stock * p.selling_price), 0);
  const potentialProfit = totalRetailValue - totalAssetCost;

  const handleOpenAdjust = (prod: Product, size: 'S' | 'M' | 'L' | 'XL' | 'XXL' = 'L') => {
    setAdjustModalProduct(prod);
    setAdjustSize(size);
    setAdjustType('add');
    setAdjustAmount(5);
    setAdjustReason('New shipment received from factory');
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    if (adjustAmount <= 0) {
      showToast('Adjustment quantity must be greater than zero.', 'error');
      return;
    }

    const change = adjustType === 'add' ? adjustAmount : -adjustAmount;

    // Check if removing more than current stock in that size
    const currentSizeStock =
      adjustModalProduct.sizes.find((s) => s.size === adjustSize)?.stock || 0;
    if (adjustType === 'remove' && adjustAmount > currentSizeStock) {
      showToast(
        `Cannot remove ${adjustAmount} units. Current stock for size ${adjustSize} is only ${currentSizeStock}.`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdjustStock(adjustModalProduct.id, adjustSize, change, adjustReason);
      showToast(
        `Stock updated for ${adjustModalProduct.name} (${adjustSize}): ${change > 0 ? '+' : ''}${change} units.`,
        'success'
      );
      setAdjustModalProduct(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Inventory & Asset Valuation
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor real-time warehouse inventory, size-level stocks, and asset capital
          </p>
        </div>
      </div>

      {/* Asset Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Total Warehouse Units
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white font-['Outfit']">
              {totalUnits}
            </span>
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs text-zinc-400 mt-1">Across all club and fan editions</p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Total Asset Cost Value
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400 font-['Outfit']">
              {formatBDT(totalAssetCost)}
            </span>
            <DollarSign className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-xs text-zinc-400 mt-1">Total invested capital in stock</p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Potential Retail Value
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400 font-['Outfit']">
              {formatBDT(totalRetailValue)}
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-zinc-400 mt-1">If all available stock is sold</p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Expected Future Profit
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400 font-['Outfit']">
              +{formatBDT(potentialProfit)}
            </span>
            <Boxes className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-xs text-zinc-400 mt-1">Net profit pipeline in inventory</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search jersey or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setFilterStock('all')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              filterStock === 'all' ? 'bg-amber-400 text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Jerseys
          </button>
          <button
            onClick={() => setFilterStock('low')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              filterStock === 'low' ? 'bg-amber-400 text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Low Stock (&le; {lowStockThreshold})
          </button>
          <button
            onClick={() => setFilterStock('out')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              filterStock === 'out' ? 'bg-amber-400 text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Jersey Product</th>
                <th className="p-3.5">Cost</th>
                <th className="p-3.5">Retail</th>
                <th className="p-3.5 text-center">S</th>
                <th className="p-3.5 text-center">M</th>
                <th className="p-3.5 text-center">L</th>
                <th className="p-3.5 text-center">XL</th>
                <th className="p-3.5 text-center">XXL</th>
                <th className="p-3.5 text-center">Total Stock</th>
                <th className="p-3.5 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredProducts.map((p) => {
                const getStock = (size: string) => p.sizes.find((s) => s.size === size)?.stock || 0;
                const isLow = p.stock <= lowStockThreshold;

                return (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0] || 'https://placehold.co/100x100'}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                        />
                        <div>
                          <span className="font-semibold text-white block">{p.name}</span>
                          <span className="text-[11px] font-mono text-zinc-400">{p.sku}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-rose-400 font-mono">{formatBDT(p.cost_price)}</td>
                    <td className="p-3.5 text-emerald-400 font-mono font-semibold">{formatBDT(p.selling_price)}</td>

                    {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => {
                      const val = getStock(sz);
                      return (
                        <td
                          key={sz}
                          onClick={() => handleOpenAdjust(p, sz)}
                          title={`Click to adjust stock for size ${sz}`}
                          className="p-3.5 text-center cursor-pointer hover:bg-zinc-800/60 transition-colors"
                        >
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              val === 0
                                ? 'bg-rose-500/10 text-rose-400'
                                : val <= 2
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'text-zinc-200'
                            }`}
                          >
                            {val}
                          </span>
                        </td>
                      );
                    })}

                    <td className="p-3.5 text-center">
                      <span
                        className={`font-mono font-bold text-sm ${
                          p.stock === 0 ? 'text-rose-500' : isLow ? 'text-amber-400' : 'text-white'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>

                    <td className="p-3.5 pr-4 text-right">
                      <button
                        onClick={() => handleOpenAdjust(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs font-semibold transition-colors border border-zinc-700 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit']">
                  Adjust Jersey Stock
                </h3>
                <p className="text-xs text-zinc-400 truncate max-w-xs">{adjustModalProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Target Size</label>
                  <select
                    value={adjustSize}
                    onChange={(e) => setAdjustSize(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value="S">Size S</option>
                    <option value="M">Size M</option>
                    <option value="L">Size L</option>
                    <option value="XL">Size XL</option>
                    <option value="XXL">Size XXL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Action Type</label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 border border-zinc-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`py-1 rounded font-bold transition-colors ${
                        adjustType === 'add' ? 'bg-emerald-500 text-black' : 'text-zinc-400'
                      }`}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('remove')}
                      className={`py-1 rounded font-bold transition-colors ${
                        adjustType === 'remove' ? 'bg-rose-500 text-white' : 'text-zinc-400'
                      }`}
                    >
                      - Deduct
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Quantity of Jerseys *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-base font-bold font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Reason for Audit Log *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="New shipment received from factory">New shipment received from factory</option>
                  <option value="Physical warehouse stock count correction">Warehouse physical count correction</option>
                  <option value="Defective / damaged jersey written off">Defective jersey written off</option>
                  <option value="Returned jersey re-inspected and restocked">Returned jersey restocked</option>
                  <option value="Showroom mannequin display transfer">Showroom display sample</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-black bg-amber-400 hover:bg-amber-300 rounded-lg font-bold transition-colors"
                >
                  {isSubmitting ? 'Updating...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
