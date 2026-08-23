import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [comingSoonVisible, setComingSoonVisible] = useState(false);

  const handleDeliveryToggle = () => {
    if (canAccessDelivery) {
      setMode('delivery');
    } else {
      setComingSoonVisible(true);
    }
  };

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
            <Pressable style={styles.iconButton} onPress={handleDeliveryToggle} hitSlop={8}>
              <MaterialCommunityIcons name="moped-outline" size={19} color={colors.primaryDark} />
            </Pressable>

            <View style={styles.wordmarkWrap}>
              <Text style={styles.wordmark}>Lajwab</Text>
              <Text style={styles.wordmarkSub}>Tasty & Healthy</Text>
            </View>

            <Pressable style={styles.iconButton} onPress={open} hitSlop={8}>
              <Text style={styles.menuIcon}>☰</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setLocationOpen(true)} hitSlop={8} style={styles.deliverTo}>
            <Text style={styles.deliverToText} numberOfLines={1}>
              Deliver to {address.label} · 45 min ▾
            </Text>
          </Pressable>
        </>
      )}

      <LocationPickerModal visible={locationOpen} onClose={() => setLocationOpen(false)} />

      <Modal
        visible={comingSoonVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setComingSoonVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setComingSoonVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalEmoji}>🚴</Text>
            <Text style={styles.modalTitle}>Delivery Partner Mode</Text>
            <Text style={styles.modalDesc}>
              This feature is coming soon. Sign up as a delivery partner to get early access and start earning.
            </Text>
            <Pressable style={styles.modalButton} onPress={() => setComingSoonVisible(false)}>
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      alignItems: 'center',
      gap: spacing.md,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    modalEmoji: { fontSize: 48 },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    modalDesc: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 21,
      paddingHorizontal: spacing.lg,
    },
    modalButton: {
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xxl,
    },
    modalButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });
}
