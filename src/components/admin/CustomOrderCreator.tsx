import React, { useState, useEffect } from 'react';
import { Product, Order, OrderItem, PaymentMethod, PaymentStatus } from '../../types';
import { formatBDT, generateOrderNumber, calculateProfitMargin } from '../../lib/utils';
import {
  Plus,
  Trash2,
  Scissors,
  Check,
  Calculator,
  User,
  MapPin,
  CreditCard,
  X
} from 'lucide-react';
import { useToast } from '../common/Toast';

interface CustomOrderCreatorProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onCreateOrder: (order: Omit<Order, 'id'>) => Promise<Order>;
}

interface CustomLineItem {
  id: string;
  productId: string | null;
  productName: string;
  sku: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  quantity: number;
  unitPrice: number;
  costPrice: number;
  customName: string;
  customNumber: string;
  customizationFee: number;
}

export const CustomOrderCreator: React.FC<CustomOrderCreatorProps> = ({
  products,
  isOpen,
  onClose,
  onCreateOrder
}) => {
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState<'Dhaka' | 'Chittagong' | 'Sylhet' | 'Rajshahi' | 'Khulna' | 'Other'>('Dhaka');
  const [orderSource, setOrderSource] = useState<'whatsapp' | 'facebook' | 'phone' | 'walk_in'>('whatsapp');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('cod');
  const [deliveryFee, setDeliveryFee] = useState(80);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState<CustomLineItem[]>([
    {
      id: '1',
      productId: products[0]?.id || null,
      productName: products[0]?.name || 'Real Madrid 24/25 Home Kit',
      sku: products[0]?.sku || 'RMA-2425-HME',
      size: 'L',
      quantity: 1,
      unitPrice: products[0]?.selling_price || 1550,
      costPrice: products[0]?.cost_price || 950,
      customName: '',
      customNumber: '',
      customizationFee: 150
    }
  ]);

  // Synchronize initial line item with loaded products when modal opens or products update
  useEffect(() => {
    if (isOpen && products.length > 0) {
      setLineItems((prev) => {
        const hasLegacyOrUnlinked = prev.some(
          (it) => it.productId === 'custom-item' || it.productId === 'custom' || (!it.productId && !it.productName)
        );
        if (hasLegacyOrUnlinked || prev.length === 0) {
          const first = products[0];
          return [
            {
              id: '1',
              productId: first.id,
              productName: first.name,
              sku: first.sku,
              size: 'L',
              quantity: 1,
              unitPrice: first.selling_price,
              costPrice: first.cost_price,
              customName: '',
              customNumber: '',
              customizationFee: first.customization_fee
            }
          ];
        }
        return prev;
      });
    }
  }, [isOpen, products]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCityChange = (newCity: any) => {
    setCity(newCity);
    setDeliveryFee(newCity === 'Dhaka' ? 80 : 150);
  };

  const handleProductSelect = (index: number, selectedValue: string) => {
    if (selectedValue === 'custom' || selectedValue === '') {
      setLineItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? {
                ...it,
                productId: null,
                productName: it.productName === products[0]?.name ? 'Custom Team Jersey' : it.productName,
                sku: 'CUSTOM',
                unitPrice: it.unitPrice || 1500,
                costPrice: it.costPrice || 900,
                customizationFee: it.customizationFee || 150
              }
            : it
        )
      );
      return;
    }

    const prod = products.find((p) => p.id === selectedValue);
    if (!prod) return;

    setLineItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              unitPrice: prod.selling_price,
              costPrice: prod.cost_price,
              customizationFee: prod.customization_fee
            }
          : it
      )
    );
  };

  const addLineItem = () => {
    const firstProd = products[0];
    setLineItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        productId: firstProd?.id || null,
        productName: firstProd?.name || 'Custom Team Jersey',
        sku: firstProd?.sku || 'CUSTOM',
        size: 'L',
        quantity: 1,
        unitPrice: firstProd?.selling_price || 1500,
        costPrice: firstProd?.cost_price || 900,
        customName: '',
        customNumber: '',
        customizationFee: firstProd?.customization_fee || 150
      }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      showToast('At least one item is required in the order.', 'error');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const customizationTotal = lineItems.reduce((sum, it) => {
    const hasCustom = Boolean(it.customName.trim() || it.customNumber.trim());
    return sum + (hasCustom ? it.customizationFee * it.quantity : 0);
  }, 0);
  const totalCost = lineItems.reduce((sum, it) => sum + it.costPrice * it.quantity, 0);
  const totalAmount = Math.max(0, subtotal + customizationTotal + deliveryFee - discount);
  const grossProfit = totalAmount - totalCost;
  const profitMargin = calculateProfitMargin(totalAmount, grossProfit).toFixed(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim()) {
      showToast('Please provide customer name, phone number, and address.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      const orderItems: OrderItem[] = lineItems.map((it) => {
        const hasCustom = Boolean(it.customName.trim() || it.customNumber.trim());
        const customFee = hasCustom ? it.customizationFee : 0;
        return {
          product_id: it.productId,
          product_name: it.productName,
          sku: it.sku,
          size: it.size,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          cost_price: it.costPrice, // Historical cost locked
          customization_fee: customFee,
          custom_name: it.customName.trim() || undefined,
          custom_number: it.customNumber.trim() || undefined,
          subtotal: (it.unitPrice + customFee) * it.quantity
        };
      });

      const newOrder = await onCreateOrder({
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim(),
        city,
        items: orderItems,
        items_count: orderItems.reduce((sum, it) => sum + it.quantity, 0),
        subtotal,
        customization_total: customizationTotal,
        delivery_fee: deliveryFee,
        discount,
        total_amount: totalAmount,
        total_cost: totalCost,
        gross_profit: grossProfit,
        profit_margin_percent: Number(profitMargin),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        order_status: 'confirmed',
        customer_notes: `Source: ${orderSource.toUpperCase()}. ${notes}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      showToast(`Manual Order #${newOrder.order_number} created successfully!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create manual order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white font-['Outfit']">
                Create Manual / Custom Kit Order
              </h2>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold uppercase">
                Admin POS
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Take orders via WhatsApp, Facebook, or phone call with customized player printing
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Customer & Order Source */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Customer Information & Channel</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Order Source *</label>
                <select
                  value={orderSource}
                  onChange={(e) => setOrderSource(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="whatsapp">WhatsApp Order</option>
                  <option value="facebook">Facebook Messenger</option>
                  <option value="phone">Direct Phone Call</option>
                  <option value="walk_in">Walk-in Showroom</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@gmail.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-zinc-300 font-semibold mb-1">Shipping Address *</label>
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="House, Road, Area details..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Delivery City</label>
                <select
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Dhaka">Dhaka (৳80 delivery)</option>
                  <option value="Chittagong">Chittagong (৳150)</option>
                  <option value="Sylhet">Sylhet (৳150)</option>
                  <option value="Rajshahi">Rajshahi (৳150)</option>
                  <option value="Khulna">Khulna (৳150)</option>
                  <option value="Other">Other City (৳150)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                <span>Jersey Items & Custom Kit Details</span>
              </h3>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Jersey</span>
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 bg-zinc-950/90 border border-zinc-800 rounded-xl space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-zinc-400 font-medium mb-1">Select Jersey</label>
                      <select
                        value={item.productId || 'custom'}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stock})
                          </option>
                        ))}
                        <option value="custom">✨ Made-to-Order Custom Kit (No Stock Link)</option>
                      </select>
                      {!item.productId && (
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLineItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, productName: val } : it))
                            );
                          }}
                          placeholder="Kit / Custom Jersey Name..."
                          className="mt-1.5 w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-zinc-400 font-medium mb-1">Size</label>
                      <select
                        value={item.size}
                        onChange={(e) => {
                          const sz = e.target.value as any;
                          setLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, size: sz } : it))
                          );
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-white font-bold"
                      >
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-zinc-400 font-medium mb-1">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const q = Math.max(1, Number(e.target.value));
                          setLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, quantity: q } : it))
                          );
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-center font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-zinc-400 font-medium mb-1">Selling Price (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const up = Number(e.target.value);
                          setLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, unitPrice: up } : it))
                          );
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-emerald-400 font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-zinc-400 font-medium mb-1">Cost (৳)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) => {
                            const cp = Number(e.target.value);
                            setLineItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, costPrice: cp } : it))
                            );
                          }}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-rose-400 font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(idx)}
                        className="p-2 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Custom Name and Number */}
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[11px] text-zinc-400 mb-0.5">Player Name on Back</label>
                      <input
                        type="text"
                        value={item.customName}
                        onChange={(e) => {
                          const cn = e.target.value.toUpperCase();
                          setLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, customName: cn } : it))
                          );
                        }}
                        placeholder="e.g. MODRIC"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white uppercase font-mono font-bold"
                      />
                    </div>

                    <div className="w-24">
                      <label className="block text-[11px] text-zinc-400 mb-0.5">Number</label>
                      <input
                        type="text"
                        value={item.customNumber}
                        onChange={(e) => {
                          const cnum = e.target.value;
                          setLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, customNumber: cnum } : it))
                          );
                        }}
                        placeholder="10"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-center font-mono font-bold"
                      />
                    </div>

                    <div className="w-32">
                      <label className="block text-[11px] text-zinc-400 mb-0.5">Printing Fee (৳)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.customizationFee}
                        onChange={(e) => {
                          const cf = Number(e.target.value);
                          setLineItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, customizationFee: cf } : it))
                          );
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-amber-400 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Delivery Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Payment & Shipping Settings</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="cod">Cash on Delivery</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="pending">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="cod">COD</option>
                    <option value="partial">Partial Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Delivery Fee (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-medium mb-1">Discount (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">Internal Order Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. customer requested express delivery"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            {/* Live Profit Audit Card */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Real-time Financial Audit</span>
                </h3>

                <div className="space-y-1.5 pt-2 text-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Jerseys Subtotal:</span>
                    <span className="font-semibold text-white">{formatBDT(subtotal)}</span>
                  </div>
                  {customizationTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Custom Kit Printing:</span>
                      <span className="font-semibold text-amber-400">+{formatBDT(customizationTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Delivery Fee:</span>
                    <span className="font-semibold text-white">{formatBDT(deliveryFee)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Discount:</span>
                      <span>-{formatBDT(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-zinc-800 pt-1.5 font-bold text-sm text-white">
                    <span>Total Order Value:</span>
                    <span className="text-emerald-400 font-['Outfit'] text-base">{formatBDT(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Gross profit calculation */}
              <div className="mt-4 p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Total Product Cost:</span>
                  <span className="text-rose-400 font-semibold">{formatBDT(totalCost)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-1">
                  <span className="text-zinc-200">Expected Profit:</span>
                  <span className="text-amber-400 font-['Outfit'] text-base">+{formatBDT(grossProfit)}</span>
                </div>
                <div className="flex justify-between text-[11px] mt-1 pt-1 border-t border-zinc-800 text-zinc-400">
                  <span>Gross Margin %:</span>
                  <span className="text-emerald-400 font-bold">{profitMargin}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isSubmitting ? (
                <span>Submitting Order...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & Create Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
