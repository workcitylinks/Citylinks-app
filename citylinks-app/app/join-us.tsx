import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Store,
  Wrench,
  Truck,
  CheckCircle2,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  FileText,
  Layers,
  ChevronDown,
  Check,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Trash2,
  Crosshair,
  Navigation,
  Clock,
  Hourglass,
  Quote,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/apiClient';

interface RoleOption {
  id: 'MERCHANT' | 'MANUAL_SERVICE_PROVIDER' | 'DIGITAL_SERVICE_PROVIDER' | 'LABOR' | 'TRANSPORT';
  label: string;
  sublabel: string;
  icon: any;
  color: string;
  bg: string;
}

const JOIN_ROLES: RoleOption[] = [
  {
    id: 'MERCHANT',
    label: 'Shop Keeper',
    sublabel: 'Retail stores, supermarkets, grocery & trade shops',
    icon: Store,
    color: '#ea580c',
    bg: '#fff7ed',
  },
  {
    id: 'MANUAL_SERVICE_PROVIDER',
    label: 'Manual Service Provider',
    sublabel: 'Electrician, plumber, mechanic, carpenter, repair & technicians',
    icon: Wrench,
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    id: 'DIGITAL_SERVICE_PROVIDER',
    label: 'Digital Service Provider',
    sublabel: 'Web development, SEO, graphics, digital marketing & tech solutions',
    icon: Sparkles,
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    id: 'TRANSPORT',
    label: 'Transport',
    sublabel: 'Auto, taxi, commercial goods carrier & logistics',
    icon: Truck,
    color: '#0891b2',
    bg: '#ecfeff',
  },
];

const MANUAL_SERVICE_OPTIONS = [
  'Electrician',
  'Plumber',
  'AC & Appliance Repair',
  'Carpenter & Woodwork',
  'Mechanic & Auto Service',
  'Painter & Whitewashing',
  'Welder & Fabrication',
  'Mason & Construction',
  'Cleaning & Housekeeping',
  'Others',
];

const DIGITAL_SERVICE_OPTIONS = [
  'Website Creation',
  'Blog & Content writing',
  'Poster & Social media Creatives',
  'Local & Targeted Ads',
  'website hosting & Support',
  'Ad campaingn setup & management',
  'Influencer collaboration',
  'local business promotion',
  'Others',
];

const DEFAULT_SHOP_CATEGORIES = [
  'Apparel',
  'Automobile',
  'Electronics',
  'Groceries',
  'Retail',
  'Hardware',
  'Stationery',
  'Bakery',
];

export default function JoinUsScreen() {
  const { userData, userToken } = useApp();
  const { showSuccess, showError } = useToast();

  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedRole, setSelectedRole] = useState<'MERCHANT' | 'MANUAL_SERVICE_PROVIDER' | 'DIGITAL_SERVICE_PROVIDER' | 'LABOR' | 'TRANSPORT'>('MERCHANT');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Shop Categories (MERCHANT)
  const [categories, setCategories] = useState<string[]>(DEFAULT_SHOP_CATEGORIES);
  const [shopCategory, setShopCategory] = useState('Groceries');
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);

  // Shop Photo (Optional) - Camera & Gallery
  const [shopPhoto, setShopPhoto] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  // Service Provider specific states
  const [manualServiceType, setManualServiceType] = useState('Electrician');
  const [customManualService, setCustomManualService] = useState('');

  const [serviceType, setServiceType] = useState('Website Creation');
  const [customService, setCustomService] = useState('');

  // Dropdown modals
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [manualServiceDropdownOpen, setManualServiceDropdownOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Existing Join Request Status
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingRequest, setExistingRequest] = useState<any | null>(null);
  const [appliedRoles, setAppliedRoles] = useState<string[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);

  const fetchMyStatus = async (showToast = false) => {
    if (!userToken) {
      setCheckingStatus(false);
      return;
    }
    try {
      if (showToast) setCheckingStatus(true);
      const res = await apiClient.get('/join-requests/my-status');
      if (res.data?.joinRequest) {
        setExistingRequest(res.data.joinRequest);
        if (showToast) {
          showSuccess(`Current status: ${res.data.joinRequest.status}`, 'Status Updated');
        }
      } else {
        setExistingRequest(null);
      }
      if (res.data?.appliedRoles) {
        setAppliedRoles(res.data.appliedRoles);
      }
      if (res.data?.allRequests) {
        setAllRequests(res.data.allRequests);
      }
    } catch (err: any) {
      console.warn('Failed to fetch request status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchMyStatus();
  }, [userToken]);

  // Fetch registered shop categories dynamically
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiClient.get('/shops/categories');
        if (res.data && Array.isArray(res.data)) {
          const filtered = res.data.filter((c: string) => c && c !== 'All');
          if (filtered.length > 0) {
            setCategories(filtered);
            if (!filtered.includes(shopCategory)) {
              setShopCategory(filtered[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load categories, using defaults:', err);
      }
    };
    loadCategories();
  }, []);

  // Auto GPS Location Fetcher
  const handleAutoFetchLocation = async () => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Permission to access location was denied. Please allow location access in your device settings.', 'Location Required');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [reverseGeocode] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (reverseGeocode) {
        const parts = [
          reverseGeocode.streetNumber,
          reverseGeocode.street,
          reverseGeocode.district || reverseGeocode.subregion,
          reverseGeocode.city,
          reverseGeocode.postalCode,
        ].filter(Boolean);

        const fullAddr = parts.join(', ');
        const locality = reverseGeocode.district || reverseGeocode.city || 'Haveri';
        setLocation(fullAddr || `${locality}, Haveri, Karnataka`);
        showSuccess(`Detected: ${locality}`, 'GPS Position Fetched');
      } else {
        showError('Could not decode device coordinates into a street address.', 'Geocoding Error');
      }
    } catch (err: any) {
      console.error('GPS error:', err);
      showError(err.message || 'Unable to retrieve your current location. Please enter manually.', 'GPS Error');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a shop photo.', 'Permission Needed');
        return;
      }
      setPickingPhoto(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShopPhoto(result.assets[0].uri);
        showSuccess('Photo captured!', 'Success');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      showError('Failed to capture photo from camera.', 'Camera Error');
    } finally {
      setPickingPhoto(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to select a shop photo.', 'Permission Needed');
        return;
      }
      setPickingPhoto(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShopPhoto(result.assets[0].uri);
        showSuccess('Photo selected from gallery!', 'Success');
      }
    } catch (err: any) {
      console.error('Gallery error:', err);
      showError('Failed to select photo from gallery.', 'Gallery Error');
    } finally {
      setPickingPhoto(false);
    }
  };

  // Prefill phone and email from user profile if available
  useEffect(() => {
    if (userData) {
      if (userData.phone && !phone) setPhone(userData.phone);
      if (userData.email && !email) setEmail(userData.email);
      if (userData.address && !location) setLocation(userData.address);
    }
  }, [userData]);

  const isRoleAlreadyApplied =
    appliedRoles.includes(selectedRole) ||
    (userData?.role === selectedRole) ||
    allRequests.some((r) => r.role === selectedRole && (r.status === 'PENDING' || r.status === 'APPROVED'));

  const handleSubmit = async () => {
    if (!userToken) {
      showError('Please sign in or create an account to join CityLinks.', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }

    if (isRoleAlreadyApplied) {
      showError(
        `You have already submitted an application for ${activeRoleObj.label}. Each business or provider can apply for an opening only once.`,
        'Duplicate Application'
      );
      return;
    }

    if (!shopName.trim()) {
      showError('Please enter the name of your shop or business.', 'Missing Field');
      return;
    }

    if (!description.trim()) {
      showError('Please provide a short description of what you offer.', 'Missing Field');
      return;
    }

    if (!location.trim()) {
      showError('Please provide your shop or business location/address.', 'Missing Field');
      return;
    }

    if (!phone.trim()) {
      showError('Please enter a reachable contact phone number.', 'Missing Field');
      return;
    }

    if (!email.trim()) {
      showError('Please enter a valid contact email address.', 'Missing Field');
      return;
    }

    if (selectedRole === 'MERCHANT') {
      if (isOtherCategory && !customCategory.trim()) {
        showError('Please enter your custom shop category.', 'Missing Category');
        return;
      }
      if (!isOtherCategory && !shopCategory) {
        showError('Please select a category for your shop.', 'Missing Category');
        return;
      }
    }

    if (selectedRole === 'MANUAL_SERVICE_PROVIDER' || selectedRole === 'LABOR') {
      if (!manualServiceType) {
        showError('Please choose the type of manual service you provide.', 'Missing Field');
        return;
      }
      if ((manualServiceType === 'Others' || manualServiceType === 'Other') && !customManualService.trim()) {
        showError('Please specify the manual service you provide.', 'Missing Field');
        return;
      }
    }

    if (selectedRole === 'DIGITAL_SERVICE_PROVIDER') {
      if (!serviceType) {
        showError('Please choose the type of digital service you provide.', 'Missing Field');
        return;
      }
      if ((serviceType === 'Others' || serviceType === 'Other') && !customService.trim()) {
        showError('Please specify the digital service you provide.', 'Missing Field');
        return;
      }
    }

    try {
      setSubmitting(true);
      const isManual = selectedRole === 'MANUAL_SERVICE_PROVIDER' || selectedRole === 'LABOR';
      const isDigital = selectedRole === 'DIGITAL_SERVICE_PROVIDER';
      const isShop = selectedRole === 'MERCHANT';

      const resolvedServiceType = isShop
        ? (isOtherCategory ? customCategory.trim() : shopCategory)
        : isManual
        ? manualServiceType
        : isDigital
        ? serviceType
        : undefined;

      const resolvedCustomService = isShop && isOtherCategory
        ? customCategory.trim()
        : isManual && (manualServiceType === 'Others' || manualServiceType === 'Other')
        ? customManualService.trim()
        : isDigital && (serviceType === 'Others' || serviceType === 'Other')
        ? customService.trim()
        : undefined;

      const res = await apiClient.post('/join-requests', {
        shopName: shopName.trim(),
        description: description.trim(),
        role: selectedRole,
        serviceType: resolvedServiceType,
        customService: resolvedCustomService,
        location: location.trim(),
        phone: phone.trim(),
        email: email.trim(),
        imageUrl: shopPhoto || undefined,
      });

      if (res.data?.joinRequest) {
        setExistingRequest(res.data.joinRequest);
      }
      showSuccess('Your request has been submitted to Super Admin!', 'Request Sent');
      setSuccessModalOpen(true);
    } catch (err: any) {
      console.error('Join request error:', err);
      showError(err.response?.data?.error || 'Failed to submit join request. Please try again.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeRoleObj = JOIN_ROLES.find((r) => r.id === selectedRole) || JOIN_ROLES[0];
  const ActiveIcon = activeRoleObj.icon;

  // ---------------------------------------------------------
  // 1. Loading State while checking existing join status
  // ---------------------------------------------------------
  if (checkingStatus) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <ActivityIndicator size="large" color="#ea580c" />
        <Text className="text-sm font-bold text-slate-700 mt-4">
          Checking Application Status...
        </Text>
        <Text className="text-xs text-slate-400 mt-1">
          Connecting to CityLinks Haveri servers
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------
  // 2. User already has a PENDING application: SHOW IN-REVIEW SCREEN
  // ---------------------------------------------------------
  if (existingRequest && existingRequest.status === 'PENDING') {
    const isMerchant = existingRequest.role === 'MERCHANT';
    const roleLabel = isMerchant
      ? 'Shop Keeper'
      : existingRequest.role === 'MANUAL_SERVICE_PROVIDER' || existingRequest.role === 'LABOR'
      ? 'Manual Service Provider'
      : existingRequest.role === 'DIGITAL_SERVICE_PROVIDER'
      ? 'Digital Service Provider'
      : 'Transport';

    const formattedDate = existingRequest.createdAt
      ? new Date(existingRequest.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Recently';

    return (
      <View className="flex-1 bg-slate-50">
        <SafeAreaView edges={['top']} className="bg-white">
          <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <TouchableOpacity
              onPress={() => router.replace('/' as any)}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
            >
              <ChevronLeft size={22} color="#1e293b" />
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-lg font-bold text-slate-900">Application Status</Text>
              <Text className="text-xs text-slate-400">CityLinks Partner Program</Text>
            </View>
            <TouchableOpacity
              onPress={() => fetchMyStatus(true)}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center border border-orange-100"
            >
              <RefreshCw size={18} color="#ea580c" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo & Headline */}
          <View className="items-center my-4">
            <View
              style={{
                width: 92,
                height: 92,
                borderRadius: 28,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#ea580c',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.16,
                shadowRadius: 18,
                elevation: 8,
                borderWidth: 2,
                borderColor: '#fed7aa',
                marginBottom: 14,
              }}
            >
              <Image
                source={require('../assets/images/logo.png')}
                style={{ width: 66, height: 66 }}
                resizeMode="contain"
              />
            </View>

            {/* Status Pill */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff7ed',
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#fdba74',
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#ea580c',
                  marginRight: 7,
                }}
              />
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#c2410c', letterSpacing: 0.8 }}>
                APPLICATION IN REVIEW
              </Text>
            </View>

            <Text className="text-2xl font-black text-slate-900 text-center tracking-tight">
              Your Request is in Review
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1.5 px-4 leading-relaxed">
              Our Super Admin is currently evaluating your application for{' '}
              <Text className="font-bold text-slate-800">{existingRequest.shopName}</Text>. Your account will unlock as soon as it is approved.
            </Text>
          </View>

          {/* Motivational Thought Card */}
          <View
            style={{
              backgroundColor: '#0f172a',
              borderRadius: 24,
              padding: 20,
              marginBottom: 18,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 14,
              elevation: 6,
              borderWidth: 1,
              borderColor: '#1e293b',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Background subtle watermark icon */}
            <View style={{ position: 'absolute', right: -15, top: -15, opacity: 0.08 }}>
              <Sparkles size={110} color="#ffffff" />
            </View>

            <View className="flex-row items-center mb-3">
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#ea580c',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 9,
                }}
              >
                <Sparkles size={16} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#fb923c', textTransform: 'uppercase', letterSpacing: 1 }}>
                Entrepreneur Thought of the Day
              </Text>
            </View>

            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#f8fafc',
                lineHeight: 22,
                fontStyle: 'italic',
                marginBottom: 14,
              }}
            >
              "Every great enterprise begins with the courage to take the first step. Your dedication to serving and empowering Haveri with quality commerce builds a stronger, self-reliant community. Great things are just around the corner!"
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: '#1e293b',
                paddingTop: 12,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8' }}>
                — CityLinks Merchant Community
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldCheck size={14} color="#10b981" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#10b981', marginLeft: 4 }}>
                  Verified Local Partner
                </Text>
              </View>
            </View>
          </View>

          {/* Application Details Summary */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Submitted Application Details
              </Text>
              <View className="bg-slate-100 px-2.5 py-1 rounded-full">
                <Text className="text-[10px] font-bold text-slate-500">ID: #{existingRequest.id.slice(-6)}</Text>
              </View>
            </View>

            {/* Shop Name & Role */}
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center mr-3 border border-orange-100">
                <Store size={20} color="#ea580c" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-extrabold text-slate-900">
                  {existingRequest.shopName}
                </Text>
                <Text className="text-xs font-semibold text-orange-600">
                  {roleLabel} {existingRequest.serviceType ? `• ${existingRequest.serviceType}` : ''}
                </Text>
              </View>
            </View>

            {/* Location */}
            <View className="flex-row items-start mb-2.5">
              <MapPin size={15} color="#64748b" style={{ marginTop: 2 }} />
              <Text className="text-xs text-slate-600 ml-2 flex-1 leading-relaxed">
                {existingRequest.location}
              </Text>
            </View>

            {/* Phone */}
            <View className="flex-row items-center mb-2.5">
              <Phone size={15} color="#64748b" />
              <Text className="text-xs text-slate-600 ml-2">
                Phone: <Text className="font-semibold text-slate-800">{existingRequest.phone}</Text>
              </Text>
            </View>

            {/* Email */}
            {existingRequest.email && (
              <View className="flex-row items-center mb-2.5">
                <Mail size={15} color="#64748b" />
                <Text className="text-xs text-slate-600 ml-2">
                  Email: <Text className="font-semibold text-slate-800">{existingRequest.email}</Text>
                </Text>
              </View>
            )}

            {/* Submission Date */}
            <View className="flex-row items-center pt-2.5 border-t border-slate-100">
              <Clock size={14} color="#94a3b8" />
              <Text className="text-[11px] text-slate-400 ml-1.5">
                Submitted on: {formattedDate}
              </Text>
            </View>

            {/* Shop Photo Preview if present */}
            {existingRequest.imageUrl && (
              <View className="mt-3.5 pt-3 border-t border-slate-100">
                <Text className="text-[11px] font-bold text-slate-500 mb-2">Storefront Photo</Text>
                <Image
                  source={{ uri: existingRequest.imageUrl }}
                  style={{ width: '100%', height: 140, borderRadius: 14 }}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>

          {/* Verification Stepper */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
            <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Application Pipeline
            </Text>

            {/* Step 1 */}
            <View className="flex-row items-start mb-3">
              <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center mr-3 mt-0.5">
                <Check size={14} color="#ffffff" strokeWidth={3} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-800">1. Application Received</Text>
                <Text className="text-[11px] text-slate-500">Your details and storefront photo have been recorded.</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View className="flex-row items-start mb-3">
              <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center mr-3 mt-0.5">
                <Hourglass size={13} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-orange-600">2. Super Admin Verification (In Progress)</Text>
                <Text className="text-[11px] text-slate-500">Our Haveri admin is reviewing your listing for compliance.</Text>
              </View>
            </View>

            {/* Step 3 */}
            <View className="flex-row items-start">
              <View className="w-6 h-6 rounded-full bg-slate-200 items-center justify-center mr-3 mt-0.5">
                <Text className="text-[10px] font-bold text-slate-500">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-400">3. Dashboard & Marketplace Unlock</Text>
                <Text className="text-[11px] text-slate-400">Your store goes live on Near By Shops and your merchant dashboard is activated.</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/' as any)}
            className="w-full py-4 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-300 mb-3"
          >
            <Text className="text-white font-bold text-base">Return to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => fetchMyStatus(true)}
            className="w-full py-3.5 rounded-2xl bg-white border border-slate-200 items-center justify-center mb-3"
          >
            <Text className="text-slate-700 font-bold text-sm">Refresh Application Status</Text>
          </TouchableOpacity>

          <View className="py-2.5 items-center justify-center">
            <Text className="text-xs text-slate-400 font-semibold text-center">
              🔒 One Application Per Position • Duplicate applications are prohibited
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------
  // 3. User already APPROVED: show direct access card
  // ---------------------------------------------------------
  if (existingRequest && existingRequest.status === 'APPROVED') {
    const isMerchant = existingRequest.role === 'MERCHANT';
    return (
      <View className="flex-1 bg-slate-50">
        <SafeAreaView edges={['top']} className="bg-white">
          <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <TouchableOpacity
              onPress={() => router.replace('/' as any)}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
            >
              <ChevronLeft size={22} color="#1e293b" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-slate-900">Application Approved</Text>
            <View className="w-10" />
          </View>
        </SafeAreaView>

        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-4">
            <CheckCircle2 size={44} color="#16a34a" />
          </View>
          <Text className="text-2xl font-black text-slate-900 text-center mb-2">
            You're an Approved Partner!
          </Text>
          <Text className="text-sm text-slate-500 text-center mb-6 leading-relaxed">
            Your application for <Text className="font-bold text-slate-800">{existingRequest.shopName}</Text> has been approved by the Super Admin.{' '}
            {existingRequest.role === 'MERCHANT'
              ? 'Your merchant store features are active.'
              : existingRequest.role === 'MANUAL_SERVICE_PROVIDER' || existingRequest.role === 'LABOR'
              ? 'Your manual service provider features are active.'
              : existingRequest.role === 'DIGITAL_SERVICE_PROVIDER'
              ? 'Your digital specialist features are active.'
              : 'Your partner features are active.'}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (isMerchant) {
                router.replace('/merchant-dashboard' as any);
              } else if (
                existingRequest.role === 'MANUAL_SERVICE_PROVIDER' ||
                existingRequest.role === 'LABOR'
              ) {
                router.replace('/manual-service-dashboard' as any);
              } else if (existingRequest.role === 'DIGITAL_SERVICE_PROVIDER') {
                router.replace('/digital-service-dashboard' as any);
              } else {
                router.replace('/dashboard' as any);
              }
            }}
            className="w-full py-4 rounded-2xl bg-orange-600 items-center justify-center shadow-lg shadow-orange-300 mb-3"
          >
            <Text className="text-white font-bold text-base">
              {isMerchant
                ? 'Open Merchant Dashboard'
                : existingRequest.role === 'MANUAL_SERVICE_PROVIDER' ||
                  existingRequest.role === 'LABOR'
                ? 'Open Manual Service Hub'
                : existingRequest.role === 'DIGITAL_SERVICE_PROVIDER'
                ? 'Open Digital Specialist Hub'
                : 'Open Partner Dashboard'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.replace('/' as any)}
            className="w-full py-3.5 rounded-2xl bg-white border border-slate-200 items-center justify-center"
          >
            <Text className="text-slate-700 font-bold text-sm">Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------
  // 4. Default: New Application Form
  // ---------------------------------------------------------
  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Navbar */}
        <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-lg font-bold text-slate-900">Join CityLinks</Text>
            <Text className="text-xs text-slate-400">Partner & Vendor Application</Text>
          </View>
          <View className="w-10" />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View className="bg-indigo-600 rounded-3xl p-5 mb-5 shadow-lg shadow-indigo-200">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-xl bg-white/20 items-center justify-center mr-2.5">
                <Sparkles size={18} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-lg">Grow with CityLinks</Text>
            </View>
            <Text className="text-indigo-100 text-xs leading-relaxed">
              Register your store, offer digital services, or operate transport in Haveri. Once approved by the Super Admin, your account dashboard will be unlocked with full features.
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            
            {/* 1. Name of the Shop / Business */}
            <View>
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Name of the Shop / Business *
              </Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                <Store size={18} color="#64748b" />
                <TextInput
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="e.g. Karnataka Fashion & Textile Mart"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2.5 text-sm text-slate-800"
                />
              </View>
            </View>

            {/* 2. Type / Role Dropdown Selector */}
            <View className="mt-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Type of Partnership (Role) *
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setRoleDropdownOpen(true)}
                className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3"
              >
                <View className="flex-row items-center flex-1">
                  <View
                    style={{ backgroundColor: activeRoleObj.bg }}
                    className="w-8 h-8 rounded-xl items-center justify-center mr-2.5"
                  >
                    <ActiveIcon size={18} color={activeRoleObj.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      {activeRoleObj.label}
                    </Text>
                    <Text className="text-xs text-slate-500" numberOfLines={1}>
                      {activeRoleObj.sublabel}
                    </Text>
                  </View>
                </View>
                <ChevronDown size={18} color="#64748b" />
              </TouchableOpacity>

              {isRoleAlreadyApplied && (
                <View
                  style={{
                    marginTop: 10,
                    backgroundColor: '#fff7ed',
                    borderWidth: 1.5,
                    borderColor: '#fdba74',
                    borderRadius: 16,
                    padding: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <AlertCircle size={20} color="#ea580c" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#9a3412' }}>
                      Application Already Submitted
                    </Text>
                    <Text style={{ fontSize: 11, color: '#c2410c', marginTop: 2 }}>
                      You already have an active or approved registration for {activeRoleObj.label}. Each business or provider cannot apply for the same opening more than once.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* 3a. If Shop Keeper: Category selector with chips + Other option */}
            {selectedRole === 'MERCHANT' && (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#fff7ed',
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#fed7aa',
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                    Select Shop Category *
                  </Text>
                  <Text className="text-[11px] font-semibold text-orange-600">
                    Syncs to Directory
                  </Text>
                </View>
                <Text className="text-xs text-orange-800 mb-3">
                  Choose from listed business categories or add a custom one:
                </Text>

                {/* Category Chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {categories.map((cat) => {
                    const isSel = !isOtherCategory && shopCategory.toLowerCase() === cat.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={cat}
                        activeOpacity={0.7}
                        onPress={() => {
                          setIsOtherCategory(false);
                          setShopCategory(cat);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 10,
                          backgroundColor: isSel ? '#ea580c' : '#ffffff',
                          borderWidth: 1,
                          borderColor: isSel ? '#ea580c' : '#fed7aa',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isSel ? '#ffffff' : '#431407',
                          }}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* "Other" Option Button */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsOtherCategory(true)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: isOtherCategory ? '#ea580c' : '#ffedd5',
                      borderWidth: 1,
                      borderColor: isOtherCategory ? '#ea580c' : '#fdba74',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: isOtherCategory ? '#ffffff' : '#c2410c',
                      }}
                    >
                      + Other Category
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* If Other is clicked, manual entry appears */}
                {isOtherCategory && (
                  <View className="mt-2 pt-2 border-t border-orange-200">
                    <Text className="text-xs font-bold text-orange-900 mb-1.5">
                      Enter New Category Name *
                    </Text>
                    <View className="flex-row items-center bg-white border border-orange-300 rounded-xl px-3.5 py-2.5">
                      <TextInput
                        value={customCategory}
                        onChangeText={setCustomCategory}
                        placeholder="e.g. Pet Care, Handicrafts, Sweet Stall, Furniture"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 text-sm text-slate-800"
                        autoCapitalize="words"
                      />
                    </View>
                    <Text className="text-[10px] text-orange-700 mt-1">
                      This new category will automatically be saved and updated across the DB, app UI, and directory filters.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 3b. If Manual Service Provider: Which type of manual service */}
            {(selectedRole === 'MANUAL_SERVICE_PROVIDER' || selectedRole === 'LABOR') && (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#f0fdf4',
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#a7f3d0',
                }}
              >
                <Text className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                  Which type of Manual Service / Trade? *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setManualServiceDropdownOpen(true)}
                  className="flex-row items-center justify-between bg-white border border-emerald-200 rounded-xl px-3.5 py-3 mb-3"
                >
                  <View className="flex-row items-center flex-1">
                    <Wrench size={18} color="#16a34a" />
                    <Text className="ml-2.5 text-sm font-semibold text-slate-800">
                      {manualServiceType}
                    </Text>
                  </View>
                  <ChevronDown size={18} color="#16a34a" />
                </TouchableOpacity>

                {/* If 'Others' selected, add option to type custom manual service */}
                {(manualServiceType === 'Others' || manualServiceType === 'Other') && (
                  <View className="mt-1">
                    <Text className="text-xs font-semibold text-emerald-800 mb-1.5">
                      Specify the trade / manual service you provide *
                    </Text>
                    <View className="flex-row items-center bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5">
                      <TextInput
                        value={customManualService}
                        onChangeText={setCustomManualService}
                        placeholder="e.g. Mason, painter, borewell technician, glass fitter"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 text-sm text-slate-800"
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 3c. If Digital Service Provider: Which type of digital service */}
            {selectedRole === 'DIGITAL_SERVICE_PROVIDER' && (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#f5f3ff',
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#ddd6fe',
                }}
              >
                <Text className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2">
                  Which type of Digital Service Provider? *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setServiceDropdownOpen(true)}
                  className="flex-row items-center justify-between bg-white border border-purple-200 rounded-xl px-3.5 py-3 mb-3"
                >
                  <View className="flex-row items-center flex-1">
                    <Sparkles size={18} color="#8b5cf6" />
                    <Text className="ml-2.5 text-sm font-semibold text-slate-800">
                      {serviceType}
                    </Text>
                  </View>
                  <ChevronDown size={18} color="#8b5cf6" />
                </TouchableOpacity>

                {/* If 'Others' selected, add option to type custom service */}
                {(serviceType === 'Others' || serviceType === 'Other') && (
                  <View className="mt-1">
                    <Text className="text-xs font-semibold text-purple-800 mb-1.5">
                      Specify the digital service you provide *
                    </Text>
                    <View className="flex-row items-center bg-white border border-purple-300 rounded-xl px-3.5 py-2.5">
                      <TextInput
                        value={customService}
                        onChangeText={setCustomService}
                        placeholder="e.g. App development, video editing, software solutions"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 text-sm text-slate-800"
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 4. Description */}
            <View className="mt-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Description of Products / Services *
              </Text>
              <View className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Tell customers and the admin about what your shop sells or the services you provide..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="text-sm text-slate-800 min-h-[80px]"
                />
              </View>
            </View>

            {/* 5. Location with Auto GPS Fetching */}
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Location / Shop Address *
                </Text>
                
                {/* Auto Location Fetching Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={fetchingLocation}
                  onPress={handleAutoFetchLocation}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#e0e7ff',
                    paddingHorizontal: 10,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#c7d2fe',
                  }}
                >
                  {fetchingLocation ? (
                    <ActivityIndicator size="small" color="#4338ca" style={{ marginRight: 4 }} />
                  ) : (
                    <Crosshair size={13} color="#4338ca" strokeWidth={2.5} style={{ marginRight: 4 }} />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338ca' }}>
                    {fetchingLocation ? 'Locating...' : 'Auto Detect GPS'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                <MapPin size={18} color="#64748b" />
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. MG Road, Near Gandhi Circle, Haveri - 581110"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2.5 text-sm text-slate-800"
                />
              </View>
              <Text className="text-[10px] text-slate-400 mt-1">
                Tap 'Auto Detect GPS' to fill your device's current location, or enter manually.
              </Text>
            </View>

            {/* 6. Phone Number */}
            <View className="mt-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Phone Number *
              </Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                <Phone size={18} color="#64748b" />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 9845123456"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2.5 text-sm text-slate-800"
                />
              </View>
            </View>

            {/* 7. Email Address */}
            <View className="mt-4">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Contact Email *
              </Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                <Mail size={18} color="#64748b" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. contact@myshop.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2.5 text-sm text-slate-800"
                />
              </View>
            </View>

            {/* 8. Photo of the Shop (Optional) - Camera & Gallery */}
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Photo of the Shop
                </Text>
                <View className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  <Text className="text-[10px] font-bold text-slate-500">Optional</Text>
                </View>
              </View>
              <Text className="text-xs text-slate-400 mb-3">
                Take a photo of your storefront or select one from your gallery to display on your listing.
              </Text>

              {shopPhoto ? (
                /* Photo Preview Card */
                <View className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                  <View
                    style={{
                      position: 'relative',
                      borderRadius: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <Image
                      source={{ uri: shopPhoto }}
                      style={{ width: '100%', height: 180, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShopPhoto(null)}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        backgroundColor: '#dc2626',
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={15} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-slate-200">
                    <View className="flex-row items-center">
                      <CheckCircle2 size={15} color="#16a34a" />
                      <Text className="text-xs font-bold text-emerald-700 ml-1.5">
                        Photo attached
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={pickingPhoto}
                        onPress={handleTakePhoto}
                        className="px-2.5 py-1 bg-white rounded-lg border border-slate-200"
                      >
                        <Text className="text-[11px] font-semibold text-slate-600">Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={pickingPhoto}
                        onPress={handlePickFromGallery}
                        className="px-2.5 py-1 bg-white rounded-lg border border-slate-200"
                      >
                        <Text className="text-[11px] font-semibold text-slate-600">Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                /* Dual Option Buttons: Camera & Gallery */
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={pickingPhoto}
                    onPress={handleTakePhoto}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      backgroundColor: '#eef2ff',
                      borderWidth: 1,
                      borderColor: '#a5b4fc',
                      borderStyle: 'dashed',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mb-1.5">
                      <Camera size={20} color="#4f46e5" />
                    </View>
                    <Text className="text-xs font-bold text-indigo-700">Take Photo</Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5">Use Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={pickingPhoto}
                    onPress={handlePickFromGallery}
                    className="flex-1 py-3.5 px-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300 items-center justify-center"
                  >
                    <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-1.5">
                      <ImageIcon size={20} color="#64748b" />
                    </View>
                    <Text className="text-xs font-bold text-slate-700">Choose Photo</Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5">From Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={submitting || isRoleAlreadyApplied}
              onPress={handleSubmit}
              style={{
                marginTop: 24,
                width: '100%',
                paddingVertical: 16,
                borderRadius: 16,
                backgroundColor: isRoleAlreadyApplied ? '#94a3b8' : '#4f46e5',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                shadowColor: isRoleAlreadyApplied ? '#000000' : '#4f46e5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isRoleAlreadyApplied ? 0.05 : 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Sparkles size={18} color="#ffffff" className="mr-2" />
                  <Text className="text-white font-bold text-base ml-2">
                    {isRoleAlreadyApplied ? 'Already Applied for this Position' : 'Send Request'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center justify-center mt-2">
              <AlertCircle size={14} color="#94a3b8" />
              <Text className="text-xs text-slate-400 ml-1.5">
                Reviewed and approved by Super Admin
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Role Picker Modal */}
      <Modal
        visible={roleDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleDropdownOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-100">
            <Text className="text-base font-bold text-slate-900 mb-1">
              Select Partnership Type
            </Text>
            <Text className="text-xs text-slate-400 mb-4">
              Choose the category that best matches your business
            </Text>

            <View className="space-y-2.5">
              {JOIN_ROLES.map((roleItem) => {
                const ItemIcon = roleItem.icon;
                const isSelected = selectedRole === roleItem.id;
                const isItemAlreadyApplied =
                  appliedRoles.includes(roleItem.id) ||
                  (userData?.role === roleItem.id) ||
                  allRequests.some((r) => r.role === roleItem.id && (r.status === 'PENDING' || r.status === 'APPROVED'));

                return (
                  <TouchableOpacity
                    key={roleItem.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedRole(roleItem.id);
                      setRoleDropdownOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: isSelected ? roleItem.color : '#f1f5f9',
                      backgroundColor: isSelected ? roleItem.bg : '#ffffff',
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: roleItem.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <ItemIcon size={20} color={roleItem.color} />
                    </View>
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center gap-2">
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: isSelected ? roleItem.color : '#0f172a',
                          }}
                        >
                          {roleItem.label}
                        </Text>
                        {isItemAlreadyApplied && (
                          <View
                            style={{
                              backgroundColor: '#fee2e2',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#b91c1c' }}>
                              ALREADY APPLIED
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {roleItem.sublabel}
                      </Text>
                    </View>
                    {isSelected && (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: roleItem.color,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setRoleDropdownOpen(false)}
              className="mt-3 w-full py-3 rounded-xl bg-slate-100 items-center justify-center"
            >
              <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Service Type Picker Modal */}
      <Modal
        visible={manualServiceDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setManualServiceDropdownOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-100 max-h-[80%]">
            <Text className="text-base font-bold text-slate-900 mb-1">
              Select Manual Service / Trade
            </Text>
            <Text className="text-xs text-slate-400 mb-3">
              What kind of manual service or technical skill do you provide?
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-3">
              {MANUAL_SERVICE_OPTIONS.map((opt) => {
                const isSelected = manualServiceType === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    activeOpacity={0.7}
                    onPress={() => {
                      setManualServiceType(opt);
                      setManualServiceDropdownOpen(false);
                    }}
                    className={`flex-row items-center justify-between p-3.5 rounded-xl border mb-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected ? 'font-bold text-emerald-800' : 'font-medium text-slate-700'
                      }`}
                    >
                      {opt}
                    </Text>
                    {isSelected && <Check size={16} color="#16a34a" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setManualServiceDropdownOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-100 items-center justify-center"
            >
              <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Digital Service Type Picker Modal */}
      <Modal
        visible={serviceDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setServiceDropdownOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-100 max-h-[80%]">
            <Text className="text-base font-bold text-slate-900 mb-1">
              Select Digital Service Category
            </Text>
            <Text className="text-xs text-slate-400 mb-3">
              What kind of service will you offer?
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-3">
              {DIGITAL_SERVICE_OPTIONS.map((opt) => {
                const isSelected = serviceType === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    activeOpacity={0.7}
                    onPress={() => {
                      setServiceType(opt);
                      setServiceDropdownOpen(false);
                    }}
                    className={`flex-row items-center justify-between p-3.5 rounded-xl border mb-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isSelected ? 'font-bold text-emerald-800' : 'font-medium text-slate-700'
                      }`}
                    >
                      {opt}
                    </Text>
                    {isSelected && <Check size={16} color="#16a34a" strokeWidth={2.5} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setServiceDropdownOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-100 items-center justify-center"
            >
              <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-md items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
              <CheckCircle2 size={36} color="#16a34a" />
            </View>
            <Text className="text-xl font-bold text-slate-900 text-center mb-2">
              Request Sent Successfully!
            </Text>
            <Text className="text-xs text-slate-500 text-center leading-relaxed mb-6">
              Your application for <Text className="font-bold text-slate-700">{shopName}</Text> as a{' '}
              <Text className="font-bold text-slate-700">{activeRoleObj.label}</Text> has been sent to the Super Admin. You will receive a notification as soon as it is approved.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSuccessModalOpen(false);
                router.replace('/' as any);
              }}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 items-center justify-center shadow-md shadow-indigo-200"
            >
              <Text className="text-white font-bold text-sm">Return to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
