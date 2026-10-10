import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const FloatingOrbs = () => {
  const orb1Y = useSharedValue(0);
  const orb2Y = useSharedValue(0);
  const orb3Y = useSharedValue(0);

  useEffect(() => {
    orb1Y.value = withRepeat(withSequence(withTiming(-40, { duration: 5000 }), withTiming(20, { duration: 5000 }), withTiming(0, { duration: 5000 })), -1, true);
    orb2Y.value = withRepeat(withSequence(withTiming(30, { duration: 6000 }), withTiming(-25, { duration: 6000 }), withTiming(0, { duration: 6000 })), -1, true);
    orb3Y.value = withRepeat(withSequence(withTiming(-20, { duration: 5500 }), withTiming(30, { duration: 5500 }), withTiming(0, { duration: 5500 })), -1, true);
  }, []);

  const style1 = useAnimatedStyle(() => ({ transform: [{ translateY: orb1Y.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ translateY: orb2Y.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ translateY: orb3Y.value }] }));

  return (
    <View style={StyleSheet.absoluteFill} className="pointer-events-none -z-10 bg-background overflow-hidden">
      <Animated.View
        style={[
          { position: 'absolute', top: height * 0.1, left: width * 0.15, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(59, 130, 246, 0.08)' },
          style1
        ]}
      />
      <Animated.View
        style={[
          { position: 'absolute', top: height * 0.6, right: width * 0.1, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(139, 92, 246, 0.06)' },
          style2
        ]}
      />
      <Animated.View
        style={[
          { position: 'absolute', bottom: height * 0.2, left: width * 0.4, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(16, 185, 129, 0.06)' },
          style3
        ]}
      />
    </View>
  );
};

export default FloatingOrbs;
