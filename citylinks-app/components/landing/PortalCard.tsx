import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

interface PortalCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  colorHex: string;
  route: string;
  index: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const PortalCard = ({ title, subtitle, description, icon: Icon, colorHex, route, index }: PortalCardProps) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 10, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  return (
    <Animated.View 
      entering={FadeInUp.delay(300 + index * 100).duration(500)}
      className={`${isTablet ? 'w-[48%]' : 'w-full'} mb-4 md:mb-0`}
    >
      <AnimatedTouchable
        style={[animatedStyle]}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push(route as any)}
        className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm h-full"
      >
        <View 
          className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
          style={{ backgroundColor: `${colorHex}15` }}
        >
          <Icon color={colorHex} size={28} />
        </View>

        <Text className="text-xl font-bold text-foreground mb-1">
          {title}
        </Text>
        <Text 
          className="text-sm font-medium mb-3"
          style={{ color: colorHex }}
        >
          {subtitle}
        </Text>
        <Text className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </Text>
      </AnimatedTouchable>
    </Animated.View>
  );
};

export default PortalCard;
