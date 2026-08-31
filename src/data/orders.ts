export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type Order = {
  id: string;
  date: string;
  itemCount: number;
  total: number;
  status: OrderStatus;
  /* Raw timestamp, kept alongside the display date so the staff queue can age
     orders. Optional because rows stored before this field was added lack it. */
  createdAt?: string;
  /* Snapshotted at checkout, not referenced by id — editing or deleting a saved
     address must never rewrite where a past order actually went. All optional
     because rows stored before migration 002 lack them. */
  deliveryAddress?: DeliveryAddress;
  paymentMethod?: PaymentMethod;
  deliverySlot?: string;
  couponCode?: string;
  discount?: number;
  deliveryFee?: number;
  /* Who to hand the order to and what number to ring on the way. Optional
     because rows stored before migration 004 lack them. */
  customerName?: string;
  customerPhone?: string;
};

export type PaymentMethod = 'cod' | 'upi' | 'card';

export type DeliveryAddress = {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
};

const ALL_STATUSES: OrderStatus[] = [
  'placed',
  'accepted',
  'packed',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

/* Pre-migration rows use Title Case display strings as their stored value.
   Both forms are accepted so the app works either side of migration 001. */
const LEGACY_STATUS: Record<string, OrderStatus> = {
  Processing: 'placed',
  'Out for Delivery': 'out_for_delivery',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
};

export function normalizeStatus(raw: string): OrderStatus {
  const legacy = LEGACY_STATUS[raw];
  if (legacy) return legacy;
  const snake = raw.trim().toLowerCase().replace(/ /g, '_') as OrderStatus;
  return ALL_STATUSES.includes(snake) ? snake : 'placed';
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Order Placed',
  accepted: 'Accepted',
  packed: 'Packed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/* Mirrors the orders_cancel_own RLS policy — kept in sync deliberately. */
const CANCELLABLE: OrderStatus[] = ['placed', 'accepted'];

export function isCancellable(status: OrderStatus): boolean {
  return CANCELLABLE.includes(status);
}

/* ---------- Customer-facing order progress ----------
 *
 * One step per real status, in the order the database trigger allows. The
 * confirmation screen and the tracking screen both read this list, so they
 * cannot drift apart or show a stage the backend is unable to be in.
 *
 * These labels are for customers; STATUS_LABEL above stays the operational
 * wording the bakery works in -- "Packed" is the button staff press, "Being
 * Prepared" is what that means to the person waiting for it. The ids are the
 * database's own, so the mapping is deterministic rather than invented. */
export const ORDER_STEPS: { id: OrderStatus; label: string; sub: string }[] = [
  { id: 'placed', label: 'Order Placed', sub: 'We have your order' },
  { id: 'accepted', label: 'Bakery Accepted', sub: 'The bakery confirmed it' },
  { id: 'packed', label: 'Being Prepared', sub: 'Baking and boxing it up' },
  { id: 'out_for_delivery', label: 'Out for Delivery', sub: 'Your order is on the way' },
  { id: 'delivered', label: 'Delivered', sub: 'Enjoy your order!' },
];

export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Order Placed',
  accepted: 'Bakery Accepted',
  packed: 'Being Prepared',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Order Cancelled',
};

/* How far along the tracker a status sits.
 *
 * A pure lookup on the stored status, and deliberately nothing else: the only
 * thing that may move a customer's progress is the bakery changing
 * orders.status. Nothing here reads the clock. A cancelled order has left the
 * sequence altogether and is drawn as its own terminal state. */
export function statusToStep(status: OrderStatus): number {
  const idx = ORDER_STEPS.findIndex(s => s.id === status);
  return idx === -1 ? 0 : idx;
}

/* What to print when someone needs to quote their order over the phone.
 *
 * place_order returns a uuid; that stays the identifier everywhere it matters.
 * This only shortens it for reading aloud, and derives it from the id itself,
 * so it always maps back to exactly one row -- which the random ORD-4034 the
 * confirmation screen used to invent never did. Short ids from the signed-out
 * local store pass through unchanged. */
export function formatOrderRef(id: string): string {
  const compact = id.replace(/-/g, '');
  if (compact.length <= 8) return id.toUpperCase();
  return compact.slice(-6).toUpperCase();
}
