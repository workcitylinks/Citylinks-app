import { motion } from "framer-motion";
import { Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  title?: string;
  message?: string;
}

const PendingApprovalScreen = ({
  title = "Account Under Review",
  message = "Your account is currently being reviewed by our verification team. You'll receive full access once your application has been approved. This process typically takes 24–48 hours.",
}: Props) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-2xl p-8 max-w-md w-full text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{message}</p>
        </div>
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-4">
            Need help? Contact us at <span className="font-medium text-foreground">support@citylinks.in</span>
          </p>
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PendingApprovalScreen;
