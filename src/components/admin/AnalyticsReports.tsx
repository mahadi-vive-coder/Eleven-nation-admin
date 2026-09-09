import React, { useState, useMemo } from 'react';
import { Order, Product, Category, DateRange } from '../../types';
import { formatBDT, getDateRangeFromPreset, exportToCsv, isOrderFinanciallyCountable, calculateProfitMargin } from '../../lib/utils';
import { DateRangePicker } from '../common/DateRangePicker';
import { StatCard } from '../common/StatCard';
import { SalesChart } from './SalesChart';
import { ProfitChart } from './ProfitChart';
import {
  Download,
  DollarSign,
  TrendingUp,
  Receipt,
  Percent,
  Award,
  BarChart2,
  PieChart as PieIcon,
  Shirt
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { useToast } from '../common/Toast';

interface AnalyticsReportsProps {
  orders: Order[];
  products: Product[];
  categories: Category[];
}

export const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({
  orders,
  products,
  categories
}) => {
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPreset('30days'));

  // Filter orders in range using strict financial business rules
  const filteredOrders = useMemo(() => {
    const start = new Date(dateRange.startDate).getTime();
    const end = new Date(dateRange.endDate).getTime();
    return orders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= start && t <= end && isOrderFinanciallyCountable(o);
    });
  }, [orders, dateRange]);

  // Aggregate high-level financials
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalCost = filteredOrders.reduce((sum, o) => sum + o.total_cost, 0);
  const grossProfit = totalRevenue - totalCost;
  const marginPercent = calculateProfitMargin(totalRevenue, grossProfit).toFixed(1);
  const totalUnitsSold = filteredOrders.reduce((sum, o) => sum + o.items_count, 0);
  const aov = filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0;

  // Breakdown by Jersey Edition
  const editionBreakdown = useMemo(() => {
    const map: Record<string, { name: string; value: number; revenue: number }> = {
      'Fan Version': { name: 'Fan Version', value: 0, revenue: 0 },
      'Player Version': { name: 'Player Version', value: 0, revenue: 0 },
      'Retro': { name: 'Retro Classics', value: 0, revenue: 0 },
      'Special Edition': { name: 'Special Edition', value: 0, revenue: 0 }
    };

    filteredOrders.forEach((o) => {
      o.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.product_id);
        const ed = prod?.edition || 'Fan Version';
        if (!map[ed]) {
          map[ed] = { name: ed, value: 0, revenue: 0 };
        }
        map[ed].value += it.quantity;
        map[ed].revenue += it.subtotal;
      });
    });

    return Object.values(map).filter((item) => item.value > 0);
  }, [filteredOrders, products]);

  // Top 5 Best-Selling Jerseys by Quantity
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; units: number; revenue: number; profit: number }>();

    filteredOrders.forEach((o) => {
      o.items.forEach((it) => {
        const lineProfit = it.subtotal - (it.cost_price * it.quantity);
        if (map.has(it.product_id)) {
          const cur = map.get(it.product_id)!;
          cur.units += it.quantity;
          cur.revenue += it.subtotal;
          cur.profit += lineProfit;
        } else {
          map.set(it.product_id, {
            id: it.product_id,
            name: it.product_name,
            units: it.quantity,
            revenue: it.subtotal,
            profit: lineProfit
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [filteredOrders]);

  // Top 5 Most Profitable Jerseys
  const topProfitableProducts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; profit: number; revenue: number }>();

    filteredOrders.forEach((o) => {
      o.items.forEach((it) => {
        const lineProfit = it.subtotal - (it.cost_price * it.quantity);
        if (map.has(it.product_id)) {
          const cur = map.get(it.product_id)!;
          cur.profit += lineProfit;
          cur.revenue += it.subtotal;
        } else {
          map.set(it.product_id, {
            id: it.product_id,
            name: it.product_name,
            profit: lineProfit,
            revenue: it.subtotal
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [filteredOrders]);

  const COLORS = ['#f59e0b', '#10b981', '#38bdf8', '#c084fc', '#f43f5e'];

  const handleExportCSV = () => {
    const csvRows = filteredOrders.map((o) => ({
      Order_Number: o.order_number,
      Date: new Date(o.created_at).toISOString().slice(0, 10),
      Customer: o.customer_name,
      Phone: o.customer_phone,
      City: o.city,
      Status: o.order_status,
      Items_Count: o.items_count,
      Total_Amount_BDT: o.total_amount,
      Total_Cost_BDT: o.total_cost,
      Gross_Profit_BDT: o.gross_profit,
      Margin_Percent: o.profit_margin_percent,
      Payment_Method: o.payment_method,
      Payment_Status: o.payment_status
    }));

    exportToCsv(csvRows, `eleven_nation_financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Financial CSV export downloaded successfully.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Deep Analytics & Profit Intelligence
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit true unit economics, product cost baselines, and volume velocity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors border border-zinc-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Period Sales Revenue"
          value={formatBDT(totalRevenue)}
          subtitle={`${filteredOrders.length} orders in range`}
          color="emerald"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          title="Total Factory Cost"
          value={formatBDT(totalCost)}
          subtitle="Direct garment manufacture cost"
          color="rose"
          icon={<Receipt className="w-5 h-5 text-rose-400" />}
        />
        <StatCard
          title="Net Gross Profit"
          value={formatBDT(grossProfit)}
          subtitle={`Overall Profit Margin: ${marginPercent}%`}
          color="amber"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Average Order Value"
          value={formatBDT(aov)}
          subtitle={`${totalUnitsSold} jersey units sold`}
          color="blue"
          icon={<Percent className="w-5 h-5 text-blue-400" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart orders={filteredOrders} />
        <ProfitChart orders={filteredOrders} />
      </div>

      {/* Breakdown Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Edition Breakdown Pie */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Sales by Jersey Edition</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Fan Version vs Player Match vs Retro</p>

            <div className="h-56 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={editionBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {editionBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${val} jerseys (${formatBDT(item.payload.revenue)})`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            {editionBreakdown.map((ed, idx) => (
              <div key={ed.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-zinc-300 font-medium">{ed.name}</span>
                </div>
                <span className="font-bold text-white font-mono">{ed.value} units</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Best-Selling Jerseys */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Top 5 by Quantity Sold</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3">Highest volume club kits</p>

            <div className="space-y-3">
              {topSellingProducts.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-200 font-medium truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-white">{p.units} units</span>
                    <span className="text-[10px] text-emerald-400 block">{formatBDT(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 Most Profitable Jerseys */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Top 5 by Total Gross Profit</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3">Jerseys generating highest net profit</p>

            <div className="space-y-3">
              {topProfitableProducts.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-200 font-medium truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-amber-400">+{formatBDT(p.profit)}</span>
                    <span className="text-[10px] text-zinc-400 block">Sales: {formatBDT(p.revenue)}</span>
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
