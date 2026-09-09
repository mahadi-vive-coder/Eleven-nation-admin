import React, { useState, useEffect } from 'react';
import { AdminSidebar, AdminTab } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { DashboardOverview } from './DashboardOverview';
import { ProductsManager } from './ProductsManager';
import { CategoriesManager } from './CategoriesManager';
import { OrdersManager } from './OrdersManager';
import { InventoryManager } from './InventoryManager';
import { CustomersManager } from './CustomersManager';
import { AnalyticsReports } from './AnalyticsReports';
import { StoreSettingsManager } from './StoreSettingsManager';
import { AuditLogsViewer } from './AuditLogsViewer';
import { ProductFormModal } from './ProductFormModal';
import { CustomOrderCreator } from './CustomOrderCreator';
import { OrderDetailModal } from './OrderDetailModal';
import { dataService } from '../../services/dataService';
import { Product, Category, Order, StoreSettings, AuditLog, OrderStatus, PaymentStatus } from '../../types';
import { useToast } from '../common/Toast';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { Lock, ShieldAlert, ArrowLeft, KeyRound, CheckCircle2, LogOut } from 'lucide-react';

interface AdminLayoutProps {
  onSwitchToStore: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onSwitchToStore }) => {
  const { showToast } = useToast();
  const { settings, refreshSettings } = useSettings();
  const { user, profile, isAdmin, role, signInWithEmail, signOut, isLoading: isAuthLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth Gate state
  const [loginEmail, setLoginEmail] = useState('elevennation.support@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);

  const loadAllData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [p, c, o, a] = await Promise.all([
        dataService.getProducts(),
        dataService.getCategories(),
        dataService.getOrders(),
        dataService.getAuditLogs(),
        refreshSettings()
      ]);
      setProducts(p);
      setCategories(c);
      setOrders(o);
      setAuditLogs(a);
      if (isManualRefresh) {
        showToast('Admin data refreshed from Supabase.', 'success');
      }
    } catch (e: any) {
      console.error('Failed to load admin data:', e);
      if (isManualRefresh) {
        showToast(e.message || 'Failed to refresh data', 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Product Operations
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id'> | Product) => {
    if ('id' in productData && productData.id) {
      await dataService.updateProduct(productData.id, productData);
      showToast('Product updated successfully.', 'success');
    } else {
      await dataService.createProduct(productData as Omit<Product, 'id'>);
      showToast('Product created successfully.', 'success');
    }
    await loadAllData();
  };

  const handleDeleteProduct = async (productId: string) => {
    await dataService.deleteProduct(productId);
    await loadAllData();
  };

  const handleToggleProductStatus = async (prod: Product) => {
    const nextStatus = prod.status === 'active' ? 'draft' : 'active';
    await dataService.updateProduct(prod.id, { status: nextStatus });
    showToast(`Product status changed to "${nextStatus}".`, 'success');
    await loadAllData();
  };

  // Category Operations
  const handleCreateCategory = async (cat: Omit<Category, 'id'>) => {
    await dataService.createCategory(cat);
    await loadAllData();
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    await dataService.updateCategory(id, updates);
    await loadAllData();
  };

  const handleDeleteCategory = async (id: string) => {
    await dataService.deleteCategory(id);
    await loadAllData();
  };

  // Order Operations
  const handleCreateCustomOrder = async (orderData: Omit<Order, 'id'>) => {
    const created = await dataService.createOrder(orderData);
    await loadAllData();
    return created;
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    paymentStatus?: PaymentStatus
  ) => {
    await dataService.updateOrderStatus(orderId, newStatus, paymentStatus);
    await loadAllData();
    // Update active modal order if open
    if (selectedOrderForDetail && selectedOrderForDetail.id === orderId) {
      setSelectedOrderForDetail((prev) =>
        prev
          ? {
              ...prev,
              order_status: newStatus,
              payment_status: paymentStatus || prev.payment_status
            }
          : null
      );
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    await dataService.deleteOrder(orderId);
    await loadAllData();
  };

  const handleAddAdminNote = async (orderId: string, note: string) => {
    await dataService.addOrderNote(orderId, note);
    await loadAllData();
  };

  const handleUpdateCourier = async (orderId: string, courierName: string, trackingNumber: string) => {
    await dataService.updateOrderDetails(orderId, {
      courier_name: courierName,
      tracking_number: trackingNumber
    });
    await loadAllData();
    if (selectedOrderForDetail && selectedOrderForDetail.id === orderId) {
      setSelectedOrderForDetail((prev) =>
        prev ? { ...prev, courier_name: courierName, tracking_number: trackingNumber } : null
      );
    }
  };

  // Stock Adjustment Operation
  const handleAdjustStock = async (
    productId: string,
    size: 'S' | 'M' | 'L' | 'XL' | 'XXL',
    changeAmount: number,
    reason: string
  ) => {
    await dataService.adjustStock(productId, size, changeAmount, reason);
    await loadAllData();
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await signInWithEmail(loginEmail, loginPassword);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Authenticated as administrative user.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCustomerSignOut = async () => {
    setIsSigningOut(true);
    try {
      const res = await signOut();
      if (res?.error) {
        showToast(`Sign out failed: ${res.error}`, 'error');
        return;
      }
      showToast('Signed out of customer session. Please enter administrative credentials below.', 'info');
      setLoginEmail('elevennation.support@gmail.com');
      setLoginPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Error signing out', 'error');
    } finally {
      setIsSigningOut(false);
    }
  };

  // Auth Loading Gate
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex items-center gap-3 text-amber-400">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-zinc-400">Verifying administrative security credentials...</span>
        </div>
      </div>
    );
  }

  // 1. Role-Based Access Gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-300" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white font-['Outfit',sans-serif]">
                Eleven Nation Admin Portal
              </h1>
              <p className="text-xs text-zinc-400">Restricted Administrative Area</p>
            </div>
          </div>

          {user && role === 'customer' ? (
            <div className="space-y-4">
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-400">
                  <Lock className="w-4 h-4" />
                  Access Denied: Customer Role Active
                </p>
                <p>
                  You are currently authenticated as <strong>{profile?.email || user?.email}</strong> with standard customer permissions.
                  Administrative privileges (Admin or Super Admin) are strictly required to manage inventory, finances, and products.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleCustomerSignOut}
                  className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 text-zinc-400" />
                  <span>{isSigningOut ? 'Signing Out...' : 'Sign Out & Switch to Admin Account'}</span>
                </button>

                <button
                  type="button"
                  onClick={onSwitchToStore}
                  className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Jersey Storefront</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAdminSignIn} className="space-y-4">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 text-xs">
                Enter your administrative credentials to manage Eleven Nation operations.
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isLoggingIn ? 'Authenticating...' : 'Sign In as Administrator'}</span>
                </button>

                <button
                  type="button"
                  onClick={onSwitchToStore}
                  className="w-full py-2 px-4 text-zinc-400 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Customer Website</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSwitchToStore={onSwitchToStore}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <AdminHeader
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenAddProduct={handleOpenAddProduct}
          onOpenCustomOrder={() => setIsCustomOrderOpen(true)}
          onRefreshData={() => loadAllData(true)}
          isRefreshing={isRefreshing}
          onSwitchToStore={onSwitchToStore}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-20 text-amber-400">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardOverview
                  orders={orders}
                  products={products}
                  lowStockThreshold={settings.low_stock_threshold}
                  onNavigateTab={setCurrentTab}
                  onOpenAddProduct={handleOpenAddProduct}
                  onOpenCustomOrder={() => setIsCustomOrderOpen(true)}
                  onSelectOrder={(ord) => setSelectedOrderForDetail(ord)}
                />
              )}

              {currentTab === 'products' && (
                <ProductsManager
                  products={products}
                  categories={categories}
                  onAddProduct={handleOpenAddProduct}
                  onEditProduct={handleOpenEditProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onToggleStatus={handleToggleProductStatus}
                />
              )}

              {currentTab === 'categories' && (
                <CategoriesManager
                  categories={categories}
                  products={products}
                  onCreateCategory={handleCreateCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}

              {currentTab === 'orders' && (
                <OrdersManager
                  orders={orders}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onDeleteOrder={handleDeleteOrder}
                  onAddAdminNote={handleAddAdminNote}
                  onUpdateCourier={handleUpdateCourier}
                />
              )}

              {currentTab === 'custom-orders' && (
                <OrdersManager
                  orders={orders}
                  initialFilter="all"
                  onUpdateStatus={handleUpdateOrderStatus}
                  onDeleteOrder={handleDeleteOrder}
                  onAddAdminNote={handleAddAdminNote}
                  onUpdateCourier={handleUpdateCourier}
                />
              )}

              {currentTab === 'inventory' && (
                <InventoryManager
                  products={products}
                  lowStockThreshold={settings.low_stock_threshold}
                  onAdjustStock={handleAdjustStock}
                />
              )}

              {currentTab === 'customers' && (
                <CustomersManager
                  orders={orders}
                  onSelectCustomerOrder={(ord) => setSelectedOrderForDetail(ord)}
                />
              )}

              {currentTab === 'analytics' && (
                <AnalyticsReports
                  orders={orders}
                  products={products}
                  categories={categories}
                />
              )}

              {currentTab === 'settings' && <StoreSettingsManager />}

              {currentTab === 'audit' && <AuditLogsViewer logs={auditLogs} />}
            </>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        categories={categories}
      />

      <CustomOrderCreator
        products={products}
        isOpen={isCustomOrderOpen}
        onClose={() => setIsCustomOrderOpen(false)}
        onCreateOrder={handleCreateCustomOrder}
      />

      <OrderDetailModal
        order={selectedOrderForDetail}
        isOpen={Boolean(selectedOrderForDetail)}
        onClose={() => setSelectedOrderForDetail(null)}
        onUpdateStatus={handleUpdateOrderStatus}
        onAddAdminNote={handleAddAdminNote}
        onUpdateCourier={handleUpdateCourier}
      />
    </div>
  );
};
