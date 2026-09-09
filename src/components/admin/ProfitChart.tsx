import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Order } from '../../types';
import { formatBDT, isOrderFinanciallyCountable, calculateProfitMargin } from '../../lib/utils';

interface ProfitChartProps {
  orders: Order[];
}

export const ProfitChart: React.FC<ProfitChartProps> = ({ orders }) => {
  // Aggregate by last 7 days or weeks
  const dateMap = new Map<string, { date: string; revenue: number; cost: number; profit: number }>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    dateMap.set(key, { date: key, revenue: 0, cost: 0, profit: 0 });
  }

  orders.forEach((ord) => {
    if (!isOrderFinanciallyCountable(ord)) return;
    const d = new Date(ord.created_at);
    const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    if (dateMap.has(key)) {
      const cur = dateMap.get(key)!;
      cur.revenue += ord.total_amount;
      cur.cost += ord.total_cost;
      cur.profit += ord.gross_profit;
    } else {
      dateMap.set(key, {
        date: key,
        revenue: ord.total_amount,
        cost: ord.total_cost,
        profit: ord.gross_profit
      });
    }
  });

  const chartData = Array.from(dateMap.values());

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const margin = calculateProfitMargin(item.revenue, item.profit).toFixed(1);
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">{label}</p>
          <p className="text-emerald-400">Total Revenue: {formatBDT(item.revenue)}</p>
          <p className="text-rose-400">Product Cost: {formatBDT(item.cost)}</p>
          <p className="text-amber-400 font-bold">Gross Profit: {formatBDT(item.profit)}</p>
          <p className="text-zinc-400">Margin: {margin}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Profit Analysis: Revenue vs Cost vs Profit</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Calculated strictly from product cost prices and actual selling totals</p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
            <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(val) => `৳${val}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cost" name="Product Cost" fill="#f43f5e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="profit" name="Gross Profit" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
