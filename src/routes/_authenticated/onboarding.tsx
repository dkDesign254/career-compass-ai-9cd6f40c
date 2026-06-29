import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — CareerPilot AI" }] }),
  component: Onboarding,
});

function Onboarding() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader><CardTitle>Onboarding wizard</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">The full 5-step onboarding wizard (goals, skills, education, work history, resume upload) ships in Run 2 along with the AI modules.</p>
            <Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}