// ============================================================
// CONTACT DETAIL
// Reads :id from useLocalSearchParams(), resolves the person from the
// local-first store, and renders a rich profile: identity header,
// call/email/text actions (real device intents via Linking, each also
// logs a touch), related deals, an activity timeline (task toggles
// persist to the store), and session notes. A compose modal backs the
// "Log activity" and "Add note" actions so no button is a dead end.
// Everything renders offline; a best-effort refresh enriches if online.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Button,
  Badge,
  Avatar,
  Divider,
  SectionTitle,
  EmptyView,
  money,
  useTheme,
} from '../../src/ui';
import {
  getContact,
  getCompany,
  getUser,
  useDeals,
  useActivities,
  toggleActivityDone,
  stageById,
  ACTIVITY_META,
  ACTIVITY_TYPES,
} from '../../src/store';
import { get } from '../../src/api';

/* ---------- small helpers ---------- */
function stageTone(id) {
  if (id === 'won') return 'good';
  if (id === 'lost') return 'bad';
  if (id === 'negotiation') return 'warn';
  if (id === 'proposal' || id === 'discovery') return 'info';
  return 'accent';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const key = (x) => x.toDateString();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const tmr = new Date(now);
  tmr.setDate(now.getDate() + 1);
  if (key(d) === key(now)) return 'Today';
  if (key(d) === key(yest)) return 'Yesterday';
  if (key(d) === key(tmr)) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const digits = (s) => String(s || '').replace(/[^0-9+]/g, '');

/* ============================================================
   SCREEN
   ============================================================ */
export default function ContactDetail() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const contact = getContact(id);
  const company = contact ? getCompany(contact.companyId) : null;
  const owner = contact ? getUser(contact.ownerId) : null;

  // Store-backed collections (re-render on mutation).
  const allDeals = useDeals();
  const allActivities = useActivities();

  // Session-local additions (notes + logged touches). Not persisted to
  // the store on purpose - the store owns no note/add-activity mutation,
  // so we keep these in component state and merge them into the views.
  const [localActs, setLocalActs] = useState([]);
  const [notes, setNotes] = useState(() => seedNotes(contact));
  const [refreshing, setRefreshing] = useState(false);

  // Compose modal state.
  const [modal, setModal] = useState(null); // null | 'activity' | 'note'
  const [draftType, setDraftType] = useState('note');
  const [draftText, setDraftText] = useState('');

  const relatedDeals = useMemo(
    () => (contact ? allDeals.filter((d) => (d.contactIds || []).includes(contact.id)) : []),
    [allDeals, contact]
  );

  const timeline = useMemo(() => {
    if (!contact) return [];
    const dealIds = new Set(relatedDeals.map((d) => d.id));
    const store = allActivities.filter(
      (a) => a.relatedId === contact.id || dealIds.has(a.relatedId)
    );
    const merged = [...localActs, ...store];
    return merged.sort((a, b) => new Date(b.dueAt || 0) - new Date(a.dueAt || 0));
  }, [contact, relatedDeals, allActivities, localActs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await get(`/api/contacts/${id}`); // best-effort; store stays canonical
    } catch {
      // offline is fine
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  /* ---------- contact-method intents ---------- */
  const openIntent = useCallback(
    async (kind) => {
      if (!contact) return;
      let url = '';
      let logType = 'note';
      if (kind === 'call') {
        url = `tel:${digits(contact.phone)}`;
        logType = 'call';
      } else if (kind === 'text') {
        url = `sms:${digits(contact.phone)}`;
        logType = 'note';
      } else {
        url = `mailto:${contact.email}`;
        logType = 'email';
      }
      // Log the touch locally first so the timeline reflects it even if the
      // device has no phone/mail app (simulator, tablet).
      const verb = kind === 'call' ? 'Called' : kind === 'text' ? 'Texted' : 'Emailed';
      pushLocalActivity(setLocalActs, {
        type: logType,
        subject: `${verb} ${contact.name}`,
        contact,
        ownerId: contact.ownerId,
      });
      try {
        const ok = await Linking.canOpenURL(url);
        if (ok) await Linking.openURL(url);
        else Alert.alert('Not available', `This device cannot open ${kind === 'email' ? 'email' : 'the phone app'}.`);
      } catch (e) {
        Alert.alert('Could not open', String(e?.message || e));
      }
    },
    [contact]
  );

  /* ---------- toggle a task done (store or local) ---------- */
  const onToggle = useCallback((a) => {
    if (a.type !== 'task') return;
    if (String(a.id).startsWith('local_')) {
      setLocalActs((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)));
    } else {
      toggleActivityDone(a.id);
    }
  }, []);

  /* ---------- compose modal ---------- */
  const openActivityModal = () => {
    setDraftType('call');
    setDraftText('');
    setModal('activity');
  };
  const openNoteModal = () => {
    setDraftText('');
    setModal('note');
  };
  const closeModal = () => setModal(null);

  const saveModal = () => {
    const text = draftText.trim();
    if (!text) {
      closeModal();
      return;
    }
    if (modal === 'note') {
      setNotes((prev) => [{ id: `note_${Date.now()}`, body: text, at: new Date().toISOString() }, ...prev]);
    } else {
      pushLocalActivity(setLocalActs, {
        type: draftType,
        subject: text,
        contact,
        ownerId: contact?.ownerId,
      });
    }
    closeModal();
  };

  /* ---------- not found ---------- */
  if (!contact) {
    return (
      <Screen edges={['left', 'right']}>
        <Stack.Screen options={{ title: 'Contact' }} />
        <EmptyView
          icon="person-remove-outline"
          title="Contact not found"
          body="This person is not in your local book. They may have been removed."
          actionLabel="Back to contacts"
          onAction={() => router.replace('/(tabs)/contacts')}
        />
      </Screen>
    );
  }

  const canCall = !!digits(contact.phone);
  const canEmail = !!contact.email;

  return (
    <Screen edges={['left', 'right']} refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: contact.name }} />

      {/* Identity header */}
      <Card>
        <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'center' }}>
          <Avatar name={contact.name} size={64} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.colors.text, ...t.type.h2 }} numberOfLines={1}>
              {contact.name}
            </Text>
            {contact.title ? (
              <Text style={{ color: t.colors.textMuted, ...t.type.body, marginTop: 2 }} numberOfLines={1}>
                {contact.title}
              </Text>
            ) : null}
            {company ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: healthColor(t, company.health),
                  }}
                />
                <Text style={{ color: t.colors.textMuted, ...t.type.small }} numberOfLines={1}>
                  {company.name}
                  {company.industry ? ` - ${company.industry}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Tags */}
        {contact.tags?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.md }}>
            {contact.tags.map((tag) => (
              <Badge key={tag} label={tag} tone="accent" />
            ))}
          </View>
        ) : null}

        <Divider />

        {/* Contact methods */}
        <View style={{ flexDirection: 'row', gap: t.space.sm }}>
          <MethodButton icon="call-outline" label="Call" onPress={() => openIntent('call')} disabled={!canCall} />
          <MethodButton icon="mail-outline" label="Email" onPress={() => openIntent('email')} disabled={!canEmail} />
          <MethodButton icon="chatbubble-outline" label="Text" onPress={() => openIntent('text')} disabled={!canCall} />
        </View>

        {/* Raw contact lines */}
        <View style={{ marginTop: t.space.md, gap: t.space.sm }}>
          {canEmail ? <InfoLine icon="mail-outline" value={contact.email} /> : null}
          {canCall ? <InfoLine icon="call-outline" value={contact.phone} /> : null}
          {owner ? <InfoLine icon="person-outline" value={`Owned by ${owner.name}`} /> : null}
        </View>
      </Card>

      {/* Related deals */}
      <SectionTitle style={{ marginTop: t.space.xl }}>
        {relatedDeals.length ? `Deals (${relatedDeals.length})` : 'Deals'}
      </SectionTitle>
      {relatedDeals.length ? (
        <View style={{ gap: t.space.md }}>
          {relatedDeals.map((d) => (
            <Card key={d.id} onPress={() => router.push(`/deal/${d.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
                <Text style={{ flex: 1, minWidth: 0, color: t.colors.text, ...t.type.bodyStrong }} numberOfLines={1}>
                  {d.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: t.space.md }}>
                <Badge label={stageById(d.stage)?.name || d.stage} tone={stageTone(d.stage)} />
                <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>{money(d.value)}</Text>
              </View>
              <Text style={{ color: t.colors.textFaint, ...t.type.small, marginTop: t.space.sm }}>
                {d.probability}% to close
                {d.closeDate ? ` - ${d.status === 'open' ? 'target' : 'closed'} ${fmtDate(d.closeDate)}` : ''}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={{ color: t.colors.textMuted, ...t.type.body }}>
            No open deals with {contact.firstName || 'this contact'} yet.
          </Text>
        </Card>
      )}

      {/* Activity timeline */}
      <SectionTitle style={{ marginTop: t.space.xl }} action="Log activity" onAction={openActivityModal}>
        Activity
      </SectionTitle>
      {timeline.length ? (
        <Card padded={false}>
          {timeline.map((a, i) => (
            <ActivityRow key={a.id} activity={a} last={i === timeline.length - 1} onToggle={() => onToggle(a)} />
          ))}
        </Card>
      ) : (
        <Card>
          <Text style={{ color: t.colors.textMuted, ...t.type.body }}>
            No activity logged yet. Use Call, Email, or Log activity to start the timeline.
          </Text>
        </Card>
      )}

      {/* Notes */}
      <SectionTitle style={{ marginTop: t.space.xl }} action="Add note" onAction={openNoteModal}>
        Notes
      </SectionTitle>
      {notes.length ? (
        <View style={{ gap: t.space.md }}>
          {notes.map((n) => (
            <Card key={n.id}>
              <Text style={{ color: t.colors.text, ...t.type.body }}>{n.body}</Text>
              <Text style={{ color: t.colors.textFaint, ...t.type.micro, marginTop: t.space.sm }}>
                {fmtDate(n.at)}
              </Text>
            </Card>
          ))}
        </View>
      ) : (
        <Card>
          <Text style={{ color: t.colors.textMuted, ...t.type.body }}>
            No notes yet. Add context you want to remember about {contact.firstName || 'this contact'}.
          </Text>
        </Card>
      )}

      {/* Compose modal */}
      <ComposeModal
        visible={modal != null}
        mode={modal}
        draftType={draftType}
        setDraftType={setDraftType}
        draftText={draftText}
        setDraftText={setDraftText}
        onCancel={closeModal}
        onSave={saveModal}
        contactName={contact.name}
      />
    </Screen>
  );
}

/* ============================================================
   PIECES
   ============================================================ */
function MethodButton({ icon, label, onPress, disabled }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flex: 1,
          alignItems: 'center',
          gap: 6,
          paddingVertical: t.space.md,
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.md,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: t.colors.accentWash,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={t.colors.accent} />
      </View>
      <Text style={{ color: t.colors.text, ...t.type.label }}>{label}</Text>
    </Pressable>
  );
}

function InfoLine({ icon, value }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
      <Ionicons name={icon} size={16} color={t.colors.textFaint} />
      <Text style={{ color: t.colors.textMuted, ...t.type.small, flex: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActivityRow({ activity, last, onToggle }) {
  const t = useTheme();
  const meta = ACTIVITY_META[activity.type] || ACTIVITY_META.note;
  const toneColor =
    meta.tone === 'good'
      ? t.colors.good
      : meta.tone === 'info'
      ? t.colors.info
      : meta.tone === 'warn'
      ? t.colors.warn
      : meta.tone === 'accent'
      ? t.colors.accent
      : t.colors.textMuted;
  const isTask = activity.type === 'task';
  const overdue = isTask && !activity.done && new Date(activity.dueAt) < new Date();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        padding: t.space.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: t.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={meta.icon} size={17} color={toneColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: t.colors.text,
            ...t.type.bodyStrong,
            textDecorationLine: isTask && activity.done ? 'line-through' : 'none',
            opacity: isTask && activity.done ? 0.6 : 1,
          }}
          numberOfLines={2}
        >
          {activity.subject}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: 2 }}>
          <Text style={{ color: t.colors.textFaint, ...t.type.small }}>
            {meta.label} - {fmtDate(activity.dueAt)}
          </Text>
          {overdue ? <Badge label="Overdue" tone="bad" /> : null}
        </View>
      </View>
      {isTask ? (
        <Pressable onPress={onToggle} hitSlop={10}>
          <Ionicons
            name={activity.done ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={activity.done ? t.colors.good : t.colors.borderStrong}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function ComposeModal({
  visible,
  mode,
  draftType,
  setDraftType,
  draftText,
  setDraftText,
  onCancel,
  onSave,
  contactName,
}) {
  const t = useTheme();
  const isNote = mode === 'note';
  const title = isNote ? 'Add note' : 'Log activity';
  const placeholder = isNote
    ? `What do you want to remember about ${contactName}?`
    : 'What happened? (e.g. Left a voicemail about pricing)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onCancel} />
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            padding: t.space.xl,
            gap: t.space.lg,
            borderTopWidth: 1,
            borderColor: t.colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: t.colors.text, ...t.type.h2 }}>{title}</Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Ionicons name="close" size={24} color={t.colors.textMuted} />
            </Pressable>
          </View>

          {!isNote ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
              {ACTIVITY_TYPES.map((ty) => {
                const active = draftType === ty;
                const meta = ACTIVITY_META[ty];
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
                      backgroundColor: active ? t.colors.accent : t.colors.surface,
                      borderColor: active ? t.colors.accent : t.colors.border,
                    }}
                  >
                    <Ionicons name={meta.icon} size={15} color={active ? t.colors.onAccent : t.colors.textMuted} />
                    <Text style={{ color: active ? t.colors.onAccent : t.colors.textMuted, ...t.type.small }}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <TextInput
            value={draftText}
            onChangeText={setDraftText}
            placeholder={placeholder}
            placeholderTextColor={t.colors.textFaint}
            multiline
            autoFocus
            style={{
              minHeight: 96,
              maxHeight: 200,
              backgroundColor: t.colors.bg,
              borderColor: t.colors.border,
              borderWidth: 1,
              borderRadius: t.radius.md,
              padding: t.space.md,
              color: t.colors.text,
              fontSize: 17,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ flexDirection: 'row', gap: t.space.md }}>
            <Button title="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button
              title={isNote ? 'Save note' : 'Log it'}
              onPress={onSave}
              icon="checkmark"
              disabled={!draftText.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ============================================================
   HELPERS (non-component)
   ============================================================ */
function healthColor(t, health) {
  if (health === 'green') return t.colors.good;
  if (health === 'yellow') return t.colors.warn;
  if (health === 'red') return t.colors.bad;
  return t.colors.textFaint;
}

function pushLocalActivity(setLocalActs, { type, subject, contact, ownerId }) {
  const now = new Date().toISOString();
  setLocalActs((prev) => [
    {
      id: `local_${Date.now()}_${Math.round(Math.random() * 1e5)}`,
      type,
      subject,
      body: '',
      done: false,
      ownerId,
      relatedType: 'contact',
      relatedId: contact?.id,
      companyId: contact?.companyId,
      dueAt: now,
      createdAt: now,
    },
    ...prev,
  ]);
}

// A couple of contextual starter notes so a fresh profile reads rich
// offline. Derived from the contact's own tags - session-local only.
function seedNotes(contact) {
  if (!contact) return [];
  const out = [];
  const at = new Date();
  const tag = (contact.tags || []).map((x) => x.toLowerCase());
  if (tag.includes('champion')) {
    out.push({
      id: 'note_seed_1',
      body: `${contact.firstName} is our champion here - keep them close through procurement and give them internal ammo to sell up.`,
      at: new Date(at.getTime() - 2 * 86400000).toISOString(),
    });
  }
  if (tag.includes('economic buyer') || tag.includes('decision maker')) {
    out.push({
      id: 'note_seed_2',
      body: 'Holds budget sign-off. Loop in early on pricing and ROI - do not surprise them late in the cycle.',
      at: new Date(at.getTime() - 5 * 86400000).toISOString(),
    });
  }
  if (tag.includes('blocker')) {
    out.push({
      id: 'note_seed_3',
      body: 'Skeptical so far. Address security and rollout risk head-on; a reference call would help.',
      at: new Date(at.getTime() - 3 * 86400000).toISOString(),
    });
  }
  return out;
}
