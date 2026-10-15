import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Image,
  Keyboard
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Mail } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import { AppRefreshControl } from "../components/ui/RefreshableScrollView";

const ForgotPasswordPage = () => {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || "");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { showSuccess, showError } = useToast();

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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setEmail("");
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  }, []);

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSendResetCode = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      showError("Please enter your email address.", "Email Required");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      showError("Please enter a valid email address.", "Invalid Email");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email: trimmedEmail });
      showSuccess(response.data.message || "Reset code sent to your email!", "Code Sent");
      
      setTimeout(() => {
        router.push({
          pathname: "/verify-otp",
          params: { email: trimmedEmail, mode: "reset-password" },
        });
      }, 700);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Failed to process request. Please try again.";
      showError(errorMsg, "Reset Failed");
    } finally {
      setLoading(false);
    }
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
            {/* Logo at Top Center */}
            <View className={`items-center ${isKeyboardVisible ? 'mb-4' : 'mb-8'}`}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={{ width: isKeyboardVisible ? 52 : 84, height: isKeyboardVisible ? 52 : 84 }} 
                resizeMode="contain" 
                className={isKeyboardVisible ? "mb-2" : "mb-4"}
              />
              <Text className={`${isKeyboardVisible ? 'text-xl' : 'text-2xl'} font-bold text-foreground mb-1 text-center`}>
                Forgot Password?
              </Text>
              {!isKeyboardVisible && (
                <Text className="text-sm text-muted-foreground text-center">
                  Enter your registered email address and we'll send you an OTP to reset your password.
                </Text>
              )}
            </View>

            <View className="space-y-4 gap-y-4">
              <View>
                <Text className="text-foreground mb-2 font-medium">Email Address</Text>
                <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                  <Mail color="#64748b" size={20} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="go"
                    onSubmitEditing={handleSendResetCode}
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                    onFocus={() => {
                      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 50, animated: true }), 100);
                    }}
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSendResetCode}
                disabled={loading}
                className="bg-primary rounded-lg h-12 items-center justify-center mt-2 shadow-sm active:opacity-90"
              >
                {loading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="white" />
                    <Text className="text-primary-foreground font-semibold text-base">
                      Sending Code...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-primary-foreground font-semibold text-lg">
                    Send Verification Code
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-8 flex-row justify-center">
              <TouchableOpacity 
                onPress={() => router.push("/auth")}
                className="flex-row items-center gap-2"
              >
                <ArrowLeft color="#64748b" size={16} />
                <Text className="text-muted-foreground font-medium">Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordPage;
