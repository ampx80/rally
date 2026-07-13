// ============================================================
// MORE (tab)
// The workspace hub. Because this is a tab (headerShown:false) it
// renders its own header. Surfaces the requested destinations:
//   - Profile card -> Settings
//   - Reports snapshot (live pipeline stats, inline)
//   - Companies (inline seeded preview)
//   - Up next / Activities (inline, deep-links to deal/contact)
//   - Notifications, Ask Rook, Settings (real stack routes)
//   - Sign out (confirm dialog; the root auth gate redirects out)
// Everything renders from the local store with NO network. Pull to
// refresh runs a best-effort connectivity ping; it never throws.
// ============================================================
import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Button,
  Stat,
  Badge,
  Avatar,
  Row,
  Divider,
  SectionTitle,
  money,
  useTheme,
} from '../../src/ui';
import {
  useCurrentUser,
  usePipeline,
  useCompanies,
  useDeals,
  useActivities,
  useUnreadCount,
  ACTIVITY_META,
  companyName,
} from '../../src/store';
import { useAuth } from '../../src/auth';
import { ping } from '../../src/api';

// company health -> semantic color token key
const HEALTH_COLOR = { green: 'good', yellow: 'warn', red: 'bad' };

// Short, human due label for an activity.
function dueLabel(iso) {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const diff = Math.round((d - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `in ${diff}d`;
}

// One tappable menu row inside a Card.
function MenuRow({ icon, label, sub, right, onPress, last }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <Row style={{ paddingVertical: t.space.md }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: t.colors.accentWash,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={20} color={t.colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>{label}</Text>
          {sub ? (
            <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}>{sub}</Text>
          ) : null}
        </View>
        {right}
        <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
      </Row>
      {last ? null : <Divider style={{ marginVertical: 0 }} />}
    </Pressable>
  );
}

export default function More() {
  const t = useTheme();
  const router = useRouter();
  const { user, isDemo, authLive, signOut } = useAuth();

  const me = useCurrentUser();
  const pipe = usePipeline();
  const companies = useCompanies();
  const deals = useDeals();
  const openActivities = useActivities({ open: true });
  const unread = useUnreadCount();

  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(null); // null unknown | true | false

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setOnline(await ping());
    } catch {
      setOnline(false);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You can jump back into demo mode anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const dealCount = (coId) => deals.filter((d) => d.companyId === coId).length;
  const topCompanies = companies.slice(0, 6);
  const nextActivities = openActivities.slice(0, 5);

  const name = me?.name || user?.name || 'You';
  const title = me?.title || user?.title || 'Rally user';
  const email = user?.email || me?.email || '';
  const demoish = isDemo || !authLive;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <Text style={{ color: t.colors.text, ...t.type.display }}>More</Text>
      <Text
        style={{ color: t.colors.textMuted, ...t.type.body, marginTop: 2, marginBottom: t.space.lg }}
      >
        Your workspace, account, and settings.
      </Text>

      {/* Profile -> Settings */}
      <Card onPress={() => router.push('/settings')} style={{ marginBottom: t.space.lg }}>
        <Row>
          <Avatar name={name} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.colors.text, ...t.type.h3 }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }} numberOfLines={1}>
              {title}
            </Text>
            {email ? (
              <Text
                style={{ color: t.colors.textFaint, ...t.type.small, marginTop: 2 }}
                numberOfLines={1}
              >
                {email}
              </Text>
            ) : null}
          </View>
          <Badge label={demoish ? 'Demo' : 'Live'} tone={demoish ? 'accent' : 'good'} />
        </Row>
      </Card>

      {/* Reports snapshot (live pipeline) */}
      <SectionTitle action="View deals" onAction={() => router.push('/(tabs)/deals')}>
        Snapshot
      </SectionTitle>
      <Row wrap gap={t.space.md} align="stretch">
        <Stat
          label="Open pipeline"
          value={money(pipe.openValue, { compact: true })}
          delta={`${pipe.openCount} open deals`}
          onPress={() => router.push('/(tabs)/deals')}
        />
        <Stat
          label="Weighted"
          value={money(pipe.weighted, { compact: true })}
          delta="Probability adjusted"
          onPress={() => router.push('/(tabs)/deals')}
        />
      </Row>
      <Row wrap gap={t.space.md} align="stretch" style={{ marginTop: t.space.md }}>
        <Stat
          label="Won"
          value={money(pipe.wonValue, { compact: true })}
          delta={`${pipe.wonCount} closed`}
          tone="good"
        />
        <Stat
          label="Quota"
          value={`${pipe.quotaPct}%`}
          delta={`Target ${money(pipe.quota, { compact: true })}`}
          tone={pipe.quotaPct >= 70 ? 'good' : 'accent'}
        />
      </Row>

      {/* Companies (inline seeded preview) */}
      <SectionTitle style={{ marginTop: t.space.xl }}>Companies</SectionTitle>
      <Card padded={false}>
        {topCompanies.map((c, i) => {
          const n = dealCount(c.id);
          return (
            <View key={c.id} style={{ paddingHorizontal: t.space.lg, paddingVertical: t.space.md }}>
              <Row>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: t.colors[HEALTH_COLOR[c.health] || 'info'],
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.colors.text, ...t.type.bodyStrong }} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text
                    style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {c.industry} - {c.location}
                  </Text>
                </View>
                <Badge label={`${n} ${n === 1 ? 'deal' : 'deals'}`} tone="neutral" />
              </Row>
              {i < topCompanies.length - 1 ? (
                <Divider style={{ marginTop: t.space.md, marginBottom: 0 }} />
              ) : null}
            </View>
          );
        })}
      </Card>

      {/* Up next / Activities */}
      <SectionTitle style={{ marginTop: t.space.xl }}>Up next</SectionTitle>
      {nextActivities.length === 0 ? (
        <Card>
          <Row gap={t.space.md}>
            <Ionicons name="checkmark-done-outline" size={22} color={t.colors.good} />
            <Text style={{ flex: 1, color: t.colors.textMuted, ...t.type.body }}>
              You are all caught up. No open activities.
            </Text>
          </Row>
        </Card>
      ) : (
        <Card padded={false}>
          {nextActivities.map((a, i) => {
            const meta = ACTIVITY_META[a.type] || ACTIVITY_META.task;
            const label = dueLabel(a.dueAt);
            const overdue = label.includes('overdue');
            const go = () => {
              if (a.relatedType === 'deal' && a.relatedId) router.push('/deal/' + a.relatedId);
              else if (a.relatedType === 'contact' && a.relatedId) router.push('/contact/' + a.relatedId);
            };
            return (
              <Pressable
                key={a.id}
                onPress={go}
                style={({ pressed }) => [
                  { paddingHorizontal: t.space.lg, paddingVertical: t.space.md, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Row>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: t.colors.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={meta.icon} size={18} color={t.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.colors.text, ...t.type.bodyStrong }} numberOfLines={1}>
                      {a.subject}
                    </Text>
                    <Text
                      style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {companyName(a.companyId)}
                    </Text>
                  </View>
                  <Badge label={label} tone={overdue ? 'bad' : 'neutral'} />
                </Row>
                {i < nextActivities.length - 1 ? (
                  <Divider style={{ marginTop: t.space.md, marginBottom: 0 }} />
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      )}

      {/* Workspace menu */}
      <SectionTitle style={{ marginTop: t.space.xl }}>Workspace</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: t.space.lg }}>
        <MenuRow
          icon="notifications-outline"
          label="Notifications"
          sub={unread > 0 ? `${unread} unread` : 'All caught up'}
          right={unread > 0 ? <Badge label={String(unread)} tone="accent" /> : null}
          onPress={() => router.push('/notifications')}
        />
        <MenuRow
          icon="sparkles-outline"
          label="Ask Rook"
          sub="Your AI revenue operator"
          onPress={() => router.push('/rook')}
        />
        <MenuRow
          icon="settings-outline"
          label="Settings"
          sub="Appearance, notifications, account"
          onPress={() => router.push('/settings')}
          last
        />
      </Card>

      {/* Sign out */}
      <View style={{ marginTop: t.space.xl }}>
        <Button title="Sign out" variant="danger" icon="log-out-outline" full onPress={confirmSignOut} />
      </View>

      <Text
        style={{ color: t.colors.textFaint, ...t.type.small, textAlign: 'center', marginTop: t.space.lg }}
      >
        Rally
        {online === true ? ' - connected' : online === false ? ' - offline (showing cached data)' : ''}
      </Text>
    </Screen>
  );
}
