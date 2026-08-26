import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { HeaderLogo } from '../components/widgets/header_logo';
import { useOnlineSync } from '../hooks/use_online_sync';
import { PAGE_COLOR } from '../lib/theme';

export default function RootLayout() {
  useOnlineSync();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="dark" />
        {/* The wordmark stands in for the title text on every screen that has a
            header; each screen's `title` stays for accessibility and the iOS
            back label. */}
        <Stack
          screenOptions={{
            contentStyle: styles.screen,
            headerTitle: () => <HeaderLogo />,
          }}>
          {/* Login draws its own full-bleed layout, so it opts out of the header. */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ title: 'My notes' }} />
          <Stack.Screen name="note" options={{ title: 'New note' }} />
          <Stack.Screen
            name="profile"
            options={{ title: 'My Profile', headerTitle: () => <HeaderLogo tight /> }}
          />
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
