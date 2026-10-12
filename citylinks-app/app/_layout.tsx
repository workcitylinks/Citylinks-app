import { Stack } from 'expo-router';
import { StatusBar, Platform, View, StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import './global.css';

// Disable Reanimated strict-mode warning when reading shared values during component render
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../context/ToastContext';
import { AppProvider, useApp } from '../context/AppContext';
import { NetworkProvider } from '../context/NetworkContext';
import SplashScreenView from '../components/SplashScreenView';
import NoInternetModal from '../components/NoInternetModal';

function RootContent() {
  const { isAppReady } = useApp();

  useEffect(() => {
    StatusBar.setBarStyle('dark-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#ffffff', true);
      StatusBar.setTranslucent(true);
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#ffffff" 
        translucent={true} 
      />
      {/* Always mount Stack navigator so Expo Router's NavigationContainer is constantly active */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="auth" options={{ title: 'Authentication' }} />
        <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
        <Stack.Screen name="verify-otp" options={{ title: 'Verify OTP' }} />
        <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
        <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
        <Stack.Screen name="complete-profile" options={{ title: 'Complete Profile' }} />
        <Stack.Screen name="orders" options={{ title: 'My Orders' }} />
        <Stack.Screen name="shops" options={{ title: 'Near by Shops' }} />
        <Stack.Screen name="shop-detail" options={{ title: 'Shop Profile' }} />
        <Stack.Screen name="product-detail" options={{ title: 'Product Details' }} />
        <Stack.Screen name="services" options={{ title: 'Book Service' }} />
        <Stack.Screen name="digital-services" options={{ title: 'Digital Services' }} />
        <Stack.Screen name="book-transport" options={{ title: 'Book Transport' }} />
        <Stack.Screen name="deals" options={{ title: 'Deals & Offers' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="cart" options={{ title: 'My Cart' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Partner Dashboard' }} />
        <Stack.Screen name="join-us" options={{ title: 'Join CityLinks' }} />
        <Stack.Screen name="admin-approvals" options={{ title: 'Approve Joiners' }} />
        <Stack.Screen name="admin-analytics" options={{ title: 'GUI Analyser' }} />
        <Stack.Screen name="admin-notification" options={{ title: 'Broadcast Notification' }} />
        <Stack.Screen name="admin-sponsored" options={{ title: 'Sponsored Listings' }} />
        <Stack.Screen name="merchant-dashboard" options={{ title: 'Shop Keeper Console' }} />
        <Stack.Screen name="received-orders" options={{ title: 'Received Orders' }} />
      </Stack>

      {/* Custom splash screen overlay displayed smoothly during app initialization */}
      {!isAppReady && (
        <View style={StyleSheet.absoluteFill} pointerEvents="auto">
          <SplashScreenView />
        </View>
      )}

      {/* Global No Internet Screen - automatically appears when offline, disappears when connected */}
      <NoInternetModal />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <NetworkProvider>
        <ToastProvider>
          <AppProvider>
            <RootContent />
          </AppProvider>
        </ToastProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
