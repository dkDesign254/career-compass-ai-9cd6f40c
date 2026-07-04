import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Briefcase, MapPin, Sparkles, Bell, FileText, Compass, ArrowRight, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardFeed } from "@/lib/feed.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Your feed — CareerPilot" }] }),
  component: Dashboard,
});

function timeAgo(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); } catch { return ""; }
}

function Dashboard() {
  const fn = useServerFn(getDashboardFeed);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-feed"], queryFn: () => fn(), staleTime: 30_000 });
  const jobs = data?.jobs ?? [];
  const apps = data?.applications ?? [];
  const notes = data?.notifications ?? [];
  const profile = data?.profile;
  const targetRole = profile?.target_role;

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main feed */}
        <div className="space-y-6">
          <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm text-muted-foreground">Your feed</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {targetRole ? `New for ${targetRole}` : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fresh roles, updates on your applications, and things worth your attention.
            </p>
          </motion.header>

          {!profile && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Compass className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Finish setting up your profile</p>
                    <p className="text-sm text-muted-foreground">Takes ~3 minutes. Unlocks matching and scoring.</p>
                  </div>
                </div>
                <Button asChild size="sm"><Link to="/onboarding">Continue <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </CardContent>
            </Card>
          )}

          {isLoading && <p className="text-sm text-muted-foreground">Loading feed…</p>}

          {jobs.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Fresh roles</h2>
                <Link to="/jobs" className="text-sm text-primary hover:underline">Browse all →</Link>
              </div>
              <div className="space-y-3">
                {jobs.slice(0, 8).map((j: any, i: number) => (
                  <motion.div key={j.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Link to="/jobs/$jobId" params={{ jobId: j.id }}>
                      <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
                        <CardContent className="flex items-start gap-3 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                            {j.companies?.logo_url ? (
                              <img src={j.companies.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                            ) : (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{j.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {j.companies?.name ?? j.source ?? "Company"} · {timeAgo(j.created_at)}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                              {j.work_mode && <Badge variant="outline" className="capitalize">{j.work_mode}</Badge>}
                              {j.employment_type && <Badge variant="outline" className="capitalize">{String(j.employment_type).replace(/_/g, " ")}</Badge>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {jobs.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No open roles yet. Job sources refresh every 12 hours.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> First time here?</div>
              <p className="text-sm text-muted-foreground">Take a 60-second tour of how CareerPilot works.</p>
              <Button asChild size="sm" variant="outline" className="w-full"><Link to="/tour">Start the tour</Link></Button>
            </CardContent>
          </Card>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Briefcase className="h-4 w-4" /> Your applications</div>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. Apply to a role and it lands here.</p>
            ) : (
              <ul className="space-y-2">
                {apps.map((a: any) => (
                  <li key={a.id} className="rounded-md border p-3 text-sm">
                    <p className="truncate font-medium">{a.jobs?.title ?? "Role"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.jobs?.companies?.name ?? ""} · <span className="capitalize">{a.status}</span> · {timeAgo(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/applications" className="mt-2 inline-block text-xs text-primary hover:underline">Manage applications →</Link>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Bell className="h-4 w-4" /> Notifications</div>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're all caught up.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n: any) => (
                  <li key={n.id} className={`rounded-md border p-3 text-sm ${n.read_at ? "opacity-70" : ""}`}>
                    <p className="font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4" /> Quick actions</div>
            <ul className="space-y-1 text-sm">
              <li><Link to="/resume" className="text-primary hover:underline">Analyze my resume</Link></li>
              <li><Link to="/skill-gap" className="text-primary hover:underline">Run a skill-gap analysis</Link></li>
              <li><Link to="/recommendations" className="text-primary hover:underline">Get career recommendations</Link></li>
              <li><Link to="/employability" className="text-primary hover:underline">Check employability score</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}