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
  { q: 'How fast is delivery?', a: "Most orders reach you the same day. Cakes and the 56 Bhog Thaali need a day of notice so they are baked fresh." },
  /* No date was ever set for UPI or cards and no gateway is integrated, so
     "coming soon" was a promise nobody had made. */
  { q: 'What payment methods are supported?', a: 'Cash on delivery only. You pay the delivery person when your order arrives.' },
  { q: 'Can I cancel an order?', a: 'Yes — free of charge, until the bakery starts preparing it. After that, call us and we will do what we can.' },
  { q: 'Is everything eggless?', a: 'Yes. Every item we bake is 100% eggless and pure vegetarian.' },
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
