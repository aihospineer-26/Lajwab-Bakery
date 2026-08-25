import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SavingsReport'>;

const WEEKLY = [
  { day: 'Mon', saved: 42 },
  { day: 'Tue', saved: 85 },
  { day: 'Wed', saved: 23 },
  { day: 'Thu', saved: 67 },
  { day: 'Fri', saved: 110 },
  { day: 'Sat', saved: 95 },
  { day: 'Sun', saved: 20 },
];

const CATEGORIES = [
  { name: 'Cakes', saved: 148, icon: '🎂' },
  { name: 'Pastries', saved: 97, icon: '🍰' },
  { name: 'Breads & Buns', saved: 55, icon: '🍞' },
  { name: 'Cookies', saved: 47, icon: '🍪' },
];

export function SavingsReportScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const totalWeek = WEEKLY.reduce((s, d) => s + d.saved, 0);
  const maxBar = Math.max(...WEEKLY.map(d => d.saved));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="My Savings Report" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero stat */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Saved This Week</Text>
          <Text style={styles.heroAmount}>₹{totalWeek}</Text>
          <Text style={styles.heroSub}>vs. local market prices</Text>
        </View>

        {/* Bar chart (mock) */}
        <View style={styles.sectionCard}>
          <Text style={[typography.subheading, { marginBottom: spacing.md }]}>Daily Breakdown</Text>
          <View style={styles.barChart}>
            {WEEKLY.map(day => (
              <View key={day.day} style={styles.barCol}>
                <Text style={styles.barAmount}>₹{day.saved}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.round((day.saved / maxBar) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barDay}>{day.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* By category */}
        <View style={styles.sectionCard}>
          <Text style={[typography.subheading, { marginBottom: spacing.sm }]}>Savings by Category</Text>
          {CATEGORIES.map((cat, idx) => (
            <View key={cat.name} style={[styles.catRow, idx < CATEGORIES.length - 1 && styles.catBorder]}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[typography.body, { flex: 1 }]}>{cat.name}</Text>
              <Text style={styles.catSaved}>₹{cat.saved}</Text>
            </View>
          ))}
        </View>

        {/* AI tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>🤖 AI Tip for Next Week</Text>
          <Text style={styles.tipBody}>
            Buying tomatoes on Monday and Thursday typically saves 18–22% compared to weekends. Consider bundling with onions for an extra 8% discount.
          </Text>
        </View>
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
      gap: spacing.md,
    },
    heroCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: radius.xl,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroLabel: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroAmount: {
      fontSize: 48,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 56,
    },
    heroSub: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.65)',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    barChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 120,
      gap: spacing.xs,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
    },
    barAmount: {
      fontSize: 9,
      color: colors.textMuted,
      marginBottom: 3,
    },
    barTrack: {
      width: '70%',
      height: 80,
      justifyContent: 'flex-end',
    },
    barFill: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      minHeight: 4,
    },
    barDay: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
      fontWeight: '600',
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    catBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    catIcon: { fontSize: 20, width: 26, textAlign: 'center' },
    catSaved: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.primary,
    },
    tipCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.sm,
    },
    tipTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    tipBody: {
      fontSize: 13,
      color: colors.primary,
      lineHeight: 20,
      opacity: 0.85,
    },
  });
}
