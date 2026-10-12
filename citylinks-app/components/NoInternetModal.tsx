import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useNetwork } from '../context/NetworkContext';

export default function NoInternetModal() {
  const { isConnected, isChecking, checkConnection } = useNetwork();

  // If connected, this screen is completely invisible and disappears automatically
  if (isConnected) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        zIndex: 999999,
        elevation: 999999,
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View className="flex-1 px-8 items-center justify-center">
          {/* Animated Glow Circle with WifiOff Icon */}
          <View className="relative items-center justify-center mb-8">
            <View className="w-32 h-32 rounded-full bg-rose-50 items-center justify-center border-4 border-rose-100 shadow-sm">
              <View className="w-20 h-20 rounded-full bg-rose-500/10 items-center justify-center">
                <WifiOff size={44} color="#e11d48" strokeWidth={2.2} />
              </View>
            </View>
            <View className="absolute -bottom-2 bg-rose-600 px-3 py-1 rounded-full shadow-sm flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
              <Text className="text-white text-[11px] font-bold tracking-wide uppercase">Offline</Text>
            </View>
          </View>

          {/* Heading and details */}
          <Text className="text-2xl font-bold text-slate-900 text-center mb-2 tracking-tight">
            No Internet Connection
          </Text>
          <Text className="text-sm text-slate-500 text-center leading-relaxed max-w-[290px] mb-8">
            Please check your mobile data or Wi-Fi network. The app will automatically resume once the connection is back.
          </Text>

          {/* Auto detection badge */}
          <View className="flex-row items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 mb-8">
            <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 8 }} />
            <Text className="text-xs text-slate-600 font-medium">
              Continuously checking for connection...
            </Text>
          </View>

          {/* Manual Refresh / Retry Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isChecking}
            onPress={() => checkConnection()}
            className="w-full max-w-[280px] bg-[#2563eb] h-13 rounded-2xl flex-row items-center justify-center shadow-md active:bg-blue-700"
            style={{ height: 52 }}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
            ) : (
              <RefreshCw size={18} color="#ffffff" style={{ marginRight: 8 }} />
            )}
            <Text className="text-white font-bold text-base">
              {isChecking ? 'Checking Network...' : 'Retry Connection'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
