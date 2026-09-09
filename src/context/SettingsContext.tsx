import React, { createContext, useContext, useEffect, useState } from 'react';
import { StoreSettings } from '../types';
import { dataService } from '../services/dataService';

interface SettingsContextType {
  settings: StoreSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: 'Eleven Nation',
    currency_symbol: '৳',
    currency_code: 'BDT',
    business_timezone: 'Asia/Dhaka',
    low_stock_threshold: 5,
    default_delivery_inside_dhaka: 80,
    default_delivery_outside_dhaka: 150,
    default_customization_fee: 150,
    contact_phone: '+880 1712-345678',
    contact_email: 'elevennation.support@gmail.com',
    bkash_merchant_number: '01712345678',
    nagad_merchant_number: '01812345678'
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getSettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    const updated = await dataService.updateSettings(newSettings);
    setSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refreshSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
