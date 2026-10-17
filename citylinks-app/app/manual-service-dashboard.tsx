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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Wrench,
  MapPin,
  Phone,
  Mail,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Navigation,
  Crosshair,
  CheckCircle,
  Tag,
  Percent,
  Bell,
  Clock,
  ArrowRight,
  ShieldCheck,
  Star,
  Briefcase,
  Search,
  Maximize2,
  Camera,
  Image as ImageIcon,
  Pencil,
  AlertTriangle,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/apiClient';
import { queryCache } from '../utils/queryCache';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { ServiceItem, DealItem } from '../queries/marketplaceQueries';
import { ImageEnlargeModal } from '../components/ui/ImageEnlargeModal';
import { getManualServiceCoverImage } from '../utils/serviceImages';
import { compressBanner } from '../utils/imageCompressor';
import { LazyImage } from '../components/ui/LazyImage';
import { uploadImageToCloudflare } from '../services/imageUpload';

export default function ManualServiceDashboardScreen() {
  const { userData, setUserData, setUserToken } = useApp();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Provider profile state
  const [providerName, setProviderName] = useState(
    userData?.fullName ? `${userData.fullName} Services` : 'My Technical Services'
  );
  const [primaryTrade, setPrimaryTrade] = useState('Plumbing & Electrical');
  const [locationStr, setLocationStr] = useState(userData?.address || 'Haveri Town, Karnataka');
  const [phoneStr, setPhoneStr] = useState(userData?.phone || '9845112233');
  const [emailStr, setEmailStr] = useState(userData?.email || '');
  const [isAvailable, setIsAvailable] = useState(true);

  // Edit Profile Modal
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTrade, setEditTrade] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [fetchingGps, setFetchingGps] = useState(false);

  // Services State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  // Add Service Modal State
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Plumbing');
  const [servicePriceLabel, setServicePriceLabel] = useState('₹249 onwards');
  const [serviceLocation, setServiceLocation] = useState('Haveri Region');
  const [servicePhone, setServicePhone] = useState(userData?.phone || '');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceImageUrl, setServiceImageUrl] = useState('');
  const [addingService, setAddingService] = useState(false);

  // Deals State
  const [providerDeals, setProviderDeals] = useState<DealItem[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [addDealModalOpen, setAddDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealDiscount, setDealDiscount] = useState('20% OFF');
  const [dealValidUntil, setDealValidUntil] = useState('Valid this week');
  const [addingDeal, setAddingDeal] = useState(false);

  // Delete Confirmation Target Modal
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    title: string;
    type: 'service' | 'deal';
    discount?: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{
    url: string;
    title: string;
    subtitle: string;
    badge: string;
    price: string;
  } | null>(null);

  // Photo Edit State for Services & Deals
  const [photoActionModalOpen, setPhotoActionModalOpen] = useState(false);
  const [targetPhotoService, setTargetPhotoService] = useState<ServiceItem | null>(null);
  const [targetPhotoDeal, setTargetPhotoDeal] = useState<DealItem | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleOpenServicePhotoAction = (svc: ServiceItem) => {
    setTargetPhotoService(svc);
    setTargetPhotoDeal(null);
    setPhotoActionModalOpen(true);
  };

  const handleOpenDealPhotoAction = (deal: DealItem) => {
    setTargetPhotoDeal(deal);
    setTargetPhotoService(null);
    setPhotoActionModalOpen(true);
  };

  const handlePickTargetPhoto = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showError('Camera permission is required', 'Permission Denied');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          await processAndUploadPhoto(result.assets[0].uri);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError('Photo library permission is required', 'Permission Denied');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          await processAndUploadPhoto(result.assets[0].uri);
        }
      }
    } catch (err: any) {
      console.error('Pick photo error:', err);
      showError('Failed to select photo', 'Error');
    }
  };

  const processAndUploadPhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      const compressed = await compressBanner(uri);
      const cloudflareUrl = await uploadImageToCloudflare(compressed);

      if (targetPhotoService) {
        await apiClient.put(`/services/${targetPhotoService.id}`, {
          imageUrl: cloudflareUrl,
        });
        setServices((prev) =>
          prev.map((s) => (s.id === targetPhotoService.id ? { ...s, imageUrl: cloudflareUrl } : s))
        );
        queryCache.invalidate('/services');
        queryCache.invalidate('/services/categories');
        showSuccess(`Photo updated for "${targetPhotoService.title}"!`, 'Photo Updated');
      } else if (targetPhotoDeal) {
        await apiClient.put(`/deals/${targetPhotoDeal.id}`, {
          imageUrl: cloudflareUrl,
        });
        setProviderDeals((prev) =>
          prev.map((d) => (d.id === targetPhotoDeal.id ? { ...d, imageUrl: cloudflareUrl } : d))
        );
        queryCache.invalidate('/deals');
        showSuccess('Deal photo updated!', 'Photo Updated');
      }
      setPhotoActionModalOpen(false);
    } catch (err: any) {
      console.error('Process and upload photo error:', err);
      showError(err.response?.data?.error || 'Failed to upload photo', 'Error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveTargetPhoto = async () => {
    try {
      setUploadingPhoto(true);
      if (targetPhotoService) {
        await apiClient.put(`/services/${targetPhotoService.id}`, {
          imageUrl: '',
        });
        setServices((prev) =>
          prev.map((s) => (s.id === targetPhotoService.id ? { ...s, imageUrl: undefined } : s))
        );
        queryCache.invalidate('/services');
        queryCache.invalidate('/services/categories');
        showSuccess('Photo reset to default category image', 'Photo Reset');
      } else if (targetPhotoDeal) {
        await apiClient.put(`/deals/${targetPhotoDeal.id}`, {
          imageUrl: '',
        });
        setProviderDeals((prev) =>
          prev.map((d) => (d.id === targetPhotoDeal.id ? { ...d, imageUrl: undefined } : d))
        );
        queryCache.invalidate('/deals');
        showSuccess('Deal photo removed', 'Photo Removed');
      }
      setPhotoActionModalOpen(false);
    } catch (err: any) {
      console.error('Remove photo error:', err);
      showError(err.response?.data?.error || 'Failed to remove photo', 'Error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Fetch all services created by this provider with caching
  const fetchServices = async (targetProvider?: string, force = false) => {
    const name = targetProvider || providerName;
    const cacheKey = `manual-services-${name}`;
    if (!force) {
      const cached = queryCache.get<any[]>(cacheKey);
      if (cached && Array.isArray(cached)) {
        setServices(cached);
      }
    }
    try {
      if (services.length === 0 && !queryCache.get(cacheKey)) setLoadingServices(true);
      const res = await queryCache.fetchWithDeduplication(cacheKey, () =>
        apiClient.get('/services', {
          params: { all: 'true', providerName: name },
        })
      );
      if (Array.isArray(res.data)) {
        queryCache.set(cacheKey, res.data, 60_000, true);
        setServices(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  // Fetch deals created by this service provider with caching
  const fetchDeals = async (targetProvider?: string, force = false) => {
    const name = targetProvider || providerName;
    const cacheKey = `manual-deals-${name}`;
    if (!force) {
      const cached = queryCache.get<any[]>(cacheKey);
      if (cached && Array.isArray(cached)) {
        setProviderDeals(cached);
      }
    }
    try {
      if (providerDeals.length === 0 && !queryCache.get(cacheKey)) setLoadingDeals(true);
      const res = await queryCache.fetchWithDeduplication(cacheKey, () =>
        apiClient.get('/deals', { params: { merchantName: name } })
      );
      if (Array.isArray(res.data)) {
        queryCache.set(cacheKey, res.data, 60_000, true);
        setProviderDeals(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch deals:', err);
    } finally {
      setLoadingDeals(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const defaultName = userData?.fullName
        ? `${userData.fullName} Services`
        : 'My Technical Services';
      setProviderName(defaultName);
      setPhoneStr(userData?.phone || '');
      setEmailStr(userData?.email || '');
      setLocationStr(userData?.address || 'Haveri Town, Karnataka');
      setServicePhone(userData?.phone || '');

      await Promise.allSettled([
        fetchServices(defaultName),
        fetchDeals(defaultName),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [userData?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchServices();
      fetchDeals();
    }, [providerName])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    queryCache.invalidate('/services');
    queryCache.invalidate('/deals');
    queryCache.invalidate('/notifications');
    try {
      await Promise.allSettled([
        fetchServices(),
        fetchDeals(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto GPS Location
  const handleAutoGps = async () => {
    try {
      setFetchingGps(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Permission is required to fetch GPS coordinates.', 'Permission Needed');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (address) {
        const formatted = [
          address.name || address.street,
          address.subregion || address.district,
          address.city,
          address.region || 'Karnataka',
        ]
          .filter(Boolean)
          .join(', ');
        setEditLocation(formatted);
        showSuccess('Location detected from GPS!', 'GPS Success');
      }
    } catch (err: any) {
      showError('Failed to detect GPS location', 'GPS Error');
    } finally {
      setFetchingGps(false);
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      showError('Provider/Technician name cannot be empty', 'Missing Name');
      return;
    }
    setProviderName(editName.trim());
    if (editTrade.trim()) setPrimaryTrade(editTrade.trim());
    if (editLocation.trim()) setLocationStr(editLocation.trim());
    if (editPhone.trim()) {
      setPhoneStr(editPhone.trim());
      setServicePhone(editPhone.trim());
    }
    setEditProfileModal(false);
    showSuccess('Profile updated successfully!', 'Saved');
    fetchServices(editName.trim());
    fetchDeals(editName.trim());
  };

  const [pickingServiceImage, setPickingServiceImage] = useState(false);

  const handleTakeServicePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a service banner photo.', 'Permission Needed');
        return;
      }
      setPickingServiceImage(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressBanner(result.assets[0].uri);
        setServiceImageUrl(compressed);
        showSuccess('Service banner photo captured & compressed!', 'Success');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      showError('Failed to capture photo from camera.', 'Camera Error');
    } finally {
      setPickingServiceImage(false);
    }
  };

  const handlePickServiceFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to select a service banner photo.', 'Permission Needed');
        return;
      }
      setPickingServiceImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressBanner(result.assets[0].uri);
        setServiceImageUrl(compressed);
        showSuccess('Service banner photo selected & compressed!', 'Success');
      }
    } catch (err: any) {
      console.error('Gallery error:', err);
      showError('Failed to select photo from gallery.', 'Gallery Error');
    } finally {
      setPickingServiceImage(false);
    }
  };

  // Add Service Handler
  const handleAddService = async () => {
    if (!serviceTitle.trim()) {
      showError('Service title is required (e.g. Pipe Leakage Fix)', 'Missing Title');
      return;
    }
    if (!serviceCategory.trim()) {
      showError('Category is required', 'Missing Category');
      return;
    }
    if (!serviceImageUrl.trim()) {
      showError('Service banner photo is compulsory. Please capture or select an image.', 'Photo Compulsory');
      return;
    }

    try {
      setAddingService(true);
      const cloudflareUrl = await uploadImageToCloudflare(serviceImageUrl.trim());
      const res = await apiClient.post('/services', {
        title: serviceTitle.trim(),
        category: serviceCategory.trim(),
        providerName: providerName.trim(),
        phone: (servicePhone || phoneStr).trim(),
        priceLabel: servicePriceLabel.trim() || '₹249 onwards',
        location: (serviceLocation || locationStr).trim() || 'Haveri Region',
        description: serviceDescription.trim() || undefined,
        imageUrl: cloudflareUrl,
        isAvailable: true,
      });

      showSuccess(`"${serviceTitle.trim()}" is now live in the Book Services section!`, 'Service Published');

      // Invalidate caches so users immediately see it
      queryCache.invalidate('/services');
      queryCache.invalidate('/services/categories');

      // Reset modal
      setServiceTitle('');
      setServiceDescription('');
      setServiceImageUrl('');
      setServicePriceLabel('₹249 onwards');
      setAddServiceModalOpen(false);

      await fetchServices();
    } catch (err: any) {
      console.error('Error adding service:', err);
      showError(err.response?.data?.error || 'Failed to publish service', 'Error');
    } finally {
      setAddingService(false);
    }
  };

  // Add Deal Handler
  const handleAddDeal = async () => {
    if (!dealTitle.trim()) {
      showError('Deal title is required', 'Missing Field');
      return;
    }

    try {
      setAddingDeal(true);
      await apiClient.post('/deals', {
        title: dealTitle.trim(),
        discount: dealDiscount.trim() || '20% OFF',
        category: serviceCategory || 'Services',
        merchantName: providerName.trim(),
        validUntil: dealValidUntil.trim() || 'Limited time offer',
        linkUrl: '/services',
        broadcastNotification: true,
      });

      showSuccess(`Deal published and broadcast push notification sent!`, 'Deal Live');
      queryCache.invalidate('/deals');
      queryCache.invalidate('/notifications');

      setDealTitle('');
      setDealDiscount('20% OFF');
      setAddDealModalOpen(false);

      await fetchDeals();
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to publish deal', 'Error');
    } finally {
      setAddingDeal(false);
    }
  };

  // Confirm Delete Handler
  const confirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    const { id, title, type } = deleteConfirmTarget;

    setDeletingId(id);
    if (type === 'service') {
      // 1. Instant optimistic UI removal
      setServices((prev) => prev.filter((s) => s.id !== id));
      try {
        await apiClient.delete(`/services/${id}`);
        showSuccess(`Removed "${title}" from Book Services directory`, 'Service Removed');
        queryCache.invalidate('/services');
      } catch (err) {
        showError('Failed to remove service from server', 'Error');
        await fetchServices();
      } finally {
        setDeletingId(null);
        setDeleteConfirmTarget(null);
      }
    } else {
      // Deal delete
      setProviderDeals((prev) => prev.filter((d) => d.id !== id));
      try {
        await apiClient.delete(`/deals/${id}`);
        showSuccess(`Removed deal "${title}" from all listings & notifications`, 'Deal Removed');
        queryCache.invalidate('/deals');
        queryCache.invalidate('/notifications');
      } catch (err) {
        showError('Failed to remove deal from server', 'Error');
        await fetchDeals();
      } finally {
        setDeletingId(null);
        setDeleteConfirmTarget(null);
      }
    }
  };

  // Categories for Manual Trades
  const manualTradeCategories = [
    'Plumbing',
    'Electrician',
    'Cleaning',
    'Painting',
    'Carpentry',
    'Salon',
    'Appliance Repair',
    'Vehicle Mechanic',
    'Masonry',
    'General',
    'Others',
  ];

  // Filtered Services in Dashboard
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat =
        selectedCategoryFilter === 'All' ||
        s.category.toLowerCase() === selectedCategoryFilter.toLowerCase();
      const q = searchFilter.toLowerCase().trim();
      const matchQ =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.priceLabel.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [services, selectedCategoryFilter, searchFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Top Navbar */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#ffffff' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
                Service Provider Hub
              </Text>
              <View
                style={{
                  backgroundColor: '#f0fdf4',
                  borderColor: '#bbf7d0',
                  borderWidth: 1,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#16a34a' }}>
                  MANUAL
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              Bookable Services, Jobs & Directory Sync
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 12 }}>
            Loading Service Provider Console...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* PROVIDER PROFILE CARD */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              marginBottom: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>
                    {providerName}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#f0fdf4',
                      paddingHorizontal: 8,
                      paddingVertical: 2.5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#bbf7d0',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a' }}>
                      {primaryTrade}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <MapPin size={13} color="#64748b" />
                  <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1}>
                    {locationStr}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setEditName(providerName);
                  setEditTrade(primaryTrade);
                  setEditLocation(locationStr);
                  setEditPhone(phoneStr);
                  setEditProfileModal(true);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Edit3 size={16} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Quick Stats Grid */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>Active Services</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>
                  {services.length} Listed
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#dcfce7' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>Sync Status</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d', marginTop: 3 }}>
                  Live in Bookings
                </Text>
              </View>
            </View>

            {/* Availability Toggle */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isAvailable ? '#f0fdf4' : '#f8fafc',
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: isAvailable ? '#bbf7d0' : '#e2e8f0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: isAvailable ? '#16a34a' : '#94a3b8',
                  }}
                />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                    {isAvailable ? 'Available for Customer Bookings' : 'Currently Busy / Off Duty'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>
                    {isAvailable ? 'Citizens can call & book you in Book Services' : 'Your services are marked busy'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={(val) => {
                  setIsAvailable(val);
                  showSuccess(val ? 'Status set to Available!' : 'Status set to Busy/Off-duty', 'Availability');
                }}
                trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                thumbColor={isAvailable ? '#16a34a' : '#94a3b8'}
              />
            </View>
          </View>

          {/* SECTION 1: SERVICES CATALOG MANAGEMENT */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              marginBottom: 18,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Header row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: '#f0fdf4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Wrench size={19} color="#16a34a" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}
                    numberOfLines={1}
                  >
                    Services Offered
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View
                      style={{
                        backgroundColor: '#dcfce7',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803d' }}>
                        {services.length} ACTIVE
                      </Text>
                    </View>

                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAddServiceModalOpen(true)}
                style={{
                  backgroundColor: '#16a34a',
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  shadowColor: '#16a34a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Plus size={14} color="#ffffff" strokeWidth={3} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                  Add Service
                </Text>
              </TouchableOpacity>
            </View>

            {loadingServices ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#16a34a" />
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                  Loading your trade services...
                </Text>
              </View>
            ) : services.length === 0 ? (
              <View
                style={{
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: '#bbf7d0',
                  borderStyle: 'dashed',
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#dcfce7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Wrench size={24} color="#16a34a" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                  No Services Listed Yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#15803d',
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: 16,
                    lineHeight: 18,
                    paddingHorizontal: 10,
                  }}
                >
                  Add your first trade service (e.g. Electrical wiring, Tap leak fix, Painting) so nearby customers can discover and book you.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAddServiceModalOpen(true)}
                  style={{
                    backgroundColor: '#16a34a',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#16a34a',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 2,
                    gap: 6,
                  }}
                >
                  <Plus size={16} color="#ffffff" strokeWidth={3} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    Add Your First Service
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {services.map((svc) => {
                  const coverUrl = getManualServiceCoverImage(svc);
                  return (
                    <View
                      key={svc.id}
                      style={{
                        borderRadius: 16,
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        padding: 14,
                      }}
                    >
                      {/* Image Thumbnail with Tap to Enlarge */}
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() =>
                          setEnlargedImage({
                            url: coverUrl,
                            title: svc.title,
                            subtitle: `${svc.providerName} • ${svc.location}`,
                            badge: svc.category,
                            price: svc.priceLabel,
                          })
                        }
                        style={{
                          height: 105,
                          borderRadius: 12,
                          overflow: 'hidden',
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                        }}
                      >
                        <LazyImage
                          source={{ uri: coverUrl }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          loaderColor="#2563eb"
                        />
                        <View
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Maximize2 size={10} color="#ffffff" />
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#ffffff' }}>Enlarge</Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handleOpenServicePhotoAction(svc)}
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 6,
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.25)',
                          }}
                        >
                          <Camera size={11} color="#ffffff" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>Edit Photo</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: '#f0fdf4',
                              borderColor: '#bbf7d0',
                              borderWidth: 1,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 8,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#16a34a' }}>
                              {svc.category}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#16a34a' }}>
                            {svc.priceLabel}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleOpenServicePhotoAction(svc)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#eff6ff',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: '#bfdbfe',
                            }}
                          >
                            <Pencil size={13} color="#2563eb" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            disabled={deletingId === svc.id}
                            onPress={() =>
                              setDeleteConfirmTarget({
                                id: svc.id,
                                title: svc.title,
                                type: 'service',
                              })
                            }
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: '#fee2e2',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {deletingId === svc.id ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <Trash2 size={14} color="#ef4444" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4, lineHeight: 19 }}>
                        {svc.title}
                      </Text>

                      {Boolean(svc.description) && (
                        <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16, marginBottom: 8 }} numberOfLines={2}>
                          {svc.description}
                        </Text>
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} color="#64748b" />
                          <Text style={{ fontSize: 11, color: '#64748b' }}>
                            {svc.location}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} color="#16a34a" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>
                            {svc.phone || phoneStr}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* SECTION 2: DEALS & OFFERS MANAGEMENT */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              padding: 18,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              marginBottom: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Header row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: '#fef3c7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Tag size={19} color="#d97706" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}
                    numberOfLines={1}
                  >
                    Trade Deals & Offers
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View
                      style={{
                        backgroundColor: '#fef3c7',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#b45309' }}>
                        {providerDeals.length} ACTIVE
                      </Text>
                    </View>

                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAddDealModalOpen(true)}
                style={{
                  backgroundColor: '#d97706',
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  shadowColor: '#d97706',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Plus size={14} color="#ffffff" strokeWidth={3} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                  Add Deal
                </Text>
              </TouchableOpacity>
            </View>

            {loadingDeals ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#d97706" />
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                  Loading trade offers...
                </Text>
              </View>
            ) : providerDeals.length === 0 ? (
              <View
                style={{
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fffbeb',
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: '#fde68a',
                  borderStyle: 'dashed',
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#fef3c7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Sparkles size={24} color="#d97706" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', textAlign: 'center' }}>
                  No Active Trade Offers Yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#92400e',
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: 16,
                    lineHeight: 18,
                    paddingHorizontal: 10,
                  }}
                >
                  Publish discount offers (e.g. 20% OFF Inspection, FLAT ₹100 OFF) to get featured in the Deals feed and send instant push notifications to citizens.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAddDealModalOpen(true)}
                  style={{
                    backgroundColor: '#d97706',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#d97706',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 2,
                    gap: 6,
                  }}
                >
                  <Plus size={16} color="#ffffff" strokeWidth={3} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    Publish First Deal
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {providerDeals.map((deal) => (
                  <View
                    key={deal.id}
                    style={{
                      borderRadius: 16,
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      padding: 14,
                    }}
                  >
                    {/* Optional Deal Image */}
                    {Boolean(deal.imageUrl) ? (
                      <View
                        style={{
                          width: '100%',
                          height: 110,
                          borderRadius: 12,
                          overflow: 'hidden',
                          marginBottom: 10,
                          backgroundColor: '#e2e8f0',
                          position: 'relative',
                        }}
                      >
                        <LazyImage
                          source={{ uri: deal.imageUrl! }}
                          style={{ width: '100%', height: '100%' }}
                          contentFit="cover"
                          loaderColor="#2563eb"
                        />
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handleOpenDealPhotoAction(deal)}
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            right: 6,
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.25)',
                          }}
                        >
                          <Camera size={11} color="#ffffff" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>Edit Photo</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleOpenDealPhotoAction(deal)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: '#f8fafc',
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          borderStyle: 'dashed',
                          marginBottom: 10,
                        }}
                      >
                        <Camera size={12} color="#64748b" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                          + Add Photo to this Deal
                        </Text>
                      </TouchableOpacity>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={{
                            backgroundColor: '#fef3c7',
                            borderColor: '#fde68a',
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Tag size={11} color="#d97706" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#d97706' }}>
                            {deal.discount}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: '#e2e8f0', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>
                            {deal.category}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleOpenDealPhotoAction(deal)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: '#eff6ff',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: '#bfdbfe',
                          }}
                        >
                          <Pencil size={13} color="#2563eb" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          disabled={deletingId === deal.id}
                          onPress={() =>
                            setDeleteConfirmTarget({
                              id: deal.id,
                              title: deal.title,
                              type: 'deal',
                              discount: deal.discount,
                            })
                          }
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: '#fee2e2',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {deletingId === deal.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <Trash2 size={14} color="#ef4444" />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>
                      {deal.title}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} color="#64748b" />
                        <Text style={{ fontSize: 11, color: '#64748b' }}>
                          {deal.validUntil || 'Active Offer'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Bell size={10} color="#059669" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>
                          Broadcast Alert Sent
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* MODAL 1: ADD MANUAL SERVICE */}
      <Modal visible={addServiceModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: '#ffffff',
                borderTopLeftRadius: 30,
                borderTopRightRadius: 30,
                padding: 20,
                maxHeight: '92%',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                    Add Trade Service
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Will be displayed immediately in the Book Services section
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddServiceModalOpen(false)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Title */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Title / Offering *
                  </Text>
                  <TextInput
                    value={serviceTitle}
                    onChangeText={setServiceTitle}
                    maxLength={60}
                    placeholder="e.g. Complete Bathroom & Pipe Leakage Repair"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* Category Picker */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Trade Category *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 8 }}>
                    {manualTradeCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setServiceCategory(cat)}
                        style={{
                          backgroundColor: serviceCategory === cat ? '#16a34a' : '#f0fdf4',
                          borderColor: serviceCategory === cat ? '#16a34a' : '#bbf7d0',
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: serviceCategory === cat ? '#ffffff' : '#15803d' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    value={serviceCategory}
                    onChangeText={setServiceCategory}
                    maxLength={40}
                    placeholder="Or type custom trade category"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, fontSize: 12 }}
                  />
                </View>

                {/* Price Label */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Starting Rate / Price Label *
                  </Text>
                  <TextInput
                    value={servicePriceLabel}
                    onChangeText={setServicePriceLabel}
                    maxLength={30}
                    placeholder="e.g. ₹249 onwards / ₹150/hr"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '700', color: '#16a34a', marginBottom: 6 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['₹149 onwards', '₹199 onwards', '₹249 onwards', '₹349 onwards', '₹499 onwards', '₹150/hr', 'Free Inspection'].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => setServicePriceLabel(preset)}
                        style={{
                          backgroundColor: servicePriceLabel === preset ? '#16a34a' : '#f0fdf4',
                          borderColor: servicePriceLabel === preset ? '#16a34a' : '#bbf7d0',
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: servicePriceLabel === preset ? '#ffffff' : '#15803d' }}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Service Phone */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Contact Phone Number *
                  </Text>
                  <TextInput
                    value={servicePhone}
                    onChangeText={setServicePhone}
                    maxLength={14}
                    keyboardType="phone-pad"
                    placeholder="Phone number for customer calls"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* Service Location */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Area / Town
                  </Text>
                  <TextInput
                    value={serviceLocation}
                    onChangeText={setServiceLocation}
                    maxLength={80}
                    placeholder="Haveri Town / Haveri Region"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* Description */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Details & Included Work (Optional)
                  </Text>
                  <TextInput
                    value={serviceDescription}
                    onChangeText={setServiceDescription}
                    maxLength={300}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe tools provided, warranty, emergency timing..."
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, minHeight: 70 }}
                  />
                </View>

                {/* Service Banner Photo - Camera & Gallery */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                      Service Banner Photo <Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: '800' }}>
                      Required *
                    </Text>
                  </View>

                  {/* Selected Photo Preview */}
                  {serviceImageUrl.trim().length > 0 ? (
                    <View style={{ height: 130, borderRadius: 14, overflow: 'hidden', marginBottom: 10, position: 'relative', borderWidth: 1, borderColor: '#cbd5e1' }}>
                      <Image source={{ uri: serviceImageUrl.trim() }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setServiceImageUrl('')}
                        style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(15,23,42,0.7)', padding: 6, borderRadius: 20 }}
                      >
                        <X size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 8, lineHeight: 16 }}>
                      💡 If you don't choose a photo, a verified professional {serviceCategory || 'trade'} photo is automatically used as the demo image.
                    </Text>
                  )}

                  {/* Camera & Gallery Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      disabled={pickingServiceImage}
                      onPress={handleTakeServicePhoto}
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
                      disabled={pickingServiceImage}
                      onPress={handlePickServiceFromGallery}
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

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={addingService}
                  onPress={handleAddService}
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
                  {addingService ? (
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

      {/* MODAL 2: ADD TRADE DEAL */}
      <Modal visible={addDealModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                    Publish Trade Offer & Deal
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Broadcasts push alert to all users and lists in Deals & Offers
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setAddDealModalOpen(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Deal Title *
                  </Text>
                  <TextInput
                    value={dealTitle}
                    onChangeText={setDealTitle}
                    maxLength={60}
                    placeholder="e.g. 20% Off on Home Deep Cleaning & Plumbing"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Discount Badge *
                  </Text>
                  <TextInput
                    value={dealDiscount}
                    onChangeText={setDealDiscount}
                    maxLength={30}
                    placeholder="e.g. 20% OFF, FLAT ₹100 OFF"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '700', color: '#d97706', marginBottom: 6 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['15% OFF', '20% OFF', '25% OFF', '30% OFF', '50% OFF', 'FLAT ₹50 OFF', 'FLAT ₹100 OFF'].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => setDealDiscount(preset)}
                        style={{
                          backgroundColor: dealDiscount === preset ? '#d97706' : '#fffbeb',
                          borderColor: dealDiscount === preset ? '#d97706' : '#fde68a',
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: dealDiscount === preset ? '#ffffff' : '#92400e' }}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Validity Period
                  </Text>
                  <TextInput
                    value={dealValidUntil}
                    onChangeText={setDealValidUntil}
                    maxLength={40}
                    placeholder="Valid till Sunday / This week only"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={addingDeal}
                  onPress={handleAddDeal}
                  style={{
                    backgroundColor: '#d97706',
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    shadowColor: '#d97706',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}
                >
                  {addingDeal ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                      Publish Deal & Broadcast Alert
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 3: EDIT PROFILE */}
      <Modal visible={editProfileModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                  Edit Service Profile
                </Text>
                <TouchableOpacity onPress={() => setEditProfileModal(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Provider / Business Name *
                  </Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    maxLength={50}
                    placeholder="e.g. Ramesh Plumbing Works"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Primary Trade
                  </Text>
                  <TextInput
                    value={editTrade}
                    onChangeText={setEditTrade}
                    maxLength={40}
                    placeholder="e.g. Plumbing, Electrician, Cleaning"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Contact Phone Number
                  </Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    maxLength={14}
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                      Location / Base Town
                    </Text>
                    <TouchableOpacity
                      disabled={fetchingGps}
                      onPress={handleAutoGps}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Crosshair size={13} color="#16a34a" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>
                        {fetchingGps ? 'Detecting...' : 'Detect GPS'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={editLocation}
                    onChangeText={setEditLocation}
                    maxLength={80}
                    placeholder="Haveri Town, Karnataka"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSaveProfile}
                  style={{ backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                    Save Profile Changes
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CONFIRMATION CARD MODAL */}
      <Modal visible={deleteConfirmTarget !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 28,
              padding: 24,
              width: '100%',
              maxWidth: 380,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            {/* Trash Icon Badge */}
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: '#fee2e2',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 16,
                borderWidth: 2,
                borderColor: '#fecaca',
              }}
            >
              <Trash2 size={28} color="#dc2626" />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>
              {deleteConfirmTarget?.type === 'service' ? 'Delete Trade Service?' : 'Delete Deal & Offer?'}
            </Text>

            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
              {deleteConfirmTarget?.type === 'service'
                ? `Are you sure you want to delete "${deleteConfirmTarget?.title}"? It will be removed immediately from the Book Services section.`
                : `Are you sure you want to delete this offer? It will be removed from all listings in Deals & Offers and citizen notifications.`}
            </Text>

            {deleteConfirmTarget?.type === 'deal' && (
              <View
                style={{
                  backgroundColor: '#fffbeb',
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#fde68a',
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Tag size={13} color="#d97706" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#d97706' }}>
                    {deleteConfirmTarget?.discount || 'SPECIAL OFFER'}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#78350f' }} numberOfLines={2}>
                  {deleteConfirmTarget?.title}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={deletingId !== null}
                onPress={() => setDeleteConfirmTarget(null)}
                style={{
                  flex: 1,
                  backgroundColor: '#f1f5f9',
                  borderRadius: 14,
                  paddingVertical: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={deletingId !== null}
                onPress={confirmDelete}
                style={{
                  flex: 1,
                  backgroundColor: '#dc2626',
                  borderRadius: 14,
                  paddingVertical: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#dc2626',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {deletingId !== null ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    Yes, Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ImageEnlargeModal
        visible={Boolean(enlargedImage)}
        imageUrl={enlargedImage?.url}
        title={enlargedImage?.title}
        subtitle={enlargedImage?.subtitle}
        badge={enlargedImage?.badge}
        price={enlargedImage?.price}
        onClose={() => setEnlargedImage(null)}
      />

      {/* MODAL: PHOTO EDIT ACTIONS */}
      <Modal visible={photoActionModalOpen} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => !uploadingPhoto && setPhotoActionModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                  {targetPhotoService ? 'Update Service Photo' : 'Update Deal Photo'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {targetPhotoService ? targetPhotoService.title : targetPhotoDeal?.title || 'Offer Banner'}
                </Text>
              </View>
              <TouchableOpacity
                disabled={uploadingPhoto}
                onPress={() => setPhotoActionModalOpen(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {uploadingPhoto ? (
              <View style={{ paddingVertical: 30, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#16a34a" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 12 }}>
                  Uploading & updating photo...
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePickTargetPhoto('camera')}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={20} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Take New Photo</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Capture job photo, tool setup, or business banner</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePickTargetPhoto('gallery')}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={20} color="#d97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Choose from Gallery</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Select high quality photo from phone gallery</Text>
                  </View>
                </TouchableOpacity>

                {Boolean(targetPhotoService?.imageUrl || targetPhotoDeal?.imageUrl) && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleRemoveTargetPhoto}
                    style={{
                      backgroundColor: '#fff1f2',
                      borderWidth: 1,
                      borderColor: '#fecdd3',
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={20} color="#e11d48" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#e11d48' }}>Reset to Default</Text>
                      <Text style={{ fontSize: 11, color: '#9f1239' }}>Revert back to default trade category image</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
