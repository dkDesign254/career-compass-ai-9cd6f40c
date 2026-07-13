import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Globe, PlayCircle, Plus, RefreshCw, Trash2, Save, Clock, Eye } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  addJobSource,
  deleteJobSource,
  listJobSources,
  runJobScrape,
  toggleJobSource,
  updateJobSource,
  testScrapeUrl,
} from "@/lib/scrape.functions";

export const Route = createFileRoute("/_authenticated/admin/scraping")({
  head: () => ({ meta: [{ title: "Job scraping — Admin" }] }),
  component: ScrapingPage,
});

function ScrapingPage() {
  const listFn = useServerFn(listJobSources);
  const toggleFn = useServerFn(toggleJobSource);
  const runFn = useServerFn(runJobScrape);
  const addFn = useServerFn(addJobSource);
  const updFn = useServerFn(updateJobSource);
  const delFn = useServerFn(deleteJobSource);
  const testFn = useServerFn(testScrapeUrl);
  const qc = useQueryClient();
  const { data: sources, isLoading } = useQuery({
    queryKey: ["job-sources"],
    queryFn: () => listFn(),
  });
  const [form, setForm] = useState({ name: "", base_url: "", region: "" });
  const [preview, setPreview] = useState<{
    url: string;
    count: number;
    jobs: any[];
    error?: string;
  } | null>(null);
  const [edits, setEdits] = useState<
    Record<string, { name: string; base_url: string; region: string }>
  >({});

  const run = useMutation({
    mutationFn: (sourceId?: string) => runFn({ data: sourceId ? { sourceId } : {} }),
    onSuccess: (r: any) => {
      const summary = (r.results ?? [])
        .map((x: any) => `${x.source}: ${x.error ? "err" : x.inserted}`)
        .join(" · ");
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
    mutationFn: () =>
      addFn({
        data: { name: form.name, base_url: form.base_url, region: form.region || undefined },
      }),
    onSuccess: () => {
      toast.success("Source added");
      setForm({ name: "", base_url: "", region: "" });
      qc.invalidateQueries({ queryKey: ["job-sources"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const upd = useMutation({
    mutationFn: (v: any) => updFn({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["job-sources"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["job-sources"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: (url: string) => testFn({ data: { url } }),
    onSuccess: (r: any, url: string) => {
      if (r.ok) {
        setPreview({ url, count: r.count, jobs: r.preview });
        toast.success(`Found ${r.count} job${r.count === 1 ? "" : "s"}`);
      } else {
        setPreview({ url, count: 0, jobs: [], error: r.error });
        toast.error("Preview failed — see details below");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Preview failed"),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-coral" />
            <h1 className="font-display text-2xl font-bold">Job scraping</h1>
          </div>
          <Button onClick={() => run.mutate(undefined)} disabled={run.isPending}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {run.isPending ? "Scraping…" : "Run all now"}
          </Button>
        </div>

        <Card className="border-brand/30 bg-brand/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <Clock className="h-4 w-4 text-brand" />
            <span>
              Automated schedule: <strong>every 12 hours</strong> (00:00 & 12:00 UTC) via database
              cron.
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add source</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="sm:col-span-1"
            />
            <Input
              placeholder="https://…/jobs"
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              className="sm:col-span-2"
            />
            <div className="flex gap-2">
              <Input
                placeholder="KE"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
              <Button
                onClick={() => add.mutate()}
                disabled={!form.name || !form.base_url || add.isPending}
                title="Add source"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="sm:col-span-4 flex flex-wrap items-center gap-2 border-t pt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => test.mutate(form.base_url)}
                disabled={!form.base_url || test.isPending}
              >
                <Eye className="mr-1 h-3 w-3" />
                {test.isPending ? "Testing…" : "Preview URL (dry-run)"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Runs Firecrawl on the URL and shows sample jobs without saving.
              </span>
            </div>
            {preview && (
              <div className="sm:col-span-4 rounded-md border bg-muted/30 p-3 text-xs">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-medium">Preview · {preview.url}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setPreview(null)}
                  >
                    Clear
                  </button>
                </div>
                {preview.error ? (
                  <p className="text-destructive">{preview.error}</p>
                ) : preview.jobs.length === 0 ? (
                  <p className="text-muted-foreground">
                    No jobs extracted. Try a URL that lists open roles directly.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {preview.jobs.map((j, i) => (
                      <li key={i} className="flex flex-wrap gap-2">
                        <span className="font-medium">{j.title}</span>
                        {j.company && <span className="text-muted-foreground">· {j.company}</span>}
                        {j.location && (
                          <span className="text-muted-foreground">· {j.location}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="grid gap-3">
            {(sources ?? []).map((s: any) => {
              const e = edits[s.id] ?? {
                name: s.name,
                base_url: s.base_url,
                region: s.region ?? "",
              };
              const setE = (patch: any) =>
                setEdits((prev) => ({ ...prev, [s.id]: { ...e, ...patch } }));
              const dirty =
                e.name !== s.name ||
                e.base_url !== s.base_url ||
                (e.region || "") !== (s.region ?? "");
              return (
                <Card key={s.id}>
                  <CardContent className="grid gap-3 p-4">
                    <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto_auto]">
                      <Input value={e.name} onChange={(ev) => setE({ name: ev.target.value })} />
                      <Input
                        value={e.base_url}
                        onChange={(ev) => setE({ base_url: ev.target.value })}
                      />
                      <Input
                        value={e.region}
                        placeholder="region"
                        onChange={(ev) => setE({ region: ev.target.value })}
                        className="w-24"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.enabled}
                          onCheckedChange={(v) => toggle.mutate({ id: s.id, enabled: v })}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dirty && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              upd.mutate({
                                id: s.id,
                                name: e.name,
                                base_url: e.base_url,
                                region: e.region || null,
                              })
                            }
                          >
                            <Save className="mr-1 h-3 w-3" />
                            Save
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => run.mutate(s.id)}
                          disabled={run.isPending}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Scrape
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Delete ${s.name}?`)) del.mutate(s.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {s.last_status && (
                      <p className="text-xs text-muted-foreground">
                        Last:{" "}
                        {s.last_scraped_at ? new Date(s.last_scraped_at).toLocaleString() : "—"} ·{" "}
                        <span className={s.last_error ? "text-destructive" : "text-emerald-500"}>
                          {s.last_status}
                        </span>
                        {s.region && (
                          <Badge variant="outline" className="ml-2">
                            {s.region}
                          </Badge>
                        )}
                      </p>
                    )}
                    {s.last_error && <p className="text-xs text-destructive/80">{s.last_error}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
