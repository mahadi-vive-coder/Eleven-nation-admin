import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { formatBDT } from '../../lib/utils';
import { Order } from '../../types';
import { useToast } from '../common/Toast';
import { X, CheckCircle2, ShieldCheck, Truck, Banknote, Phone, ArrowRight } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess
}) => {
  const { items, subtotal, customizationTotal, deliveryFee, deliveryCity, setDeliveryCity, total, checkout } = useCart();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad'>('cod');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showToast('Please fill in your name, delivery address, and active phone number.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await checkout({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: deliveryCity,
        notes: notes.trim(),
        paymentMethod
      });

      onOrderSuccess(order);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div>
            <h2 className="text-lg font-bold text-white font-['Outfit']">
              Complete Your Jersey Order
            </h2>
            <p className="text-xs text-zinc-400">
              Cash on Delivery & Mobile Banking across all 64 districts in Bangladesh
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Contact & Shipping */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              1. Delivery Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asif Mahmud"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Phone Number (For Courier) *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">City / Region *</label>
                <select
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Dhaka">Inside Dhaka (৳80 delivery)</option>
                  <option value="Outside Dhaka">Outside Dhaka (৳150 delivery)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Detailed Street Address *</label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, Road, Area, Thana / Post Office..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Order Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special delivery instructions or gate call..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
              2. Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'bg-amber-400/10 border-amber-400 text-white font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="sr-only"
                />
                <Banknote className="w-5 h-5 mb-1 text-amber-400" />
                <span className="text-xs">Cash on Delivery</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">Pay upon inspection</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'bkash'
                    ? 'bg-amber-400/10 border-amber-400 text-white font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="bkash"
                  checked={paymentMethod === 'bkash'}
                  onChange={() => setPaymentMethod('bkash')}
                  className="sr-only"
                />
                <span className="text-sm font-extrabold text-[#e2136e] mb-1 font-mono">bKash</span>
                <span className="text-xs">bKash Send Money</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">01712345678</span>
              </label>

              <label
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  paymentMethod === 'nagad'
                    ? 'bg-amber-400/10 border-amber-400 text-white font-bold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="nagad"
                  checked={paymentMethod === 'nagad'}
                  onChange={() => setPaymentMethod('nagad')}
                  className="sr-only"
                />
                <span className="text-sm font-extrabold text-[#f7941d] mb-1 font-mono">Nagad</span>
                <span className="text-xs">Nagad Payment</span>
                <span className="text-[10px] text-zinc-400 mt-0.5">01812345678</span>
              </label>
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>Jerseys ({items.reduce((s, it) => s + it.quantity, 0)} units):</span>
              <span className="text-white font-mono">{formatBDT(subtotal)}</span>
            </div>
            {customizationTotal > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Custom Name & Number Printing:</span>
                <span className="text-amber-400 font-mono">+{formatBDT(customizationTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400">
              <span>Delivery Fee ({deliveryCity}):</span>
              <span className="text-white font-mono">{formatBDT(deliveryFee)}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-2 font-bold text-sm text-white">
              <span>Total Payable Amount:</span>
              <span className="text-emerald-400 font-['Outfit'] text-base">{formatBDT(total)}</span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Placing Order...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Order ({formatBDT(total)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
