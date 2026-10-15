import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getParticularLoggedPage } from '../utils/authRedirect';

export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect user safely back into the app
    async function recoverRoute() {
      try {
        const token = await AsyncStorage.getItem('user_token');
        const userData = await AsyncStorage.getItem('user_data');
        if (token && userData) {
          const user = JSON.parse(userData);
          const target = getParticularLoggedPage(user);
          router.replace(target as any);
          return;
        }
      } catch {}
      router.replace('/');
    }

    recoverRoute();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
