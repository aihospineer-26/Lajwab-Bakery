import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppMode } from '../state/AppModeContext';
import { useLocation } from '../state/LocationContext';
import { useSidePanel } from '../state/SidePanelContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
import { SERIF_BOLD } from '../theme/typography';
import { LocationPickerModal } from './LocationPickerModal';

type AppHeaderProps = {
  title?: string;
  onBack?: () => void;
};

export function AppHeader({ title, onBack }: AppHeaderProps) {
  const { open } = useSidePanel();
  const { address } = useLocation();
  const { colors } = useTheme();
  const { setMode, canAccessDelivery } = useAppMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [locationOpen, setLocationOpen] = useState(false);

  if (onBack) {
    return (
      <View style={styles.container}>
        <Pressable onPress={onBack} style={styles.iconButton} hitSlop={8}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
        <View style={styles.iconButton} />
      </View>
    );
  }

  /* Editorial masthead: centred wordmark with the icon rail flanking it, and
     the "deliver to" line demoted to a quiet tracked caption underneath. */
  return (
    <View style={styles.container}>
      {title ? (
        <Text style={styles.titleText}>{title}</Text>
      ) : (
        <>
          <View style={styles.mastheadRow}>
            {/* Only a rider sees the rider switch. It used to be shown to every
                customer and answered a tap with a "coming soon" sheet, which is
                a button that does nothing wearing the clothes of a feature. The
                empty view keeps the wordmark centred. */}
            {canAccessDelivery ? (
              <Pressable style={styles.iconButton} onPress={() => setMode('delivery')} hitSlop={8}>
                <MaterialCommunityIcons name="moped-outline" size={19} color={colors.primaryDark} />
              </Pressable>
            ) : (
              <View style={styles.iconButton} />
            )}

            <View style={styles.wordmarkWrap}>
              <Text style={styles.wordmark}>Lajwab</Text>
              <Text style={styles.wordmarkSub}>Tasty & Healthy</Text>
            </View>

            <Pressable style={styles.iconButton} onPress={open} hitSlop={8}>
              <Text style={styles.menuIcon}>☰</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setLocationOpen(true)} hitSlop={8} style={styles.deliverTo}>
            {/* "· 45 min" sat here on every screen. Nothing measures a delivery
                time, and the bakery delivers in booked slots rather than in
                minutes, so it was a speed promise no one had made. */}
            <Text style={styles.deliverToText} numberOfLines={1}>
              Deliver to {address.label} ▾
            </Text>
          </Pressable>
        </>
      )}

      <LocationPickerModal visible={locationOpen} onClose={() => setLocationOpen(false)} />
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
    },
    mastheadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleText: {
      fontFamily: SERIF_BOLD,
      fontSize: 21,
      color: colors.text,
      flex: 1,
    },
    wordmarkWrap: { flex: 1, alignItems: 'center' },
    wordmark: {
      fontFamily: SERIF_BOLD,
      fontSize: 25,
      color: colors.primaryDark,
      letterSpacing: 0.3,
    },
    wordmarkSub: {
      fontSize: 8.5,
      letterSpacing: 2.2,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginTop: 1,
    },
    deliverTo: { alignItems: 'center', marginTop: spacing.sm },
    deliverToText: {
      fontSize: 10,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      color: colors.textMuted,
      fontWeight: '600',
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIcon: { fontSize: 16, color: colors.primaryDark },
    backIcon: { fontSize: 20, color: colors.text, fontWeight: '700', lineHeight: 24 },

  });
}
