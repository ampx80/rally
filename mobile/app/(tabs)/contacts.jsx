// ============================================================
// CONTACTS (tab)
// Searchable, alphabetized book of contacts. Renders entirely from
// the local-first store (works with NO network + NO auth); pull-to-
// refresh attempts a best-effort live sync but never depends on it.
// A single flattened FlatList carries sticky A-Z section letters.
// Tap a row -> /contact/[id]. Header right opens Rook.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Screen,
  Avatar,
  Pill,
  EmptyView,
  useTheme,
} from '../../src/ui';
import { useContacts, useCurrentUser, companyName } from '../../src/store';
import { get } from '../../src/api';

// Hairline between list items, inset past the avatar so it reads as
// a grouped list rather than a full-width rule.
function RowSeparator() {
  const t = useTheme();
  return (
    <View style={{ height: 1, backgroundColor: t.colors.border, marginLeft: t.space.lg + 46 + t.space.md }} />
  );
}

// One tappable person row. Reads the theme itself so it can live
// outside the parent render and stay cheap in a long list.
function ContactRow({ contact, onPress }) {
  const t = useTheme();
  const co = companyName(contact.companyId);
  const sub = [contact.title, co].filter(Boolean).join(' - ');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
          paddingVertical: t.space.md,
          paddingHorizontal: t.space.lg,
          backgroundColor: pressed ? t.colors.surfaceAlt : 'transparent',
        },
      ]}
    >
      <Avatar name={contact.name} size={46} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: t.colors.text, ...t.type.bodyStrong }}>
          {contact.name}
        </Text>
        <Text numberOfLines={1} style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}>
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
    </Pressable>
  );
}

export default function ContactsScreen() {
  const t = useTheme();
  const router = useRouter();
  const contacts = useContacts(); // sorted by name asc in the store
  const me = useCurrentUser();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all'); // all | mine
  const [refreshing, setRefreshing] = useState(false);

  // Filter by scope + free-text across name, title, email, company.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (scope === 'mine' && c.ownerId !== me?.id) return false;
      if (!q) return true;
      const co = companyName(c.companyId).toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        co.includes(q)
      );
    });
  }, [contacts, query, scope, me]);

  // Flatten into [letter header, ...people, letter header, ...] and
  // remember which indices are headers so they can stick on scroll.
  const { rows, stickyIndices } = useMemo(() => {
    const out = [];
    const sticky = [];
    let last = null;
    for (const c of filtered) {
      const letter = (c.name[0] || '#').toUpperCase();
      if (letter !== last) {
        sticky.push(out.length);
        out.push({ kind: 'header', key: `h_${letter}`, letter });
        last = letter;
      }
      out.push({ kind: 'contact', key: c.id, contact: c });
    }
    return { rows: out, stickyIndices: sticky };
  }, [filtered]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Optional live enrichment. The api client never throws and the
      // store already has everything, so this is pure upside if online.
      await get('/api/contacts');
    } catch {
      // ignore - local store is the source of truth
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderItem = useCallback(
    ({ item }) => {
      if (item.kind === 'header') {
        return (
          <View style={{ backgroundColor: t.colors.bg, paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: t.space.xs }}>
            <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>{item.letter}</Text>
          </View>
        );
      }
      return (
        <ContactRow contact={item.contact} onPress={() => router.push(`/contact/${item.contact.id}`)} />
      );
    },
    [router, t]
  );

  return (
    <Screen scroll={false} padded={false}>
      {/* Fixed header (kept out of the FlatList so the search field
          never loses focus on re-render). */}
      <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.sm, paddingBottom: t.space.md, gap: t.space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.colors.text, ...t.type.title }}>Contacts</Text>
            <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}>
              {query || scope === 'mine'
                ? `${filtered.length} of ${contacts.length}`
                : `${contacts.length} people`}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/rook')}
            hitSlop={8}
            style={({ pressed }) => [
              {
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: t.colors.accentWash,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="sparkles-outline" size={20} color={t.colors.accent} />
          </Pressable>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.space.sm,
            backgroundColor: t.colors.surface,
            borderColor: t.colors.border,
            borderWidth: 1,
            borderRadius: t.radius.md,
            paddingHorizontal: t.space.md,
          }}
        >
          <Ionicons name="search-outline" size={18} color={t.colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, company, title"
            placeholderTextColor={t.colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 12, color: t.colors.text, fontSize: 16 }}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={t.colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

        {/* Scope filter */}
        <View style={{ flexDirection: 'row', gap: t.space.sm }}>
          <Pill label="All contacts" active={scope === 'all'} onPress={() => setScope('all')} />
          <Pill label="My contacts" active={scope === 'mine'} onPress={() => setScope('mine')} />
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        stickyHeaderIndices={stickyIndices}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={rows.length ? { paddingBottom: t.space.xxxl } : { flexGrow: 1 }}
        ItemSeparatorComponent={RowSeparator}
        ListEmptyComponent={
          <EmptyView
            icon="people-outline"
            title={query ? 'No matches' : 'No contacts yet'}
            body={
              query
                ? `Nothing matches "${query.trim()}". Try a different name or company.`
                : 'Your contacts will show up here as you add people to accounts.'
            }
            actionLabel={query ? 'Clear search' : undefined}
            onAction={query ? () => setQuery('') : undefined}
          />
        }
      />
    </Screen>
  );
}
