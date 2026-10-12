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
import {
  User,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';

export default function CompleteProfileScreen() {
  const { showSuccess, showError } = useToast();
  const params = useLocalSearchParams();
  const paramEmail = (params.email as string) || '';
  const paramFullName = (params.fullName as string) || '';

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const stored = await AsyncStorage.getItem('user_data');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.firstName) setFirstName(u.firstName);
        if (u.lastName) setLastName(u.lastName);
        if (u.phone) setPhone(u.phone);
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
      };
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));

      showSuccess(`Profile setup complete! Welcome, ${res.data.user.fullName || 'there'}!`, 'Welcome to CityLinks');

      // Navigate exclusively to the Main Home page
      setTimeout(() => {
        router.replace('/');
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
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
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
            <View className="w-16 h-16 rounded-full bg-[#9333ea] items-center justify-center mr-4 shadow-sm">
              <Text className="text-white font-bold text-2xl">
                {userInitial}
              </Text>
            </View>
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

            {/* Address */}
            <View>
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                Address
              </Text>
              <TextInput
                placeholder="Enter your city / doorstep address"
                multiline
                numberOfLines={2}
                value={address}
                onChangeText={setAddress}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 text-sm"
              />
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
