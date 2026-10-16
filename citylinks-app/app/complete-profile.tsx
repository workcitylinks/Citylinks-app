import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  User,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Crosshair,
  Navigation,
  X,
  Sparkles,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';
import { getParticularLoggedPage } from '../utils/authRedirect';
import { UserAvatar } from '../components/ui/UserAvatar';

export default function CompleteProfileScreen() {
  const { showSuccess, showError } = useToast();
  const { userData } = useApp();
  const params = useLocalSearchParams();
  const paramEmail = (params.email as string) || '';
  const paramFullName = (params.fullName as string) || '';
  const paramAvatarUrl = (params.avatarUrl as string) || '';

  // Pre-populate first and last names if available from fullName
  const nameParts = paramFullName.trim().split(' ');
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Auto GPS & Mobile Network Location Fetcher
  const handleAutoFetchLocation = async (silent = false) => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) {
          showError(
            'Permission to access device location was denied. Please allow location access in your device settings or type your address manually.',
            'Location Permission Needed'
          );
        }
        return;
      }

      // 1. Try mobile network / last known position first for instant response
      let currentLocation = await Location.getLastKnownPositionAsync();

      // 2. Fall back to current GPS / network location if no cached position
      if (!currentLocation) {
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      if (currentLocation?.coords) {
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
          setAddress(fullAddr || `${locality}, Haveri, Karnataka`);
          if (!silent) {
            showSuccess(`Auto-detected from network: ${locality}`, 'Location Fetched');
          }
        }
      }
    } catch (err: any) {
      console.warn('GPS/Network location error in complete-profile:', err);
      if (!silent) {
        showError(
          err.message || 'Unable to retrieve your current location. Please enter your address manually.',
          'GPS Error'
        );
      }
    } finally {
      setFetchingLocation(false);
    }
  };

  React.useEffect(() => {
    (async () => {
      let existingAddress = '';
      try {
        const stored = await AsyncStorage.getItem('user_data');
        if (stored) {
          const u = JSON.parse(stored);
          if (!firstName && u.firstName) setFirstName(u.firstName);
          if (!lastName && u.lastName) setLastName(u.lastName);
          if (!phone && u.phone) setPhone(u.phone);
          if (u.address) {
            existingAddress = u.address;
            setAddress(u.address);
          }
        }
      } catch (e) {}

      // Automatically auto-detect address by default from mobile network / GPS if empty
      if (!existingAddress) {
        handleAutoFetchLocation(true);
      }
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.firstName) setFirstName(u.firstName);
        if (u.lastName) setLastName(u.lastName);
        if (u.phone) setPhone(u.phone);
        if (u.address) setAddress(u.address);
      }
    } catch (e) {
      console.log('Error refreshing complete-profile:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Compute avatar initial
  const userInitial = firstName.trim()
    ? firstName.trim().charAt(0).toUpperCase()
    : paramFullName.trim()
    ? paramFullName.trim().charAt(0).toUpperCase()
    : paramEmail
    ? paramEmail.charAt(0).toUpperCase()
    : 'C';

  const displayName = `${firstName} ${lastName}`.trim() || paramFullName.trim() || 'Your Name';

  const handleCompleteProfile = async () => {
    if (!firstName.trim()) {
      showError('Please enter your first name', 'First Name Required');
      return;
    }

    setLoading(true);
    try {
      const full = `${firstName.trim()} ${lastName.trim()}`.trim();
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: full,
        phone: phone.trim(),
        address: address.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
        panNumber: panNumber.trim().toUpperCase(),
      };

      const res = await apiClient.put('/auth/profile', payload);

      // Update stored user_data with the newly saved details
      const currentStored = await AsyncStorage.getItem('user_data');
      const parsed = currentStored ? JSON.parse(currentStored) : {};
      const updatedUser = {
        ...parsed,
        id: res.data.user.id,
        email: res.data.user.email,
        fullName: res.data.user.fullName,
        firstName: res.data.user.firstName,
        lastName: res.data.user.lastName,
        phone: res.data.user.phone,
        address: res.data.user.address,
        avatarUrl: res.data.user.avatarUrl || parsed.avatarUrl || null,
      };
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));

      showSuccess(`Profile setup complete! Welcome, ${res.data.user.fullName || 'there'}!`, 'Welcome to CityLinks');

      // Navigate to the particular logged page or home
      const destination = getParticularLoggedPage(updatedUser, params.redirect as string);
      setTimeout(() => {
        router.replace(destination as any);
      }, 700);
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to complete profile', 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-[#f4f6fc]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {/* Header */}
          <View className="items-center mb-6">
            <Image
              source={require('../assets/images/logo.png')}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
              className="mb-2"
            />
            <Text className="text-2xl font-bold text-slate-900 tracking-tight text-center">
              Complete Your Profile
            </Text>
            <Text className="text-slate-500 text-sm mt-1 text-center">
              Set up your details to get started with CityLinks
            </Text>
          </View>

          {/* User Banner Card */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 flex-row items-center">
            <UserAvatar
              avatarUrl={paramAvatarUrl || userData?.avatarUrl}
              name={displayName}
              email={paramEmail}
              size={64}
              textSize={24}
              style={{ marginRight: 16 }}
            />
            <View className="flex-1 justify-center">
              <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="text-slate-500 text-sm mt-0.5" numberOfLines={1}>
                {paramEmail || 'work.citylinks@gmail.com'}
              </Text>
            </View>
          </View>

          {/* Personal Details Card */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center mb-4 pb-2 border-b border-slate-100">
              <User size={18} color="#2563eb" />
              <Text className="text-base font-bold text-slate-900 ml-2">
                Personal Details
              </Text>
            </View>

            {/* First Name (Required) */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                First Name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                placeholder="Enter your first name"
                maxLength={35}
                value={firstName}
                onChangeText={setFirstName}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
              />
            </View>

            {/* Last Name */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                Last Name
              </Text>
              <TextInput
                placeholder="Enter your last name"
                maxLength={35}
                value={lastName}
                onChangeText={setLastName}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number
              </Text>
              <TextInput
                placeholder="e.g. +91 9876543210"
                keyboardType="phone-pad"
                maxLength={14}
                value={phone}
                onChangeText={setPhone}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
              />
            </View>

            {/* Email (Readonly) */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </Text>
              <View className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-3">
                <Text className="text-slate-600 text-sm font-medium">
                  {paramEmail || 'work.citylinks@gmail.com'}
                </Text>
              </View>
            </View>

            {/* Address with Auto GPS Fetching and Manual Entry */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <MapPin size={15} color="#2563eb" />
                  <Text className="text-xs font-bold text-slate-800 ml-1.5 uppercase tracking-wider">
                    Doorstep Address
                  </Text>
                </View>

                {/* Auto Fetch Location Button */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  disabled={fetchingLocation}
                  onPress={() => handleAutoFetchLocation(false)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#eff6ff',
                    paddingHorizontal: 10,
                    paddingVertical: 5.5,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#bfdbfe',
                  }}
                >
                  {fetchingLocation ? (
                    <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 5 }} />
                  ) : (
                    <Crosshair size={13} color="#2563eb" strokeWidth={2.5} style={{ marginRight: 5 }} />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1d4ed8' }}>
                    {fetchingLocation ? 'Locating GPS...' : 'Auto Fetch Location'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-[11px] text-slate-400 mb-2 leading-4">
                Tap 'Auto Fetch Location' to detect via GPS, or enter your doorstep street, locality and city manually below.
              </Text>

              {/* Manual Address Input Box */}
              <View className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex-row items-start focus:border-blue-500">
                <MapPin size={17} color="#64748b" style={{ marginTop: 2, marginRight: 8 }} />
                <TextInput
                  placeholder="Enter house/flat no., street, landmark, city (e.g. Haveri Town, Karnataka)"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={2}
                  maxLength={150}
                  value={address}
                  onChangeText={setAddress}
                  className="flex-1 text-slate-800 text-sm p-0 leading-5"
                  style={{ minHeight: 48, textAlignVertical: 'top' }}
                />
                {Boolean(address) && (
                  <TouchableOpacity
                    onPress={() => setAddress('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#e2e8f0',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 4,
                    }}
                  >
                    <X size={13} color="#475569" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Locality Suggestions for Haveri Region */}
              <View className="mt-2.5">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quick Select Area (Haveri District)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {['Haveri Town', 'Ranebennur', 'Byadgi', 'Shiggaon', 'Hangal', 'Hirekerur'].map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (!address.trim()) {
                          setAddress(`${loc}, Haveri, Karnataka`);
                        } else if (!address.includes(loc)) {
                          setAddress(`${address}, ${loc}`);
                        }
                      }}
                      className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg mr-1.5 shadow-2xs"
                    >
                      <Text className="text-[11px] font-semibold text-slate-600">
                        + {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Identity Documents Card */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-100">
            <View className="flex-row items-center mb-4 pb-2 border-b border-slate-100">
              <CreditCard size={18} color="#2563eb" />
              <Text className="text-base font-bold text-slate-900 ml-2">
                Identity Documents
              </Text>
            </View>

            {/* Aadhaar Number */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                Aadhaar Number (Optional)
              </Text>
              <TextInput
                placeholder="e.g. 1234 5678 9012"
                keyboardType="numeric"
                maxLength={14}
                value={aadhaarNumber}
                onChangeText={setAadhaarNumber}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
              />
            </View>

            {/* PAN Number */}
            <View>
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                PAN Number (Optional)
              </Text>
              <TextInput
                placeholder="e.g. ABCDE1234F"
                autoCapitalize="characters"
                maxLength={10}
                value={panNumber}
                onChangeText={(val) => setPanNumber(val.toUpperCase())}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
              />
            </View>
          </View>

          {/* Security Guarantee Callout */}
          <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-slate-100 flex-row items-start">
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

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCompleteProfile}
            disabled={loading}
            className="bg-primary py-4 rounded-2xl items-center justify-center flex-row shadow-md shadow-blue-300"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text className="text-white font-bold text-base mr-2">
                  Complete & Go to Home
                </Text>
                <ArrowRight size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
