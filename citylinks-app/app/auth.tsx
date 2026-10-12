import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Sparkles } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import { AppRefreshControl } from "../components/ui/RefreshableScrollView";

const AuthPage = () => {
  const params = useLocalSearchParams();
  const [isLogin, setIsLogin] = useState(params.mode !== "signup");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setEmail("");
    setPassword("");
    setFullName("");
    lastAttemptedCreds.current = "";
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  }, []);

  const { showSuccess, showError } = useToast();
  const lastAttemptedCreds = useRef<string>("");
  const autoLoginTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleAuth = async (isAuto = false) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      if (!isAuto) {
        showError("Please enter both email and password.", "Missing Fields");
      }
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      if (!isAuto) {
        showError("Please enter a valid email address.", "Invalid Email");
      }
      return;
    }

    if (password.length < 6) {
      if (!isAuto) {
        showError("Password must be at least 6 characters.", "Invalid Password");
      }
      return;
    }

    // Prevent duplicate attempts for the exact same credentials
    const credKey = `${trimmedEmail}:${password}`;
    if (isAuto && lastAttemptedCreds.current === credKey) {
      return;
    }

    lastAttemptedCreds.current = credKey;
    setLoading(true);

    try {
      if (isLogin) {
        const response = await apiClient.post('/auth/login', {
          email: trimmedEmail,
          password,
        });

        if (response.data.token) {
          await AsyncStorage.setItem('user_token', response.data.token);
          if (response.data.user) {
            await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
          }
          const userName = response.data.user?.fullName || "there";
          showSuccess(`Welcome back, ${userName}!`, "Welcome Back");
          
          setTimeout(() => {
            router.replace("/");
          }, 800);
        }
      } else {
        await apiClient.post('/auth/register', {
          email: trimmedEmail,
          password,
          fullName: fullName.trim(),
        });
        showSuccess("Verification code sent to your email!", "Code Sent");
        router.push({ pathname: "/verify-otp", params: { email: trimmedEmail } });
      }
    } catch (error: any) {
      const serverError = error.response?.data?.error;
      const defaultError = isLogin ? "Your email or password is wrong" : (error.message || "Something went wrong");
      const errorMessage = serverError || defaultError;
      
      showError(errorMessage, isLogin ? "Login Failed" : "Registration Failed");

      // If user is unverified, prompt them to verify
      if (error.response?.status === 403 && error.response?.data?.email) {
        setTimeout(() => {
          router.push({ pathname: "/verify-otp", params: { email: error.response.data.email } });
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  // Automatic login when correct format of email & password (>= 6 chars) are filled in login mode
  useEffect(() => {
    if (!isLogin) return;

    const trimmedEmail = email.trim().toLowerCase();
    const credKey = `${trimmedEmail}:${password}`;

    if (autoLoginTimer.current) {
      clearTimeout(autoLoginTimer.current);
    }

    if (isValidEmail(trimmedEmail) && password.length >= 6 && credKey !== lastAttemptedCreds.current && !loading) {
      // Debounce auto-login slightly so user has a moment after typing before automatic submission
      autoLoginTimer.current = setTimeout(() => {
        handleAuth(true);
      }, 1000);
    }

    return () => {
      if (autoLoginTimer.current) {
        clearTimeout(autoLoginTimer.current);
      }
    };
  }, [email, password, isLogin]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <View className="w-full max-w-md mx-auto">
            <View className="items-center mb-8">
              <Image 
                source={require('../assets/images/logo.png')} 
                style={{ width: 84, height: 84 }} 
                resizeMode="contain" 
                className="mb-4"
              />
              <Text className="text-2xl font-bold text-foreground mb-1">
                {isLogin ? "Sign in to " : "Join "}
                <Text className="text-primary">CityLinks</Text>
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
                {isLogin ? "Welcome back! Enter your details to continue." : "Create your account to get started"}
              </Text>
            </View>

            <View className="space-y-4 gap-y-4">
              {!isLogin && (
                <View>
                  <Text className="text-foreground mb-2 font-medium">Full Name</Text>
                  <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                    <User color="#64748b" size={20} />
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="John Doe"
                      className="flex-1 ml-2 text-foreground"
                      placeholderTextColor="#64748b"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              )}

              <View>
                <Text className="text-foreground mb-2 font-medium">Email Address</Text>
                <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                  <Mail color="#64748b" size={20} />
                  <TextInput
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      lastAttemptedCreds.current = ""; // Reset attempt on change
                    }}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-foreground font-medium">Password</Text>
                  {isLogin && isValidEmail(email) && password.length >= 6 && !loading && (
                    <View className="flex-row items-center gap-1">
                      <Sparkles size={13} color="#2563eb" />
                      <Text className="text-xs text-primary font-medium">Auto-verifying</Text>
                    </View>
                  )}
                </View>
                <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                  <Lock color="#64748b" size={20} />
                  <TextInput
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      lastAttemptedCreds.current = ""; // Reset attempt on change
                    }}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    returnKeyType="go"
                    onSubmitEditing={() => handleAuth(false)}
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    className="p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? <EyeOff color="#64748b" size={20} /> : <Eye color="#64748b" size={20} />}
                  </TouchableOpacity>
                </View>
                {isLogin && (
                  <View className="flex-row justify-end mt-2">
                    <TouchableOpacity 
                      onPress={() => router.push({ pathname: "/forgot-password", params: { email: email.trim() } })}
                      className="py-1"
                    >
                      <Text className="text-primary text-sm font-semibold">Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                onPress={() => handleAuth(false)}
                disabled={loading}
                className="bg-primary rounded-lg h-12 items-center justify-center mt-2 shadow-sm active:opacity-90"
              >
                {loading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="white" />
                    <Text className="text-primary-foreground font-semibold text-base">
                      {isLogin ? "Signing In..." : "Creating Account..."}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-primary-foreground font-semibold text-lg">
                    {isLogin ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-6 flex-row justify-center">
              <Text className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsLogin(!isLogin);
                lastAttemptedCreds.current = "";
              }}>
                <Text className="text-primary font-semibold">
                  {isLogin ? "Sign up" : "Sign in"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => router.push("/")}
              className="mt-6 flex-row justify-center items-center gap-2"
            >
              <ArrowLeft color="#64748b" size={16} />
              <Text className="text-muted-foreground font-medium">Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthPage;

