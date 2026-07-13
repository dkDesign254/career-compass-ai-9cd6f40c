import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { deleteJob, listAllJobs, updateJob } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Admin" }] }),
  component: AdminJobsPage,
});

function AdminJobsPage() {
  const [q, setQ] = useState("");
  const listFn = useServerFn(listAllJobs);
  const updFn = useServerFn(updateJob);
  const delFn = useServerFn(deleteJob);
  const qc = useQueryClient();
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["admin-jobs", q],
    queryFn: () => listFn({ data: { q } }),
  });
  const [editing, setEditing] = useState<
    Record<string, { title: string; status: string; application_cap: string }>
  >({});

  const upd = useMutation({
    mutationFn: (v: any) => updFn({ data: v }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Jobs</h1>
        <Input
          placeholder="Search title"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="grid gap-3">
            {(jobs ?? []).map((j: any) => {
              const e = editing[j.id] ?? {
                title: j.title,
                status: j.status,
                application_cap: String(j.application_cap ?? ""),
              };
              const setE = (patch: any) =>
                setEditing((prev) => ({ ...prev, [j.id]: { ...e, ...patch } }));
              return (
                <Card key={j.id}>
                  <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={e.title}
                          onChange={(ev) => setE({ title: ev.target.value })}
                          className="max-w-md"
                        />
                        <Badge variant="outline">{j.source}</Badge>
                        {j.is_scraped && <Badge variant="secondary">scraped</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {j.companies?.name ?? "—"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <label>Status:</label>
                        <select
                          className="rounded border bg-background px-2 py-1 text-xs"
                          value={e.status}
                          onChange={(ev) => setE({ status: ev.target.value })}
                        >
                          <option value="open">open</option>
                          <option value="closed">closed</option>
                          <option value="draft">draft</option>
                        </select>
                        <label className="ml-2">Cap:</label>
                        <Input
                          value={e.application_cap}
                          onChange={(ev) => setE({ application_cap: ev.target.value })}
                          className="w-24"
                        />
                        <span className="text-xs text-muted-foreground">
                          apps: {j.application_count}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          upd.mutate({
                            id: j.id,
                            title: e.title,
                            status: e.status as any,
                            application_cap: e.application_cap ? Number(e.application_cap) : null,
                          })
                        }
                      >
                        <Save className="mr-1 h-3 w-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Delete this job?")) del.mutate(j.id);
                        }}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
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
