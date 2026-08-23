import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppMode } from '../state/AppModeContext';
import { useLocation } from '../state/LocationContext';
import { useSidePanel } from '../state/SidePanelContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';
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

  return (
    <View style={styles.container}>
      {title ? (
        <Text style={styles.titleText}>{title}</Text>
      ) : (
        <Pressable onPress={() => setLocationOpen(true)} hitSlop={8} style={styles.locationWrap}>
          <View style={styles.etaRow}>
            <Text style={styles.etaFlash}>⚡</Text>
            <Text style={styles.etaLabel}>Fresh delivery in </Text>
            <Text style={styles.etaTime}>45 minutes</Text>
          </View>
          <View style={styles.locationRow}>
            <Text style={styles.pinIcon}>📍</Text>
            <Text style={styles.addressLabel} numberOfLines={1}>
              {address.label} ▾
            </Text>
          </View>
        </Pressable>
      )}

      <View style={styles.right}>
        <Pressable style={styles.iconButton} onPress={handleDeliveryToggle} hitSlop={8}>
          <MaterialCommunityIcons name="moped-outline" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={open} hitSlop={8}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
      </View>

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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: colors.primaryDark,
    },
    titleText: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
      flex: 1,
    },
    locationWrap: {
      flex: 1,
      marginRight: spacing.sm,
    },
    etaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginBottom: 3,
    },
    etaFlash: { fontSize: 12 },
    etaLabel: { fontSize: 12, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
    etaTime: { fontSize: 12, color: '#FCD535', fontWeight: '800' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    pinIcon: { fontSize: 13 },
    addressLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      maxWidth: 220,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuIcon: { fontSize: 18, color: '#FFFFFF' },
    backIcon: { fontSize: 20, color: '#FFFFFF', fontWeight: '700', lineHeight: 24 },

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
