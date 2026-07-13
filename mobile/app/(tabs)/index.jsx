// ============================================================
// HOME - the Rally command center
// Greeting header, a KPI stat row (pipeline, won this month,
// activities due, new leads), a "focus for today" task list, a
// recent-deals list, and a floating "Ask Rook" button. Renders
// entirely from the local store so it works with NO network and
// NO auth; an optional ping only flips a Live/Offline pill.
//
// One FlatList is the scroll container (recent deals = data,
// everything above lives in ListHeaderComponent) so we never nest
// a VirtualizedList inside a ScrollView. Pull-to-refresh, loading
// gate, and empty state are all wired.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Screen,
  Card,
  Stat,
  Badge,
  Avatar,
  Row,
  SectionTitle,
  LoadingView,
  EmptyView,
  money,
  useTheme,
} from '../../src/ui';
import {
  useCurrentUser,
  usePipeline,
  useDeals,
  useActivities,
  useUnreadCount,
  toggleActivityDone,
  companyName,
  stageById,
  ACTIVITY_META,
} from '../../src/store';
import { ping } from '../../src/api';

/* ---------- pure helpers (safe, ASCII only) ---------- */
const MS_DAY = 86400000;

function greetingFor(date) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Relative due label + a Badge tone for a task's dueAt.
function dueLabel(iso) {
  if (!iso) return { text: 'No date', tone: 'neutral' };
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(iso));
  const days = Math.round((due - today) / MS_DAY);
  if (days < 0) return { text: days === -1 ? 'Overdue 1 day' : `Overdue ${-days} days`, tone: 'bad' };
  if (days === 0) return { text: 'Due today', tone: 'warn' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'accent' };
  if (days < 7) return { text: `Due in ${days} days`, tone: 'neutral' };
  return {
    text: new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tone: 'neutral',
  };
}

function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Stage id -> Badge tone so the pipeline reads at a glance.
const STAGE_TONE = {
  lead: 'neutral',
  qualified: 'info',
  discovery: 'info',
  proposal: 'accent',
  negotiation: 'warn',
  won: 'good',
  lost: 'bad',
};

/* ---------- small round icon button for the header ---------- */
function IconButton({ icon, onPress, badge = false }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={t.colors.text} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 9,
            right: 10,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: t.colors.accent,
            borderWidth: 1.5,
            borderColor: t.colors.surface,
          }}
        />
      ) : null}
    </Pressable>
  );
}

/* ---------- a single "focus for today" task row ---------- */
function TaskRow({ activity, onOpen, onToggle }) {
  const t = useTheme();
  const meta = ACTIVITY_META[activity.type] || ACTIVITY_META.task;
  const due = dueLabel(activity.dueAt);
  const toneColor =
    { accent: t.colors.accent, good: t.colors.good, info: t.colors.info, warn: t.colors.warn, neutral: t.colors.textMuted }[
      meta.tone
    ] || t.colors.accent;
  const toneWash =
    { accent: t.colors.accentWash, good: t.colors.goodWash, info: t.colors.infoWash, warn: t.colors.warnWash, neutral: t.colors.surfaceAlt }[
      meta.tone
    ] || t.colors.accentWash;

  return (
    <Card onPress={onOpen} style={{ marginBottom: t.space.sm }}>
      <Row gap={t.space.md} align="center">
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: t.radius.md,
            backgroundColor: toneWash,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={meta.icon} size={20} color={toneColor} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: t.colors.text, ...t.type.bodyStrong }}>
            {activity.subject}
          </Text>
          <Row gap={t.space.sm} align="center" style={{ marginTop: 3 }}>
            <Text numberOfLines={1} style={{ color: t.colors.textMuted, ...t.type.small, flexShrink: 1 }}>
              {companyName(activity.companyId)}
            </Text>
            <Badge label={due.text} tone={due.tone} />
          </Row>
        </View>

        <Pressable
          onPress={() => onToggle(activity.id)}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: t.space.xs })}
        >
          <Ionicons
            name={activity.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={activity.done ? t.colors.good : t.colors.borderStrong}
          />
        </Pressable>
      </Row>
    </Card>
  );
}

/* ---------- a single recent-deal row (FlatList item) ---------- */
function DealRow({ deal, onPress }) {
  const t = useTheme();
  const stage = stageById(deal.stage);
  return (
    <Card onPress={onPress} style={{ marginBottom: t.space.sm }}>
      <Row gap={t.space.md} align="center">
        <Avatar name={companyName(deal.companyId)} size={44} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: t.colors.text, ...t.type.bodyStrong }}>
            {deal.name}
          </Text>
          <Row gap={t.space.sm} align="center" style={{ marginTop: 4, flexWrap: 'wrap' }}>
            <Badge label={stage ? stage.name : deal.stage} tone={STAGE_TONE[deal.stage] || 'neutral'} />
            <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>
              {deal.probability}% - close {shortDate(deal.closeDate)}
            </Text>
          </Row>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: t.colors.text, ...t.type.h3 }}>{money(deal.value, { compact: true })}</Text>
          <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} style={{ marginTop: 2 }} />
        </View>
      </Row>
    </Card>
  );
}

/* ============================================================
   SCREEN
   ============================================================ */
export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();

  const user = useCurrentUser();
  const pipeline = usePipeline();
  const deals = useDeals();
  const openActivities = useActivities({ open: true });
  const unread = useUnreadCount();

  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(null); // null=unknown, true/false after probe

  // Optional liveness probe. Never blocks the UI, never throws.
  const probe = useCallback(async () => {
    try {
      const ok = await ping();
      setOnline(ok);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    // Local store is synchronous; a short gate exercises the loading path
    // and lets AsyncStorage hydration settle before first paint.
    const id = setTimeout(() => setBooting(false), 350);
    probe();
    return () => clearTimeout(id);
  }, [probe]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await probe();
    // give the pull gesture a beat so it feels responsive
    setTimeout(() => setRefreshing(false), 500);
  }, [probe]);

  /* ---------- derived metrics (from the local store) ---------- */
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfToday = startOfDay(now) + MS_DAY - 1;

  const wonThisMonth = useMemo(
    () =>
      deals.filter(
        (d) => d.status === 'won' && d.closeDate && new Date(d.closeDate).getTime() >= monthStart
      ),
    [deals, monthStart]
  );
  const wonThisMonthValue = useMemo(
    () => wonThisMonth.reduce((n, d) => n + d.value, 0),
    [wonThisMonth]
  );

  const myOpenTasks = useMemo(
    () => openActivities.filter((a) => a.ownerId === user.id),
    [openActivities, user.id]
  );
  const dueTodayCount = useMemo(
    () => myOpenTasks.filter((a) => a.dueAt && new Date(a.dueAt).getTime() <= endOfToday).length,
    [myOpenTasks, endOfToday]
  );
  const focusTasks = useMemo(() => myOpenTasks.slice(0, 5), [myOpenTasks]);

  const newLeads = useMemo(
    () => deals.filter((d) => d.status === 'open' && d.stage === 'lead'),
    [deals]
  );

  // Recent deals: newest first, flagship pinned to the top.
  const recentDeals = useMemo(() => {
    const sorted = [...deals].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    sorted.sort((a, b) => (a.id === 'd_flagship' ? -1 : b.id === 'd_flagship' ? 1 : 0));
    return sorted.slice(0, 10);
  }, [deals]);

  const firstName = (user?.name || 'there').split(' ')[0];

  const openTask = useCallback(
    (a) => {
      if (a.relatedType === 'deal' && a.relatedId) router.push('/deal/' + a.relatedId);
      else if (a.relatedType === 'contact' && a.relatedId) router.push('/contact/' + a.relatedId);
    },
    [router]
  );

  /* ---------- loading gate ---------- */
  if (booting) {
    return (
      <Screen scroll={false}>
        <LoadingView label="Loading your day" />
      </Screen>
    );
  }

  /* ---------- header (everything above the recent-deals list) ---------- */
  const header = (
    <View>
      {/* greeting + quick actions */}
      <Row justify="space-between" align="flex-start" style={{ marginBottom: t.space.lg }}>
        <View style={{ flex: 1, paddingRight: t.space.md }}>
          <Text style={{ color: t.colors.textFaint, ...t.type.micro, textTransform: 'uppercase' }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={{ color: t.colors.text, ...t.type.title, marginTop: 2 }}>
            {greetingFor(now)}, {firstName}
          </Text>
          <Row gap={t.space.sm} align="center" style={{ marginTop: t.space.sm }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  online == null ? t.colors.textFaint : online ? t.colors.good : t.colors.warn,
              }}
            />
            <Text style={{ color: t.colors.textMuted, ...t.type.small }}>
              {online == null ? 'Checking Rally' : online ? 'Live - synced with Rally' : 'Offline - showing cached'}
            </Text>
          </Row>
        </View>
        <Row gap={t.space.sm}>
          <IconButton icon="notifications-outline" badge={unread > 0} onPress={() => router.push('/notifications')} />
          <IconButton icon="settings-outline" onPress={() => router.push('/settings')} />
        </Row>
      </Row>

      {/* KPI stat grid */}
      <Row wrap gap={t.space.md} align="stretch" style={{ marginBottom: t.space.xs }}>
        <Stat
          label="Open pipeline"
          value={money(pipeline.openValue, { compact: true })}
          delta={`${pipeline.openCount} active deals`}
          tone="accent"
          onPress={() => router.push('/deals')}
        />
        <Stat
          label="Won this month"
          value={money(wonThisMonthValue, { compact: true })}
          delta={`${wonThisMonth.length} closed - ${pipeline.quotaPct}% of quota`}
          tone="good"
          onPress={() => router.push('/deals')}
        />
        <Stat
          label="Activities due"
          value={String(dueTodayCount)}
          delta={dueTodayCount ? 'Needs attention today' : 'All clear'}
          tone={dueTodayCount ? 'bad' : 'good'}
        />
        <Stat
          label="New leads"
          value={String(newLeads.length)}
          delta={money(newLeads.reduce((n, d) => n + d.value, 0), { compact: true }) + ' potential'}
          tone="accent"
          onPress={() => router.push('/deals')}
        />
      </Row>

      {/* focus for today */}
      <SectionTitle style={{ marginTop: t.space.lg }}>Focus for today</SectionTitle>
      {focusTasks.length === 0 ? (
        <Card style={{ marginBottom: t.space.sm }}>
          <Row gap={t.space.md} align="center">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: t.radius.md,
                backgroundColor: t.colors.goodWash,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark-done-outline" size={22} color={t.colors.good} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>Inbox zero on tasks</Text>
              <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}>
                Nothing open on your plate. Ask Rook what to chase next.
              </Text>
            </View>
          </Row>
        </Card>
      ) : (
        focusTasks.map((a) => (
          <TaskRow key={a.id} activity={a} onOpen={() => openTask(a)} onToggle={toggleActivityDone} />
        ))
      )}

      <SectionTitle style={{ marginTop: t.space.lg }} action="See all" onAction={() => router.push('/deals')}>
        Recent deals
      </SectionTitle>
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={recentDeals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DealRow deal={item} onPress={() => router.push('/deal/' + item.id)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyView
            icon="trending-up-outline"
            title="No deals yet"
            body="When deals land in your pipeline they show up here. Ask Rook to help you build one."
            actionLabel="Ask Rook"
            onAction={() => router.push('/rook')}
          />
        }
        contentContainerStyle={{ padding: t.space.lg, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* floating Ask Rook button */}
      <Pressable
        onPress={() => router.push('/rook')}
        style={({ pressed }) => ({
          position: 'absolute',
          right: t.space.lg,
          bottom: t.space.xl,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.sm,
          backgroundColor: t.colors.accent,
          paddingVertical: t.space.md,
          paddingHorizontal: t.space.lg,
          borderRadius: t.radius.pill,
          shadowColor: t.colors.shadow,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Ionicons name="sparkles" size={20} color={t.colors.onAccent} />
        <Text style={{ color: t.colors.onAccent, ...t.type.bodyStrong }}>Ask Rook</Text>
      </Pressable>
    </Screen>
  );
}
