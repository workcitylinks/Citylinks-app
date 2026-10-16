import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Bell,
  Send,
  Users,
  Store,
  Wrench,
  Truck,
  Laptop,
  User,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Shield,
  Layers,
  Calendar,
  Timer,
} from 'lucide-react-native';
import { apiClient } from '../api/apiClient';
import { useToast } from '../context/ToastContext';
import { AppRefreshControl } from '../components/ui/RefreshableScrollView';

interface DepartmentOption {
  id: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  icon: any;
}

const DEPARTMENTS: DepartmentOption[] = [
  {
    id: 'ALL',
    label: 'All Departments',
    description: 'Broadcast to all citizens, partners & merchants',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: Users,
  },
  {
    id: 'MERCHANT',
    label: 'Shop Keepers',
    description: 'Retailers, storefronts & shop operators',
    color: '#ea580c',
    bg: '#fff7ed',
    icon: Store,
  },
  {
    id: 'MANUAL_SERVICE_PROVIDER',
    label: 'Manual Service Providers',
    description: 'Technicians, mechanics, electricians & repair trades',
    color: '#16a34a',
    bg: '#f0fdf4',
    icon: Wrench,
  },
  {
    id: 'DIGITAL_SERVICE_PROVIDER',
    label: 'Digital Service Providers',
    description: 'Designers, developers, digital media & tech experts',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    icon: Sparkles,
  },
  {
    id: 'TRANSPORT',
    label: 'Transport Fleet',
    description: 'Auto drivers, cabs & commercial carriers',
    color: '#0891b2',
    bg: '#ecfeff',
    icon: Truck,
  },
  {
    id: 'CUSTOMER',
    label: 'Customers Only',
    description: 'Direct shoppers & service bookers',
    color: '#6366f1',
    bg: '#eef2ff',
    icon: User,
  },
];

interface ExpiryPreset {
  label: string;
  hours: number;
  isDefault?: boolean;
}

const EXPIRY_PRESETS: ExpiryPreset[] = [
  { label: '6 Hours', hours: 6 },
  { label: '12 Hours', hours: 12 },
  { label: '24 Hours', hours: 24, isDefault: true },
  { label: '48 Hours (2 Days)', hours: 48 },
  { label: '72 Hours (3 Days)', hours: 72 },
  { label: '7 Days', hours: 168 },
];

export default function AdminNotificationScreen() {
  const { showSuccess, showError } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedHours, setSelectedHours] = useState<number>(24);
  const [customHours, setCustomHours] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  const activeDepartment =
    DEPARTMENTS.find((d) => d.id === selectedDept) || DEPARTMENTS[0];
  const DeptIcon = activeDepartment.icon;

  // Active duration hours
  const effectiveHours = isCustomMode
    ? parseFloat(customHours) || 24
    : selectedHours;

  const handleSendNotification = async () => {
    if (!title.trim()) {
      showError('Please enter a notification title', 'Title Required');
      return;
    }

    if (!description.trim()) {
      showError('Please enter a notification description', 'Description Required');
      return;
    }

    const duration = isCustomMode
      ? parseFloat(customHours)
      : selectedHours;

    if (isNaN(duration) || duration <= 0) {
      showError('Please enter a valid positive number of hours for deletion', 'Invalid Duration');
      return;
    }

    try {
      setSending(true);
      const res = await apiClient.post('/notifications/admin/send', {
        title: title.trim(),
        message: description.trim(),
        department: selectedDept,
        durationHours: duration,
      });

      showSuccess(
        res.data?.message || `Notification broadcasted! Will automatically delete in ${duration} hours.`,
        'Sent Successfully'
      );

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedDept('ALL');
      setSelectedHours(24);
      setCustomHours('');
      setIsCustomMode(false);

      // Navigate back after brief delay
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err: any) {
      console.error('Error sending admin notification:', err);
      showError(
        err.response?.data?.error || 'Failed to dispatch broadcast notification',
        'Error'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#ffffff' }}>
        {/* Header Navbar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
              Broadcast Dispatch
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              Timed Expiry Notification Desk
            </Text>
          </View>

          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f5f3ff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#ede9fe',
            }}
          >
            <Bell size={20} color="#7c3aed" />
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Informational Banner */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              marginBottom: 20,
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#fef3c7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Clock size={16} color="#d97706" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                Timed Auto-Deletion Notice
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#475569', lineHeight: 18 }}>
              This notification will be transmitted directly to target users and will{' '}
              <Text style={{ fontWeight: '800', color: '#d97706' }}>
                automatically delete after {effectiveHours} hour{effectiveHours === 1 ? '' : 's'}
              </Text>{' '}
              (defaults to 24 hours).
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 20,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Input 1: Notification Title */}
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                  Notification Title *
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }}>
                  {title.length}/80
                </Text>
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={80}
                placeholder="e.g., Scheduled Platform Maintenance Notice"
                placeholderTextColor="#94a3b8"
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: title.trim() ? '#cbd5e1' : '#e2e8f0',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#0f172a',
                }}
              />
            </View>

            {/* Input 2: Notification Description */}
            <View style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                  Notification Description *
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#94a3b8' }}>
                  {description.length}/400
                </Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                maxLength={400}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Type the full announcement or alert message here for the selected department..."
                placeholderTextColor="#94a3b8"
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: description.trim() ? '#cbd5e1' : '#e2e8f0',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#0f172a',
                  minHeight: 110,
                  lineHeight: 20,
                }}
              />
            </View>

            {/* Department Selection (Drop Down with ALL as default) */}
            <View style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                  Target Department *
                </Text>
                <View
                  style={{
                    backgroundColor: activeDepartment.bg,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: activeDepartment.color }}>
                    {activeDepartment.label}
                  </Text>
                </View>
              </View>

              {/* Main Selector Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowDeptDropdown(!showDeptDropdown)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: activeDepartment.bg,
                  borderWidth: 1.5,
                  borderColor: activeDepartment.color + '60',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      borderWidth: 1,
                      borderColor: activeDepartment.color + '30',
                    }}
                  >
                    <DeptIcon size={18} color={activeDepartment.color} strokeWidth={2.5} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                      {activeDepartment.label}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#475569' }} numberOfLines={1}>
                      {activeDepartment.description}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: '#ffffff',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a' }}>
                    {showDeptDropdown ? 'Close ▲' : 'Change ▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Dropdown Options List */}
              {showDeptDropdown && (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    marginTop: 10,
                    padding: 8,
                    gap: 6,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    elevation: 4,
                  }}
                >
                  {DEPARTMENTS.map((dept) => {
                    const isSelected = selectedDept === dept.id;
                    const ItemIcon = dept.icon;

                    return (
                      <TouchableOpacity
                        key={dept.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedDept(dept.id);
                          setShowDeptDropdown(false);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor: isSelected ? dept.bg : '#f8fafc',
                          borderWidth: 1,
                          borderColor: isSelected ? dept.color + '40' : '#f1f5f9',
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: dept.bg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          <ItemIcon size={16} color={dept.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                              {dept.label}
                            </Text>
                            {dept.id === 'ALL' && (
                              <View
                                style={{
                                  backgroundColor: '#dbeafe',
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 6,
                                  marginLeft: 6,
                                }}
                              >
                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#1e40af' }}>
                                  DEFAULT
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b' }}>
                            {dept.description}
                          </Text>
                        </View>
                        {isSelected && (
                          <CheckCircle size={18} color={dept.color} strokeWidth={2.5} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* SECTION: TIME OF DELETION (WITH 24HRS AS DEFAULT) */}
            <View style={{ marginBottom: 26 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Timer size={16} color="#7c3aed" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginLeft: 6 }}>
                    Time of Deletion (Expiry) *
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: '#f3e8ff',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#7c3aed' }}>
                    {effectiveHours} Hours
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', marginBottom: 10 }}>
                Select when this notification should be permanently purged. Default is 24 hours.
              </Text>

              {/* Preset Buttons Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {EXPIRY_PRESETS.map((preset) => {
                  const isSelected = !isCustomMode && selectedHours === preset.hours;
                  return (
                    <TouchableOpacity
                      key={preset.hours}
                      activeOpacity={0.7}
                      onPress={() => {
                        setIsCustomMode(false);
                        setSelectedHours(preset.hours);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: isSelected ? '#7c3aed' : '#f8fafc',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#7c3aed' : '#e2e8f0',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: isSelected ? '#ffffff' : '#334155',
                        }}
                      >
                        {preset.label}
                      </Text>
                      {preset.isDefault && (
                        <View
                          style={{
                            backgroundColor: isSelected ? '#ffffff' : '#f1f5f9',
                            paddingHorizontal: 5,
                            paddingVertical: 1,
                            borderRadius: 6,
                            marginLeft: 5,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '900',
                              color: isSelected ? '#7c3aed' : '#64748b',
                            }}
                          >
                            DEFAULT
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Custom Hours Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsCustomMode(true)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: isCustomMode ? '#7c3aed' : '#f8fafc',
                    borderWidth: 1.5,
                    borderColor: isCustomMode ? '#7c3aed' : '#e2e8f0',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: isCustomMode ? '#ffffff' : '#334155',
                    }}
                  >
                    Custom Hours ✎
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Hours Input Section (Shown when custom is selected) */}
              {isCustomMode && (
                <View
                  style={{
                    backgroundColor: '#faf5ff',
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1.5,
                    borderColor: '#d8b4fe',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b21a8', marginBottom: 6 }}>
                    Specify Custom Deletion Duration:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={customHours}
                      onChangeText={setCustomHours}
                      keyboardType="numeric"
                      maxLength={5}
                      placeholder="e.g., 36"
                      placeholderTextColor="#a855f7"
                      style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#c084fc',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                        fontWeight: '700',
                        color: '#0f172a',
                      }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6b21a8' }}>
                      Hours from now
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* SEND BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={sending}
              onPress={handleSendNotification}
              style={{
                backgroundColor: '#7c3aed',
                borderRadius: 18,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                shadowColor: '#7c3aed',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              {sending ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff', marginLeft: 8 }}>
                    Broadcasting...
                  </Text>
                </>
              ) : (
                <>
                  <Send size={18} color="#ffffff" strokeWidth={2.5} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff', marginLeft: 8 }}>
                    Send Notification
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
