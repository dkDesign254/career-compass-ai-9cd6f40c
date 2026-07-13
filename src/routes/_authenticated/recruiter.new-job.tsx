import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createJob } from "@/lib/recruiter.functions";

export const Route = createFileRoute("/_authenticated/recruiter/new-job")({
  head: () => ({ meta: [{ title: "Post a job — CareerPilot AI" }] }),
  component: NewJobPage,
});

function NewJobPage() {
  const fn = useServerFn(createJob);
  const navigate = useNavigate();
  const [f, setF] = useState({
    title: "",
    company_name: "",
    description: "",
    requirements: "",
    location: "",
    work_mode: "remote" as "remote" | "hybrid" | "onsite",
    employment_type: "full_time" as "full_time" | "part_time" | "contract" | "internship",
    salary_min: "",
    salary_max: "",
    salary_currency: "USD",
    skills: "",
    deadline: "",
  });
  const m = useMutation({
    mutationFn: () =>
      fn({
        data: {
          title: f.title,
          company_name: f.company_name,
          description: f.description,
          requirements: f.requirements || undefined,
          location: f.location || undefined,
          work_mode: f.work_mode,
          employment_type: f.employment_type,
          salary_min: f.salary_min ? Number(f.salary_min) : undefined,
          salary_max: f.salary_max ? Number(f.salary_max) : undefined,
          salary_currency: f.salary_currency,
          skills: f.skills
            ? f.skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          deadline: f.deadline || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success("Job posted");
      navigate({ to: "/recruiter/applicants/$jobId", params: { jobId: res.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to post"),
  });

  const set = (k: keyof typeof f) => (e: any) =>
    setF((p) => ({ ...p, [k]: typeof e === "string" ? e : e.target.value }));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/recruiter">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to recruiter
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Post a new role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Job title *</Label>
                <Input
                  value={f.title}
                  onChange={set("title")}
                  placeholder="e.g. Junior Data Analyst"
                />
              </div>
              <div className="space-y-2">
                <Label>Company name *</Label>
                <Input value={f.company_name} onChange={set("company_name")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                rows={6}
                value={f.description}
                onChange={set("description")}
                placeholder="What the role does, who you're looking for…"
              />
            </div>
            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea
                rows={4}
                value={f.requirements}
                onChange={set("requirements")}
                placeholder="Must-have skills, qualifications…"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={f.location} onChange={set("location")} placeholder="Nairobi, Kenya" />
              </div>
              <div className="space-y-2">
                <Label>Work mode</Label>
                <Select
                  value={f.work_mode}
                  onValueChange={(v) => setF((p) => ({ ...p, work_mode: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={f.employment_type}
                  onValueChange={(v) => setF((p) => ({ ...p, employment_type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Salary min</Label>
                <Input type="number" value={f.salary_min} onChange={set("salary_min")} />
              </div>
              <div className="space-y-2">
                <Label>Salary max</Label>
                <Input type="number" value={f.salary_max} onChange={set("salary_max")} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={f.salary_currency} onChange={set("salary_currency")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Skills (comma-separated)</Label>
              <Input value={f.skills} onChange={set("skills")} placeholder="SQL, Python, Tableau" />
            </div>
            <div className="space-y-2">
              <Label>Application deadline</Label>
              <Input type="date" value={f.deadline} onChange={set("deadline")} />
            </div>
            <p className="text-xs text-muted-foreground">
              Free tier: 30 applications per job. Upgrade to Recruiter Pro to lift the cap.
            </p>
            <Button
              onClick={() => m.mutate()}
              disabled={m.isPending || !f.title || !f.company_name || f.description.length < 20}
              className="bg-brand hover:bg-brand/90"
            >
              {m.isPending ? "Posting…" : "Post job"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
