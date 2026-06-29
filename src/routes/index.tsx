import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Compass, Sparkles, Target, FileCheck2, Brain, Briefcase,
  ArrowRight, CheckCircle2, Users, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot AI — AI Career Navigator for Students & Graduates" },
      { name: "description", content: "Land your next role with AI: employability scoring, skill gap analysis, ATS-optimized resumes, tailored job matching, and interview prep — built for students and early-career professionals." },
      { property: "og:title", content: "CareerPilot AI — AI Career Navigator" },
      { property: "og:description", content: "Employability scoring, skill gaps, ATS resumes, and AI job matching." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Target, title: "Employability Score", desc: "Your readiness, scored across skills, experience, and education." },
  { icon: Brain, title: "Skill Gap Analysis", desc: "See exactly what stands between you and your target role." },
  { icon: FileCheck2, title: "ATS Resume Optimizer", desc: "PDF/DOCX upload, ATS score, keyword fixes, AI rewrites." },
  { icon: Sparkles, title: "Career Recommendations", desc: "Personalized career paths, cover letters, interview prep." },
  { icon: Briefcase, title: "Job Match & Tracker", desc: "Scraped jobs + AI compatibility scoring + application pipeline." },
  { icon: Users, title: "Recruiter Portal", desc: "Post jobs, ATS-shortlist, and send personalized one-click feedback." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-coral text-white">
              <Compass className="h-5 w-5" />
            </span>
            CareerPilot <span className="text-coral">AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
            <a href="#how" className="text-muted-foreground hover:text-foreground">How it works</a>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">Sign in</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -left-32 top-32 h-96 w-96 rounded-full bg-coral/20 blur-3xl" />
        <div className="absolute -right-32 top-64 h-96 w-96 rounded-full bg-teal/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-coral" />
            AI-powered career navigation for the next generation of talent
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
          >
            Land your <span className="text-gradient">next role</span>
            <br /> with AI on your side.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            Built for students and graduates. Score your employability, fix skill gaps,
            optimize your resume for ATS, and match with real jobs — all in one place.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <Button asChild size="lg" className="glow">
              <Link to="/auth">Start free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Explore features</a>
            </Button>
          </motion.div>
          <p className="mt-4 text-xs text-muted-foreground">2 free AI job-match runs every month. No credit card.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/50 bg-muted/30 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to get hired</h2>
            <p className="mt-3 text-muted-foreground">Five core AI modules, plus recruiter tools, job scraping, and subscriptions.</p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-coral/50 hover:shadow-xl"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-coral/20 text-coral transition-transform group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">From profile to offer in 4 steps</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {["Build your profile", "Score your employability", "Match with jobs", "Land interviews"].map((s, i) => (
              <div key={s} className="relative rounded-2xl border border-border bg-card p-6">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">{i + 1}</div>
                <p className="font-medium">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-gradient-to-br from-brand to-brand/80 p-10 text-center text-white sm:p-16">
          <BarChart3 className="mx-auto mb-4 h-10 w-10 text-coral" />
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to take control of your career?</h2>
          <p className="mt-3 text-white/80">Join the early access. Free forever for core features.</p>
          <Button asChild size="lg" className="mt-8 bg-coral text-white hover:bg-coral/90">
            <Link to="/auth">Get started <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CareerPilot AI. Built for students and graduates.</p>
      </footer>
    </div>
  );
}
