import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, MapPin, Wrench, Car, TrendingUp, ShoppingCart, ArrowRight, Sparkles, Scissors, Zap, ShoppingBag, Truck, PaintBucket, Home as HomeIcon, Store } from "lucide-react-native";
import { router } from "expo-router";
import { supabase } from "../api/supabase/client";
import FloatingOrbs from "../components/landing/FloatingOrbs";

// Removed unused interfaces

interface PopularItem {
  entity_type: "product" | "service" | "transport" | "shop";
  entity_id: string;
  title: string;
  subtitle: string;
  link_url: string;
  badge: string;
  price_label: string | null;
  popularity: number;
}

// Data
const quickActions = [
  { label: "Nearby Shops", icon: MapPin, desc: "Find stores around you", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/shops" },
  { label: "Book Service", icon: Wrench, desc: "Hire local professionals", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/services" },
  { label: "Transport", icon: Car, desc: "Rides & delivery", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/book-transport" },
  { label: "Deals & Offers", icon: TrendingUp, desc: "Today's best deals", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", route: "/deals" },
];

const serviceTiles = [
  { name: "Transport", icon: Car, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
  { name: "Moving", icon: Truck, color: "#14b8a6", bg: "rgba(20, 184, 166, 0.1)" },
  { name: "Plumbing", icon: Wrench, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  { name: "Electrician", icon: Zap, color: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
  { name: "Painting", icon: PaintBucket, color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
  { name: "Carpentry", icon: HomeIcon, color: "#d97706", bg: "rgba(217, 119, 6, 0.1)" },
  { name: "Salon", icon: Scissors, color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" },
  { name: "Cleaning", icon: Sparkles, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
];

const shopCategories = [
  { name: "Apparel", icon: Scissors, color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" },
  { name: "Automobile", icon: Car, color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" },
  { name: "Electronics", icon: Zap, color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
  { name: "Groceries", icon: ShoppingBag, color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
];

const featuredServices = [
  { id: "1", name: "AC Repair & Service", provider: "CoolAir Experts", rating: 4.8, reviews: 234, price: "₹399", image: "🧊", tag: "Top Rated" },
  { id: "2", name: "Home Deep Cleaning", provider: "SparkleClean Pro", rating: 4.7, reviews: 189, price: "₹999", image: "✨", tag: "Popular" },
  { id: "3", name: "Electrician Visit", provider: "PowerFix Hub", rating: 4.9, reviews: 312, price: "₹199", image: "⚡", tag: "Trending" },
  { id: "4", name: "Plumbing Repair", provider: "PipeMaster", rating: 4.6, reviews: 156, price: "₹249", image: "🔧", tag: "Best Value" },
];

export default function Index() {
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const { data } = await supabase.rpc("get_marketplace_popular_items", { _limit: 8 });
        if (data) setPopularItems(data as PopularItem[]);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPopular();
  }, []);

  // Placeholder for future dynamic data fetching
  // useEffect(() => {
  //   // fetch dashboard data
  // }, []);

  return (
    <View className="flex-1 bg-[#f4f6fc] relative">
      <FloatingOrbs />
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        {/* Header Navbar */}
        <View className="flex-row items-center px-4 py-3 bg-transparent">
        <View className="w-10 h-10 bg-primary rounded-full items-center justify-center mr-3">
          <Text className="text-white font-bold text-lg">CL</Text>
        </View>
        <View className="flex-1 flex-row items-center bg-[#f1f5f9] rounded-xl px-3 h-10 mr-3">
          <Search size={18} color="#64748b" />
          <TextInput 
            placeholder="Search products" 
            className="flex-1 ml-2 text-foreground"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          className="bg-primary flex-row items-center px-4 h-10 rounded-xl"
          onPress={() => router.push('/auth')}
        >
          <Text className="text-white font-medium ml-1">Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
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
        <View className="flex-row flex-wrap justify-between mb-8">
          {quickActions.map((action, i) => (
            <TouchableOpacity key={i} className="w-[48%] bg-white rounded-2xl p-4 mb-4 shadow-sm border border-[#e2e8f0]">
              <View className="w-10 h-10 rounded-full items-center justify-center mb-3" style={{ backgroundColor: action.bg }}>
                <action.icon size={20} color={action.color} />
              </View>
              <Text className="font-bold text-foreground mb-1">{action.label}</Text>
              <Text className="text-xs text-muted-foreground">{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Services at your doorstep */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold">Services at your doorstep</Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-primary text-sm font-medium">View All</Text>
              <ArrowRight size={14} color="#3b82f6" className="ml-1" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {serviceTiles.map((tile, i) => (
              <TouchableOpacity key={i} className="w-[22%] items-center mb-4">
                <View className="w-14 h-14 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: tile.bg }}>
                  <tile.icon size={24} color={tile.color} />
                </View>
                <Text className="text-[10px] font-medium text-center">{tile.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shop by category */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold">Shop by category</Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-primary text-sm font-medium">View All</Text>
              <ArrowRight size={14} color="#3b82f6" className="ml-1" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {shopCategories.map((cat, i) => (
              <TouchableOpacity key={i} className="w-[48%] bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm border border-[#e2e8f0]">
                <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: cat.bg }}>
                  <cat.icon size={20} color={cat.color} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-sm">{cat.name}</Text>
                  <Text className="text-xs text-muted-foreground">Explore →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured */}
        <View className="mb-10">
          <View className="flex-row items-center mb-4">
            <Sparkles size={20} color="#3b82f6" />
            <Text className="text-xl font-bold ml-2">Featured</Text>
          </View>
          
          <View className="gap-y-4">
            {featuredServices.map((service) => (
              <TouchableOpacity key={service.id} className="bg-white rounded-2xl p-5 shadow-sm border border-[#e2e8f0]">
                <View className="flex-row items-start justify-between mb-3">
                  <Text className="text-3xl">{service.image}</Text>
                  <View className="bg-[#f1f5f9] px-3 py-1 rounded-full">
                    <Text className="text-xs font-medium text-foreground">{service.tag}</Text>
                  </View>
                </View>
                <Text className="font-bold text-lg mb-1">{service.name}</Text>
                <Text className="text-sm text-muted-foreground mb-3">{service.provider}</Text>
                
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Text className="text-yellow-400 font-bold mr-1">⭐ {service.rating}</Text>
                    <Text className="text-muted-foreground text-xs">({service.reviews})</Text>
                  </View>
                  <Text className="text-primary font-bold text-lg">{service.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Popular near you */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <TrendingUp size={20} color="#3b82f6" />
              <Text className="text-xl font-bold ml-2">Popular near you</Text>
            </View>
          </View>

          {loading ? (
             <ActivityIndicator size="small" color="#3b82f6" />
          ) : popularItems.length > 0 ? (
            <View className="flex-row flex-wrap justify-between">
              {popularItems.map((item) => {
                const Icon = item.entity_type === "transport" ? Truck
                  : item.entity_type === "service" ? Wrench
                  : item.entity_type === "shop" ? Store
                  : ShoppingBag;

                return (
                  <TouchableOpacity key={`${item.entity_type}-${item.entity_id}`} className="w-full bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#e2e8f0]">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="w-10 h-10 rounded-xl bg-[#eff6ff] items-center justify-center">
                        <Icon size={20} color="#3b82f6" />
                      </View>
                      <View className="bg-[#f1f5f9] px-2 py-1 rounded-md">
                        <Text className="text-[10px] font-medium text-muted-foreground">{item.badge}</Text>
                      </View>
                    </View>
                    <Text className="font-bold text-sm mb-1">{item.title}</Text>
                    <Text className="text-xs text-muted-foreground mb-3" numberOfLines={2}>{item.subtitle}</Text>
                    <View className="flex-row items-center justify-between mt-auto">
                      <Text className="text-primary font-medium text-xs">{item.price_label || `${item.popularity} orders`}</Text>
                      <Text className="text-xs text-muted-foreground">{item.popularity > 0 ? `${item.popularity} orders` : "Trending"}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
             <Text className="text-muted-foreground italic">No popular items right now.</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
    </View>
  );
}
