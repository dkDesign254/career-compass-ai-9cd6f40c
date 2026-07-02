import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { grantSubscription, listSubscriptions, revokeSubscription } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({ meta: [{ title: "Subscriptions — Admin" }] }),
  component: SubsPage,
});

function SubsPage() {
  const listFn = useServerFn(listSubscriptions);
  const grantFn = useServerFn(grantSubscription);
  const revokeFn = useServerFn(revokeSubscription);
  const qc = useQueryClient();
  const { data: subs, isLoading } = useQuery({ queryKey: ["subs"], queryFn: () => listFn() });
  const [form, setForm] = useState({ user_id: "", tier: "pro" as "free" | "pro" | "team", months: 1 });

  const grant = useMutation({
    mutationFn: () => grantFn({ data: form }),
    onSuccess: () => { toast.success("Granted"); setForm({ user_id: "", tier: "pro", months: 1 }); qc.invalidateQueries({ queryKey: ["subs"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (user_id: string) => revokeFn({ data: { user_id } }),
    onSuccess: () => { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["subs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Subscriptions</h1>
        <Card>
          <CardContent className="grid gap-2 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <Input placeholder="User ID (UUID)" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} />
            <select className="rounded border bg-background px-2 py-2 text-sm" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as any })}>
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="team">team</option>
            </select>
            <Input type="number" min={1} max={60} value={form.months} onChange={(e) => setForm({ ...form, months: Number(e.target.value) })} />
            <Button onClick={() => grant.mutate()} disabled={!form.user_id || grant.isPending}>Grant</Button>
          </CardContent>
        </Card>
        {isLoading ? <p>Loading…</p> : (
          <div className="grid gap-2">
            {(subs ?? []).map((s: any) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-mono text-xs">{s.user_id}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge>{s.tier}</Badge> · {s.status} · ends {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm("Revoke?")) revoke.mutate(s.user_id); }}>Revoke</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
