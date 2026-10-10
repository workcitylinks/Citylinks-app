import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useLaborProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const laborProfileQuery = useQuery({
    queryKey: ["labor-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("labor_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createLaborProfile = useMutation({
    mutationFn: async (values: { full_name: string; phone?: string; email?: string; pan_number?: string; labor_id_number?: string; bank_account_number?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("labor_profiles").insert({ ...values, user_id: user.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labor-profile"] });
      toast.success("Labor profile created!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { laborProfile: laborProfileQuery.data, isLoading: laborProfileQuery.isLoading, createLaborProfile };
};