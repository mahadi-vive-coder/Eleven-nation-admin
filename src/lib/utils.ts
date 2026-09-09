import { DateRange, DateRangePreset, Order, OrderItem } from '../types';

/**
 * Format currency in Bangladeshi Taka (BDT / ৳)
 */
export function formatBDT(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '৳0';
  }
  
  // Format with standard thousands separator for Bangladesh
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('en-IN').format(rounded);
  return `৳${formatted}`;
}

/**
 * Financial Business Rules for Eleven Nation E-Commerce & POS:
 * 
 * 1. COUNTABLE ORDERS (REVENUE, UNITS, PROFIT, AOV):
 *    An order contributes to Revenue, Cost, Units Sold, Gross Profit, and AOV if and only if:
 *    - order_status is NOT 'cancelled'
 *    - order_status is NOT 'returned'
 *    - payment_status is NOT 'refunded'
 *    - payment_status is NOT 'failed'
 * 
 *    Note on Cash On Delivery (COD) / In-flight Orders:
 *    Orders in 'pending', 'confirmed', 'processing', 'customizing', 'shipped', or 'delivered' status
 *    with 'cod', 'pending', 'paid', or 'partial' payment statuses represent active store orders with reserved/dispatched stock.
 *    Once marked 'cancelled' or 'returned' or 'refunded', their financial totals and inventory are completely backed out.
 * 
 * 2. PROFIT FORMULA:
 *    Revenue = Product Revenue (Subtotal) + Customization Revenue + Delivery Revenue - Discounts
 *    Product Cost = sum(order_item.cost_price * quantity) [locked at time of order creation]
 *    Gross Profit = Revenue - Product Cost
 *    Profit Margin % = (Gross Profit / Revenue) * 100 (safely returns 0 if Revenue <= 0, never NaN or Infinity)
 */
export function isOrderFinanciallyCountable(order: Pick<Order, 'order_status' | 'payment_status'>): boolean {
  if (!order) return false;
  if (order.order_status === 'cancelled' || order.order_status === 'returned') return false;
  if (order.payment_status === 'refunded' || order.payment_status === 'failed') return false;
  return true;
}

/**
 * Calculate Gross Profit for an order
 * Formula:
 * revenue = items_subtotal + customization_total + delivery_fee - discount
 * cost = items_total_cost
 * gross_profit = revenue - cost
 */
export function calculateOrderRevenue(order: Partial<Order>): number {
  const subtotal = order.subtotal || 0;
  const customization = order.customization_total || 0;
  const delivery = order.delivery_fee || 0;
  const discount = order.discount || 0;
  return Math.max(0, subtotal + customization + delivery - discount);
}

export function calculateOrderCost(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);
}

export function calculateOrderProfit(order: Partial<Order>): number {
  const revenue = calculateOrderRevenue(order);
  const cost = order.total_cost || 0;
  return revenue - cost;
}

export function calculateProfitMargin(revenue: number, profit: number): number {
  if (revenue <= 0 || isNaN(revenue) || !isFinite(revenue)) return 0;
  const margin = (profit / revenue) * 100;
  if (isNaN(margin) || !isFinite(margin)) return 0;
  return Number(margin.toFixed(1));
}

export function calculateAOV(revenue: number, ordersCount: number): number {
  if (ordersCount <= 0) return 0;
  return Math.round(revenue / ordersCount);
}

/**
 * Generate unique order number (e.g. EN-260908-4821)
 */
export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `EN-${dateStr}-${randomSuffix}`;
}

/**
 * Generate a clean URL slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

/**
 * Get current date & time aligned to Asia/Dhaka (UTC+6)
 */
export function getDhakaNow(): Date {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const dhakaOffsetMs = 6 * 3600000;
  return new Date(utcMs + dhakaOffsetMs);
}

/**
 * Get start and end dates based on preset in Asia/Dhaka business timezone
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const dhaka = getDhakaNow();
  const y = dhaka.getFullYear();
  const m = dhaka.getMonth();
  const d = dhaka.getDate();

  // Construct UTC timestamps that correspond to midnight & end-of-day in Dhaka (UTC+6)
  // Dhaka 00:00:00 is UTC 18:00:00 of the previous day
  const toDhakaStartISO = (year: number, month: number, day: number) => {
    const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - (6 * 3600000));
    return utcDate.toISOString();
  };

  const toDhakaEndISO = (year: number, month: number, day: number) => {
    const utcDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - (6 * 3600000));
    return utcDate.toISOString();
  };

  const todayStart = toDhakaStartISO(y, m, d);
  const todayEnd = toDhakaEndISO(y, m, d);

  switch (preset) {
    case 'today':
      return {
        preset: 'today',
        startDate: todayStart,
        endDate: todayEnd
      };
    case 'yesterday': {
      const yesterdayStart = toDhakaStartISO(y, m, d - 1);
      const yesterdayEnd = toDhakaEndISO(y, m, d - 1);
      return {
        preset: 'yesterday',
        startDate: yesterdayStart,
        endDate: yesterdayEnd
      };
    }
    case '7days': {
      const d7Start = toDhakaStartISO(y, m, d - 6);
      return {
        preset: '7days',
        startDate: d7Start,
        endDate: todayEnd
      };
    }
    case '30days': {
      const d30Start = toDhakaStartISO(y, m, d - 29);
      return {
        preset: '30days',
        startDate: d30Start,
        endDate: todayEnd
      };
    }
    case 'this_month': {
      const monthStart = toDhakaStartISO(y, m, 1);
      return {
        preset: 'this_month',
        startDate: monthStart,
        endDate: todayEnd
      };
    }
    case 'last_month': {
      const lastMonthStart = toDhakaStartISO(y, m - 1, 1);
      // Last day of previous month
      const lastDayOfPrevMonth = new Date(y, m, 0).getDate();
      const lastMonthEnd = toDhakaEndISO(y, m - 1, lastDayOfPrevMonth);
      return {
        preset: 'last_month',
        startDate: lastMonthStart,
        endDate: lastMonthEnd
      };
    }
    case 'this_year': {
      const yearStart = toDhakaStartISO(y, 0, 1);
      return {
        preset: 'this_year',
        startDate: yearStart,
        endDate: todayEnd
      };
    }
    case 'custom':
    default:
      return {
        preset: 'custom',
        startDate: toDhakaStartISO(y, m, d - 29),
        endDate: todayEnd
      };
  }
}

/**
 * Format standard readable dates
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

/**
 * Export array of records to downloadable CSV file
 */
export function exportToCsv(data: Record<string, unknown>[], filename: string): void {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );
  const csvContent = [headers.join(','), ...rows].join('\r\n');
  // Include \uFEFF (UTF-8 BOM) so Excel and spreadsheet applications properly render Unicode / Bengali characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate RFC 4122 standard UUID string
 */
export function isValidUUID(uuid: unknown): boolean {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.trim());
}
