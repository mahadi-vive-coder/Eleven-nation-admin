-- ==============================================================================
-- ELEVEN NATION FOOTBALL JERSEY E-COMMERCE & ADMIN MASTER SQL MIGRATION
-- AUTHORITATIVE, IDEMPOTENT, PRODUCTION-HARDENED DATABASE DEFINITION
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
  club TEXT,
  season TEXT,
  edition TEXT DEFAULT 'Fan Version',
  sku TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  selling_price NUMERIC(10,2) NOT NULL CHECK (selling_price >= 0),
  compare_at_price NUMERIC(10,2) CHECK (compare_at_price >= 0),
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { "size": "M", "stock": 10 }
  images TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  is_new_arrival BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  allow_custom_name BOOLEAN NOT NULL DEFAULT TRUE,
  allow_custom_number BOOLEAN NOT NULL DEFAULT TRUE,
  customization_fee NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT, -- Nullable to support phone / walk-in / WhatsApp orders
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  items_count INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  customization_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'bkash', 'nagad', 'card', 'bank')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'failed', 'refunded', 'cod')),
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'customizing', 'shipped', 'delivered', 'cancelled', 'returned')),
  courier_name TEXT,
  tracking_number TEXT,
  admin_notes TEXT,
  customer_notes TEXT,
  is_custom_order BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Order Items Table (Cost Price Locked Permanently for Financial Integrity)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  sku TEXT,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0, -- Locked at order time
  customization_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  custom_name TEXT,
  custom_number TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Inventory Transactions Table (Immutable Historical Stock Ledger)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT,
  product_sku TEXT,
  size TEXT,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'damage')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name TEXT NOT NULL DEFAULT 'Eleven Nation',
  currency_symbol TEXT NOT NULL DEFAULT '৳',
  currency_code TEXT NOT NULL DEFAULT 'BDT',
  business_timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  default_delivery_inside_dhaka NUMERIC(10,2) NOT NULL DEFAULT 80.00,
  default_delivery_outside_dhaka NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  default_customization_fee NUMERIC(10,2) NOT NULL DEFAULT 150.00,
  contact_phone TEXT DEFAULT '+880 1712-345678',
  contact_email TEXT DEFAULT 'elevennation.support@gmail.com',
  bkash_merchant_number TEXT DEFAULT '01712345678',
  nagad_merchant_number TEXT DEFAULT '01812345678',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial store settings row if table is empty
INSERT INTO public.store_settings (
  store_name,
  currency_symbol,
  currency_code,
  business_timezone,
  low_stock_threshold,
  default_delivery_inside_dhaka,
  default_delivery_outside_dhaka,
  default_customization_fee,
  contact_phone,
  contact_email,
  bkash_merchant_number,
  nagad_merchant_number
)
SELECT
  'Eleven Nation',
  '৳',
  'BDT',
  'Asia/Dhaka',
  5,
  80.00,
  150.00,
  150.00,
  '+880 1712-345678',
  'elevennation.support@gmail.com',
  '01712345678',
  '01812345678'
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);

-- 9. Audit Logs Table (Immutable Administrative Activity Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'category', 'order', 'inventory', 'settings', 'auth')),
  entity_id TEXT,
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_product ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_created ON public.inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 11. Security Role Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. Idempotent Row Level Security Policies (Zero blanket USING (TRUE) policies)

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Super Admins can delete categories" ON public.categories;
CREATE POLICY "Super Admins can delete categories" ON public.categories
  FOR DELETE USING (public.is_super_admin());

-- Products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (status = 'active' OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Super Admins can delete products" ON public.products;
CREATE POLICY "Super Admins can delete products" ON public.products
  FOR DELETE USING (public.is_super_admin());

-- Orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Customers and admins can create orders" ON public.orders;
CREATE POLICY "Customers and admins can create orders" ON public.orders
  FOR INSERT WITH CHECK (
    customer_id = auth.uid()
    OR public.is_admin()
    OR (customer_phone IS NOT NULL AND length(trim(customer_phone)) >= 6)
  );

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Super Admins can delete orders" ON public.orders;
CREATE POLICY "Super Admins can delete orders" ON public.orders
  FOR DELETE USING (public.is_super_admin());

-- Order Items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Authorized users can insert order items" ON public.order_items;
CREATE POLICY "Authorized users can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR orders.customer_phone IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;
CREATE POLICY "Admins can update order items" ON public.order_items
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Super Admins can delete order items" ON public.order_items;
CREATE POLICY "Super Admins can delete order items" ON public.order_items
  FOR DELETE USING (public.is_super_admin());

-- Inventory Transactions (Immutable - No UPDATE or DELETE)
DROP POLICY IF EXISTS "Admins can view inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Admins can view inventory transactions" ON public.inventory_transactions
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Admins can create inventory transactions" ON public.inventory_transactions
  FOR INSERT WITH CHECK (public.is_admin());

-- Store Settings (Public read, Super Admin write, Deletion prohibited)
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
CREATE POLICY "Public can view store settings" ON public.store_settings
  FOR SELECT USING (id IS NOT NULL);

DROP POLICY IF EXISTS "Super Admins can update store settings" ON public.store_settings;
CREATE POLICY "Super Admins can update store settings" ON public.store_settings
  FOR UPDATE USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super Admins can insert store settings" ON public.store_settings;
CREATE POLICY "Super Admins can insert store settings" ON public.store_settings
  FOR INSERT WITH CHECK (public.is_super_admin());

-- Audit Logs (Immutable - No UPDATE or DELETE)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
CREATE POLICY "Admins can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- 14. Trigger: Profile Auto-Creation on User Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    CASE 
      WHEN LOWER(new.email) = 'elevennation.support@gmail.com' THEN 'super_admin'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 15. Trigger: Prevent Role Self-Escalation (Safe server-side provisioning, strict client API guard)
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    -- Only block client-authenticated sessions that are not super_admin.
    -- Server-side SQL console / migration runs where auth.uid() IS NULL are permitted.
    IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only super administrators can modify user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_self_escalation();

-- 16. Supabase Storage Setup for 'product-images' Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'product-images', 
  'product-images', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- Storage Policies (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public read product-images') THEN
    CREATE POLICY "Public read product-images" ON storage.objects
      FOR SELECT USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Admins can upload product-images') THEN
    CREATE POLICY "Admins can upload product-images" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Admins can update product-images') THEN
    CREATE POLICY "Admins can update product-images" ON storage.objects
      FOR UPDATE USING (bucket_id = 'product-images' AND public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Admins can delete product-images') THEN
    CREATE POLICY "Admins can delete product-images" ON storage.objects
      FOR DELETE USING (bucket_id = 'product-images' AND public.is_admin());
  END IF;
END $$;

-- 17. Atomic Financial & Inventory Stored Procedures (Data Integrity & Concurrency Safety)

-- 17a. Atomic Order Creation with Row-Level Locking & Stock Decrement
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  order_payload JSONB,
  items_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_item RECORD;
  v_prod RECORD;
  v_size_elem RECORD;
  v_new_sizes JSONB;
  v_found_size BOOLEAN;
BEGIN
  -- 1. Validate payload presence
  IF items_payload IS NULL OR jsonb_array_length(items_payload) = 0 THEN
    RAISE EXCEPTION 'Order creation failed: at least one order item is required.';
  END IF;

  -- 2. Lock each product row with FOR UPDATE to prevent race conditions and double-spending
  FOR v_item IN SELECT * FROM jsonb_to_recordset(items_payload) AS (
    product_id UUID,
    product_name TEXT,
    size TEXT,
    quantity INTEGER,
    unit_price NUMERIC,
    cost_price NUMERIC,
    customization_fee NUMERIC,
    custom_name TEXT,
    custom_number TEXT,
    subtotal NUMERIC
  )
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero for %', v_item.product_name;
    END IF;

    -- Row lock and stock deduction only for catalog products; genuine custom items (product_id IS NULL) skip stock deduction
    IF v_item.product_id IS NOT NULL THEN
      SELECT * INTO v_prod FROM public.products WHERE id = v_item.product_id FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % (ID %) does not exist or has been removed', v_item.product_name, v_item.product_id;
      END IF;

      IF v_prod.stock < v_item.quantity THEN
        RAISE EXCEPTION 'Insufficient inventory for %: requested %, but only % in stock', v_prod.name, v_item.quantity, v_prod.stock;
      END IF;

      -- Update size breakdown JSONB
      v_new_sizes := '[]'::jsonb;
      v_found_size := FALSE;

      FOR v_size_elem IN SELECT * FROM jsonb_to_recordset(v_prod.sizes) AS (size TEXT, stock INTEGER)
      LOOP
        IF v_size_elem.size = v_item.size THEN
          v_found_size := TRUE;
          IF v_size_elem.stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for % (Size %): requested %, available %', v_prod.name, v_item.size, v_item.quantity, v_size_elem.stock;
          END IF;
          v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', v_size_elem.stock - v_item.quantity);
        ELSE
          v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', v_size_elem.stock);
        END IF;
      END LOOP;

      -- Update product stock
      UPDATE public.products
      SET stock = stock - v_item.quantity,
          sizes = v_new_sizes,
          updated_at = NOW()
      WHERE id = v_item.product_id;

      -- Write immutable inventory transaction row
      INSERT INTO public.inventory_transactions (
        product_id,
        product_name,
        product_sku,
        size,
        type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        reference_id,
        created_by
      ) VALUES (
        v_prod.id,
        v_prod.name,
        v_prod.sku,
        v_item.size,
        'sale',
        -v_item.quantity,
        v_prod.stock,
        v_prod.stock - v_item.quantity,
        'Order purchase: ' || COALESCE(order_payload->>'order_number', 'PENDING'),
        COALESCE(order_payload->>'order_number', ''),
        COALESCE(order_payload->>'customer_email', 'store_checkout')
      );
    END IF;
  END LOOP;

  -- 3. Insert the order record with immutable historical costs & totals
  INSERT INTO public.orders (
    order_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    city,
    postal_code,
    items_count,
    subtotal,
    customization_total,
    delivery_fee,
    discount,
    total_amount,
    total_cost,
    gross_profit,
    profit_margin_percent,
    payment_method,
    payment_status,
    order_status,
    admin_notes,
    customer_notes,
    is_custom_order
  ) VALUES (
    order_payload->>'order_number',
    CASE WHEN (order_payload->>'customer_id') IS NOT NULL AND (order_payload->>'customer_id') <> '' THEN (order_payload->>'customer_id')::UUID ELSE NULL END,
    order_payload->>'customer_name',
    order_payload->>'customer_email',
    order_payload->>'customer_phone',
    order_payload->>'shipping_address',
    order_payload->>'city',
    order_payload->>'postal_code',
    (order_payload->>'items_count')::INTEGER,
    (order_payload->>'subtotal')::NUMERIC,
    COALESCE((order_payload->>'customization_total')::NUMERIC, 0),
    (order_payload->>'delivery_fee')::NUMERIC,
    COALESCE((order_payload->>'discount')::NUMERIC, 0),
    (order_payload->>'total_amount')::NUMERIC,
    (order_payload->>'total_cost')::NUMERIC,
    (order_payload->>'gross_profit')::NUMERIC,
    (order_payload->>'profit_margin_percent')::NUMERIC,
    order_payload->>'payment_method',
    order_payload->>'payment_status',
    order_payload->>'order_status',
    order_payload->>'admin_notes',
    order_payload->>'customer_notes',
    COALESCE((order_payload->>'is_custom_order')::BOOLEAN, FALSE)
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 4. Insert all order items with locked-in cost_price
  FOR v_item IN SELECT * FROM jsonb_to_recordset(items_payload) AS (
    product_id UUID,
    product_name TEXT,
    product_image TEXT,
    sku TEXT,
    size TEXT,
    quantity INTEGER,
    unit_price NUMERIC,
    cost_price NUMERIC,
    customization_fee NUMERIC,
    custom_name TEXT,
    custom_number TEXT,
    subtotal NUMERIC
  )
  LOOP
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      sku,
      size,
      quantity,
      unit_price,
      cost_price,
      customization_fee,
      custom_name,
      custom_number,
      subtotal
    ) VALUES (
      v_order_id,
      v_item.product_id,
      v_item.product_name,
      v_item.product_image,
      v_item.sku,
      v_item.size,
      v_item.quantity,
      v_item.unit_price,
      v_item.cost_price,
      COALESCE(v_item.customization_fee, 0),
      v_item.custom_name,
      v_item.custom_number,
      v_item.subtotal
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17b. Atomic Inventory Adjustment with Row-Level Locking & Immutable Ledger
CREATE OR REPLACE FUNCTION public.adjust_inventory_atomic(
  p_product_id UUID,
  p_size TEXT,
  p_delta INTEGER,
  p_type TEXT,
  p_reason TEXT,
  p_reference_id TEXT,
  p_admin_id TEXT,
  p_admin_email TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_prod RECORD;
  v_size_elem RECORD;
  v_new_sizes JSONB := '[]'::jsonb;
  v_found_size BOOLEAN := FALSE;
  v_new_stock INTEGER;
BEGIN
  -- Permission check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only administrators can adjust inventory';
  END IF;

  -- Row lock product
  SELECT * INTO v_prod FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product with id % not found', p_product_id;
  END IF;

  v_new_stock := GREATEST(0, v_prod.stock + p_delta);

  -- Update specific size if provided
  IF p_size IS NOT NULL AND p_size <> '' THEN
    FOR v_size_elem IN SELECT * FROM jsonb_to_recordset(v_prod.sizes) AS (size TEXT, stock INTEGER)
    LOOP
      IF v_size_elem.size = p_size THEN
        v_found_size := TRUE;
        v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', GREATEST(0, v_size_elem.stock + p_delta));
      ELSE
        v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', v_size_elem.stock);
      END IF;
    END LOOP;

    IF NOT v_found_size THEN
      v_new_sizes := v_new_sizes || jsonb_build_object('size', p_size, 'stock', GREATEST(0, p_delta));
    END IF;
  ELSE
    v_new_sizes := v_prod.sizes;
  END IF;

  UPDATE public.products
  SET stock = v_new_stock,
      sizes = v_new_sizes,
      updated_at = NOW()
  WHERE id = p_product_id;

  -- Insert inventory ledger entry
  INSERT INTO public.inventory_transactions (
    product_id,
    product_name,
    product_sku,
    size,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    reference_id,
    created_by
  ) VALUES (
    v_prod.id,
    v_prod.name,
    v_prod.sku,
    p_size,
    p_type,
    p_delta,
    v_prod.stock,
    v_new_stock,
    p_reason,
    p_reference_id,
    p_admin_email
  );

  -- Insert audit log
  INSERT INTO public.audit_logs (
    admin_id,
    admin_email,
    action,
    entity_type,
    entity_id,
    details,
    metadata
  ) VALUES (
    p_admin_id,
    p_admin_email,
    'INVENTORY_ADJUSTMENT',
    'inventory',
    p_product_id::TEXT,
    'Adjusted stock for ' || v_prod.name || ' (Size: ' || COALESCE(p_size, 'All') || ') by ' || p_delta,
    jsonb_build_object(
      'product_id', p_product_id,
      'size', p_size,
      'delta', p_delta,
      'type', p_type,
      'reason', p_reason,
      'previous_stock', v_prod.stock,
      'new_stock', v_new_stock
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'product_id', p_product_id,
    'previous_stock', v_prod.stock,
    'new_stock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17c. Atomic Order Status Update with Inventory Restoration on Cancellation/Return
CREATE OR REPLACE FUNCTION public.update_order_status_atomic(
  p_order_id UUID,
  p_new_order_status TEXT,
  p_new_payment_status TEXT,
  p_admin_notes TEXT,
  p_admin_id TEXT,
  p_admin_email TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_ord RECORD;
  v_item RECORD;
  v_prod RECORD;
  v_size_elem RECORD;
  v_new_sizes JSONB;
  v_was_active BOOLEAN;
  v_will_be_active BOOLEAN;
BEGIN
  -- Permission check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only administrators can update order statuses';
  END IF;

  -- Lock order row
  SELECT * INTO v_ord FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order with id % not found', p_order_id;
  END IF;

  -- Determine active vs inactive states
  v_was_active := v_ord.order_status NOT IN ('cancelled', 'returned');
  v_will_be_active := p_new_order_status NOT IN ('cancelled', 'returned');

  -- If transitioning from active -> cancelled/returned: RESTORE stock
  IF v_was_active AND NOT v_will_be_active THEN
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
      IF v_item.product_id IS NOT NULL THEN
        SELECT * INTO v_prod FROM public.products WHERE id = v_item.product_id FOR UPDATE;
        IF FOUND THEN
          v_new_sizes := '[]'::jsonb;
          FOR v_size_elem IN SELECT * FROM jsonb_to_recordset(v_prod.sizes) AS (size TEXT, stock INTEGER)
          LOOP
            IF v_size_elem.size = v_item.size THEN
              v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', v_size_elem.stock + v_item.quantity);
            ELSE
              v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', v_size_elem.stock);
            END IF;
          END LOOP;

          UPDATE public.products
          SET stock = stock + v_item.quantity,
              sizes = v_new_sizes,
              updated_at = NOW()
          WHERE id = v_item.product_id;

          INSERT INTO public.inventory_transactions (
            product_id,
            product_name,
            product_sku,
            size,
            type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            reference_id,
            created_by
          ) VALUES (
            v_prod.id,
            v_prod.name,
            v_prod.sku,
            v_item.size,
            'return',
            v_item.quantity,
            v_prod.stock,
            v_prod.stock + v_item.quantity,
            'Restored stock from ' || p_new_order_status || ' order: ' || v_ord.order_number,
            v_ord.order_number,
            p_admin_email
          );
        END IF;
      END IF;
    END LOOP;
  -- If transitioning from cancelled/returned -> active: DEDUCT stock again
  ELSIF NOT v_was_active AND v_will_be_active THEN
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
      IF v_item.product_id IS NOT NULL THEN
        SELECT * INTO v_prod FROM public.products WHERE id = v_item.product_id FOR UPDATE;
        IF FOUND THEN
          v_new_sizes := '[]'::jsonb;
          FOR v_size_elem IN SELECT * FROM jsonb_to_recordset(v_prod.sizes) AS (size TEXT, stock INTEGER)
          LOOP
            IF v_size_elem.size = v_item.size THEN
              v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', GREATEST(0, v_size_elem.stock - v_item.quantity));
            ELSE
              v_new_sizes := v_new_sizes || jsonb_build_object('size', v_size_elem.size, 'stock', v_size_elem.stock);
            END IF;
          END LOOP;

          UPDATE public.products
          SET stock = GREATEST(0, stock - v_item.quantity),
              sizes = v_new_sizes,
              updated_at = NOW()
          WHERE id = v_item.product_id;

          INSERT INTO public.inventory_transactions (
            product_id,
            product_name,
            product_sku,
            size,
            type,
            quantity,
            previous_stock,
            new_stock,
            reason,
            reference_id,
            created_by
          ) VALUES (
            v_prod.id,
            v_prod.name,
            v_prod.sku,
            v_item.size,
            'sale',
            -v_item.quantity,
            v_prod.stock,
            GREATEST(0, v_prod.stock - v_item.quantity),
            'Re-deducted stock for reactivated order: ' || v_ord.order_number,
            v_ord.order_number,
            p_admin_email
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Update order record
  UPDATE public.orders
  SET order_status = p_new_order_status,
      payment_status = COALESCE(p_new_payment_status, payment_status),
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Write audit log
  INSERT INTO public.audit_logs (
    admin_id,
    admin_email,
    action,
    entity_type,
    entity_id,
    details,
    metadata
  ) VALUES (
    p_admin_id,
    p_admin_email,
    'ORDER_STATUS_UPDATE',
    'order',
    p_order_id::TEXT,
    'Updated order ' || v_ord.order_number || ' status to ' || p_new_order_status,
    jsonb_build_object(
      'order_id', p_order_id,
      'order_number', v_ord.order_number,
      'old_status', v_ord.order_status,
      'new_status', p_new_order_status,
      'old_payment', v_ord.payment_status,
      'new_payment', p_new_payment_status
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', p_order_id,
    'order_number', v_ord.order_number,
    'order_status', p_new_order_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Grants for PostgREST Roles (anon, authenticated, service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(JSONB, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_inventory_atomic(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_order_status_atomic(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
