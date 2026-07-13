// ============================================================
// TASKS / ACTIVITIES SCREEN  (pushable route: /activities)
// A "my day" task list for the current rep. Groups open tasks into
// Overdue / Today / Upcoming (plus a Completed view), each row showing
// a type icon, subject, related record, and due time with a tap-to-
// complete checkbox that mutates the local store. A quick-add composer
// at the top creates new tasks. Renders rich seeded content with NO
// network and NO auth; pull-to-refresh does best-effort live enrichment
// but the local store is always the source of truth.
//
// NAV: not a bottom tab (the 5 tabs are Home/Deals/Contacts/Inbox/More).
// This is a stack route pushed over the tabs. Reach it with
// router.push('/activities') from Home and from the More screen.
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Button,
  Badge,
  Pill,
  Row,
  Divider,
  LoadingView,
  EmptyView,
  useTheme,
} from '../src/ui';
import api from '../src/api';
import {
  useActivities,
  useCurrentUser,
  addActivity,
  toggleActivityDone,
  ACTIVITY_META,
  companyName,
  getDeal,
  contactName,
} from '../src/store';

/* ---------- composer + filter config ---------- */
const TYPE_OPTIONS = ['task', 'call', 'email', 'meeting', 'note'];
const DUE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Next week' },
];
const FILTERS = ['All', 'Overdue', 'Today', 'Upcoming', 'Done'];

/* ---------- pure date helpers ---------- */
const DAY_MS = 86400000;

function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Which open-task bucket a task falls into, relative to today.
function bucketOf(a) {
  const due = new Date(a.dueAt).getTime();
  const sot = startOfTodayMs();
  if (due < sot) return 'overdue';
  if (due < sot + DAY_MS) return 'today';
  return 'upcoming';
}

// Turn a composer "when" choice into an ISO due date.
function dueForOption(key) {
  const d = new Date();
  if (key === 'tomorrow') {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else if (key === 'week') {
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
  }
  return d.toISOString();
}

// Human-readable due label ("Today 2:00 PM", "3 days overdue", "Fri 9:00 AM").
function dueLabel(a) {
  const due = new Date(a.dueAt);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const days = Math.round((dueDay.getTime() - startOfTodayMs()) / DAY_MS);
  const time = due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (days < 0) {
    const n = Math.abs(days);
    return n === 1 ? '1 day overdue' : `${n} days overdue`;
  }
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  if (days < 7) return `${due.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Related record shown under a task + where tapping it navigates.
function relatedInfo(a) {
  if (a.relatedType === 'deal' && a.relatedId) {
    const d = getDeal(a.relatedId);
    return {
      icon: 'trending-up-outline',
      label: d ? d.name : companyName(a.companyId),
      to: `/deal/${a.relatedId}`,
    };
  }
  if (a.relatedType === 'contact' && a.relatedId) {
    return { icon: 'person-outline', label: contactName(a.relatedId), to: `/contact/${a.relatedId}` };
  }
  if (a.companyId) {
    return { icon: 'business-outline', label: companyName(a.companyId), to: null };
  }
  return null;
}

export default function ActivitiesScreen() {
  const t = useTheme();
  const router = useRouter();
  const me = useCurrentUser();
  const activities = useActivities();

  const [scope, setScope] = useState('mine'); // mine | team
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  // Quick-add composer state.
  const [draft, setDraft] = useState('');
  const [draftType, setDraftType] = useState('task');
  const [draftDue, setDraftDue] = useState('today');

  // Loading path: seeded data is synchronous, so this only ever shows if the
  // store is genuinely empty while AsyncStorage hydration is still in flight.
  const [booting, setBooting] = useState(activities.length === 0);
  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 500);
    return () => clearTimeout(id);
  }, []);

  const scoped = useMemo(
    () => (scope === 'mine' ? activities.filter((a) => a.ownerId === me?.id) : activities),
    [activities, scope, me]
  );

  const counts = useMemo(() => {
    const c = { Overdue: 0, Today: 0, Upcoming: 0, Done: 0 };
    for (const a of scoped) {
      if (a.done) {
        c.Done += 1;
        continue;
      }
      const b = bucketOf(a);
      if (b === 'overdue') c.Overdue += 1;
      else if (b === 'today') c.Today += 1;
      else c.Upcoming += 1;
    }
    return c;
  }, [scoped]);

  // Flatten the selected buckets into a single FlatList data array of
  // { kind:'header' } and { kind:'task' } rows.
  const rows = useMemo(() => {
    const open = scoped.filter((a) => !a.done);
    const done = scoped.filter((a) => a.done);
    const overdue = open.filter((a) => bucketOf(a) === 'overdue');
    const today = open.filter((a) => bucketOf(a) === 'today');
    const upcoming = open.filter((a) => bucketOf(a) === 'upcoming');

    const sections = [];
    const all = filter === 'All';
    if (filter === 'Done') {
      sections.push({ key: 'done', title: 'Completed', tone: 'good', icon: 'checkmark-done-outline', data: done });
    } else {
      if ((all || filter === 'Overdue') && overdue.length)
        sections.push({ key: 'overdue', title: 'Overdue', tone: 'bad', icon: 'alert-circle-outline', data: overdue });
      if ((all || filter === 'Today') && today.length)
        sections.push({ key: 'today', title: 'Today', tone: 'accent', icon: 'today-outline', data: today });
      if ((all || filter === 'Upcoming') && upcoming.length)
        sections.push({ key: 'upcoming', title: 'Upcoming', tone: 'neutral', icon: 'calendar-outline', data: upcoming });
    }

    const out = [];
    for (const s of sections) {
      out.push({ kind: 'header', key: `h_${s.key}`, title: s.title, tone: s.tone, icon: s.icon, count: s.data.length });
      for (const a of s.data) out.push({ kind: 'task', key: a.id, activity: a });
    }
    return out;
  }, [scoped, filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Optional live enrichment. api.get never throws and the store stays the
      // source of truth, so this is safe with no network and no auth.
      await Promise.all([api.get('/api/activities'), new Promise((r) => setTimeout(r, 500))]);
    } catch {
      // ignore - seeded content already on screen
    }
    setRefreshing(false);
  };

  const addTask = () => {
    const subject = draft.trim();
    if (!subject) return;
    addActivity({ subject, type: draftType, dueAt: dueForOption(draftDue), ownerId: me?.id });
    setDraft('');
    setDraftType('task');
    Keyboard.dismiss();
    // Make sure the freshly added task is visible.
    if (scope !== 'mine') setScope('mine');
    if (filter === 'Done') setFilter('All');
  };

  /* ---------- empty-state copy ---------- */
  const totalOpen = counts.Overdue + counts.Today + counts.Upcoming;
  let emptyTitle = 'All caught up';
  let emptyBody = 'No open tasks. Add one above to get rolling.';
  if (filter === 'Done') {
    emptyTitle = 'No completed tasks';
    emptyBody = 'Finished tasks will show up here.';
  } else if (filter === 'Overdue') {
    emptyTitle = 'Nothing overdue';
    emptyBody = 'You are on top of everything. Nice.';
  } else if (filter === 'Today') {
    emptyTitle = 'Nothing due today';
    emptyBody = 'Enjoy the breathing room or add a task above.';
  } else if (filter === 'Upcoming') {
    emptyTitle = 'Nothing upcoming';
    emptyBody = 'No future tasks scheduled yet.';
  } else if (totalOpen === 0) {
    emptyTitle = 'All caught up';
    emptyBody = 'No open tasks. Add one above to get rolling.';
  }

  /* ---------- row renderers ---------- */
  const toneColor = (tone) =>
    tone === 'bad'
      ? t.colors.bad
      : tone === 'accent'
      ? t.colors.accent
      : tone === 'good'
      ? t.colors.good
      : t.colors.textMuted;

  const renderSectionHeader = (row) => (
    <Row gap={t.space.sm} align="center" style={{ marginTop: t.space.lg, marginBottom: t.space.sm }}>
      <Ionicons name={row.icon} size={16} color={toneColor(row.tone)} />
      <Text style={{ color: t.colors.text, ...t.type.label }}>{row.title}</Text>
      <View
        style={{
          backgroundColor: t.colors.surfaceAlt,
          borderRadius: t.radius.pill,
          paddingHorizontal: t.space.sm,
          paddingVertical: 1,
          minWidth: 22,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: t.colors.textMuted, ...t.type.micro }}>{row.count}</Text>
      </View>
    </Row>
  );

  const renderTask = (a) => {
    const meta = ACTIVITY_META[a.type] || ACTIVITY_META.task;
    const rel = relatedInfo(a);
    const overdue = !a.done && bucketOf(a) === 'overdue';
    const today = !a.done && bucketOf(a) === 'today';
    const dColor = a.done
      ? t.colors.textFaint
      : overdue
      ? t.colors.bad
      : today
      ? t.colors.accent
      : t.colors.textMuted;
    const go = () => {
      if (rel?.to) router.push(rel.to);
    };
    return (
      <Card style={{ marginBottom: t.space.sm }} padded={false}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: t.space.md, gap: t.space.md }}>
          <Pressable onPress={() => toggleActivityDone(a.id)} hitSlop={10} style={{ paddingTop: 1 }}>
            <Ionicons
              name={a.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={26}
              color={a.done ? t.colors.good : t.colors.borderStrong}
            />
          </Pressable>
          <Pressable onPress={go} disabled={!rel?.to} style={{ flex: 1 }}>
            <Row gap={t.space.sm} align="center">
              <Ionicons name={meta.icon} size={15} color={toneColor(meta.tone)} />
              <Text
                numberOfLines={2}
                style={{
                  flex: 1,
                  color: a.done ? t.colors.textFaint : t.colors.text,
                  ...t.type.bodyStrong,
                  textDecorationLine: a.done ? 'line-through' : 'none',
                }}
              >
                {a.subject}
              </Text>
            </Row>
            {rel ? (
              <Row gap={6} align="center" style={{ marginTop: 4 }}>
                <Ionicons name={rel.icon} size={13} color={t.colors.textFaint} />
                <Text numberOfLines={1} style={{ flex: 1, color: t.colors.textMuted, ...t.type.small }}>
                  {rel.label}
                </Text>
                {rel.to ? <Ionicons name="chevron-forward" size={14} color={t.colors.textFaint} /> : null}
              </Row>
            ) : null}
            <Row gap={t.space.sm} align="center" style={{ marginTop: 6 }}>
              <Ionicons name="time-outline" size={13} color={dColor} />
              <Text style={{ color: dColor, ...t.type.small }}>{dueLabel(a)}</Text>
              {overdue ? <Badge label="Overdue" tone="bad" /> : null}
            </Row>
          </Pressable>
        </View>
      </Card>
    );
  };

  /* ---------- header (composer + scope + filters), passed as an element ----------
     NOTE: passed as a JSX element (not an inline function component) so the
     TextInput does not remount and lose focus on every keystroke. */
  const listHeader = (
    <View>
      <Text style={{ color: t.colors.textMuted, ...t.type.small, marginBottom: t.space.md }}>
        {counts.Overdue > 0
          ? `${counts.Overdue} overdue, ${counts.Today} due today`
          : counts.Today > 0
          ? `${counts.Today} due today, ${counts.Upcoming} upcoming`
          : `${counts.Upcoming} upcoming, ${counts.Done} completed`}
      </Text>

      {/* Quick-add composer */}
      <Card style={{ marginBottom: t.space.lg }}>
        <Row gap={t.space.sm} align="center">
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: t.colors.accentWash,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={20} color={t.colors.accent} />
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a task..."
            placeholderTextColor={t.colors.textFaint}
            returnKeyType="done"
            onSubmitEditing={addTask}
            style={{ flex: 1, color: t.colors.text, ...t.type.body, paddingVertical: t.space.sm }}
          />
        </Row>

        <Divider />

        <Text style={{ color: t.colors.textFaint, ...t.type.micro, marginBottom: t.space.sm }}>TYPE</Text>
        <Row gap={t.space.sm} wrap>
          {TYPE_OPTIONS.map((ty) => {
            const meta = ACTIVITY_META[ty];
            const active = draftType === ty;
            return (
              <Pressable
                key={ty}
                onPress={() => setDraftType(ty)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: t.space.md,
                  paddingVertical: t.space.sm,
                  borderRadius: t.radius.pill,
                  borderWidth: 1,
                  borderColor: active ? t.colors.accent : t.colors.border,
                  backgroundColor: active ? t.colors.accentWash : t.colors.surface,
                }}
              >
                <Ionicons name={meta.icon} size={15} color={active ? t.colors.accent : t.colors.textMuted} />
                <Text style={{ color: active ? t.colors.accent : t.colors.textMuted, ...t.type.small }}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </Row>

        <Text
          style={{ color: t.colors.textFaint, ...t.type.micro, marginTop: t.space.md, marginBottom: t.space.sm }}
        >
          WHEN
        </Text>
        <Row gap={t.space.sm} wrap>
          {DUE_OPTIONS.map((o) => {
            const active = draftDue === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => setDraftDue(o.key)}
                style={{
                  paddingHorizontal: t.space.md,
                  paddingVertical: t.space.sm,
                  borderRadius: t.radius.pill,
                  borderWidth: 1,
                  borderColor: active ? t.colors.accent : t.colors.border,
                  backgroundColor: active ? t.colors.accent : t.colors.surface,
                }}
              >
                <Text style={{ color: active ? t.colors.onAccent : t.colors.textMuted, ...t.type.small }}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </Row>

        <Button
          title="Add task"
          icon="arrow-up-circle-outline"
          onPress={addTask}
          disabled={!draft.trim()}
          full
          style={{ marginTop: t.space.lg }}
        />
      </Card>

      {/* Scope: my tasks vs the whole team */}
      <Row gap={t.space.sm} style={{ marginBottom: t.space.md }}>
        <Pill label="My tasks" active={scope === 'mine'} onPress={() => setScope('mine')} />
        <Pill label="Team" active={scope === 'team'} onPress={() => setScope('team')} />
      </Row>

      {/* Bucket filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.space.sm, paddingBottom: t.space.xs }}
      >
        {FILTERS.map((f) => {
          const n = f === 'All' ? null : counts[f];
          return (
            <Pill
              key={f}
              label={n == null ? f : `${f} ${n}`}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Screen scroll={false} padded={false} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: 'Tasks' }} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={({ item }) =>
          item.kind === 'header' ? renderSectionHeader(item) : renderTask(item.activity)
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          booting ? (
            <LoadingView label="Loading tasks" />
          ) : (
            <EmptyView icon="checkmark-done-outline" title={emptyTitle} body={emptyBody} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.accent}
            colors={[t.colors.accent]}
          />
        }
        contentContainerStyle={{ padding: t.space.lg, paddingBottom: t.space.xxxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />
    </Screen>
  );
}
