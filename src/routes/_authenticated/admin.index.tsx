import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Users, Briefcase, FileText, CreditCard, ScrollText, KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — CareerPilot" }] }),
  component: AdminHub,
});

const tiles = [
  { to: "/admin/users", label: "Users & Roles", icon: Users, hint: "Grant/revoke roles" },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase, hint: "Edit or delete any job" },
  { to: "/admin/scraping", label: "Job Sources", icon: Globe, hint: "Scrapers · schedule · run" },
  { to: "/admin/blog", label: "Blog / CMS", icon: FileText, hint: "Create & publish posts" },
  {
    to: "/admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    hint: "Grant Pro / revoke",
  },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText, hint: "Every admin action" },
  { to: "/admin/settings", label: "Settings", icon: KeyRound, hint: "Manage AI provider keys" },
] as const;

function AdminHub() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Admin console</h1>
          <p className="text-sm text-muted-foreground">
            Full editing & deletion powers across the platform. Every write is audit-logged.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Link key={t.to} to={t.to} className="group">
              <Card className="h-full transition-colors group-hover:border-coral">
                <CardContent className="flex items-start gap-3 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <t.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
