import React, { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Settings, Save, ShieldCheck, Banknote, MapPin, Phone, Mail } from 'lucide-react';

export const StoreSettingsManager: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { isSuperAdmin, role } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('Action Denied: Only super_admin can modify store parameters.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings(formData);
      showToast('Store settings saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
          Store Settings & Parameters
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure financial baselines, delivery charges, payment numbers, and inventory thresholds
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* General Store Identity */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>Store Identity & Contact Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Store Name</label>
              <input
                type="text"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Official Support Email</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Customer Care Phone</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Localization */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            <span>Currency & Regional Localization</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-base font-bold font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Currency ISO Code</label>
              <input
                type="text"
                value={formData.currency_code}
                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Business Timezone</label>
              <input
                type="text"
                readOnly
                value={formData.business_timezone}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Delivery & Custom Printing Pricing */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Logistics & Custom Kit Fees (BDT ৳)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Delivery Inside Dhaka (৳)</label>
              <input
                type="number"
                min="0"
                value={formData.default_delivery_inside_dhaka}
                onChange={(e) =>
                  setFormData({ ...formData, default_delivery_inside_dhaka: Number(e.target.value) })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Delivery Outside Dhaka (৳)</label>
              <input
                type="number"
                min="0"
                value={formData.default_delivery_outside_dhaka}
                onChange={(e) =>
                  setFormData({ ...formData, default_delivery_outside_dhaka: Number(e.target.value) })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Jersey Customization Fee (৳)
              </label>
              <input
                type="number"
                min="0"
                value={formData.default_customization_fee}
                onChange={(e) =>
                  setFormData({ ...formData, default_customization_fee: Number(e.target.value) })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-amber-400 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateways / Mobile Banking */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>Mobile Banking Merchant / Personal Numbers</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">bKash Merchant / Personal No.</label>
              <input
                type="text"
                value={formData.bkash_merchant_number}
                onChange={(e) => setFormData({ ...formData, bkash_merchant_number: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Nagad Merchant / Personal No.</label>
              <input
                type="text"
                value={formData.nagad_merchant_number}
                onChange={(e) => setFormData({ ...formData, nagad_merchant_number: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Inventory Reorder Alert Level */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Warehouse Inventory Control</span>
          </h3>

          <div className="max-w-xs">
            <label className="block text-zinc-300 font-semibold mb-1">
              Low Stock Alert Threshold (Units)
            </label>
            <input
              type="number"
              min="1"
              value={formData.low_stock_threshold}
              onChange={(e) =>
                setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-rose-400 font-bold font-mono"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Jerseys with stock &le; this number trigger warning badges and re-order reminders.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!isSuperAdmin && (
            <span className="text-xs text-rose-400 font-medium">
              Super Administrator privileges are required to modify system store configuration.
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving || !isSuperAdmin}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Parameters...' : 'Save Store Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
