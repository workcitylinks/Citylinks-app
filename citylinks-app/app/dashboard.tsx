import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  ShieldCheck,
  Store,
  Wrench,
  Truck,
  Laptop,
  User,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  PhoneOff,
  Mail,
  Layers,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  Package,
  Calendar,
  ExternalLink,
  Menu,
  X,
  BarChart2,
  Bell,
  ArrowRight,
  ShoppingBag,
  PartyPopper,
  FileSpreadsheet,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useProfile, useJoinRequests, JoinRequestItem } from '../queries/marketplaceQueries';
import { apiClient } from '../api/apiClient';

export default function DashboardScreen() {
  const { userData, refreshAuth, isShopPhoneEnabled, refreshPhoneSetting } = useApp();
  const { profile, refetch: refetchProfile } = useProfile();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const { requests, loading: loadingRequests, refetch: refetchRequests } = useJoinRequests(activeTab);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Active user details
  const activeUser = profile || userData;
  const currentRole = (activeUser?.role || 'CUSTOMER').toUpperCase();

  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const isMerchant = currentRole === 'MERCHANT';
  const isLabor = currentRole === 'LABOR';
  const isTransport = currentRole === 'TRANSPORT';
  const isDeveloper = currentRole === 'DEVELOPER';

  // Fetch Merchant's Storefront Details
  const [shop, setShop] = useState<any | null>(null);
  const [loadingShop, setLoadingShop] = useState(false);

  const fetchShop = async () => {
    if (!isMerchant) return;
    try {
      setLoadingShop(true);
      const res = await apiClient.get('/shops/my-shop');
      if (res.data?.shop) {
        setShop(res.data.shop);
      }
    } catch (err) {
      console.warn('Could not fetch shop in dashboard:', err);
    } finally {
      setLoadingShop(false);
    }
  };

  React.useEffect(() => {
    fetchShop();
  }, [isMerchant, userData?.id]);

  // Re-fetch shop details whenever returning to dashboard screen
  useFocusEffect(
    React.useCallback(() => {
      if (isMerchant) {
        fetchShop();
      }
    }, [isMerchant])
  );

  // Super Admin: Phone Management Setting
  const [showShopPhone, setShowShopPhone] = useState(isShopPhoneEnabled);
  const [loadingPhoneSetting, setLoadingPhoneSetting] = useState(false);
  const [updatingPhoneSetting, setUpdatingPhoneSetting] = useState(false);

  // Keep local state in sync with AppContext
  React.useEffect(() => {
    setShowShopPhone(isShopPhoneEnabled);
  }, [isShopPhoneEnabled]);

  const fetchPhoneSetting = async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingPhoneSetting(true);
      await refreshPhoneSetting();
    } catch (err) {
      console.warn('Could not fetch phone settings:', err);
    } finally {
      setLoadingPhoneSetting(false);
    }
  };

  const handleTogglePhoneDisplay = async (nextVal: boolean) => {
    try {
      setUpdatingPhoneSetting(true);
      setShowShopPhone(nextVal);
      const res = await apiClient.put('/admin/phone-settings', { showShopPhone: nextVal });
      if (res.data?.success) {
        // Invalidate mobile query cache so all shop listings reload fresh data immediately
        try {
          const { queryCache } = require('../utils/queryCache');
          queryCache.invalidate('/shops');
          queryCache.invalidate('/marketplace');
        } catch (e) {}

        await refreshPhoneSetting();

        showSuccess(
          nextVal
            ? 'Phone icons are now ACTIVE and visible on shop listings'
            : 'Phone icons are now HIDDEN from all users & customers'
        );
      }
    } catch (err: any) {
      setShowShopPhone(!nextVal); // revert on error
      showError(err.response?.data?.error || 'Failed to update phone settings');
    } finally {
      setUpdatingPhoneSetting(false);
    }
  };

  React.useEffect(() => {
    if (isSuperAdmin) {
      fetchPhoneSetting();
    }
  }, [isSuperAdmin, userData?.id]);

  const getRoleHeaderInfo = () => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
        return {
          title: 'SUPER ADMIN',
          tag: 'System Administrator & Approver',
          color: '#7c3aed',
          bg: '#f5f3ff',
          border: '#ddd6fe',
          icon: ShieldCheck,
        };
      case 'MERCHANT':
        return {
          title: 'SHOP KEEPER / MERCHANT',
          tag: 'Store & Retail Business Partner',
          color: '#ea580c',
          bg: '#fff7ed',
          border: '#fed7aa',
          icon: Store,
        };
      case 'LABOR':
        return {
          title: 'SERVICE PROVIDER',
          tag: 'Digital & Local Service Specialist',
          color: '#16a34a',
          bg: '#f0fdf4',
          border: '#bbf7d0',
          icon: Wrench,
        };
      case 'TRANSPORT':
        return {
          title: 'TRANSPORT OPERATOR',
          tag: 'Fleet & Mobility Partner',
          color: '#0891b2',
          bg: '#ecfeff',
          border: '#a5f3fc',
          icon: Truck,
        };
      case 'DEVELOPER':
        return {
          title: 'DEVELOPER',
          tag: 'System Architect & Engineering Console',
          color: '#0284c7',
          bg: '#f0f9ff',
          border: '#bae6fd',
          icon: Laptop,
        };
      default:
        return {
          title: 'CUSTOMER',
          tag: 'Verified User',
          color: '#2563eb',
          bg: '#eff6ff',
          border: '#bfdbfe',
          icon: User,
        };
    }
  };

  const roleInfo = getRoleHeaderInfo();
  const HeaderIcon = roleInfo.icon;

  const handleApprove = async (request: JoinRequestItem) => {
    try {
      setProcessingId(request.id);
      const res = await apiClient.patch(`/join-requests/${request.id}/approve`);
      showSuccess(
        `Approved ${request.shopName}! The user is now converted to their role.`,
        'Joiner Approved'
      );
      await refetchRequests();
      await refreshAuth();
      await refetchProfile();
    } catch (err: any) {
      console.error('Approve error:', err);
      showError(err.response?.data?.error || 'Failed to approve join request', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: JoinRequestItem) => {
    try {
      setProcessingId(request.id);
      await apiClient.patch(`/join-requests/${request.id}/reject`, {
        reason: 'Application does not meet current criteria',
      });
      showSuccess(`Application for ${request.shopName} was rejected.`, 'Rejected');
      await refetchRequests();
    } catch (err: any) {
      console.error('Reject error:', err);
      showError(err.response?.data?.error || 'Failed to reject join request', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Navbar */}
        <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100">
          {isSuperAdmin ? (
            /* 3-lines Menu Section for Super Admin */
            <TouchableOpacity
              onPress={() => setAdminMenuOpen(true)}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center border border-purple-200"
            >
              <Menu size={22} color="#7c3aed" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
            >
              <ChevronLeft size={22} color="#1e293b" />
            </TouchableOpacity>
          )}

          <View className="items-center">
            <Text className="text-lg font-bold text-slate-900">
              {isSuperAdmin ? 'Super Admin Hub' : 'Partner Dashboard'}
            </Text>
            <Text className="text-xs text-slate-400">
              {isSuperAdmin ? 'Governance & Approvals' : 'CityLinks Business Hub'}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            <TouchableOpacity
              onPress={() => {
                refetchRequests();
                refetchProfile();
              }}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
            >
              <RefreshCw size={18} color="#64748b" />
            </TouchableOpacity>
            {isSuperAdmin && (
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
              >
                <ChevronLeft size={22} color="#1e293b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP ROLE BANNER WITH ALL USER & SHOP DETAILS */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderColor: roleInfo.border,
            borderWidth: 1.5,
            overflow: 'hidden',
          }}
          className="rounded-3xl p-4.5 mb-5 shadow-sm"
        >
          {/* Role Header Badge */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                style={{ backgroundColor: roleInfo.bg }}
                className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
              >
                <HeaderIcon size={22} color={roleInfo.color} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap gap-1.5">
                  <Text
                    style={{ color: roleInfo.color }}
                    className="text-sm font-black tracking-wide uppercase"
                  >
                    {roleInfo.title}
                  </Text>
                  <View
                    style={{ backgroundColor: roleInfo.bg, borderColor: roleInfo.border }}
                    className="px-2 py-0.5 rounded-full border"
                  >
                    <Text
                      style={{ color: roleInfo.color }}
                      className="text-[10px] font-bold uppercase"
                    >
                      Active
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                  {roleInfo.tag}
                </Text>
              </View>
            </View>
          </View>

          {/* 1. SHOP DETAILS (Displayed when user is Merchant) */}
          {isMerchant && (
            <View
              style={{
                backgroundColor: '#fff7ed',
                borderColor: '#fed7aa',
                borderWidth: 1,
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                overflow: 'hidden',
              }}
            >
              {/* Section Header */}
              <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-orange-200">
                <View className="flex-row items-center flex-1 mr-2">
                  <Store size={15} color="#ea580c" />
                  <Text className="text-xs font-black text-orange-950 uppercase tracking-wider ml-1.5">
                    Storefront Information
                  </Text>
                </View>
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Text className="text-[10px] font-bold text-emerald-800">
                    Live in Directory
                  </Text>
                </View>
              </View>

              {/* Shop Name */}
              <View className="flex-row items-center justify-between py-1 border-b border-orange-100">
                <Text className="text-xs font-bold text-orange-900" style={{ flexShrink: 0 }}>
                  Shop Name
                </Text>
                <Text
                  className="text-xs font-black text-slate-900 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={1}
                >
                  {shop?.name || 'My Storefront'}
                </Text>
              </View>

              {/* Shop Category */}
              <View className="flex-row items-center justify-between py-1 border-b border-orange-100">
                <Text className="text-xs font-bold text-orange-900" style={{ flexShrink: 0 }}>
                  Category
                </Text>
                <View className="bg-white px-2 py-0.5 rounded-md border border-orange-200">
                  <Text className="text-[11px] font-extrabold text-orange-700">
                    {shop?.category || 'Retail'}
                  </Text>
                </View>
              </View>

              {/* Shop Address / Location */}
              <View className="flex-row items-center justify-between py-1 border-b border-orange-100">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <MapPin size={13} color="#ea580c" />
                  <Text className="text-xs font-bold text-orange-900 ml-1">Store Location</Text>
                </View>
                <Text
                  className="text-xs font-semibold text-slate-800 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={2}
                >
                  {shop?.address || shop?.location || activeUser?.address || 'Haveri, Karnataka'}
                </Text>
              </View>

              {/* Store Phone */}
              <View className="flex-row items-center justify-between py-1 border-b border-orange-100">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <Phone size={13} color="#ea580c" />
                  <Text className="text-xs font-bold text-orange-900 ml-1">Store Phone</Text>
                </View>
                <Text
                  className="text-xs font-semibold text-slate-800 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={1}
                >
                  {shop?.phone || activeUser?.phone || 'Not Provided'}
                </Text>
              </View>

              {/* Store Email */}
              {Boolean(shop?.email || activeUser?.email) && (
                <View className="flex-row items-center justify-between py-1 border-b border-orange-100">
                  <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                    <Mail size={13} color="#ea580c" />
                    <Text className="text-xs font-bold text-orange-900 ml-1">Store Email</Text>
                  </View>
                  <Text
                    className="text-xs font-semibold text-slate-800 text-right"
                    style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                    numberOfLines={1}
                  >
                    {shop?.email || activeUser?.email}
                  </Text>
                </View>
              )}

              {/* Catalog Items */}
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <Package size={13} color="#ea580c" />
                  <Text className="text-xs font-bold text-orange-900 ml-1">Catalog Items</Text>
                </View>
                <Text className="text-xs font-black text-orange-700 text-right">
                  {shop?.products ? `${shop.products.length} Products Listed` : '0 Products Listed'}
                </Text>
              </View>

              {/* Storefront Photo preview if attached */}
              {Boolean(shop?.imageUrl) && (
                <View className="mt-2.5 pt-2 border-t border-orange-200">
                  <Text className="text-[10px] font-bold text-orange-900 uppercase tracking-wider mb-1.5">
                    Storefront Photo
                  </Text>
                  <Image
                    source={{ uri: shop.imageUrl }}
                    style={{ width: '100%', height: 110, borderRadius: 12 }}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}

          {/* 2. OWNER & PERSONAL ACCOUNT DETAILS GRID */}
          <View
            style={{
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
              borderWidth: 1,
              borderRadius: 18,
              padding: 14,
              overflow: 'hidden',
            }}
          >
            {/* Header for Personal Details */}
            <View className="flex-row items-center justify-between pb-2 mb-2 border-b border-slate-200">
              <View className="flex-row items-center">
                <User size={14} color="#64748b" />
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1.5">
                  Account Owner Details
                </Text>
              </View>
              <Text className="text-[10px] font-bold text-slate-400">Personal Info</Text>
            </View>

            {/* Full Name */}
            <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200">
              <Text className="text-xs font-semibold text-slate-500" style={{ flexShrink: 0 }}>
                Account Name
              </Text>
              <Text
                className="text-xs font-bold text-slate-900 text-right"
                style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                numberOfLines={1}
              >
                {activeUser?.fullName || activeUser?.firstName || 'CityLinks Partner'}
              </Text>
            </View>

            {/* Email */}
            <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200">
              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                <Mail size={13} color="#94a3b8" />
                <Text className="text-xs font-semibold text-slate-500 ml-1.5">Owner Email</Text>
              </View>
              <Text
                className="text-xs font-medium text-slate-700 text-right"
                style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                numberOfLines={1}
              >
                {activeUser?.email || 'N/A'}
              </Text>
            </View>

            {/* Phone */}
            <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200">
              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                <Phone size={13} color="#94a3b8" />
                <Text className="text-xs font-semibold text-slate-500 ml-1.5">Owner Phone</Text>
              </View>
              <Text
                className="text-xs font-medium text-slate-700 text-right"
                style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                numberOfLines={1}
              >
                {activeUser?.phone || 'Not Provided'}
              </Text>
            </View>

            {/* Operating Area */}
            <View className="flex-row items-center justify-between py-1.5">
              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                <MapPin size={13} color="#94a3b8" />
                <Text className="text-xs font-semibold text-slate-500 ml-1.5">Operating Area</Text>
              </View>
              <Text
                className="text-xs font-medium text-slate-700 text-right"
                style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                numberOfLines={2}
              >
                {activeUser?.address || 'Haveri District, Karnataka'}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION: SUPER ADMIN -> APPROVE JOINERS, GUI ANALYSER & BROADCAST NOTIFICATIONS LAUNCH CARDS */}
        {isSuperAdmin && (
          <View className="mb-6 space-y-3">
            {/* Quick Actions Row 1 */}
            <View className="flex-row gap-3 mb-3">
              {/* Card 1: Dedicated Approve Joiners Desk */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/admin-approvals' as any)}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#ddd6fe',
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                }}
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center mb-2">
                  <ShieldCheck size={20} color="#7c3aed" />
                </View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-slate-900">Approve Joiners</Text>
                  <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-purple-800">
                      {requests.filter((r) => r.status === 'PENDING').length}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] text-slate-400">
                  Open dedicated approval desk
                </Text>
              </TouchableOpacity>

              {/* Card 2: Dedicated GUI Analyser */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/admin-analytics' as any)}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#bae6fd',
                  shadowColor: '#0284c7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                }}
              >
                <View className="w-10 h-10 rounded-xl bg-sky-50 items-center justify-center mb-2">
                  <BarChart2 size={20} color="#0284c7" />
                </View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-slate-900">GUI Analyser</Text>
                  <View className="bg-sky-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-sky-800">Live</Text>
                  </View>
                </View>
                <Text className="text-[11px] text-slate-400">
                  User demographics & roles
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions Row: Sponsored Shops & Services Manager */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/admin-sponsored' as any)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 14,
                borderWidth: 1.5,
                borderColor: '#fde68a',
                shadowColor: '#d97706',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-xl bg-amber-50 items-center justify-center mr-3 border border-amber-200">
                  <Sparkles size={22} color="#d97706" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900">Sponsored Shops & Services</Text>
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-amber-800">⭐ Promote</Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    Toggle sponsored promotions for shops & services on homepage
                  </Text>
                </View>
              </View>
              <ArrowRight size={18} color="#d97706" />
            </TouchableOpacity>

            {/* Quick Actions Row 2: Broadcast Notifications Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/admin-notification' as any)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 14,
                borderWidth: 1.5,
                borderColor: '#fed7aa',
                shadowColor: '#f97316',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-xl bg-amber-50 items-center justify-center mr-3 border border-amber-200">
                  <Bell size={22} color="#d97706" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900">Broadcast Notifications</Text>
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-amber-800">24-Hr Alert</Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    Send department alerts that auto-delete after 24 hours
                  </Text>
                </View>
              </View>
              <ArrowRight size={18} color="#d97706" />
            </TouchableOpacity>

            {/* Quick Actions Row 3: Phone Management Toggle Card */}
            <View
              style={{
                backgroundColor: showShopPhone ? '#f0fdf4' : '#ffffff',
                borderRadius: 20,
                padding: 15,
                borderWidth: 1.5,
                borderColor: showShopPhone ? '#bbf7d0' : '#e2e8f0',
                shadowColor: showShopPhone ? '#16a34a' : '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                marginTop: 3,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-3">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: showShopPhone ? '#dcfce7' : '#f1f5f9',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: showShopPhone ? '#86efac' : '#e2e8f0',
                    }}
                  >
                    {showShopPhone ? (
                      <Phone size={22} color="#16a34a" />
                    ) : (
                      <PhoneOff size={22} color="#64748b" />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <Text className="text-sm font-bold text-slate-900">Phone Management</Text>
                      <View
                        style={{
                          backgroundColor: showShopPhone ? '#22c55e' : '#64748b',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#ffffff' }}>
                          {showShopPhone ? 'CALL ICON VISIBLE' : 'CALL ICON HIDDEN'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-slate-500">
                      {showShopPhone
                        ? 'Shop phone call icons are visible to all users & customers.'
                        : 'Phone call icons & numbers are completely hidden from all users.'}
                    </Text>
                  </View>
                </View>

                {updatingPhoneSetting || loadingPhoneSetting ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <Switch
                    value={showShopPhone}
                    onValueChange={handleTogglePhoneDisplay}
                    trackColor={{ false: '#cbd5e1', true: '#22c55e' }}
                    thumbColor={showShopPhone ? '#ffffff' : '#ffffff'}
                    ios_backgroundColor="#cbd5e1"
                  />
                )}
              </View>
            </View>
          </View>
        )}

        {/* SECTION: ROLE-SPECIFIC FEATURES */}
        {isMerchant && (
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
            <View className="flex-row items-center mb-3">
              <Store size={18} color="#ea580c" />
              <Text className="text-base font-bold text-slate-900 ml-2">
                Storefront & Catalog Management
              </Text>
            </View>
            <Text className="text-xs text-slate-500 leading-relaxed mb-4">
              Your store is registered in Haveri directory. Manage products, update pricing, location GPS, and receive orders from local customers.
            </Text>
            <View className="gap-2.5">
              {/* Card 1: Shop Keeper Console */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/merchant-dashboard' as any)}
                className="w-full p-3.5 rounded-2xl bg-orange-600 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                    <Store size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">Shop Keeper Console</Text>
                    <Text className="text-[11px] text-orange-100 mt-0.5">Manage products, stock & pricing</Text>
                  </View>
                </View>
                <ArrowRight size={17} color="#ffffff" />
              </TouchableOpacity>

              {/* Card 2: Received Orders */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/received-orders',
                    params: {
                      shopId: shop?.id,
                      shopName: shop?.name || 'My Store',
                      tab: 'received',
                    },
                  } as any)
                }
                className="w-full p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200/90 flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-xl bg-orange-100 items-center justify-center mr-3">
                    <Package size={20} color="#ea580c" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">Received Orders</Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">Pending customer orders & dispatch</Text>
                  </View>
                </View>
                <ArrowRight size={16} color="#ea580c" />
              </TouchableOpacity>

              {/* Card 3: Delivered Orders */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/received-orders',
                    params: {
                      shopId: shop?.id,
                      shopName: shop?.name || 'My Store',
                      tab: 'delivered',
                    },
                  } as any)
                }
                className="w-full p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200/90 flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center mr-3">
                    <CheckCircle size={20} color="#7c3aed" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">Delivered Orders</Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">Completed & received fulfillment history</Text>
                  </View>
                </View>
                <ArrowRight size={16} color="#7c3aed" />
              </TouchableOpacity>

              {/* Card 4: ITR & Financial Ledger Audit */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: '/received-orders',
                    params: {
                      shopId: shop?.id,
                      shopName: shop?.name || 'My Store',
                      tab: 'audit',
                    },
                  } as any)
                }
                className="w-full p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/90 flex-row items-center justify-between shadow-2xs"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center mr-3">
                    <FileSpreadsheet size={20} color="#2563eb" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">ITR & Financial Ledger Audit</Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5">Daily/weekly/monthly sums, CSV & XLS</Text>
                  </View>
                </View>
                <ArrowRight size={16} color="#2563eb" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLabor && (
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
            <View className="flex-row items-center mb-3">
              <Wrench size={18} color="#16a34a" />
              <Text className="text-base font-bold text-slate-900 ml-2">
                Service Provider Console
              </Text>
            </View>
            <Text className="text-xs text-slate-500 leading-relaxed mb-4">
              Your digital services profile is active. Receive service leads and work requests across Haveri.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/digital-services' as any)}
              className="py-3 rounded-xl bg-emerald-50 border border-emerald-200 items-center"
            >
              <Text className="text-xs font-bold text-emerald-700">
                Explore Digital Services Directory
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isTransport && (
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
            <View className="flex-row items-center mb-3">
              <Truck size={18} color="#0891b2" />
              <Text className="text-base font-bold text-slate-900 ml-2">
                Transport Fleet Dispatch
              </Text>
            </View>
            <Text className="text-xs text-slate-500 leading-relaxed mb-4">
              Your commercial vehicle or passenger service is listed for quick passenger pickup and freight delivery.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/book-transport' as any)}
              className="py-3 rounded-xl bg-cyan-50 border border-cyan-200 items-center"
            >
              <Text className="text-xs font-bold text-cyan-700">Open Transport Center</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* SUPER ADMIN DRAWER MENU (3-LINES MENU POPUP) */}
      <Modal
        visible={adminMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAdminMenuOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setAdminMenuOpen(false)}
          />

          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 40,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 20,
            }}
          >
            {/* Header Handle */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: '#cbd5e1',
                }}
              />
            </View>

            {/* Menu Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
                  Super Admin Console
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  System tools & administrative operations
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAdminMenuOpen(false)}
                activeOpacity={0.7}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Menu Action Items */}
            <View style={{ gap: 12 }}>
              {/* 1. APPROVE JOINERS */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  router.push('/admin-approvals' as any);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#faf5ff',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#e9d5ff',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#ede9fe',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <ShieldCheck size={24} color="#7c3aed" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#581c87' }}>
                      Approve Joiners
                    </Text>
                    {requests.filter((r) => r.status === 'PENDING').length > 0 && (
                      <View
                        style={{
                          backgroundColor: '#7c3aed',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                          {requests.filter((r) => r.status === 'PENDING').length} PENDING
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: '#7e22ce', marginTop: 2 }}>
                    Review partner applications & upgrade user roles
                  </Text>
                </View>

                <ArrowRight size={18} color="#7c3aed" />
              </TouchableOpacity>

              {/* 2. GUI ANALYSER */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  router.push('/admin-analytics' as any);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f0f9ff',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#bae6fd',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#e0f2fe',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <BarChart2 size={24} color="#0284c7" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#075985' }}>
                      GUI Analyser
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#0284c7',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        TELEMETRY
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#0369a1', marginTop: 2 }}>
                    Active user demographics, roles & graphical charts
                  </Text>
                </View>

                <ArrowRight size={18} color="#0284c7" />
              </TouchableOpacity>

              {/* 3. BROADCAST NOTIFICATIONS */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  router.push('/admin-notification' as any);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fffbeb',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#fde68a',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#fef3c7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Bell size={22} color="#d97706" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#92400e' }}>
                      Broadcast Notifications
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#d97706',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        24-HR ALERT
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                    Push 24-hr department notices to citizens & partners
                  </Text>
                </View>

                <ArrowRight size={18} color="#d97706" />
              </TouchableOpacity>

              {/* 4. SPONSORED LISTINGS */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  router.push('/admin-sponsored' as any);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fffbeb',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#fde68a',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#fef3c7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Sparkles size={22} color="#d97706" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#92400e' }}>
                      Sponsored Listings
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#d97706',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        SHOPS & SERVICES
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                    Manage sponsored promotions on customer homepage
                  </Text>
                </View>

                <ArrowRight size={18} color="#d97706" />
              </TouchableOpacity>

              {/* 5. SHOP PHONE MANAGEMENT */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: showShopPhone ? '#f0fdf4' : '#f8fafc',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: showShopPhone ? '#bbf7d0' : '#e2e8f0',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: showShopPhone ? '#dcfce7' : '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  {showShopPhone ? (
                    <Phone size={22} color="#16a34a" />
                  ) : (
                    <PhoneOff size={22} color="#64748b" />
                  )}
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        color: showShopPhone ? '#14532d' : '#334155',
                      }}
                    >
                      Shop Phone Display
                    </Text>
                    <View
                      style={{
                        backgroundColor: showShopPhone ? '#16a34a' : '#64748b',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        {showShopPhone ? 'CALL VISIBLE' : 'CALL HIDDEN'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: showShopPhone ? '#166534' : '#64748b',
                      marginTop: 2,
                    }}
                  >
                    {showShopPhone
                      ? 'Phone icons are active on shop listings'
                      : 'Phone icons are hidden from all customers'}
                  </Text>
                </View>

                {updatingPhoneSetting || loadingPhoneSetting ? (
                  <ActivityIndicator size="small" color="#16a34a" />
                ) : (
                  <Switch
                    value={showShopPhone}
                    onValueChange={handleTogglePhoneDisplay}
                    trackColor={{ false: '#cbd5e1', true: '#22c55e' }}
                    thumbColor="#ffffff"
                    ios_backgroundColor="#cbd5e1"
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
