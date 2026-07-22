import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, ArrowRight, ArrowLeft, Target, Brain, FileCheck2, Sparkles, Briefcase, ClipboardList, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Your Dashboard",
    path: "/dashboard",
    body: "The first thing you see when you sign in. It pulls together your employability score, active applications, and notifications so you don't have to hunt across pages for a status check.",
    tip: "The bell icon in the top bar shows a live unread count — click it any time to jump straight to your notifications.",
  },
  {
    icon: Target,
    title: "Employability score",
    path: "/employability",
    body: "This isn't guessed by AI. It's computed from real signals — how many of your skills actually overlap with currently-open jobs in your field, your work history, education, and experience level. The AI's only job is explaining that number in plain language.",
    tip: "Run this again after you add a new skill or job to your profile — the score updates to reflect it.",
  },
  {
    icon: Brain,
    title: "Skill Gap",
    path: "/skill-gap",
    body: "Browse a library of real, free certifications first — no AI run needed. When you're ready for something personal, run the analysis: it compares your skills against real, currently-open postings in your target role and tells you exactly what's missing.",
    tip: "Filter the certification library to \"Recommended for you\" to see only courses matched to your industry.",
  },
  {
    icon: FileCheck2,
    title: "Resume / ATS",
    path: "/resume",
    body: "Upload a PDF, DOCX, or paste your resume text. You'll get an ATS compatibility score, missing keywords, and rewritten bullet points. Every past analysis is saved — click any one from your history to see it again.",
    tip: "Run it again for each different role you apply to — ATS scoring is role-specific.",
  },
  {
    icon: Sparkles,
    title: "Recommendations",
    path: "/recommendations",
    body: "Explore established career fields (no AI needed), or generate personalized career paths, a tailored cover letter, and interview prep questions — all built from your actual profile, not generic advice.",
    tip: "The cover letter and interview prep tabs need a specific job in mind — have one ready before you generate.",
  },
  {
    icon: Briefcase,
    title: "Jobs",
    path: "/jobs",
    body: "Real listings, scraped from BrighterMonday, Fuzu, MyJobMag, RemoteOK, and We Work Remotely — refreshed automatically every 12 hours. Apply directly from here.",
    tip: "Set up job alerts on your profile to get notified when new listings match your interests.",
  },
  {
    icon: ClipboardList,
    title: "My Applications",
    path: "/applications",
    body: "Every application you've made, its current status, and a real analytics summary — total applied, response rate, and average time to hear back.",
    tip: "Click a job title here to jump straight back to the listing.",
  },
] as const;

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep(0); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <current.icon className="h-5 w-5 text-accent" /> {current.title}
            </DialogTitle>
            <Badge variant="secondary">{step + 1} / {STEPS.length}</Badge>
          </div>
          <DialogDescription>A step-by-step walkthrough of what each part of CareerPilot does.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90">{current.body}</p>
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Tip</p>
            <p className="mt-1 text-sm text-muted-foreground">{current.tip}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
          </Button>
          <Link to={current.path} onClick={() => setOpen(false)}>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">Go there now</Button>
          </Link>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)}>
              Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          )}
        </div>

        <div className="flex justify-center gap-1.5 pt-1">
          {STEPS.map((s, i) => (
            <button
              key={s.path}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-accent" : "w-1.5 bg-border hover:bg-accent/40"}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
