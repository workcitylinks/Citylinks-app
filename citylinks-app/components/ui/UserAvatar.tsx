import React, { useState } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  textSize?: number;
  bgColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  email,
  size = 40,
  textSize,
  bgColor = '#9333ea',
  style,
}) => {
  const [hasError, setHasError] = useState(false);

  // Derive initial from name or email
  const initial = (name?.trim() ? name.trim().charAt(0) : email?.trim() ? email.trim().charAt(0) : 'C').toUpperCase();

  // Font size defaults to roughly 42% of avatar size
  const calculatedTextSize = textSize || Math.round(size * 0.42);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const cleanAvatarUrl = avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim().length > 0 ? avatarUrl.trim() : null;

  // First preference: Avatar URL with lazy loading & disk/memory cache
  if (cleanAvatarUrl && !hasError) {
    return (
      <View style={[styles.avatarContainer, containerStyle, style]}>
        <ExpoImage
          source={{ uri: cleanAvatarUrl }}
          style={[styles.avatarImage, containerStyle]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          priority="high"
          onError={() => setHasError(true)}
        />
      </View>
    );
  }

  // Fallback: Alphabet initial circle
  return (
    <View style={[styles.avatarContainer, containerStyle, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.initialText, { fontSize: calculatedTextSize }]}>
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialText: {
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
