import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Building2, ExternalLink, MapPin, Send, Sparkles, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getJobDetail } from "@/lib/job-detail.functions";
import { applyToJob, listMyResumes } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Role — CareerPilot" }] }),
  component: JobDetail,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <p className="mt-2 font-medium">Couldn't load this role</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => { reset(); router.invalidate(); }}>
            <RefreshCw className="mr-1 h-3 w-3" /> Try again
          </Button>
        </div>
      </AppShell>
    );
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-xl p-6 text-center">
        <p>Role not found.</p>
        <Button asChild variant="link"><Link to="/jobs">Back to jobs</Link></Button>
      </div>
    </AppShell>
  ),
});

function ScoreRing({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? "text-emerald-600" : value >= 50 ? "text-amber-600" : "text-muted-foreground";
  return (
    <div className="flex flex-col items-center rounded-lg border p-3">
      <div className={`text-2xl font-semibold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function JobDetail() {
  const { jobId } = Route.useParams();
  const detailFn = useServerFn(getJobDetail);
  const resumesFn = useServerFn(listMyResumes);
  const applyFn = useServerFn(applyToJob);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["job", jobId], queryFn: () => detailFn({ data: { id: jobId } }) });
  const { data: resumes } = useQuery({ queryKey: ["my-resumes"], queryFn: () => resumesFn() });
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [resumeId, setResumeId] = useState<string | undefined>();

  const apply = useMutation({
    mutationFn: () => applyFn({ data: { jobId, resumeId, notes: notes || undefined } }),
    onSuccess: () => {
      toast.success("Application sent");
      setOpen(false); setNotes("");
      qc.invalidateQueries({ queryKey: ["job", jobId] });
      qc.invalidateQueries({ queryKey: ["dashboard-feed"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not apply"),
  });

  if (isLoading) return <AppShell><p className="p-6 text-sm text-muted-foreground">Loading…</p></AppShell>;
  if (!data) return null;
  const { job, score, application, hasProfile } = data;
  const applied = !!application;
  const isScraped = job.is_scraped;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-3 w-3" /> All jobs
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                {job.companies?.logo_url ? (
                  <img src={job.companies.logo_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : <Building2 className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-2xl font-semibold">{job.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {job.companies?.name ?? job.source ?? "Company"}
                  {job.location && <> · <MapPin className="inline h-3 w-3" /> {job.location}</>}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.work_mode && <Badge variant="outline" className="capitalize">{job.work_mode}</Badge>}
                  {job.employment_type && <Badge variant="outline" className="capitalize">{String(job.employment_type).replace(/_/g, " ")}</Badge>}
                  {job.salary_min && job.salary_max && (
                    <Badge variant="outline">{job.salary_currency ?? ""} {job.salary_min}–{job.salary_max}</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {applied ? (
                  <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Applied</Badge>
                ) : isScraped && job.source_url ? (
                  <Button asChild>
                    <a href={job.source_url} target="_blank" rel="noreferrer">
                      Apply on {job.source ?? "site"} <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <Button onClick={() => setOpen(true)}><Send className="mr-1 h-3 w-3" /> Apply</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> Your fit</div>
            {!hasProfile && (
              <p className="text-sm text-muted-foreground">
                Scores use defaults. <Link to="/onboarding" className="text-primary hover:underline">Complete your profile</Link> for a real match.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <ScoreRing label="Overall" value={score.overall} />
              <ScoreRing label="Compatibility" value={score.compatibility} />
              <ScoreRing label="Best-fit" value={score.bestFit} />
              <ScoreRing label="Alert match" value={score.alertMatch} />
              <ScoreRing label="Preferences" value={score.preference} />
            </div>
            {score.reasons.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {score.reasons.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">About the role</h2>
            {job.description ? (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90">{job.description}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No description provided.</p>
            )}
            {job.source_url && (
              <p className="mt-4 text-xs text-muted-foreground">
                Source: <a className="text-primary hover:underline" href={job.source_url} target="_blank" rel="noreferrer">{job.source ?? "original posting"}</a>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply to {job.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">Resume (optional)</label>
              <Select value={resumeId} onValueChange={setResumeId}>
                <SelectTrigger><SelectValue placeholder="Pick a resume" /></SelectTrigger>
                <SelectContent>
                  {(resumes ?? []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.filename ?? r.title ?? r.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Note to the recruiter</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending ? "Sending…" : "Send application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}