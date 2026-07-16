import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Briefcase, Compass, ExternalLink, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegionLanguageSwitcher } from "@/components/region-language-switcher";
import { getPublicJobsList } from "@/lib/public-jobs.functions";

export const Route = createFileRoute("/browse/")({
  head: () => ({ meta: [{ title: "Browse jobs — CareerPilot AI" }] }),
  component: BrowsePage,
});

function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Compass className="h-4 w-4" /></span>
          <span className="font-display text-lg">CareerPilot</span>
        </Link>
        <div className="flex items-center gap-2">
          <RegionLanguageSwitcher className="hidden lg:flex" />
          <Button asChild size="sm" variant="ghost"><Link to="/auth">Log in</Link></Button>
          <Button asChild size="sm" className="rounded-full bg-accent px-5 text-accent-foreground hover:bg-accent/90"><Link to="/auth">Sign up free</Link></Button>
        </div>
      </div>
    </header>
  );
}

function BrowsePage() {
  const fn = useServerFn(getPublicJobsList);
  const [filters, setFilters] = useState<{ q: string; work_mode?: "remote" | "hybrid" | "onsite" }>({ q: "" });
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["public-jobs", filters],
    queryFn: () => fn({ data: filters }),
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-10">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-accent" />
          <div>
            <h1 className="font-display text-2xl font-bold">Browse open roles</h1>
            <p className="text-sm text-muted-foreground">No account needed to look around. Sign up free when you're ready to apply.</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search role…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
            </div>
            <Select value={filters.work_mode ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, work_mode: v === "all" ? undefined : (v as any) }))}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Work mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? <p>Loading…</p> :
         !jobs?.length ? (
           <Card><CardContent className="py-12 text-center text-muted-foreground">No open roles match right now. Try clearing filters.</CardContent></Card>
         ) : (
          <div className="grid gap-3">
            {jobs.map((j: any) => (
              <Card key={j.id} className="transition-all hover:border-accent/40">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        <Link to="/browse/$jobId" params={{ jobId: j.id }} className="hover:text-accent hover:underline">
                          {j.title}
                        </Link>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {j.companies?.name ?? j.source ?? "—"} · <MapPin className="inline h-3 w-3" /> {j.location ?? "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {j.is_scraped && <Badge variant="outline" className="border-accent/40 text-accent">{j.source}</Badge>}
                      {j.work_mode && <Badge variant="secondary">{j.work_mode}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {j.salary_min ? `${j.salary_currency ?? ""} ${j.salary_min}${j.salary_max ? `–${j.salary_max}` : ""}` : "Salary not listed"}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/browse/$jobId" params={{ jobId: j.id }}>View role <ExternalLink className="ml-2 h-3 w-3" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
