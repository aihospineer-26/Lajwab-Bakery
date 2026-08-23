import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { calculateDiscount, Coupon, findCoupon } from '../data/offers';
import { useCatalog } from './CatalogContext';

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
  const { getProductById } = useCatalog();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

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
    setAppliedCoupon(null);
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

      setAppliedCoupon(coupon);
      return { ok: true, message: `${coupon.code} applied — ${coupon.discount}` };
    },
    [totalPrice],
  );

  const removeCoupon = useCallback(() => setAppliedCoupon(null), []);

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
