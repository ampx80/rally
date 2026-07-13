// ============================================================
// DEALS LIST  (tab: Deals)
// A searchable, stage-filterable book of business. Renders fully
// from the local-first store (no network, no auth required); a
// pull-to-refresh optionally pings the live API for enrichment but
// the screen never depends on it. Tap a deal -> /deal/[id].
//
// This tab has headerShown:false (see app/(tabs)/_layout.jsx), so
// it renders its own title bar inside <Screen>. The search field +
// filter pills live in a FIXED header above the FlatList (keeping
// them out of ListHeaderComponent avoids the TextInput-blur-on-
// keystroke pitfall) and only the list scrolls.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Card,
  Badge,
  Row,
  EmptyView,
  money,
  useTheme,
} from '../../src/ui';
import { get } from '../../src/api';
import { useDeals, companyName, STAGES, stageById } from '../../src/store';

/* ---------- small helpers (pure) ---------- */

// Map a stage id to a Badge/Pill tone so color reads consistently.
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
      return 'neutral'; // lead
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

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

// Whole-day delta from now for overdue coloring.
function daysFromNow(iso) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

/* ---------- deal row ---------- */

function DealCard({ deal, onPress }) {
  const t = useTheme();
  const tone = stageTone(deal.stage);
  const st = stageById(deal.stage);
  const isOpen = deal.status === 'open';
  const dueIn = daysFromNow(deal.closeDate);
  const overdue = isOpen && dueIn < 0;
  const dateTone = overdue ? t.colors.bad : t.colors.textMuted;

  return (
    <Card onPress={onPress} style={{ marginBottom: t.space.md }}>
      <Row justify="space-between" align="flex-start">
        <View style={{ flex: 1, minWidth: 0, paddingRight: t.space.md }}>
          <Text
            style={{ color: t.colors.textMuted, ...t.type.micro }}
            numberOfLines={1}
          >
            {companyName(deal.companyId)}
          </Text>
          <Text
            style={{ color: t.colors.text, ...t.type.h3, marginTop: 2 }}
            numberOfLines={1}
          >
            {deal.name}
          </Text>
        </View>
        <Text style={{ color: t.colors.text, ...t.type.h3 }}>
          {money(deal.value, { compact: true })}
        </Text>
      </Row>

      <Row justify="space-between" style={{ marginTop: t.space.md }}>
        <Badge label={st ? st.name : deal.stage} tone={tone} />
        <Row gap={t.space.xs}>
          <Ionicons name="calendar-outline" size={14} color={dateTone} />
          <Text style={{ color: dateTone, ...t.type.small }}>
            {overdue ? `Overdue ${fmtDate(deal.closeDate)}` : fmtDate(deal.closeDate)}
          </Text>
        </Row>
      </Row>

      {/* win-probability meter */}
      <View style={{ marginTop: t.space.md }}>
        <Row justify="space-between" style={{ marginBottom: t.space.xs }}>
          <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>
            WIN PROBABILITY
          </Text>
          <Text style={{ color: t.colors.textMuted, ...t.type.micro }}>
            {deal.probability}%
          </Text>
        </Row>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: t.colors.surfaceAlt,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 4,
              width: `${Math.max(0, Math.min(100, deal.probability))}%`,
              backgroundColor: toneHex(t, tone),
            }}
          />
        </View>
      </View>
    </Card>
  );
}

/* ---------- screen ---------- */

const FILTERS = [{ id: 'all', name: 'All' }, ...STAGES];

export default function DealsScreen() {
  const t = useTheme();
  const router = useRouter();
  const allDeals = useDeals(); // reactive, sorted by value desc
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = allDeals;
    if (stage !== 'all') list = list.filter((d) => d.stage === stage);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          companyName(d.companyId).toLowerCase().includes(q)
      );
    }
    return list;
  }, [allDeals, stage, query]);

  const totalValue = useMemo(
    () => filtered.reduce((n, d) => n + (d.value || 0), 0),
    [filtered]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Optional live enrichment only - the store already has the data.
      // get() never throws; it serves cache on failure. We ignore the
      // body here because the local store stays the source of truth.
      await get('/api/deals', { timeout: 6000 });
    } catch {
      // fully offline is fine - seeded data is already on screen
    }
    setRefreshing(false);
  }, []);

  const activeFilter = query.trim() || stage !== 'all';

  return (
    <Screen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      {/* fixed header: title + search + filters (stays mounted so the
          TextInput keeps focus across keystrokes) */}
      <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.sm }}>
        <Row justify="space-between" style={{ marginBottom: t.space.md }}>
          <Text style={{ color: t.colors.text, ...t.type.display }}>Deals</Text>
          <Pressable
            onPress={() => router.push('/rook')}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: t.colors.accentWash,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="sparkles-outline" size={20} color={t.colors.accent} />
          </Pressable>
        </Row>

        {/* search field */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.sm,
            backgroundColor: t.colors.surface,
            borderWidth: 1,
            borderColor: t.colors.border,
            borderRadius: t.radius.md,
            paddingHorizontal: t.space.md,
            height: 46,
          }}
        >
          <Ionicons name="search-outline" size={18} color={t.colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search deals or companies"
            placeholderTextColor={t.colors.textFaint}
            style={{ flex: 1, color: t.colors.text, ...t.type.body, padding: 0 }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={t.colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

        {/* stage filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: t.space.sm, paddingVertical: t.space.md }}
        >
          {FILTERS.map((f) => {
            const active = stage === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setStage(f.id)}
                style={({ pressed }) => ({
                  backgroundColor: active ? t.colors.accent : t.colors.surface,
                  borderColor: active ? t.colors.accent : t.colors.border,
                  borderWidth: 1,
                  borderRadius: t.radius.pill,
                  paddingHorizontal: t.space.lg,
                  paddingVertical: t.space.sm,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: active ? t.colors.onAccent : t.colors.textMuted,
                    ...t.type.small,
                  }}
                >
                  {f.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* summary line */}
        <Text
          style={{
            color: t.colors.textMuted,
            ...t.type.small,
            marginBottom: t.space.md,
          }}
        >
          {filtered.length} {filtered.length === 1 ? 'deal' : 'deals'}
          {'  -  '}
          {money(totalValue, { compact: true })} total
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <DealCard deal={item} onPress={() => router.push('/deal/' + item.id)} />
        )}
        contentContainerStyle={{
          paddingHorizontal: t.space.lg,
          paddingBottom: t.space.xxxl,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <EmptyView
            icon="pricetags-outline"
            title={activeFilter ? 'No matching deals' : 'No deals yet'}
            body={
              activeFilter
                ? 'Try a different search or stage filter.'
                : 'New deals will show up here as they land.'
            }
            actionLabel={activeFilter ? 'Clear filters' : undefined}
            onAction={
              activeFilter
                ? () => {
                    setQuery('');
                    setStage('all');
                  }
                : undefined
            }
          />
        }
      />
    </Screen>
  );
}
