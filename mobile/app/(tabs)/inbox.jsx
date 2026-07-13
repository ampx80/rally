// ============================================================
// INBOX (tab)
// A unified feed of everything that needs a reply: message threads
// (email + chat), open tasks, and alerts/mentions. Tap a message to
// open the thread inline (with a working reply composer); tap a task
// to open its deal or toggle it done; tap an alert to jump to its
// target. A compose button spins up a brand-new thread. Everything
// renders from the local store with NO network - the API is used only
// for an optional connectivity check on pull-to-refresh.
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Screen,
  Card,
  Button,
  Badge,
  Avatar,
  Row,
  Pill,
  EmptyView,
  useTheme,
} from '../../src/ui';
import {
  useConversations,
  useNotifications,
  useActivities,
  contactName,
  companyName,
  ACTIVITY_META,
  toggleActivityDone,
  markNotificationRead,
} from '../../src/store';
import { ping } from '../../src/api';

/* ---------- pure helpers (safe on bad input) ---------- */
function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!then || Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < 0) return 'soon';
  const m = Math.round(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.round(d / 7)}w`;
}

function dueLabel(iso) {
  const due = new Date(iso).getTime();
  if (!due || Number.isNaN(due)) return { text: 'No due date', overdue: false };
  const day = 86400000;
  const diff = due - Date.now();
  if (diff < 0) {
    const d = Math.ceil(-diff / day);
    return { text: d <= 1 ? 'Overdue' : `${d}d overdue`, overdue: true };
  }
  const d = Math.round(diff / day);
  if (d === 0) return { text: 'Due today', overdue: false };
  if (d === 1) return { text: 'Due tomorrow', overdue: false };
  return { text: `Due in ${d}d`, overdue: false };
}

const ALERT_META = {
  mention: { icon: 'at-outline', tone: 'accent', label: 'Mention' },
  deal_won: { icon: 'trophy-outline', tone: 'good', label: 'Deal won' },
  task_due: { icon: 'alarm-outline', tone: 'warn', label: 'Reminder' },
};
function alertMeta(type) {
  return ALERT_META[type] || { icon: 'notifications-outline', tone: 'info', label: 'Alert' };
}

function convoWho(c) {
  if (!c) return 'Conversation';
  if (c.contactId) return contactName(c.contactId);
  if (c.toLabel) return c.toLabel;
  if (c.companyId) return companyName(c.companyId);
  return 'New message';
}

function lastSnippet(c) {
  const msgs = c?.messages || [];
  const last = msgs[msgs.length - 1];
  if (!last) return 'No messages yet';
  return `${last.from === 'me' ? 'You: ' : ''}${last.body}`;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'messages', label: 'Messages' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'alerts', label: 'Alerts' },
];

/* ============================================================
   THREAD - inline conversation view with a working reply bar
   ============================================================ */
function Thread({ convo, messages, onBack, onSend }) {
  const t = useTheme();
  const [draft, setDraft] = useState('');
  const scrollRef = React.useRef(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  };

  const who = convoWho(convo);
  const sub = convo.companyId ? companyName(convo.companyId) : convo.toLabel || 'Direct message';

  return (
    <Screen scroll={false} padded={false} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* thread header */}
        <View
          style={{
            paddingHorizontal: t.space.lg,
            paddingTop: t.space.sm,
            paddingBottom: t.space.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: t.colors.border,
          }}
        >
          <Row justify="space-between">
            <Pressable onPress={onBack} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="chevron-back" size={24} color={t.colors.accent} />
              <Text style={{ color: t.colors.accent, ...t.type.label }}>Inbox</Text>
            </Pressable>
            <Badge
              label={convo.channel === 'chat' ? 'Chat' : 'Email'}
              tone={convo.channel === 'chat' ? 'info' : 'accent'}
            />
          </Row>
          <Row style={{ marginTop: t.space.md }} gap={t.space.md}>
            <Avatar name={who} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.colors.text, ...t.type.h3 }} numberOfLines={1}>
                {who}
              </Text>
              <Text style={{ color: t.colors.textMuted, ...t.type.small }} numberOfLines={1}>
                {sub}
              </Text>
            </View>
          </Row>
          <Text style={{ color: t.colors.textFaint, ...t.type.small, marginTop: t.space.sm }} numberOfLines={2}>
            {convo.subject}
          </Text>
        </View>

        {/* messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: t.space.lg, gap: t.space.md }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => {
            const mine = m.from === 'me';
            return (
              <View
                key={i}
                style={{
                  maxWidth: '82%',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  backgroundColor: mine ? t.colors.accent : t.colors.surfaceAlt,
                  borderRadius: t.radius.lg,
                  borderBottomRightRadius: mine ? t.radius.sm : t.radius.lg,
                  borderBottomLeftRadius: mine ? t.radius.lg : t.radius.sm,
                  paddingVertical: t.space.md,
                  paddingHorizontal: t.space.lg,
                }}
              >
                <Text
                  style={{
                    color: mine ? t.colors.onAccent : t.colors.text,
                    ...t.type.body,
                  }}
                >
                  {m.body}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* reply bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: t.space.sm,
            paddingHorizontal: t.space.lg,
            paddingTop: t.space.sm,
            paddingBottom: t.space.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: t.colors.border,
            backgroundColor: t.colors.surface,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a reply"
            placeholderTextColor={t.colors.textFaint}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 44,
              backgroundColor: t.colors.bg,
              borderRadius: t.radius.lg,
              borderWidth: 1,
              borderColor: t.colors.border,
              paddingHorizontal: t.space.lg,
              paddingTop: 12,
              paddingBottom: 12,
              color: t.colors.text,
              fontSize: 17,
            }}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? t.colors.accent : t.colors.surfaceAlt,
            }}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={draft.trim() ? t.colors.onAccent : t.colors.textFaint}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ============================================================
   COMPOSE - modal that starts a brand-new local thread
   ============================================================ */
function Compose({ visible, onClose, onCreate }) {
  const t = useTheme();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const reset = () => {
    setTo('');
    setSubject('');
    setMessage('');
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = () => {
    if (!message.trim()) return;
    onCreate({ to: to.trim(), subject: subject.trim(), message: message.trim() });
    reset();
  };

  const field = {
    backgroundColor: t.colors.bg,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: 12,
    color: t.colors.text,
    fontSize: 17,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1 }} onPress={close} />
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            padding: t.space.xl,
            gap: t.space.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: t.colors.border,
          }}
        >
          <Row justify="space-between">
            <Text style={{ color: t.colors.text, ...t.type.h2 }}>New message</Text>
            <Pressable onPress={close} hitSlop={10}>
              <Ionicons name="close" size={26} color={t.colors.textMuted} />
            </Pressable>
          </Row>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="To (name or email)"
            placeholderTextColor={t.colors.textFaint}
            autoCapitalize="none"
            style={field}
          />
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            placeholderTextColor={t.colors.textFaint}
            style={field}
          />
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Write your message"
            placeholderTextColor={t.colors.textFaint}
            multiline
            style={[field, { minHeight: 110, textAlignVertical: 'top' }]}
          />
          <Button
            title="Send message"
            icon="paper-plane-outline"
            onPress={submit}
            disabled={!message.trim()}
            full
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ============================================================
   INBOX SCREEN
   ============================================================ */
export default function Inbox() {
  const t = useTheme();
  const router = useRouter();

  const conversations = useConversations();
  const notifications = useNotifications();
  const activities = useActivities({ open: true });

  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(null); // null unknown, true/false after a refresh
  const [openConvoId, setOpenConvoId] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [localConvos, setLocalConvos] = useState([]);
  const [replies, setReplies] = useState({}); // convoId -> [{from,body}]
  const [readIds, setReadIds] = useState(() => new Set());

  // All threads: locally-composed ones first, then seeded.
  const allConvos = useMemo(
    () => [...localConvos, ...conversations],
    [localConvos, conversations]
  );

  const messageItems = useMemo(
    () =>
      allConvos.map((c) => ({
        key: `m_${c.id}`,
        kind: 'message',
        time: c.updatedAt,
        convo: c,
        unread: !!c.unread && !readIds.has(c.id),
      })),
    [allConvos, readIds]
  );

  const taskItems = useMemo(
    () =>
      activities.map((a) => ({
        key: `t_${a.id}`,
        kind: 'task',
        time: a.dueAt,
        activity: a,
        unread: false,
      })),
    [activities]
  );

  const alertItems = useMemo(
    () =>
      notifications.map((n) => ({
        key: `al_${n.id}`,
        kind: 'alert',
        time: n.at,
        note: n,
        unread: !n.read,
      })),
    [notifications]
  );

  const feed = useMemo(() => {
    let items;
    if (filter === 'messages') items = messageItems;
    else if (filter === 'tasks') items = taskItems;
    else if (filter === 'alerts') items = alertItems;
    else items = [...messageItems, ...taskItems, ...alertItems];
    return [...items].sort((a, b) => new Date(b.time) - new Date(a.time));
  }, [filter, messageItems, taskItems, alertItems]);

  const counts = useMemo(
    () => ({
      messages: messageItems.length,
      tasks: taskItems.length,
      alerts: alertItems.length,
    }),
    [messageItems, taskItems, alertItems]
  );
  const unreadTotal = useMemo(
    () =>
      messageItems.filter((i) => i.unread).length +
      alertItems.filter((i) => i.unread).length,
    [messageItems, alertItems]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const ok = await ping();
      setOnline(ok);
    } catch {
      setOnline(false);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openConvo = useCallback((id) => {
    setOpenConvoId(id);
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const sendReply = useCallback((convoId, text) => {
    setReplies((prev) => ({
      ...prev,
      [convoId]: [...(prev[convoId] || []), { from: 'me', body: text }],
    }));
  }, []);

  const createThread = useCallback(
    ({ to, subject, message }) => {
      const id = `local_${Date.now()}`;
      const convo = {
        id,
        channel: 'email',
        subject: subject || 'New message',
        companyId: null,
        contactId: null,
        toLabel: to || 'New contact',
        unread: false,
        updatedAt: new Date().toISOString(),
        messages: [{ from: 'me', body: message }],
        local: true,
      };
      setLocalConvos((prev) => [convo, ...prev]);
      setComposeOpen(false);
      openConvo(id);
    },
    [openConvo]
  );

  const onAlert = useCallback(
    (note) => {
      markNotificationRead(note.id);
      const to = note?.target?.to;
      if (to) router.push(to);
    },
    [router]
  );

  const onTask = useCallback(
    (activity) => {
      if (activity.relatedType === 'deal' && activity.relatedId) {
        router.push(`/deal/${activity.relatedId}`);
      } else if (activity.relatedType === 'contact' && activity.relatedId) {
        router.push(`/contact/${activity.relatedId}`);
      } else {
        toggleActivityDone(activity.id);
      }
    },
    [router]
  );

  // ---- open thread takes over the screen ----
  const activeConvo = allConvos.find((c) => c.id === openConvoId);
  if (activeConvo) {
    const msgs = [...(activeConvo.messages || []), ...(replies[activeConvo.id] || [])];
    return (
      <Thread
        convo={activeConvo}
        messages={msgs}
        onBack={() => setOpenConvoId(null)}
        onSend={(text) => sendReply(activeConvo.id, text)}
      />
    );
  }

  // ---- feed rows ----
  const renderItem = ({ item }) => {
    if (item.kind === 'message') {
      const c = item.convo;
      return (
        <Card onPress={() => openConvo(c.id)} style={{ marginBottom: t.space.md }}>
          <Row gap={t.space.md} align="flex-start">
            <Avatar name={convoWho(c)} size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Row justify="space-between" gap={t.space.sm}>
                <Text
                  style={{ color: t.colors.text, ...t.type.bodyStrong, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {convoWho(c)}
                </Text>
                <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>
                  {timeAgo(c.updatedAt)}
                </Text>
              </Row>
              <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }} numberOfLines={1}>
                {c.subject}
              </Text>
              <Text style={{ color: t.colors.textFaint, ...t.type.small, marginTop: 4 }} numberOfLines={2}>
                {lastSnippet(c)}
              </Text>
              <Row style={{ marginTop: t.space.sm }} justify="space-between">
                <Badge
                  label={c.channel === 'chat' ? 'Chat' : 'Email'}
                  tone={c.channel === 'chat' ? 'info' : 'neutral'}
                />
                {item.unread ? <Badge label="Unread" tone="accent" /> : null}
              </Row>
            </View>
          </Row>
        </Card>
      );
    }

    if (item.kind === 'task') {
      const a = item.activity;
      const meta = ACTIVITY_META[a.type] || ACTIVITY_META.task;
      const due = dueLabel(a.dueAt);
      const toneColor =
        meta.tone === 'good'
          ? t.colors.good
          : meta.tone === 'info'
          ? t.colors.info
          : meta.tone === 'warn'
          ? t.colors.warn
          : t.colors.accent;
      return (
        <Card onPress={() => onTask(a)} style={{ marginBottom: t.space.md }}>
          <Row gap={t.space.md} align="flex-start">
            <Pressable
              onPress={() => toggleActivityDone(a.id)}
              hitSlop={8}
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: a.done ? t.colors.good : t.colors.borderStrong,
                backgroundColor: a.done ? t.colors.good : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              {a.done ? <Ionicons name="checkmark" size={18} color={t.colors.onAccent} /> : null}
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Row justify="space-between" gap={t.space.sm}>
                <Text
                  style={{
                    color: t.colors.text,
                    ...t.type.bodyStrong,
                    flexShrink: 1,
                    textDecorationLine: a.done ? 'line-through' : 'none',
                  }}
                  numberOfLines={2}
                >
                  {a.subject}
                </Text>
                <Ionicons name={meta.icon} size={18} color={toneColor} />
              </Row>
              {a.companyId ? (
                <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }} numberOfLines={1}>
                  {companyName(a.companyId)}
                </Text>
              ) : null}
              <Row style={{ marginTop: t.space.sm }} gap={t.space.sm} wrap>
                <Badge label={meta.label} tone={meta.tone} />
                {!a.done ? (
                  <Badge label={due.text} tone={due.overdue ? 'bad' : 'neutral'} />
                ) : (
                  <Badge label="Done" tone="good" />
                )}
              </Row>
            </View>
          </Row>
        </Card>
      );
    }

    // alert
    const n = item.note;
    const meta = alertMeta(n.type);
    const toneColor =
      meta.tone === 'good'
        ? t.colors.good
        : meta.tone === 'warn'
        ? t.colors.warn
        : meta.tone === 'info'
        ? t.colors.info
        : t.colors.accent;
    const washMap = {
      good: t.colors.goodWash,
      warn: t.colors.warnWash,
      info: t.colors.infoWash,
      accent: t.colors.accentWash,
    };
    return (
      <Card onPress={() => onAlert(n)} style={{ marginBottom: t.space.md }}>
        <Row gap={t.space.md} align="flex-start">
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: washMap[meta.tone] || t.colors.accentWash,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={meta.icon} size={22} color={toneColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Row justify="space-between" gap={t.space.sm}>
              <Text
                style={{ color: t.colors.text, ...t.type.bodyStrong, flexShrink: 1 }}
                numberOfLines={2}
              >
                {n.title}
              </Text>
              <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>{timeAgo(n.at)}</Text>
            </Row>
            {n.body ? (
              <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 4 }} numberOfLines={2}>
                {n.body}
              </Text>
            ) : null}
            <Row style={{ marginTop: t.space.sm }} justify="space-between">
              <Badge label={meta.label} tone={meta.tone} />
              {item.unread ? <Badge label="New" tone="accent" /> : null}
            </Row>
          </View>
        </Row>
      </Card>
    );
  };

  const ListHeader = (
    <View>
      <Row justify="space-between" style={{ marginBottom: t.space.xs }}>
        <Text style={{ color: t.colors.text, ...t.type.title }}>Inbox</Text>
        <Pressable
          onPress={() => setComposeOpen(true)}
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.xs,
            backgroundColor: t.colors.accent,
            borderRadius: t.radius.pill,
            paddingHorizontal: t.space.lg,
            paddingVertical: t.space.sm,
          }}
        >
          <Ionicons name="create-outline" size={18} color={t.colors.onAccent} />
          <Text style={{ color: t.colors.onAccent, ...t.type.label }}>Compose</Text>
        </Pressable>
      </Row>
      <Text style={{ color: t.colors.textMuted, ...t.type.small }}>
        {unreadTotal > 0 ? `${unreadTotal} unread` : 'You are all caught up'}
        {online === false ? '  -  Offline, showing saved inbox' : ''}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.space.sm, paddingVertical: t.space.md }}
      >
        {FILTERS.map((f) => {
          const c = counts[f.key];
          const label = f.key === 'all' ? f.label : `${f.label}${c ? ` ${c}` : ''}`;
          return (
            <Pill key={f.key} label={label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={feed}
        keyExtractor={(i) => i.key}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{
          paddingHorizontal: t.space.lg,
          paddingTop: t.space.sm,
          paddingBottom: t.space.xxxl,
        }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={{ paddingTop: t.space.xxl }}>
            <EmptyView
              icon="chatbubbles-outline"
              title="Nothing in this filter"
              body="Messages, tasks, and alerts land here as your deals move. Compose a new message to start a thread."
              actionLabel="Compose message"
              onAction={() => setComposeOpen(true)}
            />
          </View>
        }
      />
      <Compose
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onCreate={createThread}
      />
    </Screen>
  );
}
