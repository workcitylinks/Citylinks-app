import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield } from "lucide-react";

const EmployeeProfile = () => {
  const { user, profile, roles } = useAuth();

  return (
    <EmployeeLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-display font-bold text-foreground">Profile</h1>

        <Card className="glass">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-portal-employee/15 flex items-center justify-center">
                <User className="w-8 h-8 text-portal-employee" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{profile?.full_name || "Employee"}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> {user?.email}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                <Shield className="w-4 h-4" /> Assigned Roles
              </p>
              <div className="flex gap-2 flex-wrap">
                {roles.map((role) => (
                  <Badge key={role} variant="outline" className="bg-portal-employee/10 text-portal-employee border-portal-employee/30">
                    {role}
                  </Badge>
                ))}
                {roles.length === 0 && (
                  <span className="text-sm text-muted-foreground">No roles assigned.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeProfile;
