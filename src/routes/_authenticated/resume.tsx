import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileCheck2, Upload, Clock, ChevronRight, Star } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AiError } from "@/components/ai-error";
import { ChipList, ScoreRing, SectionCard } from "@/components/ai-result-card";
import { Header, LoadingCard } from "./employability";
import { optimizeResume, listMyResumes } from "@/lib/ai.functions";
import { extractResumeText } from "@/lib/resume-parse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({ meta: [{ title: "Resume / ATS — CareerPilot AI" }] }),
  component: ResumePage,
});

function ResumeHistory({ onSelect, selectedId }: { onSelect: (r: any) => void; selectedId: string | null }) {
  const fn = useServerFn(listMyResumes);
  const { data, isLoading } = useQuery({ queryKey: ["my-resumes"], queryFn: () => fn() });
  const resumes = data ?? [];

  if (isLoading) return null;
  if (resumes.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Your resumes</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {resumes.map((r: any) => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className={`flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors hover:border-accent/40 ${selectedId === r.id ? "border-accent bg-accent/5" : "border-border"}`}
          >
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">{r.title}{r.is_primary && <Star className="ml-1.5 inline h-3 w-3 fill-accent text-accent" />}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  {r.target_role && <> · targeting <span className="font-medium">{r.target_role}</span></>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {typeof r.ats_score === "number" && (
                <Badge variant={r.ats_score >= 75 ? "secondary" : "outline"}>{r.ats_score}/100</Badge>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function ResumePage() {
  const fn = useServerFn(optimizeResume);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [viewingSaved, setViewingSaved] = useState<any | null>(null);

  const m = useMutation({
    mutationFn: (vars: { resume_text: string; target_role?: string }) => fn({ data: vars }),
    onSuccess: async (res: any) => {
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["my-resumes"] });
      setViewingSaved(null);
      if (filePath && res?.id) {
        await supabase.from("resumes").update({ file_path: filePath, file_name: fileName }).eq("id", res.id);
      }
    },
  });

  const onFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const path = `${u.user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const extracted = await extractResumeText(file);
      setText(extracted);
      setFilePath(path);
      setFileName(file.name);
      setViewingSaved(null);
      toast.success("Resume uploaded and parsed");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to parse file");
    } finally {
      setUploading(false);
    }
  };

  // Either the freshly-run analysis, or a previously-saved one selected from history.
  const displayData = viewingSaved ? { ...viewingSaved.analysis, ats_score: viewingSaved.ats_score } : m.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Header icon={<FileCheck2 className="h-5 w-5" />} title="Resume / ATS check" desc="Upload or paste your resume — we'll score it for ATS systems and rewrite weak parts. Every analysis is saved so you can compare over time." />

        <ResumeHistory selectedId={viewingSaved?.id ?? null} onSelect={(r) => setViewingSaved(r)} />

        <Card>
          <CardHeader><CardTitle>Run a new analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Upload PDF / DOCX / TXT</Label>
              <div className="flex items-center gap-3">
                <Input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} disabled={uploading} />
                {uploading && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Upload className="h-3 w-3 animate-pulse" /> Parsing…</span>}
              </div>
              {fileName && <p className="text-xs text-muted-foreground">Attached: {fileName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Target role (optional)</Label>
              <Input placeholder="e.g. Junior Data Analyst" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Resume text {filePath ? "(extracted)" : "(or paste)"}</Label>
              <Textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Copy-paste the contents of your CV here…" />
              <p className="text-xs text-muted-foreground">{text.length} chars · min 50</p>
            </div>
            <Button
              disabled={text.length < 50 || m.isPending}
              onClick={() => m.mutate({ resume_text: text, target_role: role || undefined })}
              className="bg-brand hover:bg-brand/90"
            >
              {m.isPending ? "Analyzing…" : "Run ATS analysis"}
            </Button>
          </CardContent>
        </Card>

        {m.isPending && <LoadingCard label="Scoring against ATS heuristics…" />}
        {m.error && <AiError error={m.error} onRetry={() => m.mutate({ resume_text: text, target_role: role || undefined })} />}

        {displayData && (
          <div className="space-y-6">
            {viewingSaved && (
              <p className="text-xs text-muted-foreground">
                Showing a saved analysis from {formatDistanceToNow(new Date(viewingSaved.created_at), { addSuffix: true })}.
                {" "}<button className="text-accent underline" onClick={() => setViewingSaved(null)}>Clear</button>
              </p>
            )}
            <Card>
              <CardContent className="flex items-center gap-8 p-6">
                <ScoreRing score={displayData.ats_score} label="ATS score" />
                <div className="flex-1 text-sm text-muted-foreground">
                  ATS systems prefer keyword density, clean structure, and quantified impact. Higher is better — most strong resumes score 75+.
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard title="Keyword matches"><ChipList items={displayData.keyword_matches} variant="secondary" /></SectionCard>
              <SectionCard title="Missing keywords"><ChipList items={displayData.missing_keywords} variant="outline" /></SectionCard>
            </div>

            <SectionCard title="Issues to fix">
              <ul className="space-y-1 text-sm">{displayData.issues?.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
            </SectionCard>

            <SectionCard title="Rewritten summary">
              <p className="leading-relaxed text-muted-foreground">{displayData.rewritten_summary}</p>
            </SectionCard>

            <SectionCard title="Suggested bullets">
              <ul className="space-y-2 text-sm">{displayData.bullet_suggestions?.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
            </SectionCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}
