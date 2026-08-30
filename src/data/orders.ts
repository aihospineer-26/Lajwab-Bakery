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

/* Seeds order history while signed out so Orders isn't empty during preview. */
export const MOCK_ORDERS: Order[] = [
  { id: 'ORD1042', date: '20 Jun 2026', itemCount: 5, total: 312, status: 'delivered', createdAt: '2026-06-20T09:12:00.000Z' },
  { id: 'ORD1031', date: '14 Jun 2026', itemCount: 2, total: 98, status: 'delivered', createdAt: '2026-06-14T15:40:00.000Z' },
  { id: 'ORD1019', date: '02 Jun 2026', itemCount: 7, total: 540, status: 'cancelled', createdAt: '2026-06-02T11:05:00.000Z' },
];
