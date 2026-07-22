import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Compass, LayoutDashboard, FileCheck2, Target, Brain, Sparkles,
  Briefcase, Bell, LogOut, Menu, X, User, ClipboardList, Building2, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpButton } from "@/components/help-button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getMyRoles } from "@/lib/jobs.functions";
import { RegionLanguageSwitcher } from "@/components/region-language-switcher";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const baseNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Your at-a-glance overview — employability score, active applications, and today's free AI runs remaining." },
  { to: "/employability", label: "Employability", icon: Target, hint: "A computed, evidence-based score of how ready you are for your target role, with an AI-written explanation." },
  { to: "/skill-gap", label: "Skill Gap", icon: Brain, hint: "Browse real certifications, or run a personalized analysis of exactly which skills you're missing for your target role." },
  { to: "/resume", label: "Resume / ATS", icon: FileCheck2, hint: "Upload your resume — get an ATS score, rewritten bullets, and a history of every past analysis." },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles, hint: "Explore real career paths, or generate personalized paths, a cover letter, and interview prep from your profile." },
  { to: "/jobs", label: "Jobs", icon: Briefcase, hint: "Browse live-scraped roles, refreshed every 12 hours, and apply directly." },
  { to: "/applications", label: "My Applications", icon: ClipboardList, hint: "Track every application's status, see response-rate analytics, and message recruiters." },
] as const;

const recruiterNav = [
  { to: "/recruiter", label: "Recruiter", icon: Building2, hint: "Post jobs, review applicants, and manage your hiring pipeline." },
] as const;

const adminNav = [
  { to: "/admin", label: "Admin console", icon: Shield, hint: "Manage users, jobs, job sources, blog content, subscriptions, and AI provider keys." },
] as const;

export function AppShell({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rolesFn = useServerFn(getMyRoles);
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn(), staleTime: 60_000 });
  const { data: unreadCount } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const isRecruiter = (roles ?? []).some((r) => ["recruiter", "company_admin", "admin"].includes(r));
  const isAdmin = (roles ?? []).includes("admin");
  const nav = [
    ...baseNav,
    ...(isRecruiter ? recruiterNav : []),
    ...(isAdmin ? adminNav : []),
  ];

  useEffect(() => setOpen(false), [location.pathname]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-coral text-white">
              <Compass className="h-5 w-5" />
            </span>
            CareerPilot
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          <TooltipProvider delayDuration={300}>
            {nav.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-56">
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-primary-foreground/75">{item.hint}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
          <Link to="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
            <User className="h-4 w-4" /> Profile
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <RegionLanguageSwitcher className="hidden sm:flex" />
            <HelpButton />
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative" onClick={() => navigate({ to: "/dashboard" })}>
              <Bell className="h-4 w-4" />
              {!!unreadCount && unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}