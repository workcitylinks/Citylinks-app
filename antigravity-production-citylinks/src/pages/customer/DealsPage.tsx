import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Star, Tag, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { useNavigate } from "react-router-dom";

const DealsPage = () => {
  const navigate = useNavigate();

  const { data: ads = [], isLoading: adsLoading } = useQuery({
    queryKey: ["all-deals-ads"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_featured_ads", { _limit: 20 });
      if (error) return [];
      return data || [];
    },
  });

  const { data: popularItems = [], isLoading: popularLoading } = useQuery({
    queryKey: ["deals-popular-items"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_marketplace_popular_items", { _limit: 20 });
      if (error) return [];
      return data || [];
    },
  });

  const isLoading = adsLoading || popularLoading;
  const hasContent = ads.length > 0 || popularItems.length > 0;

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar showSearch={false} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="pt-6 pb-4">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">
            <TrendingUp className="w-6 h-6 inline mr-2 text-primary" />
            Deals & Offers
          </h1>
          <p className="text-muted-foreground text-sm">Today's best deals and trending items</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                <div className="h-5 bg-muted rounded w-2/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : !hasContent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Percent className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No deals available yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Check back soon! Merchants and service providers will post deals and offers here.
            </p>
            <Button className="mt-6" onClick={() => navigate("/")}>
              Browse Marketplace
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Featured Ads / Deals */}
            {ads.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" /> Featured Deals
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ads.map((ad: any, i: number) => (
                    <motion.div
                      key={ad.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                      onClick={() => ad.link_url && navigate(ad.link_url)}
                    >
                      {ad.image_url && (
                        <div className="h-32 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <img src={ad.image_url} alt={ad.title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <Badge variant="secondary" className="text-[10px] mb-2 capitalize">{ad.category}</Badge>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{ad.title}</h3>
                        {ad.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Popular / Trending Items */}
            {popularItems.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" /> Trending Now
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {popularItems.map((item: any, i: number) => (
                    <motion.div
                      key={`${item.entity_type}-${item.entity_id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                      onClick={() => item.link_url && navigate(item.link_url)}
                    >
                      <Badge variant="outline" className="text-[10px] mb-2">{item.badge}</Badge>
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                      {item.price_label && (
                        <p className="text-sm font-bold text-primary mt-2">{item.price_label}</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsPage;
