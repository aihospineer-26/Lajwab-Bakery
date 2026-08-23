import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { radius, spacing } from '../theme';
import { SERIF_BOLD } from '../theme/typography';

/* onDone is supplied when onboarding is the only screen the navigator has
   registered — there is no MainTabs to navigate to yet, so the root has to be
   told to swap stacks. Absent when reached from the customer stack later. */
type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'> & {
  onDone?: () => void;
};

/* Light editorial slides rather than dark splash panels — the palette here
   matches the rest of the app so onboarding doesn't feel bolted on. */
const SLIDES = [
  {
    emoji: '🥐',
    title: 'Baked Fresh\nEvery Morning',
    body: 'Breads, cakes and cookies from our Janakpuri ovens — never a day old.',
    bg: '#FBF6F0',
    accent: '#B4553C',
  },
  {
    emoji: '🌿',
    title: '100% Veg,\n100% Eggless',
    body: 'Every single item on our menu. No eggs, no compromise — since 2011.',
    bg: '#F4E8E0',
    accent: '#7E3728',
  },
  {
    emoji: '🪔',
    title: 'Janmashtami\nSpecials Are Here',
    body: 'Order our 56 Bhog Thaali and get a complimentary bansuri. 50% off your first order.',
    bg: '#F7EDE5',
    accent: '#B4553C',
  },
];

export function OnboardingScreen({ navigation, onDone }: Props) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * screenWidth, animated: true });
    setActiveIndex(idx);
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setActiveIndex(idx);
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_seen', 'true');
    if (onDone) {
      onDone();
      return;
    }
    navigation.replace('MainTabs');
  };

  const slide = SLIDES[activeIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: slide.bg }]} edges={['top', 'bottom']}>
      <Pressable style={styles.skip} onPress={finish} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: screenWidth }]}>
            <Text style={styles.slideEmoji}>{s.emoji}</Text>
            <Text style={[styles.slideTitle, { color: '#2A1C16' }]}>{s.title}</Text>
            <Text style={styles.slideBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: slide.accent }]
                  : styles.dotInactive,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        {activeIndex < SLIDES.length - 1 ? (
          <Pressable
            style={[styles.btn, { backgroundColor: slide.accent }]}
            onPress={() => goTo(activeIndex + 1)}
          >
            <Text style={[styles.btnText, { color: '#FFFDFB' }]}>Next</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.btn, { backgroundColor: slide.accent }]} onPress={finish}>
            <Text style={[styles.btnText, { color: '#FFFDFB' }]}>Get Started</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  skipText: { fontSize: 11, color: '#947D6E', fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl * 1.5,
    gap: spacing.lg,
    paddingBottom: 60,
  },
  slideEmoji: { fontSize: 96 },
  slideTitle: {
    fontFamily: SERIF_BOLD,
    fontSize: 38,
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -0.6,
  },
  slideBody: {
    fontSize: 16,
    color: '#947D6E',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  dot: { height: 8, borderRadius: radius.full },
  dotActive: { width: 24 },
  dotInactive: { width: 8, backgroundColor: '#EADFD6' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  btn: {
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  btnText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
});
