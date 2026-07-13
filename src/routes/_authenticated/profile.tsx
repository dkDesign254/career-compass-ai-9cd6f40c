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
import { previewProfileImport, applyProfileImport } from "@/lib/profile-import.functions";
import { Badge } from "@/components/ui/badge";
import { Download, Sparkles, Github, Globe } from "lucide-react";

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
  const previewFn = useServerFn(previewProfileImport);
  const applyFn = useServerFn(applyProfileImport);
  const qc = useQueryClient();
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const isRecruiter = (roles ?? []).some((r) =>
    ["recruiter", "company_admin", "admin"].includes(r),
  );
  const [importUrl, setImportUrl] = useState("");
  const [preview, setPreview] = useState<{ source: string; parsed: any } | null>(null);
  const enable = useMutation({
    mutationFn: () => recruiterFn(),
    onSuccess: () => {
      toast.success("Recruiter access granted");
      qc.invalidateQueries({ queryKey: ["my-roles"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const previewMut = useMutation({
    mutationFn: (url: string) => previewFn({ data: { url } }),
    onSuccess: (r: any) => {
      setPreview(r);
      toast.success("Preview ready — review, then apply.");
    },
    onError: (e: any) => toast.error(e.message ?? "Import failed"),
  });
  const applyMut = useMutation({
    mutationFn: (mode: "merge" | "replace") => applyFn({ data: { parsed: preview!.parsed, mode } }),
    onSuccess: () => {
      toast.success("Profile updated from import");
      setPreview(null);
      setImportUrl("");
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (p?.full_name) setFullName(p.full_name);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-2xl font-bold">Your profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Career profile</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Edit your goals, skills, and experience.
            </p>
            <Button asChild variant="outline">
              <Link to="/onboarding">Edit profile</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" /> Import from a URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste a public profile URL — GitHub (public API), portfolio, Fuzu, Wellfound, personal
              site. LinkedIn is blocked by their bot policy; use your GitHub or portfolio instead.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Github className="h-3 w-3" /> github.com/username
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" /> yourportfolio.com
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="https://github.com/your-username"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              <Button
                onClick={() => previewMut.mutate(importUrl)}
                disabled={!importUrl || previewMut.isPending}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {previewMut.isPending ? "Reading…" : "Preview"}
              </Button>
            </div>
            {preview && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Preview · {preview.source}
                  </span>
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setPreview(null)}
                  >
                    Discard
                  </button>
                </div>
                {preview.parsed.target_role && (
                  <p>
                    <strong>Role:</strong> {preview.parsed.target_role}
                  </p>
                )}
                {preview.parsed.target_locations?.length ? (
                  <p>
                    <strong>Locations:</strong> {preview.parsed.target_locations.join(", ")}
                  </p>
                ) : null}
                {preview.parsed.skills?.length ? (
                  <div>
                    <strong>Skills:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {preview.parsed.skills.slice(0, 20).map((s: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {preview.parsed.work_history?.length ? (
                  <div>
                    <strong>Work history:</strong>
                    <ul className="ml-4 list-disc text-xs text-muted-foreground">
                      {preview.parsed.work_history.slice(0, 5).map((w: any, i: number) => (
                        <li key={i}>{[w.title, w.company].filter(Boolean).join(" · ")}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {preview.parsed.projects?.length ? (
                  <div>
                    <strong>Projects ({preview.parsed.projects.length}):</strong>
                    <ul className="ml-4 list-disc text-xs text-muted-foreground">
                      {preview.parsed.projects.slice(0, 5).map((p: any, i: number) => (
                        <li key={i}>
                          {p.name}
                          {p.description ? ` — ${p.description.slice(0, 80)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => applyMut.mutate("merge")}
                    disabled={applyMut.isPending}
                  >
                    {applyMut.isPending ? "Saving…" : "Merge into profile"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyMut.mutate("replace")}
                    disabled={applyMut.isPending}
                  >
                    Replace fields
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Roles & access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(roles ?? []).map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
            {!isRecruiter ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Hiring? Enable recruiter access to post jobs and review applicants.
                </p>
                <Button onClick={() => enable.mutate()} disabled={enable.isPending}>
                  {enable.isPending ? "Enabling…" : "Enable recruiter"}
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline">
                <Link to="/recruiter">Open recruiter portal</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
