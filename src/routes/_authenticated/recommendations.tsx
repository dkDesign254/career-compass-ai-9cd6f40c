import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles, FileText, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AiError } from "@/components/ai-error";
import { Header, LoadingCard } from "./employability";
import { recommendCareers, generateCoverLetter, generateInterviewKit } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({ meta: [{ title: "Recommendations — CareerPilot AI" }] }),
  component: RecommendationsPage,
});

function RecommendationsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Header icon={<Sparkles className="h-5 w-5" />} title="Career recommendations" desc="AI-generated career paths, cover letters, and interview prep — built on your profile." />
        <Tabs defaultValue="paths">
          <TabsList>
            <TabsTrigger value="paths">Career paths</TabsTrigger>
            <TabsTrigger value="cover">Cover letter</TabsTrigger>
            <TabsTrigger value="interview">Interview prep</TabsTrigger>
          </TabsList>
          <TabsContent value="paths" className="mt-4"><PathsTab /></TabsContent>
          <TabsContent value="cover" className="mt-4"><CoverTab /></TabsContent>
          <TabsContent value="interview" className="mt-4"><InterviewTab /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function PathsTab() {
  const fn = useServerFn(recommendCareers);
  const qc = useQueryClient();
  const m = useMutation({ mutationFn: () => fn(), onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-quota"] }) });
  return (
    <div className="space-y-4">
      <Button onClick={() => m.mutate()} disabled={m.isPending} className="bg-brand hover:bg-brand/90">
        {m.isPending ? "Generating…" : "Generate career paths"}
      </Button>
      {m.isPending && <LoadingCard label="Designing tailored paths…" />}
      {m.error && <AiError error={m.error} onRetry={() => m.mutate()} />}
      {m.data && (
        <div className="space-y-4">
          {m.data.career_paths.map((p, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.title}</CardTitle>
                  <Badge>{p.fit_score}% fit</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{p.why}</p>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">First 90 days</p>
                  <ul className="space-y-1 text-sm">{p.first_90_days.map((s, j) => <li key={j}>• {s}</li>)}</ul>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Upskilling priorities</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1 text-sm">{m.data.upskilling.map((s, i) => <li key={i}>• {s}</li>)}</ul></CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Networking moves</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1 text-sm">{m.data.networking.map((s, i) => <li key={i}>• {s}</li>)}</ul></CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function CoverTab() {
  const fn = useServerFn(generateCoverLetter);
  const qc = useQueryClient();
  const [v, setV] = useState({ job_title: "", company: "", job_description: "" });
  const m = useMutation({
    mutationFn: () => fn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-quota"] }),
  });
  const ok = v.job_title.length > 1 && v.company.length > 0 && v.job_description.length > 20;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Job details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Job title</Label><Input value={v.job_title} onChange={(e) => setV({ ...v, job_title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Company</Label><Input value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Job description</Label><Textarea rows={6} value={v.job_description} onChange={(e) => setV({ ...v, job_description: e.target.value })} /></div>
          <Button disabled={!ok || m.isPending} onClick={() => m.mutate()} className="bg-brand hover:bg-brand/90">
            {m.isPending ? "Writing…" : "Generate cover letter"}
          </Button>
        </CardContent>
      </Card>
      {m.isPending && <LoadingCard label="Drafting your cover letter…" />}
      {m.error && <AiError error={m.error} onRetry={() => m.mutate()} />}
      {m.data && (
        <Card><CardHeader><CardTitle>Your cover letter</CardTitle></CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.data.text}</pre>
            <Button className="mt-4" variant="outline" onClick={() => navigator.clipboard.writeText(m.data.text)}>Copy to clipboard</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InterviewTab() {
  const fn = useServerFn(generateInterviewKit);
  const qc = useQueryClient();
  const [v, setV] = useState({ job_title: "", company: "", job_description: "" });
  const m = useMutation({
    mutationFn: () => fn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-quota"] }),
  });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Role</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Job title</Label><Input value={v.job_title} onChange={(e) => setV({ ...v, job_title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Company (optional)</Label><Input value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>JD (optional)</Label><Textarea rows={4} value={v.job_description} onChange={(e) => setV({ ...v, job_description: e.target.value })} /></div>
          <Button disabled={v.job_title.length < 2 || m.isPending} onClick={() => m.mutate()} className="bg-brand hover:bg-brand/90">
            {m.isPending ? "Generating…" : "Generate interview kit"}
          </Button>
        </CardContent>
      </Card>
      {m.isPending && <LoadingCard label="Preparing your interview kit…" />}
      {m.error && <AiError error={m.error} onRetry={() => m.mutate()} />}
      {m.data && (
        <div className="space-y-4">
          {m.data.questions.map((q, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{q.question}</CardTitle>
                  <Badge variant="outline">{q.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">{q.what_they_assess}</p>
                <div className="rounded-md bg-muted p-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Sample answer</p>
                  <p>{q.sample_answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card><CardHeader><CardTitle>Preparation tips</CardTitle></CardHeader>
            <CardContent><ul className="space-y-1 text-sm">{m.data.preparation_tips.map((t, i) => <li key={i}>• {t}</li>)}</ul></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}