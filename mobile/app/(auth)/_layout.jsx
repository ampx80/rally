// Auth group navigator. Headerless stack - the only screen is sign-in,
// which renders its own branded layout.
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
