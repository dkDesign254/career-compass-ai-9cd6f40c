import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAuditLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Admin" }] }),
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(listAuditLog);
  const { data, isLoading } = useQuery({ queryKey: ["audit"], queryFn: () => fn() });
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Audit log</h1>
        {isLoading ? <p>Loading…</p> : (
          <div className="grid gap-2">
            {(data ?? []).map((e: any) => (
              <Card key={e.id}>
                <CardContent className="flex items-start justify-between gap-3 p-3 text-sm">
                  <div>
                    <p><Badge>{e.action}</Badge> <span className="text-muted-foreground">{e.entity_type}</span> <span className="font-mono text-xs">{e.entity_id}</span></p>
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <pre className="mt-1 rounded bg-muted p-2 text-xs">{JSON.stringify(e.metadata, null, 2)}</pre>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{new Date(e.created_at).toLocaleString()}</p>
                    <p className="font-mono">{e.actor_id?.slice(0, 8)}…</p>
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
