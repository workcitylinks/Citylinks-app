import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Car,
  Users,
  Briefcase,
  Search,
  Phone,
  Clock,
  MapPin,
  X,
  Truck,
  Bike,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { 
  useTransport, 
  TransportProviderItem, 
  VehicleCategoryItem 
} from '../queries/marketplaceQueries';

const VEHICLE_ICONS: Record<string, any> = {
  Car,
  Bike,
  Truck,
  MoreHorizontal,
};

export default function BookTransportScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken } = useApp();
  const params = useLocalSearchParams<{ tab?: string; mode?: string }>();
  const isCommercial = params.tab === 'commercial' || params.mode?.toLowerCase() === 'moving';

  const [activeTab, setActiveTab] = useState<'passenger' | 'commercial'>(
    isCommercial ? 'commercial' : 'passenger'
  );
  const [selectedVehicle, setSelectedVehicle] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Reset selected vehicle when switching passenger/commercial tabs
  const handleTabChange = (tab: 'passenger' | 'commercial') => {
    setActiveTab(tab);
    setSelectedVehicle('All');
  };

  // Sync tab if param changes
  useEffect(() => {
    if (params.tab === 'commercial' || params.mode?.toLowerCase() === 'moving') {
      setActiveTab('commercial');
      setSelectedVehicle('All');
    } else if (params.tab === 'passenger' || params.mode?.toLowerCase() === 'transport') {
      setActiveTab('passenger');
      setSelectedVehicle('All');
    }
  }, [params.tab, params.mode]);

  useEffect(() => {
    if (!userToken) {
      showError('Please sign in to access transport services', 'Sign In Required');
      router.replace('/auth' as any);
    }
  }, [userToken]);

  // Hook handles caching, tab switching, and search debouncing
  const { 
    providers, 
    categories, 
    loading, 
    refreshing, 
    refetch 
  } = useTransport(activeTab, searchQuery, selectedVehicle);

  const onRefresh = () => {
    refetch({ force: true });
  };

  const handleCallDriver = (provider: TransportProviderItem) => {
    if (!userToken) {
      showError('Please sign in to contact transport drivers', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }
    showSuccess(`Connecting with ${provider.name}...`, 'Contacting Driver');
    Linking.openURL(`tel:${provider.phone}`);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Header with White Status Bar */}
      <SafeAreaView edges={['top']} className="bg-white">
        <View className="px-5 pt-3 pb-3 bg-white">
          {/* Back to Home Link */}
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

          {/* Heading */}
          <View className="flex-row items-center mb-1">
            <Car size={24} color="#2563eb" className="mr-2" />
            <Text className="text-2xl font-bold text-slate-900 tracking-tight ml-2">
              Book Transport
            </Text>
          </View>
          <Text className="text-slate-500 text-sm mt-0.5 mb-4">
            Rides, deliveries & moving services
          </Text>

          {/* Passenger / Commercial Segment Tabs matching attachment */}
          <View className="flex-row bg-[#f1f5f9] p-1 rounded-2xl mb-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTabChange('passenger')}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                activeTab === 'passenger' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Users
                size={16}
                color={activeTab === 'passenger' ? '#1e293b' : '#64748b'}
                className="mr-2"
              />
              <Text
                className={`text-sm font-semibold ml-1.5 ${
                  activeTab === 'passenger' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Passenger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTabChange('commercial')}
              className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl ${
                activeTab === 'commercial' ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Briefcase
                size={16}
                color={activeTab === 'commercial' ? '#1e293b' : '#64748b'}
                className="mr-2"
              />
              <Text
                className={`text-sm font-semibold ml-1.5 ${
                  activeTab === 'commercial' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Commercial
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Vehicle Filters from Backend with Others option */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-1 py-1 mt-1"
          >
            {/* All Vehicles Filter */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedVehicle('All')}
              className={`mx-1 px-3.5 py-1.5 rounded-full border flex-row items-center ${
                selectedVehicle === 'All'
                  ? 'bg-[#2563eb] border-[#2563eb]'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Sparkles size={12} color={selectedVehicle === 'All' ? '#ffffff' : '#64748b'} />
              <Text
                className={`text-xs font-semibold ml-1.5 ${
                  selectedVehicle === 'All' ? 'text-white' : 'text-slate-700'
                }`}
              >
                All Vehicles
              </Text>
            </TouchableOpacity>

            {/* Backend-driven categories with icons & Others */}
            {categories.map((cat) => {
              const IconComponent = VEHICLE_ICONS[cat.iconName] || (activeTab === 'passenger' ? Car : Truck);
              const isSelected = selectedVehicle.trim().toLowerCase() === cat.name.trim().toLowerCase();
              return (
                <TouchableOpacity
                  key={cat.id || cat.name}
                  activeOpacity={0.7}
                  onPress={() => setSelectedVehicle(isSelected ? 'All' : cat.name)}
                  className={`mx-1 px-3.5 py-1.5 rounded-full border flex-row items-center ${
                    isSelected
                      ? 'bg-[#2563eb] border-[#2563eb]'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <IconComponent size={12} color={isSelected ? '#ffffff' : '#2563eb'} />
                  <Text
                    className={`text-xs font-semibold ml-1.5 ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f4f6fc]">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Section: Recommended Rides / Goods - Clickable to filter */}
          <Text className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3 px-1">
            {activeTab === 'passenger' ? 'RECOMMENDED RIDES' : 'RECOMMENDED FOR GOODS'}
          </Text>

          {categories.map((rec) => {
            const IconComponent = VEHICLE_ICONS[rec.iconName] || (activeTab === 'passenger' ? Car : Truck);
            const isSelected = selectedVehicle.trim().toLowerCase() === rec.name.trim().toLowerCase();
            return (
              <TouchableOpacity
                key={rec.id || rec.name}
                activeOpacity={0.8}
                onPress={() => setSelectedVehicle(isSelected ? 'All' : rec.name)}
                className={`bg-white rounded-2xl p-4 mb-3 shadow-sm border flex-row items-center justify-between ${
                  isSelected ? 'border-[#2563eb] bg-blue-50/20 ring-2 ring-blue-500/20' : 'border-slate-100'
                }`}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View
                    className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${
                      isSelected ? 'bg-blue-600' : 'bg-blue-50'
                    }`}
                  >
                    <IconComponent size={22} color={isSelected ? '#ffffff' : '#2563eb'} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-bold text-slate-900">
                        {rec.name}
                      </Text>
                      {isSelected && (
                        <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-blue-700">Filter Applied</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      {rec.desc}
                    </Text>
                    <Text className="text-sm font-extrabold text-slate-900 mt-1">
                      {rec.fare}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-[11px] text-slate-400 font-medium">
                    ETA: {rec.eta}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Search Box matching attachment */}
          <View className="flex-row items-center bg-white rounded-2xl px-4 h-12 shadow-sm border border-slate-200/80 my-4">
            <Search size={18} color="#94a3b8" />
            <TextInput
              placeholder="Search by name, city..."
              placeholderTextColor="#94a3b8"
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

          {/* Section: Available Ride / Goods Providers */}
          <Text className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3 px-1">
            {activeTab === 'passenger'
              ? 'AVAILABLE RIDE PROVIDERS'
              : 'AVAILABLE GOODS PROVIDERS'}
          </Text>

          {loading ? (
            <View className="py-10 items-center justify-center">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-xs text-slate-500 mt-2">Checking nearby vehicles...</Text>
            </View>
          ) : providers.length === 0 ? (
            /* Empty state matching attachment */
            <View className="items-center justify-center py-12 px-6">
              <View className="w-16 h-16 items-center justify-center mb-3">
                <Car size={54} color="#cbd5e1" strokeWidth={1.5} />
              </View>
              <Text className="text-base font-bold text-slate-800 text-center mb-1">
                {activeTab === 'passenger'
                  ? 'No passenger transporters available'
                  : 'No commercial transporters available'}
              </Text>
              <Text className="text-xs text-slate-500 text-center">
                Check back later for available transport providers
              </Text>
            </View>
          ) : (
            providers.map((p) => (
              <View
                key={p.id}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-base font-bold text-slate-900">
                      {p.name}
                    </Text>
                    <View className="bg-emerald-50 px-2 py-0.5 rounded-full ml-2">
                      <Text className="text-[10px] font-bold text-emerald-600">
                        {p.vehicleType}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mb-1">
                    <MapPin size={12} color="#94a3b8" />
                    <Text className="text-xs text-slate-500 ml-1">
                      {p.location}
                    </Text>
                    <Text className="text-xs text-slate-400 mx-1.5">•</Text>
                    <Clock size={12} color="#94a3b8" />
                    <Text className="text-xs text-slate-500 ml-1">
                      {p.eta}
                    </Text>
                  </View>
                  <Text className="text-sm font-extrabold text-[#2563eb]">
                    {p.fareLabel}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleCallDriver(p)}
                  className="bg-[#2563eb] flex-row items-center px-4 py-2.5 rounded-xl shadow-sm"
                >
                  <Phone size={14} color="#ffffff" className="mr-1.5" />
                  <Text className="text-white font-semibold text-xs ml-1">
                    Call
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
