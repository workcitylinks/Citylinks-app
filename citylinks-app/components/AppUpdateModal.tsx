import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Animated,
  BackHandler,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Rocket, Sparkles, ExternalLink, ArrowRight } from 'lucide-react-native';
import { apiClient } from '../api/apiClient';

interface AppRelease {
  id: string;
  version: string;
  updateUrl: string;
  notes?: string | null;
  isMandatory?: boolean;
  releasedBy?: string;
  createdAt: string;
}

export const AppUpdateModal: React.FC = () => {
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [visible, setVisible] = useState(false);
  const [openingLink, setOpeningLink] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Check for latest release
  const checkForUpdate = async () => {
    try {
      const res = await apiClient.get('/app-release/latest');
      const latest: AppRelease | null = res.data?.release;

      if (latest && latest.updateUrl) {
        const ackKey = `citylinks_acknowledged_update_${latest.id}`;
        const isAcknowledged = await AsyncStorage.getItem(ackKey);

        if (!isAcknowledged) {
          setRelease(latest);
          setVisible(true);

          // Animate card entrance
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
              toValue: 0,
              bounciness: 6,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          setVisible(false);
        }
      } else {
        setVisible(false);
      }
    } catch (e) {
      // Ignore network errors during background check
    }
  };

  useEffect(() => {
    // Initial check
    checkForUpdate();

    // Poll every 5 seconds so active users receive update prompt immediately
    const interval = setInterval(checkForUpdate, 5000);

    return () => clearInterval(interval);
  }, []);

  // Icon pulse animation
  useEffect(() => {
    if (visible) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      // Intercept Android hardware back button so modal cannot be dismissed
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true; // Block back button
      });

      return () => {
        pulseLoop.stop();
        backHandler.remove();
      };
    }
  }, [visible]);

  // Handle Update Action
  const handleUpdatePress = async () => {
    if (!release?.updateUrl) return;

    try {
      setOpeningLink(true);

      const targetUrl = release.updateUrl.trim();
      const canOpen = await Linking.canOpenURL(targetUrl).catch(() => true);

      if (canOpen) {
        await Linking.openURL(targetUrl);
      }

      // Mark as acknowledged only after user taps to update
      const ackKey = `citylinks_acknowledged_update_${release.id}`;
      await AsyncStorage.setItem(ackKey, 'true');

      // Dismiss card upon clicking update
      setVisible(false);
    } catch (err) {
      console.warn('Error opening update link:', err);
      // Fallback: still dismiss after tap attempt
      if (release) {
        await AsyncStorage.setItem(`citylinks_acknowledged_update_${release.id}`, 'true').catch(() => {});
      }
      setVisible(false);
    } finally {
      setOpeningLink(false);
    }
  };

  if (!visible || !release) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => {
        // Strict requirement: User cannot dismiss modal with back button
      }}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header Icon with Glowing Halo */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.iconBadge,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Rocket size={34} color="#ffffff" />
            </Animated.View>
          </View>

          {/* Title & Version Badge */}
          <View style={styles.headerTextContainer}>
            <View style={styles.tagRow}>
              <View style={styles.versionBadge}>
                <Sparkles size={13} color="#7c3aed" />
                <Text style={styles.versionText}>{release.version || 'New Version'}</Text>
              </View>
              <View style={styles.mandatoryBadge}>
                <Text style={styles.mandatoryText}>UPDATE REQUIRED</Text>
              </View>
            </View>

            <Text style={styles.title}>New Update Released!</Text>
            <Text style={styles.subtitle}>
              An official update is now available for CityLinks. Please update to enjoy the latest features, security enhancements, and smooth performance.
            </Text>
          </View>

          {/* Release Notes (if provided) */}
          {release.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesHeader}>What's New in this Release:</Text>
              <Text style={styles.notesContent}>{release.notes}</Text>
            </View>
          ) : null}

          {/* Update Action Button (Only pressing this dismisses the card) */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleUpdatePress}
            disabled={openingLink}
            style={styles.updateButton}
          >
            <Text style={styles.updateButtonText}>
              {openingLink ? 'Opening Store...' : 'Update & Launch Now'}
            </Text>
            <ArrowRight size={20} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Tapping update will direct you to download the latest release.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1.5,
    borderColor: '#ede9fe',
  },
  iconContainer: {
    marginTop: -8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  versionText: {
    color: '#7c3aed',
    fontWeight: '800',
    fontSize: 12,
  },
  mandatoryBadge: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mandatoryText: {
    color: '#dc2626',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  notesBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notesContent: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  updateButton: {
    width: '100%',
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default AppUpdateModal;
