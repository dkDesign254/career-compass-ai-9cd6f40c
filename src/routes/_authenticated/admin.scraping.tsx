import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Globe, PlayCircle, Plus, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { addJobSource, listJobSources, runJobScrape, toggleJobSource } from "@/lib/scrape.functions";

export const Route = createFileRoute("/_authenticated/admin/scraping")({
  head: () => ({ meta: [{ title: "Job scraping — Admin" }] }),
  component: ScrapingPage,
});

function ScrapingPage() {
  const listFn = useServerFn(listJobSources);
  const toggleFn = useServerFn(toggleJobSource);
  const runFn = useServerFn(runJobScrape);
  const addFn = useServerFn(addJobSource);
  const qc = useQueryClient();
  const { data: sources, isLoading } = useQuery({ queryKey: ["job-sources"], queryFn: () => listFn() });
  const [form, setForm] = useState({ name: "", base_url: "", region: "" });

  const run = useMutation({
    mutationFn: (sourceId?: string) => runFn({ data: sourceId ? { sourceId } : {} }),
    onSuccess: (r: any) => {
      const summary = (r.results ?? []).map((x: any) => `${x.source}: ${x.error ? "err" : x.inserted}`).join(" · ");
      toast.success(`Scrape done — ${summary || "no sources"}`);
      qc.invalidateQueries({ queryKey: ["job-sources"] });
      qc.invalidateQueries({ queryKey: ["open-jobs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Scrape failed"),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-sources"] }),
  });

  const add = useMutation({
    mutationFn: () => addFn({ data: { name: form.name, base_url: form.base_url, region: form.region || undefined } }),
    onSuccess: () => {
      toast.success("Source added");
      setForm({ name: "", base_url: "", region: "" });
      qc.invalidateQueries({ queryKey: ["job-sources"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-coral" />
            <h1 className="font-display text-2xl font-bold">Job scraping</h1>
          </div>
          <Button onClick={() => run.mutate(undefined)} disabled={run.isPending}>
            <PlayCircle className="mr-2 h-4 w-4" />{run.isPending ? "Scraping…" : "Run all now"}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Add source</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-1" />
            <Input placeholder="https://…/jobs" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} className="sm:col-span-2" />
            <div className="flex gap-2">
              <Input placeholder="KE" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              <Button onClick={() => add.mutate()} disabled={!form.name || !form.base_url || add.isPending}><Plus className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? <p>Loading…</p> : (
          <div className="grid gap-3">
            {(sources ?? []).map((s: any) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-[220px]">
                    <p className="font-medium">{s.name} {s.region && <Badge variant="outline" className="ml-2">{s.region}</Badge>}</p>
                    <a href={s.base_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">{s.base_url}</a>
                    {s.last_status && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last: {s.last_scraped_at ? new Date(s.last_scraped_at).toLocaleString() : "—"} · <span className={s.last_error ? "text-destructive" : "text-emerald-500"}>{s.last_status}</span>
                      </p>
                    )}
                    {s.last_error && <p className="text-xs text-destructive/80 max-w-md truncate">{s.last_error}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={s.enabled} onCheckedChange={(v) => toggle.mutate({ id: s.id, enabled: v })} />
                    <Button size="sm" variant="outline" onClick={() => run.mutate(s.id)} disabled={run.isPending}>
                      <RefreshCw className="mr-2 h-3 w-3" /> Scrape
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}