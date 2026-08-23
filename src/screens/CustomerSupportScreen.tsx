import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerSupport'>;

const options = [
  {
    id: 'call',
    emoji: '📞',
    label: 'Call Support',
    detail: '+91 1800 123 4567',
    note: 'Mon–Sat, 9am–9pm',
    available: true,
    action: () => Linking.openURL('tel:+9118001234567'),
  },
  {
    id: 'email',
    emoji: '✉️',
    label: 'Email Us',
    detail: 'support@grocewell.app',
    note: 'Reply within 24 hours',
    available: true,
    action: () => Linking.openURL('mailto:support@grocewell.app'),
  },
  {
    id: 'chat',
    emoji: '💬',
    label: 'Live Chat',
    detail: 'Instant support',
    note: 'Coming soon',
    available: false,
    action: undefined,
  },
];

const faqs = [
  { q: 'My order is late', a: "Call or email support with your order ID and we'll check immediately." },
  { q: 'Wrong item delivered', a: "Send a photo to support@grocewell.app — we'll refund or redeliver same day." },
  { q: 'Request a refund', a: 'Refunds are processed within 24 hours back to your original payment method.' },
];

export function CustomerSupportScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Help & Support" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Contact options */}
        <Text style={styles.sectionLabel}>Contact Us</Text>
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={option.action}
            disabled={!option.available}
            style={[styles.card, !option.available && styles.cardDisabled]}
          >
            <View style={[styles.iconWrap, !option.available && styles.iconWrapDisabled]}>
              <Text style={styles.emoji}>{option.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, !option.available && styles.cardLabelDisabled]}>
                {option.label}
              </Text>
              <Text style={styles.cardDetail}>{option.detail}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {option.available ? (
                <Text style={styles.chevron}>›</Text>
              ) : (
                <View style={styles.comingSoon}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              )}
              <Text style={styles.cardNote}>{option.note}</Text>
            </View>
          </Pressable>
        ))}

        {/* Quick help */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Quick Help</Text>
        {faqs.map((item) => (
          <View key={item.q} style={styles.faqCard}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </View>
        ))}

        {/* Response time note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            ⚡ Average response time: <Text style={styles.noteBold}>under 5 minutes</Text> for urgent order issues.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardDisabled: {
      opacity: 0.6,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDisabled: {
      backgroundColor: colors.surfaceMuted,
    },
    emoji: {
      fontSize: 24,
    },
    cardLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    cardLabelDisabled: {
      color: colors.textMuted,
    },
    cardDetail: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    cardNote: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 3,
    },
    chevron: {
      fontSize: 22,
      color: colors.primary,
      fontWeight: '700',
      lineHeight: 24,
    },
    comingSoon: {
      backgroundColor: '#FEF3C7',
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    comingSoonText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#D97706',
    },
    faqCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.xs,
    },
    faqQ: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    faqA: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
    },
    noteCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.xs,
    },
    noteText: {
      fontSize: 13,
      color: colors.primary,
      lineHeight: 19,
    },
    noteBold: {
      fontWeight: '800',
    },
  });
}
