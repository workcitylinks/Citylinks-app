import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  RefreshCw,
  Users,
  ShieldCheck,
  Store,
  Wrench,
  Truck,
  Laptop,
  User,
  CheckCircle2,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  BarChart2,
  Clock,
  PieChart,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';

interface RoleStat {
  role: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  bg: string;
  description: string;
}

interface AnalyticsData {
  summary: {
    totalUsers: number;
    verifiedUsers: number;
    totalJoinRequests: number;
    pendingJoinRequests: number;
    approvedJoinRequests: number;
    rejectedJoinRequests: number;
    totalShops: number;
    totalServices: number;
    totalProducts: number;
    totalVehicles: number;
  };
  roleStats: RoleStat[];
  recentUsers: Array<{
    id: string;
    email: string;
    fullName?: string | null;
    role: string;
    phone?: string | null;
    isVerified: boolean;
    createdAt: string;
  }>;
}

export default function AdminAnalyticsScreen() {
  const { showError } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const res = await apiClient.get('/admin/gui-analytics');
      setData(res.data);
    } catch (err: any) {
      console.error('Analytics error:', err);
      showError(err.response?.data?.error || 'Failed to load GUI analytics', 'Error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'MERCHANT':
        return Store;
      case 'MANUAL_SERVICE_PROVIDER':
      case 'LABOR':
        return Wrench;
      case 'DIGITAL_SERVICE_PROVIDER':
        return Sparkles;
      case 'TRANSPORT':
        return Truck;
      case 'DEVELOPER':
        return Laptop;
      case 'SUPER_ADMIN':
        return ShieldCheck;
      default:
        return User;
    }
  };

  const totalUsers = data?.summary.totalUsers || 0;

  return (
    <View className="flex-1 bg-slate-50">
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Navbar */}
        <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-lg font-bold text-slate-900">GUI Analyser</Text>
            <Text className="text-xs text-slate-400">Live User & Role Demographics</Text>
          </View>
          <TouchableOpacity
            onPress={fetchAnalytics}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <RefreshCw size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text className="text-sm font-semibold text-slate-600 mt-3">
            Compiling Real-Time Telemetry...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl refreshing={refreshing} onRefresh={fetchAnalytics} />
          }
        >
          {/* Top Live Telemetry Header */}
          <View className="bg-slate-900 rounded-3xl p-5 mb-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-xl bg-purple-500/20 items-center justify-center mr-2.5">
                  <BarChart2 size={18} color="#a855f7" />
                </View>
                <Text className="text-white font-bold text-base">Platform Telemetry</Text>
              </View>
              <View className="flex-row items-center bg-emerald-500/20 px-2.5 py-1 rounded-full">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                <Text className="text-[11px] font-bold text-emerald-300">Live</Text>
              </View>
            </View>

            <View className="flex-row justify-between gap-3">
              <View className="flex-1 bg-white/10 rounded-2xl p-3">
                <Text className="text-[11px] font-medium text-slate-300">Total Registered</Text>
                <Text className="text-2xl font-black text-white mt-0.5">
                  {data?.summary.totalUsers}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">Platform Members</Text>
              </View>
              <View className="flex-1 bg-white/10 rounded-2xl p-3">
                <Text className="text-[11px] font-medium text-slate-300">Verified Users</Text>
                <Text className="text-2xl font-black text-emerald-400 mt-0.5">
                  {data?.summary.verifiedUsers}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">Confirmed Identity</Text>
              </View>
            </View>
          </View>

          {/* Graphical Representation: Multi-Segment Role Spectrum Bar */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              marginBottom: 20,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center mb-3">
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: '#f5f3ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <PieChart size={18} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                  Role Distribution Spectrum
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 }}>
                  Live visual composition of platform members
                </Text>
              </View>
            </View>

            {/* Graphical Segmented Bar with clear borders */}
            <View
              style={{
                height: 16,
                flexDirection: 'row',
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                marginVertical: 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}
            >
              {data?.roleStats.some((s) => s.role !== 'DEVELOPER' && s.count > 0) ? (
                data?.roleStats
                  .filter((s) => s.role !== 'DEVELOPER')
                  .map((stat) => {
                    const widthPercent = totalUsers > 0 ? (stat.count / totalUsers) * 100 : 0;
                    if (widthPercent === 0) return null;
                    return (
                      <View
                        key={stat.role}
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: stat.color,
                          height: '100%',
                        }}
                      />
                    );
                  })
              ) : (
                <View style={{ width: '100%', backgroundColor: '#cbd5e1', height: '100%' }} />
              )}
            </View>

            {/* Color Legend Tags with crisp readable fonts */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {data?.roleStats
                .filter((s) => s.role !== 'DEVELOPER')
                .map((stat) => (
                <View
                  key={stat.role}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    paddingHorizontal: 9,
                    paddingVertical: 4.5,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: stat.color,
                      marginRight: 6,
                    }}
                  />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                    {stat.label}:{' '}
                    <Text style={{ fontWeight: '900', color: '#0f172a' }}>{stat.count}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* DETAILED ROLE BREAKDOWN (Crystal Clear, High-Contrast & Beautiful Cards) */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3, marginBottom: 2 }}>
              Role Demographics & Breakdown
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748b', marginBottom: 14 }}>
              Comprehensive census showing headcount, share, and capabilities
            </Text>

            <View style={{ gap: 12 }}>
              {data?.roleStats
                .filter((stat) => stat.role !== 'DEVELOPER')
                .map((stat) => {
                  const StatIcon = getRoleIcon(stat.role);
                  const percent = totalUsers > 0 ? Math.round((stat.count / totalUsers) * 100) : 0;
                  const hasMembers = stat.count > 0;

                return (
                  <View
                    key={stat.role}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 22,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: hasMembers ? stat.color + '40' : '#e2e8f0',
                      shadowColor: hasMembers ? stat.color : '#000000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: hasMembers ? 0.08 : 0.03,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    {/* Header Row: Role Icon, Name, Capability tag & Right-hand Count Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      {/* Left: Icon & Titles */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            backgroundColor: stat.bg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                            borderWidth: 1,
                            borderColor: stat.color + '30',
                          }}
                        >
                          <StatIcon size={22} color={stat.color} strokeWidth={2.5} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '800',
                              color: '#0f172a',
                              letterSpacing: -0.2,
                            }}
                            numberOfLines={1}
                          >
                            {stat.label}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '500',
                              color: '#475569',
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {stat.description}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Bold Headcount & Percentage Tag */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: '900',
                              color: hasMembers ? stat.color : '#0f172a',
                              letterSpacing: -0.5,
                            }}
                          >
                            {stat.count}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: '#64748b',
                              marginLeft: 3,
                            }}
                          >
                            {stat.count === 1 ? 'person' : 'people'}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: hasMembers ? stat.color : '#f1f5f9',
                            paddingHorizontal: 7,
                            paddingVertical: 2.5,
                            borderRadius: 8,
                            marginTop: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: hasMembers ? '#ffffff' : '#64748b',
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            {percent}% Share
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Progress Gauge Meter */}
                    <View style={{ marginTop: 14 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 5,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                          Role Density Gauge
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: hasMembers ? stat.color : '#94a3b8' }}>
                          {percent}% of platform
                        </Text>
                      </View>

                      <View
                        style={{
                          height: 7,
                          borderRadius: 6,
                          backgroundColor: '#f1f5f9',
                          overflow: 'hidden',
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                        }}
                      >
                        <View
                          style={{
                            width: `${Math.max(percent, hasMembers ? 2 : 0)}%`,
                            backgroundColor: stat.color,
                            height: '100%',
                            borderRadius: 6,
                          }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* PLATFORM INFRASTRUCTURE METRICS */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
            <Text className="text-base font-bold text-slate-900 mb-1">
              Active Platform Assets
            </Text>
            <Text className="text-xs text-slate-400 mb-4">
              Real-time catalog entities registered across Haveri
            </Text>

            <View className="flex-row flex-wrap gap-2.5">
              <View className="w-[48%] bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <View className="flex-row items-center justify-between mb-1">
                  <Store size={16} color="#ea580c" />
                  <Text className="text-lg font-extrabold text-slate-900">
                    {data?.summary.totalShops}
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-slate-600">Local Shops</Text>
              </View>

              <View className="w-[48%] bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <View className="flex-row items-center justify-between mb-1">
                  <Wrench size={16} color="#16a34a" />
                  <Text className="text-lg font-extrabold text-slate-900">
                    {data?.summary.totalServices}
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-slate-600">Services</Text>
              </View>

              <View className="w-[48%] bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <View className="flex-row items-center justify-between mb-1">
                  <Truck size={16} color="#0891b2" />
                  <Text className="text-lg font-extrabold text-slate-900">
                    {data?.summary.totalVehicles}
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-slate-600">Fleet Vehicles</Text>
              </View>

              <View className="w-[48%] bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <View className="flex-row items-center justify-between mb-1">
                  <ShieldCheck size={16} color="#7c3aed" />
                  <Text className="text-lg font-extrabold text-slate-900">
                    {data?.summary.pendingJoinRequests}
                  </Text>
                </View>
                <Text className="text-xs font-semibold text-slate-600">Pending Joiners</Text>
              </View>
            </View>
          </View>

          {/* RECENT USERS TELEMETRY */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <View className="flex-row items-center justify-between mb-3.5">
              <View className="flex-row items-center">
                <Users size={18} color="#2563eb" />
                <Text className="text-base font-bold text-slate-900 ml-2">
                  Recent User Activity
                </Text>
              </View>
              <Text className="text-xs text-slate-400">Latest Signups</Text>
            </View>

            <View className="space-y-2.5">
              {data?.recentUsers.map((u) => {
                const UserIcon = getRoleIcon(u.role);
                return (
                  <View
                    key={u.id}
                    className="flex-row items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-8 h-8 rounded-xl bg-slate-200/80 items-center justify-center mr-2.5">
                        <UserIcon size={16} color="#475569" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                          {u.fullName || u.email}
                        </Text>
                        <Text className="text-[10px] text-slate-400" numberOfLines={1}>
                          {u.email}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <View className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <Text className="text-[10px] font-bold text-slate-700">
                          {u.role}
                        </Text>
                      </View>
                      <Text className="text-[9px] text-slate-400 mt-1">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
