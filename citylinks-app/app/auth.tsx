import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Mail, Lock, User, Store, Wrench, Truck, Eye, EyeOff } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { apiClient } from "../api/apiClient";

const AuthPage = () => {
  const params = useLocalSearchParams();
  const [isLogin, setIsLogin] = useState(params.mode !== "signup");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        // Implement login later, for now we assume signup focus based on request
        Alert.alert("Notice", "Sign in is not fully migrated yet. Try signing up!");
      } else {
        await apiClient.post('/auth/register', { email, password, fullName });
        // Navigate to OTP page
        router.push({ pathname: "/verify-otp", params: { email } });
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}>
          <View className="bg-card p-6 rounded-2xl shadow-sm border border-border">
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-foreground mb-2">
                {isLogin ? "Sign in to " : "Join "}
                <Text className="text-primary">CityLinks</Text>
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
                {isLogin ? "Welcome back! Enter your details below." : "Create your account to get started"}
              </Text>
            </View>

            <View className="space-y-4 gap-y-4">
              {!isLogin && (
                <View>
                  <Text className="text-foreground mb-2">Full Name</Text>
                  <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                    <User color="#64748b" size={20} />
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="John Doe"
                      className="flex-1 ml-2 text-foreground"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>
              )}

              <View>
                <Text className="text-foreground mb-2">Email</Text>
                <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                  <Mail color="#64748b" size={20} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View>
                <Text className="text-foreground mb-2">Password</Text>
                <View className="relative flex-row items-center border border-border rounded-lg bg-background px-3 h-12">
                  <Lock color="#64748b" size={20} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    className="flex-1 ml-2 text-foreground"
                    placeholderTextColor="#64748b"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? <EyeOff color="#64748b" size={20} /> : <Eye color="#64748b" size={20} />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleEmailAuth}
                disabled={loading}
                className="bg-primary rounded-lg h-12 items-center justify-center mt-2"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
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
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text className="text-primary font-medium">
                  {isLogin ? "Sign up" : "Sign in"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => router.push("/")}
              className="mt-6 flex-row justify-center items-center gap-2"
            >
              <ArrowLeft color="#64748b" size={16} />
              <Text className="text-muted-foreground">Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthPage;
