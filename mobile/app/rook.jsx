// ============================================================
// ROOK - the Rally AI operator (chat modal)
// A grounded chat surface. Seeds a warm greeting + suggested
// prompts, then answers questions about the book of business.
//
// LOCAL-FIRST + RESILIENT: on send it optionally POSTs to the web
// API's /api/rook (env-gated by EXPO_PUBLIC_ROOK_LIVE). If that env
// is off, or the request fails, or there is no network, it falls
// back to a CANNED response computed from the local store so Rook
// always answers instantly - no crash, no dead air. Every reply is
// grounded in the real seeded pipeline, so demo mode feels alive.
//
// Presented as a modal (declared in app/_layout.jsx). Because this
// file is at app/ top level, shared modules import from ../src.
// ============================================================
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme';
import { money } from '../src/ui';
import { post } from '../src/api';
import { useAuth } from '../src/auth';
import {
  useDeals,
  useContacts,
  useCompanies,
  useActivities,
  usePipeline,
  useCurrentUser,
  getDeal,
  getContact,
  companyName,
  contactName,
  stageById,
} from '../src/store';

// Live brain is off by default so the app is fully usable offline.
// Flip EXPO_PUBLIC_ROOK_LIVE=1 to route sends through the web API.
const ROOK_LIVE = process.env.EXPO_PUBLIC_ROOK_LIVE === '1';

const GREETING =
  "Hi, I'm Rook, your revenue operator. I can see your whole book - deals, contacts, activities. Ask me anything, or pick a starter below.";

const SEED_SUGGESTIONS = [
  'What should I focus on today',
  'Summarize my pipeline',
  'Draft a follow-up',
  'Which deals are slipping',
];

let msgSeq = 0;
const nextId = () => `m_${Date.now()}_${msgSeq++}`;

/* ---------- route mapping: web Rook routes -> mobile routes ---------- */
// Rook (and its canned twin) speak the web app's URLs. Translate them to
// the screens that actually exist in this app so no button is ever dead.
function mapRoute(to) {
  if (!to) return null;
  const p = String(to).split('?')[0].split('#')[0].trim();
  if (p === '' || p === '/') return '/(tabs)';
  let m;
  if ((m = p.match(/^\/deals?\/(.+)$/))) return `/deal/${m[1]}`;
  if ((m = p.match(/^\/contacts?\/(.+)$/))) return `/contact/${m[1]}`;
  if (p === '/deals') return '/(tabs)/deals';
  if (p === '/contacts') return '/(tabs)/contacts';
  if (p === '/inbox' || p === '/tickets') return '/(tabs)/inbox';
  if (p === '/notifications') return '/notifications';
  if (p === '/settings' || p === '/team') return '/settings';
  // Already a mobile route.
  if (p.startsWith('/deal/') || p.startsWith('/contact/') || p.startsWith('/(tabs)')) return p;
  if (p === '/companies') return '/(tabs)/deals';
  // Everything else (dashboards, reports, forecasting, campaigns, ...) lands home.
  return '/(tabs)';
}

// Where a proposed action would be completed in this app. Keeps action
// chips meaningful (they navigate to the right surface) instead of dead.
function actionRoute(a) {
  if (!a) return null;
  if (a.kind === 'navigate') return mapRoute(a.to);
  if (a.deal_id) return `/deal/${a.deal_id}`;
  if (a.company_id) return '/(tabs)/deals';
  if (a.contact_id) return `/contact/${a.contact_id}`;
  switch (a.kind) {
    case 'create_deal':
    case 'move_stage':
    case 'quote_from_deal':
    case 'summarize_deal':
    case 'fork_whatif':
    case 'generate_deck':
      return '/(tabs)/deals';
    case 'create_contact':
      return '/(tabs)/contacts';
    case 'create_company':
    case 'build_account':
      return '/(tabs)/deals';
    case 'log_activity':
      return a.activity?.relatedType === 'contact' && a.activity?.relatedId
        ? `/contact/${a.activity.relatedId}`
        : a.activity?.relatedId
        ? `/deal/${a.activity.relatedId}`
        : '/(tabs)';
    case 'suggest_meeting':
    case 'draft_email':
    case 'queue_broadcast':
      return '/(tabs)/inbox';
    default:
      return null;
  }
}

const ACTION_ICON = {
  navigate: 'arrow-forward-outline',
  create_deal: 'add-circle-outline',
  create_contact: 'person-add-outline',
  create_company: 'business-outline',
  move_stage: 'swap-horizontal-outline',
  log_activity: 'checkbox-outline',
  draft_email: 'mail-outline',
  generate_deck: 'easel-outline',
  build_account: 'construct-outline',
  queue_broadcast: 'megaphone-outline',
  quote_from_deal: 'document-text-outline',
  suggest_meeting: 'calendar-outline',
  summarize_deal: 'sparkles-outline',
  fork_whatif: 'git-branch-outline',
};

/* ---------- snapshot for the live brain (compact, grounded) ---------- */
function buildSnapshot({ me, deals, contacts, companies, activities, pipeline }) {
  const open = deals.filter((d) => d.status === 'open');
  const now = Date.now();
  const slipping = open
    .filter((d) => new Date(d.closeDate).getTime() < now)
    .slice(0, 12)
    .map((d) => ({ name: d.name, value: d.value, closeDate: d.closeDate }));
  const stageBreakdown = stageIds(deals);
  return {
    currentUser: { name: me?.name, title: me?.title },
    counts: {
      contacts: contacts.length,
      companies: companies.length,
      deals: deals.length,
      openDeals: open.length,
      wonDeals: deals.filter((d) => d.status === 'won').length,
      lostDeals: deals.filter((d) => d.status === 'lost').length,
      activities: activities.length,
      openTasks: activities.filter((a) => !a.done).length,
    },
    revenue: {
      pipeline: pipeline.openValue,
      forecast: Math.round(pipeline.weighted),
      wonThisMonth: pipeline.wonValue,
    },
    stageBreakdown,
    deals: deals.slice(0, 24).map((d) => ({
      id: d.id,
      name: d.name,
      company: companyName(d.companyId),
      value: d.value,
      stage: d.stage,
      status: d.status,
      probability: d.probability,
      closeDate: d.closeDate,
      owner: me?.name,
    })),
    myDay: activities
      .filter((a) => !a.done)
      .slice(0, 12)
      .map((a) => ({ type: a.type, subject: a.subject, due: a.dueAt })),
    slipping,
  };
}

function stageIds(deals) {
  const by = {};
  for (const d of deals) {
    if (d.status !== 'open') continue;
    by[d.stage] = by[d.stage] || { stage: stageById(d.stage)?.name || d.stage, count: 0, value: 0 };
    by[d.stage].count += 1;
    by[d.stage].value += d.value;
  }
  return Object.values(by);
}

/* ---------- canned brain: grounded answers with zero network ---------- */
// Pattern-matches the user's intent and answers from the local store.
// Always returns { reply, nav, suggestions } so the UI can render.
function cannedReply(text, ctx) {
  const q = String(text || '').toLowerCase();
  const { deals, activities, pipeline } = ctx;
  const open = deals.filter((d) => d.status === 'open');
  const now = Date.now();
  const DAY = 86400000;

  const has = (...words) => words.some((w) => q.includes(w));

  // 1) Focus / today / priorities
  if (has('focus', 'today', 'priorit', 'my day', 'do first', 'next')) {
    const openTasks = activities.filter((a) => !a.done);
    const overdue = openTasks.filter((a) => new Date(a.dueAt).getTime() < now - DAY);
    const dueToday = openTasks.filter((a) => {
      const t = new Date(a.dueAt).getTime();
      return t >= now - DAY && t <= now + DAY;
    });
    const top = [...overdue, ...dueToday].slice(0, 3);
    const lines = top.map((a) => `- ${a.subject}`).join('\n');
    const reply = top.length
      ? `You have ${openTasks.length} open task${openTasks.length === 1 ? '' : 's'}` +
        (overdue.length ? `, ${overdue.length} overdue` : '') +
        `. Start here:\n${lines}`
      : `Your task list is clear. With ${open.length} open deals worth ${money(
          pipeline.openValue,
          { compact: true }
        )}, I'd nudge your top negotiation forward.`;
    return {
      reply,
      nav: { label: 'Open my day', to: '/(tabs)' },
      suggestions: ['Summarize my pipeline', 'Which deals are slipping', 'Draft a follow-up'],
    };
  }

  // 2) Pipeline / forecast / summary / quota
  if (has('pipeline', 'forecast', 'summar', 'how much', 'quota', 'revenue', 'number')) {
    const reply =
      `You have ${open.length} open deals worth ${money(pipeline.openValue, { compact: true })}, ` +
      `a weighted forecast of ${money(pipeline.weighted, { compact: true })}. ` +
      `Won so far: ${money(pipeline.wonValue, { compact: true })}` +
      (pipeline.quota ? ` against a ${money(pipeline.quota, { compact: true })} quota (${pipeline.quotaPct}%).` : '.');
    return {
      reply,
      nav: { label: 'View deals', to: '/deals' },
      suggestions: ['Which deals are slipping', 'What should I focus on today', 'Draft a follow-up'],
    };
  }

  // 3) Slipping / at-risk / stalled
  if (has('slip', 'risk', 'stuck', 'stall', 'behind', 'overdue', 'late')) {
    const slipping = open
      .filter((d) => new Date(d.closeDate).getTime() < now)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    const lines = slipping
      .map((d) => `- ${d.name} (${money(d.value, { compact: true })}, was due ${d.closeDate.slice(0, 10)})`)
      .join('\n');
    const reply = slipping.length
      ? `${slipping.length} open deal${slipping.length === 1 ? ' is' : 's are'} past their close date:\n${lines}\nWant me to draft a nudge for the biggest one?`
      : `Nothing is past its close date right now. Your ${open.length} open deals are on track.`;
    return {
      reply,
      nav: slipping[0]
        ? { label: `Open ${companyName(slipping[0].companyId)}`, to: `/deals/${slipping[0].id}` }
        : { label: 'View deals', to: '/deals' },
      suggestions: ['Draft a follow-up', 'Summarize my pipeline', 'What should I focus on today'],
    };
  }

  // 4) Draft / follow-up / email / write
  if (has('draft', 'follow', 'email', 'write', 'reply', 'nudge', 'message')) {
    const deal = getDeal('d_flagship') || open[0];
    const champ = deal ? getContact(deal.contactIds?.[0]) : null;
    const first = champ?.firstName || 'there';
    const co = deal ? companyName(deal.companyId) : 'your account';
    const draft =
      `Subject: Next steps on ${co}\n\n` +
      `Hi ${first},\n\n` +
      `Thanks again for the time this week. To keep ${co} moving, I'll send over the redlined agreement today and hold a slot for a final review. ` +
      `Is Thursday or Friday better on your end?\n\nBest,\n${ctx.me?.name || 'Jordan'}`;
    return {
      reply: `Here's a follow-up for ${deal ? deal.name : 'your top deal'}:\n\n${draft}`,
      nav: deal ? { label: `Open ${co}`, to: `/deals/${deal.id}` } : null,
      suggestions: ['Make it shorter', 'Which deals are slipping', 'Summarize my pipeline'],
    };
  }

  // 5) Who / contacts
  if (has('who', 'contact', 'champion', 'people', 'stakeholder', 'reach')) {
    const deal = getDeal('d_flagship');
    const names = (deal?.contactIds || []).map((id) => contactName(id)).filter(Boolean).slice(0, 3);
    const reply = names.length
      ? `On ${deal ? companyName(deal.companyId) : 'your flagship'}, your active contacts are ${names.join(', ')}. Want a follow-up drafted to one of them?`
      : `Open Contacts to see everyone in your book. I can draft outreach to any of them.`;
    return {
      reply,
      nav: { label: 'View contacts', to: '/contacts' },
      suggestions: ['Draft a follow-up', 'Summarize my pipeline', 'What should I focus on today'],
    };
  }

  // 6) Default: grounded overview + steer
  const reply =
    `I'm on it. Right now you have ${open.length} open deals worth ${money(pipeline.openValue, {
      compact: true,
    })} and a weighted forecast of ${money(pipeline.weighted, { compact: true })}. ` +
    `Ask me what to focus on, to summarize the pipeline, or to draft a follow-up.`;
  return {
    reply,
    nav: { label: 'Open command center', to: '/' },
    suggestions: SEED_SUGGESTIONS.slice(0, 3),
  };
}

/* ============================================================
   SCREEN
   ============================================================ */
export default function RookScreen() {
  const t = useTheme();
  const router = useRouter();
  const { isDemo } = useAuth();

  // Local-first data - the ground truth for both the snapshot + canned brain.
  const me = useCurrentUser();
  const deals = useDeals();
  const contacts = useContacts();
  const companies = useCompanies();
  const activities = useActivities();
  const pipeline = usePipeline();

  const ctx = useMemo(
    () => ({ me, deals, contacts, companies, activities, pipeline }),
    [me, deals, contacts, companies, activities, pipeline]
  );

  const [messages, setMessages] = useState(() => [
    { id: nextId(), role: 'assistant', content: GREETING, at: Date.now() },
  ]);
  const [suggestions, setSuggestions] = useState(SEED_SUGGESTIONS);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const listRef = useRef(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
  }, []);

  const go = useCallback(
    (mobileRoute) => {
      const r = mapRoute(mobileRoute) || mobileRoute;
      if (r) router.push(r);
    },
    [router]
  );

  const send = useCallback(
    async (raw) => {
      const text = String(raw ?? input).trim();
      if (!text || busy) return;

      const userMsg = { id: nextId(), role: 'user', content: text, at: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setBusy(true);
      scrollToEnd();

      // Compute the resilient canned answer up front so we always have a reply.
      const fallback = cannedReply(text, ctx);
      let result = fallback;

      // Optionally enrich with the live brain. Never throws (api.post is safe);
      // any non-ok result keeps the grounded canned answer.
      if (ROOK_LIVE) {
        try {
          const history = [...messages, userMsg]
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content }));
          const r = await post(
            '/api/rook',
            {
              messages: history,
              snapshot: buildSnapshot(ctx),
              context: { path: '/rook', client: 'mobile' },
            },
            { timeout: 20000 }
          );
          if (r.ok && r.data?.reply) {
            result = {
              reply: r.data.reply,
              nav: r.data.nav || null,
              actions: Array.isArray(r.data.actions) ? r.data.actions : [],
              suggestions: Array.isArray(r.data.suggestions) && r.data.suggestions.length
                ? r.data.suggestions
                : fallback.suggestions,
            };
          }
        } catch {
          // keep the canned fallback - offline is a first-class mode
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: result.reply,
          nav: result.nav || null,
          actions: result.actions || [],
          at: Date.now(),
        },
      ]);
      setSuggestions(result.suggestions?.length ? result.suggestions : SEED_SUGGESTIONS.slice(0, 3));
      setBusy(false);
      scrollToEnd();
    },
    [input, busy, messages, ctx, scrollToEnd]
  );

  const renderMessage = useCallback(
    ({ item }) => {
      const mine = item.role === 'user';
      return (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: mine ? 'flex-end' : 'flex-start',
            marginBottom: t.space.md,
          }}
        >
          {!mine ? (
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: t.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: t.space.sm,
                marginTop: 2,
              }}
            >
              <Ionicons name="sparkles" size={15} color={t.colors.onAccent} />
            </View>
          ) : null}

          <View style={{ maxWidth: '82%' }}>
            <View
              style={{
                backgroundColor: mine ? t.colors.accent : t.colors.surface,
                borderColor: mine ? t.colors.accent : t.colors.border,
                borderWidth: 1,
                borderRadius: t.radius.lg,
                borderBottomRightRadius: mine ? t.radius.sm : t.radius.lg,
                borderBottomLeftRadius: mine ? t.radius.lg : t.radius.sm,
                paddingHorizontal: t.space.lg,
                paddingVertical: t.space.md,
              }}
            >
              <Text
                style={{
                  color: mine ? t.colors.onAccent : t.colors.text,
                  ...t.type.body,
                  lineHeight: 23,
                }}
              >
                {item.content}
              </Text>
            </View>

            {/* nav button on Rook replies */}
            {!mine && item.nav?.to ? (
              <Pressable
                onPress={() => go(item.nav.to)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.space.xs,
                  alignSelf: 'flex-start',
                  marginTop: t.space.sm,
                  backgroundColor: t.colors.accentWash,
                  borderRadius: t.radius.pill,
                  paddingHorizontal: t.space.md,
                  paddingVertical: t.space.sm,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="arrow-forward-outline" size={15} color={t.colors.accent} />
                <Text style={{ color: t.colors.accent, ...t.type.small }}>
                  {item.nav.label || 'Open'}
                </Text>
              </Pressable>
            ) : null}

            {/* proposed action chips (live brain only) */}
            {!mine && item.actions?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, marginTop: t.space.sm }}>
                {item.actions.map((a, i) => {
                  const route = actionRoute(a);
                  return (
                    <Pressable
                      key={`${item.id}_a_${i}`}
                      onPress={() => (route ? go(route) : send(a.label))}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: t.space.xs,
                        backgroundColor: t.colors.surfaceAlt,
                        borderColor: t.colors.border,
                        borderWidth: 1,
                        borderRadius: t.radius.pill,
                        paddingHorizontal: t.space.md,
                        paddingVertical: t.space.sm,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Ionicons
                        name={ACTION_ICON[a.kind] || 'flash-outline'}
                        size={15}
                        color={t.colors.accent}
                      />
                      <Text style={{ color: t.colors.text, ...t.type.small }}>{a.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      );
    },
    [t, go, send]
  );

  const Intro = (
    <View style={{ marginBottom: t.space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginBottom: t.space.xs }}>
        <Text style={{ color: t.colors.text, ...t.type.h3 }}>Rook</Text>
        <View
          style={{
            backgroundColor: ROOK_LIVE ? t.colors.goodWash : t.colors.accentWash,
            borderRadius: t.radius.sm,
            paddingHorizontal: t.space.sm,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: ROOK_LIVE ? t.colors.good : t.colors.accent, ...t.type.micro }}>
            {ROOK_LIVE ? 'LIVE' : isDemo ? 'DEMO' : 'OFFLINE'}
          </Text>
        </View>
      </View>
      <Text style={{ color: t.colors.textMuted, ...t.type.small }}>
        Grounded in your live book of business. Rook proposes; you confirm.
      </Text>
    </View>
  );

  const Typing = busy ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginBottom: t.space.md }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: t.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="sparkles" size={15} color={t.colors.onAccent} />
      </View>
      <View
        style={{
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.lg,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.sm,
        }}
      >
        <ActivityIndicator size="small" color={t.colors.accent} />
        <Text style={{ color: t.colors.textMuted, ...t.type.small }}>Rook is thinking</Text>
      </View>
    </View>
  ) : null;

  const canSend = input.trim().length > 0 && !busy;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          ListHeaderComponent={Intro}
          ListFooterComponent={Typing}
          contentContainerStyle={{ padding: t.space.lg, paddingBottom: t.space.md }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        />

        {/* Suggested prompt chips */}
        {suggestions?.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: t.space.lg, paddingBottom: t.space.sm, gap: t.space.sm }}
          >
            {suggestions.map((s, i) => (
              <Pressable
                key={`sug_${i}_${s}`}
                onPress={() => send(s)}
                disabled={busy}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.space.xs,
                  backgroundColor: t.colors.surface,
                  borderColor: t.colors.border,
                  borderWidth: 1,
                  borderRadius: t.radius.pill,
                  paddingHorizontal: t.space.md,
                  paddingVertical: t.space.sm,
                  opacity: pressed || busy ? 0.7 : 1,
                })}
              >
                <Ionicons name="sparkles-outline" size={14} color={t.colors.accent} />
                <Text style={{ color: t.colors.text, ...t.type.small }}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Composer */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: t.colors.surface }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: t.space.sm,
              paddingHorizontal: t.space.lg,
              paddingTop: t.space.md,
              paddingBottom: t.space.sm,
              borderTopColor: t.colors.border,
              borderTopWidth: 1,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Rook anything"
              placeholderTextColor={t.colors.textFaint}
              multiline
              onSubmitEditing={() => send()}
              blurOnSubmit={false}
              style={{
                flex: 1,
                maxHeight: 120,
                minHeight: 44,
                backgroundColor: t.colors.bg,
                borderColor: t.colors.border,
                borderWidth: 1,
                borderRadius: t.radius.lg,
                paddingHorizontal: t.space.lg,
                paddingTop: t.space.md,
                paddingBottom: t.space.md,
                color: t.colors.text,
                fontSize: 17,
              }}
            />
            <Pressable
              onPress={() => send()}
              disabled={!canSend}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: canSend ? t.colors.accent : t.colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons
                name="arrow-up"
                size={22}
                color={canSend ? t.colors.onAccent : t.colors.textFaint}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
