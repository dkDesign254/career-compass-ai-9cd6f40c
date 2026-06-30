import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/jobs.functions";
import { becomeRecruiter } from "@/lib/recruiter.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — CareerPilot AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const rolesFn = useServerFn(getMyRoles);
  const recruiterFn = useServerFn(becomeRecruiter);
  const qc = useQueryClient();
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const isRecruiter = (roles ?? []).some((r) => ["recruiter", "company_admin", "admin"].includes(r));
  const enable = useMutation({
    mutationFn: () => recruiterFn(),
    onSuccess: () => { toast.success("Recruiter access granted"); qc.invalidateQueries({ queryKey: ["my-roles"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
      if (p?.full_name) setFullName(p.full_name);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl font-bold">Your profile</h1>
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Email</Label><Input value={email} disabled /></div>
            <div className="space-y-2"><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Career profile</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Edit your goals, skills, and experience.</p>
            <Button asChild variant="outline"><Link to="/onboarding">Edit profile</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Roles & access</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">{(roles ?? []).map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div>
            {!isRecruiter ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Hiring? Enable recruiter access to post jobs and review applicants.</p>
                <Button onClick={() => enable.mutate()} disabled={enable.isPending}>{enable.isPending ? "Enabling…" : "Enable recruiter"}</Button>
              </div>
            ) : (
              <Button asChild variant="outline"><Link to="/recruiter">Open recruiter portal</Link></Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}