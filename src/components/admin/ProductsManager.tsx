import React, { useState, useMemo } from 'react';
import { Product, Category } from '../../types';
import { formatBDT } from '../../lib/utils';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  Flame,
  Tag,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface ProductsManagerProps {
  products: Product[];
  categories: Category[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => Promise<void>;
  onToggleStatus: (product: Product) => Promise<void>;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({
  products,
  categories,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleStatus
}) => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.club && p.club.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!isSuperAdmin) {
      showToast('Action Denied: Only super_admin can delete products from the catalog.', 'error');
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteProduct(deleteTarget.id);
      showToast(`Product "${deleteTarget.name}" deleted successfully.`, 'success');
      setDeleteTarget(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to delete product', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Product Management
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage jersey inventory, kit variants, cost prices, and retail margins ({products.length} items)
          </p>
        </div>

        <button
          onClick={onAddProduct}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, SKU, or club..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Product</th>
                <th className="p-3.5">Category & Club</th>
                <th className="p-3.5">Retail Price</th>
                <th className="p-3.5">Cost Price</th>
                <th className="p-3.5">Gross Profit</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-zinc-500">
                    No jerseys match the current filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const profit = p.selling_price - p.cost_price;
                  const margin = p.selling_price > 0 ? ((profit / p.selling_price) * 100).toFixed(0) : 0;
                  const isLowStock = p.stock <= 5;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0] || 'https://placehold.co/100x100?text=Jersey'}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-zinc-950 border border-zinc-800 shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-white block hover:text-amber-400 transition-colors">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
                              <span className="font-mono text-zinc-400">{p.sku}</span>
                              <span>•</span>
                              <span>{p.edition || 'Fan'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-zinc-200 block">{p.category_name || 'Jersey'}</span>
                        <span className="text-zinc-400 text-[11px]">{p.club || p.season || '2024/25'}</span>
                      </td>

                      <td className="p-3.5 font-bold text-white font-['Outfit']">
                        {formatBDT(p.selling_price)}
                        {p.compare_at_price && p.compare_at_price > p.selling_price && (
                          <span className="block text-[10px] text-zinc-400 line-through">
                            {formatBDT(p.compare_at_price)}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-medium text-rose-400 font-['Outfit']">
                        {formatBDT(p.cost_price)}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-amber-400 font-['Outfit'] block">
                          +{formatBDT(profit)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">{margin}% margin</span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold font-mono ${
                              p.stock === 0 ? 'text-rose-500' : isLowStock ? 'text-amber-400' : 'text-zinc-200'
                            }`}
                          >
                            {p.stock}
                          </span>
                          {isLowStock && (
                            <span
                              title={p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                p.stock === 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {p.stock === 0 ? 'Out' : 'Low'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <button
                          onClick={() => onToggleStatus(p)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                            p.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-zinc-700/30 text-zinc-400 hover:bg-zinc-700/50'
                          }`}
                        >
                          {p.status === 'active' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          <span>{p.status}</span>
                        </button>
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditProduct(p)}
                            title="Edit product"
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            title={isSuperAdmin ? 'Delete product' : 'Requires Super Admin'}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Jersey Product?"
        message={`Are you sure you want to permanently remove "${deleteTarget?.name}"? Historical orders referencing this item will maintain their cost prices, but this product will no longer appear in store listings.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Product'}
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
