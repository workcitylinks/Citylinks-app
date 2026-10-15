import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, X, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../api/apiClient';
import { triggerLocalNotification } from '../services/pushNotifications';
import { useApp } from '../context/AppContext';

interface LiveNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  route?: string;
  createdAt: string;
}

/**
 * LiveNotificationBanner:
 * Listens for new incoming notifications in real-time and displays
 * both a native Android system notification AND a sleek, floating heads-up banner!
 */
export const LiveNotificationBanner: React.FC = () => {
  const router = useRouter();
  const { userData, userToken } = useApp();
  const [activeNotif, setActiveNotif] = useState<LiveNotification | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const lastKnownIdRef = useRef<string | null>(null);
  const isInitialFetchRef = useRef(true);

  // Reset notification tracking when user switches or logs in/out
  useEffect(() => {
    isInitialFetchRef.current = true;
    lastKnownIdRef.current = null;
    setActiveNotif(null);
  }, [userData?.id, userToken]);

  // Poll for latest notifications every 3.5 seconds
  useEffect(() => {
    let isMounted = true;

    const checkNewNotifications = async () => {
      try {
        const res = await apiClient.get('/notifications');
        const notifs: LiveNotification[] = res.data?.notifications || [];

        if (notifs.length > 0) {
          const newest = notifs[0];

          // On first run, record the newest ID so we only alert for NEW notifications arriving afterwards
          if (isInitialFetchRef.current) {
            isInitialFetchRef.current = false;
            lastKnownIdRef.current = newest.id;
            return;
          }

          // If a new notification arrived
          if (newest.id !== lastKnownIdRef.current) {
            lastKnownIdRef.current = newest.id;

            if (isMounted) {
              setActiveNotif(newest);

              // 1. Post native Android system notification (status bar icon, drawer & lockscreen alert with sound)
              triggerLocalNotification(newest.title, newest.message, {
                id: newest.id,
                type: newest.type,
                route: newest.route,
              });

              // 2. Trigger haptic vibration feedback
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (e) {}

              // 3. Slide down floating banner on screen
              Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 10,
              }).start();

              // Auto-dismiss after 6 seconds
              setTimeout(() => {
                if (isMounted) {
                  dismissBanner();
                }
              }, 6000);
            }
          }
        }
      } catch (err) {
        // Ignore network polling blips
      }
    };

    checkNewNotifications();
    const interval = setInterval(checkNewNotifications, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -140,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveNotif(null);
    });
  };

  const handlePress = () => {
    if (!activeNotif) return;
    dismissBanner();

    const notif = activeNotif;
    const type = (notif.type || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();

    if (notif.route) {
      router.push(notif.route as any);
    } else if (type.includes('transport') || title.includes('ride') || title.includes('driver')) {
      if (title.includes('new ride request') || title.includes('dashboard')) {
        router.push('/transport-dashboard');
      } else {
        router.push('/book-transport');
      }
    } else if (type.includes('shop') || title.includes('store')) {
      router.push('/shops');
    } else if (type.includes('service') || title.includes('specialist')) {
      router.push('/services');
    } else if (type.includes('order')) {
      router.push('/orders');
    } else if (type.includes('promo') || title.includes('deal') || title.includes('off')) {
      router.push('/deals');
    } else {
      router.push('/notifications');
    }
  };

  if (!activeNotif) return null;

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.bannerCard}
      >
        <View style={styles.iconCircle}>
          <Bell size={18} color="#ffffff" />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.metaRow}>
            <Text style={styles.appTitle}>CityLinks • Just now</Text>
          </View>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {activeNotif.title}
          </Text>
          <Text style={styles.bannerMessage} numberOfLines={2}>
            {activeNotif.message}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={dismissBanner}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color="#64748b" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 28,
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 999,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  bannerMessage: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
export default LiveNotificationBanner;
