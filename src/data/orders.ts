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
  paymentStatus?: PaymentStatus;
  deliverySlot?: string;
  couponCode?: string;
  discount?: number;
  deliveryFee?: number;
  /* Who to hand the order to and what number to ring on the way. Optional
     because rows stored before migration 004 lack them. */
  customerName?: string;
  customerPhone?: string;
};

/* Two methods, and only two. 'card' used to be permitted here and in the check
   constraint with nothing behind it, so an order could be recorded as
   card-paid that never was. */
export type PaymentMethod = 'cod' | 'upi';

/* Deliberately separate from OrderStatus. A prepaid order still walks the
   ordinary lifecycle -- the bakery just knows not to start baking until the
   money has landed -- and merging the two would mean inventing a status the
   trigger does not recognise. */
export type PaymentStatus = 'pending' | 'paid';

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

/* ---------- Payment ----------
 *
 * Payment state is reported alongside the order's stage, never folded into it.
 * "Being Prepared · UPI — Paid" tells the customer two true things; a single
 * merged label would have to drop one of them.
 */

export function normalizePaymentStatus(raw: string | null | undefined): PaymentStatus {
  return raw === 'paid' ? 'paid' : 'pending';
}

export function normalizePaymentMethod(raw: string | null | undefined): PaymentMethod {
  return raw === 'upi' ? 'upi' : 'cod';
}

/* What the customer is told about their money.
 *
 * A prepaid order says "Awaiting confirmation" and keeps saying it until
 * somebody at the bakery has actually seen the payment arrive -- opening the
 * UPI app, or coming back from it, proves nothing and changes nothing here. */
export function paymentLabel(method: PaymentMethod, status: PaymentStatus): string {
  if (method === 'cod') return 'Cash on Delivery';
  return status === 'paid' ? 'UPI — Paid' : 'UPI — Awaiting confirmation';
}

/** The bakery's version: what the queue needs to show at a glance. */
export function paymentBadge(method: PaymentMethod, status: PaymentStatus): string {
  if (method === 'cod') return 'COD';
  return status === 'paid' ? 'PAID' : 'AWAITING PAYMENT';
}

export function isAwaitingPayment(method: PaymentMethod, status: PaymentStatus): boolean {
  return method === 'upi' && status === 'pending';
}

/* The note the customer puts on the transfer, and the string the bakery matches
   it against in their UPI app. Derived from the real order id -- there is no
   second identifier anywhere in this flow. */
export function paymentNote(orderId: string): string {
  return 'Lajwab ' + formatOrderRef(orderId);
}

/* A UPI intent link. Android resolves upi:// to whichever apps are installed;
   desktop browsers generally do not, which is why the VPA is always shown as
   copyable text beside the button rather than hidden behind it.
   `am` is advisory -- several UPI apps let the payer edit the amount, so the
   bakery has to check the figure and not merely that something arrived. */
export function upiIntentUrl(vpa: string, payeeName: string, amount: number, orderId: string): string {
  const q = [
    'pa=' + encodeURIComponent(vpa.trim()),
    'pn=' + encodeURIComponent(payeeName),
    'am=' + encodeURIComponent(String(amount)),
    'cu=INR',
    'tn=' + encodeURIComponent(paymentNote(orderId)),
  ].join('&');
  return 'upi://pay?' + q;
}
