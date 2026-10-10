import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DatabaseZap, Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TestDataManager = () => {
  const [loading, setLoading] = useState(false);

  const handleClearData = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("clear_all_data" as any);
      if (error) throw error;
      toast.success("System reset successful. All test data cleared.");
      // Refresh page to show updated stats
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(`Clear failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateData = async () => {
    setLoading(true);
    try {
      // Since dummy data is in the initialization SQL, this button could
      // either run another RPC or just inform the user.
      // For now, let's assume there's a generate_test_data RPC.
      const { error } = await supabase.rpc("generate_test_data" as any);
      if (error) {
        if (error.message.includes("not found")) {
          toast.error("Generation function not found. Please ensure SQL initialization is complete.");
        } else {
          throw error;
        }
      } else {
        toast.success("10 test entries generated in all sections.");
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      toast.error(`Generation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass border-portal-employee/20 shadow-lg overflow-hidden">
      <CardHeader className="bg-portal-employee/5 pb-4">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <DatabaseZap className="w-5 h-5 text-portal-employee" />
          Test Data Management
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Use these tools to populate or clear the database during the testing phase.
          <span className="text-destructive font-medium block mt-1">
            Note: Clearing data will remove all records except your own profile.
          </span>
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="outline"
            className="border-portal-employee/30 hover:bg-portal-employee/10 gap-2"
            onClick={handleGenerateData}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
            Generate Test Data
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={loading}>
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete all merchants, transporters, orders, products, and bookings.
                  This cannot be undone. System configurations and your admin profile will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, Clear Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestDataManager;
