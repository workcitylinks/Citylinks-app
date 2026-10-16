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
  Laptop,
  Search,
  Globe,
  FileText,
  Palette,
  Target,
  Server,
  TrendingUp,
  Users,
  Megaphone,
  X,
  MapPin,
  Phone,
  Sparkles,
  MoreHorizontal,
  Briefcase,
  Maximize2,
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { ImageEnlargeModal } from '../components/ui/ImageEnlargeModal';
import { getDigitalServiceCoverImage, DEMO_DIGITAL_SERVICE_FALLBACK } from '../utils/serviceImages';
import { LazyImage } from '../components/ui/LazyImage';
import {
  useDigitalServices,
  useDigitalProviders,
  DigitalServiceItem,
  DigitalServiceProviderItem,
} from '../queries/marketplaceQueries';

// Redesigned Digital Specialist Card with guaranteed demo fallback
const DigitalProviderCard = ({
  provider,
  onEnlarge,
  onCall,
}: {
  provider: DigitalServiceProviderItem;
  onEnlarge: (data: { url: string; title: string; subtitle: string; badge: string; price: string }) => void;
  onCall: (phone: string | null, name: string) => void;
}) => {
  const initialCover = getDigitalServiceCoverImage(provider);
  const [imgUri, setImgUri] = useState(initialCover);

  useEffect(() => {
    setImgUri(getDigitalServiceCoverImage(provider));
  }, [provider.imageUrl, provider.serviceType, provider.name]);

  return (
    <View className="bg-white rounded-3xl mb-4.5 shadow-sm border border-slate-200/90 overflow-hidden">
      {/* Visual Image Preview with Tap to Enlarge */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          onEnlarge({
            url: imgUri,
            title: provider.name,
            subtitle: `${provider.serviceType} • ${provider.location || 'Haveri Region'}`,
            badge: provider.badge || 'Verified Specialist',
            price: provider.priceLabel,
          })
        }
        className="relative w-full h-[155px] bg-slate-100"
      >
        <LazyImage
          source={{ uri: imgUri }}
          onError={() => setImgUri(DEMO_DIGITAL_SERVICE_FALLBACK)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          loaderColor="#7c3aed"
        />

        {/* Top-Left Category Badge */}
        <View className="absolute top-3 left-3 bg-[#7c3aed] px-3 py-1 rounded-full shadow-sm flex-row items-center border border-white/20">
          <Text className="text-[11px] font-extrabold text-white uppercase tracking-wider">
            {provider.serviceType}
          </Text>
        </View>

        {/* Top-Right Tap to Enlarge Badge */}
        <View className="absolute top-3 right-3 bg-black/65 px-2.5 py-1 rounded-full flex-row items-center gap-1.5 border border-white/25">
          <Maximize2 size={11} color="#ffffff" />
          <Text className="text-[10px] font-bold text-white">Tap to Enlarge</Text>
        </View>

        {/* Bottom-Right Price Tag Pill */}
        <View className="absolute bottom-3 right-3 bg-white px-3 py-1.5 rounded-xl shadow-md border border-slate-100/80">
          <Text className="text-xs font-black text-[#7c3aed]">
            {provider.priceLabel}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Card Content Area */}
      <View className="p-4">
        {/* Name */}
        <Text className="text-base font-extrabold text-slate-900 tracking-tight leading-snug mb-1.5">
          {provider.name}
        </Text>

        {/* Trust Badge & Live Status */}
        <View className="flex-row items-center mb-2.5">
          <View className="bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 mr-2">
            <Text className="text-[10px] font-bold text-[#7c3aed]">
              {provider.badge || 'Verified Specialist'}
            </Text>
          </View>
          <Text className="text-slate-300 mx-1">·</Text>
          <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
            <Text className="text-[10px] font-extrabold text-emerald-700">Available</Text>
          </View>
        </View>

        {/* Deliverables / Scope */}
        {provider.description ? (
          <Text className="text-xs text-slate-500 mb-3.5 leading-relaxed" numberOfLines={2}>
            {provider.description}
          </Text>
        ) : null}

        {/* Card Footer */}
        <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
          <View className="flex-row items-center flex-1 mr-2">
            <MapPin size={13} color="#64748b" />
            <Text className="text-xs text-slate-500 font-medium ml-1" numberOfLines={1}>
              {provider.location || 'Haveri Region'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onCall(provider.phone, provider.name)}
            className="bg-[#7c3aed] flex-row items-center px-4 py-2.5 rounded-xl shadow-sm"
          >
            <Phone size={13} color="#ffffff" />
            <Text className="text-white font-bold text-xs ml-1.5">
              Contact Pro
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const ICON_MAP: Record<string, any> = {
  Globe,
  FileText,
  Palette,
  Target,
  Server,
  TrendingUp,
  Users,
  Megaphone,
  Laptop,
  MoreHorizontal,
};

export default function DigitalServicesScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken } = useApp();
  const params = useLocalSearchParams<{ service?: string; filter?: string; category?: string }>();
  const initialParam = params.service || params.filter || params.category;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>(initialParam || 'All');
  const [enlargedImage, setEnlargedImage] = useState<{
    url: string;
    title: string;
    subtitle: string;
    badge: string;
    price: string;
  } | null>(null);

  // Update selectedService when navigation params change
  useEffect(() => {
    const param = params.service || params.filter || params.category;
    if (param) {
      setSelectedService(param);
    }
  }, [params.service, params.filter, params.category]);

  useEffect(() => {
    if (!userToken) {
      showError('Please sign in to access digital services', 'Sign In Required');
      router.replace('/auth' as any);
    }
  }, [userToken]);

  // Dynamic filter chips from backend DigitalService table
  const { digitalServices, refetch: refetchServices } = useDigitalServices();

  // Dynamic digital specialists/providers from backend DigitalServiceProvider table
  const {
    providers,
    loading,
    refreshing,
    refetch: refetchProviders,
  } = useDigitalProviders(selectedService, searchQuery);

  useFocusEffect(
    React.useCallback(() => {
      refetchServices();
      refetchProviders();
    }, [])
  );

  const onRefresh = async () => {
    await Promise.all([
      refetchServices({ force: true }),
      refetchProviders({ force: true }),
    ]);
  };

  const handleCall = (phone: string | null, providerName: string) => {
    if (!userToken) {
      showError('Please sign in to contact digital specialists', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }
    if (!phone) {
      showError('Contact number unavailable', 'Call Specialist');
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
          {/* Back to Home */}
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
            <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-2">
              <Laptop size={22} color="#2563eb" />
            </View>
            <Text className="text-2xl font-bold text-slate-900 tracking-tight ml-1">
              Digital Services
            </Text>
          </View>
          <Text className="text-slate-500 text-sm mt-0.5 mb-4">
            Hire verified digital experts, agencies & freelance professionals
          </Text>

          {/* Search Box */}
          <View className="flex-row items-center bg-[#f8fafc] rounded-2xl px-4 h-12 border border-slate-200/80 mb-3.5">
            <Search size={18} color="#94a3b8" />
            <TextInput
              placeholder="Search experts, agencies, skills..."
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

          {/* Dynamic Category Filter Pills from Backend DB */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
            className="-mx-1 py-1"
          >
            {/* All Services chip */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedService('All')}
              className={`mx-1 px-3.5 py-2 rounded-full border flex-row items-center ${
                selectedService === 'All'
                  ? 'bg-[#2563eb] border-[#2563eb]'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Sparkles size={13} color={selectedService === 'All' ? '#ffffff' : '#64748b'} />
              <Text
                className={`text-xs font-semibold ml-1.5 ${
                  selectedService === 'All' ? 'text-white' : 'text-slate-700'
                }`}
              >
                All Services
              </Text>
            </TouchableOpacity>

            {/* Individual service category chips loaded straight from DB */}
            {digitalServices.map((service, idx) => {
              const Icon = ICON_MAP[service.iconName] || Globe;
              const isSelected = selectedService.trim().toLowerCase() === service.name.trim().toLowerCase();
              return (
                <TouchableOpacity
                  key={service.id || idx}
                  activeOpacity={0.7}
                  onPress={() => setSelectedService(isSelected ? 'All' : service.name)}
                  className={`mx-1 px-3.5 py-2 rounded-full border flex-row items-center ${
                    isSelected
                      ? 'bg-[#2563eb] border-[#2563eb]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Icon
                    size={14}
                    color={isSelected ? '#ffffff' : service.color}
                  />
                  <Text
                    className={`text-xs font-semibold ml-1.5 ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {service.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Main Content Area - People who will give the service (like Book a Service) */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f4f6fc]">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-500 text-xs mt-3">Finding available digital professionals...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {providers.length === 0 ? (
              <View className="items-center justify-center py-20 px-6">
                <View className="w-20 h-20 items-center justify-center mb-4 bg-slate-100 rounded-3xl">
                  <Briefcase size={44} color="#94a3b8" strokeWidth={1.5} />
                </View>
                <Text className="text-xl font-bold text-slate-800 text-center mb-2">
                  No specialists found
                </Text>
                <Text className="text-sm text-slate-500 text-center max-w-[280px]">
                  Try selecting "All Services" or adjusting your search query.
                </Text>
              </View>
            ) : (
              providers.map((provider) => (
                <DigitalProviderCard
                  key={provider.id}
                  provider={provider}
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
