import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, OrderItem, Order } from '../types';
import { dataService } from '../services/dataService';
import { generateOrderNumber } from '../lib/utils';

export interface CartItem {
  id: string; // unique cart entry key: `${productId}-${size}-${customName}-${customNumber}`
  product: Product;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  quantity: number;
  customName?: string;
  customNumber?: string;
  unitPrice: number;
  costPrice: number;
  customizationFee: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  customizationTotal: number;
  deliveryFee: number;
  deliveryCity: 'Dhaka' | 'Outside Dhaka';
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  setDeliveryCity: (city: 'Dhaka' | 'Outside Dhaka') => void;
  addItem: (product: Product, size: 'S' | 'M' | 'L' | 'XL' | 'XXL', quantity: number, customName?: string, customNumber?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  checkout: (customerData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
    paymentMethod: 'cod' | 'bkash' | 'nagad';
  }) => Promise<Order>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_CART_KEY = 'eleven_nation_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CART_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [deliveryCity, setDeliveryCity] = useState<'Dhaka' | 'Outside Dhaka'>('Dhaka');
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const deliveryFee = deliveryCity === 'Dhaka' ? 80 : 150;

  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotal = items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0);
  const customizationTotal = items.reduce((sum, it) => sum + (it.customizationFee * it.quantity), 0);
  const total = subtotal + customizationTotal + deliveryFee;

  const addItem = (
    product: Product,
    size: 'S' | 'M' | 'L' | 'XL' | 'XXL',
    quantity: number,
    customName?: string,
    customNumber?: string
  ) => {
    const trimmedName = customName?.trim() || '';
    const trimmedNumber = customNumber?.trim() || '';
    const hasCustom = Boolean(trimmedName || trimmedNumber);
    const customFee = hasCustom ? product.customization_fee : 0;
    const cartItemId = `${product.id}-${size}-${trimmedName}-${trimmedNumber}`;

    setItems((prev) => {
      const existing = prev.find((it) => it.id === cartItemId);
      if (existing) {
        return prev.map((it) =>
          it.id === cartItemId ? { ...it, quantity: it.quantity + quantity } : it
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          product,
          size,
          quantity,
          customName: trimmedName || undefined,
          customNumber: trimmedNumber || undefined,
          unitPrice: product.selling_price,
          costPrice: product.cost_price,
          customizationFee: customFee
        }
      ];
    });
    setIsCartOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.id === cartItemId ? { ...it, quantity } : it))
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem(LOCAL_CART_KEY);
  };

  const checkout = async (customerData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
    paymentMethod: 'cod' | 'bkash' | 'nagad';
  }): Promise<Order> => {
    if (items.length === 0) {
      throw new Error('Cart is empty');
    }

    const orderItems: OrderItem[] = items.map((it) => ({
      product_id: it.product.id,
      product_name: it.product.name,
      product_image: it.product.images[0] || '',
      sku: it.product.sku,
      size: it.size,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      cost_price: it.costPrice, // Store historical cost price!
      customization_fee: it.customizationFee,
      custom_name: it.customName,
      custom_number: it.customNumber,
      subtotal: (it.unitPrice + it.customizationFee) * it.quantity
    }));

    const orderNumber = generateOrderNumber();

    const newOrder = await dataService.createOrder({
      order_number: orderNumber,
      customer_name: customerData.name,
      customer_email: customerData.email,
      customer_phone: customerData.phone,
      shipping_address: customerData.address,
      city: customerData.city,
      items: orderItems,
      items_count: orderItems.reduce((sum, it) => sum + it.quantity, 0),
      subtotal,
      customization_total: customizationTotal,
      delivery_fee: deliveryFee,
      discount: 0,
      total_amount: total,
      total_cost: orderItems.reduce((sum, it) => sum + (it.cost_price * it.quantity), 0),
      gross_profit: 0, // will be computed in createOrder
      profit_margin_percent: 0,
      payment_method: customerData.paymentMethod,
      payment_status: customerData.paymentMethod === 'cod' ? 'cod' : 'pending',
      order_status: 'pending',
      customer_notes: customerData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    clearCart();
    return newOrder;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        customizationTotal,
        deliveryFee,
        deliveryCity,
        total,
        isCartOpen,
        setIsCartOpen,
        setDeliveryCity,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        checkout
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
