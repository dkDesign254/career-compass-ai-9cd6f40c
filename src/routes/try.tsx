import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Compass, Sparkles, Lock, ArrowRight, CheckCircle2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { runAnonEmployabilityCheck } from "@/lib/ai.functions";

export const Route = createFileRoute("/try")({
  head: () => ({ meta: [{ title: "Free employability check — CareerPilot AI" }] }),
  component: TryPage,
});

function getDeviceId(): string {
  const key = "cp_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Compass className="h-4 w-4" /></span>
          <span className="font-display text-lg">CareerPilot</span>
        </Link>
        <Button asChild size="sm" className="rounded-full bg-accent px-5 text-accent-foreground hover:bg-accent/90">
          <Link to="/auth">Sign up free</Link>
        </Button>
      </div>
    </header>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - score / 100);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
      <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="12" />
      <motion.circle
        cx="70" cy="70" r="54" fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform="rotate(-90 70 70)"
      />
      <text x="70" y="76" textAnchor="middle" className="fill-foreground font-display text-3xl font-bold">{score}</text>
    </svg>
  );
}

function TryPage() {
  const fn = useServerFn(runAnonEmployabilityCheck);
  const [deviceId, setDeviceId] = useState("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [level, setLevel] = useState<"student" | "entry" | "mid" | "senior">("entry");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => { setDeviceId(getDeviceId()); }, []);

  const m = useMutation({
    mutationFn: () => fn({ data: { device_id: deviceId, target_role: role, industry, experience_level: level, skills } }),
  });

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v) && skills.length < 20) {
      setSkills([...skills, v]);
      setSkillInput("");
    }
  };

  const canRun = role.length > 1 && industry.length > 1 && skills.length > 0 && deviceId;

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
        <div className="text-center">
          <Badge variant="secondary" className="mb-3 gap-1"><Zap className="h-3 w-3" /> No account needed</Badge>
          <h1 className="font-display text-3xl font-bold">How employable are you, right now?</h1>
          <p className="mt-2 text-muted-foreground">Get a real, evidence-based score in under a minute — free, no sign-up. Two checks a day, on us.</p>
        </div>

        {!m.data && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target role</Label>
                  <Input placeholder="e.g. Junior Software Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Industry / field</Label>
                  <Input placeholder="e.g. Software Engineering" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Experience level</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Still studying</SelectItem>
                    <SelectItem value="entry">Entry-level (0-2 yrs)</SelectItem>
                    <SelectItem value="mid">Mid-level (2-5 yrs)</SelectItem>
                    <SelectItem value="senior">Senior (5+ yrs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>A few key skills</Label>
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-input p-2">
                  {skills.map((s) => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s}
                      <button onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>×</button>
                    </Badge>
                  ))}
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); } }}
                    placeholder="Type a skill, press Enter"
                    className="flex-1 min-w-[140px] bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <Button
                disabled={!canRun || m.isPending}
                onClick={() => m.mutate()}
                className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {m.isPending ? "Scoring…" : (
                  <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Get my score</span>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {m.error && (
          <Card className="border-accent/40 bg-accent/5">
            <CardContent className="space-y-4 p-6 text-center">
              <Lock className="mx-auto h-8 w-8 text-accent" />
              <p className="font-medium">{m.error.message}</p>
              <Button asChild className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth">Sign up free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {m.data && (
          <div className="space-y-6">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
                <ScoreRing score={m.data.score} />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Your employability score</p>
                  <p className="mt-1 text-muted-foreground">{m.data.summary}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Strengths</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {m.data.strengths?.map((s: string, i: number) => (
                    <p key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {s}</p>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Weaknesses</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {m.data.weaknesses?.map((s: string, i: number) => (
                    <p key={i} className="flex items-start gap-2 text-sm"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> {s}</p>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* The hook: this score is a snapshot, not a plan. Everything that
                turns it into progress lives behind a free account. */}
            <Card className="border-accent/40 bg-gradient-to-br from-accent/10 to-transparent">
              <CardContent className="space-y-4 p-8">
                <p className="font-display text-xl font-semibold">This is just the surface.</p>
                <p className="text-muted-foreground">
                  A free CareerPilot account saves this score, tracks how it changes as you build real skills, and unlocks
                  what actually moves the needle: a full skill-gap breakdown against real open jobs, ATS-optimized resume
                  rewrites, tailored cover letters, interview prep built around your exact background, and application
                  tracking that shows what's working. Plus your daily free AI runs jump from 2 to 7.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "7 free AI runs a day (vs. 2)",
                    "Full skill-gap analysis vs. real jobs",
                    "ATS resume scoring & rewrites",
                    "Career paths, cover letters, interview prep",
                    "Application tracking & analytics",
                    "A profile recruiters can actually find",
                  ].map((f) => (
                    <p key={f} className="flex items-center gap-2 text-sm"><Sparkles className="h-3.5 w-3.5 text-accent" /> {f}</p>
                  ))}
                </div>
                <Button asChild size="lg" className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">
                  <Link to="/auth">Create my free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
