import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AiError } from "@/components/ai-error";
import { Header, LoadingCard } from "./employability";
import { analyzeSkillGap } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/skill-gap")({
  head: () => ({ meta: [{ title: "Skill Gap — CareerPilot AI" }] }),
  component: SkillGapPage,
});

function SkillGapPage() {
  const fn = useServerFn(analyzeSkillGap);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-quota"] }),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Header icon={<Brain className="h-5 w-5" />} title="Skill gap analysis" desc="See exactly which skills you need for your target role — and how to learn them." />

        {!m.data && !m.isPending && !m.error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Sparkles className="h-10 w-10 text-coral" />
              <p className="text-muted-foreground">Identify your gaps against current market expectations.</p>
              <Button onClick={() => m.mutate()} className="bg-brand hover:bg-brand/90">Run analysis</Button>
            </CardContent>
          </Card>
        )}

        {m.isPending && <LoadingCard label="Mapping skill requirements…" />}
        {m.error && <AiError error={m.error} onRetry={() => m.mutate()} />}

        {m.data && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>For: {m.data.target_role}</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">{m.data.summary}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Required skills</CardTitle></CardHeader>
              <CardContent className="divide-y divide-border">
                {m.data.required_skills.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      {s.have ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.proficiency_gap}</div>
                      </div>
                    </div>
                    <Badge variant={s.importance === "critical" ? "destructive" : s.importance === "important" ? "default" : "outline"}>
                      {s.importance.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Learning plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {m.data.learning_plan.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{p.skill}</h3>
                      <Badge variant="secondary">{p.estimated_weeks} weeks</Badge>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {p.resources.map((r, j) => <li key={j}>• {r}</li>)}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button variant="outline" onClick={() => m.mutate()}>Re-run analysis</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}