/**
 * The app shell — `app.native`'s root `<column background="background">`:
 * five screens gated by the core's tab flags, plus the bottom tab bar.
 *
 * Two things exist here that the Zero Native tree has no need for, both
 * consequences of the catalog living in Cloudflare D1 rather than in
 * rodata: a splash while the first fetch resolves, and an offline notice
 * when it fails and the bundled catalog stands in.
 */
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePulseStore } from './api/store';
import { isCalendar, isDetail, isDiscover, isMap, isYou, showTabbar } from './core/selectors';
import { Calendar } from './screens/Calendar';
import { Detail } from './screens/Detail';
import { Discover } from './screens/Discover';
import { MapScreen } from './screens/MapScreen';
import { TabBar } from './screens/TabBar';
import { You } from './screens/You';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { Txt } from './ui/primitives';

function OfflineNotice({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel={`Offline: ${error}. Tap to retry.`}
      style={{
        backgroundColor: colors.surface_subtle,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Txt size="sm" color="text_muted" grow={1}>
        Offline — showing the bundled catalog
      </Txt>
      <Txt size="sm" color="accent">
        Retry
      </Txt>
    </Pressable>
  );
}

function Shell() {
  const { model, dispatch, reload } = usePulseStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const booting = model.sync.status === 'loading' && model.catalog.events.length === 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {model.sync.status === 'offline' && model.sync.error ? (
        <OfflineNotice error={model.sync.error} onRetry={reload} />
      ) : null}

      {booting ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator color={colors.accent} />
          <Txt size="sm" color="text_muted">
            Loading events…
          </Txt>
        </View>
      ) : (
        <>
          {isDiscover(model) ? <Discover model={model} dispatch={dispatch} /> : null}
          {isMap(model) ? <MapScreen model={model} dispatch={dispatch} /> : null}
          {isCalendar(model) ? <Calendar model={model} dispatch={dispatch} /> : null}
          {isYou(model) ? <You model={model} /> : null}
          {isDetail(model) ? <Detail model={model} dispatch={dispatch} /> : null}
          {showTabbar(model) ? <TabBar model={model} dispatch={dispatch} /> : null}
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="auto" />
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
