import React, { useState } from 'react';
import { Order, OrderStatus, PaymentStatus } from '../../types';
import { formatBDT, formatDateTime } from '../../lib/utils';
import { OrderStatusBadge, PaymentStatusBadge } from '../common/StatusBadge';
import {
  X,
  Printer,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus, paymentStatus?: PaymentStatus) => Promise<void>;
  onAddAdminNote: (orderId: string, note: string) => Promise<void>;
  onUpdateCourier?: (orderId: string, courierName: string, trackingNumber: string) => Promise<void>;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdateStatus,
  onAddAdminNote,
  onUpdateCourier
}) => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [courierNameInput, setCourierNameInput] = useState(order?.courier_name || 'Steadfast');
  const [trackingInput, setTrackingInput] = useState(order?.tracking_number || '');
  const [isSavingCourier, setIsSavingCourier] = useState(false);

  // Sync inputs when order changes
  React.useEffect(() => {
    if (order) {
      setCourierNameInput(order.courier_name || 'Steadfast');
      setTrackingInput(order.tracking_number || '');
    }
  }, [order?.id]);

  if (!isOpen || !order) return null;

  const handleSaveCourier = async () => {
    if (!onUpdateCourier) return;
    setIsSavingCourier(true);
    try {
      await onUpdateCourier(order.id, courierNameInput, trackingInput);
      showToast('Courier & tracking details updated.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update courier', 'error');
    } finally {
      setIsSavingCourier(false);
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      // If setting to delivered, also set payment to paid if COD
      let newPaymentStatus: PaymentStatus | undefined = undefined;
      if (newStatus === 'delivered' && order.payment_status === 'cod') {
        newPaymentStatus = 'paid';
      }
      await onUpdateStatus(order.id, newStatus, newPaymentStatus);
      showToast(`Order status updated to "${newStatus}".`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update order status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentStatusChange = async (newPay: PaymentStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, order.order_status, newPay);
      showToast(`Payment status updated to "${newPay}".`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to update payment status', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNote = async () => {
    if (!adminNoteInput.trim()) return;
    try {
      await onAddAdminNote(order.id, adminNoteInput.trim());
      setAdminNoteInput('');
      showToast('Admin note added.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to add note', 'error');
    }
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up blocked. Please allow pop-ups to print invoices.', 'error');
      return;
    }

    const itemsRows = order.items
      .map(
        (it) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${it.product_name}</strong>
          ${it.custom_name || it.custom_number ? `<br/><span style="color:#d97706; font-size:12px;">Custom Kit: [${it.custom_name || 'NO NAME'} #${it.custom_number || '00'}]</span>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${it.size}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${it.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">৳${it.unit_price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">৳${it.customization_fee}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">৳${it.subtotal}</td>
      </tr>
    `
      )
      .join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.order_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; max-width: 800px; margin: auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 900; letter-spacing: 1px; }
          .badge { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { background: #f9fafb; padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; }
          .totals { margin-top: 24px; float: right; width: 300px; font-size: 14px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .grand-total { border-top: 2px solid #111827; font-weight: bold; font-size: 16px; margin-top: 8px; padding-top: 8px; }
          .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">ELEVEN NATION</div>
            <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Premium Football Jersey House</div>
            <div style="font-size: 12px; color: #6b7280;">Dhaka, Bangladesh • elevennation.support@gmail.com</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0 0 6px 0; font-size: 20px;">INVOICE</h2>
            <div style="font-family: monospace; font-weight: bold; font-size: 14px;">${order.order_number}</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Date: ${new Date(order.created_at).toLocaleDateString('en-GB')}</div>
            <span class="badge">${order.payment_method.toUpperCase()} • ${order.order_status.toUpperCase()}</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; gap: 40px; margin-bottom: 24px;">
          <div>
            <div class="section-title">Bill To / Deliver To:</div>
            <div style="font-weight: bold; font-size: 15px;">${order.customer_name}</div>
            <div style="font-size: 13px; color: #4b5563; margin-top: 2px;">${order.shipping_address}</div>
            <div style="font-size: 13px; color: #4b5563;">City: ${order.city}</div>
            <div style="font-size: 13px; color: #4b5563;">Phone: ${order.customer_phone}</div>
            <div style="font-size: 13px; color: #4b5563;">Email: ${order.customer_email || 'N/A'}</div>
          </div>
          ${order.customer_notes ? `
          <div style="max-width: 250px;">
            <div class="section-title">Order Notes:</div>
            <div style="font-size: 13px; background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
              ${order.customer_notes}
            </div>
          </div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align: center;">Size</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Custom Kit</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row"><span>Subtotal:</span><span>৳${order.subtotal}</span></div>
          ${order.customization_total ? `<div class="total-row"><span>Custom Kit Total:</span><span>৳${order.customization_total}</span></div>` : ''}
          <div class="total-row"><span>Delivery Fee:</span><span>৳${order.delivery_fee}</span></div>
          ${order.discount ? `<div class="total-row" style="color: #ef4444;"><span>Discount:</span><span>-৳${order.discount}</span></div>` : ''}
          <div class="total-row grand-total"><span>Total Payable:</span><span>৳${order.total_amount}</span></div>
        </div>

        <div style="clear: both;"></div>

        <div class="footer">
          Thank you for choosing Eleven Nation! Official Match & Fan Kits.<br/>
          For exchange or support inquiries within 3 days, contact +880 1712-345678.
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  const hasCustomization = order.items.some((it) => it.custom_name || it.custom_number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-mono">{order.order_number}</h2>
                <OrderStatusBadge status={order.order_status} />
                <PaymentStatusBadge status={order.payment_status} />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Placed on {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors border border-zinc-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Status Workflow Controls */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-zinc-300 block">Manage Status</span>
                <span className="text-[11px] text-zinc-400">
                  Select next milestone in fulfilment pipeline
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['pending', 'confirmed', 'processing', 'customizing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((st) => {
                  const isCurrent = order.order_status === st;
                  return (
                    <button
                      key={st}
                      disabled={isUpdating || isCurrent}
                      onClick={() => handleStatusChange(st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                        isCurrent
                          ? 'bg-amber-400 text-black font-bold'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment status dropdown */}
            <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-zinc-400">Payment Status:</span>
              <div className="flex items-center gap-2">
                {(['pending', 'paid', 'cod', 'refunded'] as PaymentStatus[]).map((pay) => (
                  <button
                    key={pay}
                    disabled={isUpdating || order.payment_status === pay}
                    onClick={() => handlePaymentStatusChange(pay)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      order.payment_status === pay
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pay}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Customer & Delivery</span>
              </h3>
              <p className="font-bold text-white text-sm">{order.customer_name}</p>
              <div className="space-y-1 text-zinc-300">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <a href={`tel:${order.customer_phone}`} className="hover:text-amber-400">
                    {order.customer_phone}
                  </a>
                </p>
                {order.customer_email && (
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{order.customer_email}</span>
                  </p>
                )}
                <p className="text-zinc-400 pt-1">
                  <strong>Delivery Address:</strong> {order.shipping_address}, {order.city}
                </p>
                {order.customer_notes && (
                  <div className="mt-2 p-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-300">
                    <strong className="text-amber-400 block text-[10px] uppercase">Notes:</strong>
                    {order.customer_notes}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary & Profit Breakdown */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Financial & Profit Audit</span>
              </h3>
              <div className="space-y-1.5 pt-1 text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Retail Items Subtotal:</span>
                  <span className="font-semibold text-white">{formatBDT(order.subtotal)}</span>
                </div>
                {order.customization_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Custom Kit Printing:</span>
                    <span className="font-semibold text-amber-400">+{formatBDT(order.customization_total)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Delivery ({order.city}):</span>
                  <span className="font-semibold text-white">{formatBDT(order.delivery_fee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount:</span>
                    <span>-{formatBDT(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-zinc-800 pt-1 font-bold text-sm text-white">
                  <span>Total Payable:</span>
                  <span className="text-emerald-400 font-['Outfit']">{formatBDT(order.total_amount)}</span>
                </div>

                {/* Profit analysis */}
                <div className="mt-3 p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-lg space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Factory Cost (Historical):</span>
                    <span className="text-rose-400 font-medium">{formatBDT(order.total_cost)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-zinc-300">Net Gross Profit:</span>
                    <span className="text-amber-400 font-['Outfit']">+{formatBDT(order.gross_profit)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Gross Margin:</span>
                    <span className="text-emerald-400 font-semibold">{order.profit_margin_percent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              Ordered Jerseys & Printing ({order.items.length} lines)
            </h3>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-[10px] uppercase font-semibold">
                    <th className="p-3">Jersey</th>
                    <th className="p-3 text-center">Size</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3">Kit Print Details</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {it.product_image && (
                            <img
                              src={it.product_image}
                              alt=""
                              className="w-9 h-9 rounded object-cover bg-zinc-900 border border-zinc-800"
                            />
                          )}
                          <div>
                            <span className="font-semibold text-white block">{it.product_name}</span>
                            <span className="text-[10px] font-mono text-zinc-400">{it.sku}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center font-bold text-amber-400">{it.size}</td>
                      <td className="p-3 text-center font-bold text-white">{it.quantity}</td>

                      <td className="p-3">
                        {it.custom_name || it.custom_number ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                            <Scissors className="w-3 h-3 text-amber-400" />
                            <span>
                              {it.custom_name || 'NO NAME'} #{it.custom_number || '00'}
                            </span>
                            <span className="text-[10px] text-amber-400 font-normal">
                              (+{formatBDT(it.customization_fee)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Standard (Plain)</span>
                        )}
                      </td>

                      <td className="p-3 text-right text-white font-medium">{formatBDT(it.unit_price)}</td>
                      <td className="p-3 text-right text-rose-400 font-medium">{formatBDT(it.cost_price)}</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">{formatBDT(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Courier Dispatch & Tracking Section */}
          <div className="space-y-3 p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Courier Dispatch & Tracking</span>
              </span>
              {order.tracking_number && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Consignment: {order.tracking_number}
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Courier Partner</label>
                <select
                  value={courierNameInput}
                  onChange={(e) => setCourierNameInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Steadfast">Steadfast Courier</option>
                  <option value="Pathao">Pathao Courier</option>
                  <option value="RedX">RedX Delivery</option>
                  <option value="Paperfly">Paperfly</option>
                  <option value="Sundarban">Sundarban Courier</option>
                  <option value="SA Paribahan">SA Paribahan</option>
                  <option value="In-House Dhaka Rider">In-House Dhaka Rider</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Tracking Code / CN #</label>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="e.g. STDF-894210"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isSavingCourier}
                  onClick={handleSaveCourier}
                  className="w-full py-1.5 px-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-xs font-bold rounded-lg transition-colors"
                >
                  {isSavingCourier ? 'Saving...' : 'Update Courier Info'}
                </button>
              </div>
            </div>
          </div>

          {/* Admin Notes Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Internal Admin Notes</span>
            </h3>

            {order.admin_notes && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 text-xs whitespace-pre-wrap">
                {order.admin_notes}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Add private note (e.g. called customer, confirmed custom print name)..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
