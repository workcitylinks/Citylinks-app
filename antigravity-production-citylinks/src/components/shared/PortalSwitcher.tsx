import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Store, Wrench, Truck, Building2, ShoppingCart } from "lucide-react";

interface PortalSwitcherProps {
  collapsed?: boolean;
  mobile?: boolean;
  currentPortal: "merchant" | "labor" | "transportation" | "employee";
  onNavigate?: () => void;
}

const portals = [
  { key: "merchant", label: "Merchant", icon: Store, path: "/merchant", color: "text-portal-merchant", bgColor: "hover:bg-portal-merchant/10" },
  { key: "labor", label: "Labor Hub", icon: Wrench, path: "/labor", color: "text-portal-labor", bgColor: "hover:bg-portal-labor/10" },
  { key: "transportation", label: "Transport", icon: Truck, path: "/transportation", color: "text-portal-transportation", bgColor: "hover:bg-portal-transportation/10" },
  { key: "employee", label: "Management", icon: Building2, path: "/employee", color: "text-portal-employee", bgColor: "hover:bg-portal-employee/10" },
] as const;

const PortalSwitcher = ({ collapsed = false, mobile = false, currentPortal, onNavigate }: PortalSwitcherProps) => {
  const navigate = useNavigate();
  const { roles, user } = useAuth();
  const show = !collapsed || mobile;

  const isStaffEmail = user?.email?.endsWith("@citylinks.in");
  const hasEmployeeRole = roles.includes("employee" as any);

  const availablePortals = portals.filter((p) => {
    if (p.key === currentPortal) return false;
    if (p.key === "employee") return isStaffEmail || hasEmployeeRole;
    return roles.includes(p.key as any);
  });

  if (availablePortals.length === 0) return null;

  return (
    <div className="px-2 pb-1">
      {show && (
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 pb-1 pt-2">
          Switch Portal
        </p>
      )}
      {availablePortals.map((portal) => (
        <button
          key={portal.key}
          onClick={() => {
            navigate(portal.path);
            onNavigate?.();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${portal.color} ${portal.bgColor} transition-colors`}
        >
          <portal.icon className="w-4 h-4 shrink-0" />
          {show && <span className="text-xs font-medium">{portal.label}</span>}
        </button>
      ))}
    </div>
  );
};

export default PortalSwitcher;
