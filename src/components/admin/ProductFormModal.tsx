import React, { useState, useEffect } from 'react';
import { Product, Category, SizeInventory } from '../../types';
import { uploadProductImage } from '../../lib/supabase';
import { slugify, formatBDT } from '../../lib/utils';
import { X, Upload, Plus, Trash2, Info, Check } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'> | Product) => Promise<void>;
  editingProduct: Product | null;
  categories: Category[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct,
  categories
}) => {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    slug: '',
    category_id: '',
    club: '',
    season: '2024/25',
    edition: 'Fan Version',
    sku: '',
    description: '',
    short_description: '',
    selling_price: 1500,
    compare_at_price: 1800,
    cost_price: 900,
    stock: 20,
    sizes: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 6 },
      { size: 'L', stock: 6 },
      { size: 'XL', stock: 3 },
      { size: 'XXL', stock: 1 }
    ],
    images: ['https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&auto=format&fit=crop&q=80'],
    is_featured: false,
    is_trending: false,
    is_bestseller: false,
    is_new_arrival: true,
    status: 'active',
    allow_custom_name: true,
    allow_custom_number: true,
    customization_fee: 150
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setFormData(editingProduct);
    } else {
      setFormData({
        name: '',
        slug: '',
        category_id: categories[0]?.id || '',
        club: '',
        season: '2024/25',
        edition: 'Fan Version',
        sku: `EN-${Math.floor(1000 + Math.random() * 9000)}`,
        description: '',
        short_description: '',
        selling_price: 1500,
        compare_at_price: 1800,
        cost_price: 900,
        stock: 20,
        sizes: [
          { size: 'S', stock: 4 },
          { size: 'M', stock: 6 },
          { size: 'L', stock: 6 },
          { size: 'XL', stock: 3 },
          { size: 'XXL', stock: 1 }
        ],
        images: ['https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&auto=format&fit=crop&q=80'],
        is_featured: false,
        is_trending: false,
        is_bestseller: false,
        is_new_arrival: true,
        status: 'active',
        allow_custom_name: true,
        allow_custom_number: true,
        customization_fee: 150
      });
    }
  }, [editingProduct, categories, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || slugify(name)
    }));
  };

  const handleSizeStockChange = (size: 'S' | 'M' | 'L' | 'XL' | 'XXL', stock: number) => {
    const updatedSizes = (formData.sizes || []).map((s) =>
      s.size === size ? { ...s, stock: Math.max(0, stock) } : s
    );
    const total = updatedSizes.reduce((sum, s) => sum + s.stock, 0);
    setFormData((prev) => ({
      ...prev,
      sizes: updatedSizes,
      stock: total
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage('');
    const file = files[0];
    const { url, error } = await uploadProductImage(file);
    setIsUploading(false);

    if (error || !url) {
      setErrorMessage(error || 'Failed to upload image');
      return;
    }

    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), url]
    }));
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), imageUrlInput.trim()]
    }));
    setImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  // Calculations for live profit preview
  const selling = formData.selling_price || 0;
  const cost = formData.cost_price || 0;
  const unitProfit = selling - cost;
  const unitMargin = selling > 0 ? ((unitProfit / selling) * 100).toFixed(1) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setErrorMessage('Product name is required');
      return;
    }
    if (!formData.sku?.trim()) {
      setErrorMessage('SKU is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSave(formData as Product);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <h2 className="text-lg font-bold text-white font-['Outfit']">
              {editingProduct ? 'Edit Football Jersey' : 'Add New Football Jersey'}
            </h2>
            <p className="text-xs text-zinc-400">
              Configure jersey details, stock, pricing, and player kit customization
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-lg text-xs">
              {errorMessage}
            </div>
          )}

          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              1. Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Real Madrid 24/25 Home Kit"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">URL Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="real-madrid-24-25-home"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Category *</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Club / National Team</label>
                <input
                  type="text"
                  value={formData.club || ''}
                  onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                  placeholder="e.g. Real Madrid / Argentina"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Season</label>
                <input
                  type="text"
                  value={formData.season || ''}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  placeholder="2024/25"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Jersey Edition</label>
                <select
                  value={formData.edition || 'Fan Version'}
                  onChange={(e) => setFormData({ ...formData, edition: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Fan Version">Fan Version</option>
                  <option value="Player Version">Player Version (Match Issue)</option>
                  <option value="Retro">Retro Classic</option>
                  <option value="Special Edition">Special Edition</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">SKU (Stock Keeping Unit) *</label>
                <input
                  type="text"
                  required
                  value={formData.sku || ''}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. RMA-2425-HME"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Status</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="active">Active (Visible in Store)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Full Description</label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Fabric details, breathable technology, official kit features..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Pricing & Profitability Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              2. Pricing & Profit Analysis (BDT ৳)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Selling Price (৳) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.selling_price || 0}
                  onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Compare-at Price (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.compare_at_price || 0}
                  onChange={(e) => setFormData({ ...formData, compare_at_price: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Cost Price (৳) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.cost_price || 0}
                  onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-rose-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Profit Margin Preview Card */}
            <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-300 font-medium">Estimated Profit per Jersey:</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-zinc-400 text-[11px] block">Unit Profit</span>
                  <span className="text-amber-400 font-bold text-sm">{formatBDT(unitProfit)}</span>
                </div>
                <div className="text-right border-l border-zinc-800 pl-4">
                  <span className="text-zinc-400 text-[11px] block">Gross Margin</span>
                  <span className="text-emerald-400 font-bold text-sm">{unitMargin}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Size-wise Inventory Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              3. Inventory by Size (Total Stock: {formData.stock} units)
            </h3>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {(['S', 'M', 'L', 'XL', 'XXL'] as const).map((sz) => {
                const sObj = (formData.sizes || []).find((s) => s.size === sz);
                return (
                  <div key={sz} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-center">
                    <span className="block font-bold text-zinc-300 mb-1">{sz}</span>
                    <input
                      type="number"
                      min="0"
                      value={sObj?.stock || 0}
                      onChange={(e) => handleSizeStockChange(sz, Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-center text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customization Options */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              4. Custom Kit Printing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_custom_name}
                  onChange={(e) => setFormData({ ...formData, allow_custom_name: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                />
                <span>Allow Custom Name</span>
              </label>

              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allow_custom_number}
                  onChange={(e) => setFormData({ ...formData, allow_custom_number: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500"
                />
                <span>Allow Custom Number</span>
              </label>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Customization Fee (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.customization_fee || 150}
                  onChange={(e) => setFormData({ ...formData, customization_fee: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Product Badges & Flags */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              5. Store Placement Badges
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500"
                />
                <span>Featured</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_trending}
                  onChange={(e) => setFormData({ ...formData, is_trending: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500"
                />
                <span>Trending</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_bestseller}
                  onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500"
                />
                <span>Bestseller</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_new_arrival}
                  onChange={(e) => setFormData({ ...formData, is_new_arrival: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-500"
                />
                <span>New Arrival</span>
              </label>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              6. Product Images (Supabase Storage)
            </h3>
            <div className="flex flex-wrap gap-3">
              {(formData.images || []).map((img, idx) => (
                <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <label className="w-20 h-20 border border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center text-zinc-400 hover:border-amber-400 hover:text-amber-400 transition-colors cursor-pointer bg-zinc-950">
                <Upload className="w-5 h-5 mb-1" />
                <span className="text-[9px]">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
            {isUploading && <p className="text-[11px] text-amber-400 animate-pulse">Uploading to Supabase Storage...</p>}

            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Or paste direct image URL (https://...)"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? 'Update Product' : 'Create Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
