import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { calculateDiscount, Coupon, findCoupon } from '../data/offers';
import { usePersistedState } from '../hooks/usePersistedState';
import { useCatalog } from './CatalogContext';

/* The cart used to live in plain component state, so backgrounding the app or
   reloading the tab emptied it -- while the theme and the onboarding flag both
   survived. Stored under the same mechanism the rest of the app already uses. */
const CART_KEY = 'lajwab.cart.quantities';

/* Only the code is stored, never the coupon object. A code withdrawn from
   COUPONS between sessions then resolves to nothing and is dropped, instead of
   a stale offer reappearing in a cart and being rejected at checkout. */
const CART_COUPON_KEY = 'lajwab.cart.coupon';

export const DELIVERY_FEE = 20;
export const FREE_DELIVERY_THRESHOLD = 200;

type ApplyResult = { ok: boolean; message: string };

type CartContextValue = {
  quantities: Record<string, number>;
  getQuantity: (productId: string) => number;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => ApplyResult;
  removeCoupon: () => void;
  discount: number;
  deliveryFee: number;
  grandTotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getProductById, products, isLoading } = useCatalog();
  const [quantities, setQuantities, cartHydrated] = usePersistedState<Record<string, number>>(CART_KEY, {});
  const [couponCode, setCouponCode] = usePersistedState<string | null>(CART_COUPON_KEY, null);

  const appliedCoupon = useMemo(() => (couponCode ? findCoupon(couponCode) ?? null : null), [couponCode]);

  /* A cart restored from storage describes yesterday's shelf. Once the real
     catalogue has loaded, drop anything the bakery no longer sells or has sold
     out of, and clamp anything now above what was baked -- otherwise the
     customer reaches checkout and place_order refuses the whole order.
     Runs on every catalogue change, so it also covers stock moving underneath a
     cart that has been sitting open. */
  useEffect(() => {
    if (!cartHydrated || isLoading || products.length === 0) return;
    setQuantities((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const [id, qty] of Object.entries(prev)) {
        const product = products.find((p) => p.id === id);
        if (!product || product.stock <= 0) { changed = true; continue; }
        const capped = Math.min(qty, product.stock);
        if (capped !== qty) changed = true;
        next[id] = capped;
      }
      return changed ? next : prev;
    });
  }, [cartHydrated, isLoading, products, setQuantities]);

  const increment = (productId: string) => {
    const product = getProductById(productId);
    setQuantities((prev) => {
      const current = prev[productId] ?? 0;
      if (product && current >= product.stock) return prev;
      return { ...prev, [productId]: current + 1 };
    });
  };

  const decrement = (productId: string) => {
    setQuantities((prev) => {
      const current = prev[productId] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  };

  const getQuantity = (productId: string) => quantities[productId] ?? 0;

  const clearCart = () => {
    setQuantities({});
    setCouponCode(null);
  };

  const { totalItems, totalPrice } = useMemo(() => {
    let items = 0;
    let price = 0;
    for (const [productId, qty] of Object.entries(quantities)) {
      const product = getProductById(productId);
      if (!product) continue;
      items += qty;
      price += product.price * qty;
    }
    return { totalItems: items, totalPrice: price };
  }, [quantities, getProductById]);

  const applyCoupon = useCallback(
    (code: string): ApplyResult => {
      const trimmed = code.trim();
      if (!trimmed) return { ok: false, message: 'Enter a coupon code' };

      const coupon = findCoupon(trimmed);
      if (!coupon) return { ok: false, message: `"${trimmed.toUpperCase()}" is not a valid code` };

      if (totalPrice < coupon.minOrder) {
        const short = coupon.minOrder - totalPrice;
        return { ok: false, message: `Add ₹${short} more to use this coupon` };
      }

      setCouponCode(coupon.code);
      return { ok: true, message: `${coupon.code} applied — ${coupon.discount}` };
    },
    [totalPrice, setCouponCode],
  );

  const removeCoupon = useCallback(() => setCouponCode(null), [setCouponCode]);

  // A coupon stays applied while the cart shrinks below its minimum, so re-check here
  const couponIsValid = appliedCoupon !== null && totalPrice >= appliedCoupon.minOrder;
  const activeCoupon = couponIsValid ? appliedCoupon : null;

  const discount = activeCoupon ? calculateDiscount(activeCoupon, totalPrice) : 0;

  const earnedFreeDelivery = totalPrice >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee =
    earnedFreeDelivery || activeCoupon?.type === 'freeship' || totalPrice === 0 ? 0 : DELIVERY_FEE;

  const grandTotal = Math.max(totalPrice - discount + deliveryFee, 0);

  return (
    <CartContext.Provider
      value={{
        quantities,
        getQuantity,
        increment,
        decrement,
        clearCart,
        totalItems,
        totalPrice,
        appliedCoupon: activeCoupon,
        applyCoupon,
        removeCoupon,
        discount,
        deliveryFee,
        grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
