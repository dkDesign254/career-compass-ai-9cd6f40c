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
import { grantRole, listUsers, revokeRole } from "@/lib/admin.functions";

const ROLES = ["student", "recruiter", "company_admin", "cms_editor", "admin"] as const;

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users & Roles — Admin" }] }),
  component: UsersPage,
});

function UsersPage() {
  const [q, setQ] = useState("");
  const listFn = useServerFn(listUsers);
  const grantFn = useServerFn(grantRole);
  const revokeFn = useServerFn(revokeRole);
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users", q], queryFn: () => listFn({ data: { q } }) });

  const grant = useMutation({
    mutationFn: (v: { user_id: string; role: any }) => grantFn({ data: v }),
    onSuccess: () => { toast.success("Role granted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (v: { user_id: string; role: any }) => revokeFn({ data: v }),
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Users & Roles</h1>
        <Input placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        {isLoading ? <p>Loading…</p> : (
          <div className="grid gap-3">
            {(users ?? []).map((u: any) => (
              <Card key={u.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{u.full_name ?? "(unnamed)"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{u.id}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(u.roles ?? []).map((r: string) => (
                        <Badge key={r} variant="secondary" className="gap-1">
                          {r}
                          <button className="ml-1 text-destructive" title="Revoke" onClick={() => revoke.mutate({ user_id: u.id, role: r })}>×</button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ROLES.filter((r) => !(u.roles ?? []).includes(r)).map((r) => (
                      <Button key={r} size="sm" variant="outline" onClick={() => grant.mutate({ user_id: u.id, role: r })}>+ {r}</Button>
                    ))}
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
