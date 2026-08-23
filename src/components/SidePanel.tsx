import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { navigate, NoParamScreen } from '../navigation/navigationRef';
import { useSidePanel } from '../state/SidePanelContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

const menuItems: { id: string; label: string; emoji: string; screen: NoParamScreen }[] = [
  { id: 'profile', label: 'Profile', emoji: '🙍', screen: 'Profile' },
  { id: 'settings', label: 'Settings', emoji: '⚙️', screen: 'Settings' },
  { id: 'support', label: 'Customer Support', emoji: '🎧', screen: 'CustomerSupport' },
  { id: 'faqs', label: 'FAQs', emoji: '❓', screen: 'Faq' },
];

export function SidePanel() {
  const { isOpen, close } = useSidePanel();
  const { width } = useWindowDimensions();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const panelWidth = Math.min(300, width * 0.78);

  /* Panel slide */
  const translateX = useRef(new Animated.Value(panelWidth)).current;
  /* Backdrop fade */
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  /* Per-item entrance anims */
  const itemAnims = useRef(menuItems.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (isOpen) {
      /* Panel springs in */
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
        mass: 0.85,
      }).start();
      /* Backdrop fades in */
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      /* Menu items cascade in */
      Animated.stagger(
        55,
        itemAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 14,
            stiffness: 160,
          }),
        ),
      ).start();
    } else {
      Animated.timing(translateX, {
        toValue: panelWidth,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
      /* Reset item anims for next open */
      itemAnims.forEach(anim => anim.setValue(0));
    }
  }, [isOpen, panelWidth]);

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={close}>
      <View style={styles.root}>
        {/* Animated backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Sliding panel */}
        <Animated.View
          style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}
        >
          <Text style={[typography.heading, styles.title]}>Menu</Text>

          {menuItems.map((item, idx) => (
            <Animated.View
              key={item.id}
              style={{
                opacity: itemAnims[idx],
                transform: [
                  {
                    translateX: itemAnims[idx].interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                style={styles.item}
                onPress={() => {
                  close();
                  navigate(item.screen);
                }}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={typography.subheading}>{item.label}</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    backdrop: {
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    panel: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      paddingTop: spacing.xxl,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 20,
      shadowOffset: { width: -4, height: 0 },
      elevation: 16,
    },
    title: {
      marginBottom: spacing.md,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    emoji: {
      fontSize: 20,
    },
  });
}
