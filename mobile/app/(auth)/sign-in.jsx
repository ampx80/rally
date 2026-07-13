// ============================================================
// SIGN-IN (fully built)
// Branded entry screen. Real sign-in is env-gated (EXPO_PUBLIC_AUTH_LIVE);
// when off, it resolves to demo mode. The "Continue in demo mode" button
// always works with no network + no account, satisfying local-first.
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/ui';
import { useAuth } from '../../src/auth';

export default function SignIn() {
  const t = useTheme();
  const router = useRouter();
  const { signIn, enterDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const goHome = () => router.replace('/(tabs)');

  const onSignIn = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await signIn(email.trim(), password);
      if (r.ok) goHome();
      else setError(r.error || 'Could not sign in.');
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  const onDemo = async () => {
    setBusy(true);
    try {
      await enterDemo();
      goHome();
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: 14,
    color: t.colors.text,
    fontSize: 17,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, justifyContent: 'center', padding: t.space.xl, gap: t.space.lg }}>
          {/* Brand mark */}
          <View style={{ alignItems: 'center', marginBottom: t.space.lg, gap: t.space.md }}>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                backgroundColor: t.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="flash" size={36} color={t.colors.onAccent} />
            </View>
            <Text style={{ color: t.colors.text, ...t.type.display }}>Rally</Text>
            <Text style={{ color: t.colors.textMuted, ...t.type.body, textAlign: 'center' }}>
              The revenue platform that moves deals forward.
            </Text>
          </View>

          <View style={{ gap: t.space.md }}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Work email"
              placeholderTextColor={t.colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              style={inputStyle}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={t.colors.textFaint}
              secureTextEntry
              style={inputStyle}
            />
          </View>

          {error ? (
            <Text style={{ color: t.colors.bad, ...t.type.small }}>{error}</Text>
          ) : null}

          <Button title="Sign in" onPress={onSignIn} loading={busy} full />

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md, marginVertical: t.space.xs }}>
            <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
            <Text style={{ color: t.colors.textFaint, ...t.type.micro }}>OR</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
          </View>

          <Button
            title="Continue in demo mode"
            onPress={onDemo}
            variant="secondary"
            icon="play-circle-outline"
            disabled={busy}
            full
          />
          <Text style={{ color: t.colors.textFaint, ...t.type.small, textAlign: 'center' }}>
            Demo mode loads a full book of business offline. No account needed.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
