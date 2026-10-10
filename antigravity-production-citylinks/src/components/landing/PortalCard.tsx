import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PortalCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  color: "customer" | "merchant" | "employee" | "labor" | "transportation";
  route: string;
  index: number;
}

const colorMap = {
  customer: {
    bg: "bg-portal-customer/10",
    border: "border-portal-customer/20",
    icon: "text-portal-customer",
    hover: "group-hover:bg-portal-customer/15",
    glow: "group-hover:shadow-[0_8px_40px_hsl(var(--portal-customer)/0.2)]",
  },
  merchant: {
    bg: "bg-portal-merchant/10",
    border: "border-portal-merchant/20",
    icon: "text-portal-merchant",
    hover: "group-hover:bg-portal-merchant/15",
    glow: "group-hover:shadow-[0_8px_40px_hsl(var(--portal-merchant)/0.2)]",
  },
  employee: {
    bg: "bg-portal-employee/10",
    border: "border-portal-employee/20",
    icon: "text-portal-employee",
    hover: "group-hover:bg-portal-employee/15",
    glow: "group-hover:shadow-[0_8px_40px_hsl(var(--portal-employee)/0.2)]",
  },
  labor: {
    bg: "bg-portal-labor/10",
    border: "border-portal-labor/20",
    icon: "text-portal-labor",
    hover: "group-hover:bg-portal-labor/15",
    glow: "group-hover:shadow-[0_8px_40px_hsl(var(--portal-labor)/0.2)]",
  },
  transportation: {
    bg: "bg-portal-transportation/10",
    border: "border-portal-transportation/20",
    icon: "text-portal-transportation",
    hover: "group-hover:bg-portal-transportation/15",
    glow: "group-hover:shadow-[0_8px_40px_hsl(var(--portal-transportation)/0.2)]",
  },
};

const PortalCard = ({ title, subtitle, description, icon: Icon, color, route, index }: PortalCardProps) => {
  const navigate = useNavigate();
  const styles = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={() => navigate(route)}
      className={`group cursor-pointer relative glass rounded-2xl p-6 md:p-8 transition-all duration-300 ${styles.glow}`}
    >
      <div className={`w-14 h-14 rounded-xl ${styles.bg} ${styles.hover} flex items-center justify-center mb-5 transition-colors duration-300`}>
        <Icon className={`w-7 h-7 ${styles.icon}`} />
      </div>

      <h3 className="font-display text-xl font-bold text-foreground mb-1">
        {title}
      </h3>
      <p className={`text-sm font-medium ${styles.icon} mb-3`}>
        {subtitle}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      <div className={`mt-5 flex items-center gap-2 text-sm font-medium ${styles.icon} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
        <span>Enter Portal</span>
        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    </motion.div>
  );
};

export default PortalCard;
