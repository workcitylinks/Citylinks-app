import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

const HeroSection = () => {
  return (
    <View className="items-center mb-16 md:mb-20 px-4">
      <Animated.View 
        entering={FadeIn.delay(100).duration(500)}
        className="flex-row items-center gap-2 rounded-full px-4 py-2 mb-6 border border-border bg-card"
      >
        <View className="w-2 h-2 rounded-full bg-[#10b981]" />
        <Text className="text-sm font-medium text-muted-foreground">
          Hyperlocal Services Platform
        </Text>
      </Animated.View>

      <Animated.Text 
        entering={FadeInUp.delay(200).duration(600)}
        className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-foreground text-center"
      >
        Welcome to{' '}
        <Text className="text-primary">CityLinks</Text>
      </Animated.Text>

      <Animated.Text 
        entering={FadeInUp.delay(300).duration(600)}
        className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl"
      >
        Connecting customers, merchants, service providers, and administrators in one unified hyperlocal marketplace.
      </Animated.Text>
    </View>
  );
};

export default HeroSection;
