import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY — uses the Supabase Admin API to generate a real signup
// confirmation link and inspect it directly, so we can verify the Site URL
// fix without needing access to a real email inbox. Remove after checking.
export const Route = createFileRoute("/api/public/hooks/check-confirm-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const testEmail = `link-check-${Date.now()}@careerpilot-demo.io`;
        try {
          const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "signup",
            email: testEmail,
            password: "TempCheck2026!",
            options: { redirectTo: "https://career-compass-ai-9cd6f40c.vercel.app/dashboard" },
          });
          if (error) throw error;
          // Clean up the test user immediately — we only needed the link shape.
          if (data.user?.id) {
            await supabaseAdmin.auth.admin.deleteUser(data.user.id);
          }
          return Response.json({
            ok: true,
            action_link: data.properties?.action_link,
            redirect_to_used: data.properties?.redirect_to,
          });
        } catch (err: any) {
          return Response.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
        }
      },
    },
  },
});
