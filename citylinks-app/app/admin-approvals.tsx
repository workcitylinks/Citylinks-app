import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Layers,
  RefreshCw,
  Check,
  Clock,
  Sparkles,
  Truck,
  CreditCard,
  FileText,
  Eye,
} from 'lucide-react-native';
import { useToast } from '../context/ToastContext';
import { useJoinRequests, JoinRequestItem } from '../queries/marketplaceQueries';
import { apiClient } from '../api/apiClient';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';

export default function AdminApprovalsScreen() {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const { requests, loading, refetch } = useJoinRequests(activeTab);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async (request: JoinRequestItem) => {
    try {
      setProcessingId(request.id);
      await apiClient.patch(`/join-requests/${request.id}/approve`);
      showSuccess(
        `Approved ${request.shopName}! The user's role has been converted.`,
        'Joiner Approved'
      );
      await refetch();
    } catch (err: any) {
      console.error('Approve error:', err);
      showError(err.response?.data?.error || 'Failed to approve join request', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: JoinRequestItem) => {
    try {
      setProcessingId(request.id);
      await apiClient.patch(`/join-requests/${request.id}/reject`, {
        reason: 'Application rejected by Super Admin',
      });
      showSuccess(`Application for ${request.shopName} was rejected.`, 'Rejected');
      await refetch();
    } catch (err: any) {
      console.error('Reject error:', err);
      showError(err.response?.data?.error || 'Failed to reject join request', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

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
            <Text className="text-lg font-bold text-slate-900">Approve Joiners</Text>
            <Text className="text-xs text-slate-400">Super Admin Verification Desk</Text>
          </View>
          <TouchableOpacity
            onPress={() => refetch()}
            activeOpacity={0.7}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <RefreshCw size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Summary Banner */}
        <View className="bg-purple-900 rounded-3xl p-5 mb-5 shadow-sm">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-white/20 items-center justify-center mr-2.5">
                <ShieldCheck size={20} color="#ffffff" />
              </View>
              <Text className="text-white font-bold text-lg">Partner Approvals</Text>
            </View>
            <View className="bg-purple-500/40 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-white">{pendingCount} Waiting</Text>
            </View>
          </View>
          <Text className="text-purple-200 text-xs leading-relaxed">
            Approving an application automatically converts the applicant to their requested role (Shop Keeper, Service Provider, or Transport) and unlocks their business dashboard.
          </Text>
        </View>

        {/* Filter Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#f1f5f9',
            padding: 4,
            borderRadius: 16,
            marginBottom: 16,
          }}
        >
          {(['PENDING', 'APPROVED', 'ALL'] as const).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: isSelected ? '#ffffff' : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isSelected ? '#0f172a' : '#64748b',
                  }}
                >
                  {tab === 'PENDING' ? 'Pending' : tab === 'APPROVED' ? 'Approved' : 'All'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List of Join Requests */}
        {loading ? (
          <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-100">
            <ActivityIndicator size="small" color="#7c3aed" />
            <Text className="text-xs text-slate-400 mt-2">Loading applications...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-100">
            <CheckCircle size={36} color="#94a3b8" />
            <Text className="text-sm font-bold text-slate-700 mt-2">
              No {activeTab.toLowerCase()} requests
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
              There are no {activeTab.toLowerCase()} joiner applications in the system right now.
            </Text>
          </View>
        ) : (
          <View className="space-y-3.5">
            {requests.map((item) => {
              const isPending = item.status === 'PENDING';
              const isApproved = item.status === 'APPROVED';
              const isItemProcessing = processingId === item.id;

              const roleLabel =
                item.role === 'MERCHANT'
                  ? 'Shop Keeper'
                  : item.role === 'MANUAL_SERVICE_PROVIDER' || item.role === 'LABOR'
                  ? 'Manual Service Provider'
                  : item.role === 'DIGITAL_SERVICE_PROVIDER'
                  ? 'Digital Service Provider'
                  : 'Transport';

              const roleBadgeColor =
                item.role === 'MERCHANT'
                  ? '#ea580c'
                  : item.role === 'MANUAL_SERVICE_PROVIDER' || item.role === 'LABOR'
                  ? '#16a34a'
                  : item.role === 'DIGITAL_SERVICE_PROVIDER'
                  ? '#8b5cf6'
                  : '#0891b2';

              return (
                <View
                  key={item.id}
                  className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm"
                >
                  {/* Top Row: Shop Name & Status */}
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
                        {item.shopName}
                      </Text>
                      <Text className="text-xs text-slate-400 mt-0.5">
                        Applied by {item.user?.fullName || item.user?.email || 'Registered User'}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor:
                          item.status === 'APPROVED'
                            ? '#dcfce7'
                            : item.status === 'REJECTED'
                            ? '#fee2e2'
                            : '#fef3c7',
                      }}
                      className="px-2.5 py-1 rounded-full"
                    >
                      <Text
                        style={{
                          color:
                            item.status === 'APPROVED'
                              ? '#166534'
                              : item.status === 'REJECTED'
                              ? '#991b1b'
                              : '#92400e',
                        }}
                        className="text-[11px] font-bold"
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {/* Role & Service Type Badges */}
                  <View className="flex-row items-center flex-wrap gap-1.5 mb-3">
                    <View
                      style={{ backgroundColor: `${roleBadgeColor}15` }}
                      className="px-2.5 py-1 rounded-lg flex-row items-center"
                    >
                      <Text
                        style={{ color: roleBadgeColor }}
                        className="text-xs font-bold"
                      >
                        {roleLabel}
                      </Text>
                    </View>

                    {item.serviceType && (
                      <View className="bg-slate-100 px-2.5 py-1 rounded-lg flex-row items-center">
                        <Layers size={11} color="#64748b" className="mr-1" />
                        <Text className="text-xs font-medium text-slate-600">
                          {item.serviceType}
                        </Text>
                      </View>
                    )}

                    {item.customService && (
                      <View className="bg-emerald-50 px-2.5 py-1 rounded-lg">
                        <Text className="text-xs font-medium text-emerald-700">
                          Custom: {item.customService}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Description */}
                  <View className="bg-slate-50 rounded-2xl p-3 mb-3 border border-slate-100">
                    <Text className="text-xs text-slate-600 leading-relaxed">
                      "{item.description}"
                    </Text>
                  </View>

                  {/* Storefront Photo Preview (if uploaded) */}
                  {item.imageUrl && (
                    <View className="mb-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: '100%', height: 160 }}
                        resizeMode="cover"
                      />
                      <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-bold text-white">Storefront Photo</Text>
                      </View>
                    </View>
                  )}

                  {/* Transport Driver & Registered Vehicles Fleet (Super Admin View) */}
                  {item.role === 'TRANSPORT' && (
                    <View className="mb-3.5 bg-blue-50/50 rounded-2xl p-3 border border-blue-200">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                          <Truck size={14} color="#2563eb" />
                          <Text className="text-xs font-black text-blue-900 uppercase tracking-wider">
                            Transport Fleet & KYC Details
                          </Text>
                        </View>
                        <View className="bg-blue-600 px-2 py-0.5 rounded-full">
                          <Text className="text-[9px] font-black text-white">DRIVER KYC</Text>
                        </View>
                      </View>

                      {/* Driving License & Aadhaar info */}
                      <View className="bg-white rounded-xl p-2.5 border border-blue-100 mb-2.5 space-y-1.5">
                        {item.drivingLicense ? (
                          <View className="flex-row items-center justify-between">
                            <Text className="text-[11px] font-semibold text-slate-500">Driving License:</Text>
                            <Text className="text-xs font-black text-slate-800 uppercase tracking-wide">
                              {item.drivingLicense}
                            </Text>
                          </View>
                        ) : null}

                        {item.aadhaarNumber ? (
                          <View className="flex-row items-center justify-between">
                            <Text className="text-[11px] font-semibold text-slate-500">Aadhaar Card:</Text>
                            <Text className="text-xs font-black text-slate-800">
                              {item.aadhaarNumber}
                            </Text>
                          </View>
                        ) : null}

                        {/* Document Photo Previews if uploaded */}
                        {(item.drivingLicensePhoto || item.aadhaarPhoto) && (
                          <View className="flex-row gap-2 pt-2 border-t border-slate-100">
                            {item.drivingLicensePhoto && (
                              <View className="flex-1">
                                <Text className="text-[9px] font-bold text-slate-500 mb-1">DL Photo</Text>
                                <Image
                                  source={{ uri: item.drivingLicensePhoto }}
                                  style={{ width: '100%', height: 70, borderRadius: 8 }}
                                  resizeMode="cover"
                                />
                              </View>
                            )}
                            {item.aadhaarPhoto && (
                              <View className="flex-1">
                                <Text className="text-[9px] font-bold text-slate-500 mb-1">Aadhaar Photo</Text>
                                <Image
                                  source={{ uri: item.aadhaarPhoto }}
                                  style={{ width: '100%', height: 70, borderRadius: 8 }}
                                  resizeMode="cover"
                                />
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Vehicles Registered */}
                      <Text className="text-[10px] font-black text-blue-900 uppercase tracking-wider mb-1.5">
                        Registered Vehicles ({(() => {
                          try {
                            const list = item.vehiclesJson ? JSON.parse(item.vehiclesJson) : [];
                            return Array.isArray(list) && list.length > 0 ? list.length : (item.vehiclePlate ? 1 : 0);
                          } catch (e) {
                            return item.vehiclePlate ? 1 : 0;
                          }
                        })()}/3 Max)
                      </Text>

                      {(() => {
                        let fleet: Array<any> = [];
                        if (item.vehiclesJson) {
                          try {
                            const parsed = JSON.parse(item.vehiclesJson);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              fleet = parsed;
                            }
                          } catch (e) { }
                        }
                        if (fleet.length === 0 && (item.vehiclePlate || item.vehicleModel)) {
                          fleet = [{
                            vehicleType: item.vehicleType || 'Car',
                            modelName: item.vehicleModel || 'Primary Vehicle',
                            plateNumber: item.vehiclePlate || 'KA --',
                            ratePerKm: item.ratePerKm || 20,
                            baseFare: item.baseFare || 30,
                            isPrimary: true,
                          }];
                        }

                        return fleet.map((v, vIdx) => (
                          <View
                            key={vIdx}
                            className="bg-white rounded-xl p-2.5 mb-1.5 border border-slate-200"
                          >
                            <View className="flex-row items-center justify-between mb-1.5">
                              <View className="flex-1 mr-2">
                                <View className="flex-row items-center gap-1.5">
                                  <Text className="text-xs font-black text-slate-900">{v.modelName}</Text>
                                  {v.isPrimary && (
                                    <View className="bg-blue-600 px-1.5 py-0.2 rounded">
                                      <Text className="text-[8px] font-black text-white">PRIMARY</Text>
                                    </View>
                                  )}
                                </View>
                                <Text className="text-[10px] text-slate-500">{v.vehicleType}</Text>
                              </View>

                              {/* Commercial Yellow Number Plate */}
                              <View className="flex-row items-center bg-[#fef08a] border border-[#ca8a04] rounded px-1.5 py-0.5">
                                <View className="bg-blue-700 px-1 rounded-xs mr-1 items-center justify-center">
                                  <Text className="text-[7px] font-black text-white">IND</Text>
                                </View>
                                <Text className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                                  {v.plateNumber}
                                </Text>
                              </View>
                            </View>

                            <View className="flex-row items-center justify-between bg-slate-50 px-2 py-1 rounded-lg">
                              <Text className="text-[10px] text-slate-600">
                                Rate: <Text className="font-bold text-blue-700">₹{v.ratePerKm}/km</Text>
                              </Text>
                              <Text className="text-[10px] text-slate-600">
                                Base Fare: <Text className="font-bold text-slate-800">₹{v.baseFare}</Text>
                              </Text>
                            </View>
                          </View>
                        ));
                      })()}
                    </View>
                  )}

                  {/* Contact & Location Info */}
                  <View className="space-y-1 mb-4">
                    <View className="flex-row items-center">
                      <MapPin size={13} color="#94a3b8" />
                      <Text className="text-xs text-slate-600 ml-1.5" numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Phone size={13} color="#94a3b8" />
                      <Text className="text-xs text-slate-600 ml-1.5">
                        {item.phone}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Mail size={13} color="#94a3b8" />
                      <Text className="text-xs text-slate-600 ml-1.5">
                        {item.email}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons for Super Admin */}
                  {isPending && (
                    <View
                      style={{
                        flexDirection: 'row',
                        paddingTop: 10,
                        borderTopWidth: 1,
                        borderTopColor: '#f1f5f9',
                        gap: 10,
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isItemProcessing}
                        onPress={() => handleReject(item)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 12,
                          backgroundColor: '#f1f5f9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text className="text-xs font-bold text-slate-600">Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={isItemProcessing}
                        onPress={() => handleApprove(item)}
                        style={{
                          flex: 2,
                          paddingVertical: 10,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                          backgroundColor: '#059669',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                        }}
                      >
                        {isItemProcessing ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Check size={14} color="#ffffff" strokeWidth={3} className="mr-1.5" />
                            <Text className="text-xs font-bold text-white ml-1">
                              Approve Joiner
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {isApproved && (
                    <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                      <View className="flex-row items-center">
                        <CheckCircle size={14} color="#16a34a" />
                        <Text className="text-xs font-semibold text-emerald-700 ml-1.5">
                          Converted to {roleLabel}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-slate-400">
                        Approved on {new Date(item.approvedAt || item.updatedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
