import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";

const TOUR = [
  { title: "Dashboard", body: "Your at-a-glance overview: employability score, active applications, and AI runs used this month." },
  { title: "Employability", body: "Get an AI-scored breakdown of your readiness for your target role." },
  { title: "Skill Gap", body: "Paste a target role or job description; we'll surface the exact skills to learn." },
  { title: "Resume / ATS", body: "Upload your resume (PDF/DOCX). We score it against ATS systems and rewrite weak sections." },
  { title: "Recommendations", body: "AI-generated career paths, tailored cover letters, and interview prep." },
  { title: "Jobs", body: "Browse scraped opportunities, track applications, and run compatibility checks (2 free per month)." },
];

export function HelpButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Help">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome to CareerPilot AI</DialogTitle>
          <DialogDescription>A quick tour of the main areas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {TOUR.map((t, i) => (
            <div key={t.title} className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-white">{i + 1}</div>
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-muted-foreground">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}