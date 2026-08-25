import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect your name, email, phone number, and delivery address to process orders. We also collect usage data to improve the app experience.',
  },
  {
    title: 'How We Use Your Data',
    body: 'Your data is used exclusively to fulfill orders, send order updates, and improve our service. We do not sell personal data to third parties.',
  },
  {
    title: 'Data Storage',
    body: 'All data is stored securely with industry-standard encryption. We retain order history for 2 years for your reference.',
  },
  {
    title: 'Your Rights',
    body: 'You may request a copy of your data, update your profile at any time, or contact us to have your account deleted.',
  },
  {
    title: 'Cookies & Analytics',
    body: 'We use anonymized analytics to understand how people use the Lajwab Bakery app. No personally identifiable information is included in these reports.',
  },
  {
    title: 'Contact',
    body: 'For any privacy-related question, speak to us at the bakery in Janakpuri, or use the contact options on the Help screen.',
  },
];

export function PrivacyPolicyScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Privacy Policy" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: June 2026</Text>
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
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
  });
}
