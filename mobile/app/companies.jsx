// ============================================================
// COMPANIES (pushed route, reached from More)
// The book of accounts: every company with initials mark, industry,
// deal count, contact count, and open pipeline. Search + health
// filters up top, a summary stat strip, and a tap-to-open detail
// sheet that lists the company's deals and contacts with deep links
// into /deal/[id] and /contact/[id]. Renders entirely from the local
// store; the API is only pinged (optionally) on pull-to-refresh.
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
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import {
  Screen,
  Card,
  Stat,
  Badge,
  Avatar,
  Row,
  Divider,
  Pill,
  EmptyView,
  money,
  useTheme,
} from '../src/ui';
import { useCompanies, useDeals, useContacts, getUser, stageById } from '../src/store';
import { ping } from '../src/api';

const HEALTH = {
  green: { tone: 'good', label: 'Healthy' },
  yellow: { tone: 'warn', label: 'Watch' },
  red: { tone: 'bad', label: 'At risk' },
};
function healthMeta(h) {
  return HEALTH[h] || { tone: 'neutral', label: 'Unknown' };
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'green', label: 'Healthy' },
  { key: 'yellow', label: 'Watch' },
  { key: 'red', label: 'At risk' },
];

/* ============================================================
   DETAIL SHEET - company profile + its deals + its contacts
   ============================================================ */
function CompanyDetail({ company, deals, contacts, onClose, onOpenDeal, onOpenContact }) {
  const t = useTheme();
  if (!company) return null;

  const owner = getUser(company.ownerId);
  const h = healthMeta(company.health);
  const openValue = deals
    .filter((d) => d.status === 'open')
    .reduce((n, d) => n + d.value, 0);

  const infoRow = (icon, label, value) =>
    value ? (
      <Row gap={t.space.md} align="flex-start" style={{ paddingVertical: t.space.xs }}>
        <Ionicons name={icon} size={18} color={t.colors.textFaint} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: t.colors.textFaint, ...t.type.micro, textTransform: 'uppercase' }}>
            {label}
          </Text>
          <Text style={{ color: t.colors.text, ...t.type.body }}>{value}</Text>
        </View>
      </Row>
    ) : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: t.colors.surface,
            borderTopLeftRadius: t.radius.xl,
            borderTopRightRadius: t.radius.xl,
            maxHeight: '86%',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: t.colors.border,
          }}
        >
          {/* grabber + close */}
          <View style={{ paddingHorizontal: t.space.xl, paddingTop: t.space.md }}>
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: t.colors.borderStrong,
                marginBottom: t.space.md,
              }}
            />
            <Row justify="space-between" align="flex-start" gap={t.space.md}>
              <Row gap={t.space.md} align="center" style={{ flex: 1, minWidth: 0 }}>
                <Avatar name={company.name} size={52} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.colors.text, ...t.type.h2 }} numberOfLines={2}>
                    {company.name}
                  </Text>
                  <Text style={{ color: t.colors.textMuted, ...t.type.small }} numberOfLines={1}>
                    {company.domain}
                  </Text>
                </View>
              </Row>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={26} color={t.colors.textMuted} />
              </Pressable>
            </Row>
            <Row style={{ marginTop: t.space.md }} gap={t.space.sm} wrap>
              <Badge label={h.label} tone={h.tone} />
              <Badge label={company.industry} tone="neutral" />
              {company.flagship ? <Badge label="Flagship" tone="accent" /> : null}
            </Row>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: t.space.xl, paddingTop: t.space.lg, gap: t.space.sm }}
            showsVerticalScrollIndicator={false}
          >
            <Row gap={t.space.md}>
              <Stat label="Open pipeline" value={money(openValue, { compact: true })} />
              <Stat label="Deals" value={String(deals.length)} tone="good" />
            </Row>

            <View style={{ marginTop: t.space.sm }}>
              {infoRow('business-outline', 'Industry', company.industry)}
              {infoRow('people-outline', 'Company size', company.size ? `${company.size} employees` : null)}
              {infoRow('location-outline', 'Location', company.location)}
              {infoRow('person-circle-outline', 'Account owner', owner?.name)}
            </View>

            {/* deals */}
            <Divider />
            <Text style={{ color: t.colors.text, ...t.type.h3, marginBottom: t.space.sm }}>
              Deals ({deals.length})
            </Text>
            {deals.length === 0 ? (
              <Text style={{ color: t.colors.textMuted, ...t.type.small }}>No deals yet.</Text>
            ) : (
              deals.map((d) => {
                const st = stageById(d.stage);
                const tone =
                  d.status === 'won' ? 'good' : d.status === 'lost' ? 'bad' : 'accent';
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => onOpenDeal(d.id)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: t.space.md,
                      paddingVertical: t.space.md,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.colors.text, ...t.type.bodyStrong }} numberOfLines={1}>
                        {d.name}
                      </Text>
                      <Row style={{ marginTop: 4 }} gap={t.space.sm}>
                        <Badge label={st?.name || d.stage} tone={tone} />
                        <Text style={{ color: t.colors.textMuted, ...t.type.small }}>
                          {money(d.value, { compact: true })}
                        </Text>
                      </Row>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={t.colors.textFaint} />
                  </Pressable>
                );
              })
            )}

            {/* contacts */}
            <Divider />
            <Text style={{ color: t.colors.text, ...t.type.h3, marginBottom: t.space.sm }}>
              Contacts ({contacts.length})
            </Text>
            {contacts.length === 0 ? (
              <Text style={{ color: t.colors.textMuted, ...t.type.small }}>No contacts yet.</Text>
            ) : (
              contacts.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onOpenContact(c.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.space.md,
                    paddingVertical: t.space.sm,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Avatar name={c.name} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.colors.text, ...t.type.bodyStrong }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={{ color: t.colors.textMuted, ...t.type.small }} numberOfLines={1}>
                      {c.title}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={t.colors.textFaint} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================
   COMPANIES SCREEN
   ============================================================ */
export default function Companies() {
  const t = useTheme();
  const router = useRouter();

  const companies = useCompanies();
  const deals = useDeals();
  const contacts = useContacts();

  const [query, setQuery] = useState('');
  const [health, setHealth] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState(null);

  // Roll deals + contacts up per company once.
  const stats = useMemo(() => {
    const m = {};
    for (const c of companies) {
      m[c.id] = { deals: 0, open: 0, openValue: 0, wonValue: 0, contacts: 0 };
    }
    for (const d of deals) {
      const s = m[d.companyId];
      if (!s) continue;
      s.deals += 1;
      if (d.status === 'open') {
        s.open += 1;
        s.openValue += d.value;
      } else if (d.status === 'won') {
        s.wonValue += d.value;
      }
    }
    for (const ct of contacts) {
      const s = m[ct.companyId];
      if (s) s.contacts += 1;
    }
    return m;
  }, [companies, deals, contacts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = companies.filter((c) => {
      if (health !== 'all' && c.health !== health) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.industry || '').toLowerCase().includes(q) ||
        (c.location || '').toLowerCase().includes(q)
      );
    });
    // Flagship first, then by open pipeline value.
    return list.sort((a, b) => {
      if (a.flagship && !b.flagship) return -1;
      if (b.flagship && !a.flagship) return 1;
      return (stats[b.id]?.openValue || 0) - (stats[a.id]?.openValue || 0);
    });
  }, [companies, query, health, stats]);

  const summary = useMemo(() => {
    const totalPipeline = companies.reduce((n, c) => n + (stats[c.id]?.openValue || 0), 0);
    const atRisk = companies.filter((c) => c.health === 'red' || c.health === 'yellow').length;
    return { count: companies.length, totalPipeline, atRisk };
  }, [companies, stats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await ping();
    } catch {
      // local-first: nothing to do, the store already has everything
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openCompany = openId ? companies.find((c) => c.id === openId) : null;
  const openDeals = useMemo(
    () => (openId ? deals.filter((d) => d.companyId === openId) : []),
    [openId, deals]
  );
  const openContacts = useMemo(
    () => (openId ? contacts.filter((c) => c.companyId === openId) : []),
    [openId, contacts]
  );

  const renderItem = ({ item }) => {
    const s = stats[item.id] || { deals: 0, contacts: 0, openValue: 0 };
    const h = healthMeta(item.health);
    return (
      <Card onPress={() => setOpenId(item.id)} style={{ marginBottom: t.space.md }}>
        <Row gap={t.space.md} align="flex-start">
          <Avatar name={item.name} size={48} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Row justify="space-between" gap={t.space.sm} align="flex-start">
              <Text
                style={{ color: t.colors.text, ...t.type.h3, flexShrink: 1 }}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Badge label={h.label} tone={h.tone} />
            </Row>
            <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }} numberOfLines={1}>
              {item.industry}
              {item.location ? `  -  ${item.location}` : ''}
            </Text>
            <Row style={{ marginTop: t.space.md }} gap={t.space.lg} wrap>
              <View>
                <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>
                  {money(s.openValue, { compact: true })}
                </Text>
                <Text style={{ color: t.colors.textFaint, ...t.type.micro, textTransform: 'uppercase' }}>
                  Pipeline
                </Text>
              </View>
              <View>
                <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>{s.deals}</Text>
                <Text style={{ color: t.colors.textFaint, ...t.type.micro, textTransform: 'uppercase' }}>
                  Deals
                </Text>
              </View>
              <View>
                <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>{s.contacts}</Text>
                <Text style={{ color: t.colors.textFaint, ...t.type.micro, textTransform: 'uppercase' }}>
                  Contacts
                </Text>
              </View>
            </Row>
          </View>
        </Row>
      </Card>
    );
  };

  const ListHeader = (
    <View>
      {/* summary strip */}
      <Row gap={t.space.md} style={{ marginBottom: t.space.md }}>
        <Stat label="Companies" value={String(summary.count)} />
        <Stat label="Pipeline" value={money(summary.totalPipeline, { compact: true })} tone="good" />
        <Stat label="Need attention" value={String(summary.atRisk)} tone="bad" />
      </Row>

      {/* search */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.sm,
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.md,
          paddingHorizontal: t.space.lg,
          marginBottom: t.space.md,
        }}
      >
        <Ionicons name="search-outline" size={20} color={t.colors.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search companies, industry, city"
          placeholderTextColor={t.colors.textFaint}
          autoCapitalize="none"
          style={{ flex: 1, paddingVertical: 12, color: t.colors.text, fontSize: 17 }}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={t.colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {/* health filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.space.sm, paddingBottom: t.space.md }}
      >
        {FILTERS.map((f) => (
          <Pill
            key={f.key}
            label={f.label}
            active={health === f.key}
            onPress={() => setHealth(f.key)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Companies' }} />
      <Screen scroll={false} padded={false} edges={['left', 'right', 'bottom']}>
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{
            paddingHorizontal: t.space.lg,
            paddingTop: t.space.lg,
            paddingBottom: t.space.xxxl,
          }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={{ paddingTop: t.space.xxl }}>
              <EmptyView
                icon="business-outline"
                title="No companies match"
                body="Try a different search or clear the health filter to see every account."
                actionLabel="Clear filters"
                onAction={() => {
                  setQuery('');
                  setHealth('all');
                }}
              />
            </View>
          }
        />
      </Screen>
      <CompanyDetail
        company={openCompany}
        deals={openDeals}
        contacts={openContacts}
        onClose={() => setOpenId(null)}
        onOpenDeal={(id) => {
          setOpenId(null);
          router.push(`/deal/${id}`);
        }}
        onOpenContact={(id) => {
          setOpenId(null);
          router.push(`/contact/${id}`);
        }}
      />
    </>
  );
}
