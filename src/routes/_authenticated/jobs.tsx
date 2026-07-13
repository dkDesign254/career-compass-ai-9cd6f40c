import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Briefcase, ExternalLink, MapPin, Search, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { applyToJob, listMyResumes, listOpenJobs } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — CareerPilot AI" }] }),
  component: JobsPage,
});

function JobsPage() {
  const fn = useServerFn(listOpenJobs);
  const resumesFn = useServerFn(listMyResumes);
  const applyFn = useServerFn(applyToJob);
  const qc = useQueryClient();
  const [filters, setFilters] = useState<{ q: string; work_mode?: "remote" | "hybrid" | "onsite" }>(
    { q: "" },
  );
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["open-jobs", filters],
    queryFn: () => fn({ data: filters }),
  });
  const { data: resumes } = useQuery({ queryKey: ["my-resumes"], queryFn: () => resumesFn() });
  const [open, setOpen] = useState<null | { id: string; title: string }>(null);
  const [notes, setNotes] = useState("");
  const [resumeId, setResumeId] = useState<string | undefined>(undefined);

  const m = useMutation({
    mutationFn: () => applyFn({ data: { jobId: open!.id, resumeId, notes: notes || undefined } }),
    onSuccess: () => {
      toast.success("Application sent");
      setOpen(null);
      setNotes("");
      setResumeId(undefined);
      qc.invalidateQueries({ queryKey: ["open-jobs"] });
      qc.invalidateQueries({ queryKey: ["my-apps"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not apply"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-coral" />
          <h1 className="font-display text-2xl font-bold">Open jobs</h1>
        </div>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search role…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <Select
              value={filters.work_mode ?? "all"}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, work_mode: v === "all" ? undefined : (v as any) }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Work mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link to="/applications">My applications</Link>
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <p>Loading…</p>
        ) : !jobs?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No open roles match your filters yet. Try clearing filters or ask an admin to run the
              scraper.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {jobs.map((j: any) => (
              <Card key={j.id} className="transition-all hover:border-coral/40">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          to="/jobs/$jobId"
                          params={{ jobId: j.id }}
                          className="hover:text-primary hover:underline"
                        >
                          {j.title}
                        </Link>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {j.companies?.name ?? j.source ?? "—"} ·{" "}
                        <MapPin className="inline h-3 w-3" /> {j.location ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {j.is_scraped && (
                        <Badge variant="outline" className="border-coral/40 text-coral">
                          {j.source}
                        </Badge>
                      )}
                      {j.work_mode && <Badge variant="secondary">{j.work_mode}</Badge>}
                      {j.employment_type && (
                        <Badge variant="outline">{j.employment_type.replace("_", "-")}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {j.salary_min
                      ? `${j.salary_currency ?? ""} ${j.salary_min}${j.salary_max ? `–${j.salary_max}` : ""}`
                      : "Salary not listed"}
                  </span>
                  {j.is_scraped && j.source_url ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={j.source_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-3 w-3" /> View on {j.source}
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setOpen({ id: j.id, title: j.title })}>
                      <Send className="mr-2 h-3 w-3" /> Apply
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply: {open?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm font-medium">Attach a resume (optional)</label>
              <Select
                value={resumeId ?? "none"}
                onValueChange={(v) => setResumeId(v === "none" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No resume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No resume</SelectItem>
                  {(resumes ?? []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.file_name ?? r.target_role ?? "Resume"}{" "}
                      {r.ats_score ? `(ATS ${r.ats_score})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-sm font-medium">Cover note</label>
              <Textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why are you a strong fit?"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(null)}>
                Cancel
              </Button>
              <Button onClick={() => m.mutate()} disabled={m.isPending}>
                {m.isPending ? "Sending…" : "Send application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
