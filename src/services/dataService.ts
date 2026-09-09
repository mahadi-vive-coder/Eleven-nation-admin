import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Category,
  Product,
  Order,
  InventoryTransaction,
  StoreSettings,
  AuditLog,
  CustomerStats
} from '../types';
import {
  calculateProfitMargin,
  isOrderFinanciallyCountable
} from '../lib/utils';

// UUID Validation Helper (RFC 4122 standard)
export function isValidUUID(id: unknown): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
}

async function getAdminActor(): Promise<{ id: string; email: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return {
        id: session.user.id,
        email: session.user.email || 'elevennation.support@gmail.com'
      };
    }
  } catch {
    // fallback
  }
  return {
    id: 'admin-system',
    email: 'elevennation.support@gmail.com'
  };
}

// Default initial store configuration contract (used only when store_settings table is empty)
export const INITIAL_STORE_SETTINGS: StoreSettings = {
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
};

// ---------------------------------------------------------------------------
// PRODUCTION DATA SERVICE API (Supabase as the Single Source of Truth)
// ---------------------------------------------------------------------------

export const dataService = {
  // CATEGORIES
  async getCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Database error fetching categories: ${error.message}`);
    }

    return (data || []) as Category[];
  },

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to create category.');
    }

    const dbPayload = {
      name: category.name.trim(),
      slug: category.slug.trim(),
      description: category.description?.trim() || null,
      image_url: category.image_url?.trim() || null,
      display_order: Number(category.display_order || 1),
      is_active: category.is_active !== undefined ? Boolean(category.is_active) : true
    };

    const { data, error } = await supabase
      .from('categories')
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }
    if (!data || !isValidUUID(data.id)) {
      throw new Error('Database failed to generate a valid UUID for the newly created category.');
    }

    await this.createAuditLog('CATEGORY_CREATED', 'category', data.id, `Created category "${data.name}"`);
    return data as Category;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to update category.');
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid category database ID: "${id}". Only valid database records with a UUID can be updated.`);
    }

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug.trim();
    if (updates.description !== undefined) dbUpdates.description = updates.description?.trim() || null;
    if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url?.trim() || null;
    if (updates.display_order !== undefined) dbUpdates.display_order = Number(updates.display_order);
    if (updates.is_active !== undefined) dbUpdates.is_active = Boolean(updates.is_active);

    const { data, error } = await supabase
      .from('categories')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    await this.createAuditLog('CATEGORY_UPDATED', 'category', id, `Updated category "${data.name}"`);
    return data as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to delete category.');
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid category database ID: "${id}". Only valid database records with a UUID can be deleted.`);
    }

    const products = await this.getProducts();
    const linked = products.filter((p) => p.category_id === id);
    if (linked.length > 0) {
      throw new Error(`Cannot delete category: ${linked.length} product(s) are assigned to it. Reassign or delete them first.`);
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    await this.createAuditLog('CATEGORY_DELETED', 'category', id, `Deleted category ${id}`);
  },

  // PRODUCTS
  async getProducts(): Promise<Product[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error fetching products: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      ...item,
      selling_price: Number(item.selling_price),
      compare_at_price: item.compare_at_price ? Number(item.compare_at_price) : undefined,
      cost_price: Number(item.cost_price || 0),
      stock: Number(item.stock || 0),
      customization_fee: Number(item.customization_fee || 150),
      category_name: item.categories?.name || 'Uncategorized'
    })) as Product[];
  },

  async getProductById(id: string): Promise<Product | null> {
    if (!isSupabaseConfigured || !isValidUUID(id)) {
      return null;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      ...data,
      selling_price: Number(data.selling_price),
      compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : undefined,
      cost_price: Number(data.cost_price || 0),
      stock: Number(data.stock || 0),
      customization_fee: Number(data.customization_fee || 150),
      category_name: data.categories?.name || 'Uncategorized'
    } as Product;
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to create product.');
    }

    const dbPayload = {
      name: product.name.trim(),
      slug: product.slug.trim(),
      category_id: product.category_id && isValidUUID(product.category_id) ? product.category_id : null,
      club: product.club?.trim() || null,
      season: product.season?.trim() || null,
      edition: product.edition || 'Fan Version',
      sku: product.sku.trim().toUpperCase(),
      description: product.description?.trim() || '',
      short_description: product.short_description?.trim() || null,
      selling_price: Number(product.selling_price),
      compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
      cost_price: Number(product.cost_price || 0),
      stock: Number(product.stock || 0),
      sizes: product.sizes || [],
      images: product.images || [],
      is_featured: Boolean(product.is_featured),
      is_trending: Boolean(product.is_trending),
      is_bestseller: Boolean(product.is_bestseller),
      is_new_arrival: Boolean(product.is_new_arrival),
      status: product.status || 'active',
      allow_custom_name: Boolean(product.allow_custom_name),
      allow_custom_number: Boolean(product.allow_custom_number),
      customization_fee: Number(product.customization_fee || 150)
    };

    const { data, error } = await supabase
      .from('products')
      .insert([dbPayload])
      .select('*, categories(name)')
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
    if (!data || !isValidUUID(data.id)) {
      throw new Error('Database failed to return a valid UUID for the newly created product.');
    }

    const createdProd: Product = {
      ...data,
      selling_price: Number(data.selling_price),
      compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : undefined,
      cost_price: Number(data.cost_price || 0),
      stock: Number(data.stock || 0),
      customization_fee: Number(data.customization_fee || 150),
      category_name: data.categories?.name || 'Uncategorized'
    };

    if (createdProd.stock > 0) {
      await this.recordInventoryTransaction({
        product_id: createdProd.id,
        product_name: createdProd.name,
        product_sku: createdProd.sku,
        type: 'purchase',
        quantity: createdProd.stock,
        previous_stock: 0,
        new_stock: createdProd.stock,
        reason: 'Initial product catalog creation stock'
      });
    }

    await this.createAuditLog(
      'PRODUCT_CREATED',
      'product',
      createdProd.id,
      `Created product "${createdProd.name}" (SKU: ${createdProd.sku})`
    );

    return createdProd;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to update product.');
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid product database ID: "${id}". Only valid database records with a UUID can be updated.`);
    }

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.name !== undefined) dbUpdates.name = updates.name.trim();
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug.trim();
    if (updates.category_id !== undefined) {
      dbUpdates.category_id = updates.category_id && isValidUUID(updates.category_id) ? updates.category_id : null;
    }
    if (updates.club !== undefined) dbUpdates.club = updates.club?.trim() || null;
    if (updates.season !== undefined) dbUpdates.season = updates.season?.trim() || null;
    if (updates.edition !== undefined) dbUpdates.edition = updates.edition;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku.trim().toUpperCase();
    if (updates.description !== undefined) dbUpdates.description = updates.description.trim();
    if (updates.short_description !== undefined) dbUpdates.short_description = updates.short_description?.trim() || null;
    if (updates.selling_price !== undefined) dbUpdates.selling_price = Number(updates.selling_price);
    if (updates.compare_at_price !== undefined) dbUpdates.compare_at_price = updates.compare_at_price ? Number(updates.compare_at_price) : null;
    if (updates.cost_price !== undefined) dbUpdates.cost_price = Number(updates.cost_price);
    if (updates.stock !== undefined) dbUpdates.stock = Number(updates.stock);
    if (updates.sizes !== undefined) dbUpdates.sizes = updates.sizes;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.is_featured !== undefined) dbUpdates.is_featured = Boolean(updates.is_featured);
    if (updates.is_trending !== undefined) dbUpdates.is_trending = Boolean(updates.is_trending);
    if (updates.is_bestseller !== undefined) dbUpdates.is_bestseller = Boolean(updates.is_bestseller);
    if (updates.is_new_arrival !== undefined) dbUpdates.is_new_arrival = Boolean(updates.is_new_arrival);
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.allow_custom_name !== undefined) dbUpdates.allow_custom_name = Boolean(updates.allow_custom_name);
    if (updates.allow_custom_number !== undefined) dbUpdates.allow_custom_number = Boolean(updates.allow_custom_number);
    if (updates.customization_fee !== undefined) dbUpdates.customization_fee = Number(updates.customization_fee);

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, categories(name)')
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    const updatedProd: Product = {
      ...data,
      selling_price: Number(data.selling_price),
      compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : undefined,
      cost_price: Number(data.cost_price || 0),
      stock: Number(data.stock || 0),
      customization_fee: Number(data.customization_fee || 150),
      category_name: data.categories?.name || 'Uncategorized'
    };

    await this.createAuditLog('PRODUCT_UPDATED', 'product', id, `Updated product "${updatedProd.name}"`);
    return updatedProd;
  },

  async deleteProduct(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to delete product.');
    }

    if (!isValidUUID(id)) {
      throw new Error(`Invalid product database ID: "${id}". Only valid database records with a UUID can be deleted.`);
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    await this.createAuditLog('PRODUCT_DELETED', 'product', id, `Deleted product with ID ${id}`);
  },

  // ORDERS
  async getOrders(): Promise<Order[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error fetching orders: ${error.message}`);
    }

    return (data || []).map((ord: any) => ({
      ...ord,
      subtotal: Number(ord.subtotal),
      delivery_fee: Number(ord.delivery_fee),
      customization_total: Number(ord.customization_total || 0),
      discount: Number(ord.discount || 0),
      total_amount: Number(ord.total_amount),
      total_cost: Number(ord.total_cost || 0),
      gross_profit: Number(ord.gross_profit || 0),
      profit_margin_percent: Number(ord.profit_margin_percent || 0),
      items_count: Number(ord.items_count || (ord.order_items?.length || 0)),
      items: (ord.order_items || []).map((it: any) => ({
        ...it,
        unit_price: Number(it.unit_price),
        cost_price: Number(it.cost_price || 0),
        customization_fee: Number(it.customization_fee || 0),
        subtotal: Number(it.subtotal)
      }))
    })) as Order[];
  },

  async getOrderById(id: string): Promise<Order | null> {
    if (!isSupabaseConfigured) {
      return null;
    }

    if (isValidUUID(id)) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          subtotal: Number(data.subtotal),
          delivery_fee: Number(data.delivery_fee),
          customization_total: Number(data.customization_total || 0),
          discount: Number(data.discount || 0),
          total_amount: Number(data.total_amount),
          total_cost: Number(data.total_cost || 0),
          gross_profit: Number(data.gross_profit || 0),
          profit_margin_percent: Number(data.profit_margin_percent || 0),
          items_count: Number(data.items_count || (data.order_items?.length || 0)),
          items: (data.order_items || []).map((it: any) => ({
            ...it,
            unit_price: Number(it.unit_price),
            cost_price: Number(it.cost_price || 0),
            customization_fee: Number(it.customization_fee || 0),
            subtotal: Number(it.subtotal)
          }))
        } as Order;
      }
    }

    // Query by order_number
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', id)
      .maybeSingle();

    if (!error && data) {
      return {
        ...data,
        subtotal: Number(data.subtotal),
        delivery_fee: Number(data.delivery_fee),
        customization_total: Number(data.customization_total || 0),
        discount: Number(data.discount || 0),
        total_amount: Number(data.total_amount),
        total_cost: Number(data.total_cost || 0),
        gross_profit: Number(data.gross_profit || 0),
        profit_margin_percent: Number(data.profit_margin_percent || 0),
        items_count: Number(data.items_count || (data.order_items?.length || 0)),
        items: (data.order_items || []).map((it: any) => ({
          ...it,
          unit_price: Number(it.unit_price),
          cost_price: Number(it.cost_price || 0),
          customization_fee: Number(it.customization_fee || 0),
          subtotal: Number(it.subtotal)
        }))
      } as Order;
    }

    return null;
  },

  async createOrder(orderInput: Omit<Order, 'id'>): Promise<Order> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase database is not configured. Please verify environment credentials.');
    }

    const items = orderInput.items;
    if (!items || items.length === 0) {
      throw new Error('Order creation failed: at least one item is required.');
    }

    // 1. Strict validation of line items & product UUIDs before contacting PostgreSQL
    const validatedItems = items.map((it, idx) => {
      const isNullOrEmpty = it.product_id === null || it.product_id === undefined || (typeof it.product_id === 'string' && it.product_id.trim() === '');
      let cleanProductId: string | null = null;

      if (!isNullOrEmpty) {
        const trimmedId = String(it.product_id).trim();
        if (!isValidUUID(trimmedId)) {
          throw new Error(
            `Order placement rejected: Item #${idx + 1} ("${it.product_name || 'Item'}") contains an invalid product ID ("${trimmedId}"). A valid UUID from products inventory or NULL for genuine custom items is required.`
          );
        }
        cleanProductId = trimmedId;
      }

      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = Number(it.unit_price) || 0;
      const costPrice = Number(it.cost_price) || 0;
      const customFee = Number(it.customization_fee) || 0;

      return {
        product_id: cleanProductId, // NULL for custom items, valid UUID for regular catalog products
        product_name: it.product_name || (cleanProductId ? 'Jersey Item' : 'Custom Jersey Kit'),
        product_image: it.product_image || '',
        sku: it.sku || (cleanProductId ? '' : 'CUSTOM'),
        size: it.size || 'L',
        quantity: qty,
        unit_price: unitPrice,
        cost_price: costPrice,
        customization_fee: customFee,
        custom_name: it.custom_name?.trim() || '',
        custom_number: it.custom_number?.trim() || '',
        subtotal: (unitPrice + customFee) * qty
      };
    });

    // 2. Calculate historical costs and profit (permanently locked in database for financial integrity)
    const subtotal = validatedItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
    const customization_total = validatedItems.reduce((sum, it) => sum + (it.customization_fee * it.quantity), 0);
    const delivery_fee = orderInput.delivery_fee ?? 80;
    const discount = orderInput.discount ?? 0;
    const total_amount = subtotal + customization_total + delivery_fee - discount;
    const total_cost = validatedItems.reduce((sum, it) => sum + (it.cost_price * it.quantity), 0);
    const gross_profit = total_amount - total_cost;
    const profit_margin_percent = calculateProfitMargin(total_amount, gross_profit);

    // 3. Execute atomic database stored procedure for row-level locking & concurrency safety
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_order_atomic', {
      order_payload: {
        order_number: orderInput.order_number,
        customer_name: orderInput.customer_name,
        customer_email: orderInput.customer_email || null,
        customer_phone: orderInput.customer_phone,
        shipping_address: orderInput.shipping_address,
        city: orderInput.city,
        postal_code: orderInput.postal_code || null,
        items_count: validatedItems.reduce((sum, it) => sum + it.quantity, 0),
        subtotal,
        customization_total,
        delivery_fee,
        discount,
        total_amount,
        total_cost,
        gross_profit,
        profit_margin_percent,
        payment_method: orderInput.payment_method,
        payment_status: orderInput.payment_status || (orderInput.payment_method === 'cod' ? 'cod' : 'pending'),
        order_status: orderInput.order_status || 'pending',
        admin_notes: orderInput.admin_notes || null,
        customer_notes: orderInput.customer_notes || null,
        is_custom_order: orderInput.is_custom_order || validatedItems.some(it => it.product_id === null)
      },
      items_payload: validatedItems
    });

    if (rpcErr) {
      throw new Error(`Order placement failed: ${rpcErr.message}`);
    }

    if (!rpcData?.order_id) {
      throw new Error('Order creation failed: no order confirmation ID returned from database.');
    }

    const createdOrder = await this.getOrderById(rpcData.order_id);
    if (!createdOrder) {
      throw new Error('Failed to retrieve order after creation.');
    }

    await this.createAuditLog(
      'ORDER_CREATED',
      'order',
      createdOrder.id,
      `Created order ${createdOrder.order_number} for ${createdOrder.customer_name} (Total: ৳${createdOrder.total_amount})`
    );

    return createdOrder;
  },

  async updateOrderStatus(
    id: string,
    order_status: Order['order_status'],
    payment_status?: Order['payment_status'],
    notes?: string
  ): Promise<Order> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to update order status.');
    }

    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error(`Order with ID "${id}" not found.`);
    }

    // Call atomic stored procedure which safely manages SELECT ... FOR UPDATE,
    // restores stock on cancelled/returned orders, and writes inventory + audit logs
    const actor = await getAdminActor();
    const { error: rpcErr } = await supabase.rpc('update_order_status_atomic', {
      p_order_id: order.id,
      p_new_order_status: order_status,
      p_new_payment_status: payment_status || null,
      p_admin_notes: notes || null,
      p_admin_id: actor.id,
      p_admin_email: actor.email
    });

    if (rpcErr) {
      throw new Error(`Failed to update order status: ${rpcErr.message}`);
    }

    const updated = await this.getOrderById(order.id);
    if (!updated) {
      throw new Error('Failed to retrieve updated order.');
    }
    return updated;
  },

  async updateOrderDetails(id: string, updates: Partial<Order>): Promise<Order> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to update order.');
    }

    const order = await this.getOrderById(id);
    if (!order) throw new Error(`Order with ID "${id}" not found.`);

    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.customer_name !== undefined) dbUpdates.customer_name = updates.customer_name;
    if (updates.customer_email !== undefined) dbUpdates.customer_email = updates.customer_email;
    if (updates.customer_phone !== undefined) dbUpdates.customer_phone = updates.customer_phone;
    if (updates.shipping_address !== undefined) dbUpdates.shipping_address = updates.shipping_address;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.postal_code !== undefined) dbUpdates.postal_code = updates.postal_code;
    if (updates.payment_status !== undefined) dbUpdates.payment_status = updates.payment_status;
    if (updates.order_status !== undefined) dbUpdates.order_status = updates.order_status;
    if (updates.courier_name !== undefined) dbUpdates.courier_name = updates.courier_name;
    if (updates.tracking_number !== undefined) dbUpdates.tracking_number = updates.tracking_number;
    if (updates.admin_notes !== undefined) dbUpdates.admin_notes = updates.admin_notes;
    if (updates.customer_notes !== undefined) dbUpdates.customer_notes = updates.customer_notes;

    const { error } = await supabase.from('orders').update(dbUpdates).eq('id', order.id);
    if (error) {
      throw new Error(`Failed to update order details: ${error.message}`);
    }

    await this.createAuditLog('ORDER_UPDATED', 'order', order.id, `Updated details for order ${order.order_number}`);

    const updated = await this.getOrderById(order.id);
    return updated || { ...order, ...updates };
  },

  async deleteOrder(id: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to delete order.');
    }

    const order = await this.getOrderById(id);
    if (!order) throw new Error(`Order with ID "${id}" not found.`);

    const { error } = await supabase.from('orders').delete().eq('id', order.id);
    if (error) {
      throw new Error(`Failed to delete order: ${error.message}`);
    }

    await this.createAuditLog('ORDER_DELETED', 'order', order.id, `Deleted order ${order.order_number}`);
  },

  async addOrderNote(orderId: string, note: string): Promise<void> {
    const order = await this.getOrderById(orderId);
    if (!order) return;
    const currentNotes = order.admin_notes ? `${order.admin_notes}\n${note}` : note;
    await this.updateOrderDetails(orderId, { admin_notes: currentNotes });
  },

  // INVENTORY
  async adjustProductStock(
    productId: string,
    size: string,
    delta: number,
    type: InventoryTransaction['type'],
    reason: string,
    referenceId?: string
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to adjust inventory.');
    }

    if (!isValidUUID(productId)) {
      throw new Error(`Invalid product database ID: "${productId}". Only valid database records with a UUID can be adjusted.`);
    }

    // Call atomic stored procedure in PostgreSQL with row-level locking
    const actor = await getAdminActor();
    const { error: rpcErr } = await supabase.rpc('adjust_inventory_atomic', {
      p_product_id: productId,
      p_size: size || null,
      p_delta: delta,
      p_type: type,
      p_reason: reason,
      p_reference_id: referenceId || null,
      p_admin_id: actor.id,
      p_admin_email: actor.email
    });

    if (rpcErr) {
      throw new Error(`Failed to adjust inventory: ${rpcErr.message}`);
    }
  },

  async adjustStock(
    productId: string,
    size: 'S' | 'M' | 'L' | 'XL' | 'XXL' | string,
    changeAmount: number,
    reason: string
  ): Promise<void> {
    const type: InventoryTransaction['type'] = changeAmount >= 0 ? 'purchase' : 'adjustment';
    await this.adjustProductStock(productId, size, changeAmount, type, reason);
  },

  async getInventoryTransactions(): Promise<InventoryTransaction[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error fetching inventory transactions: ${error.message}`);
    }
    return (data || []) as InventoryTransaction[];
  },

  async recordInventoryTransaction(tx: Omit<InventoryTransaction, 'id' | 'created_at'>): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    if (!isValidUUID(tx.product_id)) {
      console.warn(`Skipping inventory transaction: product_id "${tx.product_id}" is not a valid UUID.`);
      return;
    }

    const dbPayload = {
      product_id: tx.product_id,
      product_name: tx.product_name || null,
      product_sku: tx.product_sku || null,
      size: tx.size || null,
      type: tx.type,
      quantity: Number(tx.quantity),
      previous_stock: tx.previous_stock !== undefined ? Number(tx.previous_stock) : null,
      new_stock: tx.new_stock !== undefined ? Number(tx.new_stock) : null,
      reason: tx.reason,
      reference_id: tx.reference_id || null
    };

    const { error } = await supabase.from('inventory_transactions').insert([dbPayload]);
    if (error) {
      console.warn('Inventory transaction logging notice:', error.message);
    }
  },

  // STORE SETTINGS
  async getSettings(): Promise<StoreSettings> {
    if (!isSupabaseConfigured) {
      return INITIAL_STORE_SETTINGS;
    }

    // Use limit(1).maybeSingle() to cleanly fetch without triggering HTTP 406 on empty table
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Database error fetching store settings:', error.message);
      return INITIAL_STORE_SETTINGS;
    }

    if (data) {
      return {
        id: data.id,
        store_name: data.store_name,
        currency_symbol: data.currency_symbol,
        currency_code: data.currency_code,
        business_timezone: data.business_timezone,
        low_stock_threshold: Number(data.low_stock_threshold),
        default_delivery_inside_dhaka: Number(data.default_delivery_inside_dhaka),
        default_delivery_outside_dhaka: Number(data.default_delivery_outside_dhaka),
        default_customization_fee: Number(data.default_customization_fee),
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        bkash_merchant_number: data.bkash_merchant_number,
        nagad_merchant_number: data.nagad_merchant_number
      };
    }

    return INITIAL_STORE_SETTINGS;
  },

  async updateSettings(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not connected. Unable to update settings.');
    }

    const { data: existingRows } = await supabase
      .from('store_settings')
      .select('id')
      .limit(2);

    const dbPayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (updates.store_name !== undefined) dbPayload.store_name = updates.store_name;
    if (updates.currency_symbol !== undefined) dbPayload.currency_symbol = updates.currency_symbol;
    if (updates.currency_code !== undefined) dbPayload.currency_code = updates.currency_code;
    if (updates.business_timezone !== undefined) dbPayload.business_timezone = updates.business_timezone;
    if (updates.low_stock_threshold !== undefined) dbPayload.low_stock_threshold = Number(updates.low_stock_threshold);
    if (updates.default_delivery_inside_dhaka !== undefined) dbPayload.default_delivery_inside_dhaka = Number(updates.default_delivery_inside_dhaka);
    if (updates.default_delivery_outside_dhaka !== undefined) dbPayload.default_delivery_outside_dhaka = Number(updates.default_delivery_outside_dhaka);
    if (updates.default_customization_fee !== undefined) dbPayload.default_customization_fee = Number(updates.default_customization_fee);
    if (updates.contact_phone !== undefined) dbPayload.contact_phone = updates.contact_phone;
    if (updates.contact_email !== undefined) dbPayload.contact_email = updates.contact_email;
    if (updates.bkash_merchant_number !== undefined) dbPayload.bkash_merchant_number = updates.bkash_merchant_number;
    if (updates.nagad_merchant_number !== undefined) dbPayload.nagad_merchant_number = updates.nagad_merchant_number;

    let savedData: any = null;
    if (existingRows && existingRows.length > 0) {
      const { data, error } = await supabase
        .from('store_settings')
        .update(dbPayload)
        .eq('id', existingRows[0].id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update store settings: ${error.message}`);
      }
      savedData = data;
    } else {
      const { data, error } = await supabase
        .from('store_settings')
        .insert([dbPayload])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to insert store settings: ${error.message}`);
      }
      savedData = data;
    }

    await this.createAuditLog('SETTINGS_UPDATED', 'settings', savedData?.id || 'store_settings', 'Store settings updated');
    return savedData as StoreSettings;
  },

  // AUDIT LOGS
  async getAuditLogs(): Promise<AuditLog[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Database error fetching audit logs: ${error.message}`);
    }
    return (data || []) as AuditLog[];
  },

  async createAuditLog(
    action: string,
    entity_type: AuditLog['entity_type'],
    entity_id?: string,
    details?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }

    const actor = await getAdminActor();
    const dbPayload = {
      admin_id: actor.id,
      admin_email: actor.email,
      action,
      entity_type,
      entity_id: entity_id || null,
      details: details || null,
      metadata: metadata || {}
    };

    try {
      await supabase.from('audit_logs').insert([dbPayload]);
    } catch (err) {
      console.warn('Supabase audit log notice:', err);
    }
  },

  // CUSTOMERS
  async getCustomers(): Promise<CustomerStats[]> {
    const orders = await this.getOrders();
    const map = new Map<string, CustomerStats>();

    for (const ord of orders) {
      const key = ord.customer_phone || ord.customer_email || ord.customer_name;
      const existing = map.get(key);
      const isCountable = isOrderFinanciallyCountable(ord.order_status);
      const orderRevenue = isCountable ? ord.total_amount : 0;

      if (!existing) {
        map.set(key, {
          id: key,
          name: ord.customer_name,
          email: ord.customer_email,
          phone: ord.customer_phone,
          total_orders: 1,
          total_spent: orderRevenue,
          last_order_date: ord.created_at,
          created_at: ord.created_at
        });
      } else {
        existing.total_orders += 1;
        existing.total_spent += orderRevenue;
        if (new Date(ord.created_at) > new Date(existing.last_order_date || '')) {
          existing.last_order_date = ord.created_at;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent);
  }
};
