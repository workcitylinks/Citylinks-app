import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StatusBar } from 'react-native';

export default function SplashScreenView() {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Horizontal progress animation (runs smoothly for 2 seconds)
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade & scale entrance for branding
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      // Smooth linear 2-second horizontal loading bar
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />
      {/* Centered Logo & App Name with zero gray blocks */}
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={{ width: 115, height: 115 }}
          resizeMode="contain"
          className="mb-4"
        />
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">
          City<Text className="text-[#2563eb]">Links</Text>
        </Text>
        <Text className="text-slate-400 text-sm mt-1 font-medium">
          Your city, connected.
        </Text>
      </Animated.View>

      {/* Horizontal Line Loading Bar */}
      <View className="absolute bottom-20 w-48 items-center">
        {/* Background Track */}
        <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          {/* Animated Fill Bar */}
          <Animated.View
            style={{
              height: '100%',
              width: progressWidth,
              backgroundColor: '#2563eb',
              borderRadius: 999,
            }}
          />
        </View>
      </View>
    </View>
  );
}
