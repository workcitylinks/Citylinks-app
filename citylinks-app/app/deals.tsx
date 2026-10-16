import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  TrendingUp,
  Percent,
  Tag,
  ArrowRight,
  Store,
  Clock,
  Search,
  X,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { useApp } from '../context/AppContext';
import { useDeals, DealItem } from '../queries/marketplaceQueries';

export default function DealsScreen() {
  const { showSuccess, showError } = useToast();
  const { userToken } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Hook handles caching and debounced search
  const { deals, loading, refreshing, refetch } = useDeals(selectedCategory, searchQuery);

  useEffect(() => {
    if (!userToken) {
      showError('Please sign in to access deals & offers', 'Sign In Required');
      router.replace('/auth' as any);
    }
  }, [userToken]);

  // Revalidate on screen focus to reflect newly added or deleted deals
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [])
  );

  const onRefresh = () => {
    refetch({ force: true });
  };

  const handleClaimDeal = (deal: DealItem) => {
    if (!userToken) {
      showError('Please sign in to claim exclusive deals', 'Sign In Required');
      router.push('/auth' as any);
      return;
    }
    showSuccess(`Claimed "${deal.discount}" at ${deal.merchantName}!`, 'Offer Activated');
    if (deal.linkUrl) {
      router.push(deal.linkUrl as any);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Top Header with White Status Bar */}
      <SafeAreaView edges={['top']} className="bg-white">
        <View className="px-5 pt-3 pb-3 bg-white">
          {/* Back link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="flex-row items-center mb-3 self-start py-1"
          >
            <ArrowLeft size={18} color="#1e293b" />
            <Text className="ml-2 text-base font-semibold text-slate-800">
              Back
            </Text>
          </TouchableOpacity>

          {/* Heading */}
          <View className="flex-row items-center mb-1">
            <TrendingUp size={24} color="#2563eb" className="mr-2" />
            <Text className="text-2xl font-bold text-slate-900 tracking-tight ml-2">
              Deals & Offers
            </Text>
          </View>
          <Text className="text-slate-500 text-sm mt-0.5 mb-3">
            Today's best deals and trending items
          </Text>

          {/* Search box if user wants to filter deals */}
          <View className="flex-row items-center bg-[#f8fafc] rounded-2xl px-4 h-11 border border-slate-200/80 mb-1">
            <Search size={16} color="#94a3b8" />
            <TextInput
              placeholder="Search deals, merchants, discounts..."
              placeholderTextColor="#94a3b8"
              maxLength={60}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2.5 text-slate-800 text-sm font-normal"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingTop: 8, paddingBottom: 2 }}
          >
            {['All', 'Shopping', 'Services', 'Food', 'Electronics', 'Salon', 'Transport'].map((cat) => (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                onPress={() => setSelectedCategory(cat)}
                style={{
                  backgroundColor: selectedCategory === cat ? '#2563eb' : '#f1f5f9',
                  borderColor: selectedCategory === cat ? '#2563eb' : '#e2e8f0',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: selectedCategory === cat ? '#ffffff' : '#475569',
                  }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Main Content Area */}
      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f4f6fc]">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-500 text-xs mt-3">Fetching current promotions...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 40,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {deals.length === 0 ? (
              /* Empty state matching attachment */
              <View className="flex-1 items-center justify-center py-24 px-6">
                <View className="w-20 h-20 items-center justify-center mb-5">
                  <Percent size={72} color="#94a3b8" strokeWidth={1.5} />
                </View>
                <Text className="text-xl font-bold text-slate-800 text-center mb-2">
                  No deals available yet
                </Text>
                <Text className="text-sm text-slate-500 text-center mb-8 px-4 leading-relaxed">
                  Check back soon! Merchants and service providers will post deals and offers here.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/')}
                  className="bg-[#2563eb] px-8 py-3.5 rounded-xl shadow-md shadow-blue-400/30 items-center justify-center"
                >
                  <Text className="text-white font-semibold text-base">
                    Browse Marketplace
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              deals.map((deal) => (
                <View
                  key={deal.id}
                  className="bg-white rounded-3xl p-5 mb-3.5 shadow-sm border border-slate-100"
                >
                  {/* Optional Deal Cover Photo */}
                  {Boolean(deal.imageUrl) && (
                    <View
                      style={{
                        width: '100%',
                        height: 140,
                        borderRadius: 16,
                        overflow: 'hidden',
                        marginBottom: 12,
                        backgroundColor: '#f1f5f9',
                      }}
                    >
                      <Image
                        source={{ uri: deal.imageUrl! }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <View className="flex-row items-center justify-between mb-2">
                    <View className="bg-amber-50 px-3 py-1 rounded-full flex-row items-center">
                      <Tag size={12} color="#d97706" />
                      <Text className="text-xs font-extrabold text-amber-700 ml-1.5">
                        {deal.discount}
                      </Text>
                    </View>

                    <View className="bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Text className="text-[11px] font-bold text-slate-600">
                        {deal.category}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-base font-bold text-slate-900 tracking-tight mb-1.5">
                    {deal.title}
                  </Text>

                  <View className="flex-row items-center mb-3">
                    <Store size={13} color="#64748b" />
                    <Text className="text-xs text-slate-600 font-medium ml-1.5">
                      {deal.merchantName}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                    <View className="flex-row items-center">
                      <Clock size={12} color="#94a3b8" />
                      <Text className="text-[11px] text-slate-400 ml-1.5">
                        {deal.validUntil || 'Active Offer'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleClaimDeal(deal)}
                      className="bg-[#2563eb] flex-row items-center px-4 py-2 rounded-xl shadow-sm"
                    >
                      <Text className="text-white font-semibold text-xs mr-1">
                        Claim Offer
                      </Text>
                      <ArrowRight size={13} color="#ffffff" />
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
