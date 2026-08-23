import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Festival } from '../data/festivals';
import { useTheme } from '../state/ThemeContext';
import { radius, spacing } from '../theme';

function getTimeLeft(targetDate: string) {
  const diff = new Date(`${targetDate}T00:00:00`).getTime() - Date.now();
  const clamped = Math.max(diff, 0);
  const days = Math.floor(clamped / (1000 * 60 * 60 * 24));
  const hours = Math.floor((clamped / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((clamped / (1000 * 60)) % 60);
  const seconds = Math.floor((clamped / 1000) % 60);
  return { days, hours, minutes, seconds };
}

type FestiveOfferBannerProps = {
  festival: Festival;
  width: number;
};

export function FestiveOfferBanner({ festival, width }: FestiveOfferBannerProps) {
  const { typography } = useTheme();
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(festival.date));

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft(festival.date)), 1000);
    return () => clearInterval(interval);
  }, [festival.date]);

  const styles = useMemo(() => createStyles(festival.accent), [festival.accent]);

  return (
    <View style={[styles.card, { backgroundColor: festival.background, width }]}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>{festival.emoji}</Text>
        <Text style={[typography.subheading, styles.title]}>{festival.name} Sale</Text>
      </View>
      <Text style={[typography.caption, styles.subtitle]}>{festival.offerText}</Text>
      <View style={styles.countdownRow}>
        {[
          { label: 'D', value: timeLeft.days },
          { label: 'H', value: timeLeft.hours },
          { label: 'M', value: timeLeft.minutes },
          { label: 'S', value: timeLeft.seconds },
        ].map((unit) => (
          <View key={unit.label} style={styles.unitBox}>
            <Text style={styles.unitValue}>{String(unit.value).padStart(2, '0')}</Text>
            <Text style={styles.unitLabel}>{unit.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(accent: string) {
  return StyleSheet.create({
    card: {
      height: 110,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    emoji: {
      fontSize: 18,
    },
    title: {
      color: accent,
    },
    subtitle: {
      color: accent,
      opacity: 0.85,
    },
    countdownRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    unitBox: {
      backgroundColor: 'rgba(255,255,255,0.6)',
      borderRadius: radius.sm,
      paddingVertical: 2,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      minWidth: 36,
    },
    unitValue: {
      color: accent,
      fontWeight: '700',
      fontSize: 14,
    },
    unitLabel: {
      color: accent,
      fontSize: 9,
      fontWeight: '600',
    },
  });
}
