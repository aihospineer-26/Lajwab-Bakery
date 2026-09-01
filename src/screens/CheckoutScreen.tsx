import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/types';
import { newRequestId, placeOrder } from '../services/orders';
import { DELIVERY_FEE, useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useLocation } from '../state/LocationContext';
import { STORE } from '../data/store';
import { PaymentMethod } from '../data/orders';
import { dayLabel, leadTimeForCart, leadTimeLabel } from '../data/preOrder';
import { validatePincode } from '../data/serviceability';
import { digitsOnly, formatMobile, isValidMobile } from '../services/otp';
import { useStoreSettings } from '../services/storeSettings';
import { useAuth } from '../state/AuthContext';
import { useUserProfile } from '../state/UserProfileContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { SERIF_BOLD } from '../theme/typography';
import { errorMessage } from '../utils/errorMessage';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const CONTACT_KEY = 'lajwab.checkout.contact';

/* A tiny tactile compress on tap, shared by the slot and payment rows so
   picking an option feels like touching something rather than flipping a
   database value. */
function SelectRow({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable style={style} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

function buildSlots(leadDays: number) {
  const day = dayLabel(leadDays);
  const timed = [
    { id: 'slot1', label: day + ', 12:00 - 1:00 PM', sub: 'Standard slot', icon: '🕛' },
    { id: 'slot2', label: day + ', 3:00 - 4:00 PM', sub: 'Standard slot', icon: '🕒' },
    { id: 'slot3', label: day + ', 6:00 - 7:00 PM', sub: 'Evening slot', icon: '🌇' },
  ];
  /* Express is dropped entirely when something in the cart needs notice --
     offering it would be promising what the bakery cannot bake in time. */
  if (leadDays > 0) return timed;
  return [{ id: 'asap', label: 'As soon as possible', sub: STORE.deliveryEta, icon: '⚡' }, ...timed];
}

type PaymentOption = {
  id: PaymentMethod;
  label: string;
  sub: string;
  icon: string;
  comingSoon?: boolean;
};

/* Two methods, mutually exclusive.
 *
 * Prepaid UPI only appears once the owner has set a VPA on the dashboard --
 * an unconfigured one would be a payment screen with nowhere to send the
 * money. place_order refuses a UPI order in that state too, so the option
 * cannot be forced back on from a tampered client.
 *
 * COD covers whatever the bakery takes at the door, cash or a scan. From the
 * system's side it stays one thing: money not yet collected. */
const COD_OPTION: PaymentOption = {
  id: 'cod',
  label: 'Cash on Delivery',
  sub: 'Pay when your order arrives',
  icon: '💵',
};

const UPI_OPTION: PaymentOption = {
  id: 'upi',
  label: 'Pay online — UPI',
  sub: 'Pay now, before we prepare your order',
  icon: '📲',
};
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
  const { session } = useAuth();
  const { address } = useLocation();
  const settings = useStoreSettings();

  /* Prepaid appears only when there is somewhere for the money to go. */
  const upiVpa = settings.upiVpa.trim();
  const paymentMethods = useMemo(
    () => (upiVpa ? [UPI_OPTION, COD_OPTION] : [COD_OPTION]),
    [upiVpa],
  );

  const leadDays = useMemo(
    () => leadTimeForCart(Object.keys(quantities).filter((id) => (quantities[id] ?? 0) > 0)),
    [quantities],
  );
  const slots = useMemo(() => buildSlots(leadDays), [leadDays]);

  const [selectedSlot, setSelectedSlot] = useState(slots[0].id);

  /* Adding a pre-order item removes the express slot, so a previously chosen
     express selection has to fall back rather than silently persist. */
  useEffect(() => {
    if (!slots.some((sl) => sl.id === selectedSlot)) setSelectedSlot(slots[0].id);
  }, [slots, selectedSlot]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cod');
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* One id per checkout attempt, minted on the first tap and kept until an
     order actually lands. A second tap, or a retry after the response was lost
     on a patchy connection, therefore carries the id the server already has
     and gets back the same order instead of placing another. Cleared on
     success so the customer's next order is a genuinely new one.
     The isPlacing flag below still hides most double taps -- but it is React
     state, so two taps inside one render pass both pass it, and it cannot help
     at all once the request has left the device. */
  const requestIdRef = useRef<string | null>(null);
  const placeBtnScale = useRef(new Animated.Value(1)).current;
  const onPlacePressIn = () => Animated.spring(placeBtnScale, { toValue: 0.96, useNativeDriver: true, speed: 35, bounciness: 4 }).start();
  const onPlacePressOut = () => Animated.spring(placeBtnScale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 10 }).start();

  const { profile, updateProfile } = useUserProfile();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  /* The number is never typed here -- it is the one the customer proved they
     hold at sign-in, so asking again would invite a typo on the one field the
     bakery depends on to deliver. Read straight off the session. */
  useEffect(() => {
    const verified = session?.user?.phone;
    if (verified) setCustomerPhone(digitsOnly(verified).slice(-10));
  }, [session]);

  /* The name is not part of signing in, so it is asked for once and then reused.
     The profile is the better source of the two -- it is what the customer sees
     under their own name on the Account screen -- so it wins, and the older
     checkout-only copy is the fallback for anyone who filled that in first.
     Either way nobody should have to type their name at every order. */
  useEffect(() => {
    const fromProfile = profile.name.trim();
    if (fromProfile) {
      setCustomerName(fromProfile);
      return;
    }
    AsyncStorage.getItem(CONTACT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as { name?: string };
        if (saved.name) setCustomerName(saved.name);
      } catch {
        /* corrupt entry, not worth surfacing -- the field just starts empty */
      }
    });
  }, [profile.name]);

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
    /* The pincode was only ever checked when an address was first saved, so an
       address that predates the rule -- or one whose area the bakery later stops
       covering -- could still be selected here and reach the kitchen as an order
       nobody can deliver. This is the last gate before that happens. */
    const outOfArea = validatePincode(address.pincode ?? '');
    if (outOfArea) {
      setError(outOfArea);
      return;
    }
    if (customerName.trim() === '') {
      setError('Please tell us who the order is for.');
      return;
    }
    /* Checked before the number, because the number now comes from the signed-in
       session rather than from anything typed on this screen. */
    if (!session) {
      navigation.navigate('Login');
      return;
    }
    if (!isValidMobile(customerPhone)) {
      setError('We could not read your verified number. Please sign in again.');
      return;
    }
    setError(null);
    setIsPlacing(true);

    /* Everything that can legitimately fail the order lives in this block, and
       nothing else does. Once place_order returns, the row exists and the
       customer has ordered -- so no later step is allowed to reach setError and
       claim otherwise. */
    let newOrderId: string;
    try {
      const items = cartProducts.map(p => ({
        productId: p.id,
        name: p.name,
        qty: quantities[p.id] ?? 0,
        price: p.price,
      }));
      const slot = slots.find(sl => sl.id === selectedSlot);
      if (requestIdRef.current === null) requestIdRef.current = newRequestId();
      newOrderId = await placeOrder(items, {
        address: {
          label: address.label,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          pincode: address.pincode,
        },
        paymentMethod: selectedPayment,
        deliverySlot: slot?.label ?? selectedSlot,
        customerName: customerName.trim(),
        customerPhone: digitsOnly(customerPhone),
        requestId: requestIdRef.current,
        deliveryFee,
        couponCode: appliedCoupon?.code,
        discount,
      });
    } catch (err) {
      /* The id is deliberately kept. A rejection means no row was written, so
         reusing it simply places the order; a lost response means one may well
         have been, and reusing it returns that order instead of a second one.
         Minting a fresh id here is what would duplicate. */
      setError(errorMessage(err, 'Could not place order. Please try again.'));
      setIsPlacing(false);
      return;
    }

    /* ---- The order exists from here on. Bookkeeping only. ---- */

    /* Each of these is a convenience, and none is worth telling a customer
       their order failed over. Written back so the Account screen greets them
       by the name they just gave, and the next order arrives already filled. */
    try {
      if (customerName.trim() !== profile.name.trim()) {
        updateProfile({ name: customerName.trim() });
      }
      await AsyncStorage.setItem(CONTACT_KEY, JSON.stringify({ name: customerName.trim() }));
    } catch {
      /* The name just isn't remembered for next time. */
    }

    try {
      await refetchProducts();
    } catch {
      /* Stock counts stay stale until the next fetch. */
    }

    try {
      clearCart();
    } catch {
      /* Cart still holds the ordered items. The request id below is still set,
         so a second tap returns this same order rather than placing another. */
    }

    /* The id place_order returned, carried through so the confirmation screen
       reads this order's real status instead of animating a made-up one. */
    setIsPlacing(false);
    navigation.navigate('OrderConfirmation', { orderId: newOrderId });

    /* Cleared only once the handoff is done, so this checkout cannot be
       replayed onto the order it just created -- and never before, because
       every path that still holds it is idempotent and every path that has
       lost it is not. */
    requestIdRef.current = null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Checkout" onBack={() => navigation.goBack()} />
      <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Browsing is public; ordering is not. Say so here rather than letting
            the Place Order button bounce to a login screen with no explanation,
            and promise the cart explicitly -- the fear that stops people signing
            in mid-checkout is losing the basket they just filled. */}
        {!session ? (
          <View style={styles.signInNotice}>
            <Text style={styles.signInNoticeTitle}>Sign in to place this order</Text>
            <Text style={styles.signInNoticeBody}>
              We verify your mobile number so the bakery can call you about your
              delivery. Your cart is saved — you'll come straight back here.
            </Text>
            <Pressable style={styles.signInNoticeBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInNoticeBtnText}>Sign in</Text>
            </Pressable>
          </View>
        ) : null}

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

        {/* Contact — the bakery rings ahead, so this is not optional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Details</Text>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Who is this order for?"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              autoComplete="name"
              accessibilityLabel="Your name"
            />
            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Mobile Number</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phonePrefix}>+91</Text>
              <Text style={styles.phoneVerified}>{formatMobile(customerPhone)}</Text>
            </View>
            <Text style={styles.fieldHint}>
              Verified when you signed in. We call this number before delivering.
            </Text>
          </View>
        </View>

        {/* Delivery slot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Time</Text>
          {leadDays > 0 ? (
            <View style={styles.leadNotice}>
              <Text style={styles.leadNoticeText}>
                Your order includes something we bake to order, so the earliest we can
                deliver is {dayLabel(leadDays).toLowerCase()}.
              </Text>
            </View>
          ) : null}
          <View style={styles.slotList}>
            {slots.map(slot => {
              const active = selectedSlot === slot.id;
              return (
                <SelectRow
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
                </SelectRow>
              );
            })}
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.slotList}>
            {paymentMethods.map(method => {
              const active = selectedPayment === method.id;
              const disabled = method.comingSoon === true;
              return (
                <SelectRow
                  key={method.id}
                  style={[
                    styles.slotRow,
                    active && styles.slotRowActive,
                    disabled && styles.slotRowDisabled,
                  ]}
                  onPress={() => !disabled && setSelectedPayment(method.id)}
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
                </SelectRow>
              );
            })}
          </View>
          {selectedPayment === 'upi' ? (
            <Text style={styles.payNote}>
              You will see the UPI details on the next screen. The bakery starts
              preparing your order once they have confirmed your payment.
            </Text>
          ) : null}
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
          <Animated.View style={{ transform: [{ scale: placeBtnScale }] }}>
            <Pressable
              style={[styles.placeBtn, (isPlacing || totalItems === 0) && styles.placeBtnDisabled]}
              onPress={handlePlaceOrder}
              onPressIn={onPlacePressIn}
              onPressOut={onPlacePressOut}
              disabled={isPlacing || totalItems === 0}
            >
              <Text style={styles.placeBtnText}>{isPlacing ? 'Placing...' : 'Place Order'}</Text>
            </Pressable>
          </Animated.View>
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
    sectionTitle: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 1.4, textTransform: 'uppercase' },

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
    fieldCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.xs,
    },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
    fieldLabelSpaced: { marginTop: spacing.sm },
    input: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      color: colors.text,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    phonePrefix: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textMuted,
      paddingHorizontal: spacing.xs,
    },
    phoneInput: { flex: 1 },
    /* Not an input -- the number is already verified, so it reads as settled
       fact rather than an empty box inviting a correction. */
    phoneVerified: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
    addressLabel: { fontFamily: SERIF_BOLD, fontSize: 15.5, color: colors.text },
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
    signInNotice: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      gap: spacing.xs,
    },
    signInNoticeTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    signInNoticeBody: { fontSize: 12.5, lineHeight: 19, color: colors.textMuted },
    signInNoticeBtn: {
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    signInNoticeBtnText: { color: colors.textOnPrimary, fontWeight: '700', fontSize: 13 },
    leadNotice: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    leadNoticeText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.text,
    },
    slotRowDisabled: {
      opacity: 0.45,
    },
    payNote: {
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
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
    summaryRowLabel: { fontSize: 13, color: colors.textMuted },
    summaryRowValue: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    freeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    freeStrike: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
    freeLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },
    discountLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    discountValue: { fontSize: 13, color: colors.primary, fontWeight: '700' },
    totalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    totalValue: { fontFamily: SERIF_BOLD, fontSize: 21, color: colors.primaryDark },

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
    footerTotal: { fontFamily: SERIF_BOLD, fontSize: 23, color: colors.text },
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
    placeBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: '800' },
  });
}
