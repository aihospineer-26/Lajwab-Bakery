import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';
import { RootStackParamList } from '../navigation/types';
import { digitsOnly, formatMobile, isValidMobile } from '../services/otp';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

function ci(filename: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=200`;
}

const ALL_IMAGES = [
  '🎂', '🍰', '🥐', '🍞', '🍪', '🧁', '🥖', '🥨',
  '🪔', '🍫', '🥧', '🍩', '🥜', '🥟', '🫓', '🍮',
];

// 4 rows of 4 images each
const ROWS = [
  ALL_IMAGES.slice(0, 4),
  ALL_IMAGES.slice(4, 8),
  ALL_IMAGES.slice(8, 12),
  ALL_IMAGES.slice(12, 16),
];

// Alternating directions, different speeds per row
const ROW_CONFIG = [
  { goRight: false, duration: 18000 },
  { goRight: true,  duration: 14000 },
  { goRight: false, duration: 22000 },
  { goRight: true,  duration: 16000 },
];

const TILE_GAP = 8;
const NUM_COLS = 4;

type ScrollRowProps = {
  images: string[];
  tileSize: number;
  goRight: boolean;
  duration: number;
  bgColor: string;
};

function ScrollRow({ images, tileSize, goRight, duration, bgColor }: ScrollRowProps) {
  // Each row doubles its images so the loop is seamless:
  // goRight=false (left scroll): 0 → -singleWidth, reset to 0
  // goRight=true  (right scroll): -singleWidth → 0, reset to -singleWidth
  const singleWidth = images.length * (tileSize + TILE_GAP);
  const translateX = useRef(new Animated.Value(goRight ? -singleWidth : 0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: goRight ? 0 : -singleWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const doubled = [...images, ...images];

  return (
    <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }], marginBottom: TILE_GAP }}>
      {doubled.map((uri, i) => (
        <View
          key={i}
          style={{
            width: tileSize,
            height: tileSize,
            borderRadius: radius.lg,
            backgroundColor: bgColor,
            overflow: 'hidden',
            marginRight: TILE_GAP,
          }}
        >
          <Text style={{ fontSize: tileSize * 0.5, lineHeight: tileSize, textAlign: 'center' }}>{uri}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tileSize = Math.floor((width - TILE_GAP * (NUM_COLS + 1)) / NUM_COLS);
  const { sendOtp } = useAuth();

  const [mobile, setMobile] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const [partnerNoticeVisible, setPartnerNoticeVisible] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, delay: 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 11, bounciness: 3, delay: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleContinue = async () => {
    const local = digitsOnly(mobile);
    if (!local) { setMobileError('Enter your mobile number to continue'); return; }
    if (!isValidMobile(local)) { setMobileError('Enter a valid 10-digit mobile number'); return; }
    setMobileError(null);
    setFormError(null);
    setIsSending(true);
    const sendError = await sendOtp(local);
    setIsSending(false);
    if (sendError) { setFormError(sendError); return; }
    navigation.navigate('VerifyOtp', { mobile: local });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Scrolling product mosaic */}
          <View style={styles.mosaic}>
            {ROWS.map((rowImages, i) => (
              <ScrollRow
                key={i}
                images={rowImages}
                tileSize={tileSize}
                goRight={ROW_CONFIG[i].goRight}
                duration={ROW_CONFIG[i].duration}
                bgColor={colors.primaryLight}
              />
            ))}
            <LinearGradient
              colors={['transparent', colors.background]}
              style={[styles.mosaicFade, { height: tileSize * 1.4 }]}
              pointerEvents="none"
            />
          </View>

          {/* Brand */}
          <Animated.View style={[styles.brand, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoMark}>
              <Text style={styles.logoEmoji}>🌿</Text>
            </View>
            <Text style={styles.brandName}>Lajwab Bakery</Text>
            <Text style={styles.brandSub}>Tasty & Healthy · Janakpuri</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.form, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.formHeading}>Log in or sign up</Text>

            <Text style={styles.formSub}>
              We'll send a 6-digit code on WhatsApp to confirm it's you.
            </Text>

            <FormInput
              label="Mobile number"
              placeholder="98765 43210"
              prefix="+91"
              keyboardType="phone-pad"
              autoCapitalize="none"
              maxLength={11}
              value={formatMobile(mobile)}
              onChangeText={(t) => { setMobile(digitsOnly(t)); setMobileError(null); }}
              error={mobileError ?? undefined}
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Button label="Continue" onPress={handleContinue} loading={isSending} />

            {/* No separate sign-up: the first verified code creates the account. */}
            <Text style={styles.terms}>
              By continuing you agree to our{' '}
              <Text style={styles.linkAccent}>Terms of Service</Text> and{' '}
              <Text style={styles.linkAccent}>Privacy Policy</Text>.
            </Text>

            <View style={styles.partnerDivider} />

            {/* Signpost, not a role picker — role comes from the server at sign-in.
                Becomes a Play Store deep link once the rider app is split out. */}
            <Pressable
              onPress={() => setPartnerNoticeVisible(true)}
              hitSlop={8}
              style={styles.partnerLink}
            >
              <MaterialCommunityIcons name="moped-outline" size={16} color={colors.textMuted} />
              <Text style={styles.partnerText}>
                {"Delivery partner? "}<Text style={styles.linkAccent}>Learn more</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={partnerNoticeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPartnerNoticeVisible(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setPartnerNoticeVisible(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetIcon}>
              <MaterialCommunityIcons name="moped-outline" size={26} color={colors.primary} />
            </View>
            <Text style={styles.sheetTitle}>Delivery Partners</Text>
            <Text style={styles.sheetBody}>
              Partner accounts are set up by the Lajwab Bakery team. Sign in with the
              mobile number you registered with and you'll go straight to your
              deliveries — no extra step needed.
            </Text>
            <Text style={styles.sheetBody}>
              Want to ride with us? Write to{' '}
              <Text style={styles.linkAccent}>partners@lajwabbakery.in</Text>
            </Text>
            <Pressable style={styles.sheetButton} onPress={() => setPartnerNoticeVisible(false)}>
              <Text style={styles.sheetButtonText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scroll: { flexGrow: 1 },

    mosaic: {
      overflow: 'hidden',
      paddingTop: TILE_GAP,
    },
    mosaicFade: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },

    brand: {
      alignItems: 'center',
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      gap: 6,
    },
    logoMark: {
      width: 54,
      height: 54,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    logoEmoji: { fontSize: 24 },
    brandName: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.1,
    },
    brandSub: {
      fontSize: 13,
      color: colors.textMuted,
    },

    form: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    formHeading: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    formError: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
    },
    link: {
      alignItems: 'center',
      paddingTop: spacing.xs,
    },
    linkText: { fontSize: 14, color: colors.textMuted },
    terms: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
      paddingTop: spacing.xs,
    },
    linkAccent: { color: colors.primary, fontWeight: '700' },

    formSub: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginTop: -spacing.xs,
    },

    partnerDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: spacing.xs,
    },
    partnerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.xs,
    },
    partnerText: { fontSize: 13, color: colors.textMuted },

    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingTop: spacing.md,
      alignItems: 'center',
      gap: spacing.sm,
    },
    sheetHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    sheetIcon: {
      width: 54,
      height: 54,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
    sheetBody: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
    sheetButton: {
      alignSelf: 'stretch',
      backgroundColor: colors.primary,
      borderRadius: radius.full,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    sheetButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  });
}
