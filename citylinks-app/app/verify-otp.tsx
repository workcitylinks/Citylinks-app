import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  Pressable, 
  ScrollView,
  Image,
  Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import { getParticularLoggedPage } from "../utils/authRedirect";
import { registerForPushNotificationsAsync } from "../services/pushNotifications";
import { AppRefreshControl } from "../components/ui/RefreshableScrollView";

const OTP_LENGTH = 5;

const VerifyOTP = () => {
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setOtp("");
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  }, []);
  const email = (params.email as string) || "";
  const mode = (params.mode as string) || "signup"; // 'signup' | 'reset-password'

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const inputRef = useRef<TextInput>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (timeLeft <= 0) return;
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Auto-submit when 5 digits are entered
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      handleVerify();
    }
  }, [otp]);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) return;
    
    setLoading(true);
    try {
      if (mode === "reset-password") {
        await apiClient.post('/auth/verify-reset-otp', { email, otp });
        showSuccess("Code verified! Set your new password.", "Code Verified");
        setTimeout(() => {
          router.push({ pathname: "/reset-password", params: { email, otp } });
        }, 600);
      } else {
        const response = await apiClient.post('/auth/verify-otp', { email, otp });
        if (response.data.token) {
          await AsyncStorage.setItem('user_token', response.data.token);
          if (response.data.user) {
            await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
          }

          // Register push notifications
          registerForPushNotificationsAsync().catch(() => {});

          const userName = response.data.user?.fullName || "there";
          const destination = getParticularLoggedPage(response.data.user, params.redirect as string);
          
          if (response.data.isProfileComplete) {
            showSuccess(`Welcome to CityLinks, ${userName}!`, "Account Verified");
            setTimeout(() => {
              router.replace(destination as any);
            }, 800);
          } else {
            showSuccess("Account verified! Let's complete your profile.", "Almost Done");
            setTimeout(() => {
              router.replace({ 
                pathname: "/complete-profile", 
                params: { 
                  email: response.data.user?.email || email,
                  fullName: response.data.user?.fullName || "",
                  redirect: (params.redirect as string) || "",
                } 
              });
            }, 800);
          }
        }
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.error || "Invalid or expired OTP";
      showError(errMsg, "Verification Failed");
      setOtp(""); // Clear on error
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0) return;
    
    setLoading(true);
    try {
      if (mode === "reset-password") {
        await apiClient.post('/auth/forgot-password', { email });
      } else {
        await apiClient.post('/auth/resend-otp', { email });
      }
      setTimeLeft(120); // Reset timer
      showSuccess("New OTP sent to your email!", "Code Resent");
    } catch (error: any) {
      showError(error.response?.data?.error || "Failed to resend OTP", "Resend Failed");
    } finally {
      setLoading(false);
    }
  };

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handlePressBoxes = () => {
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        className="flex-1"
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: isKeyboardVisible ? "flex-start" : "center", 
            paddingHorizontal: 24, 
            paddingTop: isKeyboardVisible ? 12 : 28,
            paddingBottom: isKeyboardVisible ? 240 : 36 
          }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <View className="w-full max-w-md mx-auto">
            {/* Logo at top center */}
            <View className={`items-center ${isKeyboardVisible ? 'mb-4' : 'mb-6'}`}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={{ width: isKeyboardVisible ? 52 : 84, height: isKeyboardVisible ? 52 : 84 }} 
                resizeMode="contain" 
                className={isKeyboardVisible ? "mb-2" : "mb-4"}
              />
              <Text className={`${isKeyboardVisible ? 'text-xl' : 'text-2xl'} font-bold text-foreground mb-1 text-center`}>
                {mode === "reset-password" ? "Verify Reset Code" : "OTP Verification"}
              </Text>
              {!isKeyboardVisible && (
                <Text className="text-sm text-muted-foreground text-center">
                  We sent a 5-digit verification code to{"\n"}
                  <Text className="font-semibold text-primary">{email || "your email"}</Text>
                </Text>
              )}
            </View>

          {/* OTP Input Section */}
          <View className={`items-center ${isKeyboardVisible ? 'mb-4' : 'mb-8'}`}>
            <Pressable onPress={handlePressBoxes} className="flex-row gap-3 w-full justify-center">
              {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                const digit = otp[index] || "";
                const isActive = isFocused && otp.length === index;
                
                return (
                  <View 
                    key={index} 
                    className={`w-14 h-16 rounded-xl border-2 items-center justify-center bg-white ${
                      isActive ? "border-blue-500 bg-blue-50/30" : 
                      digit ? "border-slate-300" : "border-slate-200"
                    }`}
                    style={isActive ? styles.activeBoxShadow : null}
                  >
                    <Text className="text-2xl font-bold text-slate-800">{digit}</Text>
                  </View>
                );
              })}
            </Pressable>

            {/* Hidden true input */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(text) => {
                // Only allow numbers and max length 5
                const cleaned = text.replace(/[^0-9]/g, '');
                setOtp(cleaned.slice(0, OTP_LENGTH));
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={OTP_LENGTH}
              className="absolute opacity-0 w-full h-full"
              onFocus={() => {
                setIsFocused(true);
                setTimeout(() => scrollViewRef.current?.scrollTo({ y: 50, animated: true }), 100);
              }}
              onBlur={() => setIsFocused(false)}
              autoFocus
            />
          </View>

          {/* Resend Section */}
          <View className={`items-center ${isKeyboardVisible ? 'mt-1 mb-4' : 'mt-2 mb-8'}`}>
            {loading ? (
              <ActivityIndicator color="#3b82f6" size="large" />
            ) : (
              <>
                <Text className="text-slate-500 text-base">Didn't receive Code?</Text>
                {timeLeft > 0 ? (
                  <Text className="mt-2 text-slate-400 font-semibold text-base">
                    Resend OTP in {formatTime(timeLeft)}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} className="mt-2 p-2">
                    <Text className="text-blue-500 font-semibold text-base">Resend OTP</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <TouchableOpacity 
            onPress={() => router.push("/auth")}
            className="flex-row justify-center items-center gap-2 mt-2"
          >
            <ArrowLeft color="#64748b" size={16} />
            <Text className="text-muted-foreground font-medium">Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  activeBoxShadow: {
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  }
});

export default VerifyOTP;
