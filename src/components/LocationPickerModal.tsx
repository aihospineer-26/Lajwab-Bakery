import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { useLocation } from '../state/LocationContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function LocationPickerModal({ visible, onClose }: Props) {
  const { address, addresses, selectAddress } = useLocation();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={[typography.heading, styles.title]}>Deliver to</Text>
          {addresses.length === 0 ? (
            <Text style={[typography.caption, styles.empty]}>No saved addresses yet.</Text>
          ) : (
            addresses.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.item, item.id === address.id && styles.itemActive]}
                onPress={() => {
                  selectAddress(item);
                  onClose();
                }}
              >
                <Text style={typography.subheading}>{item.label}</Text>
                <Text style={typography.caption}>{item.line1}</Text>
              </Pressable>
            ))
          )}
          <Pressable
            style={styles.manageButton}
            onPress={() => {
              onClose();
              navigation.navigate('Addresses');
            }}
          >
            <Text style={styles.manageText}>+ Manage addresses</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      marginBottom: spacing.sm,
    },
    item: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      gap: 2,
    },
    itemActive: {
      backgroundColor: colors.primaryLight,
    },
    empty: {
      paddingVertical: spacing.sm,
    },
    manageButton: {
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    manageText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },
  });
}
