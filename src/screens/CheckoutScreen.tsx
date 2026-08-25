import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/types';
import { placeOrder } from '../services/orders';
import { DELIVERY_FEE, useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useLocation } from '../state/LocationContext';
import { STORE } from '../data/store';
import { PaymentMethod } from '../data/orders';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const DELIVERY_SLOTS = [
  { id: 'asap', label: 'As soon as possible', sub: STORE.deliveryEta, icon: '⚡' },
  { id: 'slot1', label: 'Today, 12:00 – 1:00 PM', sub: 'Standard slot', icon: '🕛' },
  { id: 'slot2', label: 'Today, 3:00 – 4:00 PM', sub: 'Standard slot', icon: '🕒' },
  { id: 'slot3', label: 'Today, 6:00 – 7:00 PM', sub: 'Evening slot', icon: '🌇' },
];

type PaymentOption = {
  id: PaymentMethod;
  label: string;
  sub: string;
  icon: string;
  /* Shown but not selectable until Razorpay is wired up. Kept visible rather
     than deleted so the customer can see online payment is coming, and so the
     rows are already in place when it lands. */
  comingSoon?: boolean;
};

const PAYMENT_METHODS: PaymentOption[] = [
  { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when your order arrives', icon: '💵' },
  { id: 'upi', label: 'UPI', sub: 'GPay, PhonePe, Paytm', icon: '📲', comingSoon: true },
  { id: 'card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay', icon: '💳', comingSoon: true },
];

export function CheckoutScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    quantities,
    totalItems,
    totalPrice,
    clearCart,
    appliedCoupon,
    discount,
    deliveryFee,
    grandTotal,
  } = useCart();
  const { products, refetchProducts } = useCatalog();
  const { address } = useLocation();

  const [selectedSlot, setSelectedSlot] = useState('asap');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cod');
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartProducts = products.filter(p => (quantities[p.id] ?? 0) > 0);

  const handlePlaceOrder = async () => {
    if (totalItems === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (!address.id) {
      setError('Please choose a delivery address first.');
      return;
    }
    setError(null);
    setIsPlacing(true);
    try {
      const items = cartProducts.map(p => ({
        productId: p.id,
        name: p.name,
        qty: quantities[p.id] ?? 0,
        price: p.price,
      }));
      const slot = DELIVERY_SLOTS.find(sl => sl.id === selectedSlot);
      await placeOrder(items, {
        address: {
          label: address.label,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          pincode: address.pincode,
        },
        paymentMethod: selectedPayment,
        deliverySlot: slot?.label ?? selectedSlot,
        deliveryFee,
        couponCode: appliedCoupon?.code,
        discount,
      });
      await refetchProducts();
      clearCart();
      navigation.navigate('OrderConfirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order. Please try again.');
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Checkout" onBack={() => navigation.goBack()} />
      <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deliver to</Text>
          <View style={styles.card}>
            <Text style={styles.addressIcon}>📍</Text>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>{address.label || 'No address selected'}</Text>
              {address.line1 ? <Text style={styles.addressLine}>{address.line1}</Text> : null}
            </View>
            <Pressable onPress={() => navigation.navigate('Addresses')} hitSlop={8}>
              <Text style={styles.changeLink}>Change</Text>
            </Pressable>
          </View>
        </View>

        {/* Delivery slot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Time</Text>
          <View style={styles.slotList}>
            {DELIVERY_SLOTS.map(slot => {
              const active = selectedSlot === slot.id;
              return (
                <Pressable
                  key={slot.id}
                  style={[styles.slotRow, active && styles.slotRowActive]}
                  onPress={() => setSelectedSlot(slot.id)}
                >
                  <Text style={styles.slotIcon}>{slot.icon}</Text>
                  <View style={styles.slotInfo}>
                    <Text style={[styles.slotLabel, active && styles.slotLabelActive]}>{slot.label}</Text>
                    <Text style={styles.slotSub}>{slot.sub}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.slotList}>
            {PAYMENT_METHODS.map(method => {
              const active = selectedPayment === method.id;
              const disabled = method.comingSoon === true;
              return (
                <Pressable
                  key={method.id}
                  disabled={disabled}
                  style={[
                    styles.slotRow,
                    active && styles.slotRowActive,
                    disabled && styles.slotRowDisabled,
                  ]}
                  onPress={() => setSelectedPayment(method.id)}
                >
                  <Text style={styles.slotIcon}>{method.icon}</Text>
                  <View style={styles.slotInfo}>
                    <Text style={[styles.slotLabel, active && styles.slotLabelActive]}>{method.label}</Text>
                    <Text style={styles.slotSub}>{method.sub}</Text>
                  </View>
                  {disabled ? (
                    <Text style={styles.comingSoon}>SOON</Text>
                  ) : (
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Order summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            {cartProducts.map(p => (
              <View key={p.id} style={styles.summaryItem}>
                <Text style={styles.summaryItemName} numberOfLines={1}>
                  {p.name} × {quantities[p.id]}
                </Text>
                <Text style={styles.summaryItemPrice}>₹{p.price * (quantities[p.id] ?? 0)}</Text>
              </View>
            ))}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Subtotal</Text>
              <Text style={styles.summaryRowValue}>₹{totalPrice}</Text>
            </View>
            {appliedCoupon && discount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Coupon · {appliedCoupon.code}</Text>
                <Text style={styles.discountValue}>− ₹{discount}</Text>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Delivery Fee</Text>
              {deliveryFee === 0 ? (
                <View style={styles.freeRow}>
                  <Text style={styles.freeStrike}>₹{DELIVERY_FEE}</Text>
                  <Text style={styles.freeLabel}>FREE</Text>
                </View>
              ) : (
                <Text style={styles.summaryRowValue}>₹{deliveryFee}</Text>
              )}
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{grandTotal}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
      </ScreenContainer>

      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.footerTotal}>₹{grandTotal}</Text>
            <Text style={styles.footerSub}>incl. all taxes</Text>
          </View>
          <Pressable
            style={[styles.placeBtn, (isPlacing || totalItems === 0) && styles.placeBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={isPlacing || totalItems === 0}
          >
            <Text style={styles.placeBtnText}>{isPlacing ? 'Placing...' : 'Place Order'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

    section: { gap: spacing.sm },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addressIcon: { fontSize: 20 },
    addressInfo: { flex: 1, gap: 2 },
    addressLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    addressLine: { fontSize: 13, color: colors.textMuted },
    changeLink: { fontSize: 13, fontWeight: '700', color: colors.primary },

    slotList: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    slotRowDisabled: {
      opacity: 0.45,
    },
    comingSoon: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.textMuted,
    },
    slotRowActive: { backgroundColor: colors.primaryLight },
    slotIcon: { fontSize: 20 },
    slotInfo: { flex: 1, gap: 2 },
    slotLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    slotLabelActive: { color: colors.primaryDark, fontWeight: '700' },
    slotSub: { fontSize: 12, color: colors.textMuted },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    summaryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryItemName: { fontSize: 13, color: colors.text, flex: 1, marginRight: spacing.sm },
    summaryItemPrice: { fontSize: 13, fontWeight: '600', color: colors.text },
    summaryDivider: { height: 1, backgroundColor: colors.border },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryRowLabel: { fontSize: 14, color: colors.textMuted },
    summaryRowValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
    freeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    freeStrike: { fontSize: 13, color: colors.textMuted, textDecorationLine: 'line-through' },
    freeLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },
    discountLabel: { fontSize: 14, color: colors.primary, fontWeight: '600' },
    discountValue: { fontSize: 14, color: colors.primary, fontWeight: '700' },
    totalLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
    totalValue: { fontSize: 16, fontWeight: '900', color: colors.primaryDark },

    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      gap: spacing.xs,
    },
    errorText: { fontSize: 13, color: colors.danger, textAlign: 'center' },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    footerTotal: { fontSize: 20, fontWeight: '900', color: colors.text },
    footerSub: { fontSize: 11, color: colors.textMuted },
    placeBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    placeBtnDisabled: { opacity: 0.6 },
    placeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  });
}
