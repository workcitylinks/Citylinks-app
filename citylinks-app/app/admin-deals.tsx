import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  TrendingUp,
  Tag,
  Percent,
  Plus,
  Trash2,
  Search,
  X,
  RefreshCw,
  Bell,
  Clock,
  Store,
  Sparkles,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  Megaphone,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { DealItem } from '../queries/marketplaceQueries';
import { queryCache } from '../utils/queryCache';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { compressBanner } from '../utils/imageCompressor';
import { LazyImage } from '../components/ui/LazyImage';
import { uploadImageToCloudflare } from '../services/imageUpload';

export default function AdminDealsScreen() {
  const { showSuccess, showError } = useToast();

  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add Deal Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealDiscount, setDealDiscount] = useState('30% OFF');
  const [dealMerchant, setDealMerchant] = useState('CityLinks Special');
  const [dealCategory, setDealCategory] = useState('Shopping');
  const [dealValidUntil, setDealValidUntil] = useState('Limited time offer');
  const [dealLinkUrl, setDealLinkUrl] = useState('/deals');
  const [dealImage, setDealImage] = useState<string | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    title: string;
    discount?: string;
    merchantName?: string;
  } | null>(null);

  const fetchDeals = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await apiClient.get('/deals', { params: { all: 'true' } });
      if (Array.isArray(res.data)) {
        setDeals(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching admin deals:', err);
      showError('Failed to load deals', 'Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchDeals(true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeals(true);
  };

  // Image Pickers
  const handleTakeDealPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a deal photo.', 'Permission Needed');
        return;
      }
      setPickingImage(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressBanner(result.assets[0].uri);
        setDealImage(compressed);
        showSuccess('Deal photo captured & compressed!', 'Success');
      }
    } catch (err: any) {
      showError('Failed to capture photo from camera.', 'Camera Error');
    } finally {
      setPickingImage(false);
    }
  };

  const handlePickDealFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to select a photo.', 'Permission Needed');
        return;
      }
      setPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressBanner(result.assets[0].uri);
        setDealImage(compressed);
        showSuccess('Deal image selected & compressed!', 'Success');
      }
    } catch (err: any) {
      showError('Failed to select image from gallery.', 'Gallery Error');
    } finally {
      setPickingImage(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!dealTitle.trim()) {
      showError('Deal headline / title is required', 'Missing Field');
      return;
    }
    if (!dealDiscount.trim()) {
      showError('Discount offer badge is required (e.g. 25% OFF)', 'Missing Field');
      return;
    }
    if (!dealMerchant.trim()) {
      showError('Merchant / Store name is required', 'Missing Field');
      return;
    }
    if (!dealImage) {
      showError('Deal banner photo is compulsory. Please take or select a photo.', 'Photo Compulsory');
      return;
    }

    try {
      setSubmitting(true);
      const cloudflareUrl = await uploadImageToCloudflare(dealImage);
      await apiClient.post('/deals', {
        title: dealTitle.trim(),
        discount: dealDiscount.trim(),
        category: dealCategory.trim() || 'Shopping',
        merchantName: dealMerchant.trim(),
        validUntil: dealValidUntil.trim() || 'Limited time offer',
        linkUrl: dealLinkUrl.trim() || '/deals',
        imageUrl: cloudflareUrl,
        broadcastNotification: true,
      });

      showSuccess(
        `Deal published! Broadcast notification sent to all app users.`,
        'Deal Live & Notified'
      );

      queryCache.invalidate('/deals');
      queryCache.invalidate('/notifications');

      // Reset
      setDealTitle('');
      setDealDiscount('30% OFF');
      setDealMerchant('CityLinks Special');
      setDealCategory('Shopping');
      setDealValidUntil('Limited time offer');
      setDealLinkUrl('/deals');
      setDealImage(null);
      setAddModalOpen(false);

      await fetchDeals(true);
    } catch (err: any) {
      console.error('Error creating deal from admin:', err);
      showError(err.response?.data?.error || 'Failed to create deal', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeal = (deal: DealItem) => {
    setDeleteConfirmTarget({
      id: deal.id,
      title: deal.title,
      discount: deal.discount,
      merchantName: deal.merchantName,
    });
  };

  const confirmDeleteDeal = async () => {
    if (!deleteConfirmTarget) return;
    const { id, title } = deleteConfirmTarget;

    // 1. Instant optimistic removal from UI and all listings
    setDeals((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(id);
    try {
      await apiClient.delete(`/deals/${id}`);
      showSuccess(`Removed "${title}" from all listings & user notifications`, 'Deal Deleted');
      queryCache.invalidate('/deals');
      queryCache.invalidate('/notifications');
    } catch (err: any) {
      console.error('Error deleting deal:', err);
      showError('Failed to delete deal from server', 'Error');
      await fetchDeals(true);
    } finally {
      setDeletingId(null);
      setDeleteConfirmTarget(null);
    }
  };

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesCat =
        selectedCategory === 'All' ||
        deal.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesQ =
        !q ||
        deal.title.toLowerCase().includes(q) ||
        deal.merchantName.toLowerCase().includes(q) ||
        deal.discount.toLowerCase().includes(q) ||
        deal.category.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [deals, selectedCategory, searchQuery]);

  const categoriesList = ['All', 'Shopping', 'Services', 'Food', 'Electronics', 'Salon', 'Transport'];

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
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="#1e293b" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                Deals & Offers Manager
              </Text>
              <View
                style={{
                  backgroundColor: '#fef3c7',
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#d97706' }}>
                  ADMIN
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#64748b' }}>
              Publish platform deals & broadcast alerts
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={17} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 14,
              paddingHorizontal: 12,
              height: 42,
            }}
          >
            <Search size={16} color="#94a3b8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search deals, merchants, discount tags..."
              placeholderTextColor="#94a3b8"
              style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#0f172a' }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}
        >
          {categoriesList.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={{
                backgroundColor: selectedCategory === cat ? '#d97706' : '#ffffff',
                borderColor: selectedCategory === cat ? '#d97706' : '#e2e8f0',
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: selectedCategory === cat ? '#ffffff' : '#64748b',
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Main Body */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Banner with Add Deal CTA */}
        <View
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1.5,
            borderColor: '#fde68a',
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Megaphone size={18} color="#d97706" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#92400e' }}>
                Citizen Promotions
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: '#b45309', lineHeight: 16 }}>
              Any deal published here is instantly shown to all users in the Deals & Offers tab and sent as an alert notification.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setAddModalOpen(true)}
            style={{
              backgroundColor: '#d97706',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#d97706',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Plus size={16} color="#ffffff" strokeWidth={3} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff', marginLeft: 4 }}>
              Add Deal
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overview Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              Active Deals
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>
              {deals.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              Filtered
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#d97706', marginTop: 2 }}>
              {filteredDeals.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 12,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              Broadcast
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#16a34a', marginTop: 2 }}>
              All Users
            </Text>
          </View>
        </View>

        {/* Deals Listing */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#d97706" />
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Loading platform deals...</Text>
          </View>
        ) : filteredDeals.length === 0 ? (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 30,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Tag size={28} color="#d97706" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
              No Deals Found
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search query or category filter.'
                : 'Click "Add Deal" above to publish your first platform deal & offer.'}
            </Text>
            <TouchableOpacity
              onPress={() => setAddModalOpen(true)}
              style={{
                backgroundColor: '#d97706',
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Plus size={16} color="#ffffff" strokeWidth={3} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff', marginLeft: 6 }}>
                Create Deal & Broadcast
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredDeals.map((deal) => (
              <View
                key={deal.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {/* Header row */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        backgroundColor: '#fef3c7',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Tag size={12} color="#d97706" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#d97706' }}>
                        {deal.discount}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#f1f5f9',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>
                        {deal.category}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={deletingId === deal.id}
                    onPress={() => handleDeleteDeal(deal)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: '#fee2e2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {deletingId === deal.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Trash2 size={15} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Optional Deal Cover Photo */}
                {Boolean(deal.imageUrl) && (
                  <View
                    style={{
                      width: '100%',
                      height: 120,
                      borderRadius: 14,
                      overflow: 'hidden',
                      marginBottom: 10,
                      backgroundColor: '#f1f5f9',
                    }}
                  >
                    <LazyImage
                      source={{ uri: deal.imageUrl! }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      loaderColor="#2563eb"
                    />
                  </View>
                )}

                {/* Deal Title */}
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>
                  {deal.title}
                </Text>

                {/* Merchant Name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Store size={13} color="#64748b" />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>
                    {deal.merchantName}
                  </Text>
                </View>

                {/* Footer details */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: '#f1f5f9',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} color="#94a3b8" />
                    <Text style={{ fontSize: 11, color: '#64748b' }}>
                      {deal.validUntil || 'Active Offer'}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#ecfdf5',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <Bell size={10} color="#059669" />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                      Notification Broadcasted
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL: SUPER ADMIN CREATE DEAL */}
      <Modal visible={addModalOpen} transparent animationType="slide">
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                      Add Deal & Offer
                    </Text>
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#d97706' }}>BROADCAST</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                    Creates deal in directory and sends push alert to all users
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddModalOpen(false)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* 1. Title */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Deal Title / Headline *
                  </Text>
                  <TextInput
                    value={dealTitle}
                    onChangeText={setDealTitle}
                    placeholder="e.g. 50% Off First Home Deep Cleaning Service"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 2. Merchant Name */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Merchant / Store / Provider Name *
                  </Text>
                  <TextInput
                    value={dealMerchant}
                    onChangeText={setDealMerchant}
                    placeholder="e.g. Renuka Appliances, CityLinks Special"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 3. Discount Badge */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Discount Badge *
                  </Text>
                  <TextInput
                    value={dealDiscount}
                    onChangeText={setDealDiscount}
                    placeholder="e.g. 30% OFF, BOGO FREE, FLAT ₹50 OFF"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '700', color: '#d97706', marginBottom: 6 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['10% OFF', '20% OFF', '25% OFF', '30% OFF', '40% OFF', '50% OFF', 'BUY 1 GET 1', 'FLAT ₹50 OFF'].map((preset) => (
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

                {/* 4. Category */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Category
                  </Text>
                  <TextInput
                    value={dealCategory}
                    onChangeText={setDealCategory}
                    placeholder="e.g. Shopping, Services, Electronics"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600', marginBottom: 6 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Shopping', 'Services', 'Electronics', 'Food', 'Salon', 'Transport'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setDealCategory(cat)}
                        style={{
                          backgroundColor: dealCategory === cat ? '#7c3aed' : '#faf5ff',
                          borderColor: dealCategory === cat ? '#7c3aed' : '#e9d5ff',
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: dealCategory === cat ? '#ffffff' : '#6b21a8' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 5. Validity */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Validity Period
                  </Text>
                  <TextInput
                    value={dealValidUntil}
                    onChangeText={setDealValidUntil}
                    placeholder="e.g. Valid till Sunday / Limited time offer"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600', marginBottom: 6 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Today Only', 'This Weekend', 'Valid till Sunday', 'Valid till month end', 'Limited time offer'].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => setDealValidUntil(preset)}
                        style={{
                          backgroundColor: dealValidUntil === preset ? '#0284c7' : '#f0f9ff',
                          borderColor: dealValidUntil === preset ? '#0284c7' : '#bae6fd',
                          borderWidth: 1,
                          paddingHorizontal: 9,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: dealValidUntil === preset ? '#ffffff' : '#0369a1' }}>
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 6. Destination Route / Link */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Destination Link (App Route)
                  </Text>
                  <TextInput
                    value={dealLinkUrl}
                    onChangeText={setDealLinkUrl}
                    placeholder="/deals, /shops, /services"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
                  />
                </View>

                {/* 7. Image */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    Deal Photo <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  {dealImage && (
                    <View style={{ height: 130, borderRadius: 12, overflow: 'hidden', marginBottom: 8, position: 'relative' }}>
                      <Image source={{ uri: dealImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setDealImage(null)}
                        style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 15 }}
                      >
                        <X size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      disabled={pickingImage}
                      onPress={handleTakeDealPhoto}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', gap: 6 }}
                    >
                      <Camera size={16} color="#d97706" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#d97706' }}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={pickingImage}
                      onPress={handlePickDealFromGallery}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', gap: 6 }}
                    >
                      <ImageIcon size={16} color="#2563eb" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 8. Notification Preview */}
                <View style={{ backgroundColor: '#fffbeb', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#fde68a', marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Bell size={14} color="#d97706" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400e', textTransform: 'uppercase' }}>
                      Notification Preview
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#78350f' }}>
                    🎉 {dealDiscount.trim()} at {dealMerchant.trim()}!
                  </Text>
                  <Text style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                    {dealTitle.trim() || 'Special promotional deal'}! Valid: {dealValidUntil || 'Limited time'}. Check Deals & Offers in CityLinks!
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={submitting}
                  onPress={handleCreateDeal}
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
                  {submitting ? (
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

            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 6 }}>
              Delete Deal & Offer?
            </Text>

            {/* Subtitle */}
            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
              Are you sure you want to delete this offer? It will be removed immediately from all listings in the Deals & Offers section and citizen notifications.
            </Text>

            {/* Deal Preview Info Box */}
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
                {deleteConfirmTarget?.merchantName && (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#92400e' }}>
                    · {deleteConfirmTarget.merchantName}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#78350f' }} numberOfLines={2}>
                {deleteConfirmTarget?.title}
              </Text>
            </View>

            {/* Action Buttons */}
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
                onPress={confirmDeleteDeal}
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
    </View>
  );
}
