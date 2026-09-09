import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';
import { formatBDT, formatDateTime, exportToCsv } from '../../lib/utils';
import {
  Search,
  Download,
  Eye,
  Pencil,
  X,
  Save,
  ShoppingBag
} from 'lucide-react';
import { useToast } from '../common/Toast';

interface CustomerRecord {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface CustomerSummary extends CustomerRecord {
  orders: Order[];
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
}

interface CustomersManagerProps {
  orders: Order[];
  onSelectCustomerOrder: (order: Order) => void;
}

const normalizeText = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/*
 * Bangladesh phone identity
 *
 * 01712345678
 * 1712345678
 * 8801712345678
 * +8801712345678
 *
 * all become:
 *
 * +8801712345678
 */
const normalizePhone = (value?: string | null) => {
  let digits = String(value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('880')) {
    digits = digits.slice(3);
  }

  digits = digits.replace(/^0+/, '');

  if (digits.length === 10 && digits.startsWith('1')) {
    return `+880${digits}`;
  }

  return value?.trim() || '';
};

const matchesCustomer = (
  customer: CustomerRecord,
  order: Order
) => {
  // 1. UUID match
  if (
    order.customer_id &&
    order.customer_id === customer.id
  ) {
    return true;
  }

  // 2. PHONE MATCH - primary identity
  const customerPhone = normalizePhone(customer.phone);
  const orderPhone = normalizePhone(order.customer_phone);

  if (
    customerPhone &&
    orderPhone &&
    customerPhone === orderPhone
  ) {
    return true;
  }

  // 3. Email fallback
  const customerEmail = normalizeText(customer.email);
  const orderEmail = normalizeText(order.customer_email);

  if (
    customerEmail &&
    orderEmail &&
    customerEmail === orderEmail
  ) {
    return true;
  }

  // 4. Final fallback only when phone/email unavailable
  if (
    !customerPhone &&
    !orderPhone &&
    !customerEmail &&
    !orderEmail
  ) {
    return (
      normalizeText(customer.full_name) ===
        normalizeText(order.customer_name) &&
      normalizeText(customer.address) ===
        normalizeText(order.shipping_address) &&
      normalizeText(customer.city) ===
        normalizeText(order.city)
    );
  }

  return false;
};

const buildSummary = (
  customer: CustomerRecord,
  customerOrders: Order[]
): CustomerSummary => {
  const sortedOrders = [...customerOrders].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  const latestOrder = sortedOrders[0];

  /*
   * Customer table information has priority.
   * If something is empty, use the latest order information.
   */
  const enrichedCustomer: CustomerRecord = {
    ...customer,

    full_name:
      customer.full_name ||
      latestOrder?.customer_name ||
      'Unknown Customer',

    email:
      customer.email ||
      latestOrder?.customer_email ||
      null,

    phone:
      normalizePhone(customer.phone) ||
      normalizePhone(latestOrder?.customer_phone) ||
      null,

    address:
      customer.address ||
      latestOrder?.shipping_address ||
      null,

    city:
      customer.city ||
      latestOrder?.city ||
      null,

    postal_code:
      customer.postal_code ||
      latestOrder?.postal_code ||
      null,

    created_at:
      customer.created_at ||
      latestOrder?.created_at ||
      new Date().toISOString(),

    updated_at:
      customer.updated_at ||
      latestOrder?.updated_at ||
      null
  };

  /*
   * Cancelled / returned orders are not counted as spent.
   */
  const financiallyCountable = sortedOrders.filter(
    (order) =>
      order.order_status !== 'cancelled' &&
      order.order_status !== 'returned'
  );

  const totalSpent = financiallyCountable.reduce(
    (sum, order) =>
      sum + Number(order.total_amount || 0),
    0
  );

  return {
    ...enrichedCustomer,

    orders: sortedOrders,

    totalOrders: sortedOrders.length,

    deliveredOrders: sortedOrders.filter(
      (order) =>
        order.order_status === 'delivered'
    ).length,

    cancelledOrders: sortedOrders.filter(
      (order) =>
        order.order_status === 'cancelled'
    ).length,

    totalSpent,

    averageOrderValue:
      financiallyCountable.length > 0
        ? totalSpent / financiallyCountable.length
        : 0,

    lastOrderDate:
      sortedOrders[0]?.created_at
  };
};

export const CustomersManager: React.FC<
  CustomersManagerProps
> = ({
  orders,
  onSelectCustomerOrder
}) => {
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] =
    useState('');

  const [customerRecords, setCustomerRecords] =
    useState<CustomerRecord[]>([]);

  const [pageOrders, setPageOrders] =
    useState<Order[]>([]);

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummary | null>(null);

  const [editingCustomer, setEditingCustomer] =
    useState<CustomerSummary | null>(null);

  const [saving, setSaving] =
    useState(false);

  /*
   * Load customers + orders directly from Supabase.
   */
  useEffect(() => {
    let active = true;

    const loadCustomers = async () => {
      setLoadingCustomers(true);

      /*
       * IMPORTANT:
       * status column removed because it does not exist
       * in the customers table.
       */
      const {
        data: customerData,
        error: customerError
      } = await supabase
        .from('customers')
        .select(
          'id, full_name, email, phone, address, city, postal_code, user_id, created_at, updated_at'
        )
        .order('created_at', {
          ascending: true
        });

      if (!active) return;

      if (customerError) {
        console.warn(
          'Customers table unavailable; using order customer data as fallback:',
          customerError.message
        );

        setCustomerRecords([]);
      } else {
        setCustomerRecords(
          (customerData || []) as CustomerRecord[]
        );
      }

      /*
       * Load orders independently.
       */
      const {
        data: orderData,
        error: orderError
      } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', {
          ascending: false
        });

      if (!active) return;

      if (orderError) {
        console.warn(
          'Orders could not be loaded in Customer Directory; using parent orders:',
          orderError.message
        );

        setPageOrders([]);
      } else {
        const normalizedOrders =
          (orderData || []).map((ord: any) => ({
            ...ord,

            subtotal:
              Number(ord.subtotal || 0),

            delivery_fee:
              Number(ord.delivery_fee || 0),

            customization_total:
              Number(
                ord.customization_total || 0
              ),

            discount:
              Number(ord.discount || 0),

            total_amount:
              Number(ord.total_amount || 0),

            total_cost:
              Number(ord.total_cost || 0),

            gross_profit:
              Number(ord.gross_profit || 0),

            profit_margin_percent:
              Number(
                ord.profit_margin_percent || 0
              ),

            items_count:
              Number(
                ord.items_count ||
                  ord.order_items?.length ||
                  0
              ),

            items:
              (ord.order_items || []).map(
                (item: any) => ({
                  ...item,

                  unit_price:
                    Number(
                      item.unit_price || 0
                    ),

                  cost_price:
                    Number(
                      item.cost_price || 0
                    ),

                  customization_fee:
                    Number(
                      item.customization_fee || 0
                    ),

                  subtotal:
                    Number(
                      item.subtotal || 0
                    )
                })
              )
          })) as Order[];

        setPageOrders(normalizedOrders);
      }

      setLoadingCustomers(false);
    };

    loadCustomers();

    return () => {
      active = false;
    };
  }, []);

  /*
   * Prefer directly loaded Supabase orders.
   * Otherwise use parent orders.
   */
  const effectiveOrders =
    pageOrders.length > 0
      ? pageOrders
      : orders;

  /*
   * Build customer list.
   */
  const customersList = useMemo(() => {
    const records = [...customerRecords];

    const usedOrderIds =
      new Set<string>();

    const summaries: CustomerSummary[] = [];

    /*
     * First: attach orders to real customers.
     */
    for (const customer of records) {
      const customerOrders =
        effectiveOrders.filter((order) => {
          const matched =
            matchesCustomer(
              customer,
              order
            );

          if (matched) {
            usedOrderIds.add(order.id);
          }

          return matched;
        });

      summaries.push(
        buildSummary(
          customer,
          customerOrders
        )
      );
    }

    /*
     * Orders that don't have a customer
     * record yet become virtual customers.
     */
    const unmatchedOrders =
      effectiveOrders.filter(
        (order) =>
          !usedOrderIds.has(order.id)
      );

    const virtualByKey =
      new Map<string, Order[]>();

    for (const order of unmatchedOrders) {
      const phone =
        normalizePhone(
          order.customer_phone
        );

      const email =
        normalizeText(
          order.customer_email
        );

      const key = phone
        ? `phone:${phone}`
        : email
          ? `email:${email}`
          : `guest:${normalizeText(
              order.customer_name
            )}|${normalizeText(
              order.shipping_address
            )}|${normalizeText(
              order.city
            )}`;

      const bucket =
        virtualByKey.get(key) || [];

      bucket.push(order);

      virtualByKey.set(
        key,
        bucket
      );
    }

    /*
     * Create virtual customer records.
     */
    for (const [
      key,
      customerOrders
    ] of virtualByKey) {
      const latest =
        [...customerOrders].sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        )[0];

      const virtualCustomer:
        CustomerRecord = {
          id: `order:${key}`,

          full_name:
            latest.customer_name ||
            'Unknown Customer',

          email:
            latest.customer_email ||
            null,

          phone:
            normalizePhone(
              latest.customer_phone
            ) || null,

          address:
            latest.shipping_address ||
            null,

          city:
            latest.city ||
            null,

          postal_code:
            latest.postal_code ||
            null,

          created_at:
            latest.created_at,

          updated_at:
            latest.updated_at
        };

      summaries.push(
        buildSummary(
          virtualCustomer,
          customerOrders
        )
      );
    }

    /*
     * Final duplicate protection.
     *
     * Phone is strongest identity.
     */
    const seen =
      new Set<string>();

    return summaries
      .filter((customer) => {
        const phone =
          normalizePhone(
            customer.phone
          );

        const email =
          normalizeText(
            customer.email
          );

        const key = phone
          ? `phone:${phone}`
          : email
            ? `email:${email}`
            : `guest:${normalizeText(
                customer.full_name
              )}|${normalizeText(
                customer.address
              )}|${normalizeText(
                customer.city
              )}`;

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);

        return true;
      })
      .sort(
        (a, b) =>
          b.totalSpent -
            a.totalSpent ||
          a.full_name.localeCompare(
            b.full_name
          )
      );
  }, [
    customerRecords,
    effectiveOrders
  ]);

  /*
   * Search.
   */
  const filteredCustomers =
    useMemo(() => {
      const q =
        normalizeText(searchTerm);

      if (!q) {
        return customersList;
      }

      const normalizedSearchPhone =
        normalizePhone(q);

      return customersList.filter(
        (customer) =>
          normalizeText(
            customer.full_name
          ).includes(q) ||
          (
            normalizedSearchPhone &&
            normalizePhone(
              customer.phone
            ).includes(
              normalizedSearchPhone
            )
          ) ||
          normalizeText(
            customer.email
          ).includes(q) ||
          normalizeText(
            customer.city
          ).includes(q) ||
          normalizeText(
            customer.address
          ).includes(q)
      );
    }, [
      customersList,
      searchTerm
    ]);

  /*
   * Export.
   */
  const handleExportCSV = () => {
    const rows =
      filteredCustomers.map(
        (customer) => ({
          Customer_Name:
            customer.full_name,

          Phone:
            customer.phone || '',

          Email:
            customer.email || '',

          City:
            customer.city || '',

          Total_Orders:
            customer.totalOrders,

          Total_Spent_BDT:
            customer.totalSpent,

          Last_Order_Date:
            customer.lastOrderDate
              ? new Date(
                  customer.lastOrderDate
                )
                  .toISOString()
                  .slice(0, 10)
              : ''
        })
      );

    exportToCsv(
      rows,
      `eleven_nation_customers_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );

    showToast(
      'Customer directory exported to CSV.',
      'success'
    );
  };

  /*
   * Open details.
   */
  const openDetails = (
    customer: CustomerSummary
  ) => {
    setSelectedCustomer(customer);
    setEditingCustomer(null);
  };

  /*
   * SAVE CUSTOMER
   *
   * Existing customer:
   * UPDATE
   *
   * Virtual order customer:
   * INSERT
   *
   * No status column.
   */
  const saveCustomer = async () => {
    if (!editingCustomer) {
      return;
    }

    setSaving(true);

    const payload = {
      full_name:
        editingCustomer.full_name.trim(),

      email:
        editingCustomer.email?.trim() ||
        null,

      phone:
        normalizePhone(
          editingCustomer.phone
        ) || null,

      address:
        editingCustomer.address?.trim() ||
        null,

      city:
        editingCustomer.city?.trim() ||
        null,

      postal_code:
        editingCustomer.postal_code?.trim() ||
        null,

      updated_at:
        new Date().toISOString()
    };

    let data:
      | CustomerRecord
      | null = null;

    let error: any = null;

    /*
     * Virtual customer:
     * create actual customer record.
     */
    if (
      editingCustomer.id.startsWith(
        'order:'
      )
    ) {
      const result =
        await supabase
          .from('customers')
          .insert({
            ...payload,
            created_at:
              new Date().toISOString()
          })
          .select(
            'id, full_name, email, phone, address, city, postal_code, user_id, created_at, updated_at'
          )
          .single();

      data =
        result.data as CustomerRecord | null;

      error =
        result.error;
    } else {
      /*
       * Existing customer:
       * update.
       */
      const result =
        await supabase
          .from('customers')
          .update(payload)
          .eq(
            'id',
            editingCustomer.id
          )
          .select(
            'id, full_name, email, phone, address, city, postal_code, user_id, created_at, updated_at'
          )
          .single();

      data =
        result.data as CustomerRecord | null;

      error =
        result.error;
    }

    setSaving(false);

    if (error || !data) {
      showToast(
        `Failed to save customer: ${
          error?.message ||
          'Unknown error'
        }`,
        'error'
      );

      return;
    }

    /*
     * Update local customer state.
     */
    setCustomerRecords(
      (current) => {
        const exists =
          current.some(
            (customer) =>
              customer.id ===
              data!.id
          );

        if (exists) {
          return current.map(
            (customer) =>
              customer.id === data!.id
                ? data!
                : customer
          );
        }

        return [
          ...current,
          data!
        ];
      }
    );

    /*
     * Rebuild selected customer
     * immediately after save.
     */
    const updatedSummary =
      buildSummary(
        data,
        effectiveOrders.filter(
          (order) =>
            matchesCustomer(
              data!,
              order
            )
        )
      );

    setSelectedCustomer(
      updatedSummary
    );

    setEditingCustomer(null);

    showToast(
      'Customer updated successfully.',
      'success'
    );
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
            Customer Directory
          </h1>

          <p className="text-xs text-zinc-400 mt-0.5">
            Profiles, lifetime value, delivery destinations, and purchase records ({filteredCustomers.length} shoppers)
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-colors border border-zinc-700 cursor-pointer"
        >
          <Download className="w-4 h-4 text-amber-400" />

          <span>
            Export Customers CSV
          </span>
        </button>
      </div>

      {/* SEARCH */}

      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />

          <input
            type="text"
            placeholder="Search customers by name, phone, or email..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* CUSTOMER TABLE */}

      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse text-xs">

            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">

                <th className="p-3.5 pl-4">
                  Customer Name
                </th>

                <th className="p-3.5">
                  Contact Details
                </th>

                <th className="p-3.5">
                  Location
                </th>

                <th className="p-3.5 text-center">
                  Orders
                </th>

                <th className="p-3.5">
                  Lifetime Value (LTV)
                </th>

                <th className="p-3.5">
                  Last Purchase
                </th>

                <th className="p-3.5 pr-4 text-right">
                  Action
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/60">

              {filteredCustomers.map(
                (customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >

                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-2.5">

                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
                          {customer.full_name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span className="font-bold text-white block">
                          {customer.full_name}
                        </span>

                      </div>
                    </td>

                    <td className="p-3.5">

                      <span className="font-mono text-zinc-300 block">
                        {customer.phone ||
                          'N/A'}
                      </span>

                      {customer.email && (
                        <span className="text-zinc-500 text-[11px]">
                          {customer.email}
                        </span>
                      )}

                    </td>

                    <td className="p-3.5">
                      <span className="text-zinc-300">
                        {customer.city ||
                          'N/A'}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">

                      <span className="font-bold font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {customer.totalOrders}
                      </span>

                    </td>

                    <td className="p-3.5 font-bold text-emerald-400 font-['Outfit'] text-sm">
                      {formatBDT(
                        customer.totalSpent
                      )}
                    </td>

                    <td className="p-3.5 text-zinc-400 text-[11px]">
                      {customer.lastOrderDate
                        ? formatDateTime(
                            customer.lastOrderDate
                          )
                        : '—'}
                    </td>

                    <td className="p-3.5 pr-4 text-right">

                      <button
                        onClick={() =>
                          openDetails(
                            customer
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md text-xs font-semibold transition-colors border border-zinc-700 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />

                        <span>
                          View Details
                        </span>
                      </button>

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

        {!loadingCustomers &&
          filteredCustomers.length ===
            0 && (
            <div className="p-10 text-center text-sm text-zinc-500">
              No customers found.
            </div>
          )}

      </div>

      {/* CUSTOMER DETAILS MODAL */}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-zinc-800">

              <div className="min-w-0">

                <h3 className="text-base sm:text-lg font-bold text-white font-['Outfit'] truncate">
                  {selectedCustomer.full_name}
                </h3>

                <p className="text-xs text-zinc-400 mt-1">
                  Customer details, purchase summary, and order history
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedCustomer(
                    null
                  )
                }
                className="text-zinc-400 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>

            </div>

            <div className="overflow-y-auto p-4 sm:p-6 space-y-5">

              {/* CUSTOMER INFORMATION */}

              <section className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">

                <div className="flex items-center justify-between gap-3 mb-4">

                  <h4 className="text-sm font-bold text-white">
                    Customer Information
                  </h4>

                  {!editingCustomer && (
                    <button
                      onClick={() =>
                        setEditingCustomer({
                          ...selectedCustomer
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-400" />

                      Edit Customer
                    </button>
                  )}

                </div>

                {/* EDIT MODE */}

                {editingCustomer ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {[
                      [
                        'Full Name',
                        'full_name'
                      ],
                      [
                        'Email',
                        'email'
                      ],
                      [
                        'Phone',
                        'phone'
                      ],
                      [
                        'Address',
                        'address'
                      ],
                      [
                        'City',
                        'city'
                      ],
                      [
                        'Postal Code',
                        'postal_code'
                      ]
                    ].map(
                      ([label, field]) => (
                        <label
                          key={field}
                          className="space-y-1.5"
                        >

                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                            {label}
                          </span>

                          <input
                            value={
                              (editingCustomer as any)[
                                field
                              ] || ''
                            }
                            onChange={(e) =>
                              setEditingCustomer(
                                {
                                  ...editingCustomer,
                                  [field]:
                                    e.target
                                      .value
                                }
                              )
                            }
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          />

                        </label>
                      )
                    )}

                    <div className="sm:col-span-2 flex justify-end gap-2 pt-2">

                      <button
                        onClick={() =>
                          setEditingCustomer(
                            null
                          )
                        }
                        className="px-3 py-2 rounded-lg border border-zinc-700 text-xs text-zinc-300"
                      >
                        Cancel
                      </button>

                      <button
                        disabled={saving}
                        onClick={
                          saveCustomer
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />

                        {saving
                          ? 'Saving...'
                          : 'Save Changes'}
                      </button>

                    </div>

                  </div>
                ) : (

                  /* VIEW MODE */

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {[
                      [
                        'Full Name',
                        selectedCustomer.full_name
                      ],
                      [
                        'Email',
                        selectedCustomer.email ||
                          'N/A'
                      ],
                      [
                        'Phone',
                        selectedCustomer.phone ||
                          'N/A'
                      ],
                      [
                        'Address',
                        selectedCustomer.address ||
                          'N/A'
                      ],
                      [
                        'City',
                        selectedCustomer.city ||
                          'N/A'
                      ],
                      [
                        'Postal Code',
                        selectedCustomer.postal_code ||
                          'N/A'
                      ],
                      [
                        'Account Created',
                        selectedCustomer.created_at
                          ? formatDateTime(
                              selectedCustomer.created_at
                            )
                          : 'N/A'
                      ],
                      [
                        'Last Updated',
                        selectedCustomer.updated_at
                          ? formatDateTime(
                              selectedCustomer.updated_at
                            )
                          : 'N/A'
                      ]
                    ].map(
                      ([label, value]) => (
                        <div
                          key={label}
                          className="min-w-0"
                        >

                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                            {label}
                          </p>

                          <p className="text-xs text-zinc-200 mt-1 break-words">
                            {value}
                          </p>

                        </div>
                      )
                    )}

                  </div>
                )}

              </section>

              {/* PURCHASE SUMMARY */}

              <section className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">

                <h4 className="text-sm font-bold text-white mb-3">
                  Purchase Summary
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  {[
                    [
                      'Total Orders',
                      selectedCustomer.totalOrders
                    ],
                    [
                      'Delivered Orders',
                      selectedCustomer.deliveredOrders
                    ],
                    [
                      'Cancelled Orders',
                      selectedCustomer.cancelledOrders
                    ],
                    [
                      'Total Spent',
                      formatBDT(
                        selectedCustomer.totalSpent
                      )
                    ],
                    [
                      'Average Order Value',
                      formatBDT(
                        selectedCustomer.averageOrderValue
                      )
                    ]
                  ].map(
                    ([label, value]) => (
                      <div
                        key={label}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
                      >

                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                          {label}
                        </p>

                        <p className="text-sm font-bold text-emerald-400 mt-1">
                          {value}
                        </p>

                      </div>
                    )
                  )}

                </div>

              </section>

              {/* ORDER HISTORY */}

              <section className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">

                <div className="flex items-center gap-2 mb-3">

                  <ShoppingBag className="w-4 h-4 text-amber-400" />

                  <h4 className="text-sm font-bold text-white">
                    Order History
                  </h4>

                </div>

                {selectedCustomer.orders.length ===
                0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No orders found for this customer.
                  </div>
                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[720px] text-left text-xs">

                      <thead>

                        <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">

                          <th className="p-2">
                            Order Number
                          </th>

                          <th className="p-2">
                            Date
                          </th>

                          <th className="p-2">
                            Items
                          </th>

                          <th className="p-2">
                            Amount
                          </th>

                          <th className="p-2">
                            Payment
                          </th>

                          <th className="p-2">
                            Status
                          </th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-zinc-800/60">

                        {selectedCustomer.orders.map(
                          (order) => (
                            <tr
                              key={order.id}
                              onClick={() =>
                                onSelectCustomerOrder(
                                  order
                                )
                              }
                              className="hover:bg-zinc-800/40 cursor-pointer"
                            >

                              <td className="p-2 font-mono font-bold text-white">
                                {order.order_number}
                              </td>

                              <td className="p-2 text-zinc-400">
                                {formatDateTime(
                                  order.created_at
                                )}
                              </td>

                              <td className="p-2 text-zinc-300">
                                {order.items
                                  .map(
                                    (item) =>
                                      `${item.quantity}x ${item.product_name} (${item.size})`
                                  )
                                  .join(', ')}
                              </td>

                              <td className="p-2 font-bold text-emerald-400">
                                {formatBDT(
                                  order.total_amount
                                )}
                              </td>

                              <td className="p-2 text-zinc-300">
                                {order.payment_status}
                              </td>

                              <td className="p-2 text-amber-400 uppercase font-bold">
                                {order.order_status}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </section>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};