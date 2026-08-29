export type Coupon = {
  code: string;
  discount: string;
  /** `discount` is the display label; these drive the actual calculation */
  type: 'flat' | 'percent' | 'freeship';
  value: number;
  maxDiscount?: number;
  description: string;
  minOrder: number;
  validTill: string;
  color: string;
};

export type DealBanner = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  discount: string;
  bg: string;
  textColor: string;
};

/* One coupon, once per customer.
 *
 * JANMASHTAMI, LAJWAB100 and FREESHIP were also listed here and are gone: all
 * three had no per-customer limit in the database, so a single customer could
 * claim LAJWAB100's ₹100 on every order they ever placed. They are deactivated
 * in the coupons table too -- this list only advertises, the table enforces,
 * and the two must always be changed together or the app offers codes that
 * checkout then rejects. */
export const COUPONS: Coupon[] = [
  { code: 'FIRST50', discount: '50% OFF', type: 'percent', value: 50, maxDiscount: 150, description: 'Your first order — up to ₹150 off', minOrder: 0, validTill: '30 Sep', color: '#A9542F' },
];

export function findCoupon(code: string): Coupon | undefined {
  const normalized = code.trim().toUpperCase();
  return COUPONS.find(c => c.code === normalized);
}

export function calculateDiscount(coupon: Coupon, subtotal: number): number {
  if (coupon.type === 'flat') return Math.min(coupon.value, subtotal);
  if (coupon.type === 'percent') {
    const raw = Math.round((subtotal * coupon.value) / 100);
    return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  }
  return 0;
}

export const DEAL_BANNERS: DealBanner[] = [
  { id: '1', emoji: '🪔', title: '56 Bhog Thaali', subtitle: 'Free bansuri with every thaali', discount: 'Order a day ahead', bg: '#FDF0DC', textColor: '#7A3A1E' },
  { id: '2', emoji: '🎂', title: 'Fresh Cakes', subtitle: 'Eggless, baked to order', discount: 'From ₹450', bg: '#F5E4D7', textColor: '#7A3A1E' },
  { id: '3', emoji: '🍰', title: 'Butterscotch Pastry', subtitle: 'What Janakpuri comes back for', discount: 'Bestseller', bg: '#FDF0DC', textColor: '#7A4F00' },
  { id: '4', emoji: '🍞', title: 'Breads & Buns', subtitle: 'Out of the oven each morning', discount: 'From ₹40', bg: '#F7EEE2', textColor: '#7A3A1E' },
  { id: '5', emoji: '🥜', title: 'Namkeen & Mathi', subtitle: 'Freshly fried, by weight', discount: 'From ₹80', bg: '#FDF0DC', textColor: '#7A0B2E' },
];

/* The Flash Sale is gone, not emptied.
 *
 * Every "original price" in it was invented -- Aloo Patty was advertised as
 * reduced from ₹35 when ₹30 is simply what it costs, Khari Puff from ₹120 when
 * it is ₹100, and so on for all six. The percentages shown were computed from
 * those invented numbers, and nothing applied the "sale" price at checkout
 * because it was already the normal price. A struck-through price the bakery
 * never charged is not a placeholder, it is a false claim about a discount.
 *
 * If the bakery wants real time-limited deals, they need a source of truth in
 * the database that checkout also reads -- the same split as COUPONS above. */
