import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { Compass, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — CareerPilot AI" },
      { name: "description", content: "Sign in or create your CareerPilot AI account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect || "/dashboard" });
    });
  }, [navigate, redirect]);

  const handleGoogle = async () => {
    setLoading(true);
    // Native Supabase OAuth — this replaces a call to Lovable's own hosted
    // OAuth broker (@lovable.dev/cloud-auth-js), which only worked inside
    // Lovable's own hosting and did nothing on this standalone deployment.
    // Requires Google to actually be enabled as a provider in Supabase's
    // Auth settings (Authentication → Providers → Google) with a real
    // Client ID/Secret — this code path is correct, but won't do anything
    // useful until that's configured on the Supabase side.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirect || "/dashboard"}` },
    });
    if (error) {
      toast.error("Google sign-in failed", { description: error.message });
      setLoading(false);
    }
    // On success, Supabase redirects the browser away to Google immediately
    // — no further code here runs. The session is picked up automatically
    // when the browser lands back on this app.
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-coral/20 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-teal/20 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-2xl"
      >
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-coral text-white">
            <Compass className="h-5 w-5" />
          </span>
          CareerPilot <span className="text-coral">AI</span>
        </Link>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <EmailForm mode="signin" redirect={redirect} />
          </TabsContent>
          <TabsContent value="signup">
            <p className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              Free accounts get <span className="font-medium text-foreground">7 AI runs a day</span> (vs. 2 without one),
              plus resume ATS scoring, skill-gap analysis, and a saved career profile.
            </p>
            <EmailForm mode="signup" redirect={redirect} />
          </TabsContent>
        </Tabs>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms & Privacy.
        </p>
      </motion.div>
    </div>
  );
}

function EmailForm({ mode, redirect }: { mode: "signin" | "signup"; redirect?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.session) {
          // Email confirmation is off for this project — the account is
          // active immediately, safe to continue straight in.
          toast.success("Account created. Welcome!");
          navigate({ to: redirect || "/dashboard" });
        } else {
          // Email confirmation is required — there's no session yet.
          // Previously this navigated to /dashboard anyway, which is a
          // route that requires an active session, so it would have shown
          // the visitor a broken or logged-out screen right after telling
          // them "Welcome." Show a clear, app-branded pending state instead
          // of navigating anywhere.
          setAwaitingVerification(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in.");
        navigate({ to: redirect || "/dashboard" });
      }
    } catch (err) {
      toast.error(mode === "signup" ? "Sign-up failed" : "Sign-in failed", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email) return toast.error("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent.");
  };

  const resend = async () => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) toast.error(error.message);
    else toast.success("Verification email re-sent.");
  };

  if (awaitingVerification) {
    return (
      <div className="mt-6 space-y-4 rounded-lg border border-border bg-secondary/30 p-5 text-center">
        <Mail className="mx-auto h-8 w-8 text-accent" />
        <div>
          <p className="font-medium">Verify your CareerPilot account</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We've sent a verification link to <span className="font-medium text-foreground">{email}</span>.
            Open it to activate your account — then come back and sign in.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <button type="button" onClick={resend} className="underline hover:text-foreground">Resend email</button>
          <span>·</span>
          <button type="button" onClick={() => setAwaitingVerification(false)} className="underline hover:text-foreground">Back</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === "signin" && (
            <button type="button" onClick={resetPassword} className="text-xs text-muted-foreground hover:text-foreground">
              Forgot?
            </button>
          )}
        </div>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === "signup" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}