import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LaborLayout from "@/components/labor/LaborLayout";
import { motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Clock, X } from "lucide-react";

interface AvailabilityEntry {
  id: string;
  date: string;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

const LaborAvailability = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAvailable, setIsAvailable] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("labor_availability")
      .select("*")
      .eq("labor_id", user.id)
      .order("date", { ascending: true });
    if (data) setEntries(data);
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  // Load selected date's data
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const existing = entries.find((e) => e.date === dateStr);
    if (existing) {
      setIsAvailable(existing.is_available);
      setStartTime(existing.start_time || "09:00");
      setEndTime(existing.end_time || "18:00");
      setReason(existing.reason || "");
    } else {
      setIsAvailable(true);
      setStartTime("09:00");
      setEndTime("18:00");
      setReason("");
    }
  }, [selectedDate, entries]);

  const handleSave = async () => {
    if (!user || !selectedDate) return;
    setSaving(true);
    const dateStr = selectedDate.toISOString().split("T")[0];
    const existing = entries.find((e) => e.date === dateStr);

    const payload = {
      labor_id: user.id,
      date: dateStr,
      is_available: isAvailable,
      start_time: isAvailable ? startTime : null,
      end_time: isAvailable ? endTime : null,
      reason: !isAvailable ? reason || null : null,
    };

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("labor_availability")
        .update(payload)
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("labor_availability").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `Availability for ${dateStr} updated` });
      fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("labor_availability").delete().eq("id", id);
    toast({ title: "Removed" });
    fetchEntries();
  };

  // Highlight dates on calendar
  const unavailableDates = entries
    .filter((e) => !e.is_available)
    .map((e) => new Date(e.date));
  const customDates = entries
    .filter((e) => e.is_available)
    .map((e) => new Date(e.date));

  return (
    <LaborLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Availability
          </h1>
          <p className="text-muted-foreground mt-1">
            Set your schedule and mark holidays
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Calendar + form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 space-y-5"
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                unavailable: unavailableDates,
                custom: customDates,
              }}
              modifiersStyles={{
                unavailable: {
                  backgroundColor: "hsl(0 84% 60% / 0.15)",
                  color: "hsl(0 84% 60%)",
                  borderRadius: "8px",
                },
                custom: {
                  backgroundColor: "hsl(260 65% 55% / 0.15)",
                  color: "hsl(260 65% 55%)",
                  borderRadius: "8px",
                },
              }}
              className="mx-auto"
            />

            {selectedDate && (
              <div className="space-y-4 border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Available on{" "}
                    {selectedDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                  />
                </div>

                {isAvailable ? (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Start
                      </label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        End
                      </label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <Input
                    placeholder="Reason (e.g., Holiday, Personal)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                )}

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-portal-labor text-primary-foreground hover:bg-portal-labor/90"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </motion.div>

          {/* Upcoming unavailable */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="font-display font-bold text-foreground mb-4">
              Marked Unavailable
            </h2>
            {entries.filter((e) => !e.is_available).length === 0 ? (
              <div className="text-center py-10">
                <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No holidays or off-days set
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries
                  .filter((e) => !e.is_available)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/10"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(e.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        {e.reason && (
                          <p className="text-xs text-muted-foreground">
                            {e.reason}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <h2 className="font-display font-bold text-foreground mt-6 mb-4">
              Custom Hours
            </h2>
            {entries.filter((e) => e.is_available).length === 0 ? (
              <div className="text-center py-6">
                <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  Using default hours (9 AM – 6 PM)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries
                  .filter((e) => e.is_available)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-portal-labor/5 border border-portal-labor/10"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(e.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.start_time} – {e.end_time}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </LaborLayout>
  );
};

export default LaborAvailability;
