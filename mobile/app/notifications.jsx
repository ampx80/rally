// ============================================================
// NOTIFICATIONS (stack route, header title "Notifications")
// A FlatList of the local notification feed. Each row shows a
// type icon, title, body, relative time, and an unread dot. Tapping
// marks it read and, when the notification carries a target, routes
// there (deal/contact/deal detail routes exist in the stack). A
// list header exposes "Mark all read"; empty + pull-to-refresh are
// handled. Reads entirely from the local store - no network needed.
// ============================================================
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Row, EmptyView, useTheme } from '../src/ui';
import {
  useNotifications,
  useUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../src/store';

// notification type -> icon + semantic tone
const TYPE_META = {
  deal_won: { icon: 'trophy-outline', tone: 'good' },
  task_due: { icon: 'alarm-outline', tone: 'warn' },
  mention: { icon: 'at-outline', tone: 'accent' },
  default: { icon: 'notifications-outline', tone: 'info' },
};

function relTime(iso) {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Date.now() - d;
  const m = 60000;
  const h = 3600000;
  const day = 86400000;
  if (diff < m) return 'just now';
  if (diff < h) return `${Math.round(diff / m)}m ago`;
  if (diff < day) return `${Math.round(diff / h)}h ago`;
  const dd = Math.round(diff / day);
  if (dd === 1) return 'yesterday';
  if (dd < 7) return `${dd}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Notifications() {
  const t = useTheme();
  const router = useRouter();
  const notifications = useNotifications();
  const unread = useUnreadCount();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    // Data is local + reactive; the refresh is a light, honest gesture.
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const onPressItem = (n) => {
    if (!n.read) markNotificationRead(n.id);
    const to = n.target?.to;
    if (to) router.push(to);
  };

  const toneColor = (tone) =>
    ({
      good: t.colors.good,
      warn: t.colors.warn,
      accent: t.colors.accent,
      info: t.colors.info,
      bad: t.colors.bad,
    }[tone] || t.colors.accent);
  const toneWash = (tone) =>
    ({
      good: t.colors.goodWash,
      warn: t.colors.warnWash,
      accent: t.colors.accentWash,
      info: t.colors.infoWash,
      bad: t.colors.badWash,
    }[tone] || t.colors.accentWash);

  const renderItem = ({ item }) => {
    const meta = TYPE_META[item.type] || TYPE_META.default;
    return (
      <Pressable onPress={() => onPressItem(item)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
        <Card
          style={{
            marginBottom: t.space.md,
            backgroundColor: item.read ? t.colors.card : t.colors.surface,
            borderColor: item.read ? t.colors.border : t.colors.borderStrong,
          }}
        >
          <Row align="flex-start">
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: toneWash(meta.tone),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={meta.icon} size={22} color={toneColor(meta.tone)} />
            </View>
            <View style={{ flex: 1 }}>
              <Row justify="space-between" align="flex-start">
                <Text
                  style={{
                    flex: 1,
                    color: t.colors.text,
                    ...(item.read ? t.type.body : t.type.bodyStrong),
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                {item.read ? null : (
                  <View
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: t.colors.accent,
                      marginTop: 6,
                      marginLeft: t.space.sm,
                    }}
                  />
                )}
              </Row>
              {item.body ? (
                <Text
                  style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 4 }}
                  numberOfLines={3}
                >
                  {item.body}
                </Text>
              ) : null}
              <Row justify="space-between" style={{ marginTop: t.space.sm }}>
                <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>{relTime(item.at)}</Text>
                {item.target?.label ? (
                  <Row gap={4}>
                    <Text style={{ color: t.colors.accent, ...t.type.micro }}>{item.target.label}</Text>
                    <Ionicons name="chevron-forward" size={13} color={t.colors.accent} />
                  </Row>
                ) : null}
              </Row>
            </View>
          </Row>
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen scroll={false} padded={false} edges={['left', 'right']}>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: t.space.lg, paddingBottom: t.space.xxxl, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.accent}
            colors={[t.colors.accent]}
          />
        }
        ListHeaderComponent={
          <Row justify="space-between" style={{ marginBottom: t.space.md }}>
            <Text style={{ color: t.colors.textMuted, ...t.type.body }}>
              {unread > 0 ? `${unread} unread` : 'You are all caught up'}
            </Text>
            {unread > 0 ? (
              <Pressable
                onPress={markAllNotificationsRead}
                hitSlop={8}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={{ color: t.colors.accent, ...t.type.label }}>Mark all read</Text>
              </Pressable>
            ) : null}
          </Row>
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyView
              icon="notifications-off-outline"
              title="No notifications"
              body="When deals move, tasks come due, or a teammate mentions you, it shows up here."
            />
          </View>
        }
      />
    </Screen>
  );
}
