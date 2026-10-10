import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  User,
  LogOut,
  ChevronLeft,
  Menu,
  Store,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PortalSwitcher from "@/components/shared/PortalSwitcher";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/merchant" },
  { label: "Billing", icon: ShoppingCart, path: "/merchant/billing" },
  { label: "Inventory", icon: Package, path: "/merchant/inventory" },
  { label: "Bills History", icon: ClipboardList, path: "/merchant/bills" },
  { label: "Analytics", icon: BarChart3, path: "/merchant/analytics" },
  { label: "Profile", icon: User, path: "/merchant/profile" },
];

const MerchantLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`flex flex-col h-full ${
        mobile ? "w-64" : collapsed ? "w-16" : "w-56"
      } transition-all duration-300`}
    >
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-9 h-9 rounded-xl bg-portal-merchant/15 flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-portal-merchant" />
        </div>
        {(!collapsed || mobile) && (
          <div className="overflow-hidden">
            <h2 className="font-display text-sm font-bold text-foreground truncate">
              SimpleBiller
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.full_name || "Merchant"}
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (mobile) setMobileOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-portal-merchant/15 text-portal-merchant"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border/50">
        <PortalSwitcher collapsed={collapsed} mobile={mobile} currentPortal="merchant" onNavigate={mobile ? () => setMobileOpen(false) : undefined} />
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 shrink-0" />
          {(!collapsed || mobile) && <span>Customer Mode</span>}
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || mobile) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex glass-strong border-r border-border/50 shrink-0 relative">
        <Sidebar />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-20 -right-3 z-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ChevronLeft
            className={`w-3 h-3 text-muted-foreground transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 z-50 glass-strong border-r border-border/50 md:hidden"
            >
              <Sidebar mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-border/50 glass">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-display font-bold text-foreground">SimpleBiller</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default MerchantLayout;
