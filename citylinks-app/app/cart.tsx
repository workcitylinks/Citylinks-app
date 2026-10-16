import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Image,
  TextInput,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Store,
  ArrowRight,
  ShieldCheck,
  Tag,
  CheckCircle2,
  CheckSquare,
  Square,
  CreditCard,
  CheckCircle,
  X,
  MapPin,
  ExternalLink,
  Clock,
  Navigation,
  Edit3,
  History,
  AlertTriangle,
  RotateCcw,
  Check,
  HelpCircle,
  XCircle,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useUserLocation } from '../hooks/useUserLocation';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { ImageEnlargerModal } from '../components/ImageEnlargerModal';

const ADDRESS_HISTORY_KEY = '@citylinks_saved_delivery_addresses';

export interface CartItemProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  unit: string;
  stock: number;
  imageUrl?: string | null;
  shop?: {
    id: string;
    name: string;
    location: string;
    category: string;
    phone?: string | null;
  };
}

export interface CartItemRecord {
  id: string;
  productId: string;
  quantity: number;
  product: CartItemProduct;
  itemTotal: number;
}

export default function CartScreen() {
  const { userToken, userData, refreshCartCount } = useApp();
  const { showSuccess, showError } = useToast();
  const { coords: mobileCoords, locality, refreshLocation } = useUserLocation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<CartItemRecord[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<{ [id: string]: boolean }>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);

  // Address Selection & History States
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [customAddressInput, setCustomAddressInput] = useState<string>('');
  const [isFetchingAutoLoc, setIsFetchingAutoLoc] = useState<boolean>(false);

  // UPI Payment Sheet Modal State
  const [upiModalVisible, setUpiModalVisible] = useState(false);

  // 5-Minute Payment Countdown Screen Modal State
  const [paymentSessionVisible, setPaymentSessionVisible] = useState(false);
  const [activeUpiApp, setActiveUpiApp] = useState<{
    id: string;
    name: string;
    vpa: string;
    color: string;
    bg: string;
  } | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minutes (300s)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'VERIFYING' | 'PAID' | 'FAILED'>('PENDING');
  const timerRef = useRef<any>(null);
  const appStateRef = useRef(AppState.currentState);

  // Order Success Modal State
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails] = useState<any>(null);

  const fetchCart = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await apiClient.get('/cart');
      if (res.data) {
        const fetchedItems: CartItemRecord[] = res.data.items || [];
        setItems(fetchedItems);

        // By default, select all items in cart if not already set
        setSelectedItemIds((prev) => {
          const next = { ...prev };
          fetchedItems.forEach((i) => {
            if (next[i.id] === undefined) {
              next[i.id] = true;
            }
          });
          return next;
        });
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!userToken) {
      showError('Please sign in to view your cart', 'Sign In Required');
      router.replace('/auth' as any);
      return;
    }
    fetchCart();
  }, [userToken]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCart(true);
    refreshCartCount();
  };

  // Toggle selection for a single item
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Toggle select all items
  const isAllSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((i) => selectedItemIds[i.id]);
  }, [items, selectedItemIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const next: { [id: string]: boolean } = {};
      items.forEach((i) => (next[i.id] = false));
      setSelectedItemIds(next);
    } else {
      const next: { [id: string]: boolean } = {};
      items.forEach((i) => (next[i.id] = true));
      setSelectedItemIds(next);
    }
  };

  // Selected items calculation for Bill & Checkout
  const selectedItems = useMemo(() => {
    return items.filter((i) => selectedItemIds[i.id]);
  }, [items, selectedItemIds]);

  const selectedCount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItems]);

  const selectedSubtotal = useMemo(() => {
    return selectedItems.reduce(
      (sum, item) => sum + (item.product.price || 0) * item.quantity,
      0
    );
  }, [selectedItems]);

  const deliveryFee = selectedSubtotal > 200 || selectedSubtotal === 0 ? 0 : 25;
  const grandTotal = selectedSubtotal + deliveryFee;

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    try {
      setActionLoadingId(itemId);
      const res = await apiClient.patch(`/cart/items/${itemId}`, { quantity: newQty });
      if (res.data?.removed) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        showSuccess('Item removed from cart', 'Cart Updated');
      } else {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  quantity: newQty,
                  itemTotal: (i.product.price || 0) * newQty,
                }
              : i
          )
        );
      }
      await refreshCartCount();
      await fetchCart(true);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update quantity', 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string, productName: string) => {
    try {
      setActionLoadingId(itemId);
      await apiClient.delete(`/cart/items/${itemId}`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      showSuccess(`Removed ${productName} from cart`, 'Item Removed');
      await refreshCartCount();
      await fetchCart(true);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to remove item', 'Error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClearCart = async () => {
    Alert.alert('Clear Cart', 'Are you sure you want to remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete('/cart/clear');
            setItems([]);
            showSuccess('Cart cleared', 'Empty Cart');
            await refreshCartCount();
          } catch (err: any) {
            showError('Failed to clear cart', 'Error');
          }
        },
      },
    ]);
  };

  // Load saved delivery addresses from persistent history
  useEffect(() => {
    const loadAddressHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(ADDRESS_HISTORY_KEY);
        if (stored) {
          const list: string[] = JSON.parse(stored);
          if (Array.isArray(list) && list.length > 0) {
            setSavedAddresses(list);
            if (!selectedAddress) {
              setSelectedAddress(list[0]);
            }
          }
        }
      } catch (e) {
        console.warn('Could not load address history:', e);
      }
    };
    loadAddressHistory();
  }, []);

  // Set default address from user profile or current auto locality if not yet set
  useEffect(() => {
    if (!selectedAddress) {
      if (userData?.address && userData.address.trim()) {
        setSelectedAddress(userData.address.trim());
      } else if (locality) {
        setSelectedAddress(`${locality}, Haveri, Karnataka`);
      }
    }
  }, [userData?.address, locality]);

  // Save new address into persistent history
  const handleSaveAndUseAddress = async (newAddr: string) => {
    const trimmed = newAddr.trim();
    if (!trimmed) {
      showError('Please enter a valid delivery address or place name', 'Address Missing');
      return;
    }
    setSelectedAddress(trimmed);
    try {
      const updated = [trimmed, ...savedAddresses.filter((a) => a !== trimmed)].slice(0, 8);
      setSavedAddresses(updated);
      await AsyncStorage.setItem(ADDRESS_HISTORY_KEY, JSON.stringify(updated));
      showSuccess('Delivery address updated', 'Address Saved');
    } catch (e) {
      console.warn('Could not save address to history:', e);
    }
    setCustomAddressInput('');
    setAddressModalVisible(false);
  };

  // Auto-fetch fresh live GPS location for address
  const handleAutoFetchLocation = async () => {
    try {
      setIsFetchingAutoLoc(true);
      await refreshLocation();
      const detected = locality ? `${locality}, Haveri, Karnataka` : 'Haveri, Karnataka';
      await handleSaveAndUseAddress(detected);
    } catch (err: any) {
      showError('Could not auto-detect location. Please enter manually.', 'GPS Error');
    } finally {
      setIsFetchingAutoLoc(false);
    }
  };

  // Timer countdown management for 5-minute payment session
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timerSeconds === 0) {
      // 5 minutes expired!
      setIsTimerRunning(false);
      setPaymentStatus('FAILED');
      Alert.alert(
        'Payment Session Expired',
        'The 5-minute UPI payment window has timed out. If money was not deducted, please try initiating payment again.'
      );
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timerSeconds]);

  // Monitor AppState to detect when user returns from UPI app (e.g. PhonePe/GPay)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        paymentSessionVisible &&
        paymentStatus === 'PENDING'
      ) {
        // User came back from payment app! Prompt to verify
      }
      appStateRef.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, [paymentSessionVisible, paymentStatus]);

  // Format seconds into MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Open Checkout Address / UPI Sheet
  const handleProceedToCheckout = () => {
    if (!userToken) {
      showError('Please sign in to proceed with checkout', 'Sign In Required');
      router.push('/auth');
      return;
    }
    if (selectedItems.length === 0) {
      showError('Please select at least one item from your cart to proceed with checkout', 'No Items Selected');
      return;
    }
    setUpiModalVisible(true);
  };

  // Launch Payment Session with 5-minute timer and open selected UPI App
  const handleStartUpiPayment = async (appType: 'gpay' | 'phonepe' | 'paytm' | 'any') => {
    const primaryShop = selectedItems[0]?.product.shop;
    const payeeName = primaryShop?.name || 'CityLinks Merchant';

    // Extract digits of shop phone number for UPI address
    const rawPhone = primaryShop?.phone || '9449084242';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').slice(-10);
    const targetPhone = cleanPhone.length === 10 ? cleanPhone : '9449084242';

    let appConfig = {
      id: 'any',
      name: 'Universal UPI (BHIM/Cred)',
      vpa: `${targetPhone}@upi`,
      color: '#0f172a',
      bg: '#f8fafc',
    };

    if (appType === 'phonepe') {
      appConfig = {
        id: 'phonepe',
        name: 'PhonePe',
        vpa: `${targetPhone}@ybl`,
        color: '#6739b7',
        bg: '#f3e8ff',
      };
    } else if (appType === 'gpay') {
      appConfig = {
        id: 'gpay',
        name: 'Google Pay',
        vpa: `${targetPhone}@okaxis`,
        color: '#2563eb',
        bg: '#eff6ff',
      };
    } else if (appType === 'paytm') {
      appConfig = {
        id: 'paytm',
        name: 'Paytm UPI',
        vpa: `${targetPhone}@paytm`,
        color: '#0284c7',
        bg: '#e0f2fe',
      };
    }

    setActiveUpiApp(appConfig);
    setTimerSeconds(300); // 5 minutes (300 seconds)
    setIsTimerRunning(true);
    setPaymentStatus('PENDING');

    // Close the selector and open the 5-min timer payment session page
    setUpiModalVisible(false);
    setPaymentSessionVisible(true);

    const transactionNote = `Payment to ${payeeName}`;
    const transactionRef = `CL-${Date.now()}`;

    // Standard NPCI URI
    const upiUri = `upi://pay?pa=${encodeURIComponent(appConfig.vpa)}&pn=${encodeURIComponent(
      payeeName
    )}&am=${encodeURIComponent(grandTotal.toString())}&cu=INR&tn=${encodeURIComponent(
      transactionNote
    )}&tr=${encodeURIComponent(transactionRef)}`;

    let targetUri = upiUri;
    if (appType === 'phonepe') {
      targetUri = `phonepe://pay?pa=${encodeURIComponent(appConfig.vpa)}&pn=${encodeURIComponent(payeeName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    } else if (appType === 'gpay') {
      targetUri = `tez://upi/pay?pa=${encodeURIComponent(appConfig.vpa)}&pn=${encodeURIComponent(payeeName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    } else if (appType === 'paytm') {
      targetUri = `paytmmp://pay?pa=${encodeURIComponent(appConfig.vpa)}&pn=${encodeURIComponent(payeeName)}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    }

    // Launch UPI app deep link
    try {
      const supported = await Linking.canOpenURL(targetUri).catch(() => false);
      if (supported) {
        await Linking.openURL(targetUri);
      } else {
        await Linking.openURL(upiUri).catch(() => {
          showSuccess(`UPI Request to ${targetPhone} (₹${grandTotal}) ready`, 'UPI Initialized');
        });
      }
    } catch (e) {
      console.warn('Could not launch specific UPI URL:', e);
      await Linking.openURL(upiUri).catch(() => {});
    }
  };

  // Strictly verify payment: if confirmed, stop timer and complete order in backend
  const handleVerifyPaymentStatus = async (userClaimedPaid: boolean) => {
    if (!userClaimedPaid) {
      // Payment was NOT completed / cancelled by user
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsTimerRunning(false);
      setPaymentStatus('FAILED');
      showError('Payment not completed. No amount was charged or order placed.', 'Payment Not Done');
      return;
    }

    // Customer confirms they completed the payment in UPI app
    try {
      setPaymentStatus('VERIFYING');
      const primaryShop = selectedItems[0]?.product.shop;
      const shopId = primaryShop?.id || 'shop-general';
      const shopName = primaryShop?.name || 'Local Store';

      const finalAddress =
        selectedAddress ||
        userData?.address ||
        (locality ? `${locality}, Haveri, Karnataka` : 'Haveri, Karnataka');

      const userLoc = {
        address: finalAddress,
        latitude: mobileCoords?.latitude || null,
        longitude: mobileCoords?.longitude || null,
      };

      const payload = {
        shopId,
        shopName,
        items: selectedItems.map((i) => ({
          productId: i.productId,
          productName: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
          unit: i.product.unit,
          imageUrl: i.product.imageUrl || null,
          itemTotal: (i.product.price || 0) * i.quantity,
        })),
        subtotal: selectedSubtotal,
        deliveryFee,
        totalAmount: grandTotal,
        transactionRef: `UPI-${Date.now().toString(36).toUpperCase()}`,
        userLocation: userLoc,
        upiApp: activeUpiApp?.name || 'UPI',
        isPaid: true,
      };

      const res = await apiClient.post('/orders/verify-payment', payload);

      if (res.data?.success && res.data.paymentStatus === 'PAID') {
        // Stop timer immediately
        if (timerRef.current) clearTimeout(timerRef.current);
        setIsTimerRunning(false);
        setPaymentStatus('PAID');

        setPlacedOrderDetails({
          ...res.data.order,
          shopName,
          itemsCount: selectedCount,
          deliveryAddress: finalAddress,
          upiApp: activeUpiApp?.name || 'UPI',
        });

        // Close payment page and open Order Confirmation
        setTimeout(() => {
          setPaymentSessionVisible(false);
          setSuccessModalVisible(true);
        }, 1200);

        await refreshCartCount();
        await fetchCart(true);
      } else {
        setPaymentStatus('FAILED');
        showError('Payment verification could not be confirmed.', 'Payment Incomplete');
      }
    } catch (err: any) {
      setPaymentStatus('FAILED');
      console.error('Payment verification error:', err);
      showError(err.response?.data?.error || 'Payment not verified. Please retry.', 'Payment Not Done');
    }
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <SafeAreaView edges={['top']} className="bg-white border-b border-slate-200 shadow-2xs">
        <View className="px-4 py-3 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="flex-row items-center p-1"
          >
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>

          <View className="flex-row items-center">
            <ShoppingCart size={20} color="#2563eb" />
            <Text className="text-lg font-bold text-slate-900 ml-2">My Cart</Text>
            {items.length > 0 && (
              <View className="bg-blue-100 rounded-full px-2 py-0.5 ml-2">
                <Text className="text-xs font-bold text-blue-700">{items.length}</Text>
              </View>
            )}
          </View>

          {items.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearCart}
              className="p-1"
            >
              <Text className="text-xs font-semibold text-red-500">Clear</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-8" />
          )}
        </View>
      </SafeAreaView>

      {/* Content */}
      <SafeAreaView edges={['bottom']} className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-xs text-slate-500 mt-3 font-medium">Loading your cart...</Text>
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mb-4 border border-blue-100">
              <ShoppingCart size={36} color="#3b82f6" />
            </View>
            <Text className="text-xl font-bold text-slate-900 text-center mb-1.5">
              Your cart is empty
            </Text>
            <Text className="text-sm text-slate-500 text-center mb-6 leading-5 max-w-[280px]">
              Looks like you haven't added any products to your cart yet. Discover items from your trusted neighbourhood stores!
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/shops' as any)}
              className="bg-primary px-6 py-3.5 rounded-2xl flex-row items-center shadow-sm"
            >
              <Store size={18} color="#ffffff" className="mr-2" />
              <Text className="text-white font-bold text-sm">Explore Near by Shops</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-3"
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Select All Toggle Strip */}
            <View className="bg-white border border-slate-200/90 rounded-2xl p-3 mb-3 flex-row items-center justify-between shadow-2xs">
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={toggleSelectAll}
                className="flex-row items-center"
              >
                {isAllSelected ? (
                  <CheckSquare size={20} color="#2563eb" />
                ) : (
                  <Square size={20} color="#94a3b8" />
                )}
                <Text className="text-sm font-bold text-slate-800 ml-2.5">
                  Select All Items ({items.length})
                </Text>
              </TouchableOpacity>

              <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                <Text className="text-xs font-semibold text-slate-600">
                  {selectedItems.length} selected
                </Text>
              </View>
            </View>

            {/* Delivery address / promo strip */}
            <View className="bg-blue-50 border border-blue-200/60 rounded-2xl p-3 mb-3.5 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Tag size={15} color="#2563eb" />
                <Text className="text-xs font-semibold text-blue-800 ml-2">
                  {deliveryFee === 0 && selectedSubtotal > 0
                    ? '🎉 Free delivery applied on selected items!'
                    : `Add ₹${Math.max(0, 201 - selectedSubtotal)} more for FREE delivery`}
                </Text>
              </View>
              <CheckCircle2 size={16} color="#2563eb" />
            </View>

            {/* Cart Items List with Selection Checkbox */}
            <View className="gap-y-3 mb-4">
              {items.map((item) => {
                const isSelected = Boolean(selectedItemIds[item.id]);
                const isItemBusy = actionLoadingId === item.id;
                const shopName = item.product.shop?.name || 'Local Store';
                const shopLoc = item.product.shop?.location || 'Haveri Region';

                return (
                  <View
                    key={item.id}
                    className={`bg-white rounded-2xl p-3.5 border transition-all ${
                      isSelected ? 'border-blue-400 bg-blue-50/20 shadow-xs' : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    <View className="flex-row items-start">
                      {/* Selection Checkbox */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => toggleSelectItem(item.id)}
                        className="mr-3 pt-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare size={20} color="#2563eb" />
                        ) : (
                          <Square size={20} color="#94a3b8" />
                        )}
                      </TouchableOpacity>

                      {/* Item Image Thumbnail with Enlarger */}
                      <TouchableOpacity
                        activeOpacity={item.product.imageUrl ? 0.7 : 1}
                        onPress={() => {
                          if (item.product.imageUrl) {
                            setEnlargedImage({
                              url: item.product.imageUrl,
                              title: item.product.name,
                            });
                          }
                        }}
                        className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden mr-3 border border-slate-200 items-center justify-center relative"
                      >
                        {item.product.imageUrl ? (
                          <>
                            <Image
                              source={{ uri: item.product.imageUrl }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                            <View className="absolute bottom-0.5 right-0.5 bg-black/60 rounded px-1">
                              <Text className="text-[8px] text-white">🔍</Text>
                            </View>
                          </>
                        ) : (
                          <Store size={20} color="#94a3b8" />
                        )}
                      </TouchableOpacity>

                      {/* Item Details */}
                      <View className="flex-1 mr-2">
                        <Text className="font-bold text-sm text-slate-900 leading-tight">
                          {item.product.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Store size={11} color="#64748b" />
                          <Text className="text-[11px] text-slate-500 ml-1" numberOfLines={1}>
                            {shopName} · {shopLoc}
                          </Text>
                        </View>
                        <Text className="text-xs font-bold text-slate-800 mt-1.5">
                          ₹{item.product.price}{' '}
                          <Text className="text-slate-400 font-normal">/ {item.product.unit}</Text>
                        </Text>
                      </View>

                      {/* Remove Button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleRemoveItem(item.id, item.product.name)}
                        disabled={isItemBusy}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 self-start"
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Quantity + Item Total Row */}
                    <View className="flex-row items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
                      {/* Quantity Controller */}
                      <View className="flex-row items-center bg-slate-50 rounded-xl border border-slate-200 px-1 py-0.5">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          disabled={isItemBusy}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg items-center justify-center bg-white border border-slate-200"
                        >
                          <Minus size={12} color="#1e293b" />
                        </TouchableOpacity>

                        <Text className="px-3 text-xs font-bold text-slate-900">
                          {item.quantity}
                        </Text>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          disabled={isItemBusy}
                          onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg items-center justify-center bg-white border border-slate-200"
                        >
                          <Plus size={12} color="#1e293b" />
                        </TouchableOpacity>
                      </View>

                      {/* Total */}
                      <View className="flex-row items-baseline">
                        <Text className="text-xs text-slate-400 mr-1">Total:</Text>
                        <Text className="font-extrabold text-sm text-slate-900">
                          ₹{item.itemTotal}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Delivery Address & Location Selection Card */}
            <View className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <MapPin size={16} color="#ea580c" />
                  <Text className="font-extrabold text-sm text-slate-900 ml-1.5">
                    Delivery Address
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setAddressModalVisible(true)}
                  className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg flex-row items-center"
                >
                  <Edit3 size={11} color="#ea580c" />
                  <Text className="text-[11px] font-bold text-orange-700 ml-1">
                    Change / Add
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-slate-700 font-medium leading-4" numberOfLines={2}>
                {selectedAddress || 'Haveri, Karnataka'}
              </Text>

              <View className="flex-row items-center mt-2 pt-2 border-t border-slate-100">
                <Navigation size={12} color="#059669" />
                <Text className="text-[10px] text-emerald-700 font-bold ml-1">
                  Active location for UPI store billing & delivery
                </Text>
              </View>
            </View>

            {/* Bill Details Breakdown (Only for selected items) */}
            <View className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-3">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="font-extrabold text-sm text-slate-900">Bill Summary</Text>
                <Text className="text-xs font-bold text-blue-700">
                  {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs text-slate-500">Selected Items Total</Text>
                <Text className="text-xs font-bold text-slate-800">₹{selectedSubtotal}</Text>
              </View>

              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs text-slate-500">Delivery Fee</Text>
                <Text className={`text-xs font-bold ${deliveryFee === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-2.5">
                <Text className="text-xs text-slate-500">Platform Handling</Text>
                <Text className="text-xs font-bold text-emerald-600">FREE</Text>
              </View>

              <View className="h-[1px] bg-slate-100 my-1" />

              <View className="flex-row justify-between items-center pt-2">
                <Text className="text-sm font-extrabold text-slate-900">To Pay (Selected)</Text>
                <Text className="text-base font-extrabold text-primary">₹{grandTotal}</Text>
              </View>
            </View>

            {/* Safety Assurance */}
            <View className="flex-row items-center justify-center py-2 mb-2">
              <ShieldCheck size={15} color="#10b981" />
              <Text className="text-xs text-slate-500 font-medium ml-1.5">
                100% Genuine neighbourhood store products
              </Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Floating Bottom Checkout Bar */}
      {items.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex-row items-center justify-between shadow-lg">
          <View>
            <Text className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Total to Pay
            </Text>
            <Text className="text-xl font-black text-slate-900 leading-tight">
              ₹{grandTotal}
            </Text>
            <Text className="text-[11px] text-blue-600 font-semibold">
              {selectedItems.length} of {items.length} items chosen
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={selectedItems.length === 0}
            onPress={handleProceedToCheckout}
            className={`px-5 py-3 rounded-2xl flex-row items-center shadow-md ${
              selectedItems.length > 0 ? 'bg-primary' : 'bg-slate-300 opacity-60'
            }`}
          >
            <Text className="text-white font-bold text-sm mr-2">Proceed to Checkout</Text>
            <ArrowRight size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL 1: SELECT / ADD DELIVERY ADDRESS MODAL */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-3xl p-5 shadow-2xl max-h-[85%]">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center">
                <MapPin size={20} color="#ea580c" />
                <Text className="text-base font-extrabold text-slate-900 ml-2">
                  Delivery Location
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)} className="p-1">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
              {/* Option 1: Live GPS Auto Fetch Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isFetchingAutoLoc}
                onPress={handleAutoFetchLocation}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-3.5 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center mr-3 border border-emerald-300">
                    {isFetchingAutoLoc ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <Navigation size={18} color="#059669" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-emerald-900">
                      Auto-Detect Current GPS Location
                    </Text>
                    <Text className="text-[11px] text-emerald-700 mt-0.5" numberOfLines={1}>
                      {locality ? `Near ${locality}, Haveri` : 'Fetch device GPS coordinates'}
                    </Text>
                  </View>
                </View>
                <ArrowRight size={16} color="#059669" />
              </TouchableOpacity>

              {/* Option 2: Manually Type Place / Address */}
              <View className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-3.5">
                <Text className="text-xs font-extrabold text-slate-800 mb-1.5">
                  Type Place Name / Area Manually
                </Text>
                <View className="flex-row items-center bg-white border border-slate-300 rounded-xl px-3 py-2 mb-2.5">
                  <Edit3 size={15} color="#94a3b8" />
                  <TextInput
                    value={customAddressInput}
                    onChangeText={setCustomAddressInput}
                    maxLength={120}
                    placeholder="e.g. Shivaji Nagar, Near Bus Stand, Haveri"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 text-xs text-slate-800 ml-2"
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!customAddressInput.trim()}
                  onPress={() => handleSaveAndUseAddress(customAddressInput)}
                  className={`py-2.5 rounded-xl items-center justify-center ${
                    customAddressInput.trim() ? 'bg-primary' : 'bg-slate-200 opacity-60'
                  }`}
                >
                  <Text className="text-white text-xs font-bold">Save & Select This Address</Text>
                </TouchableOpacity>
              </View>

              {/* Option 3: Choose from Saved Address History */}
              {savedAddresses.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <History size={14} color="#64748b" />
                    <Text className="text-xs font-bold text-slate-700 ml-1.5 uppercase tracking-wider">
                      Saved Address History
                    </Text>
                  </View>

                  <View className="gap-y-2">
                    {savedAddresses.map((addr, idx) => {
                      const isSelected = selectedAddress === addr;
                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.75}
                          onPress={() => {
                            setSelectedAddress(addr);
                            setAddressModalVisible(false);
                            showSuccess('Selected address updated', 'Address Set');
                          }}
                          className={`p-3 rounded-xl border flex-row items-center justify-between ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-400'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <View className="flex-row items-center flex-1 mr-2">
                            <View
                              className={`w-7 h-7 rounded-lg items-center justify-center mr-2.5 ${
                                isSelected ? 'bg-blue-600' : 'bg-slate-100'
                              }`}
                            >
                              <MapPin size={13} color={isSelected ? '#ffffff' : '#64748b'} />
                            </View>
                            <Text
                              className={`text-xs flex-1 ${
                                isSelected ? 'font-black text-blue-900' : 'font-medium text-slate-800'
                              }`}
                              numberOfLines={2}
                            >
                              {addr}
                            </Text>
                          </View>
                          {isSelected && <Check size={16} color="#2563eb" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: UPI APP SELECTION SHEET */}
      <Modal
        visible={upiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUpiModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-3xl p-5 shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center">
                <CreditCard size={20} color="#2563eb" />
                <Text className="text-base font-extrabold text-slate-900 ml-2">
                  Choose UPI Payment App
                </Text>
              </View>
              <TouchableOpacity onPress={() => setUpiModalVisible(false)} className="p-1">
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Bill Summary in Sheet */}
            <View className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 my-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-600 font-medium">Paying To Store:</Text>
                <Text className="text-xs font-bold text-slate-900">
                  {selectedItems[0]?.product.shop?.name || 'Local Storefront'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs text-slate-600 font-medium">Merchant UPI Phone:</Text>
                <View className="flex-row items-center bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  <Text className="text-xs font-black text-blue-700">
                    {selectedItems[0]?.product.shop?.phone
                      ? selectedItems[0]?.product.shop?.phone.replace(/[^0-9]/g, '').slice(-10)
                      : '9449084242'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-2 border-t border-blue-200/60">
                <Text className="text-sm font-extrabold text-slate-900">Total Amount:</Text>
                <Text className="text-lg font-black text-blue-600">₹{grandTotal}</Text>
              </View>
            </View>

            {/* Delivery Destination in Sheet */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setUpiModalVisible(false);
                setAddressModalVisible(true);
              }}
              className="flex-row items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl mb-3.5"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <MapPin size={15} color="#ea580c" />
                <View className="ml-2 flex-1">
                  <Text className="text-[10px] font-bold text-slate-500 uppercase">Deliver To:</Text>
                  <Text className="text-xs text-slate-800 font-bold" numberOfLines={1}>
                    {selectedAddress || 'Haveri, Karnataka'}
                  </Text>
                </View>
              </View>
              <Text className="text-[10px] font-bold text-orange-600">Edit</Text>
            </TouchableOpacity>

            <Text className="text-xs font-extrabold text-slate-800 mb-2.5">
              Select Payment Service (Opens with 5-Minute Timer):
            </Text>

            {/* UPI Apps Grid with respective logos & names */}
            <View className="gap-y-2.5 mb-3">
              {/* PhonePe */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleStartUpiPayment('phonepe')}
                className="bg-[#f3e8ff] border border-[#d8b4fe] p-3 rounded-2xl flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#6739b7] items-center justify-center shadow-xs">
                    <Text style={{ fontSize: 18 }}>📱</Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-sm font-black text-[#581c87]">PhonePe</Text>
                    <Text className="text-[10px] text-[#7e22ce] font-medium">Instant UPI Transfer</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-black text-[#581c87]">₹{grandTotal}</Text>
                  <Text className="text-[9px] font-bold text-[#7e22ce]">PAY NOW</Text>
                </View>
              </TouchableOpacity>

              {/* Google Pay */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleStartUpiPayment('gpay')}
                className="bg-[#eff6ff] border border-[#bfdbfe] p-3 rounded-2xl flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#2563eb] items-center justify-center shadow-xs">
                    <Text style={{ fontSize: 18 }}>🌐</Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-sm font-black text-[#1e3a8a]">Google Pay (GPay)</Text>
                    <Text className="text-[10px] text-[#2563eb] font-medium">Tez UPI Payment</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-black text-[#1e3a8a]">₹{grandTotal}</Text>
                  <Text className="text-[9px] font-bold text-[#2563eb]">PAY NOW</Text>
                </View>
              </TouchableOpacity>

              {/* Paytm */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleStartUpiPayment('paytm')}
                className="bg-[#e0f2fe] border border-[#7dd3fc] p-3 rounded-2xl flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-[#0284c7] items-center justify-center shadow-xs">
                    <Text style={{ fontSize: 18 }}>💳</Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-sm font-black text-[#0369a1]">Paytm UPI</Text>
                    <Text className="text-[10px] text-[#0284c7] font-medium">Direct Bank Transfer</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-black text-[#0369a1]">₹{grandTotal}</Text>
                  <Text className="text-[9px] font-bold text-[#0284c7]">PAY NOW</Text>
                </View>
              </TouchableOpacity>

              {/* Universal UPI App (BHIM / Cred) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleStartUpiPayment('any')}
                className="bg-slate-900 p-3 rounded-2xl flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-slate-700">
                    <ExternalLink size={18} color="#ffffff" />
                  </View>
                  <View className="ml-3">
                    <Text className="text-sm font-black text-white">Other UPI (BHIM / Cred)</Text>
                    <Text className="text-[10px] text-slate-300 font-medium">Universal NPCI Gateway</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-black text-white">₹{grandTotal}</Text>
                  <Text className="text-[9px] font-bold text-slate-300">PAY NOW</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: 5-MINUTE CIRCULAR COUNTDOWN PAYMENT SESSION SCREEN */}
      <Modal
        visible={paymentSessionVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          Alert.alert(
            'Cancel Payment Session?',
            'If you exit before completing the UPI payment, your order will not be placed.',
            [
              { text: 'Wait', style: 'cancel' },
              {
                text: 'Cancel Payment',
                style: 'destructive',
                onPress: () => {
                  handleVerifyPaymentStatus(false);
                  setPaymentSessionVisible(false);
                },
              },
            ]
          );
        }}
      >
        <SafeAreaView className="flex-1 bg-[#0f172a]">
          <View className="flex-1 px-5 pt-3 pb-6 justify-between">
            {/* Top Bar with Cancel */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-800">
              <View className="flex-row items-center">
                <Clock size={18} color="#38bdf8" />
                <Text className="text-sm font-black text-white ml-2 tracking-wide uppercase">
                  UPI Payment Session
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Cancel Payment Session?',
                    'Are you sure you want to cancel? No order will be recorded.',
                    [
                      { text: 'Continue Payment', style: 'cancel' },
                      {
                        text: 'Cancel',
                        style: 'destructive',
                        onPress: () => {
                          handleVerifyPaymentStatus(false);
                          setPaymentSessionVisible(false);
                        },
                      },
                    ]
                  );
                }}
                className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700"
              >
                <Text className="text-slate-300 font-bold text-xs">Exit</Text>
              </TouchableOpacity>
            </View>

            {/* Central Circular Timer & Logo Form */}
            <View className="items-center py-6">
              {/* App Logo on Top */}
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  backgroundColor: activeUpiApp?.bg || '#1e293b',
                  borderWidth: 3,
                  borderColor: activeUpiApp?.color || '#38bdf8',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                  shadowColor: activeUpiApp?.color || '#38bdf8',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Text style={{ fontSize: 34 }}>
                  {activeUpiApp?.id === 'phonepe'
                    ? '📱'
                    : activeUpiApp?.id === 'gpay'
                    ? '🌐'
                    : activeUpiApp?.id === 'paytm'
                    ? '💳'
                    : '⚡'}
                </Text>
              </View>

              <Text className="text-xl font-black text-white mb-1">
                Paying via {activeUpiApp?.name || 'UPI'}
              </Text>
              <Text className="text-xs text-slate-400 mb-6 text-center">
                Complete payment of <Text className="font-bold text-emerald-400">₹{grandTotal}</Text> on your device.
              </Text>

              {/* Big Circular Form with Countdown Timer */}
              <View
                style={{
                  width: 210,
                  height: 210,
                  borderRadius: 105,
                  borderWidth: 6,
                  borderColor: timerSeconds < 60 ? '#ef4444' : '#38bdf8',
                  backgroundColor: '#1e293b',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: timerSeconds < 60 ? '#ef4444' : '#0284c7',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.4,
                  shadowRadius: 20,
                  elevation: 12,
                }}
              >
                {paymentStatus === 'VERIFYING' ? (
                  <View className="items-center">
                    <ActivityIndicator size="large" color="#38bdf8" />
                    <Text className="text-xs font-bold text-slate-300 mt-3">
                      Verifying Payment...
                    </Text>
                  </View>
                ) : paymentStatus === 'PAID' ? (
                  <View className="items-center">
                    <CheckCircle size={48} color="#22c55e" />
                    <Text className="text-sm font-black text-emerald-400 mt-2">
                      Payment Done!
                    </Text>
                  </View>
                ) : paymentStatus === 'FAILED' ? (
                  <View className="items-center">
                    <XCircle size={48} color="#ef4444" />
                    <Text className="text-sm font-black text-red-400 mt-2">
                      Payment Not Done
                    </Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <Clock size={24} color={timerSeconds < 60 ? '#f87171' : '#7dd3fc'} />
                    <Text
                      style={{
                        fontSize: 40,
                        fontWeight: '900',
                        color: timerSeconds < 60 ? '#ef4444' : '#ffffff',
                        letterSpacing: 2,
                        marginTop: 4,
                      }}
                    >
                      {formatTimer(timerSeconds)}
                    </Text>
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">
                      Time Remaining
                    </Text>
                  </View>
                )}
              </View>

              {/* VPA and merchant details */}
              <View className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 mt-6 w-full max-w-xs">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-[11px] text-slate-400">Store UPI Address:</Text>
                  <Text className="text-[11px] font-bold text-sky-400">{activeUpiApp?.vpa}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-[11px] text-slate-400">Store Name:</Text>
                  <Text className="text-[11px] font-bold text-white">
                    {selectedItems[0]?.product.shop?.name || 'Local Storefront'}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-[11px] text-slate-400">Deliver To:</Text>
                  <Text className="text-[11px] font-medium text-slate-300" numberOfLines={1}>
                    {selectedAddress || 'Haveri, Karnataka'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Bottom Actions: Strictly Verify Payment or Report Not Done */}
            <View className="gap-y-2.5">
              {paymentStatus === 'PAID' ? (
                <View className="bg-emerald-500/20 border border-emerald-500 p-3 rounded-2xl items-center flex-row justify-center">
                  <CheckCircle size={18} color="#22c55e" />
                  <Text className="text-emerald-300 font-extrabold text-xs ml-2">
                    Payment Verified Successfully! Placing Order...
                  </Text>
                </View>
              ) : paymentStatus === 'FAILED' ? (
                <View className="gap-y-2">
                  <View className="bg-red-500/20 border border-red-500 p-3 rounded-2xl items-center flex-row justify-center">
                    <XCircle size={18} color="#ef4444" />
                    <Text className="text-red-300 font-extrabold text-xs ml-2">
                      Payment Not Done / Cancelled
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setPaymentSessionVisible(false);
                      setUpiModalVisible(true);
                    }}
                    className="bg-slate-800 border border-slate-700 py-3 rounded-xl items-center justify-center flex-row"
                  >
                    <RotateCcw size={15} color="#ffffff" />
                    <Text className="text-white text-xs font-bold ml-2">
                      Retry Payment with Another UPI App
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Option 1: Payment Done button (triggers verification) */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={paymentStatus === 'VERIFYING'}
                    onPress={() => handleVerifyPaymentStatus(true)}
                    className="w-full bg-emerald-600 py-3.5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-emerald-500/30"
                  >
                    {paymentStatus === 'VERIFYING' ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#ffffff" />
                        <Text className="text-white font-extrabold text-sm ml-2">
                          I Have Paid ₹{grandTotal} • Confirm Order
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Option 2: Payment Not Done / Cancel button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={paymentStatus === 'VERIFYING'}
                    onPress={() => {
                      Alert.alert(
                        'Payment Not Completed?',
                        'Confirming that you did not complete the UPI payment. No order will be recorded.',
                        [
                          { text: 'Wait', style: 'cancel' },
                          {
                            text: 'Payment Not Done',
                            style: 'destructive',
                            onPress: () => handleVerifyPaymentStatus(false),
                          },
                        ]
                      );
                    }}
                    className="w-full bg-slate-800/80 border border-slate-700 py-3 rounded-2xl flex-row items-center justify-center"
                  >
                    <XCircle size={15} color="#94a3b8" />
                    <Text className="text-slate-300 font-bold text-xs ml-2">
                      Payment Not Done / Cancel
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL 4: ORDER SUCCESSFUL POPUP */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-3.5 border-2 border-emerald-300">
              <CheckCircle size={36} color="#059669" />
            </View>

            <Text className="text-xl font-black text-slate-900 text-center mb-1">
              Order Placed Successfully!
            </Text>

            <Text className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Your UPI payment has been received and verified. The store has received your order and location details.
            </Text>

            {placedOrderDetails && (
              <View className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 mb-4">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[11px] text-slate-500">Order ID:</Text>
                  <Text className="text-[11px] font-bold text-slate-800">{placedOrderDetails.id}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[11px] text-slate-500">Store Name:</Text>
                  <Text className="text-[11px] font-bold text-slate-800">{placedOrderDetails.shopName}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[11px] text-slate-500">Amount Paid:</Text>
                  <Text className="text-[11px] font-extrabold text-emerald-700">₹{placedOrderDetails.totalAmount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-[11px] text-slate-500">Delivery Address:</Text>
                  <Text className="text-[11px] font-bold text-slate-800" numberOfLines={1}>
                    {placedOrderDetails.deliveryAddress}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-[11px] text-slate-500">Payment Mode:</Text>
                  <Text className="text-[11px] font-bold text-blue-700">
                    {placedOrderDetails.upiApp || 'UPI'} (Verified)
                  </Text>
                </View>
              </View>
            )}

            <View className="w-full gap-2">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.push('/orders' as any);
                }}
                className="w-full bg-primary py-3 rounded-xl items-center justify-center shadow-sm"
              >
                <Text className="text-white text-xs font-bold">View in My Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setSuccessModalVisible(false);
                  router.push('/shops' as any);
                }}
                className="w-full bg-slate-100 py-2.5 rounded-xl items-center justify-center"
              >
                <Text className="text-slate-700 text-xs font-bold">Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Enlarger Lightbox */}
      <ImageEnlargerModal
        visible={!!enlargedImage}
        imageUrl={enlargedImage?.url || null}
        title={enlargedImage?.title}
        onClose={() => setEnlargedImage(null)}
      />
    </View>
  );
}
