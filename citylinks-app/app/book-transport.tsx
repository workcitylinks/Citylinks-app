import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  StyleSheet,
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

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
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
            onPress={handleGoBack}
            className="flex-row items-center mb-3 self-start py-1"
          >
            <ArrowLeft size={18} color="#1e293b" />
            <Text className="ml-2 text-base font-semibold text-slate-800">
              Back to Home
            </Text>
          </TouchableOpacity>

          {/* Heading */}
          <View className="flex-row items-center mb-1">
            <Car size={24} color="#2563eb" />
            <Text className="text-2xl font-bold text-slate-900 tracking-tight ml-2">
              Book Transport
            </Text>
          </View>
          <Text className="text-slate-500 text-sm mt-0.5 mb-4">
            Rides, deliveries & moving services
          </Text>

          {/* Passenger / Commercial Segment Tabs */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTabChange('passenger')}
              style={[
                styles.segmentTab,
                activeTab === 'passenger' && styles.segmentTabActive,
              ]}
            >
              <Users
                size={16}
                color={activeTab === 'passenger' ? '#1e293b' : '#64748b'}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'passenger' ? styles.segmentTabTextActive : styles.segmentTabTextInactive,
                ]}
              >
                Passenger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTabChange('commercial')}
              style={[
                styles.segmentTab,
                activeTab === 'commercial' && styles.segmentTabActive,
              ]}
            >
              <Briefcase
                size={16}
                color={activeTab === 'commercial' ? '#1e293b' : '#64748b'}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  activeTab === 'commercial' ? styles.segmentTabTextActive : styles.segmentTabTextInactive,
                ]}
              >
                Commercial
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Vehicle Filters from Backend with Others option */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
            style={styles.horizontalScroll}
          >
            {/* All Vehicles Filter */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedVehicle('All')}
              style={[
                styles.chipButton,
                selectedVehicle === 'All' ? styles.chipButtonActive : styles.chipButtonInactive,
              ]}
            >
              <Sparkles size={12} color={selectedVehicle === 'All' ? '#ffffff' : '#64748b'} />
              <Text
                style={[
                  styles.chipText,
                  selectedVehicle === 'All' ? styles.chipTextActive : styles.chipTextInactive,
                ]}
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
                  style={[
                    styles.chipButton,
                    isSelected ? styles.chipButtonActive : styles.chipButtonInactive,
                  ]}
                >
                  <IconComponent size={12} color={isSelected ? '#ffffff' : '#2563eb'} />
                  <Text
                    style={[
                      styles.chipText,
                      isSelected ? styles.chipTextActive : styles.chipTextInactive,
                    ]}
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
                style={[
                  styles.recCard,
                  isSelected && styles.recCardActive,
                ]}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View
                    style={[
                      styles.recIconContainer,
                      isSelected ? styles.recIconContainerActive : styles.recIconContainerInactive,
                    ]}
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
                  <Phone size={14} color="#ffffff" />
                  <Text className="text-white font-semibold text-xs ml-1.5">
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

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  segmentTabTextActive: {
    color: '#0f172a',
  },
  segmentTabTextInactive: {
    color: '#64748b',
  },
  horizontalScroll: {
    marginTop: 4,
  },
  horizontalScrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chipButton: {
    marginHorizontal: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipButtonInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipTextInactive: {
    color: '#334155',
  },
  recCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
  },
  recIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recIconContainerActive: {
    backgroundColor: '#2563eb',
  },
  recIconContainerInactive: {
    backgroundColor: '#eff6ff',
  },
});

