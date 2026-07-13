// ============================================================
// RALLY MOBILE - SHARED UI KIT
// Themed primitives every screen composes from. Import what you
// need: { Screen, Card, Button, Stat, Badge, Avatar, Row, Divider,
// Pill, LoadingView, EmptyView, SectionTitle, money }.
// Every component reads tokens from useTheme() - no ad-hoc hex.
// ============================================================
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';

// ---------- money() helper ----------
// Compact currency for stat tiles ($1.2M), full for detail rows.
export function money(n, { compact = false } = {}) {
  const v = Number(n) || 0;
  if (compact) {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${Math.round(v / 1e3)}K`;
    return `$${v}`;
  }
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

// ---------- Screen: SafeArea + optional scroll + pull-to-refresh ----------
export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  padded = true,
  edges = ['top', 'left', 'right'],
  style,
  contentStyle,
}) {
  const t = useTheme();
  const pad = padded ? { padding: t.space.lg } : null;
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[{ paddingBottom: t.space.xxxl }, pad, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.accent}
            colors={[t.colors.accent]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: t.colors.bg }, style]}
    >
      {body}
    </SafeAreaView>
  );
}

// ---------- Card ----------
export function Card({ children, onPress, style, padded = true }) {
  const t = useTheme();
  const base = [
    {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
      padding: padded ? t.space.lg : 0,
    },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

// ---------- Button ----------
export function Button({
  title,
  onPress,
  variant = 'primary', // primary | secondary | ghost | danger
  icon,
  disabled = false,
  loading = false,
  full = false,
  style,
}) {
  const t = useTheme();
  const palette = {
    primary: { bg: t.colors.accent, fg: t.colors.onAccent, border: t.colors.accent },
    secondary: { bg: t.colors.surface, fg: t.colors.text, border: t.colors.borderStrong },
    ghost: { bg: 'transparent', fg: t.colors.accent, border: 'transparent' },
    danger: { bg: t.colors.badWash, fg: t.colors.bad, border: t.colors.badWash },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space.sm,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: t.radius.md,
          paddingVertical: 14,
          paddingHorizontal: t.space.lg,
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, ...t.type.bodyStrong }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------- Stat tile ----------
export function Stat({ label, value, delta, tone = 'accent', onPress, style }) {
  const t = useTheme();
  const toneColor =
    tone === 'good' ? t.colors.good : tone === 'bad' ? t.colors.bad : t.colors.accent;
  return (
    <Card onPress={onPress} style={[{ flex: 1, minWidth: 140 }, style]}>
      <Text style={{ color: t.colors.textMuted, ...t.type.micro, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: t.colors.text, ...t.type.stat, marginTop: t.space.xs }}>
        {value}
      </Text>
      {delta != null ? (
        <Text style={{ color: toneColor, ...t.type.small, marginTop: t.space.xs }}>
          {delta}
        </Text>
      ) : null}
    </Card>
  );
}

// ---------- Badge ----------
export function Badge({ label, tone = 'neutral', style }) {
  const t = useTheme();
  const map = {
    neutral: { bg: t.colors.surfaceAlt, fg: t.colors.textMuted },
    accent: { bg: t.colors.accentWash, fg: t.colors.accent },
    good: { bg: t.colors.goodWash, fg: t.colors.good },
    warn: { bg: t.colors.warnWash, fg: t.colors.warn },
    bad: { bg: t.colors.badWash, fg: t.colors.bad },
    info: { bg: t.colors.infoWash, fg: t.colors.info },
  };
  const c = map[tone] || map.neutral;
  return (
    <View
      style={[
        {
          backgroundColor: c.bg,
          borderRadius: t.radius.sm,
          paddingHorizontal: t.space.sm,
          paddingVertical: 3,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: c.fg, ...t.type.micro }}>{label}</Text>
    </View>
  );
}

// ---------- Pill (tappable filter chip) ----------
export function Pill({ label, active = false, onPress, style }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: active ? t.colors.accent : t.colors.surface,
          borderColor: active ? t.colors.accent : t.colors.border,
          borderWidth: 1,
          borderRadius: t.radius.pill,
          paddingHorizontal: t.space.lg,
          paddingVertical: t.space.sm,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: active ? t.colors.onAccent : t.colors.textMuted,
          ...t.type.small,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- Avatar (initials) ----------
export function Avatar({ name = '?', size = 40, uri, style }) {
  const t = useTheme();
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  // Deterministic hue from the name so avatars are stable + distinct.
  const hue = Array.from(String(name)).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `hsl(${hue}, 45%, ${t.scheme === 'dark' ? 28 : 82}%)`,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: t.scheme === 'dark' ? '#fff' : '#1c1f27',
          fontSize: size * 0.4,
          fontWeight: '700',
        }}
      >
        {initials || '?'}
      </Text>
    </View>
  );
}

// ---------- Row (horizontal flex helper) ----------
export function Row({ children, gap, align = 'center', justify, wrap = false, style }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: gap == null ? t.space.md : gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------- Divider ----------
export function Divider({ style }) {
  const t = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border, marginVertical: t.space.md },
        style,
      ]}
    />
  );
}

// ---------- SectionTitle ----------
export function SectionTitle({ children, action, onAction, style }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: t.space.md,
          marginTop: t.space.sm,
        },
        style,
      ]}
    >
      <Text style={{ color: t.colors.text, ...t.type.h2 }}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: t.colors.accent, ...t.type.label }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- LoadingView ----------
export function LoadingView({ label = 'Loading' }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: t.space.xxl }}>
      <ActivityIndicator size="large" color={t.colors.accent} />
      <Text style={{ color: t.colors.textMuted, ...t.type.body, marginTop: t.space.md }}>
        {label}
      </Text>
    </View>
  );
}

// ---------- EmptyView ----------
export function EmptyView({
  icon = 'file-tray-outline',
  title = 'Nothing here yet',
  body,
  actionLabel,
  onAction,
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: t.space.xxl, gap: t.space.md }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: t.colors.accentWash,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={34} color={t.colors.accent} />
      </View>
      <Text style={{ color: t.colors.text, ...t.type.h3, textAlign: 'center' }}>{title}</Text>
      {body ? (
        <Text
          style={{ color: t.colors.textMuted, ...t.type.body, textAlign: 'center', maxWidth: 300 }}
        >
          {body}
        </Text>
      ) : null}
      {actionLabel ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

// Re-export the theme hook so screens can import UI + theme from one place.
export { useTheme };
