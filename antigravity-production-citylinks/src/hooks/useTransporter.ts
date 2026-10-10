import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useTransporter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const transporterQuery = useQuery({
    queryKey: ["transporter", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("transporters" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createTransporter = useMutation({
    mutationFn: async (values: { full_name: string; phone?: string; email?: string; vehicle_number?: string; pan_number?: string; dl_number?: string; business_permit_number?: string; bank_account_number?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("transporters" as any)
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transporter"] });
      toast.success("Transport profile created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTransporter = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!transporterQuery.data) throw new Error("No transporter");
      const { data, error } = await supabase
        .from("transporters" as any)
        .update(values)
        .eq("id", (transporterQuery.data as any).id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transporter"] });
      toast.success("Updated successfully!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    transporter: transporterQuery.data as any,
    isLoading: transporterQuery.isLoading,
    createTransporter,
    updateTransporter,
  };
};
