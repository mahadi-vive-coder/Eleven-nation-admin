import React from 'react';
import { PackageOpen } from 'lucide-react';

export const LoadingSkeleton: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 w-full bg-zinc-800/40 border border-zinc-800/50 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = <PackageOpen className="w-10 h-10 text-zinc-500" />
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
      <div className="p-4 bg-zinc-800/50 rounded-full text-zinc-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-zinc-200">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 text-sm font-medium text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
