import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  MapPin,
  Wrench,
  Car,
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  Scissors,
  Zap,
  ShoppingBag,
  Truck,
  PaintBucket,
  Home as HomeIcon,
  Store,
  Smartphone,
  Wifi,
  Printer,
  CreditCard,
  FileText,
  Globe,
  Laptop,
  Palette,
  Target,
  Server,
  Users,
  Megaphone,
  X,
  LogOut,
  User,
  ChevronDown,
  Package,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Bell,
  UserPlus,
  LayoutDashboard,
  ShieldCheck,
  Check,
  Navigation,
} from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../api/apiClient";
import { useToast } from "../context/ToastContext";
import { useApp } from "../context/AppContext";
import FloatingOrbs from "../components/landing/FloatingOrbs";
import { AppRefreshControl } from "../components/ui/RefreshableScrollView";
import { useUserLocation } from "../hooks/useUserLocation";
import { computeShopDistance } from "../utils/distance";
import { getShopCoverImage } from "./shop-detail";

// Removed unused interfaces


// Data
const quickActions = [
  { label: "Near by Shops", icon: MapPin, desc: "Find stores around you", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/shops" },
  { label: "Book Service", icon: Wrench, desc: "Hire local professionals", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/services" },
  { label: "Digital Services", icon: Laptop, desc: "Make your work digital", color: "#2563eb", bg: "rgba(37, 99, 235, 0.1)", route: "/digital-services", isCentered: true },
  { label: "Transport", icon: Car, desc: "Rides & delivery that you can trust on", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/book-transport" },
  { label: "Deals & Offers", icon: TrendingUp, desc: "Today's best deals", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/deals" },
];

const ICON_MAP: Record<string, any> = {
  Globe,
  FileText,
  Palette,
  Target,
  Server,
  TrendingUp,
  Users,
  Megaphone,
  Laptop,
  MoreHorizontal,
  Car,
  Truck,
  Wrench,
  Zap,
  PaintBucket,
  Home: HomeIcon,
  Scissors,
  Sparkles,
  ShoppingBag,
};

import {
  useMarketplaceHome,
  useShops,
  ShopItem,
  PopularItem,
  DigitalServiceItem,
  CategoryTileItem,
  FeaturedServiceItem
} from "../queries/marketplaceQueries";

export default function Index() {
  const { showSuccess, showError } = useToast();
  const {
    userToken,
    userData,
    popularItems: preloadedPopular,
    refreshAuth,
    cartCount,
    unreadNotificationsCount,
    switchUserRole,
    logout
  } = useApp();

  // Centralized cached queries for Home screen (eliminates duplicate calls on navigation)
  const {
    popularItems,
    digitalServices,
    serviceTiles,
    shopCategories,
    featuredServices,
    loading,
    refreshing: queryRefreshing,
    refetch,
  } = useMarketplaceHome(preloadedPopular);

  const { shops: allShops } = useShops();
  const { coords: mobileCoords } = useUserLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "products" | "services" | "digital" | "shops">("all");
  const [selectedShopCategory, setSelectedShopCategory] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination for Featured (4 at a time) and Popular near you (4 at a time)
  const [featuredPage, setFeaturedPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);

  const totalFeaturedPages = Math.max(1, Math.ceil(featuredServices.length / 4));
  const currentFeatured = featuredServices.slice((featuredPage - 1) * 4, featuredPage * 4);

  const totalPopularPages = Math.max(1, Math.ceil(popularItems.length / 4));
  const currentPopular = popularItems.slice((popularPage - 1) * 4, popularPage * 4);

  useEffect(() => {
    if (featuredPage > totalFeaturedPages) {
      setFeaturedPage(totalFeaturedPages);
    }
  }, [totalFeaturedPages, featuredPage]);

  useEffect(() => {
    if (popularPage > totalPopularPages) {
      setPopularPage(totalPopularPages);
    }
  }, [totalPopularPages, popularPage]);

  const scrollRef = useRef<ScrollView>(null);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshAuth(),
        refetch({ force: true }),
      ]);
    } catch (error) {
      console.log("Error refreshing home:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAuth, refetch]);

  const refreshAuthRef = useRef(refreshAuth);
  refreshAuthRef.current = refreshAuth;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useFocusEffect(
    React.useCallback(() => {
      refreshAuthRef.current?.();
      refetchRef.current?.({ force: true });
    }, [])
  );

  const handleProtectedAction = (action?: () => void) => {
    if (!userToken) {
      showError("Please sign in to access this feature.", "Login Required");
      router.push("/auth");
      return;
    }
    if (action) {
      action();
    }
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    showSuccess("Signed out successfully", "Logged Out");
  };

  const q = searchQuery.trim().toLowerCase();
  const isSearching = q.length > 0;

  const filteredPopular = popularItems.filter(item =>
    item.title?.toLowerCase().includes(q) ||
    item.subtitle?.toLowerCase().includes(q) ||
    item.entity_type?.toLowerCase().includes(q) ||
    item.badge?.toLowerCase().includes(q)
  );

  const filteredFeaturedServices = featuredServices.filter(item =>
    item.name?.toLowerCase().includes(q) ||
    item.provider?.toLowerCase().includes(q) ||
    item.tag?.toLowerCase().includes(q)
  );

  const filteredServiceTiles = serviceTiles.filter(item =>
    item.name?.toLowerCase().includes(q)
  );

  const filteredDigitalServices = digitalServices.filter(item =>
    item.name?.toLowerCase().includes(q) ||
    item.desc?.toLowerCase().includes(q)
  );

  const filteredShopCategories = shopCategories.filter(item =>
    item.name?.toLowerCase().includes(q)
  );

  const totalResultsCount =
    (selectedFilter === "all" || selectedFilter === "products" ? filteredPopular.length : 0) +
    (selectedFilter === "all" || selectedFilter === "services" ? filteredFeaturedServices.length + filteredServiceTiles.length : 0) +
    (selectedFilter === "all" || selectedFilter === "digital" ? filteredDigitalServices.length : 0) +
    (selectedFilter === "all" || selectedFilter === "shops" ? filteredShopCategories.length : 0);

  const matchingCategoryShops = useMemo(() => {
    if (!selectedShopCategory) return [];
    const target = selectedShopCategory.trim().toLowerCase();
    return allShops.filter((s: any) => {
      const cat = (s.category || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      if (cat.includes(target) || name.includes(target)) return true;
      if (target.includes('apparel') || target.includes('cloth') || target.includes('fashion') || target.includes('textile')) {
        return cat.includes('retail') || name.includes('fashion') || name.includes('textile');
      }
      if (target.startsWith('grocer') || target.includes('food')) {
        return cat.includes('grocer') || name.includes('bazaar') || name.includes('grocer');
      }
      if (target.includes('electronic') || target.includes('appliance') || target.includes('mobile')) {
        return cat.includes('electronic') || cat.includes('retail') || name.includes('appliances') || name.includes('mobile');
      }
      if (target.includes('auto')) {
        return cat.includes('automobile') || name.includes('automobile');
      }
      return false;
    });
  }, [allShops, selectedShopCategory]);

  const userInitial = userData?.fullName?.trim()
    ? userData.fullName.trim().charAt(0).toUpperCase()
    : (userData?.email ? userData.email.charAt(0).toUpperCase() : "C");

  const userRole = (userData?.role || "").trim().toUpperCase();
  const isCustomer = !userToken || !userRole || userRole === "CUSTOMER";

  const getRoleLabel = (role?: string) => {
    if (!role) return "Customer";
    switch (role.trim().toUpperCase()) {
      case "SUPER_ADMIN":
        return "Super Admin";
      case "DEVELOPER":
        return "Developer";
      case "MERCHANT":
        return "Merchant";
      case "LABOR":
        return "Worker";
      case "TRANSPORT":
        return "Transport";
      case "CUSTOMER":
        return "Customer";
      default:
        return role;
    }
  };



  return (
    <View className="flex-1 bg-white relative">
      <FloatingOrbs />
      <SafeAreaView edges={['top']} className="bg-white">
        {/* Header Navbar */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white relative z-20">
          {/* Logo & CityLinks Brand Name */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={scrollToTop}
            className="flex-row items-center flex-1 mr-2"
            accessibilityRole="button"
            accessibilityLabel="CityLinks Home"
          >
            <Image
              source={require('../assets/images/logo.png')}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
            <View className="ml-2.5">
              <Text className="text-xl font-extrabold tracking-tight text-slate-900 leading-tight">
                City<Text className="text-[#2563eb]">Links</Text>
              </Text>
              <Text className="text-[10px] font-bold text-slate-400 tracking-wider -mt-0.5 uppercase">
                Hyperlocal Hub
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right Action Icons */}
          <View className="flex-row items-center">
            {/* Notification Bell Icon */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleProtectedAction(() => router.push('/notifications' as any))}
              className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-2 relative"
            >
              <Bell size={19} color="#334155" />
              {unreadNotificationsCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    backgroundColor: '#ef4444',
                    borderRadius: 10,
                    minWidth: 17,
                    height: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                    borderWidth: 1.5,
                    borderColor: '#ffffff',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
                    {unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* User Profile / Login Button */}
            {userToken ? (
              <View className="relative">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowUserMenu(!showUserMenu)}
                  className="flex-row items-center py-1 pl-1"
                >
                  {/* Purple Avatar Circle */}
                  <View className="w-10 h-10 rounded-full bg-[#9333ea] items-center justify-center shadow-sm">
                    <Text className="text-white font-bold text-base leading-none">
                      {userInitial}
                    </Text>
                  </View>
                  <ChevronDown size={18} color="#64748b" className="ml-1" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-primary flex-row items-center px-4 h-10 rounded-xl"
                onPress={() => router.push('/auth')}
              >
                <Text className="text-white font-semibold ml-1">Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Full-width Search Bar below Header */}
        {/*  */}

        {/* User Dropdown Menu Modal */}
        <Modal
          visible={showUserMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowUserMenu(false)}
        >
          <Pressable
            className="flex-1 bg-black/10"
            onPress={() => setShowUserMenu(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: 60,
                right: 16,
                minWidth: 210,
                backgroundColor: '#ffffff',
                borderRadius: 16,
                paddingVertical: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 10,
                borderWidth: 1,
                borderColor: '#f1f5f9'
              }}
            >
              {/* User Info Header with Role Badge */}
              <View className="px-4 py-2.5 border-b border-slate-100 mb-1">
                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                  {userData?.fullName || userData?.email || "User"}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className="bg-indigo-50 border border-indigo-200/80 rounded-full px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-indigo-700 tracking-wider">
                      {getRoleLabel(userData?.role)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* My Profile */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowUserMenu(false);
                  handleProtectedAction(() => router.push('/profile' as any));
                }}
                className="flex-row items-center px-4 py-3 hover:bg-slate-50"
              >
                <User size={19} color="#1e293b" />
                <Text className="ml-3 text-[15px] font-semibold text-slate-800">
                  My Profile
                </Text>
              </TouchableOpacity>

              {/* Notification (Below My Profile) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowUserMenu(false);
                  handleProtectedAction(() => router.push('/notifications' as any));
                }}
                className="flex-row items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <View className="flex-row items-center">
                  <Bell size={19} color="#1e293b" />
                  <Text className="ml-3 text-[15px] font-semibold text-slate-800">
                    Notifications
                  </Text>
                </View>
                {unreadNotificationsCount > 0 && (
                  <View style={{ backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1.5 }}>
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                      {unreadNotificationsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Cart (Below My Profile) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowUserMenu(false);
                  handleProtectedAction(() => router.push('/cart' as any));
                }}
                className="flex-row items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <View className="flex-row items-center">
                  <ShoppingCart size={19} color="#1e293b" />
                  <Text className="ml-3 text-[15px] font-semibold text-slate-800">
                    My Cart
                  </Text>
                </View>
                {cartCount > 0 && (
                  <View style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1.5 }}>
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                      {cartCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* My Orders */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowUserMenu(false);
                  handleProtectedAction(() => router.push('/orders' as any));
                }}
                className="flex-row items-center px-4 py-3 hover:bg-slate-50"
              >
                <Package size={19} color="#1e293b" />
                <Text className="ml-3 text-[15px] font-semibold text-slate-800">
                  My Orders
                </Text>
              </TouchableOpacity>

              {!isCustomer && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowUserMenu(false);
                    handleProtectedAction(() => router.push('/dashboard' as any));
                  }}
                  className="flex-row items-center px-4 py-3 hover:bg-slate-50"
                >
                  <LayoutDashboard size={19} color="#4f46e5" />
                  <Text className="ml-3 text-[15px] font-semibold text-indigo-700">
                    Partner Dashboard
                  </Text>
                </TouchableOpacity>
              )}



              {/* Divider */}
              <View className="h-[1px] bg-slate-100 my-1 mx-2" />

              {/* Sign Out */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowUserMenu(false);
                  setShowLogoutConfirm(true);
                }}
                className="flex-row items-center px-4 py-3 hover:bg-red-50"
              >
                <LogOut size={19} color="#ef4444" />
                <Text className="ml-3 text-[15px] font-semibold text-red-500">
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Logout Confirmation Card Modal */}
        <Modal
          visible={showLogoutConfirm}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLogoutConfirm(false)}
        >
          <View className="flex-1 bg-black/40 justify-center items-center px-6">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center shadow-2xl border border-slate-100">
              {/* Icon Circle */}
              <View className="w-14 h-14 rounded-full bg-red-50 justify-center items-center mb-4">
                <LogOut size={26} color="#ef4444" />
              </View>

              <Text className="text-xl font-bold text-slate-900 mb-2 text-center">
                Sign Out
              </Text>

              <Text className="text-sm text-slate-500 text-center mb-6 leading-5">
                Are you sure you want to sign out from CityLinks?
              </Text>

              {/* Action Buttons */}
              <View className="flex-row items-center w-full gap-3">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center justify-center"
                >
                  <Text className="text-slate-700 font-semibold text-base">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={confirmLogout}
                  className="flex-1 py-3.5 rounded-xl bg-red-500 items-center justify-center shadow-sm shadow-red-300"
                >
                  <Text className="text-white font-semibold text-base">
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>


      </SafeAreaView>

      <SafeAreaView edges={['bottom']} className="flex-1 bg-[#f4f6fc]">
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <AppRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >

          {isSearching ? (
            /* Search Results View */
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-xl font-bold text-foreground">Search Results</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    Found {totalResultsCount} result{totalResultsCount === 1 ? '' : 's'} for "{searchQuery.trim()}"
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSearchQuery("")} className="py-1 px-3 bg-slate-200 rounded-lg">
                  <Text className="text-xs text-slate-700 font-semibold">Clear</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
                {[
                  { id: "all", label: "All" },
                  { id: "products", label: "Products" },
                  { id: "services", label: "Services" },
                  { id: "digital", label: "Digital" },
                  { id: "shops", label: "Shops" },
                ].map((tab) => {
                  const isActive = selectedFilter === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setSelectedFilter(tab.id as any)}
                      className={`mx-1 px-3.5 py-1.5 rounded-full border ${isActive
                        ? "bg-primary border-primary"
                        : "bg-white border-slate-200"
                        }`}
                    >
                      <Text className={`text-xs font-semibold ${isActive ? "text-white" : "text-slate-600"}`}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Results List */}
              {totalResultsCount === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center justify-center border border-[#e2e8f0] my-4">
                  <Search size={40} color="#94a3b8" />
                  <Text className="text-base font-bold text-slate-700 mt-3">No results found</Text>
                  <Text className="text-xs text-muted-foreground text-center mt-1 mb-4">
                    We couldn't find any products or services matching "{searchQuery}".
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    className="bg-primary px-4 py-2 rounded-xl"
                  >
                    <Text className="text-white text-xs font-semibold">Clear Search</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="gap-y-3">
                  {/* Matching Products */}
                  {(selectedFilter === "all" || selectedFilter === "products") && filteredPopular.map((item) => (
                    <TouchableOpacity
                      key={`search-prod-${item.entity_type}-${item.entity_id}`}
                      onPress={() => handleProtectedAction()}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8f0]"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          <Text className="text-[10px] font-bold text-primary uppercase">{item.entity_type}</Text>
                        </View>
                        {item.badge ? (
                          <Text className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {item.badge}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="font-bold text-base text-foreground mb-0.5">{item.title}</Text>
                      <Text className="text-xs text-muted-foreground mb-2" numberOfLines={2}>{item.subtitle}</Text>
                      {item.price_label && (
                        <Text className="text-primary font-bold text-sm">{item.price_label}</Text>
                      )}
                    </TouchableOpacity>
                  ))}

                  {/* Matching Featured Services */}
                  {(selectedFilter === "all" || selectedFilter === "services") && filteredFeaturedServices.map((service) => (
                    <TouchableOpacity
                      key={`search-serv-${service.id}`}
                      onPress={() => handleProtectedAction()}
                      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#e2e8f0]"
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-2xl">{service.emoji}</Text>
                          <View>
                            <Text className="font-bold text-base text-foreground">{service.name}</Text>
                            <Text className="text-xs text-muted-foreground">{service.provider}</Text>
                          </View>
                        </View>
                        <Text className="text-primary font-bold text-base">{service.price}</Text>
                      </View>
                      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <Text className="text-xs font-semibold text-slate-600">{service.provider}</Text>
                        <Text className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">{service.tag}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* Matching Digital Services */}
                  {(selectedFilter === "all" || selectedFilter === "digital") && filteredDigitalServices.map((digital, i) => {
                    const IconComponent = ICON_MAP[digital.iconName] || Globe;
                    return (
                      <TouchableOpacity
                        key={`search-digi-${digital.id || i}`}
                        onPress={() => handleProtectedAction(() => router.push({
                          pathname: '/digital-services',
                          params: { service: digital.name },
                        } as any))}
                        className="w-full bg-white rounded-2xl p-3.5 shadow-sm border border-[#e2e8f0] flex-row items-center"
                      >
                        <View
                          className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                          style={{ backgroundColor: `${digital.color}15` }}
                        >
                          <IconComponent size={22} color={digital.color} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="font-bold text-sm text-foreground">{digital.name}</Text>
                            {digital.badge && (
                              <View className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                <Text className="text-[9px] font-bold text-primary">{digital.badge}</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-xs text-muted-foreground mt-0.5">{digital.desc}</Text>
                        </View>
                        <ArrowRight size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    );
                  })}

                  {/* Matching Shop Categories */}
                  {(selectedFilter === "all" || selectedFilter === "shops") && filteredShopCategories.map((shop, i) => {
                    const IconComponent = ICON_MAP[shop.iconName] || ShoppingBag;
                    return (
                      <TouchableOpacity
                        key={`search-shop-${shop.id || i}`}
                        onPress={() => handleProtectedAction()}
                        className="w-full bg-white rounded-2xl p-3.5 shadow-sm border border-[#e2e8f0] flex-row items-center"
                      >
                        <View
                          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                          style={{ backgroundColor: `${shop.color}15` }}
                        >
                          <IconComponent size={20} color={shop.color} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-sm text-foreground">{shop.name} Products</Text>
                          <Text className="text-xs text-muted-foreground">Near by shops & offerings</Text>
                        </View>
                        <Text className="text-xs text-primary font-semibold">Explore →</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            /* Normal Home Feed */
            <>
              {/* Title */}
              <View className="mb-6">
                <Text className="text-3xl font-bold text-foreground">
                  What do you need <Text className="text-primary">today?</Text>
                </Text>
                <Text className="text-muted-foreground mt-1">
                  Services, products, and more — all from your neighbourhood
                </Text>
              </View>

              {/* Quick Actions Grid */}
              <View className="mb-8">
                {/* Row 1: Nearby Shops & Book Service */}
                <View className="flex-row justify-between mb-3.5">
                  {[quickActions[0], quickActions[1]].map((action, i) => (
                    <TouchableOpacity
                      key={action.label}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (action.route === '/shops') {
                          router.push(action.route as any);
                        } else {
                          handleProtectedAction(() => router.push(action.route as any));
                        }
                      }}
                      className="w-[48%] bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80"
                    >
                      <View className="flex-row items-start">
                        <View
                          className="w-11 h-11 rounded-2xl items-center justify-center mr-3 shrink-0"
                          style={{ backgroundColor: action.bg }}
                        >
                          <action.icon size={22} color={action.color} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-base text-slate-900 leading-tight">
                            {action.label}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-1 leading-normal">
                            {action.desc}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Center Feature: Digital Services Card matching design */}
                <View className="items-center mb-3.5">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleProtectedAction(() => router.push(quickActions[2].route as any))}
                    className="w-full bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="w-11 h-11 rounded-2xl items-center justify-center mr-3.5 shrink-0"
                          style={{ backgroundColor: quickActions[2].bg }}
                        >
                          {React.createElement(quickActions[2].icon, { size: 22, color: quickActions[2].color })}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="font-bold text-base text-slate-900">
                              {quickActions[2].label}
                            </Text>

                          </View>
                          <Text className="text-xs text-slate-500 mt-0.5">
                            {quickActions[2].desc}
                          </Text>
                        </View>
                      </View>
                      <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                        <ArrowRight size={16} color="#2563eb" />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Row 2: Transport & Deals & Offers */}
                <View className="flex-row justify-between">
                  {[quickActions[3], quickActions[4]].map((action, i) => (
                    <TouchableOpacity
                      key={action.label}
                      activeOpacity={0.8}
                      onPress={() => handleProtectedAction(() => router.push(action.route as any))}
                      className="w-[48%] bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80"
                    >
                      <View className="flex-row items-start">
                        <View
                          className="w-11 h-11 rounded-2xl items-center justify-center mr-3 shrink-0"
                          style={{ backgroundColor: action.bg }}
                        >
                          <action.icon size={22} color={action.color} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-bold text-base text-slate-900 leading-tight">
                            {action.label}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-1 leading-normal">
                            {action.desc}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Quick Hub: Join us (or Dashboard), Cart, Notification */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-3.5">
                  <View className="flex-row items-center">
                    <Sparkles size={18} color="#2563eb" />
                    <Text className="text-xl font-bold ml-2 text-slate-900">
                      {isCustomer ? "Join & Discover" : "Management & Hub"}
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-slate-400">Your Hub</Text>
                </View>

                <View className="flex-row justify-between gap-2.5">
                  {/* Join us Card (Customers & Guests) OR Dashboard Card (Other roles) */}
                  {isCustomer ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => router.push(userToken ? ('/join-us' as any) : ('/auth' as any))}
                      style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        borderRadius: 20,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          backgroundColor: '#eff6ff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <UserPlus size={20} color="#2563eb" />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                        Join us
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }} numberOfLines={1}>
                        Your service
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => router.push('/dashboard' as any)}
                      style={{
                        flex: 1,
                        backgroundColor: '#ffffff',
                        borderRadius: 20,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#e0e7ff',
                        shadowColor: '#4f46e5',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          backgroundColor: '#eef2ff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <LayoutDashboard size={20} color="#4f46e5" />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                        Dashboard
                      </Text>
                      <Text style={{ fontSize: 11, color: '#4f46e5', fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                        {getRoleLabel(userData?.role)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Cart Card */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleProtectedAction(() => router.push('/cart' as any))}
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      borderRadius: 20,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: cartCount > 0 ? '#bfdbfe' : '#e2e8f0',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      position: 'relative',
                    }}
                  >
                    {cartCount > 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          backgroundColor: '#2563eb',
                          borderRadius: 10,
                          minWidth: 18,
                          height: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
                          {cartCount}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: '#f0fdf4',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <ShoppingCart size={20} color="#16a34a" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                      Cart
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: cartCount > 0 ? '#16a34a' : '#64748b',
                        marginTop: 2,
                        fontWeight: cartCount > 0 ? '600' : '400',
                      }}
                      numberOfLines={1}
                    >
                      {cartCount > 0 ? `${cartCount} items` : 'View items'}
                    </Text>
                  </TouchableOpacity>

                  {/* Notification Card */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleProtectedAction(() => router.push('/notifications' as any))}
                    style={{
                      flex: 1,
                      backgroundColor: '#ffffff',
                      borderRadius: 20,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: unreadNotificationsCount > 0 ? '#fecaca' : '#e2e8f0',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      position: 'relative',
                    }}
                  >
                    {unreadNotificationsCount > 0 && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          backgroundColor: '#ef4444',
                          borderRadius: 10,
                          minWidth: 18,
                          height: 18,
                          alignItems: 'center',
                          justifyContent: 'center',
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
                          {unreadNotificationsCount}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: '#fef2f2',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <Bell size={20} color="#dc2626" />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                      Notification
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: unreadNotificationsCount > 0 ? '#dc2626' : '#64748b',
                        marginTop: 2,
                        fontWeight: unreadNotificationsCount > 0 ? '600' : '400',
                      }}
                      numberOfLines={1}
                    >
                      {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} new` : 'Updates'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Digital Services Section */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-bold text-foreground">Digital Services</Text>
                  <TouchableOpacity onPress={() => handleProtectedAction(() => router.push('/digital-services' as any))} className="flex-row items-center">
                    <Text className="text-primary text-sm font-medium">View All</Text>
                    <ArrowRight size={14} color="#3b82f6" className="ml-1" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row flex-wrap justify-between">
                  {digitalServices.map((service, i) => {
                    const IconComponent = ICON_MAP[service.iconName] || Globe;
                    return (
                      <TouchableOpacity
                        key={service.id || i}
                        activeOpacity={0.7}
                        onPress={() => handleProtectedAction(() => router.push({
                          pathname: '/digital-services',
                          params: { service: service.name },
                        } as any))}
                        className="w-[22%] items-center mb-4"
                      >
                        <View
                          className="w-14 h-14 rounded-2xl items-center justify-center mb-2"
                          style={{ backgroundColor: `${service.color}15` }}
                        >
                          <IconComponent size={24} color={service.color} />
                        </View>
                        <Text className="text-[10px] font-medium text-center text-foreground">{service.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Services at your doorstep */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-bold">Services at your doorstep</Text>
                  <TouchableOpacity onPress={() => handleProtectedAction(() => router.push('/services' as any))} className="flex-row items-center">
                    <Text className="text-primary text-sm font-medium">View All</Text>
                    <ArrowRight size={14} color="#3b82f6" className="ml-1" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row flex-wrap justify-between">
                  {serviceTiles.map((tile, i) => {
                    const IconComponent = ICON_MAP[tile.iconName] || Wrench;
                    const tileNameLower = tile.name.trim().toLowerCase();
                    const isTransportOrMoving =
                      tileNameLower.includes('transport') ||
                      tileNameLower.includes('moving');

                    const handleTilePress = () => {
                      if (isTransportOrMoving) {
                        handleProtectedAction(() => {
                          router.push({
                            pathname: '/book-transport',
                            params: {
                              tab: tileNameLower.includes('moving') ? 'commercial' : 'passenger',
                              mode: tile.name,
                            },
                          } as any);
                        });
                      } else {
                        handleProtectedAction(() => {
                          router.push({
                            pathname: '/services',
                            params: {
                              category: tile.name,
                            },
                          } as any);
                        });
                      }
                    };

                    return (
                      <TouchableOpacity
                        key={tile.id || i}
                        activeOpacity={0.7}
                        onPress={handleTilePress}
                        className="w-[22%] items-center mb-4"
                      >
                        <View
                          className="w-14 h-14 rounded-2xl items-center justify-center mb-2"
                          style={{ backgroundColor: `${tile.color}15` }}
                        >
                          <IconComponent size={24} color={tile.color} />
                        </View>
                        <Text className="text-[10px] font-medium text-center">{tile.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Shop by category */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <View>
                    <Text className="text-xl font-bold text-slate-900">Shop by category</Text>
                    <Text className="text-xs text-slate-400 mt-0.5">
                      Select a category to view nearby stores
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/shops' as any)}
                    className="flex-row items-center py-1.5 px-3 rounded-full bg-blue-50 border border-blue-200"
                  >
                    <Text className="text-primary text-xs font-bold mr-1">View All</Text>
                    <ArrowRight size={13} color="#2563eb" />
                  </TouchableOpacity>
                </View>

                {/* Categories Grid */}
                <View className="flex-row flex-wrap justify-between">
                  {shopCategories.map((cat, i) => {
                    const IconComponent = ICON_MAP[cat.iconName] || ShoppingBag;
                    const isSelected = selectedShopCategory === cat.name;

                    return (
                      <TouchableOpacity
                        key={cat.id || i}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedShopCategory(isSelected ? null : cat.name);
                        }}
                        className={`w-[48%] rounded-2xl p-4 mb-3 flex-row items-center shadow-sm border ${
                          isSelected
                            ? 'bg-blue-50/90 border-[#2563eb]'
                            : 'bg-white border-[#e2e8f0]'
                        }`}
                      >
                        <View
                          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                          style={{ backgroundColor: `${cat.color}15` }}
                        >
                          <IconComponent size={20} color={cat.color} />
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`font-bold text-sm ${isSelected ? 'text-[#2563eb]' : 'text-slate-900'}`}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: '/shops',
                                params: { category: cat.name },
                              } as any)
                            }
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text className="text-xs text-primary font-medium mt-0.5">
                              {isSelected ? 'Selected ✓' : 'Explore →'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Inline Results when a category is selected */}
                {selectedShopCategory && (
                  <View className="mt-1 bg-slate-50/90 rounded-3xl p-4 border border-blue-200 shadow-sm">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Store size={18} color="#2563eb" />
                        <Text className="text-base font-bold text-slate-900 ml-2" numberOfLines={1}>
                          {selectedShopCategory} Stores ({matchingCategoryShops.length})
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSelectedShopCategory(null)}
                        className="bg-slate-200 px-2.5 py-1 rounded-full"
                      >
                        <Text className="text-[11px] font-semibold text-slate-600">Close ✕</Text>
                      </TouchableOpacity>
                    </View>

                    {matchingCategoryShops.length === 0 ? (
                      <View className="bg-white rounded-2xl p-5 items-center justify-center border border-slate-100">
                        <Store size={32} color="#94a3b8" />
                        <Text className="text-sm font-semibold text-slate-700 mt-2">
                          No stores listed in {selectedShopCategory} yet
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: '/shops',
                              params: { category: selectedShopCategory },
                            } as any)
                          }
                          className="mt-3 bg-primary px-4 py-2 rounded-xl"
                        >
                          <Text className="text-white text-xs font-semibold">View Full Directory</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="gap-y-3">
                        {matchingCategoryShops.slice(0, 3).map((shop: any) => (
                          <TouchableOpacity
                            key={shop.id}
                            activeOpacity={0.85}
                            onPress={() =>
                              router.push({
                                pathname: '/shop-detail',
                                params: { id: shop.id },
                              } as any)
                            }
                            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
                          >
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1 mr-2">
                                <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>
                                  {shop.name}
                                </Text>
                                <Text className="text-xs text-slate-500 mt-0.5">
                                  {shop.location || shop.address || 'Haveri'}
                                </Text>
                              </View>
                              <View className="bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                                <Text className="text-[10px] font-bold text-[#2563eb]">
                                  {shop.category}
                                </Text>
                              </View>
                            </View>

                            <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-50">
                              {shop.phone && shop.showPhone !== false ? (
                                <Text className="text-xs text-slate-600 font-medium">
                                  📞 {shop.phone}
                                </Text>
                              ) : (
                                <Text className="text-xs text-slate-400 font-medium">
                                  Store Open
                                </Text>
                              )}
                              <View className="flex-row items-center">
                                <Text className="text-xs font-bold text-primary mr-1">Visit Shop</Text>
                                <ArrowRight size={13} color="#2563eb" />
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() =>
                            router.push({
                              pathname: '/shops',
                              params: { category: selectedShopCategory },
                            } as any)
                          }
                          className="bg-primary/10 border border-primary/20 py-2.5 rounded-xl items-center justify-center flex-row mt-1"
                        >
                          <Text className="text-primary font-bold text-xs mr-1">
                            View All {selectedShopCategory} Stores in Directory ({matchingCategoryShops.length})
                          </Text>
                          <ArrowRight size={13} color="#2563eb" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Featured Services */}
              <View className="mb-10">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center">
                      <Sparkles size={20} color="#2563eb" />
                      <Text className="text-lg font-bold ml-2 text-slate-900">Featured Services</Text>
                    </View>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Verified local service professionals for your home & business
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/services' as any)}
                    className="flex-row items-center py-1.5 px-3 rounded-full bg-blue-50 border border-blue-200 flex-shrink-0"
                  >
                    <Text className="text-xs font-bold text-primary mr-1">See all</Text>
                    <ArrowRight size={13} color="#2563eb" />
                  </TouchableOpacity>
                </View>

                <View className="gap-y-4">
                  {currentFeatured.length === 0 ? (
                    <View className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-200">
                      <Sparkles size={28} color="#94a3b8" />
                      <Text className="text-sm font-bold text-slate-700 mt-2">
                        No featured services yet
                      </Text>
                      <Text className="text-xs text-slate-400 text-center mt-1">
                        Explore all services in the Services section.
                      </Text>
                    </View>
                  ) : (
                    currentFeatured.map((service) => {
                    const isTopRated = (service.rating && service.rating >= 4.85);

                    return (
                      <TouchableOpacity
                        key={service.id}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: '/services',
                            params: {
                              category: service.category || service.tag,
                              service: service.title || service.name,
                            },
                          } as any)
                        }
                        className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]"
                      >
                        <View className="flex-row items-start justify-between mb-2.5">
                          <View className="w-11 h-11 rounded-xl bg-blue-50 items-center justify-center">
                            <Text className="text-2xl">{service.emoji || '✨'}</Text>
                          </View>
                          <View className="flex-row items-center gap-1.5">
                            <View className="bg-[#f1f5f9] px-2.5 py-1 rounded-full">
                              <Text className="text-xs font-medium text-slate-700">{service.category || service.tag}</Text>
                            </View>
                          </View>
                        </View>

                        <Text className="font-bold text-lg text-slate-900 mb-1">{service.title || service.name}</Text>
                        <Text className="text-sm text-slate-500 mb-3.5">
                          {service.providerName || service.provider}
                          {service.location ? ` · ${service.location}` : ''}
                        </Text>

                        <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100">
                          <View className="flex-row items-center">
                            <Text className="text-primary font-bold text-base">{service.priceLabel || service.price}</Text>
                          </View>
                          <View className="flex-row items-center">
                            <Text className="text-xs font-bold text-primary mr-1">Book / View</Text>
                            <ArrowRight size={14} color="#2563eb" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
                </View>

                {totalFeaturedPages > 1 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <TouchableOpacity
                      disabled={featuredPage <= 1}
                      onPress={() => setFeaturedPage((p) => Math.max(1, p - 1))}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: featuredPage <= 1 ? '#f1f5f9' : '#ffffff',
                        opacity: featuredPage <= 1 ? 0.4 : 1,
                      }}
                    >
                      <ChevronLeft size={16} color={featuredPage <= 1 ? '#94a3b8' : '#1e293b'} />
                      <Text style={{ fontSize: 12, fontWeight: '600', marginLeft: 4, color: featuredPage <= 1 ? '#94a3b8' : '#334155' }}>
                        Prev
                      </Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {Array.from({ length: totalFeaturedPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        const isActive = featuredPage === pageNum;
                        return (
                          <TouchableOpacity
                            key={pageNum}
                            onPress={() => setFeaturedPage(pageNum)}
                            activeOpacity={0.7}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isActive ? '#2563eb' : 'transparent',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#ffffff' : '#475569' }}>
                              {pageNum}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity
                      disabled={featuredPage >= totalFeaturedPages}
                      onPress={() => setFeaturedPage((p) => Math.min(totalFeaturedPages, p + 1))}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: featuredPage >= totalFeaturedPages ? '#f1f5f9' : '#ffffff',
                        opacity: featuredPage >= totalFeaturedPages ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', marginRight: 4, color: featuredPage >= totalFeaturedPages ? '#94a3b8' : '#334155' }}>
                        Next
                      </Text>
                      <ChevronRight size={16} color={featuredPage >= totalFeaturedPages ? '#94a3b8' : '#1e293b'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Sponsored Shops near you */}
              <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center">
                      <Sparkles size={20} color="#d97706" />
                      <Text className="text-lg font-bold ml-2 text-slate-900">Sponsored Shops</Text>
                    </View>
                    <Text className="text-xs text-slate-500 mt-0.5">
                      Verified & sponsored partner stores in your locality
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push('/shops' as any)}
                    className="flex-row items-center py-1.5 px-3 rounded-full bg-amber-50 border border-amber-200 flex-shrink-0"
                  >
                    <Text className="text-xs font-bold text-amber-800 mr-1">See all</Text>
                    <ArrowRight size={13} color="#d97706" />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : currentPopular.length > 0 ? (
                  <>
                    <View className="flex-row flex-wrap justify-between">
                      {currentPopular.map((shop) => {
                        const shopId = shop.id || shop.entity_id;
                        const shopName = shop.name || shop.title;
                        const shopAddress = shop.address || shop.subtitle || shop.location;
                        const shopCategory = shop.category || 'Store';
                        const productCount = shop._count?.products ?? 4;
                        const reviewCount = shop.reviewCount || 180;
                        const isSponsored = (shop as any).isSponsored ?? (shop as any).isPopular ?? true;
                        const isTopRated = (shop.rating && shop.rating >= 4.8);
                        const shopDistance = computeShopDistance(
                          mobileCoords,
                          (shop as any).latitude,
                          (shop as any).longitude
                        );

                        const shopCover = getShopCoverImage(shop);

                        return (
                          <TouchableOpacity
                            key={shopId}
                            activeOpacity={0.88}
                            onPress={() =>
                              router.push({
                                pathname: '/shop-detail',
                                params: { id: shopId },
                              } as any)
                            }
                            className="w-full bg-white rounded-2xl p-3.5 mb-3.5 shadow-sm border border-slate-200/90"
                          >
                            {/* Top Row: Shop Photo Thumbnail + Info Details */}
                            <View className="flex-row items-start">
                              {/* Photo Thumbnail */}
                              <Image
                                source={{ uri: shopCover }}
                                className="w-16 h-16 rounded-xl bg-slate-100 mr-3 border border-slate-200/70"
                                resizeMode="cover"
                              />

                              {/* Main Details */}
                              <View className="flex-1 pr-1">
                                <View className="flex-row items-center justify-between">
                                  <Text
                                    className="text-base font-bold text-slate-900 flex-1 mr-1.5"
                                    numberOfLines={1}
                                  >
                                    {shopName}
                                  </Text>
                                  <View className="flex-row items-center gap-1.5 flex-shrink-0">
                                    {isSponsored ? (
                                      <View className="bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
                                        <Text className="text-[10px] font-bold text-amber-800">⭐ Sponsored</Text>
                                      </View>
                                    ) : null}
                                    <View className="bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                      <Text className="text-[10px] font-semibold text-blue-700">{shopCategory}</Text>
                                    </View>
                                  </View>
                                </View>

                                {/* Category & Location line */}
                                <View className="flex-row items-center mt-0.5">
                                  <MapPin size={11} color="#94a3b8" />
                                  <Text className="text-xs text-slate-500 ml-1 flex-1" numberOfLines={1}>
                                    {shopAddress}
                                  </Text>
                                </View>

                                {/* Clean, Single-Line Distance Chip */}
                                <View className="flex-row items-center mt-1.5 bg-blue-50/80 self-start px-2 py-0.5 rounded-md border border-blue-200/70">
                                  <Navigation size={10} color="#2563eb" />
                                  <Text className="text-[11px] font-bold text-blue-800 ml-1">
                                    {shopDistance.meters < 1000
                                      ? `${shopDistance.meters} m (${shopDistance.kmText}) away`
                                      : `${shopDistance.kmText} (${shopDistance.metersText}) away`}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {/* Bottom Strip */}
                            <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100 mt-2.5">
                              <View className="flex-row items-center">
                                <Text className="text-xs text-slate-500 font-medium">
                                  {productCount > 0 ? `${productCount} products` : 'In stock'}
                                </Text>
                              </View>
                              <View className="flex-row items-center">
                                <Text className="text-xs font-bold text-primary mr-1">Visit Shop</Text>
                                <ArrowRight size={13} color="#2563eb" />
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {totalPopularPages > 1 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                        <TouchableOpacity
                          disabled={popularPage <= 1}
                          onPress={() => setPopularPage((p) => Math.max(1, p - 1))}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            backgroundColor: popularPage <= 1 ? '#f1f5f9' : '#ffffff',
                            opacity: popularPage <= 1 ? 0.4 : 1,
                          }}
                        >
                          <ChevronLeft size={16} color={popularPage <= 1 ? '#94a3b8' : '#1e293b'} />
                          <Text style={{ fontSize: 12, fontWeight: '600', marginLeft: 4, color: popularPage <= 1 ? '#94a3b8' : '#334155' }}>
                            Prev
                          </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {Array.from({ length: totalPopularPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            const isActive = popularPage === pageNum;
                            return (
                              <TouchableOpacity
                                key={pageNum}
                                onPress={() => setPopularPage(pageNum)}
                                activeOpacity={0.7}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: isActive ? '#2563eb' : 'transparent',
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? '#ffffff' : '#475569' }}>
                                  {pageNum}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <TouchableOpacity
                          disabled={popularPage >= totalPopularPages}
                          onPress={() => setPopularPage((p) => Math.min(totalPopularPages, p + 1))}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            backgroundColor: popularPage >= totalPopularPages ? '#f1f5f9' : '#ffffff',
                            opacity: popularPage >= totalPopularPages ? 0.4 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', marginRight: 4, color: popularPage >= totalPopularPages ? '#94a3b8' : '#334155' }}>
                            Next
                          </Text>
                          <ChevronRight size={16} color={popularPage >= totalPopularPages ? '#94a3b8' : '#1e293b'} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <Text className="text-muted-foreground italic">No sponsored shops right now.</Text>
                )}
              </View>
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
