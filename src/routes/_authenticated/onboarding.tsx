import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — CareerPilot AI" }] }),
  component: Onboarding,
});

type Form = {
  target_role: string;
  industry: string;
  experience_level: "student" | "entry" | "mid" | "senior";
  target_locations: string[];
  skills: string[];
  education: { institution: string; qualification: string; year: string };
  work_history: string;
  career_goals: string;
};

const STEPS = ["Goals", "Skills", "Education", "Experience", "Review"] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    target_role: "",
    industry: "",
    experience_level: "student",
    target_locations: [],
    skills: [],
    education: { institution: "", qualification: "", year: "" },
    work_history: "",
    career_goals: "",
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("career_profiles")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        setForm((f) => ({
          ...f,
          target_role: data.target_role ?? "",
          industry: data.industry ?? "",
          experience_level: (data.experience_level as Form["experience_level"]) ?? "student",
          target_locations: data.target_locations ?? [],
          skills: Array.isArray(data.skills) ? (data.skills as string[]) : [],
          education:
            Array.isArray(data.education) && data.education[0]
              ? (data.education[0] as Form["education"])
              : f.education,
          work_history:
            Array.isArray(data.work_history) && data.work_history[0]
              ? String((data.work_history[0] as { text?: string }).text ?? "")
              : "",
          career_goals: data.career_goals ?? "",
        }));
      }
    })();
  }, []);

  const setField = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      user_id: u.user.id,
      target_role: form.target_role,
      industry: form.industry,
      experience_level: form.experience_level,
      target_locations: form.target_locations,
      skills: form.skills,
      education: [form.education],
      work_history: [{ text: form.work_history }],
      career_goals: form.career_goals,
    };
    const { error } = await supabase
      .from("career_profiles")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved — let's go!");
    navigate({ to: "/dashboard" });
  };

  const canNext = [
    () => form.target_role.length > 1 && form.industry.length > 0,
    () => form.skills.length > 0,
    () => form.education.institution.length > 0,
    () => true,
    () => true,
  ][step]();

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Onboarding</p>
          <h1 className="font-display text-2xl font-bold">Build your career profile</h1>
          <div className="mt-4">
            <Progress value={((step + 1) / STEPS.length) * 100} />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {STEPS.map((s, i) => (
                <span key={s} className={i === step ? "font-medium text-foreground" : ""}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>{STEPS[step]}</CardTitle></CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {step === 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Target role</Label>
                      <Input placeholder="e.g. Data Analyst" value={form.target_role} onChange={(e) => setField("target_role", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Industry</Label>
                      <Input placeholder="e.g. Fintech" value={form.industry} onChange={(e) => setField("industry", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Experience level</Label>
                      <Select value={form.experience_level} onValueChange={(v) => setField("experience_level", v as Form["experience_level"])}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student / no work yet</SelectItem>
                          <SelectItem value="entry">Entry-level (0–2 yrs)</SelectItem>
                          <SelectItem value="mid">Mid-level (3–6 yrs)</SelectItem>
                          <SelectItem value="senior">Senior (7+ yrs)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target locations</Label>
                      <TagInput value={form.target_locations} onChange={(v) => setField("target_locations", v)} placeholder="Nairobi, Remote…" />
                    </div>
                  </>
                )}

                {step === 1 && (
                  <div className="space-y-2">
                    <Label>Your skills</Label>
                    <TagInput value={form.skills} onChange={(v) => setField("skills", v)} placeholder="Add a skill and press Enter" />
                    <p className="text-xs text-muted-foreground">Press Enter or comma to add. Aim for 5–15.</p>
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label>Institution</Label>
                      <Input value={form.education.institution} onChange={(e) => setField("education", { ...form.education, institution: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Qualification</Label>
                      <Input placeholder="e.g. BSc Computer Science" value={form.education.qualification} onChange={(e) => setField("education", { ...form.education, qualification: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Year completed (or expected)</Label>
                      <Input placeholder="2025" value={form.education.year} onChange={(e) => setField("education", { ...form.education, year: e.target.value })} />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="space-y-2">
                      <Label>Work / project history</Label>
                      <Textarea rows={6} placeholder="Describe roles, internships, or projects with impact and outcomes." value={form.work_history} onChange={(e) => setField("work_history", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Career goals</Label>
                      <Textarea rows={3} placeholder="Where do you want to be in 2 years?" value={form.career_goals} onChange={(e) => setField("career_goals", e.target.value)} />
                    </div>
                  </>
                )}

                {step === 4 && (
                  <div className="space-y-3 text-sm">
                    <Row label="Target role" value={form.target_role} />
                    <Row label="Industry" value={form.industry} />
                    <Row label="Experience" value={form.experience_level} />
                    <Row label="Locations" value={form.target_locations.join(", ") || "—"} />
                    <Row label="Skills" value={`${form.skills.length} added`} />
                    <Row label="Education" value={`${form.education.qualification || "—"} · ${form.education.institution || "—"}`} />
                    <Row label="Goals" value={form.career_goals ? "Provided" : "—"} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Save & continue
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().replace(/,$/, "");
    if (!v) return;
    if (value.includes(v)) return setDraft("");
    onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="rounded-md border border-input bg-background p-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => onChange(value.filter((x) => x !== t))}>
            {t} ×
          </Badge>
        ))}
        <input
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
            if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
        />
      </div>
    </div>
  );
}