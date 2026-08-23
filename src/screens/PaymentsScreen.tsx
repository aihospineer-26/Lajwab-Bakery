import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { usePersistedState } from '../hooks/usePersistedState';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Payments'>;

type PaymentMethod = {
  id: string;
  emoji: string;
  label: string;
  detail: string;
  isDefault: boolean;
};

/* Card entries are gateway tokens — only the masked last-4 is ever held here.
   Raw card details are never collected in-app; the payment provider's own
   sheet handles that at checkout so card data never touches our code. */
const DEFAULT_METHODS: PaymentMethod[] = [
  { id: 'upi', emoji: '📱', label: 'UPI', detail: 'arjun@upi', isDefault: true },
  { id: 'card', emoji: '💳', label: 'Visa Card', detail: '•••• •••• •••• 4821', isDefault: false },
  { id: 'cod', emoji: '💵', label: 'Cash on Delivery', detail: 'Pay when it arrives', isDefault: false },
];

export function PaymentsScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [methods, setMethods] = usePersistedState<PaymentMethod[]>('payment_methods', DEFAULT_METHODS);

  const setDefault = (id: string) => {
    setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
  };

  const remove = (id: string) => {
    setMethods(prev => prev.filter(m => m.id !== id));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Payment Methods" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {methods.map((method) => (
          <Card key={method.id} style={styles.card}>
            <View style={styles.cardMain}>
              <Text style={styles.emoji}>{method.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Text style={typography.subheading}>{method.label}</Text>
                  {method.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={typography.caption}>{method.detail}</Text>
              </View>
            </View>
            {method.id !== 'cod' && (
              <View style={styles.cardActions}>
                {!method.isDefault && (
                  <Pressable onPress={() => setDefault(method.id)}>
                    <Text style={styles.actionLink}>Set default</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => remove(method.id)}>
                  <Text style={styles.removeLink}>Remove</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}

        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={typography.subheading}>Add a card at checkout</Text>
            <Text style={[typography.caption, styles.infoBody]}>
              Cards are added through our payment provider's secure sheet, so your
              card details never pass through Lajwab Bakery. Once saved, they'll appear here.
            </Text>
          </View>
        </Card>
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
      gap: spacing.md,
    },
    card: {
      gap: spacing.xs,
    },
    cardMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    emoji: {
      fontSize: 28,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    defaultBadge: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    defaultText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
    },
    cardActions: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.xs,
    },
    actionLink: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    removeLink: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.danger,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    infoIcon: {
      fontSize: 22,
    },
    infoBody: {
      marginTop: 2,
      lineHeight: 18,
    },
  });
}
