import React, { useState } from 'react';
import { Category, Product } from '../../types';
import { slugify } from '../../lib/utils';
import { Plus, Edit2, Trash2, FolderTree, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface CategoriesManagerProps {
  categories: Category[];
  products: Product[];
  onCreateCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
  onUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = ({
  categories,
  products,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setDisplayOrder(categories.length + 1);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImageUrl(cat.image_url || '');
    setDisplayOrder(cat.display_order);
    setIsActive(cat.is_active);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, {
          name,
          slug,
          description,
          image_url: imageUrl,
          display_order: displayOrder,
          is_active: isActive
        });
        showToast(`Category "${name}" updated successfully.`, 'success');
      } else {
        await onCreateCategory({
          name,
          slug,
          description,
          image_url: imageUrl,
          display_order: displayOrder,
          is_active: isActive
        });
        showToast(`Category "${name}" created successfully.`, 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    // Check if products exist in category
    const linked = products.filter((p) => p.category_id === deleteTarget.id);
    if (linked.length > 0) {
      showToast(
        `Safe Guard: Cannot delete category "${deleteTarget.name}". ${linked.length} jersey product(s) are currently assigned to this category. Please reassign or delete them first.`,
        'error'
      );
      setDeleteTarget(null);
      return;
    }

    if (!isSuperAdmin) {
      showToast('Action Denied: Only super_admin can delete categories.', 'error');
      setDeleteTarget(null);
      return;
    }

    try {
      await onDeleteCategory(deleteTarget.id);
      showToast(`Category "${deleteTarget.name}" deleted.`, 'success');
      setDeleteTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Category Management
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Organize jerseys into leagues, retro collections, and national kits ({categories.length} categories)
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const catProducts = products.filter((p) => p.category_id === cat.id);
          const activeCount = catProducts.filter((p) => p.status === 'active').length;

          return (
            <div
              key={cat.id}
              className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm hover:border-zinc-700 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-12 h-12 rounded-lg object-cover bg-zinc-950 border border-zinc-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400">
                        <FolderTree className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-white">{cat.name}</h3>
                      <p className="text-[11px] font-mono text-zinc-400 mt-0.5">/{cat.slug}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      cat.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {cat.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
                  {cat.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="text-xs text-zinc-400">
                  <span className="font-bold text-white font-mono">{catProducts.length}</span> jerseys (
                  <span className="text-emerald-400">{activeCount} active</span>)
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white font-['Outfit']">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Champions League"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Slug</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="champions-league"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Cover Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Leagues and clubs featured..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-950 text-amber-500"
                    />
                    <span>Active in Store</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-black bg-amber-400 hover:bg-amber-300 rounded-lg font-bold transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Category?"
        message={`Are you sure you want to delete category "${deleteTarget?.name}"? Deletion is only permitted if 0 products are attached to it.`}
        confirmLabel="Delete Category"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
