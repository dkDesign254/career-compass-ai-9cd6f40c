import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Target, Brain, FileCheck2, Sparkles, Briefcase, ArrowRight, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuotaStatus } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CareerPilot AI" }] }),
  component: Dashboard,
});

const modules = [
  { to: "/employability", title: "Employability Score", desc: "See your readiness across skills, experience, and education.", icon: Target },
  { to: "/skill-gap", title: "Skill Gap Analysis", desc: "Identify exactly what to learn for your target role.", icon: Brain },
  { to: "/resume", title: "Resume / ATS", desc: "Upload your resume and optimize it for ATS systems.", icon: FileCheck2 },
  { to: "/recommendations", title: "Career Recommendations", desc: "AI-tailored career paths, cover letters, interview prep.", icon: Sparkles },
  { to: "/jobs", title: "Jobs & Applications", desc: "Browse jobs and track your applications.", icon: Briefcase },
] as const;

function Dashboard() {
  const fn = useServerFn(getQuotaStatus);
  const { data: quota } = useQuery({ queryKey: ["ai-quota"], queryFn: () => fn(), staleTime: 30_000 });
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Welcome aboard</h1>
          <p className="mt-1 text-muted-foreground">Complete your profile to unlock personalized recommendations.</p>
        </motion.div>

        <Card className="border-coral/40 bg-gradient-to-br from-brand to-brand/80 text-white">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-coral/30 px-3 py-1 text-xs font-medium">
                <Zap className="h-3 w-3" /> Get started
              </div>
              <h2 className="text-xl font-semibold">Set up your career profile</h2>
              <p className="mt-1 text-sm text-white/80">Takes about 3 minutes. All modules unlock from here.</p>
            </div>
            <Button asChild className="bg-coral hover:bg-coral/90">
              <Link to="/onboarding">Start onboarding <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Employability score", value: "—" },
            { label: "Applications", value: "0" },
          { label: "AI runs this month", value: quota ? (quota.isPaid ? `${quota.used}` : `${quota.used} / ${quota.limit}`) : "—" },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
              <CardContent><div className="text-3xl font-bold">{s.value}</div></CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold">Modules</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => (
              <motion.div key={m.to} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={m.to}>
                  <Card className="group h-full transition-all hover:-translate-y-1 hover:border-coral/50 hover:shadow-lg">
                    <CardHeader>
                      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-coral/20 text-coral group-hover:scale-110 transition-transform">
                        <m.icon className="h-5 w-5" />
                      </div>
                      <CardTitle>{m.title}</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{m.desc}</p></CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          AI modules are live. Job board, recruiter portal and subscriptions arrive in Runs 3–5.
        </p>
      </div>
    </AppShell>
  );
}