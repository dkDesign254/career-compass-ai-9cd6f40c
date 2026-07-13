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
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["ai-provider-keys"], queryFn: () => listFn() });
  const keyed = new Map((data ?? []).map((k: any) => [k.provider, k]));

  const save = useMutation({
    mutationFn: (vars: { provider: string; label: string; key_value: string }) =>
      setFn({ data: vars }),
    onSuccess: () => {
      toast.success("Key saved");
      qc.invalidateQueries({ queryKey: ["ai-provider-keys"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deactivate = useMutation({
    mutationFn: (provider: string) => deactivateFn({ data: { provider } }),
    onSuccess: () => {
      toast.success("Key deactivated");
      qc.invalidateQueries({ queryKey: ["ai-provider-keys"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">AI provider keys</h1>
          <p className="text-sm text-muted-foreground">
            Keys are encrypted in Supabase Vault. Only a masked preview is ever shown here, and the
            raw value never reaches the browser after saving.
          </p>
        </div>
        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="grid gap-4">
            {KNOWN_PROVIDERS.map((p) => (
              <ProviderRow
                key={p.id}
                provider={p.id}
                label={p.label}
                existing={keyed.get(p.id)}
                onSave={(keyValue) =>
                  save.mutate({ provider: p.id, label: p.label, key_value: keyValue })
                }
                onDeactivate={() => deactivate.mutate(p.id)}
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
  provider,
  label,
  existing,
  onSave,
  onDeactivate,
  saving,
}: {
  provider: string;
  label: string;
  existing: any;
  onSave: (keyValue: string) => void;
  onDeactivate: () => void;
  saving: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{label}</CardTitle>
        {existing?.is_active ? (
          <Badge variant="secondary">Active, ending {existing.key_preview}</Badge>
        ) : (
          <Badge variant="outline">Not set</Badge>
        )}
      </CardHeader>
      <CardContent className="flex items-end gap-2">
        <div className="flex-1">
          <Label htmlFor={`key-${provider}`} className="text-xs">
            New key value
          </Label>
          <Input
            id={`key-${provider}`}
            type="password"
            placeholder="Paste API key to set or rotate"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button
          disabled={!value || saving}
          onClick={() => {
            onSave(value);
            setValue("");
          }}
        >
          Save
        </Button>
        {existing?.is_active && (
          <Button variant="outline" onClick={onDeactivate}>
            Deactivate
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
