import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppNotification, MOCK_NOTIFICATIONS } from '../data/notifications';
import { usePersistedState } from '../hooks/usePersistedState';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../state/ThemeContext';
import { ColorPalette, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const TYPE_ICON: Record<AppNotification['type'], string> = {
  order: '📦',
  offer: '🏷️',
  system: '⚙️',
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  order: '#1A9E55',
  offer: '#F07A1C',
  system: '#6B7280',
};

export function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  /* Only the read state is stored — the notification list itself will come from
     the server later, and read IDs merge cleanly onto whatever it returns. */
  const [readIds, setReadIds] = usePersistedState<string[]>('notifications_read', []);

  const notifications = useMemo(
    () => MOCK_NOTIFICATIONS.map(n => ({ ...n, read: n.read || readIds.includes(n.id) })),
    [readIds],
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setReadIds(MOCK_NOTIFICATIONS.map(n => n.id));
  const markRead = (id: string) =>
    setReadIds(prev => (prev.includes(id) ? prev : [...prev, id]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Notifications" onBack={() => navigation.goBack()} />

      <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {unreadCount > 0 && (
          <View style={styles.topRow}>
            <Text style={styles.unreadLabel}>{unreadCount} unread</Text>
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text style={styles.markAllText}>Mark all as read</Text>
            </Pressable>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyBody}>No notifications yet. We'll let you know about orders, offers, and more.</Text>
          </View>
        ) : (
          notifications.map((notif, idx) => (
            <Pressable
              key={notif.id}
              style={[styles.card, !notif.read && styles.cardUnread]}
              onPress={() => markRead(notif.id)}
            >
              <View style={[styles.iconWrap, { backgroundColor: TYPE_COLOR[notif.type] + '18' }]}>
                <Text style={styles.icon}>{TYPE_ICON[notif.type]}</Text>
              </View>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !notif.read && styles.titleUnread]} numberOfLines={1}>
                    {notif.title}
                  </Text>
                  {!notif.read && <View style={[styles.dot, { backgroundColor: TYPE_COLOR[notif.type] }]} />}
                </View>
                <Text style={styles.bodyText} numberOfLines={2}>{notif.body}</Text>
                <Text style={styles.time}>{notif.time}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },

    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    unreadLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    markAllText: { fontSize: 13, fontWeight: '700', color: colors.primary },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      flexDirection: 'row',
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardUnread: { borderColor: colors.primary + '44', backgroundColor: colors.primaryLight },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    icon: { fontSize: 20 },
    body: { flex: 1, gap: 3 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    title: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
    titleUnread: { fontWeight: '800' },
    dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    bodyText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
    time: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

    empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: spacing.sm },
    emptyEmoji: { fontSize: 56 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    emptyBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.xl },
  });
}
