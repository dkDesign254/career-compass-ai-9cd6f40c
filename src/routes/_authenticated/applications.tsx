import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackThread } from "@/components/feedback-thread";
import { listMyApplications } from "@/lib/jobs.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "My Applications — CareerPilot AI" }] }),
  component: ApplicationsPage,
});

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  applied: "outline",
  shortlisted: "secondary",
  interview: "default",
  rejected: "destructive",
  withdrawn: "outline",
};

function ApplicationsPage() {
  const fn = useServerFn(listMyApplications);
  const { data, isLoading } = useQuery({ queryKey: ["my-apps"], queryFn: () => fn() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [uid, setUid] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? ""));
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-coral" />
          <h1 className="font-display text-2xl font-bold">My Applications</h1>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !data?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No applications yet. Browse jobs to apply.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.map((a: any) => (
              <Card key={a.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div>
                    <CardTitle className="text-base">{a.jobs?.title ?? "Job"}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {a.jobs?.companies?.name} · {a.jobs?.location ?? "—"} ·{" "}
                      {a.jobs?.work_mode ?? "—"}
                    </p>
                  </div>
                  <Badge variant={statusColor[a.status] ?? "outline"}>{a.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Applied {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "—"}
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => setOpenId(openId === a.id ? null : a.id)}
                    >
                      {openId === a.id ? "Hide thread" : "View recruiter response"}
                    </Button>
                  </div>
                  {openId === a.id && uid && (
                    <FeedbackThread applicationId={a.id} currentUserId={uid} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
