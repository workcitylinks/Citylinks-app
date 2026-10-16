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
  User,
  Car,
  Plus,
  CreditCard,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/apiClient';
import { compressBanner, compressDocument } from '../utils/imageCompressor';
import { uploadImageToCloudflare } from '../services/imageUpload';

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

  // Transport specific states (Driver identity & up to 3 vehicles)
  const [transportLicense, setTransportLicense] = useState('');
  const [transportLicensePhoto, setTransportLicensePhoto] = useState<string | null>(null);
  const [transportAadhaar, setTransportAadhaar] = useState('');
  const [transportAadhaarPhoto, setTransportAadhaarPhoto] = useState<string | null>(null);

  // Vehicle 1 (Primary On-Road Vehicle)
  const [v1Type, setV1Type] = useState<string>('Car');
  const [v1CustomType, setV1CustomType] = useState('');
  const [v1Model, setV1Model] = useState('');
  const [v1Plate, setV1Plate] = useState('');
  const [v1RatePerKm, setV1RatePerKm] = useState('20');
  const [v1BaseFare, setV1BaseFare] = useState('30');

  // Vehicle 2 (Secondary - Optional)
  const [hasV2, setHasV2] = useState(false);
  const [v2Type, setV2Type] = useState<string>('Auto');
  const [v2CustomType, setV2CustomType] = useState('');
  const [v2Model, setV2Model] = useState('');
  const [v2Plate, setV2Plate] = useState('');
  const [v2RatePerKm, setV2RatePerKm] = useState('14');
  const [v2BaseFare, setV2BaseFare] = useState('25');

  // Vehicle 3 (Third - Optional)
  const [hasV3, setHasV3] = useState(false);
  const [v3Type, setV3Type] = useState<string>('Bike');
  const [v3CustomType, setV3CustomType] = useState('');
  const [v3Model, setV3Model] = useState('');
  const [v3Plate, setV3Plate] = useState('');
  const [v3RatePerKm, setV3RatePerKm] = useState('10');
  const [v3BaseFare, setV3BaseFare] = useState('15');

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
        const compressed = await compressBanner(result.assets[0].uri);
        setShopPhoto(compressed);
        showSuccess('Photo captured & compressed!', 'Success');
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
        const compressed = await compressBanner(result.assets[0].uri);
        setShopPhoto(compressed);
        showSuccess('Photo selected & compressed!', 'Success');
      }
    } catch (err: any) {
      console.error('Gallery error:', err);
      showError('Failed to select photo from gallery.', 'Gallery Error');
    } finally {
      setPickingPhoto(false);
    }
  };

  // Driving License Photo Pickers (Optional for now)
  const handleTakeLicensePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a Driving License photo.', 'Permission Needed');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressDocument(result.assets[0].uri);
        setTransportLicensePhoto(compressed);
        showSuccess('Driving License photo captured & compressed!', 'Captured');
      }
    } catch (err: any) {
      showError('Failed to capture license photo from camera.', 'Camera Error');
    }
  };

  const handlePickLicenseGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to select a Driving License photo.', 'Permission Needed');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressDocument(result.assets[0].uri);
        setTransportLicensePhoto(compressed);
        showSuccess('Driving License photo selected & compressed!', 'Selected');
      }
    } catch (err: any) {
      showError('Failed to select license photo from gallery.', 'Gallery Error');
    }
  };

  // Aadhaar Card Photo Pickers (Optional for now)
  const handleTakeAadhaarPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take an Aadhaar Card photo.', 'Permission Needed');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressDocument(result.assets[0].uri);
        setTransportAadhaarPhoto(compressed);
        showSuccess('Aadhaar photo captured & compressed!', 'Captured');
      }
    } catch (err: any) {
      showError('Failed to capture Aadhaar photo from camera.', 'Camera Error');
    }
  };

  const handlePickAadhaarGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to select an Aadhaar photo.', 'Permission Needed');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressDocument(result.assets[0].uri);
        setTransportAadhaarPhoto(compressed);
        showSuccess('Aadhaar photo selected & compressed!', 'Selected');
      }
    } catch (err: any) {
      showError('Failed to select Aadhaar photo from gallery.', 'Gallery Error');
    }
  };

  // Helper to get default rates when selecting vehicle type
  const getDefaultRatesForType = (type: string) => {
    switch (type) {
      case 'Bike':
        return { rate: '10', base: '15' };
      case 'Auto':
        return { rate: '14', base: '25' };
      case 'Car':
        return { rate: '20', base: '30' };
      case 'Taxi':
        return { rate: '22', base: '35' };
      case 'Tempo':
        return { rate: '55', base: '300' };
      case 'Truck':
        return { rate: '75', base: '500' };
      default:
        return { rate: '25', base: '50' };
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

    if (selectedRole === 'TRANSPORT') {
      if (!shopName.trim()) {
        showError("Please enter driver's full name.", 'Missing Driver Name');
        return;
      }
      if (!transportLicense.trim()) {
        showError('Please enter your Driving License (DL) number.', 'Missing Driving License');
        return;
      }
      if (!transportAadhaar.trim()) {
        showError('Please enter your Aadhaar Card number.', 'Missing Aadhaar');
        return;
      }
      if (!v1Model.trim() || !v1Plate.trim()) {
        showError('Please enter Primary Vehicle Model and Registration Number Plate.', 'Missing Primary Vehicle');
        return;
      }
      if (v1Type === 'Other' && !v1CustomType.trim()) {
        showError('Please specify the custom vehicle type for Vehicle 1.', 'Missing Vehicle Type');
        return;
      }
      if (hasV2) {
        if (!v2Model.trim() || !v2Plate.trim()) {
          showError('Please enter Model and Plate for Vehicle 2, or remove it.', 'Incomplete Vehicle 2');
          return;
        }
        if (v2Type === 'Other' && !v2CustomType.trim()) {
          showError('Please specify the custom vehicle type for Vehicle 2.', 'Missing Vehicle Type');
          return;
        }
      }
      if (hasV3) {
        if (!v3Model.trim() || !v3Plate.trim()) {
          showError('Please enter Model and Plate for Vehicle 3, or remove it.', 'Incomplete Vehicle 3');
          return;
        }
        if (v3Type === 'Other' && !v3CustomType.trim()) {
          showError('Please specify the custom vehicle type for Vehicle 3.', 'Missing Vehicle Type');
          return;
        }
      }
    } else {
      if (!description.trim()) {
        showError('Please provide a short description of what you offer.', 'Missing Field');
        return;
      }
    }

    const isManual = selectedRole === 'MANUAL_SERVICE_PROVIDER' || selectedRole === 'LABOR';
    const isDigital = selectedRole === 'DIGITAL_SERVICE_PROVIDER';
    const isShop = selectedRole === 'MERCHANT';
    const isTransport = selectedRole === 'TRANSPORT';

    if (isShop && !shopPhoto) {
      showError('Storefront / business photo is compulsory. Please capture or select a photo.', 'Photo Compulsory');
      return;
    }
    if (isTransport) {
      if (!transportLicensePhoto) {
        showError('Driving License photo is compulsory.', 'Document Compulsory');
        return;
      }
      if (!transportAadhaarPhoto) {
        showError('Aadhaar Card photo is compulsory.', 'Document Compulsory');
        return;
      }
    }

    try {
      setSubmitting(true);

      // Upload photos to Cloudflare Images
      let cloudflareShopPhoto: string | undefined = undefined;
      let cloudflareLicensePhoto: string | undefined = undefined;
      let cloudflareAadhaarPhoto: string | undefined = undefined;

      if (shopPhoto) {
        cloudflareShopPhoto = await uploadImageToCloudflare(shopPhoto);
      }
      if (transportLicensePhoto) {
        cloudflareLicensePhoto = await uploadImageToCloudflare(transportLicensePhoto);
      }
      if (transportAadhaarPhoto) {
        cloudflareAadhaarPhoto = await uploadImageToCloudflare(transportAadhaarPhoto);
      }

      // Build transport multi-vehicles payload
      const vehiclesPayload: Array<any> = isTransport
        ? [
          {
            vehicleType: v1Type === 'Other' && v1CustomType.trim() ? v1CustomType.trim() : v1Type,
            customVehicleType: v1CustomType.trim(),
            modelName: v1Model.trim(),
            plateNumber: v1Plate.trim().toUpperCase(),
            ratePerKm: parseFloat(v1RatePerKm) || 20,
            baseFare: parseFloat(v1BaseFare) || 30,
            isPrimary: true,
          },
        ]
        : [];

      if (isTransport && hasV2 && v2Plate.trim()) {
        vehiclesPayload.push({
          vehicleType: v2Type === 'Other' && v2CustomType.trim() ? v2CustomType.trim() : v2Type,
          customVehicleType: v2CustomType.trim(),
          modelName: v2Model.trim(),
          plateNumber: v2Plate.trim().toUpperCase(),
          ratePerKm: parseFloat(v2RatePerKm) || 20,
          baseFare: parseFloat(v2BaseFare) || 30,
          isPrimary: false,
        });
      }

      if (isTransport && hasV3 && v3Plate.trim()) {
        vehiclesPayload.push({
          vehicleType: v3Type === 'Other' && v3CustomType.trim() ? v3CustomType.trim() : v3Type,
          customVehicleType: v3CustomType.trim(),
          modelName: v3Model.trim(),
          plateNumber: v3Plate.trim().toUpperCase(),
          ratePerKm: parseFloat(v3RatePerKm) || 20,
          baseFare: parseFloat(v3BaseFare) || 30,
          isPrimary: false,
        });
      }

      const effectiveDescription = isTransport
        ? `Registered transport driver with ${vehiclesPayload.length} commercial vehicle(s) operating in ${location.trim() || 'Haveri Region'}.`
        : description.trim();

      const resolvedServiceType = isShop
        ? (isOtherCategory ? customCategory.trim() : shopCategory)
        : isManual
          ? manualServiceType
          : isDigital
            ? serviceType
            : isTransport
              ? vehiclesPayload[0]?.vehicleType || 'Car'
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
        description: effectiveDescription,
        role: selectedRole,
        serviceType: resolvedServiceType,
        customService: resolvedCustomService,
        location: location.trim(),
        phone: phone.trim(),
        email: email.trim(),
        imageUrl: isTransport ? undefined : cloudflareShopPhoto,
        drivingLicense: isTransport ? transportLicense.trim().toUpperCase() : undefined,
        drivingLicensePhoto: isTransport ? cloudflareLicensePhoto : undefined,
        aadhaarNumber: isTransport ? transportAadhaar.trim() : undefined,
        aadhaarPhoto: isTransport ? cloudflareAadhaarPhoto : undefined,
        vehicles: isTransport ? vehiclesPayload : undefined,
        vehiclePlate: isTransport ? vehiclesPayload[0]?.plateNumber : undefined,
        vehicleModel: isTransport ? vehiclesPayload[0]?.modelName : undefined,
        vehicleType: isTransport ? vehiclesPayload[0]?.vehicleType : undefined,
        ratePerKm: isTransport ? vehiclesPayload[0]?.ratePerKm : undefined,
        baseFare: isTransport ? vehiclesPayload[0]?.baseFare : undefined,
      });

      if (res.data?.joinRequest) {
        setExistingRequest(res.data.joinRequest);
      }
      showSuccess('Your request has been submitted to Super Admin!', 'Request Sent');
      setSuccessModalOpen(true);
    } catch (err: any) {
      console.error('Join request error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });

      const serverError = err.response?.data?.error || err.response?.data?.message;

      if (err.response?.status === 401) {
        showError(
          serverError || 'Your session has expired or account is invalid. Please sign in again.',
          'Session Expired'
        );
        router.push('/auth' as any);
        return;
      }

      showError(serverError || 'Failed to submit join request. Please try again.', 'Error');
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
                  : existingRequest.role === 'TRANSPORT'
                    ? 'Your transport fleet and multi-vehicle console are active.'
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
              } else if (existingRequest.role === 'TRANSPORT') {
                router.replace('/transport-dashboard' as any);
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
                    : existingRequest.role === 'TRANSPORT'
                      ? 'Open Transport Fleet Console'
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
          contentContainerStyle={{ padding: 18, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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

            {/* 1. Name of the Shop / Business / Driver */}
            <View>
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {selectedRole === 'TRANSPORT' ? 'Driver Full Name *' : 'Name of the Shop / Business *'}
              </Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                {selectedRole === 'TRANSPORT' ? (
                  <User size={18} color="#2563eb" />
                ) : (
                  <Store size={18} color="#64748b" />
                )}
                <TextInput
                  value={shopName}
                  onChangeText={setShopName}
                  maxLength={60}
                  placeholder={
                    selectedRole === 'TRANSPORT'
                      ? 'e.g. Karthik R. / Rajesh Transport'
                      : 'e.g. Karnataka Fashion & Textile Mart'
                  }
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
                        maxLength={40}
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
                        maxLength={50}
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
                        maxLength={50}
                        placeholder="e.g. App development, video editing, software solutions"
                        placeholderTextColor="#94a3b8"
                        className="flex-1 text-sm text-slate-800"
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 3c. If Transport: Driver Identity (DL, Aadhaar, Photos) & Vehicle Registration (Max 3) */}
            {selectedRole === 'TRANSPORT' && (
              <View className="space-y-4 mt-4">
                {/* 1. Driver Identity: Driving License & Aadhaar Card */}
                <View
                  style={{
                    backgroundColor: '#eff6ff',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: '#bfdbfe',
                  }}
                >
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <ShieldCheck size={18} color="#2563eb" />
                    <Text className="text-xs font-black text-blue-950 uppercase tracking-wider">
                      Driver Identity & Verification *
                    </Text>
                  </View>
                  <Text className="text-xs text-blue-800 mb-3.5">
                    Enter your official Driving License and Aadhaar details. Document photos can be uploaded now or later.
                  </Text>

                  {/* Driving License Number */}
                  <View className="mb-3">
                    <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      Driving License (DL) Number *
                    </Text>
                    <View className="bg-white border border-blue-200 rounded-xl px-3.5 py-2.5">
                      <TextInput
                        value={transportLicense}
                        onChangeText={setTransportLicense}
                        maxLength={20}
                        placeholder="e.g. KA27 20210008459"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="characters"
                        className="text-sm text-slate-900 uppercase font-bold"
                      />
                    </View>
                  </View>

                  {/* Photo of DL (Optional for now) */}
                  <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs font-bold text-slate-700 uppercase">
                        Photo of Driving License <Text className="text-red-500">*</Text>
                      </Text>
                      <View className="bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <Text className="text-[10px] font-bold text-red-600">Compulsory *</Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-slate-500 mb-2">
                      Capture or choose a photo of your valid commercial driving license.
                    </Text>

                    {transportLicensePhoto ? (
                      <View className="bg-white rounded-xl p-2.5 border border-blue-200">
                        <View style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                          <Image
                            source={{ uri: transportLicensePhoto }}
                            style={{ width: '100%', height: 140, borderRadius: 10 }}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setTransportLicensePhoto(null)}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              backgroundColor: '#dc2626',
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={13} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center mt-2 pt-1.5 border-t border-slate-100">
                          <CheckCircle2 size={14} color="#16a34a" />
                          <Text className="text-xs font-bold text-emerald-700 ml-1">
                            Driving License photo attached
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleTakeLicensePhoto}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-blue-200 flex-row items-center justify-center shadow-sm"
                        >
                          <Camera size={14} color="#2563eb" className="mr-1.5" />
                          <Text className="text-xs font-bold text-blue-700">Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handlePickLicenseGallery}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-blue-200 flex-row items-center justify-center shadow-sm"
                        >
                          <ImageIcon size={14} color="#2563eb" className="mr-1.5" />
                          <Text className="text-xs font-bold text-blue-700">From Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Aadhaar Card Number */}
                  <View className="mb-3">
                    <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      Aadhaar Card Number *
                    </Text>
                    <View className="bg-white border border-blue-200 rounded-xl px-3.5 py-2.5">
                      <TextInput
                        value={transportAadhaar}
                        onChangeText={setTransportAadhaar}
                        maxLength={14}
                        placeholder="e.g. 5489 1234 5678"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        className="text-sm text-slate-900 font-bold"
                      />
                    </View>
                  </View>

                  {/* Photo of Aadhaar Card (Optional for now) */}
                  <View>
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs font-bold text-slate-700 uppercase">
                        Photo of Aadhaar Card <Text className="text-red-500">*</Text>
                      </Text>
                      <View className="bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        <Text className="text-[10px] font-bold text-red-600">Compulsory *</Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-slate-500 mb-2">
                      Capture or choose a photo of your front or back Aadhaar card.
                    </Text>

                    {transportAadhaarPhoto ? (
                      <View className="bg-white rounded-xl p-2.5 border border-blue-200">
                        <View style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                          <Image
                            source={{ uri: transportAadhaarPhoto }}
                            style={{ width: '100%', height: 140, borderRadius: 10 }}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setTransportAadhaarPhoto(null)}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              backgroundColor: '#dc2626',
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={13} color="#ffffff" />
                          </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center mt-2 pt-1.5 border-t border-slate-100">
                          <CheckCircle2 size={14} color="#16a34a" />
                          <Text className="text-xs font-bold text-emerald-700 ml-1">
                            Aadhaar card photo attached
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handleTakeAadhaarPhoto}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-blue-200 flex-row items-center justify-center shadow-sm"
                        >
                          <Camera size={14} color="#2563eb" className="mr-1.5" />
                          <Text className="text-xs font-bold text-blue-700">Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={handlePickAadhaarGallery}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-blue-200 flex-row items-center justify-center shadow-sm"
                        >
                          <ImageIcon size={14} color="#2563eb" className="mr-1.5" />
                          <Text className="text-xs font-bold text-blue-700">From Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {/* 2. Separate Section Named Vehicle Registration */}
                <View
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-1.5">
                      <Truck size={18} color="#2563eb" />
                      <Text className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        Vehicle Registration
                      </Text>
                    </View>
                    <View className="bg-blue-600 px-2.5 py-0.5 rounded-full">
                      <Text className="text-[10px] font-black text-white">MIN 1 • MAX 3</Text>
                    </View>
                  </View>

                  {/* Mandatory note requested by user */}
                  <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                    <Text className="text-xs font-bold text-blue-900 leading-relaxed">
                      ** Note: Register your primary vehicle below. You can register up to a maximum of 3 vehicles under your driver ID in your Transport Dashboard.
                    </Text>
                  </View>

                  {/* Commercial Yellow Plate Notice */}
                  <View className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 mb-3 flex-row items-center">
                    <Text className="text-base mr-2">🟡</Text>
                    <Text className="text-[11px] font-bold text-amber-950 flex-1 leading-tight">
                      Only the yellow color vehicle number plate is allowed to register in this. Commercial yellow boards only.
                    </Text>
                  </View>

                  {/* Vehicle 1 Form (Primary) */}
                  <View
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 18,
                      padding: 14,
                      marginBottom: 12,
                      borderWidth: 1.5,
                      borderColor: '#2563eb',
                      shadowColor: '#2563eb',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100">
                      <View className="flex-row items-center gap-1.5">
                        <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                          <Text className="text-xs font-bold text-white">1</Text>
                        </View>
                        <Text className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Primary Vehicle *
                        </Text>
                        <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-blue-700">PRIMARY ON-ROAD</Text>
                        </View>
                      </View>
                    </View>

                    {/* Vehicle Type Pills */}
                    <View className="mb-3">
                      <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                        Vehicle Type *
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {['Car', 'Bike', 'Auto', 'Taxi', 'Tempo', 'Truck', 'Other'].map((type) => {
                          const isSel = v1Type === type;
                          return (
                            <TouchableOpacity
                              key={type}
                              activeOpacity={0.7}
                              onPress={() => {
                                setV1Type(type);
                                const def = getDefaultRatesForType(type);
                                setV1RatePerKm(def.rate);
                                setV1BaseFare(def.base);
                              }}
                              className={`px-3 py-1.5 rounded-xl border ${isSel ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'
                                }`}
                            >
                              <Text className={`text-xs font-bold ${isSel ? 'text-white' : 'text-slate-700'}`}>
                                {type === 'Bike' ? 'Bike (Two-Wheeler)' : type}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {v1Type === 'Other' && (
                        <View className="mt-2.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                          <Text className="text-[11px] font-bold text-blue-900 mb-1">
                            Specify Custom Vehicle Type *
                          </Text>
                          <TextInput
                            value={v1CustomType}
                            onChangeText={setV1CustomType}
                            maxLength={30}
                            placeholder="e.g. Mini Bus, Force Traveller, Electric Buggy"
                            placeholderTextColor="#94a3b8"
                            className="bg-white rounded-lg px-3 py-2 text-xs text-slate-800 border border-blue-200"
                          />
                        </View>
                      )}
                    </View>

                    {/* Primary Vehicle Model & Color */}
                    <View className="mb-3">
                      <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                        Primary Vehicle Model & Color *
                      </Text>
                      <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                        <TextInput
                          value={v1Model}
                          onChangeText={setV1Model}
                          maxLength={50}
                          placeholder="e.g. White Toyota Corolla / Yellow Bajaj RE Auto"
                          placeholderTextColor="#94a3b8"
                          className="text-sm text-slate-800"
                        />
                      </View>
                    </View>

                    {/* Registration Number Plate (Yellow Board Commercial Plate Styling) */}
                    <View className="mb-3">
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-xs font-bold text-slate-700 uppercase">
                          Registration Number Plate *
                        </Text>
                        
                      </View>
                      <View
                        style={{
                          backgroundColor: '#fef08a',
                          borderColor: '#ca8a04',
                          borderWidth: 2,
                          borderRadius: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: Platform.OS === 'ios' ? 10 : 7,
                        }}
                      >
                        <View style={{ alignItems: 'center', marginRight: 10, paddingRight: 8, borderRightWidth: 1.5, borderRightColor: '#a16207' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8', marginBottom: 2 }} />
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 }}>IND</Text>
                        </View>
                        <TextInput
                          value={v1Plate}
                          onChangeText={setV1Plate}
                          maxLength={15}
                          placeholder="__ __ _ ____"
                          placeholderTextColor="#854d0e"
                          autoCapitalize="characters"
                          style={{
                            flex: 1,
                            fontSize: 15,
                            fontWeight: '900',
                            color: '#0f172a',
                            letterSpacing: 1.2,
                          }}
                        />
                      </View>
                    </View>

                    {/* Rate per KM & Base Price */}
                    <View className="flex-row gap-2.5">
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Rate / KM (₹) *
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                          <TextInput
                            value={v1RatePerKm}
                            onChangeText={setV1RatePerKm}
                            maxLength={8}
                            keyboardType="numeric"
                            placeholder="20"
                            placeholderTextColor="#94a3b8"
                            className="text-sm font-bold text-slate-800"
                          />
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Base Price (₹) *
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                          <TextInput
                            value={v1BaseFare}
                            onChangeText={setV1BaseFare}
                            maxLength={8}
                            keyboardType="numeric"
                            placeholder="30"
                            placeholderTextColor="#94a3b8"
                            className="text-sm font-bold text-slate-800"
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Vehicle 2 Form (if active) */}
                  {hasV2 && (
                    <View
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 18,
                        padding: 14,
                        marginBottom: 12,
                        borderWidth: 1.5,
                        borderColor: '#94a3b8',
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <View className="flex-row items-center gap-1.5">
                          <View className="w-6 h-6 rounded-full bg-slate-700 items-center justify-center">
                            <Text className="text-xs font-bold text-white">2</Text>
                          </View>
                          <Text className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Secondary Vehicle (2nd)
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            setHasV2(false);
                            setHasV3(false);
                          }}
                          className="flex-row items-center bg-red-50 px-2.5 py-1 rounded-lg border border-red-200"
                        >
                          <Trash2 size={12} color="#dc2626" />
                          <Text className="text-[11px] font-bold text-red-600 ml-1">Remove</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Vehicle Type Pills */}
                      <View className="mb-3">
                        <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Vehicle Type *
                        </Text>
                        <View className="flex-row flex-wrap gap-1.5">
                          {['Car', 'Bike', 'Auto', 'Taxi', 'Tempo', 'Truck', 'Other'].map((type) => {
                            const isSel = v2Type === type;
                            return (
                              <TouchableOpacity
                                key={type}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setV2Type(type);
                                  const def = getDefaultRatesForType(type);
                                  setV2RatePerKm(def.rate);
                                  setV2BaseFare(def.base);
                                }}
                                className={`px-3 py-1.5 rounded-xl border ${isSel ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'
                                  }`}
                              >
                                <Text className={`text-xs font-bold ${isSel ? 'text-white' : 'text-slate-700'}`}>
                                  {type === 'Bike' ? 'Bike (Two-Wheeler)' : type}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {v2Type === 'Other' && (
                          <View className="mt-2.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                            <Text className="text-[11px] font-bold text-blue-900 mb-1">
                              Specify Custom Vehicle Type *
                            </Text>
                            <TextInput
                              value={v2CustomType}
                              onChangeText={setV2CustomType}
                              maxLength={30}
                              placeholder="e.g. Mini Bus, Force Traveller, Buggy"
                              placeholderTextColor="#94a3b8"
                              className="bg-white rounded-lg px-3 py-2 text-xs text-slate-800 border border-blue-200"
                            />
                          </View>
                        )}
                      </View>

                      {/* Vehicle Model & Color */}
                      <View className="mb-3">
                        <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Vehicle Model & Color *
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                          <TextInput
                            value={v2Model}
                            onChangeText={setV2Model}
                            maxLength={50}
                            placeholder="e.g. Yellow Bajaj Maxima Auto / Maruti Swift"
                            placeholderTextColor="#94a3b8"
                            className="text-sm text-slate-800"
                          />
                        </View>
                      </View>

                      {/* Registration Number Plate */}
                      <View className="mb-3">
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text className="text-xs font-bold text-slate-700 uppercase">
                            Registration Number Plate *
                          </Text>

                        </View>
                        <View
                          style={{
                            backgroundColor: '#fef08a',
                            borderColor: '#ca8a04',
                            borderWidth: 2,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: Platform.OS === 'ios' ? 10 : 7,
                          }}
                        >
                          <View style={{ alignItems: 'center', marginRight: 10, paddingRight: 8, borderRightWidth: 1.5, borderRightColor: '#a16207' }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8', marginBottom: 2 }} />
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 }}>IND</Text>
                          </View>
                          <TextInput
                            value={v2Plate}
                            onChangeText={setV2Plate}
                            maxLength={15}
                            placeholder="KA 27 B 1234"
                            placeholderTextColor="#854d0e"
                            autoCapitalize="characters"
                            style={{
                              flex: 1,
                              fontSize: 15,
                              fontWeight: '900',
                              color: '#0f172a',
                              letterSpacing: 1.2,
                            }}
                          />
                        </View>
                      </View>

                      {/* Rate per KM & Base Price */}
                      <View className="flex-row gap-2.5">
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                            Rate / KM (₹) *
                          </Text>
                          <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                            <TextInput
                              value={v2RatePerKm}
                              onChangeText={setV2RatePerKm}
                              maxLength={8}
                              keyboardType="numeric"
                              placeholder="20"
                              placeholderTextColor="#94a3b8"
                              className="text-sm font-bold text-slate-800"
                            />
                          </View>
                        </View>

                        <View className="flex-1">
                          <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                            Base Price (₹) *
                          </Text>
                          <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                            <TextInput
                              value={v2BaseFare}
                              onChangeText={setV2BaseFare}
                              maxLength={8}
                              keyboardType="numeric"
                              placeholder="30"
                              placeholderTextColor="#94a3b8"
                              className="text-sm font-bold text-slate-800"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Button to Add 2nd Vehicle (if not yet added) */}
                  {!hasV2 && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setHasV2(true)}
                      style={{
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: '#2563eb',
                        backgroundColor: '#eff6ff',
                        borderRadius: 16,
                        paddingVertical: 13,
                        paddingHorizontal: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        marginBottom: 4,
                      }}
                    >
                      <Plus size={16} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1d4ed8' }}>
                        + Add 2nd Vehicle (Optional)
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Vehicle 3 Form (if active) */}
                  {hasV2 && hasV3 && (
                    <View
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 18,
                        padding: 14,
                        marginBottom: 12,
                        borderWidth: 1.5,
                        borderColor: '#94a3b8',
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100">
                        <View className="flex-row items-center gap-1.5">
                          <View className="w-6 h-6 rounded-full bg-slate-700 items-center justify-center">
                            <Text className="text-xs font-bold text-white">3</Text>
                          </View>
                          <Text className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Third Vehicle (3rd - Max)
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setHasV3(false)}
                          className="flex-row items-center bg-red-50 px-2.5 py-1 rounded-lg border border-red-200"
                        >
                          <Trash2 size={12} color="#dc2626" />
                          <Text className="text-[11px] font-bold text-red-600 ml-1">Remove</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Vehicle Type Pills */}
                      <View className="mb-3">
                        <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Vehicle Type *
                        </Text>
                        <View className="flex-row flex-wrap gap-1.5">
                          {['Car', 'Bike', 'Auto', 'Taxi', 'Tempo', 'Truck', 'Other'].map((type) => {
                            const isSel = v3Type === type;
                            return (
                              <TouchableOpacity
                                key={type}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setV3Type(type);
                                  const def = getDefaultRatesForType(type);
                                  setV3RatePerKm(def.rate);
                                  setV3BaseFare(def.base);
                                }}
                                className={`px-3 py-1.5 rounded-xl border ${isSel ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200'
                                  }`}
                              >
                                <Text className={`text-xs font-bold ${isSel ? 'text-white' : 'text-slate-700'}`}>
                                  {type === 'Bike' ? 'Bike (Two-Wheeler)' : type}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {v3Type === 'Other' && (
                          <View className="mt-2.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200">
                            <Text className="text-[11px] font-bold text-blue-900 mb-1">
                              Specify Custom Vehicle Type *
                            </Text>
                            <TextInput
                              value={v3CustomType}
                              onChangeText={setV3CustomType}
                              maxLength={30}
                              placeholder="e.g. Mini Bus, Force Traveller"
                              placeholderTextColor="#94a3b8"
                              className="bg-white rounded-lg px-3 py-2 text-xs text-slate-800 border border-blue-200"
                            />
                          </View>
                        )}
                      </View>

                      {/* Vehicle Model & Color */}
                      <View className="mb-3">
                        <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Vehicle Model & Color *
                        </Text>
                        <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                          <TextInput
                            value={v3Model}
                            onChangeText={setV3Model}
                            maxLength={50}
                            placeholder="e.g. White Mahindra Treo / Blue Tata Ace"
                            placeholderTextColor="#94a3b8"
                            className="text-sm text-slate-800"
                          />
                        </View>
                      </View>

                      {/* Registration Number Plate */}
                      <View className="mb-3">
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text className="text-xs font-bold text-slate-700 uppercase">
                            Registration Number Plate *
                          </Text>
                          
                        </View>
                        <View
                          style={{
                            backgroundColor: '#fef08a',
                            borderColor: '#ca8a04',
                            borderWidth: 2,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: Platform.OS === 'ios' ? 10 : 7,
                          }}
                        >
                          <View style={{ alignItems: 'center', marginRight: 10, paddingRight: 8, borderRightWidth: 1.5, borderRightColor: '#a16207' }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8', marginBottom: 2 }} />
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 }}>IND</Text>
                          </View>
                          <TextInput
                            value={v3Plate}
                            onChangeText={setV3Plate}
                            maxLength={15}
                            placeholder="KA 27 E 9988"
                            placeholderTextColor="#854d0e"
                            autoCapitalize="characters"
                            style={{
                              flex: 1,
                              fontSize: 15,
                              fontWeight: '900',
                              color: '#0f172a',
                              letterSpacing: 1.2,
                            }}
                          />
                        </View>
                      </View>

                      {/* Rate per KM & Base Price */}
                      <View className="flex-row gap-2.5">
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                            Rate / KM (₹) *
                          </Text>
                          <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                            <TextInput
                              value={v3RatePerKm}
                              onChangeText={setV3RatePerKm}
                              maxLength={8}
                              keyboardType="numeric"
                              placeholder="20"
                              placeholderTextColor="#94a3b8"
                              className="text-sm font-bold text-slate-800"
                            />
                          </View>
                        </View>

                        <View className="flex-1">
                          <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                            Base Price (₹) *
                          </Text>
                          <View className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                            <TextInput
                              value={v3BaseFare}
                              onChangeText={setV3BaseFare}
                              maxLength={8}
                              keyboardType="numeric"
                              placeholder="30"
                              placeholderTextColor="#94a3b8"
                              className="text-sm font-bold text-slate-800"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Button to Add 3rd Vehicle (if V2 added but not V3) */}
                  {hasV2 && !hasV3 && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setHasV3(true)}
                      style={{
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: '#2563eb',
                        backgroundColor: '#eff6ff',
                        borderRadius: 16,
                        paddingVertical: 13,
                        paddingHorizontal: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        marginBottom: 4,
                      }}
                    >
                      <Plus size={16} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#1d4ed8' }}>
                        + Add 3rd Vehicle (Optional)
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Max 3 Quota Badge */}
                  {hasV2 && hasV3 && (
                    <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 items-center mt-1">
                      <Text className="text-xs font-bold text-emerald-800">
                        ✓ Maximum 3 vehicles registered for this driver application.
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* 4. Description (Only for non-transport shops/services) */}
            {selectedRole !== 'TRANSPORT' && (
              <View className="mt-4">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Description of Products / Services *
                </Text>
                <View className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    maxLength={350}
                    placeholder="Tell customers and the admin about what your shop sells or the services you provide..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="text-sm text-slate-800 min-h-[80px]"
                  />
                </View>
              </View>
            )}

            {/* 5. Location with Auto GPS Fetching */}
            <View className="mt-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {selectedRole === 'TRANSPORT' ? ' City / Base Address *' : 'Location / Shop Address *'}
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
                  maxLength={120}
                  placeholder={
                    selectedRole === 'TRANSPORT'
                      ? 'e.g. Haveri Town, Near Old Bus Stand, Karnataka'
                      : 'e.g. MG Road, Near Gandhi Circle, Haveri - 581110'
                  }
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
                  maxLength={14}
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
                  maxLength={60}
                  placeholder="e.g. contact@myshop.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2.5 text-sm text-slate-800"
                />
              </View>
            </View>

            {/* 8. Photo of the Shop (Optional) - Only for Non-Transport */}
            {selectedRole !== 'TRANSPORT' && (
              <View className="mt-4">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Photo of the Storefront / Business <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                    <Text className="text-[10px] font-bold text-red-600">Compulsory *</Text>
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
            )}

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
                    className={`flex-row items-center justify-between p-3.5 rounded-xl border mb-2 ${isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-100 bg-slate-50'
                      }`}
                  >
                    <Text
                      className={`text-sm ${isSelected ? 'font-bold text-emerald-800' : 'font-medium text-slate-700'
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
                    className={`flex-row items-center justify-between p-3.5 rounded-xl border mb-2 ${isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-100 bg-slate-50'
                      }`}
                  >
                    <Text
                      className={`text-sm ${isSelected ? 'font-bold text-emerald-800' : 'font-medium text-slate-700'
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
