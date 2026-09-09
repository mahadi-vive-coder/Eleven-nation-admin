import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Order } from '../../types';
import { formatBDT, isOrderFinanciallyCountable } from '../../lib/utils';

interface SalesChartProps {
  orders: Order[];
}

export const SalesChart: React.FC<SalesChartProps> = ({ orders }) => {
  const [chartType, setChartType] = useState<'revenue' | 'orders' | 'units'>('revenue');

  // Group orders by date (last 14 days or by date found in orders)
  const dateMap = new Map<string, { date: string; revenue: number; orders: number; units: number }>();

  // Fill last 14 days with 0 so chart has continuous timeline
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateMap.set(dateKey, { date: dateKey, revenue: 0, orders: 0, units: 0 });
  }

  // Aggregate valid orders per strict financial business rules
  orders.forEach((ord) => {
    if (!isOrderFinanciallyCountable(ord)) return;
    const d = new Date(ord.created_at);
    const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (dateMap.has(dateKey)) {
      const cur = dateMap.get(dateKey)!;
      cur.revenue += ord.total_amount;
      cur.orders += 1;
      cur.units += ord.items_count || 1;
    } else {
      dateMap.set(dateKey, {
        date: dateKey,
        revenue: ord.total_amount,
        orders: 1,
        units: ord.items_count || 1
      });
    }
  });

  const chartData = Array.from(dateMap.values());

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-zinc-900/95 border border-zinc-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">{label}</p>
          <p className="text-emerald-400 font-medium">Revenue: {formatBDT(item.revenue)}</p>
          <p className="text-sky-400 font-medium">Orders: {item.orders}</p>
          <p className="text-purple-400 font-medium">Units Sold: {item.units} jerseys</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Sales & Orders Velocity</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time revenue, orders count and jersey units over time</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-lg border border-zinc-700/50">
          <button
            type="button"
            onClick={() => setChartType('revenue')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'revenue' ? 'bg-amber-400 text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setChartType('orders')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'orders' ? 'bg-amber-400 text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setChartType('units')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              chartType === 'units' ? 'bg-amber-400 text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Units Sold
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'revenue' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `৳${val}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={chartType === 'orders' ? 'orders' : 'units'}
                fill={chartType === 'orders' ? '#38bdf8' : '#c084fc'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
