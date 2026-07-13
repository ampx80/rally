// ============================================================
// ROOT LAYOUT
// Wraps the whole app in SafeAreaProvider + AuthProvider, applies
// the themed status bar, and gates routing: logged-out users land
// on the (auth) group; once authed OR in demo mode they get the
// full app. Detail routes (deal/contact/rook/notifications/settings)
// are declared here as pushable stack screens over the tabs.
// ============================================================
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth';
import { useTheme } from '../src/theme';
import { LoadingView } from '../src/ui';

// Routes the auth guard uses to decide where a user belongs.
function useAuthGate() {
  const { isAuthed, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthed && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isAuthed && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthed, loading, segments, router]);

  return loading;
}

function RootNavigator() {
  const t = useTheme();
  const loading = useAuthGate();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <LoadingView label="Starting Rally" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.colors.surface },
        headerTintColor: t.colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="deal/[id]" options={{ title: 'Deal' }} />
      <Stack.Screen name="contact/[id]" options={{ title: 'Contact' }} />
      <Stack.Screen
        name="rook"
        options={{ title: 'Rook', presentation: 'modal' }}
      />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
