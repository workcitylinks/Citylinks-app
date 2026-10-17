import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  ImageStyle,
  TouchableOpacity,
  Text,
} from 'react-native';
import {
  Image as ExpoImage,
  ImageProps as ExpoImageProps,
  ImageContentFit,
  ImageSource,
} from 'expo-image';
import { ImageIcon } from 'lucide-react-native';

export type LazyImageSource =
  | string
  | number
  | { uri: string; [key: string]: any }
  | null
  | undefined;

export interface LazyImageProps extends Omit<ExpoImageProps, 'source' | 'style'> {
  source: LazyImageSource;
  style?: StyleProp<ImageStyle | ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  /** Backward-compatible alias for contentFit */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  transition?: number;
  showLoader?: boolean;
  loaderColor?: string;
  loaderSize?: 'small' | 'large';
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
  onPress?: () => void;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  priority?: 'low' | 'normal' | 'high';
}

/**
 * High-performance Lazy Image component powered by expo-image.
 * Features:
 * - Lazy loading with disk + memory caching
 * - Smooth fade-in transition
 * - Built-in activity loader indicator while downloading
 * - Resilient error handling with fallback placeholder UI
 * - Compatible with React Native's standard Image props (resizeMode, uri strings, require())
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  containerStyle,
  contentFit,
  resizeMode,
  transition = 200,
  showLoader = true,
  loaderColor = '#3b82f6',
  loaderSize = 'small',
  fallbackIcon,
  fallbackText,
  onPress,
  cachePolicy = 'memory-disk',
  priority = 'normal',
  onLoadStart,
  onLoad,
  onLoadEnd,
  onError,
  ...restProps
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Normalize source into expo-image compatible ImageSource
  let resolvedSource: ImageSource | number | null = null;
  let uriString = '';

  if (typeof source === 'string') {
    uriString = source.trim();
    if (uriString.length > 0) {
      resolvedSource = { uri: uriString };
    }
  } else if (typeof source === 'number') {
    resolvedSource = source;
  } else if (source && typeof source === 'object' && 'uri' in source && source.uri) {
    uriString = String(source.uri).trim();
    if (uriString.length > 0) {
      resolvedSource = { ...source, uri: uriString };
    }
  }

  // Map legacy resizeMode to expo-image contentFit if contentFit was not explicitly provided
  const resolvedContentFit: ImageContentFit =
    contentFit ||
    (resizeMode === 'center'
      ? 'scale-down'
      : resizeMode === 'stretch'
      ? 'fill'
      : (resizeMode as ImageContentFit) || 'cover');

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  };

  const handleLoad = (e: any) => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(e);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = (e: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  };

  const flattenedStyle = (StyleSheet.flatten(style) || {}) as any;

  // Extract layout dimensions and margins to ensure wrapper container has correct spacing
  const {
    width,
    height,
    borderRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    margin,
    marginRight,
    marginLeft,
    marginTop,
    marginBottom,
    marginHorizontal,
    marginVertical,
  } = flattenedStyle;

  const radiusStyles = {
    borderRadius,
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
  };

  const marginStyles = {
    margin,
    marginRight,
    marginLeft,
    marginTop,
    marginBottom,
    marginHorizontal,
    marginVertical,
  };

  const renderContent = () => {
    // If no valid source or error occurred, display fallback UI
    if (!resolvedSource || hasError) {
      return (
        <View
          style={[
            styles.fallbackContainer,
            { width, height },
            radiusStyles,
            marginStyles,
            containerStyle,
          ]}
        >
          {fallbackIcon || <ImageIcon size={24} color="#94a3b8" />}
          {fallbackText ? (
            <Text style={styles.fallbackText} numberOfLines={1}>
              {fallbackText}
            </Text>
          ) : null}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.wrapper,
          { width, height },
          radiusStyles,
          marginStyles,
          containerStyle,
        ]}
      >
        <ExpoImage
          source={resolvedSource}
          style={[{ width: '100%', height: '100%' }, radiusStyles]}
          contentFit={resolvedContentFit}
          transition={transition}
          cachePolicy={cachePolicy}
          priority={priority}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          {...(restProps as any)}
        />

        {isLoading && showLoader && (
          <View
            style={[
              styles.loaderOverlay,
              radiusStyles,
            ]}
            pointerEvents="none"
          >
            <ActivityIndicator size={loaderSize} color={loaderColor} />
          </View>
        )}
      </View>
    );
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={containerStyle}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return renderContent();
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.7)',
  },
  fallbackContainer: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 8,
  },
  fallbackText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
});
export default LazyImage;
