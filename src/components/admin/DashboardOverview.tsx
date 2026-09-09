import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  Receipt,
  Percent,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Order, Product, DateRange } from '../../types';
import { StatCard } from '../common/StatCard';
import { DateRangePicker } from '../common/DateRangePicker';
import { SalesChart } from './SalesChart';
import { ProfitChart } from './ProfitChart';
import { formatBDT, getDateRangeFromPreset, isOrderFinanciallyCountable, calculateProfitMargin } from '../../lib/utils';
import { AdminTab } from './AdminSidebar';

interface DashboardOverviewProps {
  orders: Order[];
  products: Product[];
  lowStockThreshold: number;
  onNavigateTab: (tab: AdminTab) => void;
  onOpenAddProduct: () => void;
  onOpenCustomOrder: () => void;
  onSelectOrder: (order: Order) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  orders,
  products,
  lowStockThreshold,
  onNavigateTab,
  onOpenAddProduct,
  onOpenCustomOrder,
  onSelectOrder
}) => {
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('30days'));

  // Filter orders by dateRange
  const filteredOrders = useMemo(() => {
    const start = new Date(dateRange.startDate).getTime();
    const end = new Date(dateRange.endDate).getTime();
    return orders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= start && t <= end;
    });
  }, [orders, dateRange]);

  // Compute metrics with strict financial business rules (excluding cancelled, returned, refunded, failed)
  const validOrders = filteredOrders.filter(isOrderFinanciallyCountable);
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalOrders = validOrders.length;
  const productsSold = validOrders.reduce((sum, o) => sum + o.items_count, 0);
  const totalCost = validOrders.reduce((sum, o) => sum + o.total_cost, 0);
  const grossProfit = totalRevenue - totalCost;
  const profitMargin = calculateProfitMargin(totalRevenue, grossProfit).toFixed(1);
  const aov = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  // Order status counts
  const pendingCount = orders.filter((o) => o.order_status === 'pending').length;
  const processingCount = orders.filter((o) => o.order_status === 'processing' || o.order_status === 'customizing').length;
  const shippedCount = orders.filter((o) => o.order_status === 'shipped').length;
  const deliveredCount = orders.filter((o) => o.order_status === 'delivered').length;
  const cancelledCount = orders.filter((o) => o.order_status === 'cancelled').length;

  // Low stock products
  const lowStockProducts = products.filter((p) => p.stock <= lowStockThreshold);

  return (
    <div className="space-y-6">
      {/* Top filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Dashboard Overview
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time financial performance and inventory velocity for Eleven Nation
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          id="stat-revenue"
          title="Total Revenue"
          value={formatBDT(totalRevenue)}
          changePercent={14.2}
          comparisonText="vs prior period"
          color="emerald"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          id="stat-orders"
          title="Total Orders"
          value={totalOrders}
          changePercent={8.5}
          comparisonText="vs prior period"
          color="blue"
          icon={<ShoppingBag className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          id="stat-products-sold"
          title="Jerseys Sold"
          value={productsSold}
          changePercent={12.0}
          comparisonText="units dispatched"
          color="purple"
          icon={<Package className="w-5 h-5 text-purple-400" />}
        />
        <StatCard
          id="stat-gross-profit"
          title="Gross Profit"
          value={formatBDT(grossProfit)}
          changePercent={16.8}
          subtitle={`Margin: ${profitMargin}%`}
          color="amber"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          id="stat-product-cost"
          title="Product Cost"
          value={formatBDT(totalCost)}
          subtitle="Direct factory cost"
          color="rose"
          icon={<Receipt className="w-5 h-5 text-rose-400" />}
        />
        <StatCard
          id="stat-aov"
          title="Avg Order Value"
          value={formatBDT(aov)}
          subtitle="Per completed order"
          color="default"
          icon={<Percent className="w-5 h-5 text-zinc-300" />}
        />
      </div>

      {/* Order Status Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-zinc-900/60 border border-amber-500/20 rounded-xl p-3.5 hover:border-amber-500/40 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold">Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-['Outfit']">{pendingCount}</p>
          <span className="text-[10px] text-zinc-400">Awaiting confirmation</span>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-zinc-900/60 border border-sky-500/20 rounded-xl p-3.5 hover:border-sky-500/40 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-semibold">Processing</span>
            <Package className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-['Outfit']">{processingCount}</p>
          <span className="text-[10px] text-zinc-400">Custom kit printing</span>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-zinc-900/60 border border-indigo-500/20 rounded-xl p-3.5 hover:border-indigo-500/40 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-xs font-semibold">Shipped</span>
            <Truck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-['Outfit']">{shippedCount}</p>
          <span className="text-[10px] text-zinc-400">In courier transit</span>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-zinc-900/60 border border-emerald-500/20 rounded-xl p-3.5 hover:border-emerald-500/40 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold">Delivered</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-['Outfit']">{deliveredCount}</p>
          <span className="text-[10px] text-zinc-400">Completed sales</span>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-zinc-900/60 border border-rose-500/20 rounded-xl p-3.5 hover:border-rose-500/40 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold">Cancelled</span>
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-white mt-1 font-['Outfit']">{cancelledCount}</p>
          <span className="text-[10px] text-zinc-400">Void / Returned</span>
        </div>

        <div
          onClick={() => onNavigateTab('inventory')}
          className="bg-zinc-900/60 border border-rose-600/30 rounded-xl p-3.5 hover:border-rose-500/60 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400 mt-1 font-['Outfit']">
            {lowStockProducts.length}
          </p>
          <span className="text-[10px] text-zinc-400">&le; {lowStockThreshold} units remaining</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart orders={filteredOrders} />
        <ProfitChart orders={filteredOrders} />
      </div>

      {/* Quick Actions & Recent Orders Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
          <p className="text-xs text-zinc-400">Frequently used operations</p>
          <div className="space-y-2 pt-2">
            <button
              onClick={onOpenAddProduct}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add New Jersey Product</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            <button
              onClick={onOpenCustomOrder}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Create Custom / Phone Order</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Adjust Inventory & Stock</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Deep Profit & Revenue Analytics</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Latest Orders</h3>
                <p className="text-xs text-zinc-400">Recent customer and custom kit orders</p>
              </div>
              <button
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-zinc-800/80">
              {orders.slice(0, 4).map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-zinc-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{ord.order_number}</span>
                      <span className="text-xs text-zinc-300 font-medium">({ord.customer_name})</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {ord.items.map((it) => it.product_name).join(', ')}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-400">{formatBDT(ord.total_amount)}</p>
                    <span className="text-[10px] text-zinc-400 capitalize">{ord.order_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
