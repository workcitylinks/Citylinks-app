import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  Plus,
  Minus,
  ShoppingCart,
  Search,
  X,
  Package,
  Maximize2,
  Navigation,
  Compass,
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { apiClient } from '../api/apiClient';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { useShopDetail, ProductItem } from '../queries/marketplaceQueries';
import { useUserLocation } from '../hooks/useUserLocation';
import { computeShopDistance } from '../utils/distance';
import { LazyImage } from '../components/ui/LazyImage';

export const getShopCoverImage = (shopItem?: { imageUrl?: string | null; category?: string | null; name?: string } | null) => {
  if (shopItem?.imageUrl && shopItem.imageUrl.trim().length > 0) {
    return shopItem.imageUrl;
  }
  const cat = (shopItem?.category || '').toLowerCase();
  if (cat.includes('auto')) {
    return 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&q=80';
  }
  if (cat.includes('groc') || cat.includes('supermarket')) {
    return 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80';
  }
  if (cat.includes('elect') || cat.includes('mobile')) {
    return 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80';
  }
  if (cat.includes('hardware') || cat.includes('paint')) {
    return 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800&q=80';
  }
  if (cat.includes('apparel') || cat.includes('fashion') || cat.includes('textile') || cat.includes('cloth')) {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80';
  }
  if (cat.includes('pharm') || cat.includes('health') || cat.includes('med')) {
    return 'https://images.unsplash.com/photo-1586015554063-e38059c3a388?w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80';
};

export const getProductCoverImage = (
  productItem?: { imageUrl?: string | null; name?: string; unit?: string } | null,
  shopCategory?: string
) => {
  if (productItem?.imageUrl && productItem.imageUrl.trim().length > 0) {
    return productItem.imageUrl;
  }
  const name = (productItem?.name || '').toLowerCase();
  const cat = (shopCategory || '').toLowerCase();

  if (name.includes('apple') || name.includes('fruit') || name.includes('veg') || name.includes('tomato') || name.includes('onion')) {
    return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80';
  }
  if (name.includes('oil') || name.includes('ghee') || name.includes('butter')) {
    return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80';
  }
  if (name.includes('rice') || name.includes('grain') || name.includes('dal') || name.includes('flour') || cat.includes('groc')) {
    return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80';
  }
  if (name.includes('nut') || name.includes('bolt') || name.includes('screw') || cat.includes('hard')) {
    return 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800&q=80';
  }
  if (name.includes('phone') || name.includes('mobile') || name.includes('charger') || cat.includes('elect')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80';
  }
  if (cat.includes('auto') || name.includes('tire') || name.includes('brake') || name.includes('spare')) {
    return 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&q=80';
  }
  if (cat.includes('apparel') || cat.includes('cloth') || name.includes('shirt') || name.includes('pant')) {
    return 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80';
};

export default function ShopDetailScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken, refreshCartCount, isShopPhoneEnabled } = useApp();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const shopId = params.id || '';

  const { shop, loading, refreshing, refetch } = useShopDetail(shopId);

  // Refresh on focus
  useFocusEffect(
    React.useCallback(() => {
      refetch({ force: true });
    }, [shopId])
  );

  // Mobile Device Location & Distance
  const { coords: mobileCoords } = useUserLocation();
  const distance = useMemo(() => {
    return computeShopDistance(mobileCoords, shop?.latitude, shop?.longitude);
  }, [mobileCoords, shop?.latitude, shop?.longitude]);

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ [productId: string]: number }>({});

  // Big Card Preview Modal State
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewSubtitle, setPreviewSubtitle] = useState('');

  const openImagePreview = (uri: string, title: string, subtitle: string) => {
    setPreviewImageUri(uri);
    setPreviewTitle(title);
    setPreviewSubtitle(subtitle);
    setPreviewModalVisible(true);
  };

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!shop?.products) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return shop.products;
    return shop.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.unit && p.unit.toLowerCase().includes(q))
    );
  }, [shop?.products, searchQuery]);

  // Fetch Cart Items from backend to reflect actual cart additions
  const fetchCartItems = async () => {
    try {
      const res = await apiClient.get('/cart');
      if (res.data?.items) {
        const cartMap: { [productId: string]: number } = {};
        res.data.items.forEach((item: any) => {
          if (item.productId) {
            cartMap[item.productId] = item.quantity;
          }
        });
        setCart(cartMap);
      }
    } catch (e) {
      // Graceful fallback if cart is empty or network is resolving
      setCart({});
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, [userToken]);

  useFocusEffect(
    React.useCallback(() => {
      fetchCartItems();
      refreshCartCount();
    }, [userToken])
  );

  const handleAddToCart = async (product: ProductItem) => {
    if (!userToken) {
      showError('Please sign in to add items to your cart', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }

    const nextQty = (cart[product.id] || 0) + 1;
    setCart((prev) => ({ ...prev, [product.id]: nextQty }));
    showSuccess(`Added ${product.name} to cart`, 'Cart Updated');

    try {
      await apiClient.post('/cart/items', { productId: product.id, quantity: nextQty, setExact: true });
      await refreshCartCount();
    } catch (e) {
      console.error('Failed to sync cart item to DB:', e);
    }
  };

  const handleUpdateQty = async (productId: string, delta: number) => {
    if (!userToken) {
      showError('Please sign in to update your cart', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }

    const currentQty = cart[productId] || 0;
    const newQty = currentQty + delta;

    setCart((prev) => {
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: newQty };
    });

    if (userToken) {
      try {
        await apiClient.post('/cart/items', { productId, quantity: newQty, setExact: true });
        await refreshCartCount();
      } catch (e) {
        console.error('Failed to update cart item in DB:', e);
      }
    }
  };

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    if (!shop?.products) return 0;
    return Object.entries(cart).reduce((sum, [pId, qty]) => {
      const prod = shop.products?.find((p) => p.id === pId);
      return sum + (prod ? prod.price * qty : 0);
    }, 0);
  }, [cart, shop?.products]);

  const onRefresh = () => {
    refetch({ force: true });
    fetchCartItems();
    refreshCartCount();
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Sleek Top Header Bar */}
      <SafeAreaView edges={['top']} className="bg-white border-b border-slate-100 shadow-2xs">
        <View className="px-4 py-2.5 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="flex-row items-center bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-full"
          >
            <ArrowLeft size={16} color="#334155" />
            <Text className="ml-1.5 text-xs font-bold text-slate-700">
              Back to Shops
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            {shop && (
              <View className="bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-full">
                <Text className="text-[11px] font-bold text-blue-700">
                  {shop.category || 'Store'}
                </Text>
              </View>
            )}

            {totalCartCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/cart' as any)}
                className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center relative shadow-xs"
              >
                <ShoppingCart size={15} color="#ffffff" />
                <View className="absolute -top-1 -right-1 bg-amber-500 rounded-full w-4 h-4 items-center justify-center border border-white">
                  <Text className="text-[9px] font-black text-white">{totalCartCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="flex-1">
        {loading && !shop ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-500 text-xs mt-3">Loading store & catalog...</Text>
          </View>
        ) : !shop ? (
          <View className="flex-1 items-center justify-center p-6">
            <Store size={48} color="#94a3b8" />
            <Text className="text-base font-bold text-slate-800 mt-3">Shop Not Found</Text>
            <Text className="text-xs text-slate-500 text-center mt-1 mb-4">
              The requested store could not be located.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-primary px-5 py-2.5 rounded-xl"
            >
              <Text className="text-white text-xs font-semibold">Back to Shops</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: totalCartCount > 0 ? 110 : 40,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* STOREFRONT HERO BANNER */}
            {(() => {
              const coverPhotoUri = getShopCoverImage(shop);
              return (
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() =>
                    openImagePreview(
                      coverPhotoUri,
                      shop.name,
                      `${shop.category || 'Store'} • ${shop.location || shop.address || 'Haveri, Karnataka'}`
                    )
                  }
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 22,
                    overflow: 'hidden',
                    backgroundColor: '#e2e8f0',
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    position: 'relative',
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                  }}
                >
                  <LazyImage
                    source={{ uri: coverPhotoUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    loaderColor="#ea580c"
                  />

                  {/* Gradient Overlay for contrast */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(15, 23, 42, 0.15)',
                    }}
                  />

                  {/* Storefront Badge */}
                  <View className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex-row items-center shadow-xs border border-white/80">
                    <Store size={12} color="#ea580c" />
                    <Text className="text-[11px] font-bold text-slate-800 ml-1.5">
                      Storefront Photo
                    </Text>
                  </View>

                  {/* Tap to Enlarge Pill */}
                  <View className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full flex-row items-center border border-white/20">
                    <Maximize2 size={11} color="#ffffff" />
                    <Text className="text-[10px] font-bold text-white ml-1.5">Tap to enlarge</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* SHOP PROFILE & DETAILS CARD */}
            <View className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 mb-3.5">
              {/* Top Row: Shop Icon, Name & Category */}
              <View className="flex-row items-start">
                <View className="w-13 h-13 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center mr-3 flex-shrink-0">
                  <Store size={26} color="#2563eb" strokeWidth={2} />
                </View>

                <View className="flex-1">
                  <Text className="text-xl font-extrabold text-slate-900 tracking-tight leading-6">
                    {shop.name}
                  </Text>

                  <View className="flex-row items-center gap-1.5 mt-1">
                    <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <Text className="text-[11px] font-semibold text-slate-700">
                        {shop.category || 'Retail Store'}
                      </Text>
                    </View>
                    <View className="bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                      <Text className="text-[11px] font-bold text-emerald-700">
                        Open Now
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Clean Location Row */}
              {(shop.address || shop.location) && (
                <View className="flex-row items-center mt-3 pt-2.5 border-t border-slate-100">
                  <MapPin size={13} color="#64748b" style={{ marginRight: 6, flexShrink: 0 }} />
                  <Text className="text-xs text-slate-600 font-medium flex-1" numberOfLines={1}>
                    {shop.address || shop.location}
                  </Text>
                </View>
              )}

              {/* Distance & Action Bar */}
              <View className="flex-row items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
                {/* Distance Chip */}
                <View className="flex-row items-center bg-blue-50 border border-blue-200/70 px-2.5 py-1 rounded-lg">
                  <Navigation size={11} color="#2563eb" />
                  <Text className="text-xs font-bold text-blue-800 ml-1.5">
                    {distance.meters < 1000
                      ? `${distance.meters} m (${distance.kmText}) away`
                      : `${distance.kmText} (${distance.metersText}) away`}
                  </Text>
                </View>

                {/* Right Side Action Buttons: Call & Maps */}
                <View className="flex-row items-center gap-2">
                  {/* Call Store Button (controlled by Super Admin setting) */}
                  {isShopPhoneEnabled && shop.phone && shop.showPhone !== false && (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => {
                        if (!userToken) {
                          showError('Please sign in to make calls to stores', 'Sign In Required');
                          router.push('/auth' as any);
                          return;
                        }
                        Linking.openURL(`tel:${shop.phone}`);
                      }}
                      className="flex-row items-center bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg shadow-2xs"
                    >
                      <Phone size={12} color="#059669" />
                      <Text className="text-xs font-bold text-emerald-700 ml-1.5">
                        Call
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Directions / Maps Button */}
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      if (!userToken) {
                        showError('Please sign in to view store directions and location', 'Sign In Required');
                        router.push('/auth' as any);
                        return;
                      }
                      const destLat = shop?.latitude ?? mobileCoords.latitude;
                      const destLng = shop?.longitude ?? mobileCoords.longitude;
                      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`);
                    }}
                    className="flex-row items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs"
                  >
                    <Image
                      source={require('../assets/images/google-maps.png')}
                      style={{ width: 13, height: 16 }}
                      resizeMode="contain"
                    />
                    <Text className="text-xs font-bold text-slate-800 ml-1.5">Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Email Line if available */}
              {shop.email && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!userToken) {
                      showError('Please sign in to contact stores', 'Sign In Required');
                      router.push('/auth' as any);
                      return;
                    }
                    Linking.openURL(`mailto:${shop.email}`);
                  }}
                  className="flex-row items-center mt-2"
                >
                  <Mail size={12} color="#94a3b8" style={{ marginRight: 6 }} />
                  <Text className="text-[11px] text-slate-500 font-medium">
                    {shop.email}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* SECTION HEADER & SEARCH INPUT */}
            <View className="flex-row items-center justify-between mb-2 px-1">
              <View className="flex-row items-center gap-1.5">
                <Package size={16} color="#0f172a" />
                <Text className="text-base font-extrabold text-slate-900">
                  Store Catalog
                </Text>
                <View className="bg-slate-200/80 px-2 py-0.5 rounded-full ml-1">
                  <Text className="text-[10px] font-bold text-slate-700">
                    {filteredProducts.length} items
                  </Text>
                </View>
              </View>
            </View>

            {/* Compact Search Bar */}
            <View className="bg-white rounded-xl px-3.5 h-10 shadow-2xs border border-slate-200 mb-3.5 flex-row items-center">
              <Search size={15} color="#94a3b8" />
              <TextInput
                placeholder="Search products in this store..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-slate-800 text-xs font-normal"
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Products Grid / Cards matching screenshot */}
            {filteredProducts.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center justify-center shadow-sm border border-slate-100 my-4">
                <Package size={40} color="#94a3b8" />
                <Text className="text-base font-bold text-slate-800 mt-3">No products available</Text>
                <Text className="text-xs text-slate-500 text-center mt-1">
                  {searchQuery
                    ? `No products matching "${searchQuery}".`
                    : 'This store has not added any products yet.'}
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {filteredProducts.map((product) => {
                  const qtyInCart = cart[product.id] || 0;

                  return (
                    <View
                      key={product.id}
                      className="w-[48%] bg-white rounded-2xl p-3 mb-3.5 shadow-2xs border border-slate-200/80 flex-col justify-between"
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          router.push({
                            pathname: '/product-detail',
                            params: {
                              productId: product.id,
                              shopId: shop.id,
                            },
                          } as any);
                        }}
                      >
                        {/* Thumbnail Image with Tap to Enlarge option */}
                        {(() => {
                          const prodCoverUri = getProductCoverImage(product, shop?.category);
                          return (
                            <View className="w-full h-28 rounded-xl bg-slate-100 mb-2.5 overflow-hidden border border-slate-150 relative">
                              <LazyImage
                                source={{ uri: prodCoverUri }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                                loaderColor="#ea580c"
                              />

                              {/* Tap to Enlarge Pill */}
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  openImagePreview(
                                    prodCoverUri,
                                    product.name,
                                    `₹${product.price} / ${product.unit || 'piece'} • ${shop.name}`
                                  );
                                }}
                                style={{
                                  position: 'absolute',
                                  bottom: 5,
                                  right: 5,
                                  backgroundColor: 'rgba(15, 23, 42, 0.68)',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2.5,
                                  borderRadius: 10,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                }}
                              >
                                <Maximize2 size={9} color="#ffffff" />
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#ffffff', marginLeft: 2.5 }}>
                                  Enlarge
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })()}

                        {/* Product Name */}
                        <Text className="font-bold text-sm text-slate-900 leading-4 mb-0.5" numberOfLines={1}>
                          {product.name}
                        </Text>

                        {/* Product Subtitle / Description */}
                        <Text className="text-[11px] text-slate-500 mb-2" numberOfLines={1}>
                          {product.description || product.name}
                        </Text>

                        {/* Price & Unit & Stock Row */}
                        <View className="flex-row items-center justify-between mb-2.5">
                          <View className="flex-row items-baseline">
                            <Text className="text-sm font-extrabold text-[#2563eb]">
                              ₹{product.price}
                            </Text>
                            <Text className="text-[10px] text-slate-500 ml-0.5">
                              /{product.unit || 'pc'}
                            </Text>
                          </View>

                          <View className={`px-1.5 py-0.5 rounded ${product.stock > 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <Text className={`text-[9px] font-bold ${product.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Add to Cart Button or Qty Stepper */}
                      {qtyInCart === 0 ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          disabled={product.stock <= 0}
                          onPress={() => handleAddToCart(product)}
                          className={`w-full py-2 rounded-xl flex-row items-center justify-center border ${
                            product.stock > 0
                              ? 'bg-blue-50/70 border-blue-200/90'
                              : 'bg-slate-100 border-slate-200 opacity-50'
                          }`}
                        >
                          <Plus size={13} color="#2563eb" style={{ marginRight: 3 }} />
                          <Text className="text-xs font-bold text-blue-700">
                            Add
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View className="flex-row items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-1.5 py-1">
                          <TouchableOpacity
                            onPress={() => handleUpdateQty(product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white items-center justify-center shadow-2xs"
                          >
                            <Minus size={12} color="#2563eb" />
                          </TouchableOpacity>

                          <Text className="font-extrabold text-xs text-[#2563eb]">
                            {qtyInCart}
                          </Text>

                          <TouchableOpacity
                            onPress={() => handleUpdateQty(product.id, 1)}
                            className="w-6 h-6 rounded-lg bg-white items-center justify-center shadow-2xs"
                          >
                            <Plus size={12} color="#2563eb" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Floating Bottom Cart Bar when items are selected */}
      {totalCartCount > 0 && (
        <View className="absolute bottom-6 left-4 right-4 bg-[#1e293b] rounded-2xl p-4 shadow-xl flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl bg-blue-600 items-center justify-center mr-3">
              <ShoppingCart size={18} color="#ffffff" />
            </View>
            <View>
              <Text className="text-white font-bold text-sm">
                {totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart
              </Text>
              <Text className="text-slate-400 text-xs">
                Total: ₹{totalCartPrice}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              router.push('/cart' as any);
            }}
            className="bg-[#2563eb] px-4 py-2.5 rounded-xl flex-row items-center"
          >
            <Text className="text-white text-xs font-bold mr-1">View Cart</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL: BIG SIZE CARD FORMAT IMAGE PREVIEW */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          {/* Backdrop Tap to Close */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
            activeOpacity={1}
            onPress={() => setPreviewModalVisible(false)}
          />

          {/* Big Card Container */}
          <View
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: '#ffffff',
              borderRadius: 28,
              overflow: 'hidden',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35,
              shadowRadius: 25,
              elevation: 10,
            }}
          >
            {/* Card Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text
                  style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}
                  numberOfLines={1}
                >
                  {previewTitle || 'Photo Preview'}
                </Text>
                {previewSubtitle ? (
                  <Text
                    style={{ fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {previewSubtitle}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setPreviewModalVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} color="#334155" />
              </TouchableOpacity>
            </View>

            {/* Big Size Image View */}
            <View
              style={{
                height: 360,
                backgroundColor: '#0f172a',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {previewImageUri ? (
                <LazyImage
                  source={{ uri: previewImageUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  loaderColor="#ffffff"
                />
              ) : (
                <Store size={64} color="#64748b" />
              )}
            </View>

            {/* Card Footer */}
            <View
              style={{
                padding: 16,
                backgroundColor: '#f8fafc',
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b' }}>
                Storefront Photo Preview
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPreviewModalVisible(false)}
                style={{
                  backgroundColor: '#0f172a',
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: 12,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
