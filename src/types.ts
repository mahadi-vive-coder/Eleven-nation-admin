export type UserRole = 'customer' | 'admin' | 'super_admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  product_count?: number;
  total_sales?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SizeInventory {
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  stock: number;
}

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  category_name?: string;
  club?: string;
  season?: string;
  edition?: 'Player Version' | 'Fan Version' | 'Retro' | 'Special Edition';
  sku: string;
  description: string;
  short_description?: string;
  selling_price: number;
  compare_at_price?: number;
  cost_price: number;
  stock: number;
  sizes: SizeInventory[];
  images: string[];
  is_featured: boolean;
  is_trending: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  status: ProductStatus;
  allow_custom_name: boolean;
  allow_custom_number: boolean;
  customization_fee: number;
  created_at?: string;
  updated_at?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'customizing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'partial'
  | 'failed'
  | 'refunded'
  | 'cod';

export interface OrderCustomization {
  player_name?: string;
  player_number?: string;
  badge?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id?: string | null;
  product_name: string;
  product_image?: string;
  sku?: string;
  size: string;
  quantity: number;
  unit_price: number;
  cost_price: number; // Historical cost price for accurate profit calculation
  customization_fee: number;
  custom_name?: string;
  custom_number?: string;
  subtotal: number;
}

export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'card' | 'bank';

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  postal_code?: string;
  items: OrderItem[];
  items_count: number;
  subtotal: number;
  customization_total: number;
  delivery_fee: number;
  discount: number;
  total_amount: number;
  total_cost: number;
  gross_profit: number;
  profit_margin_percent: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  courier_name?: string;
  tracking_number?: string;
  admin_notes?: string;
  customer_notes?: string;
  is_custom_order?: boolean;
  created_at: string;
  updated_at: string;
}

export type InventoryTransactionType =
  | 'purchase'
  | 'sale'
  | 'adjustment'
  | 'return'
  | 'damage';

export interface InventoryTransaction {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  size?: string;
  type: InventoryTransactionType;
  quantity: number; // positive or negative
  previous_stock?: number;
  new_stock?: number;
  reason: string;
  reference_id?: string; // e.g. order_number or PO number
  created_by?: string;
  created_at: string;
}

export type InventoryLog = InventoryTransaction;

export interface CustomerStats {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
}

export interface StoreSettings {
  id?: string;
  store_name: string;
  currency_symbol: string;
  currency_code: string;
  business_timezone: string;
  low_stock_threshold: number;
  default_delivery_inside_dhaka: number;
  default_delivery_outside_dhaka: number;
  default_customization_fee: number;
  contact_phone: string;
  contact_email: string;
  bkash_merchant_number?: string;
  nagad_merchant_number?: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  entity_type: 'product' | 'category' | 'order' | 'inventory' | 'settings' | 'auth';
  entity_id?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // ISO or YYYY-MM-DD
  endDate: string;
}
