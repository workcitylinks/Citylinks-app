import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, User, Check, ArrowRight } from 'lucide-react-native';
import GoogleLogo from './ui/GoogleLogo';

interface GoogleAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (account: { email: string; fullName: string }) => Promise<void>;
  loading: boolean;
  isSignUp?: boolean;
}

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  visible,
  onClose,
  onSelectAccount,
  loading,
  isSignUp = false,
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const defaultAccounts = [
    {
      fullName: 'Demo Google User',
      email: 'user.citylinks@gmail.com',
      avatarLetter: 'U',
      avatarBg: '#4285F4',
    },
  ];

  const handleSelect = async (acc: { email: string; fullName: string }) => {
    await onSelectAccount(acc);
  };

  const handleCustomSubmit = async () => {
    if (!customEmail.trim()) return;
    const name = customName.trim() || customEmail.split('@')[0];
    await onSelectAccount({ email: customEmail.trim(), fullName: name });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalCard}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <GoogleLogo size={24} />
                  <Text style={styles.headerTitle}>
                    {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.headerSubtitle}>
                Choose an account to continue to <Text style={{ fontWeight: '700', color: '#2563eb' }}>CityLinks</Text>
              </Text>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4285F4" />
                  <Text style={styles.loadingText}>Connecting to Google OAuth...</Text>
                </View>
              ) : !isCustomMode ? (
                <View style={{ marginTop: 12 }}>
                  {defaultAccounts.map((acc, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.75}
                      onPress={() => handleSelect(acc)}
                      style={styles.accountRow}
                    >
                      <View style={[styles.avatarCircle, { backgroundColor: acc.avatarBg }]}>
                        <Text style={styles.avatarText}>{acc.avatarLetter}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.accountName}>{acc.fullName}</Text>
                        <Text style={styles.accountEmail}>{acc.email}</Text>
                      </View>
                      <ArrowRight size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsCustomMode(true)}
                    style={styles.addAccountBtn}
                  >
                    <View style={styles.addAccountIconCircle}>
                      <User size={16} color="#4285F4" />
                    </View>
                    <Text style={styles.addAccountText}>Use another Google account</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Google Account Email</Text>
                  <TextInput
                    value={customEmail}
                    onChangeText={setCustomEmail}
                    placeholder="example@gmail.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    placeholderTextColor="#94a3b8"
                    autoFocus
                  />

                  <Text style={[styles.inputLabel, { marginTop: 10 }]}>Full Name (Optional)</Text>
                  <TextInput
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder="Your Name"
                    style={styles.input}
                    placeholderTextColor="#94a3b8"
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIsCustomMode(false)}
                      style={styles.backBtn}
                    >
                      <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleCustomSubmit}
                      disabled={!customEmail.trim()}
                      style={[
                        styles.continueBtn,
                        !customEmail.trim() && { backgroundColor: '#94a3b8' },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <GoogleLogo size={16} />
                        <Text style={styles.continueBtnText}>Continue with Google</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Security Footer */}
              <View style={styles.footerNote}>
                <Text style={styles.footerText}>
                  To continue, Google will share your name, email address, and profile picture with CityLinks. 100% Free & Secure.
                </Text>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 4,
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  accountEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addAccountIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAccountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  backBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  continueBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerNote: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerText: {
    fontSize: 10.5,
    color: '#94a3b8',
    lineHeight: 14,
    textAlign: 'center',
  },
});

export default GoogleAccountModal;
