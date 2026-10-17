import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Search,
  MapPin,
  ArrowRight,
  Phone,
  Store,
  X,
  Navigation,
  Crosshair,
  ArrowUpDown,
  Compass,
  Star,
  Check,
  Globe,
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { LazyImage } from '../components/ui/LazyImage';
import { useShops, ShopItem } from '../queries/marketplaceQueries';
import { useUserLocation } from '../hooks/useUserLocation';
import {
  computeShopDistance,
  FormattedDistance,
  calculateDistanceInMeters,
  DEFAULT_MOBILE_COORDS,
} from '../utils/distance';
import { getShopCoverImage } from './shop-detail';

interface EnrichedShopItem extends ShopItem {
  distance: FormattedDistance;
}

export default function NearbyShopsScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken, isShopPhoneEnabled } = useApp();
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const initialCategory = (params.category as string) || 'All';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState(params.q || '');
  const [sortByNearest, setSortByNearest] = useState<boolean>(true);

  // Hook handles caching, deduplication, and debounced search
  const { shops, categories, loading, refreshing, refetch } = useShops(searchQuery, selectedCategory);

  // Always reload shops when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch({ force: true });
    }, [])
  );

  // Mobile Device GPS position hook
  const {
    coords: mobileCoords,
    isLiveGPS,
    loading: loadingLocation,
    locality,
    refreshLocation,
    mode: locationMode,
    switchToHaveri,
    switchToLiveGPS,
    rawDeviceLocality,
    isOutsideHaveri,
  } = useUserLocation();

  const [showLocationModal, setShowLocationModal] = useState(false);

  // Sync when route parameters change
  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category.trim());
    }
    if (params.q) {
      setSearchQuery(params.q.trim());
    }
  }, [params.category, params.q]);

  // Client-side category matching
  const filteredShops = useMemo(() => {
    if (!selectedCategory || selectedCategory.toLowerCase() === 'all') {
      return shops;
    }
    const target = selectedCategory.trim().toLowerCase();
    return shops.filter((s) => {
      const cat = (s.category || '').toLowerCase();
      const name = (s.name || '').toLowerCase();

      if (cat.includes(target) || name.includes(target)) return true;

      if (
        target.includes('apparel') ||
        target.includes('cloth') ||
        target.includes('fashion') ||
        target.includes('textile')
      ) {
        return cat.includes('retail') || name.includes('fashion') || name.includes('textile');
      }
      if (target.startsWith('grocer') || target.includes('food')) {
        return cat.includes('grocer') || name.includes('bazaar') || name.includes('grocer');
      }
      if (
        target.includes('electronic') ||
        target.includes('appliance') ||
        target.includes('mobile')
      ) {
        return (
          cat.includes('electronic') ||
          cat.includes('retail') ||
          name.includes('appliances') ||
          name.includes('mobile')
        );
      }
      if (target.includes('auto')) {
        return cat.includes('automobile') || name.includes('automobile');
      }
      return false;
    });
  }, [shops, selectedCategory]);

  // Compute distance from mobile device for every shop and sort by nearest
  const enrichedShops = useMemo<EnrichedShopItem[]>(() => {
    const list: EnrichedShopItem[] = filteredShops.map((shop) => {
      const distance = computeShopDistance(mobileCoords, shop.latitude, shop.longitude);
      return {
        ...shop,
        distance,
      };
    });

    if (sortByNearest) {
      list.sort((a, b) => {
        if (a.distance.meters !== b.distance.meters) {
          return a.distance.meters - b.distance.meters;
        }
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    return list;
  }, [filteredShops, mobileCoords, sortByNearest]);

  const onRefresh = () => {
    refetch({ force: true });
    refreshLocation();
  };

  const handleOpenDirections = (shop: EnrichedShopItem) => {
    if (!userToken) {
      showError('Please sign in to view store directions and location', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }
    const destLat = shop.latitude ?? mobileCoords.latitude;
    const destLng = shop.longitude ?? mobileCoords.longitude;
    const label = encodeURIComponent(shop.name);

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${destLat},${destLng}`,
      android: `geo:0,0?q=${destLat},${destLng}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`);
      });
    }
  };

  const handleVisitShop = (shop: ShopItem) => {
    router.push({
      pathname: '/shop-detail',
      params: { id: shop.id },
    } as any);
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <SafeAreaView edges={['top']} className="bg-white border-b border-slate-100">
        {/* COMPACT TOP HEADER */}
        <View className="px-4 pt-2 pb-2 bg-white">
          {/* Top Bar: Back & Title on one line + Compact GPS Chip on the right */}
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.back()}
              className="flex-row items-center py-1 pr-2"
            >
              <ArrowLeft size={20} color="#0f172a" />
              <Text className="text-lg font-bold text-slate-900 ml-1.5">
                Near by Shops
              </Text>
            </TouchableOpacity>

            {/* Compact GPS Pill */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowLocationModal(true)}
              disabled={loadingLocation}
              className="flex-row items-center bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full"
            >
              <View
                className={`w-2 h-2 rounded-full ${
                  isLiveGPS ? 'bg-emerald-500' : 'bg-blue-500'
                } mr-1.5`}
              />
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#2563eb" style={{ transform: [{ scale: 0.7 }] }} />
              ) : (
                <Text className="text-[11px] font-semibold text-slate-700 max-w-[110px]" numberOfLines={1}>
                  {locality || 'Haveri'}
                </Text>
              )}
              <Crosshair size={11} color="#2563eb" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Compact Search Bar */}
          <View className="flex-row items-center bg-slate-50 rounded-xl px-3 h-10 border border-slate-200/90 mb-2">
            <Search size={16} color="#94a3b8" />
            <TextInput
              placeholder="Search shops or category..."
              placeholderTextColor="#94a3b8"
              maxLength={60}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2.5 text-slate-800 text-xs font-normal"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                <X size={15} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Subtle indicator if user device GPS is in another city */}
          {isOutsideHaveri && locationMode === 'haveri' && (
            <View className="mb-2 bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-3 py-2 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <MapPin size={13} color="#059669" />
                <Text className="text-[11px] text-emerald-900 ml-1.5 flex-1" numberOfLines={1}>
                  Showing stores from <Text className="font-bold">Haveri Town Hub</Text> (Nearest first).
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setShowLocationModal(true)}
                className="bg-emerald-600 px-2.5 py-1 rounded-md"
              >
                <Text className="text-[10px] font-bold text-white">Options</Text>
              </TouchableOpacity>
            </View>
          )}

          {isOutsideHaveri && locationMode === 'live' && (
            <View className="mb-2 bg-blue-50/90 border border-blue-200/80 rounded-xl px-3 py-2 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <MapPin size={13} color="#2563eb" />
                <Text className="text-[11px] text-blue-900 ml-1.5 flex-1" numberOfLines={1}>
                  GPS reading: <Text className="font-bold">{rawDeviceLocality || locality}</Text>.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  switchToHaveri();
                  showSuccess('Switched to Haveri Town Center', 'Local View Active');
                }}
                className="bg-blue-600 px-2.5 py-1 rounded-md"
              >
                <Text className="text-[10px] font-bold text-white">Use Haveri Hub</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 2 }}
            className="mb-1.5"
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory.trim().toLowerCase() === cat.trim().toLowerCase();
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(isSelected ? 'All' : cat)}
                  className={`mr-1.5 px-3 py-1 rounded-full border ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-semibold ${
                      isSelected ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Subheader: Counts & Sort Toggle */}
          <View className="flex-row items-center justify-between pt-1">
            <Text className="text-[11px] font-semibold text-slate-500">
              {selectedCategory && selectedCategory.toLowerCase() !== 'all'
                ? `${enrichedShops.length} stores in ${selectedCategory}`
                : `Verified Stores (${enrichedShops.length})`}
            </Text>

            <TouchableOpacity
              onPress={() => setSortByNearest(!sortByNearest)}
              activeOpacity={0.7}
              className={`px-2 py-0.5 rounded-md border flex-row items-center ${
                sortByNearest
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <ArrowUpDown size={10} color={sortByNearest ? '#2563eb' : '#64748b'} />
              <Text
                className={`text-[10px] font-bold ml-1 ${
                  sortByNearest ? 'text-blue-700' : 'text-slate-600'
                }`}
              >
                {sortByNearest ? 'Nearest First' : 'Default'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* SHOP LIST CONTENT */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f8fafc]">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-500 text-xs mt-3">Loading nearby shops...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 25 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {enrichedShops.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center justify-center my-6 border border-slate-100">
                <Store size={40} color="#94a3b8" />
                <Text className="text-sm font-bold text-slate-800 mt-2">No shops found</Text>
                <Text className="text-xs text-slate-500 text-center mt-1 mb-3">
                  No verified shops found in "{selectedCategory}".
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="bg-blue-600 px-3.5 py-1.5 rounded-lg"
                >
                  <Text className="text-white text-xs font-semibold">View All</Text>
                </TouchableOpacity>
              </View>
            ) : (
              enrichedShops.map((shop) => {
                const shopPhoto = getShopCoverImage(shop);

                return (
                  <TouchableOpacity
                    key={shop.id}
                    activeOpacity={0.88}
                    onPress={() => handleVisitShop(shop)}
                    className="bg-white rounded-2xl p-3.5 mb-3 border border-slate-200/80 shadow-2xs"
                  >
                    {/* Top Row: Shop Photo + Info */}
                    <View className="flex-row items-start">
                      {/* Shop Photo Thumbnail with dedicated right margin */}
                      <View className="mr-3.5">
                        <LazyImage
                          source={{ uri: shopPhoto }}
                          style={{ width: 68, height: 68, borderRadius: 14 }}
                          contentFit="cover"
                          loaderColor="#2563eb"
                        />
                      </View>

                      {/* Main Details */}
                      <View className="flex-1 min-w-0 justify-between">
                        <View className="flex-row items-center justify-between">
                          <Text
                            className="text-base font-bold text-slate-900 flex-1 mr-2"
                            numberOfLines={1}
                          >
                            {shop.name}
                          </Text>
                          {shop.isSponsored && (
                            <View className="bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-300 flex-row items-center justify-center shadow-2xs">
                              <Star size={10} color="#d97706" fill="#f59e0b" />
                            </View>
                          )}
                        </View>

                        {/* Category & Single-line location */}
                        <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                          <Text className="font-semibold text-slate-700">{shop.category || 'Retail'}</Text>
                          {shop.location ? ` • ${shop.location}` : ''}
                        </Text>

                        {/* Clean, Compact Distance Chip without redundant meter math */}
                        <View className="flex-row items-center mt-2 bg-blue-50/80 self-start px-2.5 py-0.5 rounded-md border border-blue-200/70">
                          <Navigation size={10} color="#2563eb" />
                          <Text className="text-[11px] font-bold text-blue-800 ml-1">
                            {shop.distance.awayText}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Action Strip */}
                    <View className="flex-row items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
                      {isShopPhoneEnabled && shop.phone && shop.showPhone !== false ? (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            if (!userToken) {
                              showError('Please sign in to call stores', 'Sign In Required');
                              router.push('/auth' as any);
                              return;
                            }
                            Linking.openURL(`tel:${shop.phone}`);
                          }}
                          className="bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 rounded-lg flex-row items-center"
                        >
                          <Phone size={12} color="#059669" />
                          <Text className="text-[11px] font-bold text-emerald-700 ml-1.5">
                            Call
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View />
                      )}

                      <View className="flex-row items-center gap-1.5">
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => handleOpenDirections(shop)}
                          className="bg-white border border-slate-200/90 px-2.5 py-1.5 rounded-lg flex-row items-center shadow-2xs"
                        >
                          <Image
                            source={require('../assets/images/google-maps.png')}
                            style={{ width: 14, height: 18 }}
                            resizeMode="contain"
                          />
                          <Text className="text-[11px] font-bold text-slate-700 ml-1.5">
                            Maps
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => handleVisitShop(shop)}
                          className="bg-blue-600 px-3 py-1.5 rounded-lg flex-row items-center"
                        >
                          <Text className="text-[11px] font-bold text-white mr-1">
                            Visit Shop
                          </Text>
                          <ArrowRight size={11} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Location Reference Selection Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl border border-slate-100">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-2.5">
                  <Navigation size={16} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-base font-bold text-slate-900">
                    Location & GPS
                  </Text>
                  <Text className="text-[11px] text-slate-500">
                    Choose distance calculation source
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={15} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Haveri Town Center (Default for local city viewing) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setShowLocationModal(false);
                switchToHaveri();
                showSuccess('Set reference to Haveri Town Center', 'Local View Active');
              }}
              className={`p-3.5 rounded-2xl mb-2.5 border flex-row items-center justify-between ${
                locationMode === 'haveri'
                  ? 'bg-blue-50/70 border-blue-500'
                  : 'bg-slate-50/80 border-slate-200'
              }`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                  <Store size={18} color="#059669" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900">
                    Haveri Town (Default Hub)
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    CityLinks commercial center (Shows stores from 40m - 600m)
                  </Text>
                </View>
              </View>
              {locationMode === 'haveri' && (
                <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                  <Check size={14} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Option 2: Live Device GPS */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                setShowLocationModal(false);
                await switchToLiveGPS();
                showSuccess(`Using live GPS (${rawDeviceLocality || locality})`, 'Live GPS Active');
              }}
              className={`p-3.5 rounded-2xl mb-4 border flex-row items-center justify-between ${
                locationMode === 'live'
                  ? 'bg-blue-50/70 border-blue-500'
                  : 'bg-slate-50/80 border-slate-200'
              }`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center mr-3">
                  <Crosshair size={18} color="#2563eb" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-slate-900">
                      Live Device GPS
                    </Text>
                    {isLiveGPS && (
                      <View className="w-2 h-2 rounded-full bg-emerald-500 ml-2" />
                    )}
                  </View>
                  <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>
                    Reading: <Text className="font-semibold text-slate-700">{rawDeviceLocality || locality}</Text>
                  </Text>
                </View>
              </View>
              {locationMode === 'live' && (
                <View className="w-6 h-6 rounded-full bg-blue-600 items-center justify-center">
                  <Check size={14} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Quick Actions */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                activeOpacity={0.75}
                disabled={loadingLocation}
                onPress={async () => {
                  await refreshLocation();
                  showSuccess('Synced live GPS satellite coordinates', 'Refreshed');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 items-center justify-center flex-row gap-1.5"
              >
                {loadingLocation ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <>
                    <Crosshair size={13} color="#475569" />
                    <Text className="text-xs font-semibold text-slate-700">
                      Refresh GPS
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowLocationModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 items-center justify-center"
              >
                <Text className="text-xs font-bold text-white">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
