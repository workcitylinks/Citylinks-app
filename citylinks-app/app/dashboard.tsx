import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
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
  Tag,
  Percent,
  TrendingUp,
  Camera,
  Image as ImageIcon,
  Plus,
  Globe,
  Headphones,
  MessageSquare,
  Briefcase,
  Car,
  Navigation,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useProfile, useJoinRequests, JoinRequestItem } from '../queries/marketplaceQueries';
import { apiClient } from '../api/apiClient';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { getManualServiceCoverImage, getDigitalServiceCoverImage } from '../utils/serviceImages';

export default function DashboardScreen() {
  const { userData, refreshAuth, isShopPhoneEnabled, refreshPhoneSetting } = useApp();
  const { profile, refetch: refetchProfile } = useProfile();
  const { showSuccess, showError } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const { requests, loading: loadingRequests, refetch: refetchRequests } = useJoinRequests(activeTab);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // Active user details & roles
  const activeUser = profile || userData;
  const currentRole = (activeUser?.role || 'CUSTOMER').toUpperCase();

  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const isMerchant = currentRole === 'MERCHANT';
  const isManualService = currentRole === 'MANUAL_SERVICE_PROVIDER' || currentRole === 'LABOR';
  const isDigitalService = currentRole === 'DIGITAL_SERVICE_PROVIDER';
  const isTransport = currentRole === 'TRANSPORT';
  const isDeveloper = currentRole === 'DEVELOPER';

  // Partner Manual Services & Deals
  const [partnerManualServices, setPartnerManualServices] = useState<any[]>([]);
  const [partnerManualDeals, setPartnerManualDeals] = useState<any[]>([]);
  const [loadingPartnerManual, setLoadingPartnerManual] = useState(false);

  // Partner Digital Services & Deals
  const [partnerDigitalServices, setPartnerDigitalServices] = useState<any[]>([]);
  const [partnerDigitalDeals, setPartnerDigitalDeals] = useState<any[]>([]);
  const [loadingPartnerDigital, setLoadingPartnerDigital] = useState(false);

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

  const fetchPartnerManualData = async () => {
    if (!isManualService) return;
    try {
      setLoadingPartnerManual(true);
      const pName = activeUser?.fullName ? `${activeUser.fullName} Services` : '';
      const [sRes, dRes] = await Promise.allSettled([
        apiClient.get('/services', { params: { all: 'true', providerName: pName } }),
        apiClient.get('/deals', { params: { merchantName: pName } }),
      ]);
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value.data)) {
        setPartnerManualServices(sRes.value.data);
      }
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value.data)) {
        setPartnerManualDeals(dRes.value.data);
      }
    } catch (err) {
      console.warn('Could not fetch partner manual data:', err);
    } finally {
      setLoadingPartnerManual(false);
    }
  };

  const fetchPartnerDigitalData = async () => {
    if (!isDigitalService) return;
    try {
      setLoadingPartnerDigital(true);
      const sName = activeUser?.fullName ? `${activeUser.fullName} Digital Studio` : '';
      const [sRes, dRes] = await Promise.allSettled([
        apiClient.get('/marketplace/digital-providers', { params: { all: 'true', providerName: sName } }),
        apiClient.get('/deals', { params: { merchantName: sName } }),
      ]);
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value.data)) {
        setPartnerDigitalServices(sRes.value.data);
      }
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value.data)) {
        setPartnerDigitalDeals(dRes.value.data);
      }
    } catch (err) {
      console.warn('Could not fetch partner digital data:', err);
    } finally {
      setLoadingPartnerDigital(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAuth(),
        refetchProfile(),
        refetchRequests(),
        refreshPhoneSetting(),
        isMerchant ? fetchShop() : Promise.resolve(),
        isManualService ? fetchPartnerManualData() : Promise.resolve(),
        isDigitalService ? fetchPartnerDigitalData() : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Refresh dashboard error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchShop();
    if (isManualService) fetchPartnerManualData();
    if (isDigitalService) fetchPartnerDigitalData();
  }, [isMerchant, isManualService, isDigitalService, userData?.id]);

  // Re-fetch partner details whenever returning to dashboard screen
  useFocusEffect(
    React.useCallback(() => {
      if (isMerchant) fetchShop();
      if (isManualService) fetchPartnerManualData();
      if (isDigitalService) fetchPartnerDigitalData();
    }, [isMerchant, isManualService, isDigitalService])
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
        } catch (e) { }

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

  // Service Categories & Domains for Super Admin
  const ADMIN_MANUAL_CATEGORIES = [
    'Plumbing',
    'Electrician',
    'Carpentry',
    'Cleaning',
    'Painting',
    'Appliance Repair',
    'Mechanic',
    'Masonry',
    'Welding',
    'General',
  ];

  const ADMIN_DIGITAL_DOMAINS = [
    'Website Creation',
    'Blog & Content writing',
    'Poster & Social media Creatives',
    'Local & Targeted Ads',
    'website hosting & Support',
    'Ad campaingn setup & management',
    'Influencer collaboration',
    'local business promotion',
    'Other',
  ];

  // Super Admin: Add Manual Service Modal State
  const [adminAddManualModalOpen, setAdminAddManualModalOpen] = useState(false);
  const [adminManualTitle, setAdminManualTitle] = useState('');
  const [adminManualCategory, setAdminManualCategory] = useState(ADMIN_MANUAL_CATEGORIES[0]);
  const [adminManualProvider, setAdminManualProvider] = useState('');
  const [adminManualPhone, setAdminManualPhone] = useState('');
  const [adminManualPrice, setAdminManualPrice] = useState('₹249 onwards');
  const [adminManualLocation, setAdminManualLocation] = useState('Haveri Region');
  const [adminManualDesc, setAdminManualDesc] = useState('');
  const [adminManualImage, setAdminManualImage] = useState<string | null>(null);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [pickingManualImage, setPickingManualImage] = useState(false);

  const handleTakeAdminManualPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a service banner photo.', 'Permission Needed');
        return;
      }
      setPickingManualImage(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAdminManualImage(result.assets[0].uri);
        showSuccess('Manual service photo captured!', 'Success');
      }
    } catch (err: any) {
      showError('Failed to capture photo from camera.', 'Camera Error');
    } finally {
      setPickingManualImage(false);
    }
  };

  const handlePickAdminManualGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to select a service banner photo.', 'Permission Needed');
        return;
      }
      setPickingManualImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAdminManualImage(result.assets[0].uri);
        showSuccess('Manual service photo selected!', 'Success');
      }
    } catch (err: any) {
      showError('Failed to select photo from gallery.', 'Gallery Error');
    } finally {
      setPickingManualImage(false);
    }
  };

  const handleAdminCreateManualService = async () => {
    if (!adminManualTitle.trim()) {
      showError('Service title is required (e.g. Pipe Leakage Fix)', 'Missing Title');
      return;
    }
    if (!adminManualProvider.trim()) {
      showError('Provider or business name is required', 'Missing Provider');
      return;
    }
    try {
      setSubmittingManual(true);
      await apiClient.post('/services', {
        title: adminManualTitle.trim(),
        category: adminManualCategory.trim(),
        providerName: adminManualProvider.trim(),
        phone: adminManualPhone.trim() || undefined,
        priceLabel: adminManualPrice.trim() || '₹249 onwards',
        location: adminManualLocation.trim() || 'Haveri Region',
        description: adminManualDesc.trim() || undefined,
        imageUrl: adminManualImage || undefined,
        isAvailable: true,
      });
      showSuccess(`Manual service "${adminManualTitle.trim()}" published to Book Services!`, 'Service Published');
      try {
        const { queryCache } = require('../utils/queryCache');
        queryCache.invalidate('/services');
        queryCache.invalidate('/services/categories');
      } catch (e) { }
      setAdminManualTitle('');
      setAdminManualProvider('');
      setAdminManualPhone('');
      setAdminManualDesc('');
      setAdminManualImage(null);
      setAdminAddManualModalOpen(false);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to publish manual service', 'Error');
    } finally {
      setSubmittingManual(false);
    }
  };

  // Super Admin: Add Digital Service Modal State
  const [adminAddDigitalModalOpen, setAdminAddDigitalModalOpen] = useState(false);
  const [adminDigitalName, setAdminDigitalName] = useState('');
  const [adminDigitalDomain, setAdminDigitalDomain] = useState(ADMIN_DIGITAL_DOMAINS[0]);
  const [adminDigitalOffering, setAdminDigitalOffering] = useState('');
  const [adminDigitalPhone, setAdminDigitalPhone] = useState('');
  const [adminDigitalPrice, setAdminDigitalPrice] = useState('₹2,999 onwards');
  const [adminDigitalLocation, setAdminDigitalLocation] = useState('Online & Haveri Region');
  const [adminDigitalBadge, setAdminDigitalBadge] = useState('Verified');
  const [adminDigitalImage, setAdminDigitalImage] = useState<string | null>(null);
  const [submittingDigital, setSubmittingDigital] = useState(false);
  const [pickingDigitalImage, setPickingDigitalImage] = useState(false);

  const handleTakeAdminDigitalPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a portfolio banner photo.', 'Permission Needed');
        return;
      }
      setPickingDigitalImage(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAdminDigitalImage(result.assets[0].uri);
        showSuccess('Digital specialist photo captured!', 'Success');
      }
    } catch (err: any) {
      showError('Failed to capture photo from camera.', 'Camera Error');
    } finally {
      setPickingDigitalImage(false);
    }
  };

  const handlePickAdminDigitalGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to select a portfolio banner photo.', 'Permission Needed');
        return;
      }
      setPickingDigitalImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAdminDigitalImage(result.assets[0].uri);
        showSuccess('Digital specialist photo selected!', 'Success');
      }
    } catch (err: any) {
      showError('Failed to select photo from gallery.', 'Gallery Error');
    } finally {
      setPickingDigitalImage(false);
    }
  };

  const handleAdminCreateDigitalService = async () => {
    if (!adminDigitalName.trim()) {
      showError('Specialist or company name is required', 'Missing Specialist');
      return;
    }
    try {
      setSubmittingDigital(true);
      await apiClient.post('/marketplace/digital-providers', {
        name: adminDigitalName.trim(),
        serviceType: adminDigitalDomain.trim(),
        priceLabel: adminDigitalPrice.trim() || '₹2,999 onwards',
        phone: adminDigitalPhone.trim() || undefined,
        location: adminDigitalLocation.trim() || 'Online & Haveri Region',
        description: adminDigitalOffering.trim() || undefined,
        badge: adminDigitalBadge.trim() || 'Verified',
        imageUrl: adminDigitalImage || undefined,
        isAvailable: true,
      });
      showSuccess(`Digital specialist "${adminDigitalName.trim()}" published to Digital Services!`, 'Specialist Published');
      try {
        const { queryCache } = require('../utils/queryCache');
        queryCache.invalidate('/marketplace/digital-providers');
        queryCache.invalidate('/marketplace/digital-services');
      } catch (e) { }
      setAdminDigitalName('');
      setAdminDigitalOffering('');
      setAdminDigitalPhone('');
      setAdminDigitalImage(null);
      setAdminAddDigitalModalOpen(false);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to publish digital service', 'Error');
    } finally {
      setSubmittingDigital(false);
    }
  };

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
      case 'MANUAL_SERVICE_PROVIDER':
      case 'LABOR':
        return {
          title: 'MANUAL SERVICE PROVIDER',
          tag: 'Technician, Repair & Manual Work Specialist',
          color: '#16a34a',
          bg: '#f0fdf4',
          border: '#bbf7d0',
          icon: Wrench,
        };
      case 'DIGITAL_SERVICE_PROVIDER':
        return {
          title: 'DIGITAL SERVICE PROVIDER',
          tag: 'Digital Solutions, Web & Media Specialist',
          color: '#8b5cf6',
          bg: '#f5f3ff',
          border: '#ddd6fe',
          icon: Sparkles,
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
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
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

          {/* 1.B MANUAL SERVICE PROVIDER TRADE PROFILE */}
          {isManualService && (
            <View
              style={{
                backgroundColor: '#f0fdf4',
                borderColor: '#bbf7d0',
                borderWidth: 1,
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                overflow: 'hidden',
              }}
            >
              {/* Section Header */}
              <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-200">
                <View className="flex-row items-center flex-1 mr-2">
                  <Wrench size={15} color="#16a34a" />
                  <Text className="text-xs font-black text-emerald-950 uppercase tracking-wider ml-1.5">
                    Trade & Service Profile
                  </Text>
                </View>
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  <Text className="text-[10px] font-bold text-emerald-800">
                    Live in Book Services
                  </Text>
                </View>
              </View>

              {/* Service Brand */}
              <View className="flex-row items-center justify-between py-1 border-b border-emerald-100">
                <Text className="text-xs font-bold text-emerald-900" style={{ flexShrink: 0 }}>
                  Service Brand
                </Text>
                <Text
                  className="text-xs font-black text-slate-900 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={1}
                >
                  {activeUser?.fullName ? `${activeUser.fullName} Services` : 'My Technical Services'}
                </Text>
              </View>

              {/* Trade Specialization */}
              <View className="flex-row items-center justify-between py-1 border-b border-emerald-100">
                <Text className="text-xs font-bold text-emerald-900" style={{ flexShrink: 0 }}>
                  Trade Specialization
                </Text>
                <View className="bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  <Text className="text-[11px] font-extrabold text-emerald-700">
                    Technician & Manual Trades
                  </Text>
                </View>
              </View>

              {/* Coverage Area */}
              <View className="flex-row items-center justify-between py-1 border-b border-emerald-100">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <MapPin size={13} color="#16a34a" />
                  <Text className="text-xs font-bold text-emerald-900 ml-1">Coverage Area</Text>
                </View>
                <Text
                  className="text-xs font-semibold text-slate-800 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={2}
                >
                  {activeUser?.address || 'Haveri District & Nearby Taluks'}
                </Text>
              </View>

              {/* Direct Dispatch Phone */}
              <View className="flex-row items-center justify-between py-1 border-b border-emerald-100">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <Phone size={13} color="#16a34a" />
                  <Text className="text-xs font-bold text-emerald-900 ml-1">Direct Call Phone</Text>
                </View>
                <Text
                  className="text-xs font-semibold text-slate-800 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={1}
                >
                  {activeUser?.phone || 'Not Provided'}
                </Text>
              </View>

              {/* Trade Listings Count */}
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <Package size={13} color="#16a34a" />
                  <Text className="text-xs font-bold text-emerald-900 ml-1">Trade Listings</Text>
                </View>
                <Text className="text-xs font-black text-emerald-700 text-right">
                  {partnerManualServices.length > 0
                    ? `${partnerManualServices.length} Trade Services Active`
                    : 'Ready to List Services'}
                </Text>
              </View>
            </View>
          )}

          {/* 1.C DIGITAL SERVICE PROVIDER STUDIO PROFILE */}
          {isDigitalService && (
            <View
              style={{
                backgroundColor: '#f5f3ff',
                borderColor: '#ddd6fe',
                borderWidth: 1,
                borderRadius: 18,
                padding: 14,
                marginBottom: 12,
                overflow: 'hidden',
              }}
            >
              {/* Section Header */}
              <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-purple-200">
                <View className="flex-row items-center flex-1 mr-2">
                  <Sparkles size={15} color="#7c3aed" />
                  <Text className="text-xs font-black text-purple-950 uppercase tracking-wider ml-1.5">
                    Digital Studio & Expertise Profile
                  </Text>
                </View>
                <View className="bg-purple-100 px-2 py-0.5 rounded-full border border-purple-300">
                  <Text className="text-[10px] font-bold text-purple-800">
                    Live in Digital Services
                  </Text>
                </View>
              </View>

              {/* Studio Brand */}
              <View className="flex-row items-center justify-between py-1 border-b border-purple-100">
                <Text className="text-xs font-bold text-purple-900" style={{ flexShrink: 0 }}>
                  Studio Brand
                </Text>
                <Text
                  className="text-xs font-black text-slate-900 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={1}
                >
                  {activeUser?.fullName ? `${activeUser.fullName} Digital Studio` : 'My Digital Studio'}
                </Text>
              </View>

              {/* Specialization Domain */}
              <View className="flex-row items-center justify-between py-1 border-b border-purple-100">
                <Text className="text-xs font-bold text-purple-900" style={{ flexShrink: 0 }}>
                  Specialization Domain
                </Text>
                <View className="bg-white px-2 py-0.5 rounded-md border border-purple-200">
                  <Text className="text-[11px] font-extrabold text-purple-700">
                    Digital Solutions & Online Services
                  </Text>
                </View>
              </View>

              {/* Delivery Mode */}
              <View className="flex-row items-center justify-between py-1 border-b border-purple-100">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <Globe size={13} color="#7c3aed" />
                  <Text className="text-xs font-bold text-purple-900 ml-1">Delivery Mode</Text>
                </View>
                <Text
                  className="text-xs font-semibold text-slate-800 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={2}
                >
                  Online Worldwide & Haveri District
                </Text>
              </View>

              {/* Inquiry Phone */}
              <View className="flex-row items-center justify-between py-1 border-b border-purple-100">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <Phone size={13} color="#7c3aed" />
                  <Text className="text-xs font-bold text-purple-900 ml-1">Inquiry Phone</Text>
                </View>
                <Text
                  className="text-xs font-semibold text-slate-800 text-right"
                  style={{ flex: 1, flexShrink: 1, marginLeft: 10 }}
                  numberOfLines={1}
                >
                  {activeUser?.phone || 'Not Provided'}
                </Text>
              </View>

              {/* Digital Packages Count */}
              <View className="flex-row items-center justify-between py-1">
                <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                  <Laptop size={13} color="#7c3aed" />
                  <Text className="text-xs font-bold text-purple-900 ml-1">Digital Packages</Text>
                </View>
                <Text className="text-xs font-black text-purple-700 text-right">
                  {partnerDigitalServices.length > 0
                    ? `${partnerDigitalServices.length} Digital Offerings Active`
                    : 'Ready to List Offerings'}
                </Text>
              </View>
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

            {/* Quick Actions Row: Service Providers Management (Manual & Digital) */}
            <View className="flex-row gap-3 mb-3">
              {/* Card: Manual Services (Book Services) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAdminAddManualModalOpen(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#bbf7d0',
                  shadowColor: '#16a34a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                }}
              >
                <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mb-2 border border-emerald-100">
                  <Wrench size={20} color="#16a34a" />
                </View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-slate-900">Manual Services</Text>
                  <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-emerald-800">+ ADD</Text>
                  </View>
                </View>
                <Text className="text-[11px] text-slate-400">
                  Add trades & technician services to Book Services
                </Text>
              </TouchableOpacity>

              {/* Card: Digital Services (Specialists Hub) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAdminAddDigitalModalOpen(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#e9d5ff',
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                }}
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center mb-2 border border-purple-100">
                  <Sparkles size={20} color="#7c3aed" />
                </View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-bold text-slate-900">Digital Services</Text>
                  <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-purple-800">+ ADD</Text>
                  </View>
                </View>
                <Text className="text-[11px] text-slate-400">
                  Add developers, creators & marketing specialists
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions Row: Deals & Offers Hub */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/admin-deals' as any)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 14,
                borderWidth: 1.5,
                borderColor: '#fef08a',
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
                  <Tag size={22} color="#d97706" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-900">Deals & Offers Hub</Text>
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-amber-800">🔥 Broadcast Deals</Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    Add promotional deals & broadcast push alerts to all citizens
                  </Text>
                </View>
              </View>
              <ArrowRight size={18} color="#d97706" />
            </TouchableOpacity>

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
        {(isMerchant || isSuperAdmin) && (
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

        {/* SECTION: SUPER ADMIN SPECIFIC SERVICE MANAGEMENT CARDS */}
        {isSuperAdmin && (
          <View className="mb-5 space-y-5">
            {/* Super Admin Manual Services Management Card */}
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
              <View className="flex-row items-center mb-3">
                <Wrench size={18} color="#16a34a" />
                <Text className="text-base font-bold text-slate-900 ml-2">
                  Manual Service Provider Management (Super Admin)
                </Text>
              </View>
              <Text className="text-xs text-slate-500 leading-relaxed mb-4">
                Add new technician & trade services directly into Book Services directory or open provider console.
              </Text>
              <View className="gap-2.5">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAdminAddManualModalOpen(true)}
                  style={{
                    backgroundColor: '#15803d',
                    paddingVertical: 13,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    shadowColor: '#15803d',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Plus size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    + Add Manual Service (Book Services)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/manual-service-dashboard' as any)}
                  className="w-full p-3.5 rounded-2xl bg-emerald-600 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                      <Wrench size={20} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">Manual Service Console</Text>
                      <Text className="text-[11px] text-emerald-100 mt-0.5">Manage trade listings, prices & deals</Text>
                    </View>
                  </View>
                  <ArrowRight size={17} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/services' as any)}
                  className="py-3 rounded-xl bg-emerald-50 border border-emerald-200 items-center"
                >
                  <Text className="text-xs font-bold text-emerald-700">
                    Explore Book Services Directory
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Super Admin Digital Services Management Card */}
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
              <View className="flex-row items-center mb-3">
                <Sparkles size={18} color="#8b5cf6" />
                <Text className="text-base font-bold text-slate-900 ml-2">
                  Digital Service Provider Management (Super Admin)
                </Text>
              </View>
              <Text className="text-xs text-slate-500 leading-relaxed mb-4">
                Add new specialist packages directly into Digital Services directory or open specialist console.
              </Text>
              <View className="gap-2.5">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAdminAddDigitalModalOpen(true)}
                  style={{
                    backgroundColor: '#7c3aed',
                    paddingVertical: 13,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    shadowColor: '#7c3aed',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Plus size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    + Add Digital Service (Digital Services)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/digital-service-dashboard' as any)}
                  className="w-full p-3.5 rounded-2xl bg-purple-600 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                      <Sparkles size={20} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">Digital Specialist Console</Text>
                      <Text className="text-[11px] text-purple-100 mt-0.5">Manage digital skills, domains & deals</Text>
                    </View>
                  </View>
                  <ArrowRight size={17} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/digital-services' as any)}
                  className="py-3 rounded-xl bg-purple-50 border border-purple-200 items-center"
                >
                  <Text className="text-xs font-bold text-purple-700">
                    Explore Digital Services Directory
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* SECTION: MANUAL SERVICE PROVIDER DEDICATED PARTNER HUB */}
        {isManualService && (
          <View className="mb-4">
            {/* 1. Quick Performance Metrics 4-Grid */}
            <View className="flex-row flex-wrap gap-2.5 mb-4">
              {/* Metric 1: Active Trade Listings */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#bbf7d0',
                  shadowColor: '#16a34a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center mb-2 border border-emerald-100">
                  <Wrench size={17} color="#16a34a" />
                </View>
                <Text className="text-xl font-black text-slate-900">
                  {partnerManualServices.length}
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Active Trade Listings
                </Text>
              </View>

              {/* Metric 2: Citizen Deals */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#fed7aa',
                  shadowColor: '#ea580c',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-orange-50 items-center justify-center mb-2 border border-orange-100">
                  <Tag size={17} color="#ea580c" />
                </View>
                <Text className="text-xl font-black text-slate-900">
                  {partnerManualDeals.length}
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Broadcast Deals Live
                </Text>
              </View>

              {/* Metric 3: Partner Verification */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#bae6fd',
                  shadowColor: '#0284c7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-sky-50 items-center justify-center mb-2 border border-sky-100">
                  <ShieldCheck size={17} color="#0284c7" />
                </View>
                <Text className="text-base font-black text-slate-900">
                  Verified Pro
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  CityLinks Certified
                </Text>
              </View>

              {/* Metric 4: Direct Dispatch */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#ddd6fe',
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center mb-2 border border-purple-100">
                  <Clock size={17} color="#7c3aed" />
                </View>
                <Text className="text-base font-black text-slate-900">
                  Fast Dispatch
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Direct Citizen Calls
                </Text>
              </View>
            </View>

            {/* 2. Operations & Management Hub (4 Rich Action Cards) */}
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Wrench size={18} color="#16a34a" />
                  <Text className="text-base font-bold text-slate-900 ml-2">
                    Trade Operations & Services Console
                  </Text>
                </View>

              </View>
              <Text className="text-xs text-slate-500 leading-relaxed mb-4">
                Your trade profile is active across Haveri. Manage your service listings, pricing, availability status, promotional deals, and directory reach.
              </Text>

              <View className="gap-2.5">
                {/* Action 1: Manual Service Console (Primary Featured Card) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/manual-service-dashboard' as any)}
                  className="w-full p-3.5 rounded-2xl bg-emerald-600 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                      <Wrench size={20} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">Manual Service Console</Text>
                      <Text className="text-[11px] text-emerald-100 mt-0.5">
                        Manage trade listings, prices & deals
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={17} color="#ffffff" />
                </TouchableOpacity>

                {/* Action 2: Deals & Offers Promotional Broadcast */}


                {/* Action 3: Explore Book Services Directory (Live Customer View) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/services' as any)}
                  style={{
                    backgroundColor: '#ecfdf5',
                    borderColor: '#a7f3d0',
                    borderWidth: 1.5,
                  }}
                  className="w-full p-3.5 rounded-2xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-emerald-100 items-center justify-center mr-3 border border-emerald-200">
                      <ExternalLink size={19} color="#059669" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-slate-900">Book Services Directory</Text>
                        <View className="bg-emerald-200 px-1.5 py-0.2 rounded-full">
                          <Text className="text-[9px] font-extrabold text-emerald-900">CITIZEN VIEW</Text>
                        </View>
                      </View>
                      <Text className="text-[11px] text-slate-500 mt-0.5">
                        Preview how customers discover and call you
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={16} color="#059669" />
                </TouchableOpacity>

                {/* Action 4: Quick Add Trade Service */}

              </View>
            </View>

            {/* 3. Live Trade Listings Preview Section */}
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
              <View className="flex-row items-center justify-between mb-3.5">
                <View className="flex-row items-center">
                  <Package size={17} color="#16a34a" />
                  <Text className="text-sm font-black text-slate-900 ml-1.5">
                    Your Live Trade Listings ({partnerManualServices.length})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/manual-service-dashboard' as any)}
                  className="flex-row items-center"
                >
                  <Text className="text-xs font-bold text-emerald-700 mr-1">Manage All</Text>
                  <ArrowRight size={12} color="#059669" />
                </TouchableOpacity>
              </View>

              {partnerManualServices.length > 0 ? (
                <View className="gap-2.5">
                  {partnerManualServices.slice(0, 3).map((item, idx) => (
                    <TouchableOpacity
                      key={item.id || idx}
                      activeOpacity={0.8}
                      onPress={() => router.push('/manual-service-dashboard' as any)}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <Image
                          source={{ uri: getManualServiceCoverImage(item) }}
                          style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10 }}
                          resizeMode="cover"
                        />
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View className="flex-row items-center gap-1.5 mt-0.5">
                            <View className="bg-emerald-100 px-1.5 py-0.2 rounded">
                              <Text className="text-[10px] font-bold text-emerald-800">
                                {item.category || 'Trade'}
                              </Text>
                            </View>
                            <Text className="text-[11px] font-extrabold text-emerald-700">
                              {item.priceLabel || '₹249 onwards'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <Text className="text-[10px] font-bold text-slate-600">Active</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 items-center text-center">
                  <View className="w-12 h-12 rounded-2xl bg-emerald-100 items-center justify-center mb-2.5">
                    <Wrench size={22} color="#16a34a" />
                  </View>
                  <Text className="text-sm font-bold text-slate-800 text-center mb-1">
                    No Trade Services Listed Yet
                  </Text>
                  <Text className="text-xs text-slate-500 text-center mb-3 px-2">
                    Add your trade offerings (Plumbing, Electrical, Carpentry, Repairs) so local citizens across Haveri can call and book you directly.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push('/manual-service-dashboard' as any)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 flex-row items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} color="#ffffff" strokeWidth={2.5} />
                    <Text className="text-xs font-bold text-white">Add Your First Trade Service</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
        )}

        {/* SECTION: DIGITAL SERVICE PROVIDER DEDICATED PARTNER HUB */}
        {isDigitalService && (
          <View className="mb-4">
            {/* 1. Quick Performance Metrics 4-Grid */}
            <View className="flex-row flex-wrap gap-2.5 mb-4">
              {/* Metric 1: Active Digital Offerings */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#ddd6fe',
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center mb-2 border border-purple-100">
                  <Laptop size={17} color="#7c3aed" />
                </View>
                <Text className="text-xl font-black text-slate-900">
                  {partnerDigitalServices.length}
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Digital Packages Live
                </Text>
              </View>

              {/* Metric 2: Citizen Deals */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#fed7aa',
                  shadowColor: '#ea580c',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-orange-50 items-center justify-center mb-2 border border-orange-100">
                  <Tag size={17} color="#ea580c" />
                </View>
                <Text className="text-xl font-black text-slate-900">
                  {partnerDigitalDeals.length}
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Broadcast Deals Live
                </Text>
              </View>

              {/* Metric 3: Specialist Verification */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#bae6fd',
                  shadowColor: '#0284c7',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-sky-50 items-center justify-center mb-2 border border-sky-100">
                  <ShieldCheck size={17} color="#0284c7" />
                </View>
                <Text className="text-base font-black text-slate-900">
                  Verified Pro
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  CityLinks Certified
                </Text>
              </View>

              {/* Metric 4: Remote Work Mode */}
              <View
                style={{
                  flex: 1,
                  minWidth: '47%',
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 1.5,
                  borderColor: '#c7d2fe',
                  shadowColor: '#4f46e5',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 5,
                }}
              >
                <View className="w-9 h-9 rounded-xl bg-indigo-50 items-center justify-center mb-2 border border-indigo-100">
                  <Globe size={17} color="#4f46e5" />
                </View>
                <Text className="text-base font-black text-slate-900">
                  100% Remote
                </Text>
                <Text className="text-[11px] font-bold text-slate-400 mt-0.5">
                  Online Delivery Mode
                </Text>
              </View>
            </View>

            {/* 2. Operations & Management Hub (4 Rich Action Cards) */}
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Sparkles size={18} color="#7c3aed" />
                  <Text className="text-base font-bold text-slate-900 ml-2">
                    Digital Studio & Specialist Console
                  </Text>
                </View>

              </View>
              <Text className="text-xs text-slate-500 leading-relaxed mb-4">
                Your digital solutions profile is active across Haveri and online. Manage your digital packages, pricing, deliverables, promotional deals, and client inquiries.
              </Text>

              <View className="gap-2.5">
                {/* Action 1: Digital Specialist Console (Primary Featured Card) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/digital-service-dashboard' as any)}
                  className="w-full p-3.5 rounded-2xl bg-purple-600 flex-row items-center justify-between shadow-sm"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                      <Sparkles size={20} color="#ffffff" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-white">Digital Specialist Console</Text>
                      <Text className="text-[11px] text-purple-100 mt-0.5">
                        Manage digital skills, domains & deals
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={17} color="#ffffff" />
                </TouchableOpacity>



                {/* Action 3: Explore Digital Services Directory (Live Client View) */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/digital-services' as any)}
                  style={{
                    backgroundColor: '#faf5ff',
                    borderColor: '#e9d5ff',
                    borderWidth: 1.5,
                  }}
                  className="w-full p-3.5 rounded-2xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center mr-3 border border-purple-200">
                      <ExternalLink size={19} color="#7c3aed" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-bold text-slate-900">Digital Services Directory</Text>
                        <View className="bg-purple-200 px-1.5 py-0.2 rounded-full">
                          <Text className="text-[9px] font-extrabold text-purple-900">CLIENT VIEW</Text>
                        </View>
                      </View>
                      <Text className="text-[11px] text-slate-500 mt-0.5">
                        Preview how clients discover and contact your studio
                      </Text>
                    </View>
                  </View>
                  <ArrowRight size={16} color="#7c3aed" />
                </TouchableOpacity>


              </View>
            </View>

            {/* 3. Live Digital Offerings Preview Section */}
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
              <View className="flex-row items-center justify-between mb-3.5">
                <View className="flex-row items-center">
                  <Laptop size={17} color="#7c3aed" />
                  <Text className="text-sm font-black text-slate-900 ml-1.5">
                    Your Live Digital Offerings ({partnerDigitalServices.length})
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/digital-service-dashboard' as any)}
                  className="flex-row items-center"
                >
                  <Text className="text-xs font-bold text-purple-700 mr-1">Manage All</Text>
                  <ArrowRight size={12} color="#7c3aed" />
                </TouchableOpacity>
              </View>

              {partnerDigitalServices.length > 0 ? (
                <View className="gap-2.5">
                  {partnerDigitalServices.slice(0, 3).map((item, idx) => (
                    <TouchableOpacity
                      key={item.id || idx}
                      activeOpacity={0.8}
                      onPress={() => router.push('/digital-service-dashboard' as any)}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <Image
                          source={{ uri: getDigitalServiceCoverImage(item) }}
                          style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10 }}
                          resizeMode="cover"
                        />
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                            {item.title || item.name}
                          </Text>
                          <View className="flex-row items-center gap-1.5 mt-0.5">
                            <View className="bg-purple-100 px-1.5 py-0.2 rounded">
                              <Text className="text-[10px] font-bold text-purple-800">
                                {item.category || item.domain || 'Digital'}
                              </Text>
                            </View>
                            <Text className="text-[11px] font-extrabold text-purple-700">
                              {item.priceLabel || '₹2,999 onwards'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <Text className="text-[10px] font-bold text-slate-600">Active</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 items-center text-center">
                  <View className="w-12 h-12 rounded-2xl bg-purple-100 items-center justify-center mb-2.5">
                    <Sparkles size={22} color="#7c3aed" />
                  </View>
                  <Text className="text-sm font-bold text-slate-800 text-center mb-1">
                    No Digital Offerings Listed Yet
                  </Text>
                  <Text className="text-xs text-slate-500 text-center mb-3 px-2">
                    Add your digital service packages (Websites, Graphic Design, Video, Marketing) so businesses and clients can hire your studio directly.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push('/digital-service-dashboard' as any)}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 flex-row items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} color="#ffffff" strokeWidth={2.5} />
                    <Text className="text-xs font-bold text-white">Add Your First Digital Offering</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
        )}

        {isTransport && !isSuperAdmin && (
          <View className="bg-white rounded-3xl p-5 border border-blue-200 shadow-sm mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center mr-2.5">
                  <Truck size={19} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-base font-bold text-slate-900">
                    Transport Fleet Console
                  </Text>
                  <Text className="text-[11px] text-blue-600 font-semibold">
                    Driver & Fleet Manager (Max 3 Vehicles)
                  </Text>
                </View>
              </View>
            </View>

            <Text className="text-xs text-slate-500 leading-relaxed mb-4">
              Manage your driver registration details, official license, live online status, and register up to 3 vehicles (Car, Auto Rickshaw, Bike Taxi, or Commercial) under your ID.
            </Text>

            <View className="gap-2.5">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/transport-dashboard' as any)}
                className="w-full p-3.5 rounded-2xl bg-blue-600 flex-row items-center justify-between shadow-sm shadow-blue-200"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center mr-3">
                    <Car size={20} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">Open Driver Fleet Console</Text>
                    <Text className="text-[11px] text-blue-100 mt-0.5">Manage up to 3 vehicles, rates & live trips</Text>
                  </View>
                </View>
                <ArrowRight size={17} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/book-transport' as any)}
                className="py-3 rounded-xl bg-slate-50 border border-slate-200 items-center justify-center flex-row gap-1.5"
              >
                <Navigation size={14} color="#475569" />
                <Text className="text-xs font-bold text-slate-700">View Public Passenger Map</Text>
              </TouchableOpacity>
            </View>
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

              {/* 5. DEALS & OFFERS MANAGER */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  router.push('/admin-deals' as any);
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
                  <Tag size={22} color="#d97706" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#92400e' }}>
                      Deals & Offers Manager
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
                        PROMOTIONS
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                    Publish platform deals & broadcast alerts to citizens
                  </Text>
                </View>

                <ArrowRight size={18} color="#d97706" />
              </TouchableOpacity>

              {/* 6. ADD MANUAL SERVICE */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  setAdminAddManualModalOpen(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#bbf7d0',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#dcfce7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Wrench size={22} color="#16a34a" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#14532d' }}>
                      + Add Manual Service
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#16a34a',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        BOOK SERVICES
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                    Publish trade & repair service to Book Services
                  </Text>
                </View>

                <Plus size={20} color="#16a34a" />
              </TouchableOpacity>

              {/* 7. ADD DIGITAL SERVICE */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  setAdminAddDigitalModalOpen(true);
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
                    backgroundColor: '#f3e8ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Sparkles size={22} color="#9333ea" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#581c87' }}>
                      + Add Digital Service
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#9333ea',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        DIGITAL HUB
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#7e22ce', marginTop: 2 }}>
                    Publish digital specialist to Digital Services
                  </Text>
                </View>

                <Plus size={20} color="#9333ea" />
              </TouchableOpacity>

              {/* 8. MANUAL SERVICE CONSOLE */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  router.push('/manual-service-dashboard' as any);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#bbf7d0',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: '#dcfce7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Wrench size={22} color="#16a34a" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#14532d' }}>
                      Manual Service Console
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#16a34a',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        PROVIDER HUB
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                    Manage technician services, rates & deals
                  </Text>
                </View>

                <ArrowRight size={18} color="#16a34a" />
              </TouchableOpacity>

              {/* 7. DIGITAL SPECIALIST CONSOLE */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAdminMenuOpen(false);
                  router.push('/digital-service-dashboard' as any);
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
                    backgroundColor: '#f3e8ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Sparkles size={22} color="#9333ea" />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#581c87' }}>
                      Digital Specialist Console
                    </Text>
                    <View
                      style={{
                        backgroundColor: '#9333ea',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ffffff' }}>
                        DIGITAL HUB
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#7e22ce', marginTop: 2 }}>
                    Manage digital domains, packages & deals
                  </Text>
                </View>

                <ArrowRight size={18} color="#9333ea" />
              </TouchableOpacity>

              {/* 8. SHOP PHONE MANAGEMENT */}
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

      {/* MODAL 1: SUPER ADMIN -> ADD MANUAL SERVICE */}
      <Modal visible={adminAddManualModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                    + Add Manual Service
                  </Text>
                  <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700', marginTop: 2 }}>
                    Publish to Book Services Directory (Super Admin)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAdminAddManualModalOpen(false)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* 1. Service Title */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Title *
                  </Text>
                  <TextInput
                    value={adminManualTitle}
                    onChangeText={setAdminManualTitle}
                    placeholder="e.g. Electric Wiring & Switchboard Repair"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 2. Category Chips */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Trade Category *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {ADMIN_MANUAL_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setAdminManualCategory(cat)}
                        style={{
                          backgroundColor: adminManualCategory === cat ? '#16a34a' : '#f0fdf4',
                          borderColor: adminManualCategory === cat ? '#16a34a' : '#bbf7d0',
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: adminManualCategory === cat ? '#ffffff' : '#15803d' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 3. Provider / Technician Name */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Provider / Technician / Agency Name *
                  </Text>
                  <TextInput
                    value={adminManualProvider}
                    onChangeText={setAdminManualProvider}
                    placeholder="e.g. Ramesh Electrical & Hardware"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 4. Phone & Price */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                      Contact Phone
                    </Text>
                    <TextInput
                      value={adminManualPhone}
                      onChangeText={setAdminManualPhone}
                      keyboardType="phone-pad"
                      placeholder="e.g. 9449084242"
                      placeholderTextColor="#94a3b8"
                      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                      Price Label
                    </Text>
                    <TextInput
                      value={adminManualPrice}
                      onChangeText={setAdminManualPrice}
                      placeholder="e.g. ₹249 onwards"
                      placeholderTextColor="#94a3b8"
                      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                    />
                  </View>
                </View>

                {/* 5. Location */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Operating Location
                  </Text>
                  <TextInput
                    value={adminManualLocation}
                    onChangeText={setAdminManualLocation}
                    placeholder="e.g. Haveri Town, Ranebennur & nearby"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 6. Description */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Description
                  </Text>
                  <TextInput
                    value={adminManualDesc}
                    onChangeText={setAdminManualDesc}
                    multiline
                    numberOfLines={3}
                    placeholder="Details about experience, tools, emergency callout availability..."
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, minHeight: 65 }}
                  />
                </View>

                {/* 7. Banner Photo (Camera & Gallery) */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                      Service Banner Photo (Optional)
                    </Text>
                    <Text style={{ fontSize: 10, color: '#16a34a', fontWeight: '800' }}>
                      Auto Demo If Blank
                    </Text>
                  </View>

                  {adminManualImage ? (
                    <View style={{ height: 130, borderRadius: 14, overflow: 'hidden', marginBottom: 10, position: 'relative', borderWidth: 1, borderColor: '#cbd5e1' }}>
                      <Image source={{ uri: adminManualImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setAdminManualImage(null)}
                        style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(15,23,42,0.7)', padding: 6, borderRadius: 20 }}
                      >
                        <X size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 16 }}>
                      💡 If left blank, a verified professional {adminManualCategory} photo is automatically selected as the demo image.
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      disabled={pickingManualImage}
                      onPress={handleTakeAdminManualPhoto}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 11,
                        borderRadius: 12,
                        backgroundColor: '#f0fdf4',
                        borderWidth: 1.5,
                        borderColor: '#bbf7d0',
                        gap: 6,
                      }}
                    >
                      <Camera size={16} color="#16a34a" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#16a34a' }}>Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={pickingManualImage}
                      onPress={handlePickAdminManualGallery}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 11,
                        borderRadius: 12,
                        backgroundColor: '#eff6ff',
                        borderWidth: 1.5,
                        borderColor: '#bfdbfe',
                        gap: 6,
                      }}
                    >
                      <ImageIcon size={16} color="#2563eb" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb' }}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={submittingManual}
                  onPress={handleAdminCreateManualService}
                  style={{
                    backgroundColor: '#16a34a',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    shadowColor: '#16a34a',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  {submittingManual ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                      Publish Service to Book Services
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: SUPER ADMIN -> ADD DIGITAL SERVICE */}
      <Modal visible={adminAddDigitalModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                    + Add Digital Service
                  </Text>
                  <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: '700', marginTop: 2 }}>
                    Publish to Digital Services Directory (Super Admin)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAdminAddDigitalModalOpen(false)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* 1. Specialist / Provider Name */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Specialist / Agency / Provider Name *
                  </Text>
                  <TextInput
                    value={adminDigitalName}
                    onChangeText={setAdminDigitalName}
                    placeholder="e.g. Rohit Digital Studios"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 2. Digital Domain Chips */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Digital Domain / Category *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {ADMIN_DIGITAL_DOMAINS.map((domain) => (
                      <TouchableOpacity
                        key={domain}
                        onPress={() => setAdminDigitalDomain(domain)}
                        style={{
                          backgroundColor: adminDigitalDomain === domain ? '#7c3aed' : '#faf5ff',
                          borderColor: adminDigitalDomain === domain ? '#7c3aed' : '#e9d5ff',
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: adminDigitalDomain === domain ? '#ffffff' : '#6b21a8' }}>
                          {domain}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 3. Offering Description */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Offering / Package Title *
                  </Text>
                  <TextInput
                    value={adminDigitalOffering}
                    onChangeText={setAdminDigitalOffering}
                    placeholder="e.g. Modern responsive website, local SEO & domain setup"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 4. Phone & Price */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                      Contact Phone
                    </Text>
                    <TextInput
                      value={adminDigitalPhone}
                      onChangeText={setAdminDigitalPhone}
                      keyboardType="phone-pad"
                      placeholder="e.g. 9845112244"
                      placeholderTextColor="#94a3b8"
                      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                      Price Label
                    </Text>
                    <TextInput
                      value={adminDigitalPrice}
                      onChangeText={setAdminDigitalPrice}
                      placeholder="e.g. ₹2,999 onwards"
                      placeholderTextColor="#94a3b8"
                      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                    />
                  </View>
                </View>

                {/* 5. Location & Badge */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                      Operating Mode / City
                    </Text>
                    <TextInput
                      value={adminDigitalLocation}
                      onChangeText={setAdminDigitalLocation}
                      placeholder="e.g. Online & Haveri Region"
                      placeholderTextColor="#94a3b8"
                      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                      Quality Badge
                    </Text>
                    <TextInput
                      value={adminDigitalBadge}
                      onChangeText={setAdminDigitalBadge}
                      placeholder="Verified / Top Rated"
                      placeholderTextColor="#94a3b8"
                      style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                    />
                  </View>
                </View>

                {/* 6. Portfolio / Banner Photo (Camera & Gallery) */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                      Portfolio / Banner Photo (Optional)
                    </Text>
                    <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '800' }}>
                      Auto Demo If Blank
                    </Text>
                  </View>

                  {adminDigitalImage ? (
                    <View style={{ height: 130, borderRadius: 14, overflow: 'hidden', marginBottom: 10, position: 'relative', borderWidth: 1, borderColor: '#cbd5e1' }}>
                      <Image source={{ uri: adminDigitalImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setAdminDigitalImage(null)}
                        style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(15,23,42,0.7)', padding: 6, borderRadius: 20 }}
                      >
                        <X size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 16 }}>
                      💡 If left blank, a verified professional {adminDigitalDomain} cover photo is automatically selected as the demo image.
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      disabled={pickingDigitalImage}
                      onPress={handleTakeAdminDigitalPhoto}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 11,
                        borderRadius: 12,
                        backgroundColor: '#faf5ff',
                        borderWidth: 1.5,
                        borderColor: '#e9d5ff',
                        gap: 6,
                      }}
                    >
                      <Camera size={16} color="#7c3aed" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#7c3aed' }}>Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={pickingDigitalImage}
                      onPress={handlePickAdminDigitalGallery}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 11,
                        borderRadius: 12,
                        backgroundColor: '#eff6ff',
                        borderWidth: 1.5,
                        borderColor: '#bfdbfe',
                        gap: 6,
                      }}
                    >
                      <ImageIcon size={16} color="#2563eb" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#2563eb' }}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={submittingDigital}
                  onPress={handleAdminCreateDigitalService}
                  style={{
                    backgroundColor: '#7c3aed',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    shadowColor: '#7c3aed',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  {submittingDigital ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                      Publish Specialist to Digital Services
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
