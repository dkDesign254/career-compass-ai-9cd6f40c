import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Target } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotaBadge } from "@/components/quota-badge";
import { AiError } from "@/components/ai-error";
import { ChipList, MetricRow, ScoreRing, SectionCard } from "@/components/ai-result-card";
import { scoreEmployability } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/employability")({
  head: () => ({ meta: [{ title: "Employability Score — CareerPilot AI" }] }),
  component: EmployabilityPage,
});

function EmployabilityPage() {
  const fn = useServerFn(scoreEmployability);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => fn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-quota"] }),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Header
          icon={<Target className="h-5 w-5" />}
          title="Employability score"
          desc="An honest, evidence-based snapshot of how ready you are for your target role."
        />

        {!m.data && !m.isPending && !m.error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Sparkles className="h-10 w-10 text-coral" />
              <p className="text-muted-foreground">Run AI analysis on your career profile.</p>
              <Button onClick={() => m.mutate()} className="bg-brand hover:bg-brand/90">Run analysis</Button>
            </CardContent>
          </Card>
        )}

        {m.isPending && <LoadingCard label="Scoring your profile…" />}
        {m.error && <AiError error={m.error} onRetry={() => m.mutate()} />}

        {m.data && (
          <div className="space-y-6">
            <Card>
              <CardContent className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
                <ScoreRing score={m.data.score} label="Employability" />
                <div className="space-y-3">
                  <MetricRow label="Skills" value={m.data.breakdown.skills} />
                  <MetricRow label="Experience" value={m.data.breakdown.experience} />
                  <MetricRow label="Education" value={m.data.breakdown.education} />
                  <MetricRow label="Market fit" value={m.data.breakdown.market_fit} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent><p className="leading-relaxed text-muted-foreground">{m.data.summary}</p></CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <SectionCard title="Strengths"><ChipList items={m.data.strengths} variant="secondary" /></SectionCard>
              <SectionCard title="Weaknesses"><ChipList items={m.data.weaknesses} variant="outline" /></SectionCard>
              <SectionCard title="Next actions">
                <ul className="space-y-2 text-sm">{m.data.next_actions.map((a, i) => <li key={i}>• {a}</li>)}</ul>
              </SectionCard>
            </div>

            <Button variant="outline" onClick={() => m.mutate()}>Re-run analysis</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function Header({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand/10 to-coral/20 text-coral">{icon}</div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
        </div>
        <p className="text-muted-foreground">{desc}</p>
      </div>
      <QuotaBadge />
    </div>
  );
}

export function LoadingCard({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}