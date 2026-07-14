import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  listAiProviderKeys,
  setAiProviderKey,
  deactivateAiProviderKey,
  setAiProviderPriority,
} from "@/lib/admin.functions";

const KNOWN_PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Google Gemini" },
  { id: "anthropic", label: "Anthropic" },
  { id: "firecrawl", label: "Firecrawl (scraping)" },
];

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const listFn = useServerFn(listAiProviderKeys);
  const setFn = useServerFn(setAiProviderKey);
  const deactivateFn = useServerFn(deactivateAiProviderKey);
  const priorityFn = useServerFn(setAiProviderPriority);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["ai-provider-keys"], queryFn: () => listFn() });
  const keyed = new Map((data ?? []).map((k: any) => [k.provider, k]));
  const activeSorted = [...(data ?? [])].filter((k: any) => k.is_active).sort((a: any, b: any) => a.priority - b.priority);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ai-provider-keys"] });

  const save = useMutation({
    mutationFn: (vars: { provider: string; label: string; key_value: string; priority: number }) => setFn({ data: vars }),
    onSuccess: () => { toast.success("Key saved"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const deactivate = useMutation({
    mutationFn: (provider: string) => deactivateFn({ data: { provider } }),
    onSuccess: () => { toast.success("Key deactivated"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const reprioritize = useMutation({
    mutationFn: (vars: { provider: string; priority: number }) => priorityFn({ data: vars }),
    onSuccess: () => { toast.success("Order updated"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">AI provider keys</h1>
          <p className="text-sm text-muted-foreground">
            Keys are encrypted in Supabase Vault. Only a masked preview is ever shown here, and the raw value never
            reaches the browser after saving. When more than one key is active, the app automatically uses the
            highest-priority one first and falls back to the next if a key fails or gets rate-limited three times in
            a row (a 15-minute cooldown applies before it's retried).
          </p>
        </div>

        {activeSorted.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Current fallback order</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-1 text-sm">
                {activeSorted.map((k: any, i: number) => (
                  <li key={k.provider} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium">{k.label ?? k.provider}</span>
                    {k.cooldown_until && new Date(k.cooldown_until) > new Date() && (
                      <Badge variant="destructive">Cooling down</Badge>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {isLoading ? <p>Loading…</p> : (
          <div className="grid gap-4">
            {KNOWN_PROVIDERS.map((p) => (
              <ProviderRow
                key={p.id}
                provider={p.id}
                label={p.label}
                existing={keyed.get(p.id)}
                onSave={(keyValue, priority) => save.mutate({ provider: p.id, label: p.label, key_value: keyValue, priority })}
                onDeactivate={() => deactivate.mutate(p.id)}
                onReprioritize={(priority) => reprioritize.mutate({ provider: p.id, priority })}
                saving={save.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ProviderRow({
  provider, label, existing, onSave, onDeactivate, onReprioritize, saving,
}: {
  provider: string; label: string; existing: any;
  onSave: (keyValue: string, priority: number) => void;
  onDeactivate: () => void;
  onReprioritize: (priority: number) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState(existing?.priority ?? 100);
  const inCooldown = existing?.cooldown_until && new Date(existing.cooldown_until) > new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{label}</CardTitle>
        <div className="flex gap-2">
          {inCooldown && <Badge variant="destructive">Cooling down</Badge>}
          {existing?.is_active ? (
            <Badge variant="secondary">Active, ending {existing.key_preview}</Badge>
          ) : (
            <Badge variant="outline">Not set</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {existing?.is_active && (
          <p className="text-xs text-muted-foreground">
            Priority {existing.priority} (lower = tried first)
            {existing.last_success_at && ` · last used successfully ${new Date(existing.last_success_at).toLocaleString()}`}
            {existing.consecutive_failures > 0 && ` · ${existing.consecutive_failures} failure(s) in a row`}
            {existing.last_error && ` · last error: ${existing.last_error}`}
          </p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor={`key-${provider}`} className="text-xs">New key value</Label>
            <Input
              id={`key-${provider}`}
              type="password"
              placeholder="Paste API key to set or rotate"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="w-24">
            <Label htmlFor={`priority-${provider}`} className="text-xs">Priority</Label>
            <Input
              id={`priority-${provider}`}
              type="number"
              min={1}
              max={1000}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            />
          </div>
          <Button disabled={!value || saving} onClick={() => { onSave(value, priority); setValue(""); }}>
            Save
          </Button>
          {existing?.is_active && (
            <>
              <Button variant="outline" onClick={() => onReprioritize(priority)}>Reorder</Button>
              <Button variant="outline" onClick={onDeactivate}>Deactivate</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
