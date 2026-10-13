import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Sparkles,
  Store,
  Wrench,
  Search,
  Check,
  X,
  RefreshCw,
  Star,
  MapPin,
  Phone,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { queryCache } from '../utils/queryCache';
import { getShopCoverImage } from './shop-detail';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';

export interface ShopRecord {
  id: string;
  name: string;
  category: string;
  location: string;
  address?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  status?: string | null;
  isPopular?: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
  imageUrl?: string | null;
}

export interface ServiceRecord {
  id: string;
  title: string;
  category: string;
  providerName: string;
  phone?: string | null;
  priceLabel?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  location?: string | null;
  isFeatured?: boolean;
  isPopular?: boolean;
  isSponsored?: boolean;
}

export default function AdminSponsoredScreen() {
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'shops' | 'services'>('shops');
  const [filterType, setFilterType] = useState<'all' | 'sponsored' | 'featured' | 'regular'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [shops, setShops] = useState<ShopRecord[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Fetch all shops and services for super admin
  const fetchData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const [shopsRes, servicesRes] = await Promise.all([
        apiClient.get('/shops'),
        apiClient.get('/services'),
      ]);

      if (shopsRes.data) {
        setShops(shopsRes.data);
      }
      if (servicesRes.data) {
        setServices(servicesRes.data);
      }
    } catch (err: any) {
      console.error('Error fetching admin data for listings:', err);
      showError('Failed to load listings', 'Network Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // Toggle shop sponsored status
  const handleToggleShopSponsored = async (shop: ShopRecord) => {
    try {
      setTogglingId(shop.id);
      const currentVal = Boolean(shop.isSponsored);
      const nextVal = !currentVal;

      const res = await apiClient.patch(`/shops/${shop.id}/toggle-sponsored`, {
        isSponsored: nextVal,
      });

      if (res.data?.success) {
        setShops((prev) =>
          prev.map((s) =>
            s.id === shop.id ? { ...s, isSponsored: nextVal, isPopular: nextVal } : s
          )
        );

        // Flush all mobile caches so Homepage & listings update instantaneously
        try {
          queryCache.clear();
        } catch (e) {}

        if (nextVal) {
          showSuccess(`"${shop.name}" is now SPONSORED on homepage!`, 'Shop Promoted');
        } else {
          showSuccess(`"${shop.name}" removed from sponsored shops.`, 'Status Updated');
        }
      }
    } catch (err: any) {
      console.error('Error toggling shop sponsored status:', err);
      showError('Could not update shop sponsored status', 'Error');
    } finally {
      setTogglingId(null);
    }
  };

  // Toggle service sponsored status
  const handleToggleServiceSponsored = async (service: ServiceRecord) => {
    try {
      setTogglingId(`spon_${service.id}`);
      const currentVal = Boolean(service.isSponsored);
      const nextVal = !currentVal;

      const res = await apiClient.patch(`/services/${service.id}/toggle-sponsored`, {
        isSponsored: nextVal,
      });

      if (res.data?.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === service.id ? { ...s, isSponsored: nextVal } : s
          )
        );

        // Flush all mobile caches so Homepage & listings update instantaneously
        try {
          queryCache.clear();
        } catch (e) {}

        if (nextVal) {
          showSuccess(`"${service.title}" is now SPONSORED!`, 'Service Promoted');
        } else {
          showSuccess(`"${service.title}" removed from sponsored services.`, 'Status Updated');
        }
      }
    } catch (err: any) {
      console.error('Error toggling service sponsored status:', err);
      showError('Could not update service sponsored status', 'Error');
    } finally {
      setTogglingId(null);
    }
  };

  // Toggle service featured status
  const handleToggleServiceFeatured = async (service: ServiceRecord) => {
    try {
      setTogglingId(`feat_${service.id}`);
      const currentVal = Boolean(service.isFeatured);
      const nextVal = !currentVal;

      const res = await apiClient.patch(`/services/${service.id}/toggle-featured`, {
        isFeatured: nextVal,
      });

      if (res.data?.success) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === service.id ? { ...s, isFeatured: nextVal } : s
          )
        );

        // Flush all mobile caches so Homepage & listings update instantaneously
        try {
          queryCache.clear();
        } catch (e) {}

        if (nextVal) {
          showSuccess(`"${service.title}" added to Featured Services!`, 'Featured Active');
        } else {
          showSuccess(`"${service.title}" removed from Featured Services.`, 'Status Updated');
        }
      }
    } catch (err: any) {
      console.error('Error toggling service featured status:', err);
      showError('Could not update service featured status', 'Error');
    } finally {
      setTogglingId(null);
    }
  };

  // Filtered Shops
  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shops.filter((s) => {
      const isSpon = Boolean(s.isSponsored);
      if (filterType === 'sponsored' && !isSpon) return false;
      if (filterType === 'regular' && isSpon) return false;

      if (!q) return true;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q)
      );
    });
  }, [shops, filterType, searchQuery]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      const isSpon = Boolean(s.isSponsored);
      const isFeat = Boolean(s.isFeatured);
      if (filterType === 'sponsored' && !isSpon) return false;
      if (filterType === 'featured' && !isFeat) return false;
      if (filterType === 'regular' && (isSpon || isFeat)) return false;

      if (!q) return true;
      return (
        s.title?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.providerName?.toLowerCase().includes(q)
      );
    });
  }, [services, filterType, searchQuery]);

  const sponsoredShopsCount = useMemo(
    () => shops.filter((s) => Boolean(s.isSponsored)).length,
    [shops]
  );
  const sponsoredServicesCount = useMemo(
    () => services.filter((s) => Boolean(s.isSponsored)).length,
    [services]
  );
  const featuredServicesCount = useMemo(
    () => services.filter((s) => Boolean(s.isFeatured)).length,
    [services]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Sparkles size={17} color="#d97706" />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Sponsored & Featured
              </Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Super Admin Console • Homepage
            </Text>
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            style={styles.refreshButton}
          >
            <RefreshCw size={17} color="#d97706" />
          </TouchableOpacity>
        </View>

        {/* Stats Summary Bar - 3 balanced metric pill tiles */}
        <View style={styles.statsBar}>
          {/* Tile 1: Shops Sponsored */}
          <View style={styles.statTile}>
            <View style={[styles.statDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.statCount}>{sponsoredShopsCount}/{shops.length}</Text>
            <Text style={styles.statLabel}>Shops Spon.</Text>
          </View>

          {/* Tile 2: Services Sponsored */}
          <View style={styles.statTile}>
            <View style={[styles.statDot, { backgroundColor: '#d97706' }]} />
            <Text style={styles.statCount}>{sponsoredServicesCount}/{services.length}</Text>
            <Text style={styles.statLabel}>Serv. Spon.</Text>
          </View>

          {/* Tile 3: Featured Services */}
          <View style={styles.statTile}>
            <View style={[styles.statDot, { backgroundColor: '#2563eb' }]} />
            <Text style={[styles.statCount, { color: '#1d4ed8' }]}>{featuredServicesCount}/{services.length}</Text>
            <Text style={styles.statLabel}>Featured</Text>
          </View>
        </View>

        {/* Segmented Tab Bar (Shops vs Services) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setActiveTab('shops');
              if (filterType === 'featured') setFilterType('all');
            }}
            style={[
              styles.tabButton,
              { marginRight: 8 },
              activeTab === 'shops' ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
          >
            <Store size={16} color={activeTab === 'shops' ? '#ffffff' : '#64748b'} />
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'shops' ? '#ffffff' : '#475569' },
              ]}
            >
              Shops ({shops.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('services')}
            style={[
              styles.tabButton,
              activeTab === 'services' ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
          >
            <Wrench size={16} color={activeTab === 'services' ? '#ffffff' : '#64748b'} />
            <Text
              style={[
                styles.tabButtonText,
                { color: activeTab === 'services' ? '#ffffff' : '#475569' },
              ]}
            >
              Services ({services.length})
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'shops'
                ? 'Search shop name, category, location...'
                : 'Search service, provider, category...'
            }
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
          style={styles.filterScrollView}
        >
          {(activeTab === 'shops'
            ? (['all', 'sponsored', 'regular'] as const)
            : (['all', 'sponsored', 'featured', 'regular'] as const)
          ).map((ft) => {
            const isActive = filterType === ft;
            const label =
              ft === 'all'
                ? 'All Listings'
                : ft === 'sponsored'
                ? '⭐ Sponsored'
                : ft === 'featured'
                ? '✨ Featured'
                : 'Regular';
            return (
              <TouchableOpacity
                key={ft}
                activeOpacity={0.75}
                onPress={() => setFilterType(ft)}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? '#ffffff' : '#475569' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#d97706" />
            <Text style={styles.loaderText}>Loading listings...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50, paddingTop: 2 }}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {activeTab === 'shops' ? (
              // SHOPS LIST: Styled exactly like Nearby Shops list format with image thumbnail
              filteredShops.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Store size={36} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No shops match filter</Text>
                  <Text style={styles.emptySubtitle}>
                    Try adjusting search query or filter options.
                  </Text>
                </View>
              ) : (
                filteredShops.map((shop) => {
                  const isSpon = Boolean(shop.isSponsored);
                  const isProcessing = togglingId === shop.id;
                  const shopCover = getShopCoverImage(shop);

                  return (
                    <View
                      key={shop.id}
                      style={[
                        styles.shopCard,
                        isSpon ? styles.shopCardSponsored : styles.shopCardRegular,
                      ]}
                    >
                      {/* Top Row: Shop Photo Thumbnail + Details + Badges */}
                      <View style={styles.shopCardTopRow}>
                        {/* Photo Thumbnail with Fallback */}
                        <View style={styles.shopThumbnail}>
                          <View style={styles.thumbnailFallback}>
                            <Store size={24} color="#94a3b8" />
                          </View>
                          {shopCover ? (
                            <Image
                              source={{ uri: shopCover }}
                              style={StyleSheet.absoluteFill}
                              resizeMode="cover"
                            />
                          ) : null}
                        </View>

                        {/* Shop Info Details */}
                        <View style={styles.shopInfoCol}>
                          <View style={styles.shopTitleRow}>
                            <Text style={styles.shopName} numberOfLines={1}>
                              {shop.name}
                            </Text>
                          </View>

                          {/* Category and Location */}
                          <Text style={styles.shopMeta} numberOfLines={1}>
                            <Text style={styles.shopCategoryHighlight}>{shop.category || 'Retail'}</Text>
                            {shop.location ? ` • ${shop.location}` : ''}
                          </Text>

                          {/* Contact Info (if available) */}
                          {shop.phone ? (
                            <View style={styles.shopDetailsRow}>
                              <Phone size={11} color="#64748b" style={{ marginRight: 4 }} />
                              <Text style={styles.shopPhone} numberOfLines={1}>
                                {shop.phone}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Bottom Action Strip: Status Badge on left, Toggle Button on right */}
                      <View style={styles.shopCardFooter}>
                        {/* Status Badge */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={[
                              styles.badge,
                              isSpon ? styles.badgeSponsored : styles.badgeRegular,
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: isSpon ? '#92400e' : '#64748b' },
                              ]}
                            >
                              {isSpon ? '⭐ SPONSORED' : 'REGULAR'}
                            </Text>
                          </View>

                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedBadgeText}>
                              {shop.status || 'Verified'}
                            </Text>
                          </View>
                        </View>

                        {/* SPONSORED TOGGLE BUTTON */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          disabled={isProcessing}
                          onPress={() => handleToggleShopSponsored(shop)}
                          style={[
                            styles.toggleBtn,
                            isSpon ? styles.toggleBtnActive : styles.toggleBtnInactive,
                          ]}
                        >
                          {isProcessing ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : isSpon ? (
                            <>
                              <Check size={13} color="#ffffff" />
                              <Text style={styles.toggleBtnText}>Sponsored (Active)</Text>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} color="#f59e0b" />
                              <Text style={styles.toggleBtnText}>Make Sponsored</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )
            ) : (
              // SERVICES LIST: Styled with proper alignment, dual toggle buttons
              filteredServices.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Wrench size={36} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>No services match filter</Text>
                  <Text style={styles.emptySubtitle}>
                    Try adjusting search query or filter options.
                  </Text>
                </View>
              ) : (
                filteredServices.map((service) => {
                  const isSpon = Boolean(service.isSponsored);
                  const isFeat = Boolean(service.isFeatured);
                  const isProcessingSpon = togglingId === `spon_${service.id}`;
                  const isProcessingFeat = togglingId === `feat_${service.id}`;

                  return (
                    <View
                      key={service.id}
                      style={[
                        styles.serviceCard,
                        isSpon
                          ? styles.serviceCardSponsored
                          : isFeat
                          ? styles.serviceCardFeatured
                          : styles.serviceCardRegular,
                      ]}
                    >
                      {/* Top Header: Icon + Info */}
                      <View style={styles.serviceHeaderRow}>
                        <View
                          style={[
                            styles.serviceIconBox,
                            isSpon
                              ? styles.serviceIconSponsored
                              : isFeat
                              ? styles.serviceIconFeatured
                              : styles.serviceIconRegular,
                          ]}
                        >
                          <Wrench
                            size={18}
                            color={isSpon ? '#b45309' : isFeat ? '#2563eb' : '#475569'}
                          />
                        </View>

                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.serviceTitle} numberOfLines={1}>
                            {service.title}
                          </Text>
                          <Text style={styles.serviceSubtitle} numberOfLines={1}>
                            <Text style={{ fontWeight: '700', color: '#334155' }}>
                              {service.category}
                            </Text>
                            {service.providerName ? ` • By ${service.providerName}` : ''}
                          </Text>
                        </View>

                        {/* Badges on Top Right */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {isSpon && (
                            <View style={[styles.badge, styles.badgeSponsored]}>
                              <Text style={[styles.badgeText, { color: '#92400e' }]}>
                                ⭐ SPONSORED
                              </Text>
                            </View>
                          )}
                          {isFeat && (
                            <View style={[styles.badge, styles.badgeFeatured]}>
                              <Text style={[styles.badgeText, { color: '#1e40af' }]}>
                                ✨ FEATURED
                              </Text>
                            </View>
                          )}
                          {!isSpon && !isFeat && (
                            <View style={[styles.badge, styles.badgeRegular]}>
                              <Text style={[styles.badgeText, { color: '#64748b' }]}>
                                REGULAR
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Footer Info & Dual Action Buttons */}
                      <View style={styles.serviceFooterRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.servicePrice}>
                            {service.priceLabel || 'Affordable'}
                          </Text>
                        </View>

                        {/* Dual Toggle Action Buttons */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* 1. Toggle Sponsored */}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            disabled={isProcessingSpon || isProcessingFeat}
                            onPress={() => handleToggleServiceSponsored(service)}
                            style={[
                              styles.actionBtn,
                              isSpon ? styles.actionBtnSponActive : styles.actionBtnSponInactive,
                            ]}
                          >
                            {isProcessingSpon ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : isSpon ? (
                              <>
                                <Check size={12} color="#ffffff" />
                                <Text style={styles.actionBtnText}>Sponsored</Text>
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} color="#f59e0b" />
                                <Text style={styles.actionBtnText}>+ Spon</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          {/* 2. Toggle Featured */}
                          <TouchableOpacity
                            activeOpacity={0.8}
                            disabled={isProcessingSpon || isProcessingFeat}
                            onPress={() => handleToggleServiceFeatured(service)}
                            style={[
                              styles.actionBtn,
                              isFeat ? styles.actionBtnFeatActive : styles.actionBtnFeatInactive,
                            ]}
                          >
                            {isProcessingFeat ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : isFeat ? (
                              <>
                                <Check size={12} color="#ffffff" />
                                <Text style={styles.actionBtnText}>Featured</Text>
                              </>
                            ) : (
                              <>
                                <Star size={12} color="#93c5fd" />
                                <Text style={styles.actionBtnText}>+ Feat</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSafeArea: {
    backgroundColor: '#ffffff',
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fffbeb',
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    gap: 8,
  },
  statTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#f59e0b',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonInactive: {
    backgroundColor: '#f1f5f9',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 8,
    paddingVertical: 0,
  },
  filterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
    height: 38,
    marginBottom: 8,
  },
  filterPillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    height: 38,
  },
  filterPill: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterPillInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 16,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loaderText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 12,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },

  /* NEARBY SHOP CARD FORMAT */
  shopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  shopCardSponsored: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffdf5',
  },
  shopCardRegular: {
    borderColor: '#e2e8f0',
  },
  shopCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  shopMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  shopCategoryHighlight: {
    fontWeight: '700',
    color: '#334155',
  },
  shopDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  shopRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  shopDot: {
    color: '#cbd5e1',
    marginHorizontal: 5,
  },
  shopPhone: {
    fontSize: 11,
    color: '#64748b',
  },
  shopCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  verifiedBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },

  /* SERVICE CARD FORMAT */
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceCardSponsored: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffdf5',
  },
  serviceCardFeatured: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8faff',
  },
  serviceCardRegular: {
    borderColor: '#e2e8f0',
  },
  serviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  serviceIconSponsored: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  serviceIconFeatured: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  serviceIconRegular: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  serviceSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  serviceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  serviceDot: {
    color: '#cbd5e1',
    marginHorizontal: 5,
  },
  serviceRating: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  /* COMMON BADGES & BUTTONS */
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeSponsored: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  badgeFeatured: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  badgeRegular: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  toggleBtnInactive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 3,
  },
  actionBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnSponActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  actionBtnSponInactive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  actionBtnFeatActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  actionBtnFeatInactive: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 3,
  },
});
