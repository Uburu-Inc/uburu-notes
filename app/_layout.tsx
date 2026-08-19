import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { PAGE_COLOR } from '../lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ contentStyle: styles.screen }}>
          {/* Login draws its own full-bleed layout, so it opts out of the header. */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="note" options={{ title: 'New note' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    backgroundColor: PAGE_COLOR,
  },
});
