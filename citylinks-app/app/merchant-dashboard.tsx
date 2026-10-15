import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  Edit3,
  Check,
  X,
  Package,
  Plus,
  Trash2,
  Sparkles,
  Navigation,
  Crosshair,
  Layers,
  CheckCircle,
  Camera,
  Image as ImageIcon,
  Tag,
  Percent,
  TrendingUp,
  Bell,
  Clock,
  ArrowRight,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../api/apiClient';
import { ShopItem, ProductItem, DealItem } from '../queries/marketplaceQueries';
import { getShopCoverImage, getProductCoverImage } from './shop-detail';
import { queryCache } from '../utils/queryCache';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { compressBanner, compressProductImage } from '../utils/imageCompressor';
import { LazyImage } from '../components/ui/LazyImage';
import { uploadImageToCloudflare } from '../services/imageUpload';

export default function MerchantDashboardScreen() {
  const { userData } = useApp();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<ShopItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Edit Storefront Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [editLocation, setEditLocation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [savingShop, setSavingShop] = useState(false);

  // Add Product Modal
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodUnit, setProdUnit] = useState('piece');
  const [prodStock, setProdStock] = useState('100');
  const [prodImage, setProdImage] = useState<string | null>(null);
  const [pickingProdImage, setPickingProdImage] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  // Deals & Offers State
  const [merchantDeals, setMerchantDeals] = useState<DealItem[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [addDealModalOpen, setAddDealModalOpen] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealDiscount, setDealDiscount] = useState('20% OFF');
  const [dealCategory, setDealCategory] = useState('');
  const [dealValidUntil, setDealValidUntil] = useState('Valid till Sunday');
  const [dealImage, setDealImage] = useState<string | null>(null);
  const [pickingDealImage, setPickingDealImage] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    title: string;
    discount?: string;
    merchantName?: string;
    type?: 'deal' | 'product';
  } | null>(null);

  // Take photo with camera for deal
  const handleTakeDealPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a deal photo.', 'Permission Needed');
        return;
      }
      setPickingDealImage(true);
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
      console.error('Camera error:', err);
      showError('Failed to capture photo from camera.', 'Camera Error');
    } finally {
      setPickingDealImage(false);
    }
  };

  // Pick photo from gallery for deal
  const handlePickDealFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to choose a deal photo.', 'Permission Needed');
        return;
      }
      setPickingDealImage(true);
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
      console.error('Gallery error:', err);
      showError('Failed to select image from gallery.', 'Gallery Error');
    } finally {
      setPickingDealImage(false);
    }
  };

  // Take photo with camera for product
  const handleTakeProductPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError('Camera access is required to take a product photo.', 'Permission Needed');
        return;
      }
      setPickingProdImage(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressProductImage(result.assets[0].uri);
        setProdImage(compressed);
        showSuccess('Product photo captured & compressed!', 'Success');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      showError('Failed to capture photo from camera.', 'Camera Error');
    } finally {
      setPickingProdImage(false);
    }
  };

  // Pick photo from gallery for product
  const handlePickProductFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError('Gallery access is required to choose a product photo.', 'Permission Needed');
        return;
      }
      setPickingProdImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const compressed = await compressProductImage(result.assets[0].uri);
        setProdImage(compressed);
        showSuccess('Product image selected & compressed!', 'Success');
      }
    } catch (err: any) {
      console.error('Gallery error:', err);
      showError('Failed to select image from gallery.', 'Gallery Error');
    } finally {
      setPickingProdImage(false);
    }
  };

  const fetchMyShop = async () => {
    try {
      setLoading(true);
      const [shopRes, catRes] = await Promise.allSettled([
        apiClient.get('/shops/my-shop'),
        apiClient.get('/shops/categories'),
      ]);

      if (catRes.status === 'fulfilled' && catRes.value.data && Array.isArray(catRes.value.data)) {
        setCategories(catRes.value.data.filter((c: string) => c !== 'All'));
      }

      if (shopRes.status === 'fulfilled' && shopRes.value.data?.shop) {
        const s = shopRes.value.data.shop;
        setShop(s);
        setProducts(s.products || []);
        setEditName(s.name || '');
        setEditCategory(s.category || 'Retail');
        setEditLocation(s.location || '');
        setEditAddress(s.address || s.location || '');
        setEditPhone(s.phone || '');
        setEditEmail(s.email || '');
        fetchDeals(s.name);
      } else if (userData) {
        // Fallback default storefront based on user profile if initializing
        const defaultName = userData.fullName ? `${userData.fullName}'s Store` : 'My Store';
        setShop({
          id: 'temp-shop',
          name: defaultName,
          category: 'Retail',
          location: userData.address || 'Haveri, Karnataka',
          address: userData.address || 'Haveri, Karnataka',
          phone: userData.phone || '',
          email: userData.email || '',
          status: 'ACTIVE',
          products: [],
        });
        setEditName(defaultName);
        setEditCategory('Retail');
        setEditLocation(userData.address || 'Haveri, Karnataka');
        setEditAddress(userData.address || 'Haveri, Karnataka');
        setEditPhone(userData.phone || '');
        setEditEmail(userData.email || '');
        fetchDeals(defaultName);
      }
    } catch (err: any) {
      console.warn('Notice: storefront initializing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyShop();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMyShop();
    }, [])
  );

  // Auto GPS Location Fetcher
  const handleAutoFetchLocation = async () => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError('Location permission is required to detect your GPS position.', 'Permission Denied');
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

        setEditLocation(locality);
        setEditAddress(fullAddr || `${locality}, Haveri, Karnataka`);
        showSuccess(`Auto-detected: ${locality}`, 'GPS Located');
      } else {
        const fallback = `Haveri (Lat: ${currentLocation.coords.latitude.toFixed(4)}, Lon: ${currentLocation.coords.longitude.toFixed(4)})`;
        setEditLocation('Haveri');
        setEditAddress(fallback);
        showSuccess('Coordinates recorded', 'GPS Located');
      }
    } catch (err: any) {
      console.error('Location error:', err);
      showError('Could not fetch GPS location. Please type manually.', 'GPS Error');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSaveStorefront = async () => {
    if (!editName.trim()) {
      showError('Shop name is required', 'Missing Field');
      return;
    }

    const finalCat = isOtherCategory
      ? customCategory.trim()
      : editCategory.trim();

    if (!finalCat) {
      showError('Please select or specify a category for your shop', 'Missing Category');
      return;
    }

    try {
      setSavingShop(true);
      const res = await apiClient.put('/shops/my-shop', {
        id: shop?.id,
        name: editName.trim(),
        category: finalCat,
        location: editLocation.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
      });

      showSuccess('Storefront updated successfully! Category synchronized across all filters.', 'Updated');
      setEditModalOpen(false);
      await fetchMyShop();
    } catch (err: any) {
      console.error('Save shop error:', err);
      showError(err.response?.data?.error || 'Failed to update shop', 'Error');
    } finally {
      setSavingShop(false);
    }
  };

  const handleAddProduct = async () => {
    if (!prodName.trim()) {
      showError('Product name is required', 'Missing Field');
      return;
    }
    const priceNum = parseFloat(prodPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showError('Please enter a valid price', 'Invalid Price');
      return;
    }
    if (!prodImage) {
      showError('Product photo is compulsory. Please capture or select an image.', 'Photo Compulsory');
      return;
    }

    try {
      setAddingProduct(true);
      const cloudflareUrl = await uploadImageToCloudflare(prodImage);
      const targetId = shop?.id && shop.id !== 'temp-shop' ? shop.id : 'my-shop';
      await apiClient.post(`/shops/${targetId}/products`, {
        name: prodName.trim(),
        price: priceNum,
        unit: prodUnit.trim() || 'piece',
        stock: parseInt(prodStock) || 100,
        imageUrl: cloudflareUrl,
      });

      showSuccess(`Added "${prodName}" to your storefront!`, 'Product Added');
      setProdName('');
      setProdPrice('');
      setProdImage(null);
      setAddProductModalOpen(false);
      await fetchMyShop();
    } catch (err: any) {
      console.error('Add product error:', err);
      showError(err.response?.data?.error || 'Failed to add product', 'Error');
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    setDeleteConfirmTarget({
      id: productId,
      title: productName,
      type: 'product',
    });
  };

  const fetchDeals = async (merchantName?: string) => {
    try {
      setLoadingDeals(true);
      const targetName = merchantName || shop?.name;
      const res = await apiClient.get('/deals', {
        params: targetName ? { merchantName: targetName } : undefined,
      });
      if (Array.isArray(res.data)) {
        if (targetName) {
          setMerchantDeals(
            res.data.filter(
              (d: any) => d.merchantName?.toLowerCase() === targetName.toLowerCase()
            )
          );
        } else {
          setMerchantDeals(res.data);
        }
      }
    } catch (err) {
      console.warn('Could not fetch merchant deals:', err);
    } finally {
      setLoadingDeals(false);
    }
  };

  const handleAddDeal = async () => {
    if (!dealTitle.trim()) {
      showError('Deal title / headline is required', 'Missing Title');
      return;
    }
    if (!dealDiscount.trim()) {
      showError('Discount offer badge is required (e.g. 20% OFF)', 'Missing Discount');
      return;
    }
    if (!dealImage) {
      showError('Deal banner photo is compulsory. Please capture or select an image.', 'Photo Compulsory');
      return;
    }

    const shopName = shop?.name || `${userData?.fullName || 'My'} Store`;
    const cat = dealCategory.trim() || shop?.category || 'Shopping';
    const linkUrl = shop?.id && shop.id !== 'temp-shop' ? `/shop-detail?id=${shop.id}` : '/deals';

    try {
      setAddingDeal(true);
      const cloudflareUrl = await uploadImageToCloudflare(dealImage);
      await apiClient.post('/deals', {
        title: dealTitle.trim(),
        discount: dealDiscount.trim(),
        category: cat,
        merchantName: shopName,
        validUntil: dealValidUntil.trim() || 'Limited time offer',
        linkUrl,
        imageUrl: cloudflareUrl,
        broadcastNotification: true,
      });

      showSuccess(
        `Published "${dealTitle.trim()}"! Broadcast notification sent to all users.`,
        'Deal Live & Notified'
      );

      // Invalidate caches
      queryCache.invalidate('/deals');
      queryCache.invalidate('/notifications');

      // Reset modal
      setDealTitle('');
      setDealDiscount('20% OFF');
      setDealValidUntil('Valid till Sunday');
      setDealImage(null);
      setAddDealModalOpen(false);

      await fetchDeals(shopName);
    } catch (err: any) {
      console.error('Add deal error:', err);
      showError(err.response?.data?.error || 'Failed to publish deal & offer', 'Error');
    } finally {
      setAddingDeal(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    queryCache.invalidate('/shops/my-shop');
    queryCache.invalidate('/deals');
    queryCache.invalidate('/notifications');
    try {
      await Promise.allSettled([
        fetchMyShop(),
        fetchDeals(shop?.name),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDeleteTarget = async () => {
    if (!deleteConfirmTarget) return;
    const { id, title, type = 'deal' } = deleteConfirmTarget;

    if (type === 'deal') {
      // 1. Instant optimistic removal from UI and all listings
      setMerchantDeals((prev) => prev.filter((d) => d.id !== id));
      setDeletingDealId(id);
      try {
        await apiClient.delete(`/deals/${id}`);
        showSuccess(`Removed "${title}" from all listings & user notifications`, 'Deal Deleted');
        queryCache.invalidate('/deals');
        queryCache.invalidate('/notifications');
      } catch (err: any) {
        console.error('Delete deal error:', err);
        showError('Failed to remove deal from server', 'Error');
        await fetchDeals(shop?.name);
      } finally {
        setDeletingDealId(null);
        setDeleteConfirmTarget(null);
      }
    } else {
      // Product delete
      setProducts((prev) => prev.filter((p) => p.id !== id));
      try {
        const targetId = shop?.id && shop.id !== 'temp-shop' ? shop.id : 'my-shop';
        await apiClient.delete(`/shops/${targetId}/products/${id}`);
        showSuccess(`Removed "${title}" from catalog`, 'Product Removed');
        queryCache.invalidate('/shops/my-shop');
      } catch (err: any) {
        console.error('Delete product error:', err);
        showError('Failed to delete product', 'Error');
        await fetchMyShop();
      } finally {
        setDeleteConfirmTarget(null);
      }
    }
  };

  const handleDeleteDeal = (dealId: string, dealName: string, dealDiscountStr?: string) => {
    setDeleteConfirmTarget({
      id: dealId,
      title: dealName,
      discount: dealDiscountStr,
      merchantName: shop?.name,
      type: 'deal',
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
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
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
              Shop Keeper Hub
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              Storefront, Products & Directory Sync
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 12 }}>
            Loading Storefront Console...
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
          {/* STOREFRONT PREVIEW CARD (Matching Near By Shops Display) */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1.5,
              borderColor: '#fed7aa',
              shadowColor: '#ea580c',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 3,
              marginBottom: 20,
            }}
          >
            {/* Top Row: Shop Name, Category Badge, Status Pill */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: '#0f172a' }}>
                    {shop?.name || 'My Storefront'}
                  </Text>
                </View>
                {/* Category Pill Tag */}
                <View
                  style={{
                    backgroundColor: '#fff7ed',
                    borderWidth: 1,
                    borderColor: '#fed7aa',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#ea580c' }}>
                    {shop?.category || 'Retail'}
                  </Text>
                </View>
              </View>

              {/* Status Badge */}
              <View
                style={{
                  backgroundColor: '#eff6ff',
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 14,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563eb' }}>
                  {shop?.status || 'Approved'}
                </Text>
              </View>
            </View>

            {/* Storefront Photo */}
            <View
              style={{
                height: 140,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                marginBottom: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}
            >
              <Image
                source={{ uri: getShopCoverImage(shop) }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>

            {/* Location & Address */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MapPin size={15} color="#ea580c" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155', marginLeft: 6 }} numberOfLines={1}>
                {shop?.location || 'Haveri, Karnataka'}
              </Text>
            </View>

            {shop?.address && (
              <View style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b' }}>
                  {shop.address}
                </Text>
              </View>
            )}

            {/* Phone */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Phone size={14} color="#64748b" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginLeft: 6 }}>
                Phone: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{shop?.phone || 'Not Provided'}</Text>
              </Text>
            </View>

            {/* Email */}
            {shop?.email && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Mail size={14} color="#64748b" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginLeft: 6 }}>
                  Email: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{shop.email}</Text>
                </Text>
              </View>
            )}

            {/* Action Button: Edit Storefront */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setEditName(shop?.name || '');
                setEditCategory(shop?.category || 'Retail');
                setIsOtherCategory(false);
                setCustomCategory('');
                setEditLocation(shop?.location || '');
                setEditAddress(shop?.address || '');
                setEditPhone(shop?.phone || '');
                setEditEmail(shop?.email || '');
                setEditModalOpen(true);
              }}
              style={{
                backgroundColor: '#ea580c',
                paddingVertical: 13,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                width: '100%',
                marginBottom: 10,
              }}
            >
              <Edit3 size={15} color="#ffffff" strokeWidth={2.5} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff', marginLeft: 6 }}>
                Edit Storefront Details
              </Text>
            </TouchableOpacity>

            {/* View Shop Orders Button */}
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: '/received-orders',
                  params: {
                    shopId: shop?.id,
                    shopName: shop?.name || 'My Store',
                  },
                } as any);
              }}
              activeOpacity={0.85}
              style={{
                backgroundColor: '#eff6ff',
                borderWidth: 1.5,
                borderColor: '#bfdbfe',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                width: '100%',
              }}
            >
              <Package size={15} color="#2563eb" strokeWidth={2.5} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#1d4ed8', marginLeft: 6 }}>
                View Customer Orders & Deliveries
              </Text>
            </TouchableOpacity>
          </View>

          {/* PRODUCT CATALOG MANAGEMENT SECTION */}
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
            {/* Header Row: Title on Left, Add Button on Right */}
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
                    backgroundColor: '#fff7ed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Package size={19} color="#ea580c" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}
                    numberOfLines={1}
                  >
                    Catalog Products
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View
                      style={{
                        backgroundColor: '#ffedd5',
                        paddingHorizontal: 6,
                        paddingVertical: 1.5,
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#ea580c' }}>
                        {products.length} ITEMS
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAddProductModalOpen(true)}
                style={{
                  backgroundColor: '#ea580c',
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  shadowColor: '#ea580c',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Plus size={14} color="#ffffff" strokeWidth={3} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                  Add Item
                </Text>
              </TouchableOpacity>
            </View>

            {products.length === 0 ? (
              <View
                style={{
                  paddingVertical: 24,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fff7ed',
                  borderRadius: 18,
                  borderWidth: 1.5,
                  borderColor: '#fed7aa',
                  borderStyle: 'dashed',
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#ffedd5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Package size={24} color="#ea580c" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                  No Products Listed Yet
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#9a3412',
                    textAlign: 'center',
                    marginTop: 4,
                    marginBottom: 16,
                    lineHeight: 18,
                    paddingHorizontal: 10,
                  }}
                >
                  Add your first retail item with price and stock so nearby Haveri customers can order from you.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setAddProductModalOpen(true)}
                  style={{
                    backgroundColor: '#ea580c',
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#ea580c',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 2,
                    gap: 6,
                  }}
                >
                  <Plus size={16} color="#ffffff" strokeWidth={3} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                    Add Your First Item
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {products.map((item) => {
                  const itemImageUri = getProductCoverImage(item, shop?.category);
                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                      }}
                    >
                      <LazyImage
                        source={{ uri: itemImageUri }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: '#e2e8f0',
                          marginRight: 12,
                        }}
                        contentFit="cover"
                        loaderColor="#2563eb"
                      />
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          Stock: {item.stock} {item.unit}s
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#ea580c' }}>
                          ₹{item.price}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleDeleteProduct(item.id, item.name)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: '#fee2e2',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* DEALS & OFFERS MANAGEMENT SECTION */}
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
            {/* Header Row: Title on Left, Add Button on Right */}
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
                    Deals & Offers
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
                        {merchantDeals.length} ACTIVE
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }} numberOfLines={1}>
                      • Broadcasted in Haveri
                    </Text>
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
                  shadowColor: '#d97706',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
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
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#d97706" />
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                  Loading deals & offers...
                </Text>
              </View>
            ) : merchantDeals.length === 0 ? (
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
                  No Active Deals or Offers Yet
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
                  Publish discount deals (e.g. 20% OFF, Buy 1 Get 1) to attract shoppers and broadcast instant push notifications across Haveri.
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
              <View>
                {/* Clean 1-Line Info Strip */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fffbeb',
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 7,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#fde68a',
                    gap: 6,
                  }}
                >
                  <Bell size={13} color="#d97706" />
                  <Text style={{ flex: 1, fontSize: 11, color: '#92400e', fontWeight: '600' }} numberOfLines={1}>
                    Active deals appear in Deals & Offers and alert Haveri shoppers
                  </Text>
                </View>

                {/* Deal Items */}
                <View style={{ gap: 10 }}>
                  {merchantDeals.map((deal) => (
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
                      {Boolean(deal.imageUrl) && (
                        <View
                          style={{
                            width: '100%',
                            height: 120,
                            borderRadius: 12,
                            overflow: 'hidden',
                            marginBottom: 10,
                            backgroundColor: '#e2e8f0',
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

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
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
                          <View
                            style={{
                              backgroundColor: '#e2e8f0',
                              paddingHorizontal: 7,
                              paddingVertical: 2,
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
                          disabled={deletingDealId === deal.id}
                          onPress={() => handleDeleteDeal(deal.id, deal.title, deal.discount)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor: '#fee2e2',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {deletingDealId === deal.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <Trash2 size={14} color="#ef4444" />
                          )}
                        </TouchableOpacity>
                      </View>

                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: '#0f172a',
                          marginBottom: 4,
                          lineHeight: 19,
                        }}
                      >
                        {deal.title}
                      </Text>

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 6,
                          borderTopWidth: 1,
                          borderTopColor: '#f1f5f9',
                          marginTop: 4,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} color="#64748b" />
                          <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500' }}>
                            {deal.validUntil || 'Active Offer'}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: '#ecfdf5',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Bell size={10} color="#059669" />
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669' }}>
                            Broadcast Active
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* MODAL: EDIT STOREFRONT WITH AUTO-LOCATION & CATEGORIES */}
      <Modal visible={editModalOpen} transparent animationType="slide">
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
                maxHeight: '90%',
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                    Edit Storefront Details
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b' }}>
                    Updates will sync across the Haveri Near By Shops directory
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditModalOpen(false)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* 1. Shop Name */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Shop / Business Name *
                  </Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="e.g. Renuka Appliances"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#0f172a',
                    }}
                  />
                </View>

                {/* 2. Category Selector (Existing List + Other Option) */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Shop Category *
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {categories.map((cat) => {
                      const isSel = !isOtherCategory && editCategory.toLowerCase() === cat.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={cat}
                          activeOpacity={0.7}
                          onPress={() => {
                            setIsOtherCategory(false);
                            setEditCategory(cat);
                          }}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: isSel ? '#ea580c' : '#f8fafc',
                            borderWidth: 1,
                            borderColor: isSel ? '#ea580c' : '#e2e8f0',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isSel ? '#ffffff' : '#334155' }}>
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
                        backgroundColor: isOtherCategory ? '#ea580c' : '#fff7ed',
                        borderWidth: 1,
                        borderColor: isOtherCategory ? '#ea580c' : '#fed7aa',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isOtherCategory ? '#ffffff' : '#ea580c' }}>
                        + Other Category
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Manual Category Entry (shown when Other is tapped) */}
                  {isOtherCategory && (
                    <View style={{ backgroundColor: '#fff7ed', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#fed7aa' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#c2410c', marginBottom: 6 }}>
                        Enter New Shop Category:
                      </Text>
                      <TextInput
                        value={customCategory}
                        onChangeText={setCustomCategory}
                        placeholder="e.g. Footwear, Bakery, Opticals, Stationery"
                        placeholderTextColor="#fb923c"
                        style={{
                          backgroundColor: '#ffffff',
                          borderWidth: 1,
                          borderColor: '#fdba74',
                          borderRadius: 10,
                          padding: 10,
                          fontSize: 13,
                          fontWeight: '700',
                          color: '#0f172a',
                        }}
                      />
                      <Text style={{ fontSize: 10, color: '#9a3412', marginTop: 4 }}>
                        * This category will be saved to the database and will appear everywhere in filters and UI.
                      </Text>
                    </View>
                  )}
                </View>

                {/* 3. Location & Address with Auto GPS Button */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                      Location & Full Address *
                    </Text>

                    {/* Auto Location Fetching Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={fetchingLocation}
                      onPress={handleAutoFetchLocation}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#eff6ff',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#bfdbfe',
                      }}
                    >
                      {fetchingLocation ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <>
                          <Crosshair size={13} color="#2563eb" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563eb', marginLeft: 4 }}>
                            Auto GPS Detect
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="Operating Area (e.g. Haveri Town)"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#0f172a',
                      marginBottom: 8,
                    }}
                  />

                  <TextInput
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder="Full Address / Landmark (e.g. 5th Cross, Behind LIC, Haveri - 581110)"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={2}
                    style={{
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 13,
                      fontWeight: '500',
                      color: '#0f172a',
                    }}
                  />
                </View>

                {/* 4. Phone Number */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Phone Number *
                  </Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="e.g. 09449084242"
                    keyboardType="phone-pad"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#0f172a',
                    }}
                  />
                </View>

                {/* 5. Email */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Email Address
                  </Text>
                  <TextInput
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="e.g. sachi.hvr@gmail.com"
                    keyboardType="email-address"
                    placeholderTextColor="#94a3b8"
                    style={{
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderRadius: 14,
                      padding: 12,
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#0f172a',
                    }}
                  />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={savingShop}
                  onPress={handleSaveStorefront}
                  style={{
                    backgroundColor: '#ea580c',
                    paddingVertical: 15,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {savingShop ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
                      Save Storefront Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: ADD PRODUCT */}
      <Modal visible={addProductModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, width: '100%', maxWidth: 400 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                Add New Catalog Product
              </Text>
              <TouchableOpacity onPress={() => setAddProductModalOpen(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={prodName}
              onChangeText={setProdName}
              placeholder="Product Name (e.g. 10mm Steel Nut)"
              placeholderTextColor="#94a3b8"
              style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '600', marginBottom: 12 }}
            />

            <TextInput
              value={prodPrice}
              onChangeText={setProdPrice}
              placeholder="Price in ₹ (e.g. 5)"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '600', marginBottom: 12 }}
            />

            {/* Product Image Selector (Camera & Gallery) */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Product Photo <Text style={{ color: '#ef4444' }}>*</Text>
              </Text>

              {prodImage ? (
                <View
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 1.5,
                    borderColor: '#ea580c',
                    backgroundColor: '#fff7ed',
                    position: 'relative',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 140,
                    marginBottom: 8,
                  }}
                >
                  <Image
                    source={{ uri: prodImage }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setProdImage(null)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      padding: 6,
                      borderRadius: 20,
                    }}
                  >
                    <X size={14} color="#ffffff" />
                  </TouchableOpacity>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                      Photo Selected ✓
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Take with Camera */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={pickingProdImage}
                  onPress={handleTakeProductPhoto}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: '#fff7ed',
                    borderWidth: 1.5,
                    borderColor: '#fed7aa',
                    gap: 6,
                  }}
                >
                  <Camera size={16} color="#ea580c" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ea580c' }}>
                    Camera
                  </Text>
                </TouchableOpacity>

                {/* Choose from Gallery */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={pickingProdImage}
                  onPress={handlePickProductFromGallery}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 11,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: '#eff6ff',
                    borderWidth: 1.5,
                    borderColor: '#bfdbfe',
                    gap: 6,
                  }}
                >
                  <ImageIcon size={16} color="#2563eb" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>
              {pickingProdImage && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                  <ActivityIndicator size="small" color="#ea580c" />
                  <Text style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>Loading image...</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <TextInput
                value={prodUnit}
                onChangeText={setProdUnit}
                placeholder="Unit (piece, kg)"
                placeholderTextColor="#94a3b8"
                style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
              />
              <TextInput
                value={prodStock}
                onChangeText={setProdStock}
                placeholder="Stock (100)"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
                style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600' }}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={addingProduct}
              onPress={handleAddProduct}
              style={{ backgroundColor: '#ea580c', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
            >
              {addingProduct ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                  Save & Publish Product
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD DEAL & OFFER */}
      <Modal visible={addDealModalOpen} transparent animationType="slide">
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
                maxHeight: '90%',
              }}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                      Publish Deal & Offer
                    </Text>
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#d97706' }}>BROADCAST</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', marginTop: 2 }}>
                    Broadcasts a real-time notification to all app users
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAddDealModalOpen(false)}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* 1. Deal Title */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Offer Headline / Title *
                  </Text>
                  <TextInput
                    value={dealTitle}
                    onChangeText={setDealTitle}
                    placeholder="e.g. Flat 25% Off on All Grocery & Essentials"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600', color: '#0f172a' }}
                  />
                </View>

                {/* 2. Discount Badge & Chips */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Discount Badge / Offer *
                  </Text>
                  <TextInput
                    value={dealDiscount}
                    onChangeText={setDealDiscount}
                    placeholder="e.g. 25% OFF, BUY 1 GET 1, FLAT ₹50 OFF"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '700', color: '#d97706', marginBottom: 8 }}
                  />
                  {/* Preset Discount Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['10% OFF', '20% OFF', '25% OFF', '30% OFF', '50% OFF', 'BUY 1 GET 1', 'FLAT ₹50 OFF', 'FREE DELIVERY'].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        activeOpacity={0.7}
                        onPress={() => setDealDiscount(preset)}
                        style={{
                          backgroundColor: dealDiscount === preset ? '#d97706' : '#fffbeb',
                          borderColor: dealDiscount === preset ? '#d97706' : '#fde68a',
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: dealDiscount === preset ? '#ffffff' : '#92400e',
                          }}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 3. Validity / Expiry & Chips */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Validity Period
                  </Text>
                  <TextInput
                    value={dealValidUntil}
                    onChangeText={setDealValidUntil}
                    placeholder="e.g. Valid till Sunday / Limited time offer"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 8 }}
                  />
                  {/* Preset Validity Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Today Only', 'This Weekend', 'Valid till Sunday', 'Valid till month end', 'Limited time offer'].map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        activeOpacity={0.7}
                        onPress={() => setDealValidUntil(preset)}
                        style={{
                          backgroundColor: dealValidUntil === preset ? '#0284c7' : '#f0f9ff',
                          borderColor: dealValidUntil === preset ? '#0284c7' : '#bae6fd',
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: dealValidUntil === preset ? '#ffffff' : '#0369a1',
                          }}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 4. Category selector */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>
                    Category
                  </Text>
                  <TextInput
                    value={dealCategory || shop?.category || 'Shopping'}
                    onChangeText={setDealCategory}
                    placeholder="e.g. Shopping, Grocery, Electronics, Services"
                    placeholderTextColor="#94a3b8"
                    style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 13, fontWeight: '600', color: '#0f172a', marginBottom: 8 }}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['Shopping', 'Grocery', 'Electronics', 'Services', 'Food', 'Salon', 'Transport'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        activeOpacity={0.7}
                        onPress={() => setDealCategory(cat)}
                        style={{
                          backgroundColor: (dealCategory || shop?.category) === cat ? '#7c3aed' : '#faf5ff',
                          borderColor: (dealCategory || shop?.category) === cat ? '#7c3aed' : '#e9d5ff',
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            color: (dealCategory || shop?.category) === cat ? '#ffffff' : '#6b21a8',
                          }}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 5. Deal Photo Selector */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                    Offer Promotional Photo <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  {dealImage ? (
                    <View
                      style={{
                        borderRadius: 14,
                        overflow: 'hidden',
                        borderWidth: 1.5,
                        borderColor: '#d97706',
                        backgroundColor: '#fffbeb',
                        position: 'relative',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 140,
                        marginBottom: 8,
                      }}
                    >
                      <Image
                        source={{ uri: dealImage }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setDealImage(null)}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(15, 23, 42, 0.75)',
                          padding: 6,
                          borderRadius: 20,
                        }}
                      >
                        <X size={14} color="#ffffff" />
                      </TouchableOpacity>
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          backgroundColor: 'rgba(15, 23, 42, 0.75)',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>
                          Offer Photo Selected ✓
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={pickingDealImage}
                      onPress={handleTakeDealPhoto}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 11,
                        borderRadius: 12,
                        backgroundColor: '#fffbeb',
                        borderWidth: 1.5,
                        borderColor: '#fde68a',
                        gap: 6,
                      }}
                    >
                      <Camera size={16} color="#d97706" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#d97706' }}>
                        Camera
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      disabled={pickingDealImage}
                      onPress={handlePickDealFromGallery}
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
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>
                        Gallery
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 6. Live Push Notification Preview */}
                <View
                  style={{
                    backgroundColor: '#fffbeb',
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#fde68a',
                    marginBottom: 18,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Bell size={14} color="#d97706" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#92400e', textTransform: 'uppercase' }}>
                      Citizen Notification Preview
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#78350f' }}>
                    🎉 {dealDiscount.trim() || '20% OFF'} at {shop?.name || 'Your Store'}!
                  </Text>
                  <Text style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                    {dealTitle.trim() || 'Special store discount offer'}! Valid: {dealValidUntil || 'Limited time'}. Check out Deals & Offers in CityLinks!
                  </Text>
                </View>

                {/* Submit Button */}
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
              {deleteConfirmTarget?.type === 'product' ? 'Delete Product?' : 'Delete Deal & Offer?'}
            </Text>

            {/* Subtitle */}
            <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 16 }}>
              {deleteConfirmTarget?.type === 'product'
                ? `Are you sure you want to delete "${deleteConfirmTarget?.title}"? It will be removed from your catalog.`
                : `Are you sure you want to delete this offer? It will be removed from all listings in the Deals & Offers section and citizen notifications.`}
            </Text>

            {/* Deal Preview Info Box */}
            {deleteConfirmTarget?.type !== 'product' && (
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

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={deletingDealId !== null}
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
                disabled={deletingDealId !== null}
                onPress={confirmDeleteTarget}
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
                {deletingDealId !== null ? (
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
