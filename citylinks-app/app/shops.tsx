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
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { LazyImage } from '../components/ui/LazyImage';
import { useShops, ShopItem } from '../queries/marketplaceQueries';
import { useUserLocation } from '../hooks/useUserLocation';
import { computeShopDistance, FormattedDistance } from '../utils/distance';
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
  } = useUserLocation();

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
      list.sort((a, b) => a.distance.meters - b.distance.meters);
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
              onPress={() => {
                refreshLocation();
                showSuccess('Refreshed GPS location', 'Synced');
              }}
              disabled={loadingLocation}
              className="flex-row items-center bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full"
            >
              <View
                className={`w-2 h-2 rounded-full ${
                  isLiveGPS ? 'bg-emerald-500' : 'bg-amber-500'
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
                      {/* Shop Photo Thumbnail */}
                      <LazyImage
                        source={{ uri: shopPhoto }}
                        style={{ width: 64, height: 64, borderRadius: 12, marginRight: 12 }}
                        contentFit="cover"
                        loaderColor="#2563eb"
                      />

                      {/* Main Details */}
                      <View className="flex-1 pr-1">
                        <View className="flex-row items-center justify-between">
                          <Text
                            className="text-base font-bold text-slate-900 flex-1 mr-1.5"
                            numberOfLines={1}
                          >
                            {shop.name}
                          </Text>
                          <View className="flex-row items-center gap-1">
                            {shop.isSponsored && (
                              <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                                <Text className="text-[10px] font-bold text-amber-800">
                                  ⭐ Sponsored
                                </Text>
                              </View>
                            )}
                            <View className="bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              <Text className="text-[10px] font-bold text-blue-600">
                                {shop.status || 'Verified'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Category & Single-line location */}
                        <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                          <Text className="font-semibold text-slate-700">{shop.category || 'Retail'}</Text>
                          {shop.location ? ` • ${shop.location}` : ''}
                        </Text>

                        {/* Clean, Compact Distance Chip in meters and kilometers */}
                        <View className="flex-row items-center mt-1.5 bg-blue-50/80 self-start px-2 py-0.5 rounded-md border border-blue-200/70">
                          <Navigation size={10} color="#2563eb" />
                          <Text className="text-[11px] font-bold text-blue-800 ml-1">
                            {shop.distance.meters < 1000
                              ? `${shop.distance.meters} m (${shop.distance.kmText}) away`
                              : `${shop.distance.kmText} (${shop.distance.metersText}) away`}
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
    </View>
  );
}
