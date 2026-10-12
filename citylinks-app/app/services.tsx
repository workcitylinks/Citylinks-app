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
  Wrench,
  Search,
  Phone,
  MapPin,
  X,
  CheckCircle,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { useApp } from '../context/AppContext';
import { useServices, ServiceItem } from '../queries/marketplaceQueries';

export default function BookServiceScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken } = useApp();
  const params = useLocalSearchParams<{ category?: string; filter?: string; service?: string }>();
  const initialCategoryParam = params.category || params.filter || params.service;

  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategoryParam || 'All'
  );
  const [searchQuery, setSearchQuery] = useState('');

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
                <View
                  key={svc.id}
                  className="bg-white rounded-3xl p-5 mb-3.5 shadow-sm border border-slate-100"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center mb-1">
                        <View className="bg-blue-50 px-2.5 py-0.5 rounded-full">
                          <Text className="text-[11px] font-bold text-[#2563eb]">
                            {svc.category}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-base font-bold text-slate-900 tracking-tight mb-1">
                        {svc.title}
                      </Text>
                      <Text className="text-xs text-slate-500 font-medium">
                        By {svc.providerName}
                      </Text>
                    </View>

                    <Text className="text-sm font-extrabold text-[#2563eb]">
                      {svc.priceLabel}
                    </Text>
                  </View>

                  {svc.description && (
                    <Text className="text-xs text-slate-600 mb-3" numberOfLines={2}>
                      {svc.description}
                    </Text>
                  )}

                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                    <View className="flex-row items-center">
                      <MapPin size={13} color="#64748b" />
                      <Text className="text-xs text-slate-500 ml-1">
                        {svc.location}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleCall(svc.phone, svc.providerName)}
                      className="bg-[#2563eb] flex-row items-center px-4 py-2 rounded-xl shadow-sm"
                    >
                      <Phone size={14} color="#ffffff" className="mr-1.5" />
                      <Text className="text-white font-semibold text-xs ml-1">
                        Book Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
