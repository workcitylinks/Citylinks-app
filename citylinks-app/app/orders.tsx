import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Package,
  User,
  LogOut,
  ChevronDown,
  Bell,
  ShoppingCart,
  Store,
  MapPin,
  Clock,
  CheckCircle,
  CreditCard,
  Phone,
  Truck,
  PartyPopper,
  Sparkles,
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/apiClient';
import RefreshableScrollView from '../components/ui/RefreshableScrollView';
import { UserAvatar } from '../components/ui/UserAvatar';
import { ImageEnlargerModal } from '../components/ImageEnlargerModal';

export default function OrdersScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken, cartCount, unreadNotificationsCount, userData } = useApp();
  const params = useLocalSearchParams<{ shopId?: string; shopName?: string }>();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);

  // Celebration Modal state for Order Received
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [receivedOrderDetails, setReceivedOrderDetails] = useState<any | null>(null);

  const handleReceiveOrder = async (order: any) => {
    try {
      setReceivingId(order.id);
      const res = await apiClient.patch(`/orders/${order.id}/receive`);
      if (res.data?.success) {
        // Update local order list
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, orderStatus: 'DELIVERED' } : o))
        );
        setReceivedOrderDetails(order);
        setCelebrationVisible(true);
      }
    } catch (e: any) {
      console.error('Error marking order received:', e);
      showError(e.response?.data?.error || 'Could not confirm order receipt');
    } finally {
      setReceivingId(null);
    }
  };

  // Filter mode if navigated from a specific shop
  const activeShopId = params.shopId;
  const activeShopName = params.shopName;

  const fetchOrders = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      let endpoint = '/orders/my-orders';
      if (activeShopId) {
        endpoint = `/orders/shop/${activeShopId}`;
      }

      const res = await apiClient.get(endpoint);
      if (res.data?.orders) {
        // Automatically hide completed/received orders older than 30 days
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const filtered = (res.data.orders as any[]).filter((order) => {
          if (order.orderStatus === 'DELIVERED') {
            const dateVal = order.updatedAt || order.createdAt;
            if (dateVal && Date.now() - new Date(dateVal).getTime() > THIRTY_DAYS_MS) {
              return false;
            }
          }
          return true;
        });
        setOrders(filtered);
      }
    } catch (e) {
      console.warn('Could not load orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userToken) {
      showError('Please sign in to view your orders', 'Sign In Required');
      router.replace('/auth' as any);
      return;
    }
    fetchOrders();
  }, [userToken, activeShopId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders(true);
  };

  const userInitial = userData?.fullName?.trim()
    ? userData.fullName.trim().charAt(0).toUpperCase()
    : userData?.email
    ? userData.email.charAt(0).toUpperCase()
    : 'C';

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Top Navigation Bar with Logo + My Orders and User Avatar */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <View className="flex-row items-center">
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/')}>
              <Image
                source={require('../assets/images/logo.png')}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <View className="ml-2.5">
              <Text className="text-lg font-extrabold text-slate-900 tracking-tight">
                {activeShopName ? `${activeShopName} Orders` : 'My Orders'}
              </Text>
              {activeShopName && (
                <Text className="text-[10px] text-slate-500 font-medium">
                  Store orders dashboard
                </Text>
              )}
            </View>
          </View>

          {/* User Avatar with Dropdown */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowUserMenu(!showUserMenu)}
            className="flex-row items-center"
          >
            <UserAvatar
              avatarUrl={userData?.avatarUrl}
              name={userData?.fullName}
              email={userData?.email}
              size={34}
            />
            <ChevronDown size={16} color="#64748b" className="ml-1" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f1f3fa]">
        <RefreshableScrollView
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          className="flex-1 px-4 pt-3"
        >
          {/* Back Link with Arrow & Subtitle */}
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.back()}
              className="flex-row items-center self-start py-1"
            >
              <ArrowLeft size={17} color="#1e293b" />
              <Text className="ml-2 text-sm font-semibold text-slate-800">
                Back
              </Text>
            </TouchableOpacity>

            <Text className="text-slate-400 text-xs">
              {orders.length} order{orders.length === 1 ? '' : 's'} recorded
            </Text>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center py-16">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-xs text-slate-500 mt-3 font-medium">
                Loading orders...
              </Text>
            </View>
          ) : orders.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <View className="w-20 h-20 items-center justify-center mb-4 bg-slate-100 rounded-full">
                <Package size={44} color="#64748b" strokeWidth={1.5} />
              </View>
              <Text className="text-lg font-bold text-slate-800 mb-1.5 text-center">
                No orders yet
              </Text>
              <Text className="text-xs text-slate-500 text-center mb-6 px-6">
                {activeShopName
                  ? 'No customer orders have been placed for this store yet.'
                  : 'Start shopping in nearby stores to see your orders here'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/shops' as any)}
                className="bg-[#2563eb] px-6 py-3 rounded-xl shadow-sm items-center justify-center"
              >
                <Text className="text-white font-bold text-xs">
                  Browse Stores & Products
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-3.5">
              {orders.map((order) => {
                let itemsList: any[] = [];
                try {
                  itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
                } catch (e) {
                  itemsList = [];
                }

                const createdDate = order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <View
                    key={order.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs"
                  >
                    {/* Header: Shop Name & Status Badge */}
                    <View className="flex-row items-start justify-between pb-2.5 border-b border-slate-100">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center">
                          <Store size={14} color="#2563eb" />
                          <Text className="font-extrabold text-sm text-slate-900 ml-1.5" numberOfLines={1}>
                            {order.shopName || 'Local Merchant'}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-slate-400 mt-0.5">
                          Order ID: {order.id}
                        </Text>
                      </View>

                      <View className="items-end gap-y-1">
                        <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-row items-center">
                          <CheckCircle size={10} color="#059669" />
                          <Text className="text-[9px] font-bold text-emerald-700 ml-1">
                            PAID (UPI)
                          </Text>
                        </View>

                        {order.orderStatus === 'DELIVERED' ? (
                          <View className="bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex-row items-center">
                            <PartyPopper size={9} color="#7c3aed" />
                            <Text className="text-[9px] font-bold text-purple-700 ml-1">
                              RECEIVED 🎉
                            </Text>
                          </View>
                        ) : order.orderStatus === 'DISPATCHED' ? (
                          <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex-row items-center">
                            <Truck size={9} color="#2563eb" />
                            <Text className="text-[9px] font-bold text-blue-700 ml-1">
                              DISPATCHED 🚚
                            </Text>
                          </View>
                        ) : (
                          <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-row items-center">
                            <Clock size={9} color="#d97706" />
                            <Text className="text-[9px] font-bold text-amber-700 ml-1">
                              PREPARING ⏳
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Customer Info & Location */}
                    <View className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 my-2.5">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[11px] font-bold text-slate-800">
                          👤 Customer: {order.userName || 'Customer'}
                        </Text>
                        {order.userPhone && (
                          <Text className="text-[10px] text-slate-500 font-medium">
                            📞 {order.userPhone}
                          </Text>
                        )}
                      </View>

                      <View className="flex-row items-start mt-0.5">
                        <MapPin size={11} color="#ea580c" style={{ marginTop: 2, marginRight: 4 }} />
                        <Text className="text-[11px] text-slate-600 flex-1 leading-4" numberOfLines={2}>
                          {order.userAddress || 'Haveri, Karnataka'}
                        </Text>
                      </View>
                    </View>

                    {/* Ordered Products Itemized List */}
                    <View className="mb-2.5">
                      <Text className="text-[11px] font-bold text-slate-700 mb-1.5">
                        Products Ordered ({itemsList.length}):
                      </Text>
                      {itemsList.map((item, idx) => (
                        <View
                          key={idx}
                          className="flex-row items-center justify-between py-2 border-b border-slate-100 last:border-b-0"
                        >
                          <TouchableOpacity
                            activeOpacity={item.imageUrl ? 0.7 : 1}
                            onPress={() => {
                              if (item.imageUrl) {
                                setEnlargedImage({
                                  url: item.imageUrl,
                                  title: item.productName || item.name || 'Product',
                                });
                              }
                            }}
                            className="w-11 h-11 rounded-lg bg-slate-100 overflow-hidden mr-2.5 border border-slate-200 items-center justify-center relative"
                          >
                            {item.imageUrl ? (
                              <>
                                <Image
                                  source={{ uri: item.imageUrl }}
                                  className="w-full h-full"
                                  resizeMode="cover"
                                />
                                <View className="absolute bottom-0.5 right-0.5 bg-black/60 rounded px-0.5">
                                  <Text className="text-[7px] text-white">🔍</Text>
                                </View>
                              </>
                            ) : (
                              <Package size={16} color="#94a3b8" />
                            )}
                          </TouchableOpacity>

                          <View className="flex-1 mr-2">
                            <Text className="text-xs text-slate-800 font-semibold" numberOfLines={1}>
                              {item.productName || item.name || 'Product'}
                            </Text>
                            <Text className="text-[10px] text-slate-500 mt-0.5">
                              Qty: {item.quantity || 1} × ₹{item.price || 0}
                            </Text>
                          </View>

                          <Text className="text-xs font-bold text-slate-900">
                            ₹{item.itemTotal || (item.price || 0) * (item.quantity || 1)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Footer: Date & Total Amount Paid */}
                    <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100">
                      <View className="flex-row items-center">
                        <Clock size={11} color="#94a3b8" />
                        <Text className="text-[10px] text-slate-400 ml-1">
                          {createdDate}
                        </Text>
                      </View>

                      <View className="flex-row items-baseline">
                        <Text className="text-[11px] text-slate-500 mr-1.5">Paid via UPI:</Text>
                        <Text className="text-sm font-black text-emerald-700">
                          ₹{order.totalAmount}
                        </Text>
                      </View>
                    </View>

                    {/* Action: ORDER RECEIVED BUTTON (Appears only when marked DISPATCHED by shopkeeper) */}
                    {order.orderStatus === 'DISPATCHED' && (
                      <View className="mt-3 pt-3 border-t border-slate-100">
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handleReceiveOrder(order)}
                          disabled={receivingId === order.id}
                          style={{
                            backgroundColor: '#16a34a',
                            borderRadius: 12,
                            paddingVertical: 11,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            shadowColor: '#16a34a',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                        >
                          {receivingId === order.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <PartyPopper size={16} color="#ffffff" />
                              <Text
                                style={{
                                  color: '#ffffff',
                                  fontWeight: '800',
                                  fontSize: 13,
                                  marginLeft: 8,
                                }}
                              >
                                Order Received 🎉
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <Text className="text-[10px] text-slate-400 text-center mt-1.5">
                          Tap when package has arrived at your address
                        </Text>
                      </View>
                    )}

                    {order.orderStatus === 'DELIVERED' && (
                      <View className="mt-2.5 bg-purple-50 border border-purple-200 rounded-xl p-2.5 flex-row items-center justify-center">
                        <PartyPopper size={14} color="#7c3aed" />
                        <Text className="text-[11px] font-bold text-purple-800 ml-1.5">
                          Order Received & Delivered! Thank you 🎉
                        </Text>
                      </View>
                    )}

                    {(!order.orderStatus || order.orderStatus === 'PLACED') && (
                      <View className="mt-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex-row items-center justify-center">
                        <Clock size={12} color="#64748b" />
                        <Text className="text-[10px] text-slate-500 font-medium ml-1.5">
                          Shop is packing your order. "Order Received" activates when dispatched.
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </RefreshableScrollView>

        {/* CELEBRATION MODAL (Shows 🎉 emoji on clicking "Order Received") */}
        <Modal
          visible={celebrationVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCelebrationVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 28,
                padding: 24,
                width: '100%',
                maxWidth: 360,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 25,
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
              }}
            >
              {/* Huge 🎉 Emoji Avatar with festive circle */}
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: '#fef3c7',
                  borderWidth: 3,
                  borderColor: '#f59e0b',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  shadowColor: '#f59e0b',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <Text style={{ fontSize: 44 }}>🎉</Text>
              </View>

              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>
                Order Received! 🎉
              </Text>

              <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 19, marginBottom: 18, paddingHorizontal: 4 }}>
                Thank you for shopping with <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>CityLinks</Text>! We hope you loved your order from{' '}
                <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>
                  {receivedOrderDetails?.shopName || 'the store'}
                </Text>
                .
              </Text>

              {/* Call-to-action suggestions: More shopping & other services */}
              <View style={{ width: '100%', backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Sparkles size={14} color="#f59e0b" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a', marginLeft: 4 }}>
                    DISCOVER MORE ON CITYLINKS
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}>
                  Continue shopping local deals or explore our digital amenities, transports, and professional services across Haveri.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ width: '100%', gap: 10 }}>
                {/* Shop More Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setCelebrationVisible(false);
                    router.push('/shops' as any);
                  }}
                  style={{
                    backgroundColor: '#2563eb',
                    borderRadius: 14,
                    paddingVertical: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    shadowColor: '#2563eb',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                  }}
                >
                  <ShoppingCart size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13, marginLeft: 8 }}>
                    Shop More Local Products
                  </Text>
                </TouchableOpacity>

                {/* Explore Other Services Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setCelebrationVisible(false);
                    router.push('/dashboard' as any);
                  }}
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                  }}
                >
                  <Text style={{ color: '#334155', fontWeight: '800', fontSize: 13 }}>
                    Explore Other Services 🚀
                  </Text>
                </TouchableOpacity>

                {/* Close Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setCelebrationVisible(false)}
                  style={{
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 12 }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* User Dropdown Menu Modal */}
        <Modal
          visible={showUserMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowUserMenu(false)}
        >
          <Pressable
            className="flex-1 bg-black/10"
            onPress={() => setShowUserMenu(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: 55,
                right: 16,
                minWidth: 190,
                backgroundColor: '#ffffff',
                borderRadius: 16,
                paddingVertical: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 10,
                borderWidth: 1,
                borderColor: '#f1f5f9',
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowUserMenu(false);
                  router.push('/profile' as any);
                }}
                className="flex-row items-center px-4 py-3"
              >
                <User size={18} color="#1e293b" />
                <Text className="ml-3 text-sm font-semibold text-slate-800">
                  My Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowUserMenu(false);
                  router.push('/cart' as any);
                }}
                className="flex-row items-center justify-between px-4 py-3"
              >
                <View className="flex-row items-center">
                  <ShoppingCart size={18} color="#1e293b" />
                  <Text className="ml-3 text-sm font-semibold text-slate-800">
                    My Cart
                  </Text>
                </View>
                {cartCount > 0 && (
                  <View style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1.5 }}>
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                      {cartCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Product Image Enlarger Modal */}
        <ImageEnlargerModal
          visible={!!enlargedImage}
          imageUrl={enlargedImage?.url || null}
          title={enlargedImage?.title}
          onClose={() => setEnlargedImage(null)}
        />
      </SafeAreaView>
    </View>
  );
}
