import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { banners } from '../data/banners';
import { festivals } from '../data/festivals';
import { useTheme } from '../state/ThemeContext';
import { radius, spacing } from '../theme';
import { FestiveOfferBanner } from './FestiveOfferBanner';

const FESTIVAL_WINDOW_DAYS = 21;
const AUTO_SCROLL_INTERVAL = 3200;

function getUpcomingFestival() {
  const now = Date.now();
  const windowMs = FESTIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return festivals.find((festival) => {
    const diff = new Date(`${festival.date}T00:00:00`).getTime() - now;
    return diff >= 0 && diff <= windowMs;
  });
}

export function PromoBanner() {
  const { width } = useWindowDimensions();
  const { typography } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const cardWidth = Math.min(300, width - spacing.lg * 2 - 40);
  const upcomingFestival = useMemo(() => getUpcomingFestival(), []);

  const allCards = useMemo(() => {
    const extras = upcomingFestival ? ['festival'] : [];
    return [...extras, ...banners.map(b => b.id)];
  }, [upcomingFestival]);

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isUserScrolling = useRef(false);
  const currentIndex = useRef(0);

  /* Dot scale animations */
  const dotScales = useRef(allCards.map((_, i) => new Animated.Value(i === 0 ? 1.4 : 1))).current;

  const animateDot = (nextIndex: number) => {
    const prev = currentIndex.current;
    currentIndex.current = nextIndex;
    setActiveIndex(nextIndex);
    Animated.parallel([
      Animated.spring(dotScales[nextIndex], { toValue: 1.4, useNativeDriver: true, speed: 24, bounciness: 10 }),
      Animated.spring(dotScales[prev], { toValue: 1, useNativeDriver: true, speed: 24 }),
    ]).start();
  };

  /* Auto-scroll */
  useEffect(() => {
    if (allCards.length <= 1) return;
    const id = setInterval(() => {
      if (isUserScrolling.current) return;
      const next = (currentIndex.current + 1) % allCards.length;
      scrollRef.current?.scrollTo({
        x: next * (cardWidth + spacing.md),
        animated: true,
      });
      animateDot(next);
    }, AUTO_SCROLL_INTERVAL);
    return () => clearInterval(id);
  }, [allCards.length, cardWidth]);

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        decelerationRate="fast"
        snapToInterval={cardWidth + spacing.md}
        snapToAlignment="start"
        onScrollBeginDrag={() => { isUserScrolling.current = true; }}
        onMomentumScrollEnd={(e) => {
          isUserScrolling.current = false;
          const idx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + spacing.md));
          animateDot(Math.max(0, Math.min(idx, allCards.length - 1)));
        }}
      >
        {upcomingFestival ? (
          <FestiveOfferBanner festival={upcomingFestival} width={cardWidth} />
        ) : null}
        {banners.map((banner) => (
          <LinearGradient
            key={banner.id}
            colors={banner.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.card, { width: cardWidth }]}
          >
            <Text style={styles.emoji}>{banner.emoji}</Text>
            <Text style={[typography.subheading, styles.title]}>{banner.title}</Text>
            <Text style={[typography.caption, styles.subtitle]}>{banner.subtitle}</Text>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Dot pagination */}
      {allCards.length > 1 ? (
        <View style={styles.dots}>
          {allCards.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
                { transform: [{ scale: dotScales[i] }] },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    row: {
      gap: spacing.md,
      paddingBottom: spacing.xs,
    },
    card: {
      height: 110,
      borderRadius: radius.xl,
      padding: spacing.lg,
      justifyContent: 'center',
      gap: spacing.xs,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    emoji: {
      fontSize: 26,
      marginBottom: spacing.xs,
    },
    title: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    subtitle: {
      color: 'rgba(255,255,255,0.82)',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    dotActive: {
      backgroundColor: '#B4553C',
      width: 16,
      borderRadius: 3,
    },
  });
}
