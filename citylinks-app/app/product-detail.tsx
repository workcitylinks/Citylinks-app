import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShoppingCart,
  Store,
  MapPin,
  ShieldCheck,
  Plus,
  Minus,
  Package,
  Zap,
  CheckCircle2,
  ChevronRight,
  Phone,
  Truck,
  Maximize2,
  X,
  Navigation,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getProductCoverImage } from './shop-detail';
import { useUserLocation } from '../hooks/useUserLocation';
import { computeShopDistance } from '../utils/distance';

const { width, height } = Dimensions.get('window');

interface ProductDetailData {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  unit: string;
  stock: number;
  imageUrl?: string | null;
  shop?: {
    id: string;
    name: string;
    category?: string;
    location?: string;
    address?: string;
    phone?: string;
    email?: string;
    rating?: number;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string | null;
  };
}

export default function ProductDetailScreen() {
  const params = useLocalSearchParams<{
    productId?: string;
    shopId?: string;
    name?: string;
    price?: string;
    unit?: string;
  }>();

  const productId = params.productId || '';
  const { userToken, cartCount, refreshCartCount } = useApp();
  const { showSuccess, showError } = useToast();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [orderingNow, setOrderingNow] = useState(false);

  // Mobile Device Location & Distance
  const { coords: mobileCoords } = useUserLocation();
  const shopDistance = product?.shop
    ? computeShopDistance(mobileCoords, product.shop.latitude, product.shop.longitude)
    : null;

  // Big Card Image Preview Modal State
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

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.get(`/shops/products/${productId}`);
      if (res.data) {
        setProduct(res.data);
      }
    } catch (err: any) {
      console.warn('Could not fetch product via direct endpoint, trying shop products:', err);
      // Fallback: If shopId was also provided, fetch shop products
      if (params.shopId) {
        try {
          const shopRes = await apiClient.get(`/shops/${params.shopId}`);
          if (shopRes.data?.products) {
            const found = shopRes.data.products.find((p: any) => p.id === productId);
            if (found) {
              setProduct({
                ...found,
                shop: {
                  id: shopRes.data.id,
                  name: shopRes.data.name,
                  category: shopRes.data.category,
                  location: shopRes.data.location,
                  phone: shopRes.data.phone,
                  latitude: shopRes.data.latitude,
                  longitude: shopRes.data.longitude,
                  imageUrl: shopRes.data.imageUrl,
                },
              });
            }
          }
        } catch (e) {
          console.error('Fallback fetch failed:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = () => {
    if (product && quantity >= product.stock) {
      showError(`Only ${product.stock} items available in stock`, 'Stock Limit');
      return;
    }
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!userToken) {
      showError('Please sign in to add products to your cart', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }
    try {
      setAddingToCart(true);
      await apiClient.post('/cart/items', {
        productId: product.id,
        quantity,
      });
      await refreshCartCount();
      showSuccess(
        `Added ${quantity} ${product.unit || 'item'}${quantity > 1 ? 's' : ''} of "${product.name}" to cart`,
        'Added to Cart'
      );
    } catch (err: any) {
      console.error('Add to cart failed:', err);
      showError(err.response?.data?.error || 'Failed to add item to cart', 'Cart Error');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleOrderNow = async () => {
    if (!product) return;
    if (!userToken) {
      showError('Please sign in to place orders', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }
    try {
      setOrderingNow(true);
      await apiClient.post('/cart/items', {
        productId: product.id,
        quantity,
      });
      await refreshCartCount();
      showSuccess(`Proceeding to checkout with ${product.name}`, 'Order Started');
      router.push('/cart' as any);
    } catch (err: any) {
      console.error('Order now failed:', err);
      showError(err.response?.data?.error || 'Failed to process order', 'Order Error');
    } finally {
      setOrderingNow(false);
    }
  };

  const totalPrice = product ? product.price * quantity : 0;

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Top Navigation Bar */}
      <SafeAreaView edges={['top']} className="bg-white border-b border-slate-100 z-10">
        <View className="px-4 py-3 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
              Product Details
            </Text>
            {product?.shop?.name && (
              <Text className="text-[11px] font-medium text-slate-400" numberOfLines={1}>
                {product.shop.name}
              </Text>
            )}
          </View>

          {/* Cart Icon with Live Badge */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/cart' as any)}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center relative"
          >
            <ShoppingCart size={19} color="#0f172a" />
            {cartCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-primary rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white">
                <Text className="text-[9px] font-extrabold text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-slate-500 text-xs font-semibold mt-3">
            Loading product details...
          </Text>
        </View>
      ) : !product ? (
        <View className="flex-1 items-center justify-center p-6">
          <Package size={52} color="#94a3b8" />
          <Text className="text-base font-bold text-slate-800 mt-3">Product Not Found</Text>
          <Text className="text-xs text-slate-500 text-center mt-1 mb-5">
            The requested product details could not be loaded.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-primary px-6 py-2.5 rounded-xl"
          >
            <Text className="text-white text-xs font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* PRODUCT HERO IMAGE (CLICKABLE TO OPEN IN BIG CARD FORMAT) */}
          {(() => {
            const heroImageUri = getProductCoverImage(product, product?.shop?.category);
            return (
              <View className="bg-white border-b border-slate-100 p-4 pt-4 items-center justify-center">
                <View className="w-full flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Product Image
                  </Text>
                  <Text className="text-[11px] font-bold text-primary">
                    Tap to view full card
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    openImagePreview(
                      heroImageUri,
                      product.name,
                      `₹${product.price} / ${product.unit || 'piece'} • ${product.shop?.name || 'Store'}`
                    );
                  }}
                  style={{
                    width: width - 32,
                    height: 275,
                    borderRadius: 24,
                    overflow: 'hidden',
                    backgroundColor: '#eff6ff',
                    borderWidth: 1.5,
                    borderColor: '#bfdbfe',
                    position: 'relative',
                  }}
                >
                  <Image
                    source={{ uri: heroImageUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />

                  {/* Tap to Enlarge Indicator Pill */}
                  <View className="absolute bottom-3 right-3 bg-black/70 px-3 py-1.5 rounded-full flex-row items-center shadow-md">
                    <Maximize2 size={13} color="#ffffff" />
                    <Text className="text-xs font-bold text-white ml-1.5">Tap to enlarge</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* 3. MAIN PRODUCT INFO CARD */}
          <View className="bg-white p-5 mb-3 border-b border-slate-100 shadow-xs">
            {/* Category / Unit pill */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                <Text className="text-[11px] font-bold text-blue-700">
                  {product.unit ? `Sold per ${product.unit}` : 'Standard Unit'}
                </Text>
              </View>

              {product.stock > 0 ? (
                <View className="flex-row items-center bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  <CheckCircle2 size={12} color="#059669" />
                  <Text className="text-[11px] font-bold text-emerald-700 ml-1">
                    In Stock ({product.stock} units)
                  </Text>
                </View>
              ) : (
                <View className="bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                  <Text className="text-[11px] font-bold text-rose-700">Out of Stock</Text>
                </View>
              )}
            </View>

            {/* Product Title */}
            <Text className="text-2xl font-black text-slate-900 leading-tight mb-2">
              {product.name}
            </Text>

            {/* Price Tag */}
            <View className="flex-row items-baseline mb-3">
              <Text className="text-3xl font-black text-primary">
                ₹{product.price}
              </Text>
              <Text className="text-sm font-semibold text-slate-500 ml-1.5">
                / {product.unit || 'piece'}
              </Text>
            </View>

            {/* Description */}
            {product.description && (
              <View className="pt-2 border-t border-slate-100">
                <Text className="text-xs font-bold text-slate-700 mb-1">Description</Text>
                <Text className="text-xs text-slate-600 leading-relaxed">
                  {product.description}
                </Text>
              </View>
            )}
          </View>

          {/* 4. STORE & VENDOR CARD */}
          {product.shop && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push(`/shop-detail?id=${product.shop?.id}` as any)}
              className="bg-white mx-4 rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-xs flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 items-center justify-center mr-3">
                  <Store size={22} color="#ea580c" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-extrabold text-slate-900" numberOfLines={1}>
                      {product.shop.name}
                    </Text>
                    <View className="bg-orange-100 px-1.5 py-0.5 rounded">
                      <Text className="text-[9px] font-bold text-orange-800">
                        {product.shop.category || 'Store'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mt-1">
                    <MapPin size={12} color="#64748b" />
                    <Text className="text-[11px] text-slate-500 ml-1" numberOfLines={1}>
                      {product.shop.location || 'Haveri, Karnataka'}
                    </Text>
                  </View>

                  {shopDistance && (
                    <View className="flex-row items-center mt-1.5 bg-blue-50/90 border border-blue-200/80 px-2 py-0.5 rounded-md self-start">
                      <Navigation size={10} color="#2563eb" />
                      <Text className="text-[10px] font-bold text-blue-800 ml-1">
                        {shopDistance.awayText} ({shopDistance.metersText} / {shopDistance.kmText})
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}

          {/* 5. QUANTITY COUNTER CARD */}
          <View className="bg-white mx-4 rounded-2xl p-4 mb-3 border border-slate-200/80 shadow-xs">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-bold text-slate-900">Select Quantity</Text>
                <Text className="text-[11px] text-slate-500">
                  Subtotal: <Text className="font-bold text-primary">₹{totalPrice}</Text>
                </Text>
              </View>

              {/* Counter Stepper */}
              <View className="flex-row items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDecrement}
                  disabled={quantity <= 1}
                  className={`w-9 h-9 rounded-lg items-center justify-center bg-white shadow-xs ${
                    quantity <= 1 ? 'opacity-40' : ''
                  }`}
                >
                  <Minus size={16} color="#0f172a" />
                </TouchableOpacity>

                <View className="w-12 items-center justify-center">
                  <Text className="text-base font-extrabold text-slate-900">
                    {quantity}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleIncrement}
                  className="w-9 h-9 rounded-lg items-center justify-center bg-white shadow-xs"
                >
                  <Plus size={16} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 6. LOCAL SHOPPING PERKS */}
          <View className="bg-white mx-4 rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-3">
            <Text className="text-xs font-bold text-slate-900 mb-2">CityLinks Delivery & Trust</Text>

            <View className="flex-row items-center mb-2.5">
              <Truck size={15} color="#2563eb" />
              <Text className="text-xs text-slate-600 ml-2">
                Fast doorstep delivery or local store pickup in Haveri
              </Text>
            </View>

            <View className="flex-row items-center mb-2.5">
              <ShieldCheck size={15} color="#16a34a" />
              <Text className="text-xs text-slate-600 ml-2">
                Verified genuine products directly from local merchants
              </Text>
            </View>

            <View className="flex-row items-center">
              <Phone size={15} color="#d97706" />
              <Text className="text-xs text-slate-600 ml-2">
                Instant merchant support on all orders
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* FLOATING BOTTOM ACTIONS: ADD TO CART & ORDER NOW */}
      {product && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-2xl flex-row items-center gap-3">
          {/* Add to Cart Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={addingToCart || orderingNow || product.stock <= 0}
            onPress={handleAddToCart}
            style={{
              flex: 1,
              backgroundColor: '#eff6ff',
              borderWidth: 1.5,
              borderColor: '#bfdbfe',
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <>
                <ShoppingCart size={17} color="#2563eb" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#2563eb' }}>
                  Add to Cart
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Order Now Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={addingToCart || orderingNow || product.stock <= 0}
            onPress={handleOrderNow}
            style={{
              flex: 1.2,
              backgroundColor: '#2563eb',
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              shadowColor: '#2563eb',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {orderingNow ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Zap size={17} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff' }}>
                  Order Now • ₹{totalPrice}
                </Text>
              </>
            )}
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
                height: Math.min(height * 0.52, 400),
                backgroundColor: '#0f172a',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {previewImageUri ? (
                <Image
                  source={{ uri: previewImageUri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                <Package size={64} color="#64748b" />
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
                Full Size Card Preview
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
