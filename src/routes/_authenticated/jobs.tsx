import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — CareerPilot AI" }] }),
  component: () => (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Briefcase className="h-12 w-12 text-coral" />
            <h1 className="font-display text-2xl font-bold">Jobs & Applications</h1>
            <p className="text-muted-foreground">The full job board, scraped from LinkedIn, Indeed, BrighterMonday and more, lands in <strong>Run 4</strong>.</p>
            <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  ),
});