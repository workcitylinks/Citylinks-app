import React, { useState, useRef, useEffect } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  StyleSheet,
  Pressable,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ShieldCheck } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { apiClient } from "../api/apiClient";

const OTP_LENGTH = 5;

const VerifyOTP = () => {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const inputRef = useRef<TextInput>(null);

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
      const response = await apiClient.post('/auth/verify-otp', { email, otp });
      if (response.data.token) {
        Alert.alert("Success", "Account verified!");
        router.replace("/");
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Invalid or expired OTP");
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
      await apiClient.post('/auth/resend-otp', { email });
      setTimeLeft(120); // Reset timer
      Alert.alert("Success", "New OTP sent to your email!");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handlePressBoxes = () => {
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-slate-800 ml-2">OTP Verification</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          
          {/* Illustration Area */}
          <View className="items-center justify-center py-6 mt-2">
            <View className="bg-blue-50 p-8 rounded-full items-center justify-center">
              <ShieldCheck color="#3b82f6" size={80} strokeWidth={1.5} />
            </View>
          </View>

          {/* Text Section */}
          <View className="mb-8">
            <Text className="text-2xl font-semibold text-slate-800 mb-3">
              <Text className="font-bold">OTP Code </Text>
              Verification
            </Text>
            <Text className="text-slate-500 text-base leading-6">
              We have sent an OTP code to your Email{"\n"}
              <Text className="font-semibold text-slate-700">{email || "your email"}</Text>. Enter the OTP code below to verify.
            </Text>
          </View>

          {/* OTP Input Section */}
          <View className="items-center mb-8">
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
            />
          </View>

          {/* Resend Section */}
          <View className="items-center mt-2 mb-8">
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
