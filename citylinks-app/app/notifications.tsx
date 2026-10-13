import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  Sparkles,
  Package,
  AlertCircle,
  CheckCheck,
  Clock,
  Inbox,
  Trash2,
  ChevronLeft,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string; // info, promo, order, alert
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Swipeable Notification Row Component
interface SwipeableNotificationCardProps {
  notification: NotificationItem;
  onPress: () => void;
  onDelete: (id: string) => void;
  formatRelativeTime: (isoString: string) => string;
  getTypeIcon: (type: string) => { icon: React.ReactNode; bg: string };
}

const SwipeableNotificationCard: React.FC<SwipeableNotificationCardProps> = ({
  notification,
  onPress,
  onDelete,
  formatRelativeTime,
  getTypeIcon,
}) => {
  const panX = useRef(new Animated.Value(0)).current;
  const isUnread = !notification.isRead;
  const typeStyle = getTypeIcon(notification.type);

  const SWIPE_THRESHOLD = -75; // Threshold to snap open or trigger delete

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger horizontal left-swipe gestures (ignore vertical scroll)
        return (
          gestureState.dx < -8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Allow swiping left (negative values), clamp positive right values
        if (gestureState.dx <= 0) {
          // Add dampening past -90
          const clamped = gestureState.dx < -120 ? -120 + (gestureState.dx + 120) * 0.2 : gestureState.dx;
          panX.setValue(clamped);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Snap open reveal position
          Animated.spring(panX, {
            toValue: -85,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        } else {
          // Snap back closed
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleCloseSwipe = () => {
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View className="relative mb-3 overflow-hidden rounded-2xl">
      {/* Background Action: Delete / Clear on swipe left */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 85,
          backgroundColor: '#ef4444',
          borderRadius: 16,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          zIndex: 1,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onDelete(notification.id)}
          style={{
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Trash2 size={20} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700', marginTop: 4 }}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>

      {/* Foreground Notification Content Card */}
      <Animated.View
        style={{
          transform: [{ translateX: panX }],
          zIndex: 2,
        }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            handleCloseSwipe();
            onPress();
          }}
          style={{
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isUnread ? '#cbd5e1' : '#e2e8f0',
            backgroundColor: isUnread ? '#f8fafc' : '#ffffff',
            shadowColor: '#64748b',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <View className="flex-row items-start">
            <View
              className={`w-10 h-10 rounded-xl items-center justify-center border mr-3.5 flex-shrink-0 ${typeStyle.bg}`}
            >
              {typeStyle.icon}
            </View>

            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className={`text-sm font-bold flex-1 mr-2 ${
                    isUnread ? 'text-slate-900' : 'text-slate-600'
                  }`}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                {isUnread && (
                  <View className="w-2.5 h-2.5 rounded-full bg-blue-600 ml-1 flex-shrink-0" />
                )}
              </View>

              <Text
                className={`text-xs leading-5 mb-2.5 ${
                  isUnread ? 'text-slate-700' : 'text-slate-500'
                }`}
              >
                {notification.message}
              </Text>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Clock size={11} color="#94a3b8" />
                  <Text className="text-[11px] text-slate-400 font-medium ml-1">
                    {formatRelativeTime(notification.createdAt)}
                  </Text>
                  <Text className="text-slate-300 mx-1.5">·</Text>
                  <Text className="text-[11px] font-semibold text-blue-600 capitalize">
                    {notification.type === 'promo' ? 'Special Offer' : 'CityLinks Alert'}
                  </Text>
                </View>

                {/* Subtle swipe cue */}
                <View className="flex-row items-center">
                  <Text className="text-[9px] text-slate-300 font-medium mr-0.5">Swipe</Text>
                  <ChevronLeft size={10} color="#cbd5e1" />
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function NotificationsScreen() {
  const { userToken, userData, refreshNotificationCount } = useApp();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await apiClient.get('/notifications');
      if (res.data?.notifications) {
        // Filter rules:
        // 1. Seen/read notifications disappear after 24 hours
        // 2. Unread notifications disappear after 1 week (7 days)
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const activeNotifications = (res.data.notifications as NotificationItem[]).filter(
          (n) => {
            if (n.isRead) {
              const seenDate = new Date(n.updatedAt || n.createdAt).getTime();
              if (now - seenDate >= TWENTY_FOUR_HOURS_MS) {
                return false; // Seen notification automatically disappeared after 24 hours
              }
            } else {
              const createdDate = new Date(n.createdAt).getTime();
              if (now - createdDate >= ONE_WEEK_MS) {
                return false; // Unread notification automatically disappeared after 1 week
              }
            }
            return true;
          }
        );

        setNotifications(activeNotifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userToken) {
      showError('Please sign in to view your notifications', 'Sign In Required');
      router.replace('/auth' as any);
      return;
    }
    fetchNotifications();
  }, [userToken]);

  useFocusEffect(
    React.useCallback(() => {
      if (userToken) {
        fetchNotifications(true);
        refreshNotificationCount();
      }
    }, [userToken])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
    refreshNotificationCount();
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const isSuperAdmin = userData?.role === 'SUPER_ADMIN';

  const visibleNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const type = (n.type || '').toLowerCase();
      const isAdminType =
        type === 'admin_only' ||
        type === 'admin' ||
        type === 'admin_alert' ||
        type === 'join_request' ||
        type === 'super_admin' ||
        type.startsWith('dept:super_admin');
      if (isAdminType && !isSuperAdmin) {
        return false;
      }
      return true;
    });
  }, [notifications, isSuperAdmin]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return visibleNotifications.filter((n) => !n.isRead);
    }
    return visibleNotifications;
  }, [visibleNotifications, activeTab]);

  const handleMarkAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, updatedAt: new Date().toISOString() } : n
        )
      );
      await refreshNotificationCount();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await apiClient.post('/notifications/mark-all-read');
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, updatedAt: nowIso }))
      );
      showSuccess('All notifications marked as read', 'Success');
      await refreshNotificationCount();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      // Optimistic delete
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showSuccess('Notification cleared', 'Deleted');
      await apiClient.delete(`/notifications/${id}`);
      await refreshNotificationCount();
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      showError('Failed to clear notification');
      // Refetch if error
      fetchNotifications(true);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'promo':
        return {
          icon: <Sparkles size={18} color="#9333ea" />,
          bg: 'bg-purple-50 border-purple-100',
        };
      case 'order':
        return {
          icon: <Package size={18} color="#10b981" />,
          bg: 'bg-emerald-50 border-emerald-100',
        };
      case 'alert':
        return {
          icon: <AlertCircle size={18} color="#f59e0b" />,
          bg: 'bg-amber-50 border-amber-100',
        };
      default:
        return {
          icon: <Bell size={18} color="#2563eb" />,
          bg: 'bg-blue-50 border-blue-100',
        };
    }
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-white border-b border-slate-200">
        <View className="px-4 py-3 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="flex-row items-center p-1"
          >
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <Bell size={20} color="#2563eb" />
            <Text className="text-lg font-bold text-slate-900 ml-2">Notifications</Text>
            {unreadCount > 0 && (
              <View className="bg-red-500 rounded-full px-2 py-0.5 ml-2">
                <Text className="text-xs font-bold text-white">{unreadCount}</Text>
              </View>
            )}
          </View>

          {unreadCount > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleMarkAllAsRead}
              className="flex-row items-center p-1"
            >
              <CheckCheck size={16} color="#2563eb" />
              <Text className="text-xs font-bold text-primary ml-1">Read all</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-8" />
          )}
        </View>

        {/* Tab Switcher & Swipe Hint */}
        <View className="flex-row items-center justify-between px-4 pt-1 pb-3">
          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-full border ${
                activeTab === 'all'
                  ? 'bg-primary border-primary'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'all' ? 'text-white' : 'text-slate-600'
                }`}
              >
                All ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('unread')}
              className={`px-4 py-1.5 rounded-full border ${
                activeTab === 'unread'
                  ? 'bg-primary border-primary'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'unread' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Unread ({unreadCount})
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-[10px] text-slate-400 font-medium">
            👈 Swipe left to clear
          </Text>
        </View>
      </SafeAreaView>

      {/* Content */}
      <SafeAreaView edges={['bottom']} className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-xs text-slate-500 mt-3 font-medium">
              Loading notifications...
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mb-4 border border-blue-100">
              <Inbox size={36} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-900 text-center mb-1.5">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </Text>
            <Text className="text-sm text-slate-500 text-center max-w-[280px] leading-5">
              {activeTab === 'unread'
                ? 'Unread messages automatically disappear after 1 week.'
                : 'Seen notifications automatically disappear after 24 hours, unread after 1 week.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: 30 }}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredNotifications.map((n) => (
              <SwipeableNotificationCard
                key={n.id}
                notification={n}
                onPress={() => {
                  handleMarkAsRead(n.id, n.isRead);
                  const isDealOrOffer =
                    n.type === 'promo' ||
                    n.title.toLowerCase().includes('deal') ||
                    n.title.toLowerCase().includes('offer') ||
                    n.message.toLowerCase().includes('deal') ||
                    n.message.toLowerCase().includes('offer');
                  if (isDealOrOffer) {
                    router.push('/deals');
                  }
                }}
                onDelete={handleDeleteNotification}
                formatRelativeTime={formatRelativeTime}
                getTypeIcon={getTypeIcon}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
