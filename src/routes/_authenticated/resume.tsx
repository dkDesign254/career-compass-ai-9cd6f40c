import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileCheck2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiError } from "@/components/ai-error";
import { ChipList, ScoreRing, SectionCard } from "@/components/ai-result-card";
import { Header, LoadingCard } from "./employability";
import { optimizeResume } from "@/lib/ai.functions";
import { extractResumeText } from "@/lib/resume-parse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({ meta: [{ title: "Resume / ATS — CareerPilot AI" }] }),
  component: ResumePage,
});

function ResumePage() {
  const fn = useServerFn(optimizeResume);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (vars: { resume_text: string; target_role?: string }) => fn({ data: vars }),
    onSuccess: async (res: any) => {
      qc.invalidateQueries({ queryKey: ["ai-quota"] });
      qc.invalidateQueries({ queryKey: ["my-resumes"] });
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
      toast.success("Resume uploaded and parsed");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to parse file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <Header icon={<FileCheck2 className="h-5 w-5" />} title="Resume / ATS check" desc="Paste your resume text — we'll score it for ATS systems and rewrite weak parts." />

        <Card>
          <CardHeader><CardTitle>Your resume</CardTitle></CardHeader>
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

        {m.data && (
          <div className="space-y-6">
            <Card>
              <CardContent className="flex items-center gap-8 p-6">
                <ScoreRing score={m.data.ats_score} label="ATS score" />
                <div className="flex-1 text-sm text-muted-foreground">
                  ATS systems prefer keyword density, clean structure, and quantified impact. Higher is better — most strong resumes score 75+.
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard title="Keyword matches"><ChipList items={m.data.keyword_matches} variant="secondary" /></SectionCard>
              <SectionCard title="Missing keywords"><ChipList items={m.data.missing_keywords} variant="outline" /></SectionCard>
            </div>

            <SectionCard title="Issues to fix">
              <ul className="space-y-1 text-sm">{m.data.issues.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
            </SectionCard>

            <SectionCard title="Rewritten summary">
              <p className="leading-relaxed text-muted-foreground">{m.data.rewritten_summary}</p>
            </SectionCard>

            <SectionCard title="Suggested bullets">
              <ul className="space-y-2 text-sm">{m.data.bullet_suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
            </SectionCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}