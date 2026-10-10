import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useMerchant = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const merchantQuery = useQuery({
    queryKey: ["merchant", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMerchant = useMutation({
    mutationFn: async (values: { business_name: string; business_type: string; phone?: string; email?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("merchants")
        .insert({ ...values, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant"] });
      toast.success("Business profile created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMerchant = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!merchantQuery.data) throw new Error("No merchant");
      const { data, error } = await supabase
        .from("merchants")
        .update(values)
        .eq("id", merchantQuery.data.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant"] });
      toast.success("Updated successfully!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { merchant: merchantQuery.data, isLoading: merchantQuery.isLoading, createMerchant, updateMerchant };
};
