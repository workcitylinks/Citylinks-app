import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import './global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';



export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="auth" options={{ title: 'Authentication' }} />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
