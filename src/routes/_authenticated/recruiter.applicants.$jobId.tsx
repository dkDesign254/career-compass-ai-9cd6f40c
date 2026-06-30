import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Check, MessageSquare, Star, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { decideApplication, listApplicants } from "@/lib/recruiter.functions";

export const Route = createFileRoute("/_authenticated/recruiter/applicants/$jobId")({
  head: () => ({ meta: [{ title: "Applicants — CareerPilot AI" }] }),
  component: ApplicantsPage,
});

const PRESETS = {
  proceed: "We were impressed with your application and would like to invite you to the next round. Could you share your availability over the coming week?",
  shortlist: "Thanks for applying! You've been shortlisted — we're reviewing remaining candidates and will follow up shortly.",
  regret: "Thank you for the time you put into your application. After careful review we've decided to move forward with other candidates whose experience more closely matches the role. We wish you the best.",
};

function ApplicantsPage() {
  const { jobId } = Route.useParams();
  const fn = useServerFn(listApplicants);
  const decideFn = useServerFn(decideApplication);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["applicants", jobId],
    queryFn: () => fn({ data: { jobId } }),
  });
  const [open, setOpen] = useState<null | { id: string; decision: "proceed" | "regret" | "shortlist"; message: string }>(null);
  const m = useMutation({
    mutationFn: () => decideFn({ data: { applicationId: open!.id, decision: open!.decision, message: open!.message } }),
    onSuccess: () => {
      toast.success("Sent to applicant");
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["applicants", jobId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/recruiter"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
        {isLoading ? <p>Loading…</p> :
         error ? <p className="text-destructive">{(error as Error).message}</p> :
         !data ? null : (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold">{data.job.title}</h1>
              <p className="text-sm text-muted-foreground">
                {data.applicants.length} applicants
                {data.job.application_cap ? ` · cap ${data.job.application_count}/${data.job.application_cap}` : ""}
              </p>
            </div>
            {!data.applicants.length ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No applicants yet.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {data.applicants.map((a: any) => (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{a.applicant?.full_name ?? "Applicant"}</CardTitle>
                          <p className="text-xs text-muted-foreground">Applied {a.applied_at ? new Date(a.applied_at).toLocaleString() : "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.resumes?.ats_score != null && <Badge variant="secondary">ATS {a.resumes.ats_score}</Badge>}
                          <Badge variant="outline">{a.status}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{a.notes ?? "No cover note."}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setOpen({ id: a.id, decision: "shortlist", message: PRESETS.shortlist })}>
                          <Star className="mr-1 h-3 w-3" /> Shortlist
                        </Button>
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-600/90 text-white" onClick={() => setOpen({ id: a.id, decision: "proceed", message: PRESETS.proceed })}>
                          <Check className="mr-1 h-3 w-3" /> Proceed
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setOpen({ id: a.id, decision: "regret", message: PRESETS.regret })}>
                          <X className="mr-1 h-3 w-3" /> Regret
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Send {open?.decision} message</DialogTitle>
            </DialogHeader>
            <Textarea
              rows={8}
              value={open?.message ?? ""}
              onChange={(e) => setOpen((p) => (p ? { ...p, message: e.target.value } : p))}
              placeholder="Personalize the note…"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
              <Button onClick={() => m.mutate()} disabled={!open?.message?.trim() || m.isPending}>
                {m.isPending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}