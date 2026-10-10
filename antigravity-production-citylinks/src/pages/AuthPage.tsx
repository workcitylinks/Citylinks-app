import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, Loader2, Store, Wrench, Truck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, roles, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedPortalRoute, setSelectedPortalRoute] = useState<string | null>(searchParams.get("next"));

  const professionalPortals = [
    { title: "Merchant", icon: Store, color: "text-portal-merchant",
      loginRoute: "/merchant", enrollRoute: "/merchant/onboarding" },
    { title: "Labor", icon: Wrench, color: "text-portal-labor",
      loginRoute: "/labor", enrollRoute: "/labor/onboarding" },
    { title: "Transport", icon: Truck, color: "text-portal-transportation",
      loginRoute: "/transportation", enrollRoute: "/transportation/onboarding" },
  ];

  useEffect(() => {
    const nextRoute = searchParams.get("next");
    const signupIntent = searchParams.get("mode") === "signup" || nextRoute?.includes("/onboarding");

    setIsLogin(!signupIntent);
    setSelectedPortalRoute(nextRoute);
  }, [searchParams]);

  const selectedPortal = professionalPortals.find((portal) => portal.enrollRoute === selectedPortalRoute) ?? null;

  const updateAuthRoute = (loginMode: boolean, nextRoute?: string | null) => {
    const params = new URLSearchParams();

    if (!loginMode) {
      params.set("mode", "signup");
    }

    if (!loginMode && nextRoute) {
      params.set("next", nextRoute);
    }

    navigate(`/auth${params.toString() ? `?${params.toString()}` : ""}`, { replace: true });
  };

  // Auto-redirect logged-in users based on their role and selected portal
  useEffect(() => {
    if (authLoading || !user) return;

    // If a specific portal was requested, go there
    if (selectedPortalRoute) {
      navigate(selectedPortalRoute);
      return;
    }

    // Auto-route professionals to their portal
    if (roles.includes("merchant" as any)) {
      navigate("/merchant");
    } else if (roles.includes("labor" as any)) {
      navigate("/labor");
    } else if (roles.includes("transportation" as any)) {
      navigate("/transportation");
    } else if (roles.includes("employee" as any)) {
      navigate("/employee");
    } else {
      navigate("/");
    }
  }, [user, roles, authLoading, navigate, selectedPortalRoute]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: prof } = await supabase.from("profiles").select("account_status").eq("id", authData.user.id).single();
        if (prof?.account_status !== "approved") {
          await supabase.auth.signOut();
          toast.error("Your account is awaiting approval. You'll be notified once an administrator verifies your account.");
          return;
        }
        toast.success("Welcome back!");
        // Navigation is handled by the useEffect above after auth state updates
      } else {
        const emailRedirectUrl = new URL("/auth", window.location.origin);
        if (selectedPortalRoute) {
          emailRedirectUrl.searchParams.set("next", selectedPortalRoute);
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: emailRedirectUrl.toString(),
          },
        });
        if (error) throw error;

        if (selectedPortalRoute && data.session) {
          toast.success("Account created! Redirecting to onboarding...");
          navigate(selectedPortalRoute);
        } else if (selectedPortalRoute) {
          toast.success(`Account created! Verify your email, then sign in to continue to ${selectedPortal?.title || "your"} onboarding.`);
        } else {
          toast.success("Check your email to verify your account, then sign in to continue.");
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalPortalClick = (portal: typeof professionalPortals[0]) => {
    if (user) {
      navigate(portal.enrollRoute);
    } else {
      setSelectedPortalRoute(portal.enrollRoute);
      setIsLogin(false);
      updateAuthRoute(false, portal.enrollRoute);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = new URL("/auth", window.location.origin);
      if (!isLogin) {
        redirectUrl.searchParams.set("mode", "signup");
      }
      if (selectedPortalRoute) {
        redirectUrl.searchParams.set("next", selectedPortalRoute);
      }

      const isCustomDomain =
        !window.location.hostname.includes("lovable.app") &&
        !window.location.hostname.includes("lovableproject.com") &&
        !window.location.hostname.includes("localhost");

      if (isCustomDomain) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl.toString(),
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      } else {
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: redirectUrl.toString(),
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient relative flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-strong rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              {isLogin ? "Sign in to" : "Join"}{" "}
              <span className="text-gradient-hero">CityLinks</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLogin
                ? "Welcome back! Choose your sign-in method"
                : "Create your account to get started"}
            </p>
          </div>

          {!isLogin && selectedPortal && (
            <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
              Create your account below to continue to <span className="font-semibold">{selectedPortal.title}</span> onboarding.
            </div>
          )}

          {/* Google SSO */}
          <Button
            variant="outline"
            className="w-full gap-3 h-11 mb-6 border-border/50 hover:bg-accent/50"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background/80 px-3 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground/80">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                selectedPortal ? `Create ${selectedPortal.title} Account` : "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                const nextLoginMode = !isLogin;
                setSelectedPortalRoute(nextLoginMode ? null : selectedPortalRoute);
                setIsLogin(nextLoginMode);
                updateAuthRoute(nextLoginMode, nextLoginMode ? null : selectedPortalRoute);
              }}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>

          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </div>

      {/* Professional Portal Tiles - Sign up only */}
        {!isLogin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6"
          >
            <p className="text-center text-sm font-medium text-muted-foreground mb-3">
              Are you a professional? <span className="text-primary">Enroll now</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {professionalPortals.map((portal) => (
                <motion.div
                  key={portal.title}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleProfessionalPortalClick(portal)}
                  className={`glass rounded-xl p-3 cursor-pointer group text-center hover:shadow-md transition-all ${
                    selectedPortalRoute === portal.enrollRoute
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1.5">
                    <portal.icon className={`w-4 h-4 ${portal.color}`} />
                  </div>
                  <p className="font-semibold text-xs text-foreground">{portal.title}</p>
                  <p className="text-[10px] text-muted-foreground">Enroll now</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
