-- ==============================================================================
-- ELEVEN NATION: Minimal Migration to Support Nullable product_id in create_order_atomic
-- ==============================================================================
-- This migration updates the create_order_atomic RPC so that:
-- 1. Regular items with a valid product_id lock the product row, verify stock,
--    and record inventory transactions.
-- 2. Genuine custom items (with product_id IS NULL) skip catalog stock deduction.
-- 3. In both cases, the order item is stored with all custom attributes, quantities,
--    and historical cost/unit price locked in public.order_items.
-- ==============================================================================

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
    COALESCE(order_payload->>'order_number', 'EN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),
    (order_payload->>'customer_id')::UUID,
    COALESCE(order_payload->>'customer_name', 'Guest Customer'),
    order_payload->>'customer_email',
    COALESCE(order_payload->>'customer_phone', '01700000000'),
    COALESCE(order_payload->>'shipping_address', 'Store Pickup / Counter Sale'),
    COALESCE(order_payload->>'city', 'Dhaka'),
    order_payload->>'postal_code',
    COALESCE((order_payload->>'items_count')::INTEGER, 1),
    COALESCE((order_payload->>'subtotal')::NUMERIC, 0),
    COALESCE((order_payload->>'customization_total')::NUMERIC, 0),
    COALESCE((order_payload->>'delivery_fee')::NUMERIC, 80),
    COALESCE((order_payload->>'discount')::NUMERIC, 0),
    COALESCE((order_payload->>'total_amount')::NUMERIC, 0),
    COALESCE((order_payload->>'total_cost')::NUMERIC, 0),
    COALESCE((order_payload->>'gross_profit')::NUMERIC, 0),
    COALESCE((order_payload->>'profit_margin_percent')::NUMERIC, 0),
    COALESCE(order_payload->>'payment_method', 'cod'),
    COALESCE(order_payload->>'payment_status', 'cod'),
    COALESCE(order_payload->>'order_status', 'pending'),
    order_payload->>'admin_notes',
    order_payload->>'customer_notes',
    COALESCE((order_payload->>'is_custom_order')::BOOLEAN, FALSE)
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 4. Insert each order item snapshot (supports both product UUID and NULL for custom items)
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

  -- 5. Return success and newly created order details
  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', v_order_id,
    'order_number', v_order_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
