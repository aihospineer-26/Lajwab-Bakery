import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Faq'>;

const faqs = [
  { q: 'How fast is delivery?', a: 'Most orders arrive within 10–15 minutes of placing them, depending on your location.' },
  { q: 'What payment methods are supported?', a: 'Cards, UPI, and cash on delivery will be supported once checkout is connected to a backend.' },
  { q: 'Can I cancel an order?', a: 'Yes — orders can be cancelled before they are packed. This will be enabled once order tracking is live.' },
  { q: 'Do you offer refunds for damaged items?', a: 'Yes, damaged or missing items are eligible for a refund or replacement.' },
];

export function FaqScreen({ navigation }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="FAQs" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {faqs.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <Pressable key={item.q} onPress={() => setOpenIndex(isOpen ? null : index)}>
              <Card style={styles.card}>
                <Text style={typography.subheading}>{item.q}</Text>
                {isOpen ? (
                  <Text style={[typography.body, styles.answer]}>{item.a}</Text>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
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
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    card: {
      gap: spacing.xs,
    },
    answer: {
      color: colors.textMuted,
    },
  });
}
