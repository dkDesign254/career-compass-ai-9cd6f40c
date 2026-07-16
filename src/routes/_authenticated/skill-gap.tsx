import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Brain, Sparkles, CheckCircle2, XCircle, GraduationCap, Clock, ExternalLink, Award } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiError } from "@/components/ai-error";
import { Header, LoadingCard } from "./employability";
import { analyzeSkillGap } from "@/lib/ai.functions";
import { listCertifications } from "@/lib/certifications.functions";

export const Route = createFileRoute("/_authenticated/skill-gap")({
  head: () => ({ meta: [{ title: "Skill Gap — CareerPilot AI" }] }),
  component: SkillGapPage,
});

const COST_LABEL: Record<string, string> = { free: "Free", freemium: "Free to start", paid: "Paid" };

function CertCard({ c }: { c: any }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <GraduationCap className="h-5 w-5 shrink-0 text-accent" />
        <Badge variant={c.cost === "free" ? "secondary" : "outline"}>{COST_LABEL[c.cost] ?? c.cost}</Badge>
      </div>
      <h3 className="mt-2 font-medium leading-tight group-hover:text-accent">{c.title}</h3>
      <p className="text-xs text-muted-foreground">{c.issuer}</p>
      {c.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {c.duration_estimate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.duration_estimate}</span>}
        <Badge variant="outline" className="text-[10px]">{c.field}</Badge>
      </div>
      <span className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
        View course <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}

function CertificationsLibrary() {
  const fn = useServerFn(listCertifications);
  const { data, isLoading } = useQuery({ queryKey: ["certifications"], queryFn: () => fn() });
  const [field, setField] = useState<string>("recommended");
  const certs = data?.certifications ?? [];
  const fields = [...new Set(certs.map((c: any) => c.field))].sort();
  const userField = data?.userField;

  const visible = field === "recommended"
    ? certs.filter((c: any) => c.field === userField)
    : field === "all" ? certs : certs.filter((c: any) => c.field === field);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4 text-accent" /> Certifications & courses</CardTitle>
        <Select value={field} onValueChange={setField}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {userField && <SelectItem value="recommended">Recommended for you</SelectItem>}
            <SelectItem value="all">All fields</SelectItem>
            {fields.map((f: any) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
         visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {field === "recommended" ? "recommended" : ""} courses found — try "All fields".</p>
         ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c: any) => <CertCard key={c.id} c={c} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
        <Header icon={<Brain className="h-5 w-5" />} title="Skill gap analysis" desc="Browse real courses and certifications below, or run a personalized AI analysis against your target role." />

        <CertificationsLibrary />

        {!m.data && !m.isPending && !m.error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <Sparkles className="h-10 w-10 text-accent" />
              <div>
                <p className="font-medium">Want a personalized breakdown?</p>
                <p className="text-sm text-muted-foreground">See exactly which skills you're missing for your target role, ranked by how often they show up in real, currently-open job postings.</p>
              </div>
              <Button onClick={() => m.mutate()} className="bg-brand hover:bg-brand/90">Run personalized analysis</Button>
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
