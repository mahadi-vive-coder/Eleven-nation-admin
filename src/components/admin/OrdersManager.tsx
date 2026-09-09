import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { formatBDT, formatDateTime } from '../../lib/utils';
import { OrderStatusBadge, PaymentStatusBadge } from '../common/StatusBadge';
import {
  Search,
  Scissors,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  Truck,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { OrderDetailModal } from './OrderDetailModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface OrdersManagerProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, paymentStatus?: PaymentStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onAddAdminNote: (orderId: string, note: string) => Promise<void>;
  initialFilter?: string;
  onUpdateCourier?: (orderId: string, courierName: string, trackingNumber: string) => Promise<void>;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({
  orders,
  onUpdateStatus,
  onDeleteOrder,
  onAddAdminNote,
  initialFilter = 'all',
  onUpdateCourier
}) => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilter);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [customOnly, setCustomOnly] = useState(false);

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        ord.order_number.toLowerCase().includes(q) ||
        ord.customer_name.toLowerCase().includes(q) ||
        ord.customer_phone.includes(q) ||
        (ord.customer_email && ord.customer_email.toLowerCase().includes(q));

      const matchStatus = selectedStatus === 'all' || ord.order_status === selectedStatus;
      const matchPay = selectedPaymentStatus === 'all' || ord.payment_status === selectedPaymentStatus;

      const hasCustom = ord.items.some((it) => it.custom_name || it.custom_number);
      const matchCustom = !customOnly || hasCustom;

      return matchSearch && matchStatus && matchPay && matchCustom;
    });
  }, [orders, searchTerm, selectedStatus, selectedPaymentStatus, customOnly]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!isSuperAdmin) {
      showToast('Action Denied: Only super_admin can delete orders from database.', 'error');
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteOrder(deleteTarget.id);
      showToast(`Order #${deleteTarget.order_number} has been deleted.`, 'success');
      setDeleteTarget(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to delete order', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Order Management
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Process orders, manage courier dispatches, customize names & numbers ({orders.length} total)
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #, customer, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="customizing">Customizing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="pending">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="cod">COD</option>
              <option value="refunded">Refunded</option>
            </select>

            <label className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 cursor-pointer hover:border-amber-500 transition-colors">
              <input
                type="checkbox"
                checked={customOnly}
                onChange={(e) => setCustomOnly(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-amber-500"
              />
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Custom Printing Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Order # & Date</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Jerseys & Kit Printing</th>
                <th className="p-3.5">Order Total</th>
                <th className="p-3.5">Cost</th>
                <th className="p-3.5">Gross Profit</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-zinc-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const hasCustom = ord.items.some((it) => it.custom_name || it.custom_number);

                  return (
                    <tr key={ord.id} className="hover:bg-zinc-800/30 transition-colors group">
                      <td className="p-3.5 pl-4">
                        <span className="font-mono font-bold text-white block hover:text-amber-400 transition-colors">
                          {ord.order_number}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-zinc-400">
                            {formatDateTime(ord.created_at)}
                          </span>
                          {ord.is_custom_order && (
                            <span className="px-1.5 py-0.2 bg-purple-900/60 border border-purple-700/50 text-purple-300 rounded text-[9px] font-bold uppercase tracking-wider">
                              Custom Order
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-zinc-200 block">{ord.customer_name}</span>
                        <span className="text-zinc-400 text-[11px] font-mono">{ord.customer_phone}</span>
                        <span className="text-zinc-500 text-[10px] block">{ord.city}</span>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="space-y-1">
                          {ord.items.map((it, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-white font-medium truncate max-w-[140px]">
                                {it.quantity}x {it.product_name} ({it.size})
                              </span>
                              {(it.custom_name || it.custom_number) && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-mono text-[9px]">
                                  [{it.custom_name || ''} #{it.custom_number || ''}]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-white font-['Outfit']">
                        {formatBDT(ord.total_amount)}
                      </td>

                      <td className="p-3.5 text-rose-400 font-mono">
                        {formatBDT(ord.total_cost)}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-amber-400 font-['Outfit'] block">
                          +{formatBDT(ord.gross_profit)}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {ord.profit_margin_percent}% margin
                        </span>
                      </td>

                      <td className="p-3.5">
                        <OrderStatusBadge status={ord.order_status} />
                      </td>

                      <td className="p-3.5">
                        <PaymentStatusBadge status={ord.payment_status} />
                        <span className="block text-[10px] uppercase font-mono text-zinc-400 mt-0.5">
                          {ord.payment_method}
                        </span>
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setActiveOrder(ord)}
                            title="View order details & invoice"
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-zinc-800 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(ord)}
                            title={isSuperAdmin ? 'Delete order' : 'Requires Super Admin'}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={activeOrder}
        isOpen={Boolean(activeOrder)}
        onClose={() => setActiveOrder(null)}
        onUpdateStatus={onUpdateStatus}
        onAddAdminNote={onAddAdminNote}
        onUpdateCourier={onUpdateCourier}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Permanently Delete Order?"
        message={`Are you sure you want to delete order #${deleteTarget?.order_number}? This removes the record from database logs.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Order'}
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
