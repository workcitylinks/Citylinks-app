import { useMemo, useCallback } from 'react';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebounce } from '../hooks/useDebounce';
import { apiClient } from '../api/apiClient';
import { queryCache } from '../utils/queryCache';

// ----------------- Profile Types & Hook -----------------
export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  aadhaarNumber: string | null;
  panNumber: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export function useProfile(enabled: boolean = true) {
  const query = useApiQuery<UserProfile>('/auth/profile', {
    enabled,
    ttlMs: 60_000, // 1 minute client cache
    persist: false,
  });

  const updateProfile = async (formData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    aadhaarNumber?: string;
    panNumber?: string;
  }) => {
    const res = await apiClient.put('/auth/profile', formData);
    // Invalidate profile cache and update local query state immediately
    queryCache.invalidate('/auth/profile');
    if (res.data?.user) {
      query.mutate(res.data.user);
    }
    return res.data;
  };

  const deleteAccount = async () => {
    const res = await apiClient.delete('/auth/account');
    queryCache.clear();
    return res.data;
  };

  return {
    profile: query.data,
    loading: query.loading,
    refreshing: query.refreshing,
    error: query.error,
    refetch: query.refetch,
    updateProfile,
    deleteAccount,
  };
}

// ----------------- Shops Hook -----------------
export interface ProductItem {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stock: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  category: string;
  location: string;
  phone: string;
  email?: string | null;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  showPhone?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
  products?: ProductItem[];
}

export function useShops(rawQuery: string = '', category: string = 'All') {
  const debouncedQuery = useDebounce(rawQuery.trim(), 350);

  const params = useMemo(() => {
    const p: Record<string, any> = {};
    if (debouncedQuery) p.q = debouncedQuery;
    if (category && category !== 'All') p.category = category;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [debouncedQuery, category]);

  const query = useApiQuery<ShopItem[]>('/shops', {
    params,
    ttlMs: 60_000,
    persist: true,
  });

  const categoriesQuery = useApiQuery<string[]>('/shops/categories', {
    ttlMs: 300_000,
    persist: true,
  });

  const refetch = async (opts?: { force?: boolean }) => {
    await Promise.all([
      query.refetch(opts),
      categoriesQuery.refetch(opts),
    ]);
  };

  return {
    shops: query.data || [],
    categories: categoriesQuery.data || ['All', 'Apparel', 'Automobile', 'Electronics', 'Groceries', 'Retail', 'Hardware'],
    loading: query.loading,
    refreshing: query.refreshing || categoriesQuery.refreshing,
    error: query.error || categoriesQuery.error,
    refetch,
  };
}

export function useShopDetail(shopId: string) {
  const query = useApiQuery<ShopItem>(shopId ? `/shops/${shopId}` : '/shops', {
    ttlMs: 60_000,
    persist: true,
  });

  return {
    shop: query.data || null,
    loading: query.loading,
    refreshing: query.refreshing,
    error: query.error,
    refetch: query.refetch,
  };
}

// ----------------- Services Hook -----------------
export interface ServiceItem {
  id: string;
  title: string;
  category: string;
  providerName: string;
  phone: string | null;
  rating: number;
  priceLabel: string;
  location: string;
  description: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
}

export function useServices(category: string = 'All', rawQuery: string = '') {
  const debouncedQuery = useDebounce(rawQuery.trim(), 350);

  const params = useMemo(() => {
    const p: Record<string, any> = {};
    if (category && category !== 'All') p.category = category;
    if (debouncedQuery) p.q = debouncedQuery;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [category, debouncedQuery]);

  const query = useApiQuery<ServiceItem[]>('/services', {
    params,
    ttlMs: 120_000,
    persist: true,
  });

  const categoriesQuery = useApiQuery<string[]>('/services/categories', {
    ttlMs: 300_000,
    persist: true,
  });

  const refetch = async (opts?: { force?: boolean }) => {
    await Promise.all([
      query.refetch(opts),
      categoriesQuery.refetch(opts),
    ]);
  };

  return {
    services: query.data || [],
    categories: categoriesQuery.data || ['All', 'Plumbing', 'Electrician', 'Cleaning', 'Painting', 'Salon', 'Carpentry', 'General', 'Others'],
    loading: query.loading || categoriesQuery.loading,
    refreshing: query.refreshing || categoriesQuery.refreshing,
    error: query.error || categoriesQuery.error,
    refetch,
  };
}

// ----------------- Transport Hook -----------------
export interface TransportProviderItem {
  id: string;
  name: string;
  type: 'passenger' | 'commercial';
  vehicleType: string;
  phone: string;
  location: string;
  fareLabel: string;
  eta: string;
  rating: number;
  isAvailable: boolean;
}

export interface VehicleCategoryItem {
  id: string;
  name: string;
  desc: string;
  fare: string;
  eta: string;
  type: 'passenger' | 'commercial';
  iconName: string;
}

export interface DigitalServiceProviderItem {
  id: string;
  name: string;
  serviceType: string;
  phone: string | null;
  rating: number;
  priceLabel: string;
  location: string;
  description: string | null;
  isAvailable: boolean;
  badge: string | null;
  imageUrl?: string | null;
}

export function useTransport(
  type: 'passenger' | 'commercial',
  rawQuery: string = '',
  vehicleType: string = 'All'
) {
  const debouncedQuery = useDebounce(rawQuery.trim(), 350);

  const providerParams = useMemo(() => {
    const p: Record<string, any> = { type };
    if (debouncedQuery) p.q = debouncedQuery;
    if (vehicleType && vehicleType !== 'All') p.vehicleType = vehicleType;
    return p;
  }, [type, debouncedQuery, vehicleType]);

  const categoryParams = useMemo(() => ({ type }), [type]);

  const providersQuery = useApiQuery<TransportProviderItem[]>('/transport', {
    params: providerParams,
    ttlMs: 120_000,
    persist: true,
  });

  const categoriesQuery = useApiQuery<VehicleCategoryItem[]>('/transport/categories', {
    params: categoryParams,
    ttlMs: 300_000, // Categories change rarely, 5 minutes TTL
    persist: true,
  });

  const refetch = async (opts?: { force?: boolean }) => {
    await Promise.all([
      providersQuery.refetch(opts),
      categoriesQuery.refetch(opts),
    ]);
  };

  return {
    providers: providersQuery.data || [],
    categories: categoriesQuery.data || [],
    loading: providersQuery.loading || categoriesQuery.loading,
    refreshing: providersQuery.refreshing || categoriesQuery.refreshing,
    error: providersQuery.error || categoriesQuery.error,
    refetch,
  };
}

// ----------------- Deals Hook -----------------
export interface DealItem {
  id: string;
  title: string;
  discount: string;
  category: string;
  merchantName: string;
  validUntil: string | null;
  linkUrl: string | null;
  imageUrl?: string | null;
  isActive: boolean;
}

export function useDeals(category: string = 'All', rawQuery: string = '') {
  const debouncedQuery = useDebounce(rawQuery.trim(), 350);

  const params = useMemo(() => {
    const p: Record<string, any> = {};
    if (category && category !== 'All') p.category = category;
    if (debouncedQuery) p.q = debouncedQuery;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [category, debouncedQuery]);

  const query = useApiQuery<DealItem[]>('/deals', {
    params,
    ttlMs: 180_000, // 3 minutes TTL
    persist: true,
  });

  return {
    deals: query.data || [],
    loading: query.loading,
    refreshing: query.refreshing,
    error: query.error,
    refetch: query.refetch,
  };
}

// ----------------- Digital Services Hook -----------------
export function useDigitalServices(rawQuery: string = '') {
  const debouncedQuery = useDebounce(rawQuery.trim(), 350);

  const params = useMemo(() => {
    return debouncedQuery ? { q: debouncedQuery } : undefined;
  }, [debouncedQuery]);

  const query = useApiQuery<DigitalServiceItem[]>('/marketplace/digital-services', {
    params,
    ttlMs: 300_000, // 5 min TTL
    persist: true,
  });

  return {
    digitalServices: query.data || [],
    loading: query.loading,
    refreshing: query.refreshing,
    error: query.error,
    refetch: query.refetch,
  };
}

// ----------------- Digital Service Providers Hook (People who provide digital services) -----------------
export function useDigitalProviders(serviceType: string = 'All', rawQuery: string = '') {
  const debouncedQuery = useDebounce(rawQuery.trim(), 350);

  const params = useMemo(() => {
    const p: Record<string, any> = {};
    if (serviceType && serviceType !== 'All') p.category = serviceType;
    if (debouncedQuery) p.q = debouncedQuery;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [serviceType, debouncedQuery]);

  const query = useApiQuery<DigitalServiceProviderItem[]>('/marketplace/digital-providers', {
    params,
    ttlMs: 120_000,
    persist: true,
  });

  return {
    providers: query.data || [],
    loading: query.loading,
    refreshing: query.refreshing,
    error: query.error,
    refetch: query.refetch,
  };
}

// ----------------- Marketplace Home Hook -----------------
export interface PopularItem {
  id?: string;
  name?: string;
  category?: string;
  location?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  _count?: { products: number };
  entity_type: 'product' | 'service' | 'transport' | 'shop';
  entity_id: string;
  title: string;
  subtitle: string;
  link_url: string;
  badge: string;
  price_label: string | null;
  popularity: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
}

export interface DigitalServiceItem {
  id: string;
  name: string;
  desc: string;
  badge: string | null;
  color: string;
  iconName: string;
}

export interface CategoryTileItem {
  id: string;
  name: string;
  type: string;
  color: string;
  iconName: string;
}

export interface FeaturedServiceItem {
  id: string;
  title?: string;
  name: string;
  category?: string;
  providerName?: string;
  provider: string;
  phone?: string | null;
  rating: number;
  reviewCount?: number;
  reviews: number;
  priceLabel?: string;
  price: string;
  location?: string;
  description?: string | null;
  isFeatured?: boolean;
  isPopular?: boolean;
  isSponsored?: boolean;
  tag: string;
  emoji: string;
}

const POPULAR_QUERY_PARAMS = { limit: 20 };

export function useMarketplaceHome(preloadedPopular: PopularItem[] = []) {
  const popularQuery = useApiQuery<PopularItem[]>('/marketplace/popular', {
    params: POPULAR_QUERY_PARAMS,
    ttlMs: 5_000,
    initialData: preloadedPopular.length > 0 ? preloadedPopular : undefined,
    persist: false,
  });

  const digitalQuery = useApiQuery<DigitalServiceItem[]>('/marketplace/digital-services', {
    ttlMs: 300_000, // 5 min TTL
    persist: true,
  });

  const tilesQuery = useApiQuery<CategoryTileItem[]>('/marketplace/category-tiles', {
    ttlMs: 300_000, // 5 min TTL
    persist: true,
  });

  const featuredQuery = useApiQuery<FeaturedServiceItem[]>('/marketplace/featured-services', {
    ttlMs: 5_000,
    persist: false,
  });

  const tiles = tilesQuery.data || [];
  const serviceTiles = useMemo(() => tiles.filter((t) => t.type === 'service_tile'), [tiles]);
  const shopCategories = useMemo(() => tiles.filter((t) => t.type === 'shop_category'), [tiles]);

  const { refetch: refetchPopular } = popularQuery;
  const { refetch: refetchDigital } = digitalQuery;
  const { refetch: refetchTiles } = tilesQuery;
  const { refetch: refetchFeatured } = featuredQuery;

  const refetch = useCallback(async (opts?: { force?: boolean }) => {
    await Promise.all([
      refetchPopular(opts),
      refetchDigital(opts),
      refetchTiles(opts),
      refetchFeatured(opts),
    ]);
  }, [refetchPopular, refetchDigital, refetchTiles, refetchFeatured]);

  return {
    popularItems: popularQuery.data !== null ? popularQuery.data : preloadedPopular,
    digitalServices: digitalQuery.data || [],
    serviceTiles,
    shopCategories,
    featuredServices: featuredQuery.data || [],
    loading: popularQuery.loading && (preloadedPopular.length === 0),
    refreshing: popularQuery.refreshing || digitalQuery.refreshing || tilesQuery.refreshing || featuredQuery.refreshing,
    refetch,
  };
}

// ----------------- Join Requests Hook (Super Admin & Users) -----------------
export interface JoinRequestItem {
  id: string;
  userId: string;
  shopName: string;
  description: string;
  role: 'MERCHANT' | 'MANUAL_SERVICE_PROVIDER' | 'DIGITAL_SERVICE_PROVIDER' | 'LABOR' | 'TRANSPORT';
  serviceType?: string | null;
  customService?: string | null;
  location: string;
  phone: string;
  email: string;
  imageUrl?: string | null;
  drivingLicense?: string | null;
  drivingLicensePhoto?: string | null;
  aadhaarNumber?: string | null;
  aadhaarPhoto?: string | null;
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
  vehicleType?: string | null;
  ratePerKm?: number | null;
  baseFare?: number | null;
  vehiclesJson?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    role: string;
  };
}

export function useJoinRequests(status?: string) {
  const params = useMemo(() => (status && status !== 'ALL' ? { status } : {}), [status]);
  const query = useApiQuery<JoinRequestItem[]>('/join-requests', {
    params,
    ttlMs: 0,
    persist: false,
  });

  return {
    requests: query.data || [],
    loading: query.loading,
    refreshing: query.refreshing,
    error: query.error,
    refetch: query.refetch,
  };
}

