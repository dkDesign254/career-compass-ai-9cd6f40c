import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, Compass, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicJobDetail } from "@/lib/public-jobs.functions";

export const Route = createFileRoute("/browse/$jobId")({
  head: () => ({ meta: [{ title: "Role — CareerPilot AI" }] }),
  component: PublicJobDetail,
});

function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Compass className="h-4 w-4" /></span>
          <span className="font-display text-lg">CareerPilot</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost"><Link to="/auth">Log in</Link></Button>
          <Button asChild size="sm" className="rounded-full bg-accent px-5 text-accent-foreground hover:bg-accent/90"><Link to="/auth">Sign up free</Link></Button>
        </div>
      </div>
    </header>
  );
}

function PublicJobDetail() {
  const { jobId } = Route.useParams();
  const fn = useServerFn(getPublicJobDetail);
  const { data: job, isLoading, error } = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: () => fn({ data: { id: jobId } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/browse"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Link></Button>

        {isLoading ? <p>Loading…</p> : error || !job ? (
          <p className="text-muted-foreground">This role isn't available anymore. <Link to="/browse" className="text-accent underline">Browse other open roles →</Link></p>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold">{job.title}</h1>
              <p className="mt-2 flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" /> {job.companies?.name ?? job.source ?? "—"}
                <span className="text-border">·</span>
                <MapPin className="h-4 w-4" /> {job.location ?? "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.work_mode && <Badge variant="secondary">{job.work_mode}</Badge>}
                {job.employment_type && <Badge variant="outline">{job.employment_type.replace("_", "-")}</Badge>}
                {job.is_scraped && <Badge variant="outline" className="border-accent/40 text-accent">via {job.source}</Badge>}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-6">
              <p className="text-sm font-medium text-primary">Ready to apply?</p>
              <p className="mt-1 text-sm text-muted-foreground">Sign up free to submit your application, track its status, and get an AI-generated fit score against your profile.</p>
              <Button asChild className="mt-4 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth"><Send className="mr-2 h-4 w-4" /> Sign up to apply</Link>
              </Button>
            </div>

            {job.description && (
              <div>
                <h2 className="font-display text-lg font-semibold">About this role</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{job.description}</p>
              </div>
            )}
            {job.requirements && (
              <div>
                <h2 className="font-display text-lg font-semibold">What they're looking for</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{job.requirements}</p>
              </div>
            )}
            {Array.isArray(job.skills) && job.skills.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold">Skills</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
            )}
            {job.salary_min && (
              <p className="text-sm text-muted-foreground">
                Salary: {job.salary_currency} {job.salary_min}{job.salary_max ? `–${job.salary_max}` : ""}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
