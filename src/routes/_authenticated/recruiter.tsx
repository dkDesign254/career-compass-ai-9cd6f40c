import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listMyJobs } from "@/lib/recruiter.functions";
import { getMyRoles } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/recruiter")({
  head: () => ({ meta: [{ title: "Recruiter — CareerPilot AI" }] }),
  component: RecruiterIndex,
});

function RecruiterIndex() {
  const rolesFn = useServerFn(getMyRoles);
  const jobsFn = useServerFn(listMyJobs);
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const isRecruiter = (roles ?? []).some((r) => ["recruiter", "company_admin", "admin"].includes(r));

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ["my-jobs"],
    queryFn: () => jobsFn(),
    enabled: !!isRecruiter,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-coral" />
            <h1 className="font-display text-2xl font-bold">Recruiter portal</h1>
          </div>
          {isRecruiter && (
            <Button asChild className="bg-brand hover:bg-brand/90">
              <Link to="/recruiter/new-job"><Plus className="mr-2 h-4 w-4" /> Post a job</Link>
            </Button>
          )}
        </div>

        {!roles ? <p className="text-sm text-muted-foreground">Loading…</p> :
         !isRecruiter ? (
          <Card>
            <CardContent className="space-y-3 py-10 text-center">
              <p className="text-muted-foreground">Recruiter access required. Enable it from your <Link className="underline" to="/profile">profile</Link>.</p>
            </CardContent>
          </Card>
         ) : isLoading ? <p className="text-sm text-muted-foreground">Loading jobs…</p>
          : error ? <p className="text-sm text-destructive">{(error as Error).message}</p>
          : !jobs?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No jobs yet. Post your first role.</CardContent></Card>
          ) : (
          <div className="grid gap-3">
            {jobs.map((j: any) => (
              <Card key={j.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{j.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{j.companies?.name ?? "—"} · {j.location ?? "—"} · {j.work_mode ?? "—"}</p>
                    </div>
                    <Badge variant={j.status === "open" ? "default" : "outline"}>{j.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {j.application_count}{j.application_cap ? ` / ${j.application_cap}` : ""} applicants
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/recruiter/applicants/$jobId" params={{ jobId: j.id }}><Users className="mr-2 h-4 w-4" /> Pipeline</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}