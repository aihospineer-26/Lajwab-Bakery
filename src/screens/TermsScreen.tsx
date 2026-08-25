import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { SERVICE_AREA_LABEL } from '../data/serviceability';
import { STORE, hasFssai } from '../data/store';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;

const SECTIONS = [
  {
    title: 'Who we are',
    body: `${STORE.name} is a single bakery in ${STORE.area}, ${STORE.city}. Orders placed through this app are prepared and delivered by the bakery itself.`,
  },
  {
    title: 'Where we deliver',
    body: `We currently deliver only within ${SERVICE_AREA_LABEL} (pincode ${STORE.pincode}). If your address falls outside this area, the app will tell you at checkout rather than accepting an order we cannot fulfil.`,
  },
  {
    title: 'Orders and timing',
    body: `Most orders reach you in ${STORE.deliveryEta}. Cakes and the 56 Bhog Thaali are made to order and need a day of notice. Ordering hours are ${STORE.hours}.`,
  },
  {
    title: 'Prices and payment',
    body: 'All prices are in Indian Rupees and include applicable taxes. Payment is cash on delivery. Online payment will be added later, and these terms will be updated before it is.',
  },
  {
    title: 'Offers and coupons',
    body: 'Coupon codes are checked when the order is placed and each carries its own conditions — a minimum order value, an expiry date, or first-order-only. A code that no longer qualifies is refused at checkout rather than applied silently.',
  },
  {
    title: 'Cancellations',
    body: 'You may cancel any time before the bakery starts packing your order. Once packing has begun, ring the bakery and we will help where we can.',
  },
  {
    title: 'Freshness and substitutions',
    body: 'Everything is baked fresh, so availability changes through the day. If something sells out after you order, we will contact you before delivering rather than substituting it on our own.',
  },
  {
    title: 'Food information',
    body: 'Every item is 100% eggless and pure vegetarian. Our kitchen handles wheat, milk, nuts and soya, so we cannot guarantee an item is free of traces of these. Please ask before ordering if you have an allergy.',
  },
  {
    title: 'Your account',
    body: 'Your mobile number identifies your account. Keep access to it secure — anyone who can receive your verification code can place orders as you.',
  },
  {
    title: 'Contact',
    body: 'For anything about an order, use the Help screen in the app or visit the bakery.',
  },
];

export function TermsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Terms of Service" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: August 2026</Text>

        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Mandatory for a food business; hidden until the licence is filled in
            so a blank line never ships. */}
        {hasFssai ? (
          <Text style={styles.legal}>
            {STORE.name} · FSSAI Lic. No. {STORE.fssai}
            {STORE.gstin ? '  ·  GSTIN ' + STORE.gstin : ''}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl * 2,
      gap: spacing.lg,
    },
    updated: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    section: {
      gap: spacing.xs,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    sectionBody: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 22,
    },
    legal: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  });
}
