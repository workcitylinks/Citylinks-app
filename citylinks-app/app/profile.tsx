import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Modal, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { 
  ArrowLeft, 
  User, 
  CreditCard, 
  ShieldCheck, 
  X, 
  Check, 
  Phone, 
  MapPin,
  Trash2,
  AlertTriangle,
  KeyRound,
  Lock,
  ChevronRight,
  Crosshair,
  Server,
  RefreshCw,
} from 'lucide-react-native';
import { apiClient, getActiveApiEnvironment, switchApiEnvironment, ApiEnvironment } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { useProfile, UserProfile } from '../queries/marketplaceQueries';
import { UserAvatar } from '../components/ui/UserAvatar';

export default function ProfileScreen() {
  const { showSuccess, showError } = useToast();
  const { switchUserRole, refreshAuth: refreshAppAuth } = useApp();
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [activeEnv, setActiveEnv] = useState<ApiEnvironment>(getActiveApiEnvironment());
  const [switchingEnv, setSwitchingEnv] = useState(false);
  const { 
    profile, 
    loading, 
    refreshing, 
    refetch, 
    updateProfile, 
    deleteAccount 
  } = useProfile();

  const [saving, setSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);


  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Edit form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    aadhaarNumber: '',
    panNumber: '',
  });

  // Keep form data pre-filled with active profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        address: profile.address || '',
        aadhaarNumber: profile.aadhaarNumber || '',
        panNumber: profile.panNumber || '',
      });
    }
  }, [profile]);

  const confirmForgotPassword = async () => {
    const userEmail = profile?.email;
    if (!userEmail) {
      showError('No email associated with this profile', 'Error');
      return;
    }

    setResetPasswordLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: userEmail });
      showSuccess(res.data.message || 'Password reset OTP sent to your email!', 'Code Sent');
      setForgotPasswordModalVisible(false);

      setTimeout(() => {
        router.push({
          pathname: '/verify-otp',
          params: { email: userEmail, mode: 'reset-password' },
        });
      }, 700);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to send password reset code', 'Error');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      await deleteAccount();
      
      // Wipe storage completely
      await AsyncStorage.removeItem('user_token');
      await AsyncStorage.removeItem('user_data');
      
      showSuccess('Your account and details have been permanently deleted', 'Account Deleted');
      setDeleteModalVisible(false);

      // Redirect immediately to Home
      setTimeout(() => {
        router.replace('/');
      }, 700);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to delete account', 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const onRefresh = () => {
    refetch({ force: true });
  };

  const openEditModal = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        address: profile.address || '',
        aadhaarNumber: profile.aadhaarNumber || '',
        panNumber: profile.panNumber || '',
      });
    }
    setEditModalVisible(true);
  };

  const handleAutoFetchLocation = async () => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError(
          'Permission to access location was denied. Please allow location access in your device settings.',
          'Location Required'
        );
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [reverseGeocode] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      if (reverseGeocode) {
        const parts = [
          reverseGeocode.name || reverseGeocode.streetNumber,
          reverseGeocode.street,
          reverseGeocode.district || reverseGeocode.subregion,
          reverseGeocode.city,
          reverseGeocode.region || 'Karnataka',
          reverseGeocode.postalCode,
        ].filter(Boolean);
        const fullAddr = parts.join(', ');
        const locality =
          reverseGeocode.district ||
          reverseGeocode.city ||
          reverseGeocode.subregion ||
          'Haveri';
        setFormData(prev => ({ ...prev, address: fullAddr || `${locality}, Haveri, Karnataka` }));
        showSuccess(`Detected: ${locality}`, 'Location Fetched');
      } else {
        showError('Could not decode device coordinates into a street address.', 'Geocoding Error');
      }
    } catch (err: any) {
      showError(err.message || 'Unable to retrieve location.', 'GPS Error');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const res = await updateProfile(formData);
      
      // Update local storage user_data so the top header avatar reflects any changes
      const currentStored = await AsyncStorage.getItem('user_data');
      if (currentStored && res.user) {
        const parsed = JSON.parse(currentStored);
        const updated = {
          ...parsed,
          fullName: res.user.fullName,
          firstName: res.user.firstName,
          lastName: res.user.lastName,
        };
        await AsyncStorage.setItem('user_data', JSON.stringify(updated));
      }

      showSuccess('Profile updated successfully!', 'Success');
      setEditModalVisible(false);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to update profile', 'Error');
    } finally {
      setSaving(false);
    }
  };

  // Mask sensitive identity documents for security
  const maskAadhaar = (num: string | null) => {
    if (!num) return '—';
    const clean = num.replace(/\s+/g, '');
    if (clean.length < 4) return clean;
    return `•••• •••• ${clean.slice(-4)}`;
  };

  const maskPan = (pan: string | null) => {
    if (!pan) return '—';
    if (pan.length < 4) return pan;
    return `••••••${pan.slice(-4)}`;
  };

  const formatRole = (role?: string) => {
    if (!role) return 'Customer';
    switch (role.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'DEVELOPER':
        return 'Developer';
      case 'MERCHANT':
        return 'Merchant';
      case 'MANUAL_SERVICE_PROVIDER':
      case 'LABOR':
        return 'Manual Service Provider';
      case 'DIGITAL_SERVICE_PROVIDER':
        return 'Digital Service Provider';
      case 'TRANSPORT':
        return 'Transport';
      case 'CUSTOMER':
        return 'Customer';
      default:
        return role;
    }
  };



  const userInitial = profile?.fullName?.trim()
    ? profile.fullName.trim().charAt(0).toUpperCase()
    : (profile?.email ? profile.email.charAt(0).toUpperCase() : 'C');

  const displayName = profile?.fullName?.trim() || 
    (profile?.firstName || profile?.lastName 
      ? `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() 
      : 'Your Name');

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Top Header */}
        <View className="px-5 pt-3 pb-4 bg-white">
        <View className="flex-row items-center mb-1">
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-white items-center justify-center mr-3 shadow-sm"
          >
            <ArrowLeft size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-slate-900 tracking-tight">
            My Profile
          </Text>
        </View>
        <Text className="text-slate-500 text-sm ml-12">
          Manage your personal information
        </Text>
      </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f4f6fc]">

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#9333ea" />
          <Text className="text-slate-500 mt-3 text-sm">Loading profile...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {/* Card 1: User Banner */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 flex-row items-center">
            <UserAvatar
              avatarUrl={profile?.avatarUrl}
              name={displayName}
              email={profile?.email}
              size={64}
              textSize={24}
              style={{ marginRight: 16 }}
            />
            <View className="flex-1 justify-center">
              <View className="flex-row items-center flex-wrap gap-1.5 mb-0.5">
                <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
                  {displayName}
                </Text>
                <View className="bg-indigo-50 border border-indigo-200/60 rounded-full px-2 py-0.5">
                  <Text className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                    {formatRole(profile?.role)}
                  </Text>
                </View>
              </View>
              <Text className="text-slate-500 text-sm mt-0.5" numberOfLines={1}>
                {profile?.email || 'user@example.com'}
              </Text>
            </View>
          </View>

          {/* Card 2: Personal Details */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <User size={18} color="#2563eb" />
                <Text className="text-base font-bold text-slate-900 ml-2">
                  Personal Details
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openEditModal}
                className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <Text className="text-sm font-semibold text-slate-700">Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Field: First Name */}
            <View className="mb-4">
              <Text className="text-xs font-medium text-slate-400 mb-1">First Name</Text>
              <Text className="text-base font-semibold text-slate-800">
                {profile?.firstName || '—'}
              </Text>
            </View>

            {/* Field: Last Name */}
            <View className="mb-4">
              <Text className="text-xs font-medium text-slate-400 mb-1">Last Name</Text>
              <Text className="text-base font-semibold text-slate-800">
                {profile?.lastName || '—'}
              </Text>
            </View>

            {/* Field: Phone */}
            <View className="mb-4">
              <Text className="text-xs font-medium text-slate-400 mb-1">Phone</Text>
              <Text className="text-base font-semibold text-slate-800">
                {profile?.phone || '—'}
              </Text>
            </View>

            {/* Field: Email */}
            <View className="mb-4">
              <Text className="text-xs font-medium text-slate-400 mb-1">Email</Text>
              <Text className="text-base font-semibold text-slate-800">
                {profile?.email || '—'}
              </Text>
            </View>

            {/* Field: Address */}
            <View className="mb-4">
              <Text className="text-xs font-medium text-slate-400 mb-1">Address</Text>
              <Text className="text-base font-semibold text-slate-800">
                {profile?.address || '—'}
              </Text>
            </View>

            {/* Field: Role */}
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-medium text-slate-400 mb-1">Account Role</Text>
                <Text className="text-base font-semibold text-slate-800">
                  {formatRole(profile?.role)}
                </Text>
              </View>
              <View className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center">
                <ShieldCheck size={14} color="#64748b" className="mr-1.5" />
                <Text className="text-xs font-semibold text-slate-700">{formatRole(profile?.role)}</Text>
              </View>
            </View>
          </View>


          {/* Card 3: Identity Documents */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center mb-4">
              <CreditCard size={18} color="#2563eb" />
              <Text className="text-base font-bold text-slate-900 ml-2">
                Identity Documents
              </Text>
            </View>

            {/* Field: Aadhaar Number */}
            <View className="mb-4">
              <Text className="text-xs font-medium text-slate-400 mb-1">Aadhaar Number</Text>
              <Text className="text-base font-semibold text-slate-800">
                {maskAadhaar(profile?.aadhaarNumber ?? null)}
              </Text>
            </View>

            {/* Field: PAN Number */}
            <View>
              <Text className="text-xs font-medium text-slate-400 mb-1">PAN Number</Text>
              <Text className="text-base font-semibold text-slate-800">
                {maskPan(profile?.panNumber ?? null)}
              </Text>
            </View>
          </View>

          {/* Card: API Server & Database Switcher */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Server size={18} color="#7c3aed" />
                <Text className="text-base font-bold text-slate-900 ml-2">
                  Active Server & Database
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: activeEnv === 'production' ? '#ecfdf5' : '#fef3c7',
                  borderColor: activeEnv === 'production' ? '#a7f3d0' : '#fde68a',
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: activeEnv === 'production' ? '#059669' : '#d97706',
                  }}
                >
                  {activeEnv === 'production' ? '● PRODUCTION' : '● LOCALHOST'}
                </Text>
              </View>
            </View>

            <Text className="text-xs text-slate-500 mb-3 leading-4">
              Connected: <Text style={{ fontWeight: '700', color: '#334155' }}>{apiClient.defaults.baseURL}</Text>
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={switchingEnv}
              onPress={async () => {
                try {
                  setSwitchingEnv(true);
                  const target: ApiEnvironment = activeEnv === 'production' ? 'local' : 'production';
                  const newUrl = await switchApiEnvironment(target);
                  setActiveEnv(target);
                  showSuccess(`Switched instantly to ${target.toUpperCase()} (${newUrl})! Fresh data loaded.`, 'Server Switched');
                  refetch({ force: true });
                } catch (err: any) {
                  showError(err.message || 'Failed to switch server', 'Error');
                } finally {
                  setSwitchingEnv(false);
                }
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: activeEnv === 'production' ? '#f5f3ff' : '#eff6ff',
                borderColor: activeEnv === 'production' ? '#c4b5fd' : '#bfdbfe',
                borderWidth: 1.5,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {switchingEnv ? (
                <ActivityIndicator size="small" color="#7c3aed" />
              ) : (
                <>
                  <RefreshCw size={15} color={activeEnv === 'production' ? '#7c3aed' : '#2563eb'} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: activeEnv === 'production' ? '#7c3aed' : '#2563eb',
                    }}
                  >
                    {activeEnv === 'production'
                      ? '⚡ Tap to Switch to Localhost Database'
                      : '⚡ Tap to Switch to Live Production Database'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Card 4: Security & Password */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center mb-3">
              <Lock size={18} color="#2563eb" />
              <Text className="text-base font-bold text-slate-900 ml-2">
                Security & Password
              </Text>
            </View>

            <Text className="text-xs text-slate-500 mb-4 leading-4">
              Need to change your password or forgot it? We will send a secure verification code to your email ({profile?.email || 'your email'}).
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setForgotPasswordModalVisible(true)}
              className="py-3 px-4 rounded-xl border border-blue-200 bg-blue-50/60 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <KeyRound size={17} color="#2563eb" className="mr-2.5" />
                <View>
                  <Text className="text-blue-700 font-bold text-sm">
                    Forgot / Reset Password
                  </Text>
                  <Text className="text-blue-500 text-[11px] mt-0.5">
                    Send verification code to email
                  </Text>
                </View>
              </View>

              {resetPasswordLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <ChevronRight size={18} color="#2563eb" />
              )}
            </TouchableOpacity>
          </View>

          {/* Card 5: Your data is secure callout */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100 flex-row items-start">
            <ShieldCheck size={20} color="#2563eb" className="mt-0.5 mr-3" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900 mb-0.5">
                Your data is secure
              </Text>
              <Text className="text-xs text-slate-500 leading-4">
                Sensitive information like Aadhaar and PAN are masked by default and stored securely.
              </Text>
            </View>
          </View>

          {/* Card 5: Delete Account (Danger Zone) */}
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-red-100">
            <View className="flex-row items-center mb-2">
              <Trash2 size={18} color="#ef4444" />
              <Text className="text-base font-bold text-red-600 ml-2">
                Danger Zone
              </Text>
            </View>
            <Text className="text-xs text-slate-500 mb-4 leading-4">
              Permanently delete your CityLinks account and all associated personal and identity data. This action cannot be undone.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDeleteModalVisible(true)}
              className="py-3 px-4 rounded-xl border border-red-200 bg-red-50/50 flex-row items-center justify-center"
            >
              <Trash2 size={16} color="#ef4444" className="mr-2" />
              <Text className="text-red-600 font-bold text-sm">
                Delete My Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%] shadow-2xl">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-900">
                Edit Personal Details
              </Text>
              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)}
                className="p-1 rounded-full bg-slate-100"
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="py-4" 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: 60 }}
            >
              {/* First Name */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-700 mb-1.5">First Name</Text>
                <TextInput
                  placeholder="Enter first name"
                  maxLength={35}
                  value={formData.firstName}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, firstName: val }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
                />
              </View>

              {/* Last Name */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-700 mb-1.5">Last Name</Text>
                <TextInput
                  placeholder="Enter last name"
                  maxLength={35}
                  value={formData.lastName}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, lastName: val }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
                />
              </View>

              {/* Phone */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-700 mb-1.5">Phone Number</Text>
                <TextInput
                  placeholder="e.g. +91 9876543210"
                  keyboardType="phone-pad"
                  maxLength={14}
                  value={formData.phone}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, phone: val }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
                />
              </View>

              {/* Address with Auto GPS Fetching and Manual Entry */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center">
                    <MapPin size={14} color="#2563eb" />
                    <Text className="text-xs font-semibold text-slate-700 ml-1">Address</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    disabled={fetchingLocation}
                    onPress={handleAutoFetchLocation}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#eff6ff',
                      paddingHorizontal: 9,
                      paddingVertical: 4.5,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#bfdbfe',
                    }}
                  >
                    {fetchingLocation ? (
                      <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 4 }} />
                    ) : (
                      <Crosshair size={12} color="#2563eb" strokeWidth={2.5} style={{ marginRight: 4 }} />
                    )}
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1d4ed8' }}>
                      {fetchingLocation ? 'Locating...' : 'Auto Fetch Location'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  placeholder="Enter your doorstep or shop address"
                  multiline
                  numberOfLines={2}
                  maxLength={150}
                  value={formData.address}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, address: val }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
                />
              </View>

              {/* Aadhaar Number */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-700 mb-1.5">Aadhaar Number (12 digits)</Text>
                <TextInput
                  placeholder="e.g. 1234 5678 9012"
                  keyboardType="numeric"
                  maxLength={14}
                  value={formData.aadhaarNumber}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, aadhaarNumber: val }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
                />
              </View>

              {/* PAN Number */}
              <View className="mb-6">
                <Text className="text-xs font-semibold text-slate-700 mb-1.5">PAN Card Number</Text>
                <TextInput
                  placeholder="e.g. ABCDE1234F"
                  autoCapitalize="characters"
                  maxLength={10}
                  value={formData.panNumber}
                  onChangeText={(val) => setFormData(prev => ({ ...prev, panNumber: val.toUpperCase() }))}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
                />
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveProfile}
              disabled={saving}
              className="bg-primary py-3.5 rounded-xl items-center justify-center flex-row shadow-sm"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Check size={18} color="#ffffff" className="mr-2" />
                  <Text className="text-white font-bold text-base">
                    Save Changes
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Forgot Password Confirmation Modal */}
      <Modal
        visible={forgotPasswordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setForgotPasswordModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl border border-blue-100">
            {/* Key Icon Circle */}
            <View className="w-16 h-16 rounded-full bg-blue-100 justify-center items-center mb-4">
              <KeyRound size={28} color="#2563eb" />
            </View>

            <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
              Reset Password?
            </Text>

            <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
              We will send a 5-digit verification code to <Text className="font-semibold text-slate-800">{profile?.email || 'your registered email'}</Text> to reset your account password.
            </Text>

            {/* Actions */}
            <View className="flex-row items-center w-full gap-3">
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={resetPasswordLoading}
                onPress={() => setForgotPasswordModalVisible(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center justify-center"
              >
                <Text className="text-slate-700 font-semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={resetPasswordLoading}
                onPress={confirmForgotPassword}
                className="flex-1 py-3.5 rounded-xl bg-primary items-center justify-center shadow-sm shadow-blue-300 flex-row"
              >
                {resetPasswordLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Send Code
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl border border-red-100">
            {/* Warning Icon Circle */}
            <View className="w-16 h-16 rounded-full bg-red-100 justify-center items-center mb-4">
              <Trash2 size={28} color="#ef4444" />
            </View>

            <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
              Delete Account?
            </Text>

            <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
              This action is <Text className="font-bold text-red-600">permanent</Text>. All your account information, personal details, and documents will be deleted from our servers immediately.
            </Text>

            {/* Actions */}
            <View className="flex-row items-center w-full gap-3">
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={deleting}
                onPress={() => setDeleteModalVisible(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center justify-center"
              >
                <Text className="text-slate-700 font-semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={deleting}
                onPress={handleDeleteAccount}
                className="flex-1 py-3.5 rounded-xl bg-red-600 items-center justify-center shadow-sm shadow-red-300 flex-row"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Delete Forever
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      </SafeAreaView>
    </View>
  );
}
