// ============================================================
// DEAL DETAIL  (route: /deal/[id])
// Pushable stack screen (declared in app/_layout.jsx with a native
// header). Reads its id from useLocalSearchParams() - NOT props -
// and renders entirely from the local-first store, so it works with
// no network and no auth. Every action is a real, persisted store
// mutation:
//   - Advance / set stage  -> moveDealStage()
//   - Complete a task      -> toggleActivityDone()
//   - Log activity         -> addActivity() (shows here + on Home)
//   - Ask Rook             -> navigates to the /rook operator
// Pull-to-refresh optionally pings the live API for enrichment but
// the screen never depends on it.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Button,
  Badge,
  Avatar,
  Row,
  Divider,
  SectionTitle,
  EmptyView,
  money,
  useTheme,
} from '../../src/ui';
import { get } from '../../src/api';
import {
  useDeals,
  useActivities,
  getUser,
  getContact,
  companyName,
  STAGES,
  OPEN_STAGES,
  stageById,
  ACTIVITY_TYPES,
  ACTIVITY_META,
  toggleActivityDone,
  addActivity,
  moveDealStage,
} from '../../src/store';

/* ---------- pure helpers (shared shape with the deals list) ---------- */

function stageTone(stageId) {
  switch (stageId) {
    case 'won':
      return 'good';
    case 'lost':
      return 'bad';
    case 'negotiation':
      return 'warn';
    case 'proposal':
      return 'accent';
    case 'discovery':
    case 'qualified':
      return 'info';
    default:
      return 'neutral';
  }
}

function toneHex(t, tone) {
  return (
    {
      good: t.colors.good,
      bad: t.colors.bad,
      warn: t.colors.warn,
      info: t.colors.info,
      accent: t.colors.accent,
      neutral: t.colors.textFaint,
    }[tone] || t.colors.accent
  );
}

function badgeWash(t, tone) {
  return (
    {
      good: t.colors.goodWash,
      bad: t.colors.badWash,
      warn: t.colors.warnWash,
      info: t.colors.infoWash,
      accent: t.colors.accentWash,
      neutral: t.colors.surfaceAlt,
    }[tone] || t.colors.accentWash
  );
}

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function relDays(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Math.round((d.getTime() - Date.now()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

// Open-stage pipeline order, then Won. Lost is handled separately.
const OPEN_ORDER = OPEN_STAGES.map((s) => s.id);
function nextStageId(cur) {
  const i = OPEN_ORDER.indexOf(cur);
  if (i >= 0 && i < OPEN_ORDER.length - 1) return OPEN_ORDER[i + 1];
  if (cur === OPEN_ORDER[OPEN_ORDER.length - 1]) return 'won';
  return null;
}

/* ---------- little presentational bits ---------- */

function MiniStat({ label, value, valueColor }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>{label}</Text>
      <Text
        style={{
          color: valueColor || t.colors.text,
          ...t.type.h2,
          marginTop: t.space.xs,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function KeyValue({ icon, label, value, tone }) {
  const t = useTheme();
  return (
    <Row justify="space-between" style={{ paddingVertical: t.space.sm }}>
      <Row gap={t.space.sm}>
        <Ionicons name={icon} size={16} color={t.colors.textFaint} />
        <Text style={{ color: t.colors.textMuted, ...t.type.body }}>{label}</Text>
      </Row>
      <Text
        style={{
          color: tone || t.colors.text,
          ...t.type.bodyStrong,
          flexShrink: 1,
          textAlign: 'right',
          marginLeft: t.space.md,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </Row>
  );
}

function ActivityRow({ act, onToggle }) {
  const t = useTheme();
  const meta = ACTIVITY_META[act.type] || ACTIVITY_META.note;
  const tint = toneHex(t, meta.tone);
  const overdue = !act.done && act.dueAt && new Date(act.dueAt).getTime() < Date.now();
  return (
    <Pressable
      onPress={() => onToggle(act)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        paddingVertical: t.space.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: badgeWash(t, meta.tone),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={meta.icon} size={16} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: act.done ? t.colors.textFaint : t.colors.text,
            ...t.type.bodyStrong,
            textDecorationLine: act.done ? 'line-through' : 'none',
          }}
          numberOfLines={1}
        >
          {act.subject}
        </Text>
        <Row gap={t.space.sm} style={{ marginTop: 2 }}>
          <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>
            {meta.label.toUpperCase()}
          </Text>
          {act.dueAt ? (
            <Text
              style={{
                color: overdue ? t.colors.bad : t.colors.textFaint,
                ...t.type.micro,
              }}
            >
              {relDays(act.dueAt)}
            </Text>
          ) : null}
        </Row>
      </View>
      <Ionicons
        name={act.done ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={act.done ? t.colors.good : t.colors.borderStrong}
      />
    </Pressable>
  );
}

/* ---------- log-activity composer ---------- */

const DUE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

function LogActivityModal({ visible, onClose, onSave }) {
  const t = useTheme();
  const [type, setType] = useState('task');
  const [subject, setSubject] = useState('');
  const [dueDays, setDueDays] = useState(0);

  // reset each time the sheet opens
  useEffect(() => {
    if (visible) {
      setType('task');
      setSubject('');
      setDueDays(0);
    }
  }, [visible]);

  const canSave = subject.trim().length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            padding: t.space.lg,
            paddingBottom: t.space.xxl,
            gap: t.space.md,
          }}
        >
          <Row justify="space-between">
            <Text style={{ color: t.colors.text, ...t.type.h2 }}>Log activity</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={t.colors.textMuted} />
            </Pressable>
          </Row>

          {/* type selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.space.sm }}
          >
            {ACTIVITY_TYPES.map((ty) => {
              const meta = ACTIVITY_META[ty];
              const active = type === ty;
              return (
                <Pressable
                  key={ty}
                  onPress={() => setType(ty)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.space.xs,
                    backgroundColor: active ? t.colors.accent : t.colors.surfaceAlt,
                    borderRadius: t.radius.pill,
                    paddingHorizontal: t.space.md,
                    paddingVertical: t.space.sm,
                  }}
                >
                  <Ionicons
                    name={meta.icon}
                    size={15}
                    color={active ? t.colors.onAccent : t.colors.textMuted}
                  />
                  <Text
                    style={{
                      color: active ? t.colors.onAccent : t.colors.textMuted,
                      ...t.type.small,
                    }}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* subject */}
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="What needs to happen?"
            placeholderTextColor={t.colors.textFaint}
            autoFocus
            style={{
              color: t.colors.text,
              ...t.type.body,
              backgroundColor: t.colors.surfaceAlt,
              borderRadius: t.radius.md,
              paddingHorizontal: t.space.md,
              paddingVertical: t.space.md,
            }}
          />

          {/* due presets */}
          <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>DUE</Text>
          <Row gap={t.space.sm} wrap>
            {DUE_PRESETS.map((p) => {
              const active = dueDays === p.days;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => setDueDays(p.days)}
                  style={{
                    backgroundColor: active ? t.colors.accentWash : t.colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: active ? t.colors.accent : 'transparent',
                    borderRadius: t.radius.pill,
                    paddingHorizontal: t.space.md,
                    paddingVertical: t.space.sm,
                  }}
                >
                  <Text
                    style={{
                      color: active ? t.colors.accent : t.colors.textMuted,
                      ...t.type.small,
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </Row>

          <Button
            title="Save activity"
            icon="checkmark-outline"
            full
            disabled={!canSave}
            onPress={() => {
              const dueAt = new Date(Date.now() + dueDays * 86400000).toISOString();
              onSave({ type, subject: subject.trim(), dueAt });
            }}
            style={{ marginTop: t.space.sm }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- screen ---------- */

export default function DealDetailScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const deals = useDeals(); // reactive - re-renders on moveDealStage
  const deal = useMemo(() => deals.find((d) => d.id === id), [deals, id]);

  const acts = useActivities({ relatedId: id }); // reactive - picks up new logs
  const [composerOpen, setComposerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const taskActs = useMemo(() => acts.filter((a) => a.type !== 'note'), [acts]);
  const noteActs = useMemo(() => acts.filter((a) => a.type === 'note'), [acts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Optional live enrichment; get() never throws and serves cache
      // on failure. The store stays the source of truth either way.
      await get(`/api/deals/${id}`, { timeout: 6000 });
    } catch {
      // fully offline is fine - everything renders from the store
    }
    setRefreshing(false);
  }, [id]);

  const onToggleActivity = useCallback((act) => {
    toggleActivityDone(act.id);
  }, []);

  const onSaveActivity = useCallback(
    ({ type, subject, dueAt }) => {
      addActivity({
        type,
        subject,
        dueAt,
        relatedType: 'deal',
        relatedId: id,
        companyId: deal?.companyId,
        ownerId: deal?.ownerId,
      });
      setComposerOpen(false);
    },
    [id, deal]
  );

  // deal not found (bad / stale id)
  if (!deal) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title: 'Deal' }} />
        <EmptyView
          icon="pricetag-outline"
          title="Deal not found"
          body="This deal may have been removed or the link is out of date."
          actionLabel="Back to deals"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const tone = stageTone(deal.stage);
  const st = stageById(deal.stage);
  const owner = getUser(deal.ownerId);
  const isOpen = deal.status === 'open';
  const next = nextStageId(deal.stage);
  const weighted = (deal.value * deal.probability) / 100;
  const overdueClose = isOpen && new Date(deal.closeDate).getTime() < Date.now();

  const advanceLabel = !isOpen
    ? 'Reopen deal'
    : next === 'won'
    ? 'Mark Closed Won'
    : `Advance to ${stageById(next)?.name || 'next stage'}`;
  const advanceIcon = !isOpen
    ? 'refresh-outline'
    : next === 'won'
    ? 'trophy-outline'
    : 'arrow-forward-outline';

  const onAdvance = () => {
    if (!isOpen) return moveDealStage(deal.id, 'negotiation');
    if (next) moveDealStage(deal.id, next);
  };

  return (
    <Screen edges={['left', 'right']} refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: companyName(deal.companyId) }} />

      {/* ---- hero ---- */}
      <Card>
        <Row gap={t.space.sm} style={{ marginBottom: t.space.sm }}>
          <Avatar name={companyName(deal.companyId)} size={28} />
          <Text
            style={{ color: t.colors.textMuted, ...t.type.label, flex: 1 }}
            numberOfLines={1}
          >
            {companyName(deal.companyId)}
          </Text>
          <Badge label={st ? st.name : deal.stage} tone={tone} />
        </Row>
        <Text style={{ color: t.colors.text, ...t.type.title }}>{deal.name}</Text>

        <Row style={{ marginTop: t.space.lg }}>
          <MiniStat label="AMOUNT" value={money(deal.value, { compact: true })} />
          <MiniStat
            label="WIN PROB"
            value={`${deal.probability}%`}
            valueColor={toneHex(t, tone)}
          />
          <MiniStat
            label={isOpen ? 'CLOSES' : 'CLOSED'}
            value={fmtDate(deal.closeDate)}
          />
        </Row>
      </Card>

      {/* ---- stage control ---- */}
      <View style={{ marginTop: t.space.lg }}>
        <SectionTitle>Stage</SectionTitle>
        <Card>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.space.sm }}
          >
            {STAGES.map((s) => {
              const active = s.id === deal.stage;
              const sTone = stageTone(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => moveDealStage(deal.id, s.id)}
                  style={{
                    backgroundColor: active ? toneHex(t, sTone) : t.colors.surfaceAlt,
                    borderRadius: t.radius.pill,
                    paddingHorizontal: t.space.md,
                    paddingVertical: t.space.sm,
                  }}
                >
                  <Text
                    style={{
                      color: active ? t.colors.onAccent : t.colors.textMuted,
                      ...t.type.small,
                    }}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Button
            title={advanceLabel}
            icon={advanceIcon}
            variant="primary"
            full
            onPress={onAdvance}
            style={{ marginTop: t.space.md }}
          />
          <Row gap={t.space.md} style={{ marginTop: t.space.sm }}>
            <Button
              title="Log activity"
              icon="add-outline"
              variant="secondary"
              onPress={() => setComposerOpen(true)}
              style={{ flex: 1 }}
            />
            <Button
              title="Ask Rook"
              icon="sparkles-outline"
              variant="secondary"
              onPress={() => router.push('/rook')}
              style={{ flex: 1 }}
            />
          </Row>
        </Card>
      </View>

      {/* ---- overview ---- */}
      <View style={{ marginTop: t.space.lg }}>
        <SectionTitle>Overview</SectionTitle>
        <Card>
          <KeyValue icon="cash-outline" label="Deal value" value={money(deal.value)} />
          <Divider />
          <KeyValue
            icon="trending-up-outline"
            label="Weighted value"
            value={money(weighted)}
          />
          <Divider />
          <KeyValue
            icon="calendar-outline"
            label={isOpen ? 'Close date' : 'Closed'}
            value={`${fmtDate(deal.closeDate)}  (${relDays(deal.closeDate)})`}
            tone={overdueClose ? t.colors.bad : undefined}
          />
          <Divider />
          <KeyValue
            icon="person-outline"
            label="Owner"
            value={owner ? owner.name : 'Unassigned'}
          />
          <Divider />
          <KeyValue
            icon="flag-outline"
            label="Status"
            value={
              deal.status === 'won'
                ? 'Closed Won'
                : deal.status === 'lost'
                ? 'Closed Lost'
                : 'Open'
            }
            tone={
              deal.status === 'won'
                ? t.colors.good
                : deal.status === 'lost'
                ? t.colors.bad
                : undefined
            }
          />
          <Divider />
          <KeyValue icon="time-outline" label="Created" value={fmtDate(deal.createdAt)} />
        </Card>
      </View>

      {/* ---- contacts ---- */}
      <View style={{ marginTop: t.space.lg }}>
        <SectionTitle>Contacts</SectionTitle>
        <Card padded={false}>
          {deal.contactIds && deal.contactIds.length > 0 ? (
            deal.contactIds.map((cid, i) => {
              const c = getContact(cid);
              if (!c) return null;
              return (
                <Pressable
                  key={cid}
                  onPress={() => router.push('/contact/' + cid)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.space.md,
                    padding: t.space.lg,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: t.colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Avatar name={c.name} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{ color: t.colors.text, ...t.type.bodyStrong }}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={{ color: t.colors.textMuted, ...t.type.small }}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
                </Pressable>
              );
            })
          ) : (
            <Text
              style={{ color: t.colors.textMuted, ...t.type.body, padding: t.space.lg }}
            >
              No contacts linked to this deal yet.
            </Text>
          )}
        </Card>
      </View>

      {/* ---- activities ---- */}
      <View style={{ marginTop: t.space.lg }}>
        <SectionTitle action="Log" onAction={() => setComposerOpen(true)}>
          Activities
        </SectionTitle>
        <Card>
          {taskActs.length > 0 ? (
            taskActs.map((a, i) => (
              <View key={a.id}>
                {i > 0 ? <Divider /> : null}
                <ActivityRow act={a} onToggle={onToggleActivity} />
              </View>
            ))
          ) : (
            <Text style={{ color: t.colors.textMuted, ...t.type.body }}>
              Nothing scheduled. Tap Log to add a call, email, meeting, or task.
            </Text>
          )}
        </Card>
      </View>

      {/* ---- notes ---- */}
      <View style={{ marginTop: t.space.lg }}>
        <SectionTitle action="Add note" onAction={() => setComposerOpen(true)}>
          Notes
        </SectionTitle>
        {noteActs.length > 0 ? (
          noteActs.map((n) => (
            <Card key={n.id} style={{ marginBottom: t.space.md }}>
              <Row gap={t.space.sm} style={{ marginBottom: t.space.xs }}>
                <Ionicons
                  name="document-text-outline"
                  size={15}
                  color={t.colors.textFaint}
                />
                <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>
                  {fmtDate(n.dueAt || n.createdAt)}
                </Text>
              </Row>
              <Text style={{ color: t.colors.text, ...t.type.body }}>{n.subject}</Text>
              {n.body ? (
                <Text
                  style={{
                    color: t.colors.textMuted,
                    ...t.type.small,
                    marginTop: t.space.xs,
                  }}
                >
                  {n.body}
                </Text>
              ) : null}
            </Card>
          ))
        ) : (
          <Card>
            <Text style={{ color: t.colors.textMuted, ...t.type.body }}>
              No notes yet. Log a note to capture context for the team.
            </Text>
          </Card>
        )}
      </View>

      <LogActivityModal
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSave={onSaveActivity}
      />
    </Screen>
  );
}
