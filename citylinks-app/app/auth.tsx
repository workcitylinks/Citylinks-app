import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Sparkles, ShieldCheck } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import { AppRefreshControl } from "../components/ui/RefreshableScrollView";

import { registerForPushNotificationsAsync } from "../services/pushNotifications";
import { GoogleLogo } from "../components/ui/GoogleLogo";
import { startGoogleOAuthFlow, tryAutoDetectAndSaveAddress } from "../services/googleAuth";
import { getParticularLoggedPage } from "../utils/authRedirect";

const AuthPage = () => {
  const params = useLocalSearchParams();
  const [isLogin, setIsLogin] = useState(params.mode !== "signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
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
  const oauthProcessedRef = useRef(false);

  // Directly capture deep-linked Google OAuth credentials if route /auth is opened with tokens
  useEffect(() => {
    if (params.token && params.user && !oauthProcessedRef.current) {
      oauthProcessedRef.current = true;
      setGoogleLoading(true);

      (async () => {
        try {
          const token = params.token as string;
          let user: any;
          try {
            user = typeof params.user === 'string' ? JSON.parse(decodeURIComponent(params.user)) : params.user;
          } catch {
            user = params.user;
          }

          await AsyncStorage.setItem('user_token', token);
          await AsyncStorage.setItem('user_data', JSON.stringify(user));

          registerForPushNotificationsAsync().catch(() => {});
          if (!user.address) {
            tryAutoDetectAndSaveAddress(token).catch(() => {});
          }

          const userName = user.fullName || user.firstName || 'there';
          showSuccess(`Welcome, ${userName}!`, 'Google Sign-In');

          const destination = getParticularLoggedPage(user, params.redirect as string);

          setTimeout(() => {
            if (params.isProfileComplete !== 'true' && !user.phone && user.role === 'CUSTOMER') {
              router.replace({
                pathname: '/complete-profile',
                params: {
                  email: user.email,
                  fullName: user.fullName || '',
                  redirect: (params.redirect as string) || '',
                },
              });
            } else {
              router.replace(destination as any);
            }
          }, 300);
        } catch (err: any) {
          showError(err.message || 'Failed to complete Google Sign-In', 'Google Sign-In');
        } finally {
          setGoogleLoading(false);
        }
      })();
    }
  }, [params.token, params.user]);

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

          // Register push notification device token for newly authenticated user
          registerForPushNotificationsAsync().catch(() => {});

          const userName = response.data.user?.fullName || "there";
          showSuccess(`Welcome back, ${userName}!`, "Welcome Back");
          
          const destination = getParticularLoggedPage(response.data.user, params.redirect as string);
          setTimeout(() => {
            router.replace(destination as any);
          }, 800);
        }
      } else {
        await apiClient.post('/auth/register', {
          email: trimmedEmail,
          password,
          fullName: fullName.trim(),
        });
        showSuccess("Verification code sent to your email!", "Code Sent");
        router.push({
          pathname: "/verify-otp",
          params: {
            email: trimmedEmail,
            redirect: (params.redirect as string) || "",
          },
        });
      }
    } catch (error: any) {
      const serverError = error.response?.data?.error;
      const defaultError = isLogin ? "Your email or password is wrong" : (error.message || "Something went wrong");
      const errorMessage = serverError || defaultError;
      
      showError(errorMessage, isLogin ? "Login Failed" : "Registration Failed");

      // If user is unverified, prompt them to verify
      if (error.response?.status === 403 && error.response?.data?.email) {
        setTimeout(() => {
          router.push({
            pathname: "/verify-otp",
            params: {
              email: error.response.data.email,
              redirect: (params.redirect as string) || "",
            },
          });
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await startGoogleOAuthFlow(params.redirect as string);

      if (res.success && res.user) {
        const name = res.user.fullName || res.user.firstName || "there";
        showSuccess(`Welcome, ${name}!`, "Google Sign-In");

        const destination = res.targetRoute || getParticularLoggedPage(res.user, params.redirect as string);

        setTimeout(() => {
          if (!res.isProfileComplete && !res.user.phone && res.user.role === 'CUSTOMER') {
            router.replace({
              pathname: '/complete-profile',
              params: {
                email: res.user.email,
                fullName: res.user.fullName || '',
                redirect: (params.redirect as string) || '',
              },
            });
          } else {
            router.replace(destination as any);
          }
        }, 500);
      } else if (res.error && res.error !== 'Google sign-in was cancelled') {
        showError(res.error, "Google Sign-In");
      }
    } catch (err: any) {
      showError(err.message || "Failed to complete Google Sign-In", "Google Sign-In");
    } finally {
      setGoogleLoading(false);
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
            paddingBottom: isKeyboardVisible ? 280 : 36,
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
            <View className={`items-center ${isKeyboardVisible ? 'mb-4' : 'mb-8'}`}>
              <Image 
                source={require('../assets/images/logo.png')} 
                style={{ width: isKeyboardVisible ? 52 : 84, height: isKeyboardVisible ? 52 : 84 }} 
                resizeMode="contain" 
                className={isKeyboardVisible ? "mb-2" : "mb-4"}
              />
              <Text className={`${isKeyboardVisible ? 'text-xl' : 'text-2xl'} font-bold text-foreground mb-1`}>
                {isLogin ? "Sign in to " : "Join "}
                <Text className="text-primary">CityLinks</Text>
              </Text>
              {!isKeyboardVisible && (
                <Text className="text-sm text-muted-foreground text-center">
                  {isLogin ? "Welcome back! Enter your details to continue." : "Create your account to get started"}
                </Text>
              )}
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
                      maxLength={50}
                      className="flex-1 ml-2 text-foreground"
                      placeholderTextColor="#64748b"
                      returnKeyType="next"
                      onFocus={() => {
                        setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
                      }}
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
                    maxLength={60}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                    onFocus={() => {
                      setTimeout(() => scrollViewRef.current?.scrollTo({ y: isLogin ? 50 : 90, animated: true }), 100);
                    }}
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
                    maxLength={32}
                    secureTextEntry={!showPassword}
                    returnKeyType="go"
                    onSubmitEditing={() => handleAuth(false)}
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                    onFocus={() => {
                      setTimeout(() => scrollViewRef.current?.scrollTo({ y: isLogin ? 120 : 170, animated: true }), 100);
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

              {/* OR Divider */}
              <View className="flex-row items-center my-4">
                <View className="flex-1 h-[1px] bg-slate-200" />
                <View className="px-3 py-1 rounded-full bg-slate-100 mx-2 border border-slate-200">
                  <Text className="text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">
                    Or continue with
                  </Text>
                </View>
                <View className="flex-1 h-[1px] bg-slate-200" />
              </View>

              {/* Premium Google OAuth Button */}
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleGoogleSignIn}
                disabled={loading || googleLoading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  borderRadius: 14,
                  height: 52,
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                {googleLoading ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#4285F4" size="small" />
                    <Text className="text-slate-700 font-semibold text-sm">
                      Connecting to Google...
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                    >
                      <GoogleLogo size={22} />
                    </View>
                    <Text
                      style={{
                        color: '#1e293b',
                        fontSize: 15.5,
                        fontWeight: '700',
                        letterSpacing: 0.1,
                      }}
                    >
                      {isLogin ? "Continue with Google" : "Sign up with Google"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Free & Secure Google Trust Badge */}
              <View className="flex-row items-center justify-center gap-1.5 mt-2.5">
                <ShieldCheck size={13} color="#10b981" />
                <Text className="text-[11.5px] text-slate-500 font-medium">
                  100% Free & Secure Google Authorization
                </Text>
              </View>
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

