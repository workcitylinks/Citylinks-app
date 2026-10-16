import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Wrench,
  Search,
  Phone,
  MapPin,
  X,
  CheckCircle,
  Maximize2,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { useApp } from '../context/AppContext';
import { useServices, ServiceItem } from '../queries/marketplaceQueries';
import { ImageEnlargeModal } from '../components/ui/ImageEnlargeModal';
import { getManualServiceCoverImage, DEMO_MANUAL_SERVICE_FALLBACK } from '../utils/serviceImages';
import { LazyImage } from '../components/ui/LazyImage';

// Redesigned Service Card with guaranteed image loading and graceful demo fallback
const ServiceCard = ({
  svc,
  onEnlarge,
  onCall,
}: {
  svc: ServiceItem;
  onEnlarge: (data: { url: string; title: string; subtitle: string; badge: string; price: string }) => void;
  onCall: (phone: string | null, providerName: string) => void;
}) => {
  const initialCover = getManualServiceCoverImage(svc);
  const [imgUri, setImgUri] = useState(initialCover);

  useEffect(() => {
    setImgUri(getManualServiceCoverImage(svc));
  }, [svc.imageUrl, svc.category, svc.title]);

  return (
    <View className="bg-white rounded-3xl mb-4.5 shadow-sm border border-slate-200/90 overflow-hidden">
      {/* Visual Image Preview with Tap to Enlarge */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          onEnlarge({
            url: imgUri,
            title: svc.title,
            subtitle: `By ${svc.providerName} • ${svc.location || 'Haveri Region'}`,
            badge: svc.category,
            price: svc.priceLabel,
          })
        }
        className="relative w-full h-[155px] bg-slate-100"
      >
        <LazyImage
          source={{ uri: imgUri }}
          onError={() => setImgUri(DEMO_MANUAL_SERVICE_FALLBACK)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          loaderColor="#2563eb"
        />

        {/* Top-Left Category Badge */}
        <View className="absolute top-3 left-3 bg-[#2563eb] px-3 py-1 rounded-full shadow-sm flex-row items-center border border-white/20">
          <Text className="text-[11px] font-extrabold text-white uppercase tracking-wider">
            {svc.category}
          </Text>
        </View>

        {/* Top-Right Tap to Enlarge Badge */}
        <View className="absolute top-3 right-3 bg-black/65 px-2.5 py-1 rounded-full flex-row items-center gap-1.5 border border-white/25">
          <Maximize2 size={11} color="#ffffff" />
          <Text className="text-[10px] font-bold text-white">Tap to Enlarge</Text>
        </View>

        {/* Bottom-Right Price Tag Pill */}
        <View className="absolute bottom-3 right-3 bg-white px-3 py-1.5 rounded-xl shadow-md border border-slate-100/80">
          <Text className="text-xs font-black text-[#2563eb]">
            {svc.priceLabel}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Card Content Area */}
      <View className="p-4">
        {/* Title */}
        <Text className="text-base font-extrabold text-slate-900 tracking-tight leading-snug mb-1.5">
          {svc.title}
        </Text>

        {/* Provider Details & Live Status */}
        <View className="flex-row items-center mb-2.5">
          <CheckCircle size={14} color="#2563eb" />
          <Text className="text-xs font-semibold text-slate-700 ml-1.5">
            By {svc.providerName}
          </Text>
          <Text className="text-slate-300 mx-2">·</Text>
          <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
            <Text className="text-[10px] font-extrabold text-emerald-700">Available</Text>
          </View>
        </View>

        {/* Scope / Description */}
        {svc.description ? (
          <Text className="text-xs text-slate-500 mb-3.5 leading-relaxed" numberOfLines={2}>
            {svc.description}
          </Text>
        ) : null}

        {/* Card Footer */}
        <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
          <View className="flex-row items-center flex-1 mr-2">
            <MapPin size={13} color="#64748b" />
            <Text className="text-xs text-slate-500 font-medium ml-1" numberOfLines={1}>
              {svc.location || 'Haveri Region'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onCall(svc.phone, svc.providerName)}
            className="bg-[#2563eb] flex-row items-center px-4 py-2.5 rounded-xl shadow-sm"
          >
            <Phone size={13} color="#ffffff" />
            <Text className="text-white font-bold text-xs ml-1.5">
              Book Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function BookServiceScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken } = useApp();
  const params = useLocalSearchParams<{ category?: string; filter?: string; service?: string }>();
  const initialCategoryParam = params.category || params.filter || params.service;

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategoryParam || 'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [enlargedImage, setEnlargedImage] = useState<{
    url: string;
    title: string;
    subtitle: string;
    badge: string;
    price: string;
  } | null>(null);

  // Hook handles caching, dynamic categories from DB, and debounced search
  const { services, categories, loading, refreshing, refetch } = useServices(selectedCategory, searchQuery);

  // Sync state if navigation params change
  useEffect(() => {
    if (params.service) {
      setSearchQuery(params.service.trim());
    }
    if (params.category) {
      setSelectedCategory(params.category.trim());
    } else if (params.filter) {
      setSelectedCategory(params.filter.trim());
    }
  }, [params.category, params.filter, params.service]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = () => {
    refetch({ force: true });
  };

  const handleCall = (phone: string | null, providerName: string) => {
    if (!userToken) {
      showError('Please sign in to contact service professionals', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }
    if (!phone) {
      showError('Contact number unavailable', 'Call Service');
      return;
    }
    showSuccess(`Connecting with ${providerName}...`, 'Calling Professional');
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Header with White Status Bar */}
      <SafeAreaView edges={['top']} className="bg-white">
        <View className="px-5 pt-3 pb-3 bg-white">
          {/* Back to Home & Title */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="flex-row items-center mb-3 self-start py-1"
          >
            <ArrowLeft size={18} color="#1e293b" />
            <Text className="ml-2 text-base font-semibold text-slate-800">
              Back to Home
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-1">
            <Wrench size={24} color="#2563eb" className="mr-2" />
            <Text className="text-2xl font-bold text-slate-900 tracking-tight ml-2">
              Book a Service
            </Text>
          </View>
          <Text className="text-slate-500 text-sm mt-0.5 mb-4">
            Find skilled professionals near you
          </Text>

          {/* Search Box matching attachment */}
          <View className="flex-row items-center bg-[#f8fafc] rounded-2xl px-4 h-12 border border-slate-200/80 mb-3.5">
            <Search size={18} color="#94a3b8" />
            <TextInput
              placeholder="Search services..."
              placeholderTextColor="#94a3b8"
              maxLength={60}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 text-slate-800 text-sm font-normal"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills matching attachment */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
            className="-mx-1 py-1"
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory.trim().toLowerCase() === cat.trim().toLowerCase();
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(isSelected ? 'All' : cat)}
                  className={`mx-1 px-4 py-2 rounded-full border ${
                    isSelected
                      ? 'bg-[#2563eb] border-[#2563eb]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f4f6fc]">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-500 text-xs mt-3">Loading available services...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {services.length === 0 ? (
              /* Empty state matching attachment */
              <View className="items-center justify-center py-20 px-6">
                <View className="w-20 h-20 items-center justify-center mb-4">
                  <Wrench size={64} color="#94a3b8" strokeWidth={1.5} />
                </View>
                <Text className="text-xl font-bold text-slate-800 text-center mb-2">
                  No services found
                </Text>
                <Text className="text-sm text-slate-500 text-center">
                  Try adjusting your search or filters
                </Text>
              </View>
            ) : (
              services.map((svc) => (
                <ServiceCard
                  key={svc.id}
                  svc={svc}
                  onEnlarge={setEnlargedImage}
                  onCall={handleCall}
                />
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>

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
