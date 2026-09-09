import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  changePercent?: number;
  comparisonText?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'default';
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  changePercent,
  comparisonText = 'vs previous period',
  icon,
  subtitle,
  trend,
  color = 'default'
}) => {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    default: 'bg-zinc-800/10 text-zinc-300 border-zinc-700/30'
  };

  const isPositive = trend === 'up' || (changePercent !== undefined && changePercent > 0);
  const isNegative = trend === 'down' || (changePercent !== undefined && changePercent < 0);

  return (
    <div
      id={id}
      className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Outfit',sans-serif]">
          {value}
        </span>
      </div>

      {(changePercent !== undefined || comparisonText || subtitle) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          {changePercent !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : isNegative
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-zinc-700/30 text-zinc-400'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : isNegative ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {isPositive ? '+' : ''}{changePercent}%
            </span>
          )}
          <span className="text-zinc-400 truncate">
            {subtitle || comparisonText}
          </span>
        </div>
      )}
    </div>
  );
};
