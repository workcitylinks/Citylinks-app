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
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import { AppRefreshControl } from "../components/ui/RefreshableScrollView";

const ResetPasswordPage = () => {
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";
  const otp = (params.otp as string) || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setPassword("");
    setConfirmPassword("");
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  }, []);

  const { showSuccess, showError } = useToast();

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      showError("Please enter both password fields.", "Missing Fields");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters.", "Password Too Short");
      return;
    }

    if (password !== confirmPassword) {
      showError("Passwords do not match.", "Password Mismatch");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/reset-password', {
        email,
        otp,
        password,
      });

      if (response.data.token) {
        await AsyncStorage.setItem('user_token', response.data.token);
        if (response.data.user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        }
      }

      const userName = response.data.user?.fullName || "there";
      showSuccess(`Welcome back, ${userName}! Password updated.`, "Welcome Back");

      setTimeout(() => {
        router.replace("/");
      }, 800);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Failed to reset password. Please try again.";
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
            paddingBottom: isKeyboardVisible ? 260 : 36 
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
                Create New Password
              </Text>
              {!isKeyboardVisible && (
                <Text className="text-sm text-muted-foreground text-center">
                  Your identity has been verified. Enter your new password below.
                </Text>
              )}
            </View>

            <View className="space-y-4 gap-y-4">
              <View>
                <Text className="text-foreground mb-2 font-medium">New Password</Text>
                <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                  <Lock color="#64748b" size={20} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                    onFocus={() => {
                      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 50, animated: true }), 100);
                    }}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    className="p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? <EyeOff color="#64748b" size={20} /> : <Eye color="#64748b" size={20} />}
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-foreground mb-2 font-medium">Confirm Password</Text>
                <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                  <Lock color="#64748b" size={20} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="go"
                    onSubmitEditing={handleResetPassword}
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                    onFocus={() => {
                      setTimeout(() => scrollViewRef.current?.scrollTo({ y: 120, animated: true }), 100);
                    }}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showConfirmPassword ? <EyeOff color="#64748b" size={20} /> : <Eye color="#64748b" size={20} />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleResetPassword}
                disabled={loading}
                className="bg-primary rounded-lg h-12 items-center justify-center mt-2 shadow-sm active:opacity-90"
              >
                {loading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="white" />
                    <Text className="text-primary-foreground font-semibold text-base">
                      Updating Password...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-primary-foreground font-semibold text-lg">
                    Reset & Sign In
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
                <Text className="text-muted-foreground font-medium">Cancel and Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPasswordPage;
