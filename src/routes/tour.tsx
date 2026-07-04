import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Compass, Upload, Target, Sparkles, Briefcase, LineChart, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tour")({
  head: () => ({
    meta: [
      { title: "How CareerPilot works — 60-second tour" },
      { name: "description", content: "A quick walkthrough of how CareerPilot turns your profile into matched roles, sharp applications, and interview readiness." },
      { property: "og:title", content: "How CareerPilot works" },
      { property: "og:description", content: "60-second tour of the CareerPilot journey." },
    ],
  }),
  component: TourPage,
});

const scenes = [
  { icon: Compass, title: "Tell us where you're heading", body: "Share your target role, skills, and where you want to work. Three minutes, no fluff." },
  { icon: Upload, title: "Bring your resume", body: "Upload once. We parse it, score it against ATS systems, and keep it handy for one-click applying." },
  { icon: Target, title: "See your fit, honestly", body: "Employability score, skill-gap map, and the exact next steps to close each gap." },
  { icon: Sparkles, title: "Get matched roles", body: "Fresh jobs from Kenya, remote, and freelance boards — ranked by how well they fit you." },
  { icon: Briefcase, title: "Apply with signal", body: "Tailored cover letters, interview prep, and application tracking in one place." },
  { icon: LineChart, title: "Track your momentum", body: "Applications, responses, and improvements over time — so you know what's working." },
  { icon: PartyPopper, title: "You're ready", body: "Head to your feed and pick your next move." },
] as const;

function TourPage() {
  const [i, setI] = useState(0);
  const scene = scenes[i];
  const Icon = scene.icon;
  const last = i === scenes.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:underline">← Home</Link>
          <p className="text-xs text-muted-foreground">{i + 1} / {scenes.length}</p>
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${((i + 1) / scenes.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-8 w-8" />
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{scene.title}</h1>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground">{scene.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex gap-1.5">
            {scenes.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-1.5 w-6 rounded-full transition-colors ${idx === i ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          {last ? (
            <Button asChild><Link to="/dashboard">Go to my feed <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          ) : (
            <Button onClick={() => setI((v) => Math.min(scenes.length - 1, v + 1))}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}