import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { colors, typography, isDark, toggleDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [locationAccess, setLocationAccess] = useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.row}>
          <Text style={typography.subheading}>Dark Mode</Text>
          <Switch value={isDark} onValueChange={toggleDark} trackColor={{ true: colors.primary }} />
        </Card>
        <Card style={styles.row}>
          <Text style={typography.subheading}>Order Updates</Text>
          <Switch value={orderUpdates} onValueChange={setOrderUpdates} trackColor={{ true: colors.primary }} />
        </Card>
        <Card style={styles.row}>
          <Text style={typography.subheading}>Promotions & Offers</Text>
          <Switch value={promotions} onValueChange={setPromotions} trackColor={{ true: colors.primary }} />
        </Card>
        <Card style={styles.row}>
          <Text style={typography.subheading}>Location Access</Text>
          <Switch value={locationAccess} onValueChange={setLocationAccess} trackColor={{ true: colors.primary }} />
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
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  });
}
