import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ClipboardList, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
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

function AnalyticsSummary({ apps }: { apps: any[] }) {
  const total = apps.length;
  const responded = apps.filter((a) => ["shortlisted", "interview", "rejected"].includes(a.status)).length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
  const active = apps.filter((a) => ["applied", "shortlisted", "interview"].includes(a.status)).length;

  const respondedWithDates = apps.filter((a) => a.applied_at && ["shortlisted", "interview", "rejected"].includes(a.status));
  const avgDays = respondedWithDates.length > 0
    ? Math.round(
        respondedWithDates.reduce((sum, a) => sum + (Date.now() - new Date(a.applied_at).getTime()) / 86400000, 0) /
        respondedWithDates.length,
      )
    : null;

  if (total === 0) return null;

  const stats = [
    { label: "Total applications", value: total, icon: ClipboardList },
    { label: "Active", value: active, icon: TrendingUp },
    { label: "Response rate", value: `${responseRate}%`, icon: CheckCircle2 },
    { label: "Avg. days to response", value: avgDays !== null ? avgDays : "—", icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <s.icon className="h-4 w-4 text-accent" />
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ApplicationsPage() {
  const fn = useServerFn(listMyApplications);
  const { data, isLoading } = useQuery({ queryKey: ["my-apps"], queryFn: () => fn() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [uid, setUid] = useState<string>("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? "")); }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-coral" />
          <h1 className="font-display text-2xl font-bold">My Applications</h1>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
         !data?.length ? (
           <Card><CardContent className="py-12 text-center text-muted-foreground">No applications yet. Browse jobs to apply.</CardContent></Card>
         ) : (
          <>
            <AnalyticsSummary apps={data} />
            <div className="space-y-3">
              {data.map((a: any) => (
                <Card key={a.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                    <div>
                      <CardTitle className="text-base">
                        {a.job_id ? (
                          <Link to="/jobs/$jobId" params={{ jobId: a.job_id }} className="hover:text-accent hover:underline">
                            {a.jobs?.title ?? "Job"}
                          </Link>
                        ) : (a.jobs?.title ?? "Job")}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{a.jobs?.companies?.name} · {a.jobs?.location ?? "—"} · {a.jobs?.work_mode ?? "—"}</p>
                    </div>
                    <Badge variant={statusColor[a.status] ?? "outline"}>{a.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Applied {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : "—"}</span>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                        {openId === a.id ? "Hide thread" : "View recruiter response"}
                      </Button>
                    </div>
                    {openId === a.id && uid && <FeedbackThread applicationId={a.id} currentUserId={uid} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}