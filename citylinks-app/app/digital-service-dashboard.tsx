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
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Edit3,
  Check,
  X,
  Plus,
  Trash2,
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
  Laptop,
  Globe,
  Palette,
  FileText,
  Target,
  Server,
  TrendingUp,
  Users,
  Megaphone,
  Maximize2,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/apiClient';
import { queryCache } from '../utils/queryCache';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { DigitalServiceProviderItem, DealItem } from '../queries/marketplaceQueries';
import { ImageEnlargeModal } from '../components/ui/ImageEnlargeModal';
import { getDigitalServiceCoverImage } from '../utils/serviceImages';

export default function DigitalServiceDashboardScreen() {
  const { userData } = useApp();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Specialist profile state
  const [specialistName, setSpecialistName] = useState(
    userData?.fullName ? `${userData.fullName} Digital Studio` : 'My Digital Solutions'
  );
  const [primaryDomain, setPrimaryDomain] = useState('Website Creation & Media');
  const [locationStr, setLocationStr] = useState(userData?.address || 'Haveri Region & Online');
  const [phoneStr, setPhoneStr] = useState(userData?.phone || '9845112244');
  const [emailStr, setEmailStr] = useState(userData?.email || '');
  const [isAvailable, setIsAvailable] = useState(true);

  // Edit Profile Modal
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [fetchingGps, setFetchingGps] = useState(false);

  // Digital Services State
  const [services, setServices] = useState<DigitalServiceProviderItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');

  // Add Digital Service Modal State
  const [addServiceModalOpen, setAddServiceModalOpen] = useState(false);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDomain, setServiceDomain] = useState('Website Creation');
  const [servicePriceLabel, setServicePriceLabel] = useState('₹2,999 onwards');
  const [serviceLocation, setServiceLocation] = useState('Online & Haveri Region');
  const [servicePhone, setServicePhone] = useState(userData?.phone || '');
  const [serviceBadge, setServiceBadge] = useState('Verified');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceImageUrl, setServiceImageUrl] = useState('');
  const [addingService, setAddingService] = useState(false);

  // Deals State
  const [specialistDeals, setSpecialistDeals] = useState<DealItem[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [addDealModalOpen, setAddDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealDiscount, setDealDiscount] = useState('25% OFF');
  const [dealValidUntil, setDealValidUntil] = useState('Valid this month');
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

  // Fetch all services created by this digital specialist
  const fetchServices = async (targetName?: string) => {
    try {
      setLoadingServices(true);
      const name = targetName || specialistName;
      const res = await apiClient.get('/marketplace/digital-providers', {
        params: {
          all: 'true',
          providerName: name,
        },
      });
      if (Array.isArray(res.data)) {
        setServices(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch digital services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  // Fetch deals created by this digital specialist
  const fetchDeals = async (targetName?: string) => {
    try {
      setLoadingDeals(true);
      const name = targetName || specialistName;
      const res = await apiClient.get('/deals', {
        params: { merchantName: name },
      });
      if (Array.isArray(res.data)) {
        setSpecialistDeals(res.data);
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
        ? `${userData.fullName} Digital Studio`
        : 'My Digital Solutions';
      setSpecialistName(defaultName);
      setPhoneStr(userData?.phone || '');
      setEmailStr(userData?.email || '');
      setLocationStr(userData?.address || 'Haveri Region & Online');
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
    }, [specialistName])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    queryCache.invalidate('/marketplace/digital-providers');
    queryCache.invalidate('/marketplace/digital-services');
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
        setEditLocation(`${formatted} & Remote`);
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
      showError('Specialist or studio name cannot be empty', 'Missing Name');
      return;
    }
    setSpecialistName(editName.trim());
    if (editDomain.trim()) setPrimaryDomain(editDomain.trim());
    if (editLocation.trim()) setLocationStr(editLocation.trim());
    if (editPhone.trim()) {
      setPhoneStr(editPhone.trim());
      setServicePhone(editPhone.trim());
    }
    setEditProfileModal(false);
    showSuccess('Digital specialist profile updated!', 'Saved');
    fetchServices(editName.trim());
    fetchDeals(editName.trim());
  };

  const [pickingServiceImage, setPickingServiceImage] = useState(false);

  const handleTakeServicePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a portfolio banner photo.', 'Permission Needed');
        return;
      }
      setPickingServiceImage(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setServiceImageUrl(result.assets[0].uri);
        showSuccess('Portfolio banner photo captured!', 'Success');
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
        showError('Gallery access is required to select a portfolio banner photo.', 'Permission Needed');
        return;
      }
      setPickingServiceImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setServiceImageUrl(result.assets[0].uri);
        showSuccess('Portfolio banner photo selected!', 'Success');
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
      showError('Service title is required (e.g. Modern Business Website)', 'Missing Title');
      return;
    }
    if (!serviceDomain.trim()) {
      showError('Digital domain / category is required', 'Missing Domain');
      return;
    }

    try {
      setAddingService(true);
      await apiClient.post('/marketplace/digital-providers', {
        name: specialistName.trim(),
        serviceType: serviceDomain.trim(),
        priceLabel: servicePriceLabel.trim() || '₹1,999 onwards',
        phone: (servicePhone || phoneStr).trim(),
        location: (serviceLocation || locationStr).trim() || 'Online & Haveri Region',
        description: serviceDescription.trim() || serviceTitle.trim(),
        badge: serviceBadge.trim() || 'Verified',
        imageUrl: serviceImageUrl.trim() || undefined,
        isAvailable: true,
      });

      showSuccess(`"${serviceTitle.trim()}" published to the Digital Services directory!`, 'Service Published');

      // Invalidate caches
      queryCache.invalidate('/marketplace/digital-providers');
      queryCache.invalidate('/marketplace/digital-services');

      // Reset modal
      setServiceTitle('');
      setServiceDescription('');
      setServiceImageUrl('');
      setServicePriceLabel('₹2,999 onwards');
      setAddServiceModalOpen(false);

      await fetchServices();
    } catch (err: any) {
      console.error('Error adding digital service:', err);
      showError(err.response?.data?.error || 'Failed to publish digital service', 'Error');
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
        discount: dealDiscount.trim() || '25% OFF',
        category: serviceDomain || 'Services',
        merchantName: specialistName.trim(),
        validUntil: dealValidUntil.trim() || 'Limited time offer',
        linkUrl: '/digital-services',
        broadcastNotification: true,
      });

      showSuccess(`Deal published and broadcast push alert sent to all citizens!`, 'Deal Live');
      queryCache.invalidate('/deals');
      queryCache.invalidate('/notifications');

      setDealTitle('');
      setDealDiscount('25% OFF');
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
      // Instant optimistic UI removal
      setServices((prev) => prev.filter((s) => s.id !== id));
      try {
        await apiClient.delete(`/marketplace/digital-providers/${id}`);
        showSuccess(`Removed "${title}" from Digital Services directory`, 'Service Removed');
        queryCache.invalidate('/marketplace/digital-providers');
        queryCache.invalidate('/marketplace/digital-services');
      } catch (err) {
        showError('Failed to remove digital service from server', 'Error');
        await fetchServices();
      } finally {
        setDeletingId(null);
        setDeleteConfirmTarget(null);
      }
    } else {
      // Deal delete
      setSpecialistDeals((prev) => prev.filter((d) => d.id !== id));
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

  // Categories for Digital Services matching backend filters
  const digitalDomainCategories = [
    'Website Creation',
    'Poster & Social media Creatives',
    'Blog & Content writing',
    'Local & Targeted Ads',
    'website hosting & Support',
    'Ad campaingn setup & management',
    'Influencer collaboration',
    'local business promotion',
    'App Development',
    'Video Editing & Animation',
    'CA & Tax Consulting',
    'Others',
  ];

  // Filtered Services in Dashboard
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat =
        selectedCategoryFilter === 'All' ||
        s.serviceType.toLowerCase().includes(selectedCategoryFilter.toLowerCase());
      const q = searchFilter.toLowerCase().trim();
      const matchQ =
        !q ||
        s.serviceType.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
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
                Digital Specialist Hub
              </Text>
              <View
                style={{
                  backgroundColor: '#f5f3ff',
                  borderColor: '#ddd6fe',
                  borderWidth: 1,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#7c3aed' }}>
                  DIGITAL
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              Web, Design, Ads & Digital Directory Sync
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 12 }}>
            Loading Digital Specialist Console...
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
          {/* SPECIALIST PROFILE CARD */}
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
                    {specialistName}
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#f5f3ff',
                      paddingHorizontal: 8,
                      paddingVertical: 2.5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#ddd6fe',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#7c3aed' }}>
                      {primaryDomain}
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
                  setEditName(specialistName);
                  setEditDomain(primaryDomain);
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
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>Digital Services</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>
                  {services.length} Listed
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ede9fe' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>Directory Sync</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#6d28d9', marginTop: 3 }}>
                  Live in Digital
                </Text>
              </View>
            </View>

            {/* Availability Toggle */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isAvailable ? '#f5f3ff' : '#f8fafc',
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: isAvailable ? '#ddd6fe' : '#e2e8f0',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: isAvailable ? '#7c3aed' : '#94a3b8',
                  }}
                />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                    {isAvailable ? 'Open for Client Projects & Leads' : 'Currently Fully Booked'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748b' }}>
                    {isAvailable ? 'Businesses can hire you in Digital Services' : 'Marked temporarily unavailable'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isAvailable}
                onValueChange={(val) => {
                  setIsAvailable(val);
                  showSuccess(val ? 'Open for Client Projects!' : 'Set to Fully Booked', 'Availability');
                }}
                trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
                thumbColor={isAvailable ? '#7c3aed' : '#94a3b8'}
              />
            </View>
          </View>

          {/* QUICK ACTION: DIRECTORY LINK */}
        

          {/* SECTION 1: DIGITAL SERVICES CATALOG MANAGEMENT */}
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
                    backgroundColor: '#f5f3ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Laptop size={19} color="#7c3aed" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}
                    numberOfLines={1}
                  >
                    Digital Offerings
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View
                      style={{
                        backgroundColor: '#ede9fe',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#6d28d9' }}>
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
                  backgroundColor: '#7c3aed',
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  shadowColor: '#7c3aed',
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
                <ActivityIndicator size="small" color="#7c3aed" />
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                  Loading your digital offerings...
                </Text>
              </View>
            ) : services.length === 0 ? (
              <View
                style={{
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f3ff',
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: '#ddd6fe',
                  borderStyle: 'dashed',
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#ede9fe',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Sparkles size={24} color="#7c3aed" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                  No Digital Services Listed Yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#6d28d9',
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: 16,
                    lineHeight: 18,
                    paddingHorizontal: 10,
                  }}
                >
                  Add your first digital solution (e.g. Website Creation, Poster Design, Google & Meta Ads, Content Writing) so businesses can discover and contact you.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAddServiceModalOpen(true)}
                  style={{
                    backgroundColor: '#7c3aed',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#7c3aed',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 2,
                    gap: 6,
                  }}
                >
                  <Plus size={16} color="#ffffff" strokeWidth={3} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    Add Your First Digital Service
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {services.map((svc) => {
                  const coverUrl = getDigitalServiceCoverImage(svc);
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
                            title: svc.name,
                            subtitle: `${svc.serviceType} • ${svc.location}`,
                            badge: svc.serviceType,
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
                        <Image
                          source={{ uri: coverUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode="cover"
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
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              backgroundColor: '#f5f3ff',
                              borderColor: '#ddd6fe',
                              borderWidth: 1,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 8,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#7c3aed' }}>
                              {svc.serviceType}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '900', color: '#7c3aed' }}>
                            {svc.priceLabel}
                          </Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          disabled={deletingId === svc.id}
                          onPress={() =>
                            setDeleteConfirmTarget({
                              id: svc.id,
                              title: `${svc.serviceType} (${svc.name})`,
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

                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4, lineHeight: 19 }}>
                        {svc.serviceType}
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
                          <Phone size={11} color="#7c3aed" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>
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
                    Deals & Packages
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
                        {specialistDeals.length} ACTIVE
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
                  Loading digital offers...
                </Text>
              </View>
            ) : specialistDeals.length === 0 ? (
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
                  No Active Digital Packages Yet
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
                  Publish introductory packages (e.g. 25% OFF Website Setup, FLAT ₹500 OFF Branding) to feature in Deals & Offers and send instant push alerts.
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
                {specialistDeals.map((deal) => (
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

      {/* MODAL 1: ADD DIGITAL SERVICE */}
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
                    Add Digital Service Offering
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Will be displayed immediately in the Digital Services section
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
                {/* Title / Offering */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Offering Name / Scope *
                  </Text>
                  <TextInput
                    value={serviceTitle}
                    onChangeText={setServiceTitle}
                    placeholder="e.g. Modern Business Website & Online Store"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* Domain Picker */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Digital Category / Domain *
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 8 }}>
                    {digitalDomainCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setServiceDomain(cat)}
                        style={{
                          backgroundColor: serviceDomain === cat ? '#7c3aed' : '#f5f3ff',
                          borderColor: serviceDomain === cat ? '#7c3aed' : '#ddd6fe',
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: serviceDomain === cat ? '#ffffff' : '#6d28d9' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    value={serviceDomain}
                    onChangeText={setServiceDomain}
                    placeholder="Or type custom digital domain"
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
                    placeholder="e.g. ₹2,999 onwards / ₹499 per post"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '700', color: '#7c3aed', marginBottom: 6 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['₹499 onwards', '₹999 onwards', '₹1,999 onwards', '₹2,999 onwards', '₹4,999 onwards', '₹199 / creative', 'Custom Quote'].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => setServicePriceLabel(preset)}
                        style={{
                          backgroundColor: servicePriceLabel === preset ? '#7c3aed' : '#f5f3ff',
                          borderColor: servicePriceLabel === preset ? '#7c3aed' : '#ddd6fe',
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: servicePriceLabel === preset ? '#ffffff' : '#6d28d9' }}>
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
                    keyboardType="phone-pad"
                    placeholder="Phone number for client inquiries"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* Delivery Location / Mode */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Delivery Mode / Location
                  </Text>
                  <TextInput
                    value={serviceLocation}
                    onChangeText={setServiceLocation}
                    placeholder="Online & Haveri Region"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* Badge Tag */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Trust Badge
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Verified', 'Top Rated', 'Fast 24h Delivery', 'Featured Specialist', 'High ROI'].map((b) => (
                      <TouchableOpacity
                        key={b}
                        onPress={() => setServiceBadge(b)}
                        style={{
                          backgroundColor: serviceBadge === b ? '#7c3aed' : '#f5f3ff',
                          borderColor: serviceBadge === b ? '#7c3aed' : '#ddd6fe',
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: serviceBadge === b ? '#ffffff' : '#6d28d9' }}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Description */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Service Scope & Deliverables (Optional)
                  </Text>
                  <TextInput
                    value={serviceDescription}
                    onChangeText={setServiceDescription}
                    multiline
                    numberOfLines={3}
                    placeholder="Describe technologies, revisions, deliverables..."
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, minHeight: 70 }}
                  />
                </View>

                {/* Portfolio / Banner Photo - Camera & Gallery */}
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                      Portfolio / Banner Photo (Optional)
                    </Text>
                    <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '800' }}>
                      Auto Demo If Blank
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
                      💡 If you don't choose a photo, a verified professional {serviceDomain} cover photo is automatically used as the demo image.
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
                  {addingService ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                      Publish to Digital Services
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL 2: ADD DIGITAL DEAL */}
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
                    Publish Digital Package Deal
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
                    placeholder="e.g. Flat 25% Off on Business Website & Hosting Package"
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
                    placeholder="e.g. 25% OFF, FLAT ₹500 OFF"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '700', color: '#d97706', marginBottom: 6 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['20% OFF', '25% OFF', '30% OFF', '40% OFF', '50% OFF', 'FLAT ₹500 OFF'].map((preset) => (
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
                    placeholder="Valid this month / Limited slots"
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
                  Edit Digital Specialist Profile
                </Text>
                <TouchableOpacity onPress={() => setEditProfileModal(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Specialist / Agency Name *
                  </Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="e.g. PixelCraft Digital Studio"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Primary Domain
                  </Text>
                  <TextInput
                    value={editDomain}
                    onChangeText={setEditDomain}
                    placeholder="e.g. Website Creation, Graphic Design"
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
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                      Delivery Location / Base Town
                    </Text>
                    <TouchableOpacity
                      disabled={fetchingGps}
                      onPress={handleAutoGps}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Crosshair size={13} color="#7c3aed" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>
                        {fetchingGps ? 'Detecting...' : 'Detect GPS'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="Haveri Region & Online"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSaveProfile}
                  style={{ backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
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
              {deleteConfirmTarget?.type === 'service' ? 'Delete Digital Offering?' : 'Delete Deal & Offer?'}
            </Text>

            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
              {deleteConfirmTarget?.type === 'service'
                ? `Are you sure you want to delete "${deleteConfirmTarget?.title}"? It will be removed immediately from the Digital Services section.`
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
    </View>
  );
}
