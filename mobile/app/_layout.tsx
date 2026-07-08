import { StatusBar } from 'expo-status-bar';
import { Redirect, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';

import { ThemeSettingsProvider, useTheme } from '../constants/theme';
import { DeviceCapabilities } from '../components/DeviceCapabilities';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { OnsenDataProvider } from '../context/OnsenDataContext';

function Navigation() {
  const { colors, scheme } = useTheme();
  const { loading, session, isMock } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const requiresLogin = !isMock && !session;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onsen/[id]"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
      {requiresLogin ? <Redirect href="/login" /> : null}
      <DeviceCapabilities />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeSettingsProvider>
          <AuthProvider>
            <OnsenDataProvider>
              <FavoritesProvider>
                <Navigation />
              </FavoritesProvider>
            </OnsenDataProvider>
          </AuthProvider>
        </ThemeSettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
