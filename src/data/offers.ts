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

export type FlashDeal = {
  id: string;
  name: string;
  emoji: string;
  originalPrice: number;
  salePrice: number;
};

export const COUPONS: Coupon[] = [
  { code: 'FIRST50', discount: '50% OFF', type: 'percent', value: 50, maxDiscount: 1000, description: 'Your first order — any amount', minOrder: 0, validTill: '30 Sep', color: '#A9542F' },
  { code: 'JANMASHTAMI', discount: '₹151 OFF', type: 'flat', value: 151, description: 'On the 56 Bhog Thaali', minOrder: 999, validTill: '3 Sep', color: '#C4452F' },
  { code: 'LAJWAB100', discount: '₹100 OFF', type: 'flat', value: 100, description: 'Min. order ₹599', minOrder: 599, validTill: '30 Sep', color: '#E8A33D' },
  { code: 'FREESHIP', discount: 'FREE DELIVERY', type: 'freeship', value: 0, description: 'No minimum order required', minOrder: 0, validTill: '30 Sep', color: '#3D8B5F' },
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
  { id: '1', emoji: '🪔', title: '56 Bhog Thaali', subtitle: 'Free bansuri with every thaali', discount: 'JANMASHTAMI', bg: '#FDF0DC', textColor: '#7A3A1E' },
  { id: '2', emoji: '🎂', title: 'Fresh Cakes', subtitle: 'Eggless, baked to order', discount: 'From ₹450', bg: '#F5E4D7', textColor: '#7A3A1E' },
  { id: '3', emoji: '🍰', title: 'Butterscotch Pastry', subtitle: 'What Janakpuri comes back for', discount: 'Bestseller', bg: '#FDF0DC', textColor: '#7A4F00' },
  { id: '4', emoji: '🍞', title: 'Breads & Buns', subtitle: 'Out of the oven each morning', discount: 'From ₹40', bg: '#F7EEE2', textColor: '#7A3A1E' },
  { id: '5', emoji: '🥜', title: 'Namkeen & Mathi', subtitle: 'Freshly fried, by weight', discount: 'From ₹80', bg: '#FDF0DC', textColor: '#7A0B2E' },
];

export const FLASH_DEALS: FlashDeal[] = [
  { id: 'f1', name: 'Butter Scotch Pastry', emoji: '🍰', originalPrice: 70, salePrice: 60 },
  { id: 'f2', name: 'Aloo Patty', emoji: '🥟', originalPrice: 35, salePrice: 30 },
  { id: 'f3', name: 'Brown Bread 400g', emoji: '🍞', originalPrice: 55, salePrice: 45 },
  { id: 'f4', name: 'Khari Puff 250g', emoji: '🥐', originalPrice: 120, salePrice: 100 },
  { id: 'f5', name: 'Bikaneri Bhujia 250g', emoji: '🥨', originalPrice: 110, salePrice: 90 },
  { id: 'f6', name: 'Choco Chip Cookies', emoji: '🍪', originalPrice: 190, salePrice: 160 },
];
