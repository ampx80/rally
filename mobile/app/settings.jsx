// ============================================================
// SETTINGS (stack route, header title "Settings")
// Because the stack owns the header we skip a duplicate H1 and use
// edges without 'top'. Sections:
//   - Profile (identity from auth + store)
//   - Appearance: System / Light / Dark. Applied app-wide via
//     Appearance.setColorScheme(), which the shared useTheme() reads,
//     so the whole app re-themes live. Choice persists to AsyncStorage
//     and re-applies whenever Settings mounts (no foundation edit).
//   - Notifications: per-category switches, persisted locally.
//   - Connection: API base + demo/live mode + a manual ping.
//   - Data: reset the seeded demo store.
//   - About: app name + version + website.
//   - Sign out (confirm; the root auth gate redirects out).
// Everything works offline; no call can crash the screen.
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Switch, Alert, Linking, Appearance } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Screen,
  Card,
  Button,
  Badge,
  Avatar,
  Row,
  Divider,
  SectionTitle,
  useTheme,
} from '../src/ui';
import { useAuth } from '../src/auth';
import { useCurrentUser, resetStore } from '../src/store';
import { API_BASE, ping } from '../src/api';

const THEME_KEY = 'rally_theme_pref';
const NOTIF_KEY = 'rally_notif_prefs_v1';

const THEME_OPTIONS = [
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
];

const NOTIF_ITEMS = [
  { id: 'dealUpdates', label: 'Deal updates', sub: 'Stage changes and closed-won alerts', icon: 'trending-up-outline' },
  { id: 'taskReminders', label: 'Task reminders', sub: 'Due and overdue activities', icon: 'alarm-outline' },
  { id: 'mentions', label: 'Mentions', sub: 'When a teammate @mentions you', icon: 'at-outline' },
  { id: 'productNews', label: 'Product news', sub: 'New features and tips', icon: 'megaphone-outline' },
];
const DEFAULT_NOTIF = { dealUpdates: true, taskReminders: true, mentions: true, productNews: false };

export default function Settings() {
  const t = useTheme();
  const { user, isDemo, authLive, signOut } = useAuth();
  const me = useCurrentUser();

  const [themePref, setThemePref] = useState('system');
  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [conn, setConn] = useState('idle'); // idle | checking | online | offline

  const applyScheme = (p) => {
    try {
      Appearance.setColorScheme(p === 'system' ? null : p);
    } catch {
      // older runtimes may not support the override; system theme still applies
    }
  };

  // Restore + re-apply saved preferences on mount.
  useEffect(() => {
    (async () => {
      try {
        const tp = await AsyncStorage.getItem(THEME_KEY);
        if (tp) {
          setThemePref(tp);
          applyScheme(tp);
        }
        const np = await AsyncStorage.getItem(NOTIF_KEY);
        if (np) setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(np) });
      } catch {
        // keep defaults
      }
    })();
  }, []);

  const chooseTheme = (p) => {
    setThemePref(p);
    applyScheme(p);
    AsyncStorage.setItem(THEME_KEY, p).catch(() => {});
  };

  const toggleNotif = (id) => {
    setNotif((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const checkConnection = useCallback(async () => {
    setConn('checking');
    try {
      setConn((await ping()) ? 'online' : 'offline');
    } catch {
      setConn('offline');
    }
  }, []);

  const confirmReset = () => {
    Alert.alert(
      'Reset demo data',
      'This restores the seeded book of business to its original state. Local changes will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetStore();
            Alert.alert('Demo data reset', 'The workspace has been restored.');
          },
        },
      ]
    );
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You can jump back into demo mode anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const version = Constants?.expoConfig?.version || '1.0.0';
  const appName = Constants?.expoConfig?.name || 'Rally';
  const name = me?.name || user?.name || 'You';
  const title = me?.title || user?.title || 'Rally user';
  const email = user?.email || me?.email || '';
  const demoish = isDemo || !authLive;

  const connText = {
    idle: 'Not checked',
    checking: 'Checking...',
    online: 'Connected',
    offline: 'Offline (using cache)',
  }[conn];
  const connColor =
    conn === 'online' ? t.colors.good : conn === 'offline' ? t.colors.bad : t.colors.textMuted;

  return (
    <Screen edges={['left', 'right']}>
      {/* Profile */}
      <SectionTitle>Profile</SectionTitle>
      <Card>
        <Row>
          <Avatar name={name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.colors.text, ...t.type.h3 }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }} numberOfLines={1}>
              {title}
            </Text>
            {email ? (
              <Text
                style={{ color: t.colors.textFaint, ...t.type.small, marginTop: 2 }}
                numberOfLines={1}
              >
                {email}
              </Text>
            ) : null}
          </View>
          <Badge label={demoish ? 'Demo' : 'Live'} tone={demoish ? 'accent' : 'good'} />
        </Row>
      </Card>

      {/* Appearance */}
      <SectionTitle style={{ marginTop: t.space.xl }}>Appearance</SectionTitle>
      <Card>
        <Text style={{ color: t.colors.textMuted, ...t.type.small, marginBottom: t.space.md }}>
          Theme
        </Text>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: t.colors.surfaceAlt,
            borderRadius: t.radius.md,
            padding: 4,
            gap: 4,
          }}
        >
          {THEME_OPTIONS.map((opt) => {
            const active = themePref === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => chooseTheme(opt.id)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: t.radius.sm,
                  backgroundColor: active ? t.colors.surface : 'transparent',
                  borderWidth: 1,
                  borderColor: active ? t.colors.border : 'transparent',
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={active ? t.colors.accent : t.colors.textMuted}
                />
                <Text style={{ color: active ? t.colors.text : t.colors.textMuted, ...t.type.small }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: t.colors.textFaint, ...t.type.small, marginTop: t.space.md }}>
          {themePref === 'system'
            ? 'Following your device appearance.'
            : `Always ${themePref}. Overrides the device setting.`}
        </Text>
      </Card>

      {/* Notifications */}
      <SectionTitle style={{ marginTop: t.space.xl }}>Notifications</SectionTitle>
      <Card padded={false} style={{ paddingHorizontal: t.space.lg }}>
        {NOTIF_ITEMS.map((item, i) => (
          <View key={item.id}>
            <Row style={{ paddingVertical: t.space.md }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: t.colors.accentWash,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={item.icon} size={18} color={t.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>{item.label}</Text>
                <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}>
                  {item.sub}
                </Text>
              </View>
              <Switch
                value={!!notif[item.id]}
                onValueChange={() => toggleNotif(item.id)}
                trackColor={{ true: t.colors.accent, false: t.colors.borderStrong }}
                thumbColor={t.colors.onAccent}
                ios_backgroundColor={t.colors.borderStrong}
              />
            </Row>
            {i < NOTIF_ITEMS.length - 1 ? <Divider style={{ marginVertical: 0 }} /> : null}
          </View>
        ))}
      </Card>

      {/* Connection */}
      <SectionTitle style={{ marginTop: t.space.xl }}>Connection</SectionTitle>
      <Card>
        <Row justify="space-between">
          <Text style={{ color: t.colors.textMuted, ...t.type.small }}>Mode</Text>
          <Badge
            label={authLive ? 'Live auth' : 'Demo / local-first'}
            tone={authLive ? 'good' : 'accent'}
          />
        </Row>
        <Divider />
        <Row justify="space-between" align="flex-start">
          <Text style={{ color: t.colors.textMuted, ...t.type.small }}>API base</Text>
          <Text
            style={{
              color: t.colors.text,
              ...t.type.small,
              flex: 1,
              textAlign: 'right',
              marginLeft: t.space.lg,
            }}
            numberOfLines={1}
          >
            {API_BASE.replace('https://', '')}
          </Text>
        </Row>
        <Divider />
        <Row justify="space-between">
          <Text style={{ color: t.colors.textMuted, ...t.type.small }}>Status</Text>
          <Text style={{ ...t.type.small, color: connColor }}>{connText}</Text>
        </Row>
        <Button
          title={conn === 'checking' ? 'Checking...' : 'Check connection'}
          variant="secondary"
          icon="pulse-outline"
          loading={conn === 'checking'}
          onPress={checkConnection}
          style={{ marginTop: t.space.md }}
          full
        />
        <Text style={{ color: t.colors.textFaint, ...t.type.small, marginTop: t.space.md }}>
          Rally is local-first. Every screen works offline from seeded data; live sync is optional
          enrichment.
        </Text>
      </Card>

      {/* Data */}
      <SectionTitle style={{ marginTop: t.space.xl }}>Data</SectionTitle>
      <Card>
        <Row justify="space-between">
          <View style={{ flex: 1, marginRight: t.space.md }}>
            <Text style={{ color: t.colors.text, ...t.type.bodyStrong }}>Reset demo data</Text>
            <Text style={{ color: t.colors.textMuted, ...t.type.small, marginTop: 2 }}>
              Restore the seeded workspace to its original state.
            </Text>
          </View>
          <Button title="Reset" variant="secondary" icon="refresh-outline" onPress={confirmReset} />
        </Row>
      </Card>

      {/* About */}
      <SectionTitle style={{ marginTop: t.space.xl }}>About</SectionTitle>
      <Card>
        <Row justify="space-between">
          <Text style={{ color: t.colors.textMuted, ...t.type.small }}>Version</Text>
          <Text style={{ color: t.colors.text, ...t.type.small }}>
            {appName} {version}
          </Text>
        </Row>
        <Divider />
        <Pressable
          onPress={() => Linking.openURL('https://rally-psi-five.vercel.app').catch(() => {})}
        >
          <Row justify="space-between">
            <Text style={{ color: t.colors.textMuted, ...t.type.small }}>Website</Text>
            <Row gap={6}>
              <Text style={{ color: t.colors.accent, ...t.type.small }}>rally-psi-five.vercel.app</Text>
              <Ionicons name="open-outline" size={15} color={t.colors.accent} />
            </Row>
          </Row>
        </Pressable>
        <Divider />
        <Text style={{ color: t.colors.textFaint, ...t.type.small }}>
          Rally is the AI-native revenue platform. Built to move deals forward.
        </Text>
      </Card>

      {/* Sign out */}
      <View style={{ marginTop: t.space.xl }}>
        <Button title="Sign out" variant="danger" icon="log-out-outline" full onPress={confirmSignOut} />
      </View>
    </Screen>
  );
}
