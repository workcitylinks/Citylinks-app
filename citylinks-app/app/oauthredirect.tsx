import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { ShieldCheck } from 'lucide-react-native';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';
import { tryAutoDetectAndSaveAddress } from '../services/googleAuth';
import { getParticularLoggedPage } from '../utils/authRedirect';
import { useApp } from '../context/AppContext';

export default function OAuthRedirectScreen() {
  const router = useRouter();
  const { refreshAuth } = useApp();
  const params = useLocalSearchParams();
  const hasHandled = useRef(false);

  useEffect(() => {
    // Dismiss any active WebBrowser auth modal
    try {
      WebBrowser.dismissAuthSession();
    } catch {}

    if (hasHandled.current) return;
    hasHandled.current = true;

    async function processAuthRedirect() {
      try {
        const error = params.error as string | undefined;
        if (error) {
          console.warn('[OAuthRedirect] OAuth error param:', error);
          router.replace('/auth');
          return;
        }

        const token = params.token as string | undefined;
        const userRaw = params.user as string | undefined;
        const isProfileComplete = params.isProfileComplete === 'true';
        const redirect = params.redirect as string | undefined;

        if (token && userRaw) {
          let user: any;
          try {
            user = typeof userRaw === 'string' ? JSON.parse(decodeURIComponent(userRaw)) : userRaw;
          } catch {
            user = userRaw;
          }

          // Persist credentials
          await AsyncStorage.setItem('user_token', token);
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
          await refreshAuth();

          // Background tasks
          registerForPushNotificationsAsync().catch(() => {});
          if (!user.address) {
            tryAutoDetectAndSaveAddress(token).catch(() => {});
          }

          // Decide target route
          const isCustomerWithoutPhone =
            !isProfileComplete &&
            (!user.phone || !user.phone.trim()) &&
            user.role === 'CUSTOMER';

          if (isCustomerWithoutPhone) {
            router.replace({
              pathname: '/complete-profile',
              params: {
                email: user.email || '',
                fullName: user.fullName || '',
                redirect: redirect || '',
              },
            });
            return;
          }

          const targetRoute = getParticularLoggedPage(user, redirect);
          router.replace(targetRoute as any);
          return;
        }

        // If no token in params, check if user is already logged in
        const existingToken = await AsyncStorage.getItem('user_token');
        const existingUserStr = await AsyncStorage.getItem('user_data');
        if (existingToken && existingUserStr) {
          try {
            const parsedUser = JSON.parse(existingUserStr);
            const targetRoute = getParticularLoggedPage(parsedUser, redirect);
            router.replace(targetRoute as any);
            return;
          } catch {}
        }

        // Fallback: Return to home
        router.replace('/');
      } catch (err) {
        console.error('[OAuthRedirect] Error processing redirect:', err);
        router.replace('/auth');
      }
    }

    processAuthRedirect();
  }, [params, router]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <ShieldCheck size={36} color="#2563eb" />
        </View>
        <Text style={styles.title}>Signing you in...</Text>
        <Text style={styles.subtitle}>Setting up your CityLinks account</Text>
        <ActivityIndicator size="small" color="#2563eb" style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    width: '100%',
    maxWidth: 320,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  spinner: {
    marginTop: 4,
  },
});
