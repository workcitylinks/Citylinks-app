import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { X, Maximize2 } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageEnlargeModalProps {
  visible: boolean;
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  price?: string;
  onClose: () => void;
}

export const ImageEnlargeModal: React.FC<ImageEnlargeModalProps> = ({
  visible,
  imageUrl,
  title,
  subtitle,
  badge,
  price,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);

  if (!visible || !imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.96)" />
      <View style={styles.container}>
        {/* Backdrop tap to close */}
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.tagBadge}>
            <Maximize2 size={13} color="#ffffff" />
            <Text style={styles.tagText}>ENLARGED VIEW</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close enlarged image"
          >
            <X size={20} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Center Image Container */}
        <View style={styles.imageWrapper} pointerEvents="box-none">
          {loading && (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading HD Image...</Text>
            </View>
          )}
          <Image
            source={{ uri: imageUrl }}
            style={styles.mainImage}
            resizeMode="contain"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />
        </View>

        {/* Bottom Details Footer */}
        {(title || subtitle || badge || price) && (
          <View style={styles.footerContainer}>
            <View style={styles.footerContent}>
              <View style={styles.footerHeaderRow}>
                {badge && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
                {price && (
                  <View style={styles.pricePill}>
                    <Text style={styles.priceText}>{price}</Text>
                  </View>
                )}
              </View>

              {title && (
                <Text style={styles.titleText} numberOfLines={2}>
                  {title}
                </Text>
              )}

              {subtitle && (
                <Text style={styles.subtitleText} numberOfLines={2}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  tagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  loaderBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  mainImage: {
    width: SCREEN_WIDTH - 16,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 16,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    zIndex: 10,
  },
  footerContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  footerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badgePill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  pricePill: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  subtitleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 16,
  },
});

export default ImageEnlargeModal;
