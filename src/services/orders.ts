import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DeliveryAddress,
  isCancellable,
  MOCK_ORDERS,
  normalizeStatus,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from '../data/orders';
import { decrementLocalStock } from './inventory';
import { supabase } from './supabase';

type OrderRow = {
  id: string;
  total: number;
  item_count: number;
  status: string;
  created_at: string;
  delivery_address: DeliveryAddress | null;
  payment_method: PaymentMethod | null;
  delivery_slot: string | null;
  coupon_code: string | null;
  discount: number | null;
  delivery_fee: number | null;
};

type OrderItemRow = {
  id: string;
  product_id: string;
  name_at_purchase: string;
  qty: number;
  price_at_purchase: number;
};

export type NewOrderItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
};

/* Everything the order needs beyond its line items. Before this existed the
   address and payment method were dropped at the client boundary, so an order
   reached the bakery with no delivery destination. */
export type OrderDetails = {
  address: DeliveryAddress;
  paymentMethod: PaymentMethod;
  deliverySlot: string;
  couponCode?: string;
  /* Both preview-mode only. Signed in, place_order recomputes the discount and
     the delivery fee itself and ignores whatever the client thinks they are. */
  deliveryFee: number;
  discount: number;
};

const ORDER_COLUMNS =
  'id, total, item_count, status, created_at, delivery_address, payment_method, delivery_slot, coupon_code, discount, delivery_fee';

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    date: formatDate(row.created_at),
    itemCount: row.item_count,
    total: row.total,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    deliveryAddress: row.delivery_address ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    deliverySlot: row.delivery_slot ?? undefined,
    couponCode: row.coupon_code ?? undefined,
    discount: row.discount ?? undefined,
    deliveryFee: row.delivery_fee ?? undefined,
  };
}

const LOCAL_ORDERS_KEY = 'local_orders';
const LOCAL_ORDER_ITEMS_KEY = 'local_order_items';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* Preview mode has no authenticated session, so RLS rejects the real tables.
   Mirroring the orders / order_items split locally means the same screens and
   the same call sites work either side of sign-in. */
async function readLocalOrders(): Promise<Order[]> {
  const orders = await readJson<Order[] | null>(LOCAL_ORDERS_KEY, null);
  if (!orders) return MOCK_ORDERS;
  // Normalized on read so orders stored before the status migration still work
  return orders.map(o => ({ ...o, status: normalizeStatus(o.status) }));
}

async function writeLocalOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
}

async function readLocalItems(): Promise<Record<string, OrderItem[]>> {
  return readJson<Record<string, OrderItem[]>>(LOCAL_ORDER_ITEMS_KEY, {});
}

export async function placeOrder(items: NewOrderItem[], details: OrderDetails): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    const id = `ORD${Math.floor(1000 + Math.random() * 8999)}`;
    const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const total = Math.max(subtotal - details.discount + details.deliveryFee, 0);

    const now = new Date().toISOString();
    const newOrder: Order = {
      id,
      date: formatDate(now),
      itemCount,
      total,
      status: 'placed',
      createdAt: now,
      deliveryAddress: details.address,
      paymentMethod: details.paymentMethod,
      deliverySlot: details.deliverySlot,
      couponCode: details.couponCode,
      discount: details.discount,
      deliveryFee: details.deliveryFee,
    };
    const existing = await readLocalOrders();
    await writeLocalOrders([newOrder, ...existing]);

    const allItems = await readLocalItems();
    allItems[id] = items.map((i, idx) => ({
      id: `${id}-${idx}`,
      productId: i.productId,
      name: i.name,
      qty: i.qty,
      price: i.price,
    }));
    await AsyncStorage.setItem(LOCAL_ORDER_ITEMS_KEY, JSON.stringify(allItems));

    await decrementLocalStock(items.map(i => ({ productId: i.productId, qty: i.qty })));

    return id;
  }

  // Only ids and quantities go to the server — prices are read from the
  // products table inside place_order so a tampered client can't set its own
  // total, and the coupon is re-validated and re-priced there too.
  const { data, error } = await supabase.rpc('place_order', {
    items: items.map(item => ({ product_id: item.productId, qty: item.qty })),
    details: {
      delivery_address: details.address,
      payment_method: details.paymentMethod,
      delivery_slot: details.deliverySlot,
      coupon_code: details.couponCode ?? null,
    },
  });
  if (error) throw error;
  return data as string;
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    const allItems = await readLocalItems();
    return allItems[orderId] ?? [];
  }

  const { data, error } = await supabase
    .from('order_items')
    .select('id, product_id, name_at_purchase, qty, price_at_purchase')
    .eq('order_id', orderId);
  if (error) throw error;

  return (data as OrderItemRow[]).map(row => ({
    id: row.id,
    productId: row.product_id,
    name: row.name_at_purchase,
    qty: row.qty,
    price: row.price_at_purchase,
  }));
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    const existing = await readLocalOrders();
    const target = existing.find(o => o.id === orderId);
    if (!target) throw new Error('Order not found');
    if (!isCancellable(target.status)) {
      throw new Error('This order can no longer be cancelled');
    }
    await writeLocalOrders(
      existing.map(o => (o.id === orderId ? { ...o, status: 'cancelled' } : o)),
    );
    return;
  }

  // Bounding the update by cancellable statuses means a stale local step
  // simulation can never cancel an order the store has already packed.
  // The orders_cancel_own RLS policy enforces the same rule server-side.
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .in('status', ['placed', 'accepted'])
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('This order can no longer be cancelled');
  }
}

export async function fetchOrders(): Promise<Order[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return readLocalOrders();
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data as OrderRow[]).map(mapOrderRow);
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    const existing = await readLocalOrders();
    return existing.find(o => o.id === orderId) ?? null;
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return mapOrderRow(data as OrderRow);
}

/* ---------- Staff / rider side ---------- */

/** Orders the store still has work to do on, oldest first — a work queue. */
export async function fetchActiveOrders(): Promise<Order[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const active: OrderStatus[] = ['placed', 'accepted', 'packed', 'out_for_delivery'];

  if (!sessionData.session) {
    const existing = await readLocalOrders();
    return existing.filter(o => active.includes(o.status)).reverse();
  }

  // Readable because the orders_select policy grants staff access to all rows
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .in('status', active)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data as OrderRow[]).map(mapOrderRow);
}

/** Every order the store has ever taken, newest first — the admin ledger.
 *  Staff see all rows via the orders_select policy; a customer's token is
 *  scoped by RLS to their own, so this is safe to call from either side. */
export async function fetchAllOrders(): Promise<Order[]> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    const existing = await readLocalOrders();
    return [...existing].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data as OrderRow[]).map(mapOrderRow);
}

/** Staff cancellation. Unlike cancelOrder, this is not bounded by the customer's
 *  cancellable window — the store can call off an order it has already packed. */
export async function cancelOrderAsStaff(orderId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    const existing = await readLocalOrders();
    await writeLocalOrders(
      existing.map(o => (o.id === orderId ? { ...o, status: 'cancelled' } : o)),
    );
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .not('status', 'in', '("delivered","cancelled")')
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('This order is already delivered or cancelled');
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    const existing = await readLocalOrders();
    await writeLocalOrders(existing.map(o => (o.id === orderId ? { ...o, status } : o)));
    return;
  }

  // Permitted by the orders_staff_update policy; a customer's token is rejected.
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Could not update this order — it may have been cancelled');
  }
}
