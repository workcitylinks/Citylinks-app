import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import SensitiveData from "@/components/ui/SensitiveData";
import { CheckCircle, XCircle, Eye, Clock, Store, Truck, Users, Trash2, Bell } from "lucide-react";

interface Merchant {
  id: string;
  business_name: string;
  business_type: string;
  gst_number: string | null;
  pan_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  taluq: string | null;
  pincode: string | null;
  approval_status: string;
  onboarding_complete: boolean;
  created_at: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  user_id: string;
}

interface Transporter {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  approval_status: string;
  created_at: string;
  user_id: string;
}

interface PendingUser {
  id: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  created_at: string;
}

interface InternalMessage {
  id: string;
  subject: string;
  body: string;
  message_type: string;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const EmployeeApprovals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("merchants");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [notifications, setNotifications] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const queries = [
      supabase.from("merchants").select("*").order("created_at", { ascending: false }),
      supabase.from("transporters").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("account_status", "pending").order("created_at", { ascending: false }),
    ];
    const [mRes, tRes, uRes] = await Promise.all(queries);
    if (mRes.data) setMerchants(mRes.data as Merchant[]);
    if (tRes.data) setTransporters(tRes.data as Transporter[]);
    if (uRes.data) setPendingUsers(uRes.data as PendingUser[]);

    // Fetch notifications
    if (user) {
      const { data: msgs } = await supabase
        .from("internal_messages")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (msgs) setNotifications(msgs as InternalMessage[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApproveMerchant = async (merchant: Merchant) => {
    if (!user) return;
    setActionLoading(true);
    const { error } = await supabase.from("merchants").update({
      approval_status: "approved", approved_by: user.id, approved_at: new Date().toISOString(),
    }).eq("id", merchant.id);
    if (!error) {
      await supabase.from("profiles").update({ account_status: "approved" }).eq("id", merchant.user_id);
      await supabase.from("audit_logs").insert({
        user_id: user.id, action: "merchant_approved", entity_type: "merchant", entity_id: merchant.id,
        details: { business_name: merchant.business_name },
      });
      toast({ title: "Merchant approved", description: `${merchant.business_name} has been approved.` });
      fetchAll();
      setSelectedMerchant(null);
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleRejectMerchant = async (merchant: Merchant) => {
    if (!user) return;
    setActionLoading(true);
    await supabase.from("merchants").update({ approval_status: "rejected" }).eq("id", merchant.id);
    await supabase.from("profiles").update({ account_status: "rejected" }).eq("id", merchant.user_id);
    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "merchant_rejected", entity_type: "merchant", entity_id: merchant.id,
      details: { business_name: merchant.business_name, reason: rejectReason },
    });
    toast({ title: "Merchant rejected", description: `${merchant.business_name} has been rejected.` });
    setRejectReason("");
    fetchAll();
    setSelectedMerchant(null);
    setActionLoading(false);
  };

  const handleDeleteMerchant = async (merchant: Merchant) => {
    if (!confirm(`Delete merchant "${merchant.business_name}"? This cannot be undone.`)) return;
    setActionLoading(true);
    await supabase.from("merchant_products").delete().eq("merchant_id", merchant.id);
    await supabase.from("merchants").delete().eq("id", merchant.id);
    toast({ title: "Deleted", description: `${merchant.business_name} has been removed.` });
    fetchAll();
    setSelectedMerchant(null);
    setActionLoading(false);
  };

  const handleApproveTransporter = async (t: Transporter) => {
    if (!user) return;
    setActionLoading(true);
    await supabase.from("transporters").update({
      approval_status: "approved", approved_by: user.id, approved_at: new Date().toISOString(),
    }).eq("id", t.id);
    await supabase.from("profiles").update({ account_status: "approved" }).eq("id", t.user_id);
    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "transporter_approved", entity_type: "transporter", entity_id: t.id,
      details: { full_name: t.full_name },
    });
    toast({ title: "Transporter approved", description: `${t.full_name} has been approved.` });
    fetchAll();
    setActionLoading(false);
  };

  const handleDeleteTransporter = async (t: Transporter) => {
    if (!confirm(`Delete transporter "${t.full_name}"? This cannot be undone.`)) return;
    setActionLoading(true);
    await supabase.from("transporter_vehicles").delete().eq("transporter_id", t.id);
    await supabase.from("transporters").delete().eq("id", t.id);
    toast({ title: "Deleted", description: `${t.full_name} has been removed.` });
    fetchAll();
    setActionLoading(false);
  };

  const handleApproveUser = async (p: PendingUser) => {
    if (!user) return;
    setActionLoading(true);
    await supabase.from("profiles").update({ account_status: "approved" }).eq("id", p.id);
    await supabase.from("audit_logs").insert({
      user_id: user.id, action: "user_approved", entity_type: "profile", entity_id: p.id,
      details: { full_name: p.full_name },
    });
    toast({ title: "User approved", description: `${p.full_name || "User"} has been approved.` });
    fetchAll();
    setActionLoading(false);
  };

  const handleDeleteUser = async (p: PendingUser) => {
    if (!confirm(`Delete user "${p.full_name || "Unknown"}"? This cannot be undone.`)) return;
    setActionLoading(true);
    await supabase.from("user_roles").delete().eq("user_id", p.id);
    await supabase.from("profiles").delete().eq("id", p.id);
    toast({ title: "Deleted", description: `User has been removed.` });
    fetchAll();
    setActionLoading(false);
  };

  const filteredMerchants = (status: string) => merchants.filter((m) => m.approval_status === status);
  const filteredTransporters = (status: string) => transporters.filter((t) => t.approval_status === status);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">Approvals</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary/15 text-primary gap-1"><Bell className="w-3 h-3" />{unreadCount} new</Badge>
          )}
        </div>

        {/* Notification banner */}
        {notifications.filter(n => !n.is_read).slice(0, 3).map(n => (
          <div key={n.id} className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3"
            onClick={async () => {
              await supabase.from("internal_messages").update({ is_read: true }).eq("id", n.id);
              setNotifications(prev => prev.map(msg => msg.id === n.id ? { ...msg, is_read: true } : msg));
            }}
          >
            <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{n.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{n.body}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{new Date(n.created_at).toLocaleDateString()}</span>
          </div>
        ))}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="merchants" className="gap-1.5">
              <Store className="w-4 h-4" /> Merchants ({filteredMerchants("pending").length})
            </TabsTrigger>
            <TabsTrigger value="transporters" className="gap-1.5">
              <Truck className="w-4 h-4" /> Transporters ({filteredTransporters("pending").length})
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-4 h-4" /> Pending Users ({pendingUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merchants">
            <Tabs defaultValue="pending">
              <TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger></TabsList>
              {["pending", "approved", "rejected"].map((status) => (
                <TabsContent key={status} value={status}>
                  {loading ? <p className="text-sm text-muted-foreground p-4">Loading...</p> :
                   filteredMerchants(status).length === 0 ? <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">No {status} merchants.</CardContent></Card> : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredMerchants(status).map((m) => (
                        <Card key={m.id} className="glass hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-portal-merchant/15 flex items-center justify-center shrink-0"><Store className="w-5 h-5 text-portal-merchant" /></div>
                                <div><p className="font-semibold text-foreground">{m.business_name}</p><p className="text-xs text-muted-foreground">{m.business_type} • {m.city || "N/A"}</p></div>
                              </div>
                              <Badge className={statusColors[m.approval_status] || ""}>{m.approval_status}</Badge>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" /> {new Date(m.created_at).toLocaleDateString()}
                              {m.onboarding_complete && <Badge variant="outline" className="ml-auto text-xs">Onboarding Complete</Badge>}
                            </div>
                            <div className="mt-3 flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => setSelectedMerchant(m)}><Eye className="w-4 h-4 mr-1" /> Review</Button>
                              {m.approval_status === "pending" && (
                                <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleApproveMerchant(m)} disabled={actionLoading}><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteMerchant(m)} disabled={actionLoading}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="transporters">
            <Tabs defaultValue="pending">
              <TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger></TabsList>
              {["pending", "approved"].map((status) => (
                <TabsContent key={status} value={status}>
                  {loading ? <p className="text-sm text-muted-foreground p-4">Loading...</p> :
                   filteredTransporters(status).length === 0 ? <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">No {status} transporters.</CardContent></Card> : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredTransporters(status).map((t) => (
                        <Card key={t.id} className="glass hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-portal-transportation/15 flex items-center justify-center shrink-0"><Truck className="w-5 h-5 text-portal-transportation" /></div>
                                <div><p className="font-semibold text-foreground">{t.full_name}</p><p className="text-xs text-muted-foreground">{t.city || "N/A"} • {t.phone || ""}</p></div>
                              </div>
                              <Badge className={statusColors[t.approval_status] || ""}>{t.approval_status}</Badge>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {new Date(t.created_at).toLocaleDateString()}</div>
                            <div className="mt-3 flex gap-2">
                              {t.approval_status === "pending" && (
                                <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleApproveTransporter(t)} disabled={actionLoading}><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteTransporter(t)} disabled={actionLoading}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="users">
            {loading ? <p className="text-sm text-muted-foreground p-4">Loading...</p> :
             pendingUsers.length === 0 ? <Card className="glass"><CardContent className="p-8 text-center text-muted-foreground">No pending users.</CardContent></Card> : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingUsers.map((p) => (
                  <Card key={p.id} className="glass hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-primary" /></div>
                          <div><p className="font-semibold text-foreground">{p.full_name || "Unnamed"}</p><p className="text-xs text-muted-foreground">{p.phone || "No phone"}</p></div>
                        </div>
                        <Badge className={statusColors.pending}>pending</Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {new Date(p.created_at).toLocaleDateString()}</div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleApproveUser(p)} disabled={actionLoading}><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(p)} disabled={actionLoading}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedMerchant} onOpenChange={() => setSelectedMerchant(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedMerchant?.business_name}</DialogTitle></DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedMerchant.business_type}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedMerchant.phone || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedMerchant.email || "N/A"}</span></div>
                <div><span className="text-muted-foreground">City:</span> <span className="font-medium">{selectedMerchant.city || "N/A"}</span></div>
                <div><span className="text-muted-foreground">District:</span> <span className="font-medium">{selectedMerchant.district || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Taluq:</span> <span className="font-medium">{selectedMerchant.taluq || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Pincode:</span> <span className="font-medium">{selectedMerchant.pincode || "N/A"}</span></div>
              </div>
              <div className="border-t border-border pt-3 space-y-2">
                <p className="font-medium text-foreground">Tax & Banking</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">GST:</span> <span className="font-medium">{selectedMerchant.gst_number || "N/A"}</span></div>
                  <div><span className="text-muted-foreground">PAN:</span> {selectedMerchant.pan_number ? <SensitiveData value={selectedMerchant.pan_number} /> : "N/A"}</div>
                  <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{selectedMerchant.bank_name || "N/A"}</span></div>
                  <div><span className="text-muted-foreground">Account:</span> {selectedMerchant.bank_account_number ? <SensitiveData value={selectedMerchant.bank_account_number} /> : "N/A"}</div>
                  <div><span className="text-muted-foreground">IFSC:</span> <span className="font-medium">{selectedMerchant.bank_ifsc || "N/A"}</span></div>
                </div>
              </div>
              <div className="border-t border-border pt-3 space-y-3">
                {selectedMerchant.approval_status === "pending" && (
                  <>
                    <Textarea placeholder="Rejection reason (optional)..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <DialogFooter className="gap-2">
                      <Button className="bg-primary hover:bg-primary/90" disabled={actionLoading} onClick={() => handleApproveMerchant(selectedMerchant)}><CheckCircle className="w-4 h-4 mr-1" /> Approve</Button>
                      <Button variant="destructive" disabled={actionLoading} onClick={() => handleRejectMerchant(selectedMerchant)}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                    </DialogFooter>
                  </>
                )}
                <Button variant="destructive" size="sm" className="w-full gap-1" onClick={() => handleDeleteMerchant(selectedMerchant)} disabled={actionLoading}>
                  <Trash2 className="w-4 h-4" /> Delete Merchant
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </EmployeeLayout>
  );
};

export default EmployeeApprovals;
