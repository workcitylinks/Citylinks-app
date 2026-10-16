import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { apiClient } from '../api/apiClient';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

// Instantly dismiss Expo Go's default screen so our custom splash shows immediately
SplashScreen.hideAsync().catch(() => {});

export interface UserData {
  id: string;
  email: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  role?: string;
}

export interface PopularItem {
  id?: string;
  name?: string;
  category?: string;
  location?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  rating?: number | null;
  _count?: { products: number };
  entity_type: "product" | "service" | "transport" | "shop";
  entity_id: string;
  title: string;
  subtitle: string;
  link_url: string;
  badge: string;
  price_label: string | null;
  popularity: number;
}


interface AppContextType {
  isAppReady: boolean;
  userToken: string | null;
  userData: UserData | null;
  popularItems: PopularItem[];
  cartCount: number;
  unreadNotificationsCount: number;
  isShopPhoneEnabled: boolean;
  refreshPhoneSetting: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshCartCount: () => Promise<void>;
  refreshNotificationCount: () => Promise<void>;
  switchUserRole: (newRole: string) => Promise<UserData | undefined>;
  setUserData: (data: UserData | null) => void;
  setUserToken: (token: string | null) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [isShopPhoneEnabled, setIsShopPhoneEnabled] = useState<boolean>(false);

  const refreshPhoneSetting = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/phone-settings');
      if (res.data && typeof res.data.showShopPhone === 'boolean') {
        setIsShopPhoneEnabled(res.data.showShopPhone);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const refreshCartCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/cart/count');
      if (res.data && typeof res.data.count === 'number') {
        setCartCount(res.data.count);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const refreshNotificationCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      if (res.data && typeof res.data.unreadCount === 'number') {
        setUnreadNotificationsCount(res.data.unreadCount);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      const user = await AsyncStorage.getItem('user_data');
      setUserToken(token);
      if (user) {
        setUserData(JSON.parse(user));
      } else {
        setUserData(null);
      }

      // Always fetch fresh profile from backend to get latest updated role
      if (token) {
        try {
          const profileRes = await apiClient.get('/auth/profile');
          if (profileRes.data) {
            setUserData(profileRes.data);
            await AsyncStorage.setItem('user_data', JSON.stringify(profileRes.data));
          }
        } catch (apiErr: any) {
          // If server explicitly says user not found or session invalid, clear stale credentials
          if (apiErr?.response?.status === 401 || apiErr?.response?.status === 404) {
            console.warn('[AppContext] Stored user does not exist on active server (401/404). Clearing stale session.');
            await logout();
            return;
          }
        }

        // Sync push notification token to newly authenticated user profile
        registerForPushNotificationsAsync().catch(() => {});
      }

      await Promise.all([refreshCartCount(), refreshNotificationCount()]);
    } catch (e) {
      console.log('Error refreshing auth:', e);
    }
  }, [refreshCartCount, refreshNotificationCount]);

  const switchUserRole = useCallback(async (newRole: string) => {
    try {
      const res = await apiClient.post('/auth/switch-role', { role: newRole });
      if (res.data?.user) {
        setUserData(res.data.user);
        await AsyncStorage.setItem('user_data', JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch (e) {
      console.log('Error switching role:', e);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('user_token');
    await AsyncStorage.removeItem('user_data');
    setUserToken(null);
    setUserData(null);
    setCartCount(0);
    setUnreadNotificationsCount(0);
  }, []);

  useEffect(() => {
    const initializeAppData = async () => {
      const startTime = Date.now();
      try {
        // Hide the native Expo splash right away to show our clean white custom splash
        await SplashScreen.hideAsync().catch(() => {});

        // 1. Preload stored authentication state
        const [token, user] = await Promise.all([
          AsyncStorage.getItem('user_token'),
          AsyncStorage.getItem('user_data'),
        ]);

        if (token) {
          setUserToken(token);
        }
        if (user) {
          setUserData(JSON.parse(user));
        }

        // Fetch fresh profile from backend if logged in
        if (token) {
          apiClient.get('/auth/profile').then(async (res) => {
            if (res.data) {
              setUserData(res.data);
              await AsyncStorage.setItem('user_data', JSON.stringify(res.data));
            }
          }).catch(async (apiErr: any) => {
            if (apiErr?.response?.status === 401 || apiErr?.response?.status === 404) {
              console.warn('[AppContext] Stored user does not exist on active server (401/404). Clearing stale session.');
              await logout();
            }
          });
        }

        // Preload counts and phone display settings
        refreshCartCount().catch(() => {});
        refreshNotificationCount().catch(() => {});
        refreshPhoneSetting().catch(() => {});

        // 2. Preload marketplace popular items from backend in parallel
        try {
          const res = await apiClient.get('/marketplace/popular?limit=20');
          if (res.data) {
            setPopularItems(res.data);
          }
        } catch (apiErr) {
          console.log('Marketplace preload skipped / network err:', apiErr);
        }
      } catch (err) {
        console.log('Initialization error:', err);
      } finally {
        // Enforce smooth 2-second custom splash screen with horizontal loading line
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 2000 - elapsed);
        setTimeout(() => {
          setIsAppReady(true);
        }, remaining);
      }
    };

    initializeAppData();
  }, []);

  const contextValue = useMemo(
    () => ({
      isAppReady,
      userToken,
      userData,
      popularItems,
      cartCount,
      unreadNotificationsCount,
      isShopPhoneEnabled,
      refreshPhoneSetting,
      refreshAuth,
      refreshCartCount,
      refreshNotificationCount,
      switchUserRole,
      setUserData,
      setUserToken,
      logout,
    }),
    [
      isAppReady,
      userToken,
      userData,
      popularItems,
      cartCount,
      unreadNotificationsCount,
      isShopPhoneEnabled,
      refreshPhoneSetting,
      refreshAuth,
      refreshCartCount,
      refreshNotificationCount,
      switchUserRole,
      logout,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
