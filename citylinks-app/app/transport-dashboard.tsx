import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Truck,
  Car,
  MapPin,
  Phone,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Navigation,
  Crosshair,
  CheckCircle,
  Clock,
  ShieldCheck,
  Star,
  RefreshCw,
  KeyRound,
  FileText,
  AlertCircle,
  ArrowRight,
  User,
  Zap,
  Camera,
  Image as ImageIcon,
  CreditCard,
  Eye,
  ChevronRight,
  Search,
  Filter,
  Calendar,
  Pencil,
  AlertTriangle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/apiClient';
import { queryCache } from '../utils/queryCache';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { compressDocument } from '../utils/imageCompressor';
import { uploadImageToCloudflare } from '../services/imageUpload';

// Vehicle type choices (User specified: Car, Bike, Auto, Taxi, Tempo, Truck, Other)
const VEHICLE_TYPES = [
  { id: 'Car', label: 'Car', icon: 'car', defaultRate: 20, defaultBase: 35 },
  { id: 'Bike', label: 'Bike', icon: 'bike', defaultRate: 8, defaultBase: 15 },
  { id: 'Auto', label: 'Auto', icon: 'auto', defaultRate: 14, defaultBase: 25 },
  { id: 'Taxi', label: 'Taxi', icon: 'car', defaultRate: 22, defaultBase: 40 },
  { id: 'Tempo', label: 'Tempo', icon: 'truck', defaultRate: 45, defaultBase: 150 },
  { id: 'Truck', label: 'Truck', icon: 'truck', defaultRate: 60, defaultBase: 300 },
  { id: 'Other', label: 'Other', icon: 'car', defaultRate: 20, defaultBase: 30 },
];

export interface RegisteredVehicle {
  id: string;
  driverId: string;
  userId?: string;
  vehicleType: string;
  modelName: string;
  plateNumber: string;
  ratePerKm: number;
  baseFare: number;
  categoryCode: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TransportDashboardScreen() {
  const { userData, setUserData, setUserToken } = useApp();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Driver details state
  const [driver, setDriver] = useState<any>(null);
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>([]);
  const [activeVehicle, setActiveVehicle] = useState<RegisteredVehicle | null>(null);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalEarnings: 0,
    rating: 4.8,
    isOnline: true,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [updatingOnline, setUpdatingOnline] = useState(false);

  // Trips state
  const [activeTab, setActiveTab] = useState<'vehicles' | 'rides' | 'profile'>('vehicles');
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Ride History Filter & Pagination of 6
  const [rideSearchQuery, setRideSearchQuery] = useState('');
  const [rideStatusFilter, setRideStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED' | 'ACTIVE'>('ALL');
  const [rideDateFilter, setRideDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [rideKmFilter, setRideKmFilter] = useState<'ALL' | 'SHORT' | 'MEDIUM' | 'LONG'>('ALL');
  const [rideHistoryPage, setRideHistoryPage] = useState(1);
  const RIDE_PAGE_SIZE = 6;

  // Filtered ride history based on date, completed, cancelled, km, search
  const filteredTrips = useMemo(() => {
    return recentTrips.filter((trip) => {
      // 1. Status Filter (Completed, Cancelled, Active)
      if (rideStatusFilter === 'COMPLETED' && trip.status !== 'COMPLETED') return false;
      if (rideStatusFilter === 'CANCELLED' && trip.status !== 'CANCELLED') return false;
      if (rideStatusFilter === 'ACTIVE' && !['ACCEPTED', 'ONGOING', 'DESTINATION_REACHED'].includes(trip.status)) return false;

      // 2. Date Filter (Today, Week, Month, Year)
      if (rideDateFilter !== 'ALL' && trip.createdAt) {
        const tripDate = new Date(trip.createdAt);
        const now = new Date();
        if (rideDateFilter === 'TODAY') {
          const isToday =
            tripDate.getDate() === now.getDate() &&
            tripDate.getMonth() === now.getMonth() &&
            tripDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (rideDateFilter === 'WEEK') {
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (tripDate < oneWeekAgo) return false;
        } else if (rideDateFilter === 'MONTH') {
          const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          if (tripDate < oneMonthAgo) return false;
        } else if (rideDateFilter === 'YEAR') {
          const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          if (tripDate < oneYearAgo) return false;
        }
      }

      // 3. Distance (KM) Filter (< 5 km, 5–15 km, > 15 km)
      const km = Number(trip.distanceKm) || 0;
      if (rideKmFilter === 'SHORT' && km >= 5) return false;
      if (rideKmFilter === 'MEDIUM' && (km < 5 || km > 15)) return false;
      if (rideKmFilter === 'LONG' && km <= 15) return false;

      // 4. Search query (matches passenger, destination, pickup, or km)
      if (rideSearchQuery.trim()) {
        const q = rideSearchQuery.toLowerCase().trim();
        const passenger = (trip.userName || '').toLowerCase();
        const pickup = (trip.pickupAddress || '').toLowerCase();
        const dest = (trip.destinationAddress || '').toLowerCase();
        const kmStr = String(trip.distanceKm || '');
        const idStr = String(trip.id || '').toLowerCase();
        const matches =
          passenger.includes(q) ||
          pickup.includes(q) ||
          dest.includes(q) ||
          kmStr.includes(q) ||
          idStr.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [recentTrips, rideStatusFilter, rideDateFilter, rideKmFilter, rideSearchQuery]);

  // Total pages
  const totalRidePages = Math.max(1, Math.ceil(filteredTrips.length / RIDE_PAGE_SIZE));
  const currentTripsPage = Math.min(rideHistoryPage, totalRidePages);

  // Paginated 6 items
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentTripsPage - 1) * RIDE_PAGE_SIZE;
    return filteredTrips.slice(startIndex, startIndex + RIDE_PAGE_SIZE);
  }, [filteredTrips, currentTripsPage]);

  // Incoming ride requests from passengers
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);

  // OTP Verification for Active Ride
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Modals state
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [editLicensePhoto, setEditLicensePhoto] = useState<string | null>(null);
  const [editAadhaar, setEditAadhaar] = useState('');
  const [editAadhaarPhoto, setEditAadhaarPhoto] = useState<string | null>(null);
  const [editEmergency, setEditEmergency] = useState('');
  const [editRatePerKm, setEditRatePerKm] = useState('20');
  const [editBaseFare, setEditBaseFare] = useState('30');
  const [savingProfile, setSavingProfile] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  // Full Image Preview Modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);



  // Vehicle Modal (Add / Edit) - MAX 3 VEHICLES ENFORCED
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vType, setVType] = useState('Car');
  const [vOtherType, setVOtherType] = useState('');
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vRatePerKm, setVRatePerKm] = useState('20');
  const [vBaseFare, setVBaseFare] = useState('30');
  const [vIsPrimary, setVIsPrimary] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Fetch driver profile & vehicles with caching
  const loadDriverData = useCallback(async (showIndicator = false, force = false) => {
    const cacheKey = 'transport-driver-profile';
    if (!force) {
      const cached = queryCache.get<any>(cacheKey);
      if (cached && cached.success) {
        setDriver(cached.driver);
        setVehicles(cached.vehicles || []);
        setActiveVehicle(cached.activeVehicle || null);
        setIsOnline(Boolean(cached.driver?.isAvailable));
        if (cached.stats) setStats(cached.stats);
        setPendingRequests(cached.pendingRequests || []);
        setActiveTrip(cached.activeTrip || null);
      }
    }
    try {
      if (showIndicator && !driver && !queryCache.get(cacheKey)) setLoading(true);
      const res = await queryCache.fetchWithDeduplication(cacheKey, () =>
        apiClient.get('/transport/driver/me')
      );
      if (res.data?.success) {
        queryCache.set(cacheKey, res.data, 60_000, true);
        setDriver(res.data.driver);
        setVehicles(res.data.vehicles || []);
        setActiveVehicle(res.data.activeVehicle || null);
        setIsOnline(Boolean(res.data.driver?.isAvailable));
        if (res.data.stats) {
          setStats(res.data.stats);
        }
        setPendingRequests(res.data.pendingRequests || []);
        setActiveTrip(res.data.activeTrip || null);
      }
    } catch (err: any) {
      // If 404, user needs to register driver profile
      if (err.response?.status === 404) {
        setDriver(null);
        setVehicles([]);
      } else {
        showError(err.response?.data?.error || 'Failed to load transport dashboard', 'Error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError, driver]);

  // Fetch Trips with caching
  const loadTrips = useCallback(async (force = false) => {
    if (!driver?.id) return;
    const cacheKey = `transport-driver-trips-${driver.id}`;
    if (!force) {
      const cached = queryCache.get<any>(cacheKey);
      if (cached && cached.success) {
        setRecentTrips(cached.trips || []);
        if (cached.requestedTrips) setPendingRequests(cached.requestedTrips);
        if (cached.activeTrips && cached.activeTrips.length > 0) {
          setActiveTrip(cached.activeTrips[0]);
        }
      }
    }
    try {
      if (recentTrips.length === 0 && !queryCache.get(cacheKey)) setLoadingTrips(true);
      const res = await queryCache.fetchWithDeduplication(cacheKey, () =>
        apiClient.get('/transport/driver/trips', { params: { driverId: driver.id } })
      );
      if (res.data?.success) {
        queryCache.set(cacheKey, res.data, 20_000, true);
        setRecentTrips(res.data.trips || []);
        if (res.data.requestedTrips) {
          setPendingRequests(res.data.requestedTrips);
        }
        if (res.data.activeTrips && res.data.activeTrips.length > 0) {
          setActiveTrip(res.data.activeTrips[0]);
        } else if (!res.data.activeTrips || res.data.activeTrips.length === 0) {
          setActiveTrip(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoadingTrips(false);
    }
  }, [driver?.id, recentTrips.length]);

  // Real-time polling: auto-refresh incoming ride requests every 3.5 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadDriverData(false);
      loadTrips();
    }, 3500);
    return () => clearInterval(pollInterval);
  }, [loadDriverData, loadTrips]);

  useEffect(() => {
    loadDriverData(true);
  }, [loadDriverData]);

  useFocusEffect(
    useCallback(() => {
      loadDriverData(false);
      loadTrips();
    }, [loadDriverData, loadTrips])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDriverData(false);
    loadTrips();
  }, [loadDriverData, loadTrips]);

  // Toggle Online / Offline
  const handleToggleOnline = async (newVal: boolean) => {
    setIsOnline(newVal);
    setUpdatingOnline(true);
    setDriver((prev: any) => (prev ? { ...prev, isAvailable: newVal } : prev));
    try {
      const res = await apiClient.post('/transport/driver/toggle-online', {
        driverId: driver?.id,
        isAvailable: newVal,
      });
      if (res.data?.success) {
        if (res.data?.driver) {
          setDriver(res.data.driver);
          setIsOnline(Boolean(res.data.driver.isAvailable));
        }
        showSuccess(
          newVal ? 'You are ONLINE and accepting customer rides!' : 'You are now OFFLINE',
          newVal ? 'Online' : 'Offline'
        );
      }
    } catch (err: any) {
      setIsOnline(!newVal);
      setDriver((prev: any) => (prev ? { ...prev, isAvailable: !newVal } : prev));
      showError('Failed to update status', 'Error');
    } finally {
      setUpdatingOnline(false);
    }
  };

  // Open Edit Profile Modal
  const handleOpenEditProfile = () => {
    setEditName(driver?.name || userData?.fullName || 'Karthik R.');
    setEditPhone(driver?.phone || userData?.phone || '9876543210');
    setEditLocation(driver?.location || userData?.address || 'Haveri Central Hub, Karnataka');
    setEditLicense(driver?.drivingLicense || 'KA27 20210008459');
    setEditLicensePhoto(driver?.drivingLicensePhoto || null);
    setEditAadhaar(driver?.aadhaarNumber || (userData as any)?.aadhaarNumber || '5489 1234 5678');
    setEditAadhaarPhoto(driver?.aadhaarPhoto || null);
    setEditEmergency(driver?.emergencyPhone || '9845112233');
    setEditRatePerKm(String(driver?.ratePerKm || 20));
    setEditBaseFare(String(driver?.baseFare || 30));
    setEditProfileModalOpen(true);
  };

  // Photo Picker Handlers
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
        setEditLicensePhoto(compressed);
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
        setEditLicensePhoto(compressed);
        showSuccess('Driving License photo selected & compressed!', 'Selected');
      }
    } catch (err: any) {
      showError('Failed to select license photo from gallery.', 'Gallery Error');
    }
  };

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
        setEditAadhaarPhoto(compressed);
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
        showError('Gallery access is required to select an Aadhaar Card photo.', 'Permission Needed');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressDocument(result.assets[0].uri);
        setEditAadhaarPhoto(compressed);
        showSuccess('Aadhaar photo selected & compressed!', 'Selected');
      }
    } catch (err: any) {
      showError('Failed to select Aadhaar photo from gallery.', 'Gallery Error');
    }
  };

  // Auto-Fetch GPS Location for Driver
  const handleAutoFetchLocation = async () => {
    setFetchingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Permission to access location was denied.', 'Permission Denied');
        setFetchingGps(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const rev = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (rev && rev.length > 0) {
        const place = rev[0];
        const formatted = [place.name, place.street, place.district || place.subregion, place.city, 'Karnataka']
          .filter(Boolean)
          .join(', ');
        setEditLocation(formatted);
        showSuccess(`GPS Location fetched: ${place.city || place.name}`, 'Location Set');
      }
    } catch (err: any) {
      showError('Failed to fetch GPS coordinates', 'GPS Error');
    } finally {
      setFetchingGps(false);
    }
  };

  // Save Driver Profile
  const handleSaveProfile = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      showError('Driver name and phone are required', 'Missing Fields');
      return;
    }

    setSavingProfile(true);
    try {
      let cloudflareLicense = editLicensePhoto;
      let cloudflareAadhaar = editAadhaarPhoto;

      if (editLicensePhoto && !editLicensePhoto.startsWith('http')) {
        cloudflareLicense = await uploadImageToCloudflare(editLicensePhoto);
      }
      if (editAadhaarPhoto && !editAadhaarPhoto.startsWith('http')) {
        cloudflareAadhaar = await uploadImageToCloudflare(editAadhaarPhoto);
      }

      if (!driver?.id) {
        // First-time registration
        const res = await apiClient.post('/transport/driver/register', {
          name: editName.trim(),
          phone: editPhone.trim(),
          location: editLocation.trim(),
          drivingLicense: editLicense.trim(),
          drivingLicensePhoto: cloudflareLicense,
          aadhaarNumber: editAadhaar.trim(),
          aadhaarPhoto: cloudflareAadhaar,
          emergencyPhone: editEmergency.trim(),
          ratePerKm: parseFloat(editRatePerKm) || 20,
          baseFare: parseFloat(editBaseFare) || 30,
          vehicleType: 'Car',
          modelName: 'White Toyota Corolla',
          plateNumber: 'KA 27 M 4589',
        });
        showSuccess(res.data?.message || 'Driver profile registered!', 'Registered');
      } else {
        const res = await apiClient.put('/transport/driver/profile', {
          driverId: driver.id,
          name: editName.trim(),
          phone: editPhone.trim(),
          location: editLocation.trim(),
          drivingLicense: editLicense.trim(),
          drivingLicensePhoto: cloudflareLicense,
          aadhaarNumber: editAadhaar.trim(),
          aadhaarPhoto: cloudflareAadhaar,
          emergencyPhone: editEmergency.trim(),
          ratePerKm: parseFloat(editRatePerKm) || 20,
          baseFare: parseFloat(editBaseFare) || 30,
        });
        showSuccess('Driver profile updated successfully', 'Saved');
      }
      setEditProfileModalOpen(false);
      loadDriverData(false);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to save profile', 'Error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Vehicle Modal for Adding (WITH MAX 3 CHECK)
  const handleOpenAddVehicle = () => {
    if (vehicles.length >= 3) {
      Alert.alert(
        'Maximum 3 Vehicles Limit Reached',
        'You have already registered the maximum limit of 3 vehicles under this driver ID. To register a different vehicle, please delete or edit one of your existing vehicles.',
        [{ text: 'OK' }]
      );
      return;
    }

    setEditingVehicleId(null);
    setVType('Car');
    setVOtherType('');
    setVModel('');
    setVPlate('');
    setVRatePerKm('20');
    setVBaseFare('30');
    setVIsPrimary(vehicles.length === 0);
    setVehicleModalOpen(true);
  };

  // Open Vehicle Modal for Editing
  const handleOpenEditVehicle = (veh: RegisteredVehicle) => {
    setEditingVehicleId(veh.id);
    const isStandard = VEHICLE_TYPES.some((vt) => vt.id === veh.vehicleType && vt.id !== 'Other');
    if (isStandard) {
      setVType(veh.vehicleType);
      setVOtherType('');
    } else {
      setVType('Other');
      setVOtherType(veh.vehicleType);
    }
    setVModel(veh.modelName);
    setVPlate(veh.plateNumber);
    setVRatePerKm(String(veh.ratePerKm || 20));
    setVBaseFare(String(veh.baseFare || 30));
    setVIsPrimary(veh.isPrimary);
    setVehicleModalOpen(true);
  };

  // Save Vehicle (Add or Edit)
  const handleSaveVehicle = async () => {
    if (!vModel.trim() || !vPlate.trim()) {
      showError('Please enter vehicle model name and registration number plate', 'Missing Fields');
      return;
    }

    if (vType === 'Other' && !vOtherType.trim()) {
      showError('Please specify the custom vehicle type', 'Missing Vehicle Type');
      return;
    }

    const effectiveVehicleType = vType === 'Other' ? vOtherType.trim() : vType;

    if (!editingVehicleId && vehicles.length >= 3) {
      showError('Maximum 3 vehicles allowed under your driver account', 'Limit Exceeded');
      return;
    }

    setSavingVehicle(true);
    try {
      if (editingVehicleId) {
        // Edit vehicle
        const res = await apiClient.put(`/transport/driver/vehicles/${editingVehicleId}`, {
          vehicleType: effectiveVehicleType,
          modelName: vModel.trim(),
          plateNumber: vPlate.trim().toUpperCase(),
          ratePerKm: parseFloat(vRatePerKm) || 20,
          baseFare: parseFloat(vBaseFare) || 30,
        });
        showSuccess(res.data?.message || 'Vehicle updated successfully', 'Vehicle Updated');
      } else {
        // Add vehicle (max 3 enforced)
        const res = await apiClient.post('/transport/driver/vehicles', {
          driverId: driver?.id,
          vehicleType: effectiveVehicleType,
          modelName: vModel.trim(),
          plateNumber: vPlate.trim().toUpperCase(),
          ratePerKm: parseFloat(vRatePerKm) || 20,
          baseFare: parseFloat(vBaseFare) || 30,
          isPrimary: vIsPrimary,
        });
        showSuccess(res.data?.message || 'Vehicle registered to your fleet!', 'Vehicle Added');
      }
      setVehicleModalOpen(false);
      loadDriverData(false);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to save vehicle', 'Error');
    } finally {
      setSavingVehicle(false);
    }
  };

  // Set Active on-road vehicle
  const handleSetActiveVehicle = async (veh: RegisteredVehicle) => {
    if (veh.isPrimary) return;
    try {
      const res = await apiClient.put(`/transport/driver/vehicles/${veh.id}/set-active`);
      if (res.data?.success) {
        showSuccess(`Active on-road vehicle set to ${veh.modelName} (${veh.plateNumber})`, 'Vehicle Switched');
        loadDriverData(false);
      }
    } catch (err: any) {
      showError('Failed to switch active vehicle', 'Error');
    }
  };

  // Delete Vehicle
  const handleDeleteVehicle = (veh: RegisteredVehicle) => {
    Alert.alert(
      'Remove Vehicle',
      `Are you sure you want to remove "${veh.modelName}" (${veh.plateNumber}) from your driver account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiClient.delete(`/transport/driver/vehicles/${veh.id}`);
              showSuccess(res.data?.message || 'Vehicle removed', 'Removed');
              loadDriverData(false);
            } catch (err: any) {
              showError('Failed to delete vehicle', 'Error');
            }
          },
        },
      ]
    );
  };

  // Verify Passenger OTP to Start Ride
  const handleVerifyOtp = async () => {
    if (!activeTrip?.id) return;
    if (!inputOtp.trim() || inputOtp.trim().length !== 4) {
      setOtpError('Please enter the 4-digit PIN provided by passenger');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await apiClient.post(`/transport/bookings/${activeTrip.id}/verify-otp`, {
        otp: inputOtp.trim(),
      });
      if (res.data?.success) {
        showSuccess('Passenger OTP verified! Ride is now ongoing.', 'Ride Started');
        setInputOtp('');
        loadTrips();
        loadDriverData(false);
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.error || 'Incorrect OTP! Please check with passenger.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Driver Approves / Accepts Ride Request
  const handleAcceptRequest = async (request: any) => {
    setAcceptingId(request.id);
    try {
      const res = await apiClient.post(`/transport/bookings/${request.id}/accept`);
      if (res.data?.success) {
        showSuccess(
          `Ride approved for ${request.userName || 'Passenger'}! Passenger has been notified with OTP.`,
          'Ride Approved'
        );
        setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
        setActiveTrip(res.data.booking);
        loadTrips();
        loadDriverData(false);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to accept ride', 'Error');
    } finally {
      setAcceptingId(null);
    }
  };

  // Driver Declines Ride Request
  const handleDeclineRequest = async (request: any) => {
    setDecliningId(request.id);
    try {
      const res = await apiClient.post(`/transport/bookings/${request.id}/decline`);
      if (res.data?.success) {
        showSuccess('Ride request declined', 'Declined');
        setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
        loadTrips();
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to decline ride', 'Error');
    } finally {
      setDecliningId(null);
    }
  };

  // Driver clicks "Reached Destination & Complete Ride"
  const handleReachDestination = async () => {
    if (!activeTrip?.id) return;
    try {
      const res = await apiClient.post(`/transport/bookings/${activeTrip.id}/reach-destination`);
      if (res.data?.success) {
        showSuccess(
          `Destination reached! Passenger notified to confirm and complete ride.`,
          'Reached Destination'
        );
        setActiveTrip((prev: any) => ({ ...prev, status: 'DESTINATION_REACHED' }));
        loadTrips();
        loadDriverData(false);
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update destination reached', 'Error');
    }
  };

  // Finalize Ride (Direct from Driver Dashboard)
  const handleCompleteRide = async () => {
    if (!activeTrip?.id) return;
    Alert.alert(
      'Complete Trip',
      `Confirm destination reached with passenger? (Rate: ₹${activeTrip.ratePerKm || 20}/km, Base: ₹${activeTrip.baseFare || 30})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Trip',
          onPress: async () => {
            try {
              const res = await apiClient.post(`/transport/bookings/${activeTrip.id}/complete`);
              if (res.data?.success) {
                showSuccess(
                  'Trip completed successfully! Both driver and passenger notified.',
                  'Trip Completed'
                );
                setActiveTrip(null);
                loadTrips();
                loadDriverData(false);
              }
            } catch (err: any) {
              showError('Failed to complete ride', 'Error');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#f8fafc]">
      {/* 1. TOP APP BAR */}
      <View className="flex-row items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 shadow-xs">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 items-center justify-center active:bg-slate-100"
          accessibilityLabel="Go Back"
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>

        <View className="items-center flex-1 mx-2">
          <View className="flex-row items-center gap-1.5">
            <Truck size={17} color="#2563eb" />
            <Text className="text-base font-black text-slate-900 tracking-tight">
              Transport Fleet Console
            </Text>
          </View>
          <Text className="text-[11px] font-semibold text-slate-500">
            Driver & Multi-Vehicle Dashboard (Max 3)
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRefresh}
          className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center"
          accessibilityLabel="Refresh Data"
        >
          <RefreshCw size={18} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 60 }}
      >
        {/* 2. DRIVER HERO CARD (WHITE & SIGNATURE BLUE DESIGN) */}
        <View className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm mb-4">
          <View className="flex-row items-start justify-between mb-3.5">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center shadow-md shadow-blue-200 mr-3.5">
                <Car size={28} color="#ffffff" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5 flex-wrap">
                  <Text className="text-lg font-black text-slate-900">
                    {driver?.name || userData?.fullName || 'Register Driver Profile'}
                  </Text>
                  <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                    <ShieldCheck size={11} color="#2563eb" />
                    <Text className="text-[10px] font-extrabold text-blue-700">VERIFIED DRIVER</Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-500 mt-0.5 flex-row items-center">
                  DL: <Text className="font-bold text-slate-800">{driver?.drivingLicense || 'KA27 20210008459'}</Text> • ID: <Text className="font-bold text-blue-700">{driver?.id?.slice(0, 8) || 'DRV-784'}</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleOpenEditProfile}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 items-center justify-center"
              accessibilityLabel="Edit Profile"
            >
              <Edit3 size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* ONLINE / OFFLINE TOGGLE ROW */}
          <View className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2.5">
              <View
                className={`w-3.5 h-3.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-slate-300'
                  }`}
              />
              <View>
                <Text className="text-xs font-black text-slate-800">
                  {isOnline ? 'ONLINE & ACCEPTING TRIPS' : 'OFFLINE (Not Visible on Map)'}
                </Text>
                <Text className="text-[10px] text-slate-500">
                  {isOnline ? 'Your live vehicle is visible to customers in Haveri' : 'Toggle to start receiving passenger bookings'}
                </Text>
              </View>
            </View>

            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={isOnline ? '#2563eb' : '#94a3b8'}
              disabled={updatingOnline}
            />
          </View>

          {/* CURRENT ON-ROAD VEHICLE BADGE */}
          <View className="bg-blue-50/70 rounded-2xl p-3 border border-blue-200/80 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5 flex-1 mr-2">
              <View className="w-8 h-8 rounded-xl bg-white border border-blue-200 items-center justify-center shadow-2xs">
                <Navigation size={15} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  Active On-Road Vehicle
                </Text>
                <Text className="text-xs font-extrabold text-slate-900" numberOfLines={1}>
                  {activeVehicle
                    ? `${activeVehicle.modelName} • ${activeVehicle.plateNumber}`
                    : driver?.driverCar
                      ? `${driver.driverCar} • ${driver.driverPlate}`
                      : 'No vehicle set. Add up to 3 vehicles below.'}
                </Text>
              </View>
            </View>
            <View className="bg-blue-600 px-2.5 py-1 rounded-lg shadow-2xs">
              <Text className="text-[11px] font-black text-white">
                ₹{activeVehicle?.ratePerKm || driver?.ratePerKm || 20}/km
              </Text>
            </View>
          </View>
        </View>

        {/* 3. 4-GRID KPI METRICS */}
        <View className="flex-row flex-wrap gap-2.5 mb-4">
          {/* Card 1: Completed Trips */}
          <View className="flex-1 min-w-[47%] bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[11px] font-bold text-slate-500 uppercase">Trips Done</Text>
              <CheckCircle size={15} color="#16a34a" />
            </View>
            <Text className="text-xl font-black text-slate-900">{stats.totalTrips}</Text>
            <Text className="text-[10px] text-emerald-600 font-bold mt-0.5">Verified Trips</Text>
          </View>

          {/* Card 2: Total Earnings */}
          <View className="flex-1 min-w-[47%] bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[11px] font-bold text-slate-500 uppercase">Total Revenue</Text>
              <Sparkles size={15} color="#2563eb" />
            </View>
            <Text className="text-xl font-black text-blue-600">₹{stats.totalEarnings}</Text>
            <Text className="text-[10px] text-slate-400 font-bold mt-0.5">Pay after ride</Text>
          </View>

          {/* Card 3: Registered Fleet (Max 3) */}
          <View className="flex-1 min-w-[47%] bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[11px] font-bold text-slate-500 uppercase">Fleet Capacity</Text>
              <Truck size={15} color="#7c3aed" />
            </View>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-xl font-black text-slate-900">{vehicles.length}</Text>
              <Text className="text-xs font-black text-slate-400">/ 3 Max</Text>
            </View>
            <Text className={`text-[10px] font-bold mt-0.5 ${vehicles.length >= 3 ? 'text-amber-600' : 'text-blue-600'}`}>
              {vehicles.length >= 3 ? '3/3 Limit Reached' : `${3 - vehicles.length} Slot(s) Left`}
            </Text>
          </View>

          {/* Card 4: Base Rate per km */}
          <View className="flex-1 min-w-[47%] bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-[11px] font-bold text-slate-500 uppercase">Driver Rate</Text>
              <Zap size={15} color="#ea580c" />
            </View>
            <Text className="text-xl font-black text-slate-900">
              ₹{activeVehicle?.ratePerKm || driver?.ratePerKm || 20}
              <Text className="text-xs text-slate-500 font-normal">/km</Text>
            </Text>
            <Text className="text-[10px] text-slate-400 font-bold mt-0.5">
              + ₹{activeVehicle?.baseFare || driver?.baseFare || 30} Base
            </Text>
          </View>
        </View>

        {/* REQUESTED RIDES SECTION (INCOMING RIDE REQUESTS NEEDING DRIVER APPROVAL) */}
        {pendingRequests.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2 px-1">
              <View className="flex-row items-center gap-2">
                <View className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <Text className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  Incoming Ride Requests ({pendingRequests.length})
                </Text>
              </View>
              <View className="bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                <Text className="text-[10px] font-black text-amber-800">ACTION REQUIRED</Text>
              </View>
            </View>

            {pendingRequests.map((req) => (
              <View
                key={req.id}
                className="bg-white rounded-3xl p-4 mb-2.5 border-2 border-amber-400 shadow-md shadow-amber-200"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-10 h-10 rounded-2xl bg-amber-100 items-center justify-center">
                      <User size={19} color="#d97706" />
                    </View>
                    <View>
                      <Text className="text-sm font-black text-slate-900">
                        {req.userName || 'Passenger'}
                      </Text>
                      <Text className="text-[11px] font-bold text-slate-500">
                        {req.userPhone ? `+91 ${req.userPhone}` : 'Customer'} • {req.distanceKm} km
                      </Text>
                    </View>
                  </View>

                  <View className="bg-blue-600 px-3 py-1 rounded-xl items-end">
                    <Text className="text-xs font-black text-white">₹{req.ratePerKm || driver?.ratePerKm || 20}/km</Text>
                    <Text className="text-[10px] font-bold text-blue-100">Base ₹{req.baseFare || driver?.baseFare || 30}</Text>
                  </View>
                </View>

                {/* Pickup & Destination */}
                <View className="bg-slate-50 rounded-2xl p-2.5 mb-3 border border-slate-200 space-y-1">
                  <View className="flex-row items-center">
                    <MapPin size={13} color="#16a34a" />
                    <Text className="text-xs text-slate-700 font-semibold ml-1.5 flex-1" numberOfLines={1}>
                      Pickup: {req.pickupAddress}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Navigation size={13} color="#2563eb" />
                    <Text className="text-xs text-slate-900 font-bold ml-1.5 flex-1" numberOfLines={1}>
                      Drop: {req.destinationAddress}
                    </Text>
                  </View>
                </View>

                {/* Approve & Decline buttons */}
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={decliningId === req.id || acceptingId === req.id}
                    onPress={() => handleDeclineRequest(req)}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 border border-slate-200 items-center justify-center flex-row gap-1"
                  >
                    {decliningId === req.id ? (
                      <ActivityIndicator size="small" color="#64748b" />
                    ) : (
                      <>
                        <X size={15} color="#64748b" />
                        <Text className="text-xs font-bold text-slate-700">Decline</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={acceptingId === req.id || decliningId === req.id}
                    onPress={() => handleAcceptRequest(req)}
                    className="flex-2 py-3 rounded-2xl bg-emerald-600 items-center justify-center flex-row gap-1.5 shadow-sm shadow-emerald-300"
                  >
                    {acceptingId === req.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Check size={16} color="#ffffff" />
                        <Text className="text-xs font-black text-white">Approve / Accept Ride</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 4. ACTIVE ONGOING RIDE ALERT & PASSENGER OTP VERIFIER */}
        {activeTrip && (
          <View className="bg-blue-600 rounded-3xl p-4 mb-4 shadow-md shadow-blue-300">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                <Text className="text-xs font-black text-white tracking-wider uppercase">
                  Active Ride: {activeTrip.status.replace('_', ' ')}
                </Text>
              </View>
              <View className="bg-white/20 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-extrabold text-white">₹{activeTrip.ratePerKm || driver?.ratePerKm || 20}/km • Base ₹{activeTrip.baseFare || driver?.baseFare || 30}</Text>
              </View>
            </View>

            <Text className="text-sm font-bold text-white mb-0.5">
              Passenger: {activeTrip.userName || 'Passenger'} • {activeTrip.distanceKm} km
            </Text>
            <Text className="text-xs text-blue-100 mb-2.5" numberOfLines={1}>
              To: {activeTrip.destinationAddress}
            </Text>

            {/* Quick Actions: Call Passenger */}
            {activeTrip.userPhone && (
              <View className="mb-3">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL(`tel:${activeTrip.userPhone}`)}
                  className="bg-white/20 border border-white/30 py-2.5 px-4 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Phone size={15} color="#ffffff" />
                  <Text className="text-xs font-black text-white">Call Passenger ({activeTrip.userPhone})</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* OTP VERIFICATION STEP IF ACCEPTED */}
            {activeTrip.status === 'ACCEPTED' && (
              <View className="bg-white rounded-2xl p-3.5">
                <View className="flex-row items-center gap-1.5 mb-1.5">
                  <KeyRound size={15} color="#2563eb" />
                  <Text className="text-xs font-black text-slate-900">
                    Enter Passenger 4-Digit PIN to Start Ride
                  </Text>
                </View>
                <Text className="text-[11px] text-slate-500 mb-2.5">
                  Ask the passenger for the 4-digit OTP shown on their screen, enter it below, and tap Start Ride.
                </Text>

                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={inputOtp}
                    onChangeText={(val) => {
                      setInputOtp(val);
                      setOtpError(null);
                    }}
                    placeholder="Enter 4-digit OTP (e.g. 4921)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={4}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-sm tracking-widest text-center"
                  />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleVerifyOtp}
                    disabled={verifyingOtp}
                    className="bg-blue-600 px-4 py-2.5 rounded-xl items-center justify-center shadow-xs"
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-xs font-black text-white">Start Ride</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {otpError && <Text className="text-xs text-red-600 font-bold mt-1.5">{otpError}</Text>}
              </View>
            )}

            {/* ONGOING RIDE: REACHED DESTINATION BUTTON */}
            {activeTrip.status === 'ONGOING' && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleReachDestination}
                className="bg-emerald-500 py-3 rounded-2xl items-center justify-center flex-row gap-2 mt-1 shadow-sm"
              >
                <CheckCircle size={18} color="#ffffff" />
                <Text className="text-sm font-black text-white">
                  Reached Destination & Complete Ride
                </Text>
              </TouchableOpacity>
            )}

            {/* DESTINATION REACHED: AWAITING PASSENGER OR FINALIZE */}
            {activeTrip.status === 'DESTINATION_REACHED' && (
              <View className="bg-white/10 rounded-2xl p-3 border border-white/20 mt-1">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <CheckCircle size={16} color="#4ade80" />
                  <Text className="text-xs font-black text-white">
                    Destination Reached! Passenger has been notified.
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleCompleteRide}
                  className="bg-emerald-500 py-2.5 rounded-xl items-center justify-center shadow-xs"
                >
                  <Text className="text-xs font-black text-white">
                    Finalize Trip & Complete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 5. TAB SELECTOR */}
        <View className="flex-row bg-slate-200/80 p-1 rounded-2xl mb-4">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('vehicles')}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row gap-1 ${
              activeTab === 'vehicles' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Car size={14} color={activeTab === 'vehicles' ? '#2563eb' : '#64748b'} />
            <Text
              className={`text-[11px] font-black ${
                activeTab === 'vehicles' ? 'text-blue-600' : 'text-slate-600'
              }`}
            >
              Vehicles ({vehicles.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('rides')}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row gap-1 ${
              activeTab === 'rides' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <Clock size={14} color={activeTab === 'rides' ? '#2563eb' : '#64748b'} />
            <Text
              className={`text-[11px] font-black ${
                activeTab === 'rides' ? 'text-blue-600' : 'text-slate-600'
              }`}
            >
              History
            </Text>
          </TouchableOpacity>



          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl items-center justify-center flex-row gap-1 ${
              activeTab === 'profile' ? 'bg-white shadow-xs' : ''
            }`}
          >
            <User size={14} color={activeTab === 'profile' ? '#2563eb' : '#64748b'} />
            <Text
              className={`text-[11px] font-black ${
                activeTab === 'profile' ? 'text-blue-600' : 'text-slate-600'
              }`}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================== */}
        {/* TAB 1: VEHICLES FLEET MANAGEMENT (MAXIMUM 3 VEHICLES) */}
        {/* ======================================================== */}
        {activeTab === 'vehicles' && (
          <View>
            {/* Header with "+ Add Vehicle" button and limit badge */}
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-base font-black text-slate-900">
                  Registered Vehicles Fleet
                </Text>

              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenAddVehicle}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl shadow-2xs ${vehicles.length >= 3 ? 'bg-slate-200' : 'bg-blue-600'
                  }`}
              >
                <Plus size={15} color={vehicles.length >= 3 ? '#64748b' : '#ffffff'} />
                <Text
                  className={`text-xs font-black ${vehicles.length >= 3 ? 'text-slate-600' : 'text-white'
                    }`}
                >
                  {vehicles.length >= 3 ? 'Max (3/3)' : 'Add Vehicle'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Capacity Progress Bar */}
            <View className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs mb-3.5">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-xs font-bold text-slate-700">Driver Fleet Quota</Text>
                <Text className="text-xs font-extrabold text-blue-600">{vehicles.length} of 3 Allowed</Text>
              </View>
              <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex-row">
                <View
                  style={{
                    width: `${Math.min(100, (vehicles.length / 3) * 100)}%`,
                    backgroundColor: vehicles.length >= 3 ? '#ea580c' : '#2563eb',
                  }}
                  className="h-full rounded-full"
                />
              </View>
              <Text className="text-[10px] text-slate-400 mt-1.5">
                {vehicles.length === 0
                  ? 'No vehicles registered yet. Add your first vehicle below.'
                  : vehicles.length < 3
                    ? `You can add ${3 - vehicles.length} more vehicle(s) to this account.`
                    : 'Fleet limit of 3 vehicles reached. You can switch which vehicle is active on road.'}
              </Text>
            </View>

            {/* Mandatory Transport Note Banner */}
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-3.5 flex-row items-start gap-2.5">
              <AlertCircle size={16} color="#d97706" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-xs font-black text-amber-900 leading-4">
                  ** Note: Register your primary vehicle below. You can register up to a maximum of 3 vehicles under your driver ID in your Transport Dashboard.
                </Text>
                <Text className="text-[11px] text-amber-800 mt-1">
                  Only commercial yellow color vehicle number plates are allowed to register in CityLinks Transport.
                </Text>
              </View>
            </View>

            {/* List of Registered Vehicles */}
            {vehicles.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center border border-dashed border-slate-300">
                <Car size={36} color="#94a3b8" />
                <Text className="text-base font-bold text-slate-800 mt-3">No Vehicles Registered</Text>
                <Text className="text-xs text-slate-500 text-center mt-1 mb-4">
                  Register up to 3 vehicles (Car, Bike, Auto, Taxi, Tempo, Truck, or Other) under your driver ID.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleOpenAddVehicle}
                  className="bg-blue-600 px-5 py-2.5 rounded-xl flex-row items-center gap-2"
                >
                  <Plus size={16} color="#ffffff" />
                  <Text className="text-xs font-black text-white">Register Primary Vehicle</Text>
                </TouchableOpacity>
              </View>
            ) : (
              vehicles.map((veh, idx) => {
                const isSelected = veh.isPrimary;
                return (
                  <View
                    key={veh.id}
                    className={`bg-white rounded-3xl p-4 mb-3 border shadow-2xs ${isSelected ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200'
                      }`}
                  >
                    <View className="flex-row items-start justify-between mb-2.5">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View
                          className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100'
                            }`}
                        >
                          {veh.vehicleType.toLowerCase().includes('auto') ? (
                            <Truck size={22} color={isSelected ? '#ffffff' : '#475569'} />
                          ) : veh.vehicleType.toLowerCase().includes('bike') ? (
                            <Zap size={22} color={isSelected ? '#ffffff' : '#475569'} />
                          ) : veh.vehicleType.toLowerCase().includes('truck') || veh.vehicleType.toLowerCase().includes('tempo') ? (
                            <Truck size={22} color={isSelected ? '#ffffff' : '#475569'} />
                          ) : (
                            <Car size={22} color={isSelected ? '#ffffff' : '#475569'} />
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="text-sm font-black text-slate-900">{veh.modelName}</Text>
                            {isSelected && (
                              <View className="bg-emerald-500 px-2 py-0.5 rounded-md flex-row items-center gap-1">
                                <Check size={10} color="#ffffff" />
                                <Text className="text-[9px] font-extrabold text-white">ACTIVE ON ROAD</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-xs text-slate-500 mt-0.5">
                            {veh.vehicleType}
                          </Text>
                        </View>
                      </View>

                      {/* Commercial Yellow Number Plate */}
                      <View className="flex-row items-center bg-[#fef08a] border-1.5 border-[#ca8a04] rounded-lg overflow-hidden shadow-2xs">
                        <View className="bg-blue-700 px-1.5 py-1 justify-center items-center">
                          <Text className="text-[8px] font-black text-white">IND</Text>
                        </View>
                        <Text className="text-xs font-black text-slate-900 px-2 py-1 tracking-wider uppercase">
                          {veh.plateNumber}
                        </Text>
                      </View>
                    </View>

                    {/* Rate & Spec row */}
                    <View className="bg-slate-50 rounded-xl p-2.5 flex-row items-center justify-between mb-3 border border-slate-200/60">
                      <Text className="text-xs text-slate-600">
                        Driver-Fixed Rate: <Text className="font-black text-blue-700">₹{veh.ratePerKm}/km</Text>
                      </Text>
                      <Text className="text-xs text-slate-600">
                        Base Price: <Text className="font-black text-slate-800">₹{veh.baseFare}</Text>
                      </Text>
                    </View>

                    {/* Action buttons */}
                    <View className="flex-row items-center gap-2 pt-1 border-t border-slate-100">
                      {!isSelected ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleSetActiveVehicle(veh)}
                          className="flex-1 py-2 rounded-xl bg-blue-600 items-center justify-center flex-row gap-1"
                        >
                          <Check size={14} color="#ffffff" />
                          <Text className="text-xs font-black text-white">Set Active on Road</Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="flex-1 py-2 rounded-xl bg-emerald-50 border border-emerald-200 items-center justify-center flex-row gap-1">
                          <CheckCircle size={14} color="#16a34a" />
                          <Text className="text-xs font-bold text-emerald-700">Currently Operating</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleOpenEditVehicle(veh)}
                        className="p-2.5 rounded-xl bg-slate-100 border border-slate-200"
                        accessibilityLabel="Edit Vehicle"
                      >
                        <Edit3 size={15} color="#475569" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteVehicle(veh)}
                        className="p-2.5 rounded-xl bg-red-50 border border-red-200"
                        accessibilityLabel="Delete Vehicle"
                      >
                        <Trash2 size={15} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: RIDE DISPATCH & HISTORY (PAGINATION OF 6 & ADVANCED FILTERS) */}
        {/* ======================================================== */}
        {activeTab === 'rides' && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <View>
                <Text className="text-base font-black text-slate-900">Ride History & Dispatch</Text>
                <Text className="text-xs text-slate-500">
                  {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'} found • 6 per page
                </Text>
              </View>
              {(rideSearchQuery || rideStatusFilter !== 'ALL' || rideDateFilter !== 'ALL' || rideKmFilter !== 'ALL') ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setRideSearchQuery('');
                    setRideStatusFilter('ALL');
                    setRideDateFilter('ALL');
                    setRideKmFilter('ALL');
                    setRideHistoryPage(1);
                  }}
                  className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                >
                  <Text className="text-[11px] font-black text-blue-600">Reset Filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* SEARCH INPUT */}
            <View className="bg-white rounded-2xl px-3.5 py-2 mb-3 border border-slate-200 flex-row items-center gap-2 shadow-2xs">
              <Search size={16} color="#64748b" />
              <TextInput
                value={rideSearchQuery}
                onChangeText={(val) => {
                  setRideSearchQuery(val);
                  setRideHistoryPage(1);
                }}
                maxLength={60}
                placeholder="Search by passenger, route, or km (e.g. 85.2)..."
                placeholderTextColor="#94a3b8"
                className="flex-1 text-xs text-slate-900 font-semibold py-1"
              />
              {rideSearchQuery ? (
                <TouchableOpacity onPress={() => setRideSearchQuery('')}>
                  <X size={15} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* STATUS FILTER CHIPS */}
            <View className="mb-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {[
                  { id: 'ALL', label: `All Status (${recentTrips.length})` },
                  { id: 'COMPLETED', label: `Completed (${recentTrips.filter((t) => t.status === 'COMPLETED').length})` },
                  { id: 'CANCELLED', label: `Cancelled (${recentTrips.filter((t) => t.status === 'CANCELLED').length})` },
                  { id: 'ACTIVE', label: `Active (${recentTrips.filter((t) => ['ACCEPTED', 'ONGOING', 'DESTINATION_REACHED'].includes(t.status)).length})` },
                ].map((item) => {
                  const isActive = rideStatusFilter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setRideStatusFilter(item.id as any);
                        setRideHistoryPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-full border ${
                        isActive
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-black ${
                          isActive ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* DATE & DISTANCE (KM) FILTER ROW */}
            <View className="mb-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {/* Date chips */}
                {[
                  { id: 'ALL', label: 'All Dates' },
                  { id: 'TODAY', label: 'Today' },
                  { id: 'WEEK', label: 'Week' },
                  { id: 'MONTH', label: 'Month' },
                  { id: 'YEAR', label: 'Year' },
                ].map((item) => {
                  const isActive = rideDateFilter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setRideDateFilter(item.id as any);
                        setRideHistoryPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-xl border ${
                        isActive
                          ? 'bg-slate-900 border-slate-900'
                          : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          isActive ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* KM chips */}
                {[
                  { id: 'ALL', label: 'All Distances' },
                  { id: 'SHORT', label: '⚡ < 5 km' },
                  { id: 'MEDIUM', label: '🚗 5–15 km' },
                  { id: 'LONG', label: '🛣️ > 15 km' },
                ].map((item) => {
                  const isActive = rideKmFilter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.75}
                      onPress={() => {
                        setRideKmFilter(item.id as any);
                        setRideHistoryPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-xl border ${
                        isActive
                          ? 'bg-amber-600 border-amber-600'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-extrabold ${
                          isActive ? 'text-white' : 'text-amber-800'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* RESULTS LIST */}
            {filteredTrips.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-200">
                <Clock size={36} color="#94a3b8" />
                <Text className="text-base font-bold text-slate-800 mt-3">No Matching Trips Found</Text>
                <Text className="text-xs text-slate-500 text-center mt-1 mb-3">
                  No ride records match your search filters. Try clearing or relaxing the filters.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setRideSearchQuery('');
                    setRideStatusFilter('ALL');
                    setRideDateFilter('ALL');
                    setRideKmFilter('ALL');
                    setRideHistoryPage(1);
                  }}
                  className="bg-blue-600 px-4 py-2 rounded-xl"
                >
                  <Text className="text-xs font-black text-white">Reset All Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {paginatedTrips.map((trip) => {
                  const isCompleted = trip.status === 'COMPLETED';
                  const isCancelled = trip.status === 'CANCELLED';

                  return (
                    <View
                      key={trip.id}
                      className="bg-white rounded-2xl p-4 mb-2.5 border border-slate-200 shadow-2xs"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2">
                          <View
                            className={`px-2.5 py-0.5 rounded-full border ${
                              isCompleted
                                ? 'bg-emerald-50 border-emerald-200'
                                : isCancelled
                                ? 'bg-rose-50 border-rose-200'
                                : 'bg-blue-50 border-blue-200'
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-black uppercase ${
                                isCompleted
                                  ? 'text-emerald-700'
                                  : isCancelled
                                  ? 'text-rose-700'
                                  : 'text-blue-700'
                              }`}
                            >
                              {isCancelled ? 'Ride Cancelled' : trip.status.replace('_', ' ')}
                            </Text>
                          </View>
                          <Text className="text-xs font-bold text-slate-400">
                            {trip.createdAt
                              ? new Date(trip.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Recent'}
                          </Text>
                        </View>
                        <Text className="text-sm font-black text-blue-600">₹{trip.ratePerKm || 20}/km</Text>
                      </View>

                      <View className="mb-2">
                        <Text className="text-sm font-black text-slate-900">
                          Passenger: {trip.userName || 'Passenger'}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <Text className="text-xs font-bold text-blue-700">
                            {trip.distanceKm} km
                          </Text>
                          <Text className="text-xs text-slate-400">•</Text>
                          <Text className="text-xs text-slate-500 font-semibold">
                            ₹{trip.ratePerKm || 20}/km + ₹{trip.baseFare || 30} base
                          </Text>
                          {trip.otp ? (
                            <>
                              <Text className="text-xs text-slate-400">•</Text>
                              <Text className="text-xs font-bold text-slate-600">OTP: {trip.otp}</Text>
                            </>
                          ) : null}
                        </View>
                      </View>

                      <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 gap-1.5">
                        <View className="flex-row items-center gap-2">
                          <View className="w-2 h-2 rounded-full bg-emerald-500" />
                          <Text className="text-xs text-slate-700 font-medium flex-1" numberOfLines={1}>
                            From: {trip.pickupAddress}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                          <View className="w-2 h-2 rounded-full bg-rose-500" />
                          <Text className="text-xs text-slate-700 font-medium flex-1" numberOfLines={1}>
                            To: {trip.destinationAddress}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* PAGINATION CONTROLS (EXACTLY 6 PER PAGE) */}
                {totalRidePages > 1 && (
                  <View className="bg-white rounded-2xl p-3 border border-slate-200 mt-1 shadow-2xs">
                    <View className="flex-row items-center justify-between">
                      <TouchableOpacity
                        activeOpacity={0.75}
                        disabled={currentTripsPage <= 1}
                        onPress={() => setRideHistoryPage((prev) => Math.max(1, prev - 1))}
                        className={`flex-row items-center gap-1 px-3 py-1.5 rounded-xl border ${
                          currentTripsPage <= 1
                            ? 'bg-slate-50 border-slate-200 opacity-40'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <ChevronLeft size={14} color="#2563eb" />
                        <Text className="text-xs font-black text-blue-700">Prev</Text>
                      </TouchableOpacity>

                      {/* Page Number Pills */}
                      <View className="flex-row items-center gap-1.5">
                        {Array.from({ length: totalRidePages }, (_, i) => i + 1).map((pageNum) => {
                          const isCurrent = pageNum === currentTripsPage;
                          return (
                            <TouchableOpacity
                              key={pageNum}
                              activeOpacity={0.8}
                              onPress={() => setRideHistoryPage(pageNum)}
                              className={`w-7 h-7 rounded-lg items-center justify-center ${
                                isCurrent ? 'bg-blue-600 shadow-xs' : 'bg-slate-100'
                              }`}
                            >
                              <Text
                                className={`text-xs font-black ${
                                  isCurrent ? 'text-white' : 'text-slate-600'
                                }`}
                              >
                                {pageNum}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.75}
                        disabled={currentTripsPage >= totalRidePages}
                        onPress={() => setRideHistoryPage((prev) => Math.min(totalRidePages, prev + 1))}
                        className={`flex-row items-center gap-1 px-3 py-1.5 rounded-xl border ${
                          currentTripsPage >= totalRidePages
                            ? 'bg-slate-50 border-slate-200 opacity-40'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <Text className="text-xs font-black text-blue-700">Next</Text>
                        <ChevronRight size={14} color="#2563eb" />
                      </TouchableOpacity>
                    </View>

                    <Text className="text-[10px] font-bold text-slate-400 text-center mt-2">
                      Page {currentTripsPage} of {totalRidePages} • Showing{' '}
                      {(currentTripsPage - 1) * RIDE_PAGE_SIZE + 1}–
                      {Math.min(currentTripsPage * RIDE_PAGE_SIZE, filteredTrips.length)} of{' '}
                      {filteredTrips.length} trips
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: RECEIVED MESSAGES FROM PASSENGERS (WHATSAPP STYLE) */}


        {/* ======================================================== */}
        {/* TAB 4: DRIVER REGISTRATION & DETAILS */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-black text-slate-900">Driver Official Profile</Text>
              <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <ShieldCheck size={12} color="#2563eb" />
                <Text className="text-[10px] font-black text-blue-700">VERIFIED ID</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-500 mb-4">
              Registered ID & document verification details with CityLinks
            </Text>

            <View className="space-y-3.5 gap-y-3.5">
              {/* Driver Full Name */}
              <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver's Full Name</Text>
                <Text className="text-sm font-black text-slate-900 mt-0.5">{driver?.name || userData?.fullName || 'Karthik R.'}</Text>
              </View>

              {/* Mobile Phone Number */}
              <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Phone Number</Text>
                <Text className="text-sm font-black text-slate-900 mt-0.5">+91 {driver?.phone || userData?.phone || '9876543210'}</Text>
              </View>

              {/* Driving License Number & Document Photo */}
              <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driving License (DL)</Text>
                  <View className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Text className="text-[9px] font-extrabold text-emerald-700">COMMERCIAL PERMIT</Text>
                  </View>
                </View>
                <Text className="text-sm font-black text-slate-900 tracking-wide uppercase">
                  {driver?.drivingLicense || 'KA27 20210008459'}
                </Text>

                {/* DL Photo Preview Card */}
                {driver?.drivingLicensePhoto ? (
                  <View className="mt-2.5 bg-white p-2.5 rounded-xl border border-slate-200 flex-row items-center justify-between">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewImageUrl(driver.drivingLicensePhoto)}
                      className="flex-row items-center gap-2.5 flex-1 mr-2"
                    >
                      <Image
                        source={{ uri: driver.drivingLicensePhoto }}
                        className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200"
                        resizeMode="cover"
                      />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-800">License Photo Document</Text>
                        <Text className="text-[10px] text-blue-600 font-semibold mt-0.5 flex-row items-center">
                          Tap to view full image
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-1.5">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleOpenEditProfile}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <Pencil size={14} color="#475569" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setPreviewImageUrl(driver.drivingLicensePhoto)}
                        className="p-2 rounded-lg bg-blue-50 border border-blue-200"
                      >
                        <Eye size={14} color="#2563eb" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="mt-2 bg-slate-100/70 p-2.5 rounded-xl border border-dashed border-slate-300 flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-semibold text-slate-600">DL Photo <Text className="text-red-500">*</Text></Text>
                      <Text className="text-[10px] text-slate-400">Can be uploaded anytime from Edit Profile</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleOpenEditProfile}
                      className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex-row items-center gap-1"
                    >
                      <Camera size={12} color="#2563eb" />
                      <Text className="text-[10px] font-bold text-blue-700">Upload</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Aadhaar Card Number & Document Photo */}
              <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aadhaar Card Number</Text>
                  <View className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    <Text className="text-[9px] font-extrabold text-blue-700">GOVT ID</Text>
                  </View>
                </View>
                <Text className="text-sm font-black text-slate-900 tracking-wider">
                  {driver?.aadhaarNumber || '5489 1234 5678'}
                </Text>

                {/* Aadhaar Photo Preview Card */}
                {driver?.aadhaarPhoto ? (
                  <View className="mt-2.5 bg-white p-2.5 rounded-xl border border-slate-200 flex-row items-center justify-between">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewImageUrl(driver.aadhaarPhoto)}
                      className="flex-row items-center gap-2.5 flex-1 mr-2"
                    >
                      <Image
                        source={{ uri: driver.aadhaarPhoto }}
                        className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200"
                        resizeMode="cover"
                      />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-800">Aadhaar Card Photo</Text>
                        <Text className="text-[10px] text-blue-600 font-semibold mt-0.5">Tap to view full image</Text>
                      </View>
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-1.5">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleOpenEditProfile}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <Pencil size={14} color="#475569" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setPreviewImageUrl(driver.aadhaarPhoto)}
                        className="p-2 rounded-lg bg-blue-50 border border-blue-200"
                      >
                        <Eye size={14} color="#2563eb" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="mt-2 bg-slate-100/70 p-2.5 rounded-xl border border-dashed border-slate-300 flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-semibold text-slate-600">Aadhaar Photo <Text className="text-red-500">*</Text></Text>
                      <Text className="text-[10px] text-slate-400">Can be uploaded anytime from Edit Profile</Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleOpenEditProfile}
                      className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex-row items-center gap-1"
                    >
                      <Camera size={12} color="#2563eb" />
                      <Text className="text-[10px] font-bold text-blue-700">Upload</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* SEPARATE SECTION: REGISTERED FLEET SUMMARY (MAX 3) */}
              <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Registered Vehicle Fleet ({vehicles.length}/3)
                  </Text>
                  <Text className="text-[10px] font-extrabold text-blue-700">Max 3 Vehicles</Text>
                </View>

                {vehicles.length === 0 ? (
                  <Text className="text-xs text-slate-500 italic">No vehicles registered yet.</Text>
                ) : (
                  vehicles.map((v, i) => (
                    <View
                      key={v.id}
                      className={`p-2.5 rounded-xl mb-2 flex-row items-center justify-between ${v.isPrimary ? 'bg-blue-50/80 border border-blue-200' : 'bg-white border border-slate-200'
                        }`}
                    >
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-xs font-black text-slate-900">{v.modelName}</Text>
                          {v.isPrimary && (
                            <View className="bg-emerald-500 px-1.5 py-0.2 rounded">
                              <Text className="text-[8px] font-black text-white">PRIMARY</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[10px] text-slate-500 mt-0.5">
                          {v.vehicleType} • ₹{v.ratePerKm}/km (+ ₹{v.baseFare} base)
                        </Text>
                      </View>

                      {/* Commercial Yellow Number Plate */}
                      <View className="flex-row items-center bg-[#fef08a] border border-[#ca8a04] rounded-md overflow-hidden">
                        <View className="bg-blue-700 px-1 py-0.5 justify-center items-center">
                          <Text className="text-[7px] font-black text-white">IND</Text>
                        </View>
                        <Text className="text-[10px] font-black text-slate-900 px-1.5 py-0.5 uppercase">
                          {v.plateNumber}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Operating Region */}
              <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operating Region</Text>
                <Text className="text-sm font-bold text-slate-900 mt-0.5">{driver?.location || 'Haveri Central Hub, Karnataka'}</Text>
              </View>

              {/* Driver-Set Base Rates */}
              <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver-Set Rate / KM</Text>
                <Text className="text-sm font-black text-blue-700 mt-0.5">
                  ₹{driver?.ratePerKm || 20}/km + ₹{driver?.baseFare || 30} Base Fare
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenEditProfile}
                className="w-full py-3.5 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2 mt-2 shadow-sm"
              >
                <Edit3 size={16} color="#ffffff" />
                <Text className="text-sm font-black text-white">Edit Driver Registration Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT VEHICLE (STRICT MAX 3 ENFORCED) */}
      {/* ======================================================== */}
      <Modal
        visible={vehicleModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVehicleModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-white rounded-t-3xl max-h-[90%] p-6">
            <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <View>
                <Text className="text-lg font-black text-slate-900">
                  {editingVehicleId ? 'Edit Vehicle Details' : 'Register Vehicle (Max 3 Allowed)'}
                </Text>
                <Text className="text-xs text-slate-500">
                  {editingVehicleId ? 'Update specs & rates' : `Vehicle ${vehicles.length + 1} of maximum 3 allowed`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setVehicleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Mandatory Note Banner */}
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex-row items-start gap-2.5">
                <AlertCircle size={15} color="#d97706" style={{ marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-xs font-black text-amber-900 leading-4">
                    ** Note: Register your primary vehicle below. You can register up to a maximum of 3 vehicles under your driver ID in your Transport Dashboard.
                  </Text>
                  <Text className="text-[10px] text-amber-800 mt-1">
                    Only commercial yellow color vehicle number plates are allowed to register in CityLinks Transport.
                  </Text>
                </View>
              </View>

              {/* Vehicle Type Picker */}
              <Text className="text-xs font-bold text-slate-700 mb-2 uppercase">Vehicle Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
                <View className="flex-row gap-2">
                  {VEHICLE_TYPES.map((vt) => {
                    const isSelected = vType === vt.id;
                    return (
                      <TouchableOpacity
                        key={vt.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          setVType(vt.id);
                          setVRatePerKm(String(vt.defaultRate));
                          setVBaseFare(String(vt.defaultBase));
                        }}
                        className={`px-3.5 py-2.5 rounded-xl border flex-row items-center gap-1.5 ${isSelected
                            ? 'bg-blue-600 border-blue-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200'
                          }`}
                      >
                        <Car size={13} color={isSelected ? '#ffffff' : '#64748b'} />
                        <Text
                          className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-700'
                            }`}
                        >
                          {vt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* On clicking Other, section opens below to type option manually */}
              {vType === 'Other' && (
                <View className="mb-3.5 bg-blue-50/70 p-3 rounded-2xl border border-blue-200">
                  <Text className="text-xs font-bold text-blue-900 mb-1.5 uppercase">
                    Type Vehicle Option Manually *
                  </Text>
                  <TextInput
                    value={vOtherType}
                    onChangeText={setVOtherType}
                    maxLength={30}
                    placeholder="e.g. Minibus, E-Rickshaw, Pickup Van, Electric Loader"
                    placeholderTextColor="#94a3b8"
                    className="bg-white border border-blue-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold"
                  />
                </View>
              )}

              {/* Primary Vehicle Model & Color */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Primary vehicle model & color *
                </Text>
                <TextInput
                  value={vModel}
                  onChangeText={setVModel}
                  maxLength={50}
                  placeholder="e.g. White Toyota Corolla / Yellow-Black Bajaj RE Auto"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-sm font-medium"
                />
              </View>

              {/* Registration Number Plate (Yellow Board Only) */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1 uppercase">
                  Registration Number Plate (Commercial Yellow Board Only) *
                </Text>
                <View className="flex-row items-center bg-[#fef08a] border-2 border-[#ca8a04] rounded-xl px-3 py-1 mt-1 shadow-2xs">
                  <View className="bg-blue-700 px-2 py-1 rounded-md mr-2.5 items-center justify-center">
                    <Text className="text-[9px] font-black text-white">IND</Text>
                  </View>
                  <TextInput
                    value={vPlate}
                    onChangeText={setVPlate}
                    maxLength={15}
                    placeholder="KA 27 M 4589"
                    placeholderTextColor="#a16207"
                    autoCapitalize="characters"
                    className="flex-1 text-slate-900 font-black text-base tracking-widest uppercase py-2"
                  />
                </View>
                <Text className="text-[10px] text-amber-700 font-semibold mt-1">
                  Only yellow color commercial vehicle number plates are allowed to register.
                </Text>
              </View>

              {/* Rate per KM & Base Fare */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Rate Per KM (₹) *</Text>
                  <TextInput
                    value={vRatePerKm}
                    onChangeText={setVRatePerKm}
                    maxLength={8}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 font-bold text-sm"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Base Price (₹) *</Text>
                  <TextInput
                    value={vBaseFare}
                    onChangeText={setVBaseFare}
                    maxLength={8}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor="#94a3b8"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 font-bold text-sm"
                  />
                </View>
              </View>

              {/* Set Primary Switch */}
              <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-5 flex-row items-center justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-xs font-black text-slate-900">Set as Primary Active Vehicle</Text>
                  <Text className="text-[10px] text-slate-500">
                    Will be the live vehicle shown to passengers booking rides
                  </Text>
                </View>
                <Switch
                  value={vIsPrimary}
                  onValueChange={setVIsPrimary}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={vIsPrimary ? '#2563eb' : '#94a3b8'}
                />
              </View>

              {/* Submit button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSaveVehicle}
                disabled={savingVehicle}
                className="w-full py-4 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2 shadow-md shadow-blue-300"
              >
                {savingVehicle ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={18} color="#ffffff" />
                    <Text className="text-base font-black text-white">
                      {editingVehicleId ? 'Update Vehicle' : 'Register Vehicle to Fleet'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: EDIT DRIVER REGISTRATION PROFILE */}
      {/* ======================================================== */}
      <Modal
        visible={editProfileModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-white rounded-t-3xl max-h-[90%] p-6">
            <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <View>
                <Text className="text-lg font-black text-slate-900">Driver Registration Info</Text>
                <Text className="text-xs text-slate-500">Official license and verification details</Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Driver Full Name */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Driver Full Name *</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  maxLength={50}
                  placeholder="e.g. Karthik R."
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-sm"
                />
              </View>

              {/* Mobile Phone Number */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Mobile Phone Number *</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  maxLength={14}
                  keyboardType="phone-pad"
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-sm"
                />
              </View>

              {/* Driving License Number */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Driving License (DL) Number *</Text>
                <TextInput
                  value={editLicense}
                  onChangeText={setEditLicense}
                  maxLength={20}
                  placeholder="e.g. KA27 20210008459"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-sm font-bold uppercase tracking-wider"
                />

                {/* DL Photo (Camera or Select from Gallery) */}
                <View className="mt-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-bold text-slate-800">
                      Driving License Photo <Text className="text-red-500">*</Text>
                    </Text>
                    {editLicensePhoto && (
                      <TouchableOpacity
                        onPress={() => setEditLicensePhoto(null)}
                        className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-md"
                      >
                        <Text className="text-[10px] font-bold text-red-600">Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {editLicensePhoto ? (
                    <View className="flex-row items-center gap-3">
                      <Image
                        source={{ uri: editLicensePhoto }}
                        className="w-20 h-14 rounded-xl bg-slate-200 border border-slate-300"
                        resizeMode="cover"
                      />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-900">Photo Attached</Text>
                        <Text className="text-[11px] text-emerald-600 font-semibold mt-0.5">Ready to save</Text>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleTakeLicensePhoto}
                        className="flex-1 py-2.5 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center flex-row gap-1.5"
                      >
                        <Camera size={14} color="#2563eb" />
                        <Text className="text-xs font-bold text-blue-700">Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickLicenseGallery}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center flex-row gap-1.5"
                      >
                        <ImageIcon size={14} color="#475569" />
                        <Text className="text-xs font-bold text-slate-700">Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Aadhaar Number */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Aadhaar Card Number *</Text>
                <TextInput
                  value={editAadhaar}
                  onChangeText={setEditAadhaar}
                  maxLength={14}
                  keyboardType="numeric"
                  placeholder="e.g. 5489 1234 5678"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-sm font-bold tracking-wider"
                />

                {/* Aadhaar Photo (Camera or Select from Gallery) */}
                <View className="mt-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-bold text-slate-800">
                      Aadhaar Card Photo <Text className="text-red-500">*</Text>
                    </Text>
                    {editAadhaarPhoto && (
                      <TouchableOpacity
                        onPress={() => setEditAadhaarPhoto(null)}
                        className="bg-red-50 border border-red-200 px-2 py-0.5 rounded-md"
                      >
                        <Text className="text-[10px] font-bold text-red-600">Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {editAadhaarPhoto ? (
                    <View className="flex-row items-center gap-3">
                      <Image
                        source={{ uri: editAadhaarPhoto }}
                        className="w-20 h-14 rounded-xl bg-slate-200 border border-slate-300"
                        resizeMode="cover"
                      />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-900">Photo Attached</Text>
                        <Text className="text-[11px] text-emerald-600 font-semibold mt-0.5">Ready to save</Text>
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleTakeAadhaarPhoto}
                        className="flex-1 py-2.5 rounded-xl bg-blue-50 border border-blue-200 items-center justify-center flex-row gap-1.5"
                      >
                        <Camera size={14} color="#2563eb" />
                        <Text className="text-xs font-bold text-blue-700">Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handlePickAadhaarGallery}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center flex-row gap-1.5"
                      >
                        <ImageIcon size={14} color="#475569" />
                        <Text className="text-xs font-bold text-slate-700">Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Location with GPS Auto Detect */}
              <View className="mb-3.5">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-xs font-bold text-slate-700 uppercase">Operating Region / City *</Text>
                  <TouchableOpacity
                    onPress={handleAutoFetchLocation}
                    disabled={fetchingGps}
                    className="flex-row items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                  >
                    {fetchingGps ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Crosshair size={12} color="#2563eb" />
                    )}
                    <Text className="text-[10px] font-bold text-blue-700">Auto GPS</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={editLocation}
                  onChangeText={setEditLocation}
                  maxLength={80}
                  placeholder="e.g. Haveri Town, Karnataka"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-sm"
                />
              </View>

              {/* Emergency Phone */}
              <View className="mb-3.5">
                <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Emergency Contact Phone</Text>
                <TextInput
                  value={editEmergency}
                  onChangeText={setEditEmergency}
                  maxLength={14}
                  keyboardType="phone-pad"
                  placeholder="e.g. 9845112233"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-sm"
                />
              </View>

              {/* Driver-Fixed Base Rates */}
              <View className="flex-row gap-3 mb-5">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Default Rate / KM (₹)</Text>
                  <TextInput
                    value={editRatePerKm}
                    onChangeText={setEditRatePerKm}
                    maxLength={8}
                    keyboardType="numeric"
                    placeholder="20"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 font-bold text-sm"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700 mb-1.5 uppercase">Default Base Fare (₹)</Text>
                  <TextInput
                    value={editBaseFare}
                    onChangeText={setEditBaseFare}
                    maxLength={8}
                    keyboardType="numeric"
                    placeholder="30"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 font-bold text-sm"
                  />
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                className="w-full py-4 rounded-2xl bg-blue-600 items-center justify-center flex-row gap-2 shadow-md shadow-blue-300"
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={18} color="#ffffff" />
                    <Text className="text-base font-black text-white">Save Driver Details</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: FULL SCREEN DOCUMENT IMAGE PREVIEW */}
      {/* ======================================================== */}
      <Modal
        visible={Boolean(previewImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center p-4">
          <TouchableOpacity
            onPress={() => setPreviewImageUrl(null)}
            className="absolute top-12 right-6 z-10 w-11 h-11 rounded-full bg-white/20 items-center justify-center border border-white/30"
            accessibilityLabel="Close Preview"
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              className="w-full h-[75%] rounded-2xl"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}
