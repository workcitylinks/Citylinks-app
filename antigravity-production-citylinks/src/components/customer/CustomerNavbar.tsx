import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { User, LogOut, ChevronDown, Search, X, ShoppingCart, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface CustomerNavbarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  cartCount?: number;
  onCartClick?: () => void;
}

const CustomerNavbar = ({ searchQuery = "", onSearchChange, showSearch = true, cartCount = 0, onCartClick }: CustomerNavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, roles, signOut } = useAuth();

  const isOnProfilePage = location.pathname === "/profile";


  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 glass-strong"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16 gap-2">
        <div
          className="flex items-center gap-2 cursor-pointer shrink-0"
          onClick={() => navigate("/")}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CL</span>
          </div>
          <span className="font-display font-bold text-lg text-foreground hidden sm:inline">
            City<span className="text-gradient-hero">Links</span>
          </span>
        </div>

        {/* Search bar in navbar */}
        {showSearch && onSearchChange && (
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                placeholder="Search products, shops, services..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-8 h-9 rounded-xl bg-background/50 border-border/30 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {/* Cart icon for customers */}
          {user && cartCount > 0 && onCartClick && (
            <Button variant="ghost" size="sm" className="relative px-2" onClick={onCartClick}>
              <ShoppingCart className="w-5 h-5 text-foreground" />
              <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                {cartCount}
              </Badge>
            </Button>
          )}


          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                    {profile?.full_name || user.email?.split("@")[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isOnProfilePage ? (
                  <DropdownMenuItem onClick={() => navigate("/orders")}>
                    <Package className="w-4 h-4 mr-2" /> My Orders
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="w-4 h-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                )}
                {!isOnProfilePage && (
                  <DropdownMenuItem onClick={() => navigate("/orders")}>
                    <Package className="w-4 h-4 mr-2" /> My Orders
                  </DropdownMenuItem>
                )}
                {/* Mobile portal switches */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              <span>Login</span>
            </Button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default CustomerNavbar;
