import React from 'react';
import { OrderStatus, PaymentStatus } from '../../types';
import {
  Clock,
  CheckCircle2,
  Package,
  Scissors,
  Truck,
  CheckCheck,
  XCircle,
  RotateCcw,
  CreditCard,
  Banknote,
  AlertCircle
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<OrderStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
    pending: {
      label: 'Pending',
      icon: <Clock className="w-3 h-3" />,
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20'
    },
    confirmed: {
      label: 'Confirmed',
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20'
    },
    processing: {
      label: 'Processing',
      icon: <Package className="w-3 h-3" />,
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/20'
    },
    customizing: {
      label: 'Customizing',
      icon: <Scissors className="w-3 h-3" />,
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20'
    },
    shipped: {
      label: 'Shipped',
      icon: <Truck className="w-3 h-3" />,
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/20'
    },
    delivered: {
      label: 'Delivered',
      icon: <CheckCheck className="w-3 h-3" />,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20'
    },
    cancelled: {
      label: 'Cancelled',
      icon: <XCircle className="w-3 h-3" />,
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20'
    },
    returned: {
      label: 'Returned',
      icon: <RotateCcw className="w-3 h-3" />,
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      border: 'border-zinc-500/20'
    }
  };

  const c = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border} ${className}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, className = '' }) => {
  const configs: Record<PaymentStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
    pending: {
      label: 'Unpaid',
      icon: <Clock className="w-3 h-3" />,
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20'
    },
    paid: {
      label: 'Paid',
      icon: <CheckCircle2 className="w-3 h-3" />,
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20'
    },
    cod: {
      label: 'COD',
      icon: <Banknote className="w-3 h-3" />,
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20'
    },
    partial: {
      label: 'Partial',
      icon: <CreditCard className="w-3 h-3" />,
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/20'
    },
    failed: {
      label: 'Failed',
      icon: <AlertCircle className="w-3 h-3" />,
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20'
    },
    refunded: {
      label: 'Refunded',
      icon: <RotateCcw className="w-3 h-3" />,
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      border: 'border-zinc-500/20'
    }
  };

  const c = configs[status] || configs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border} ${className}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};
