import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY — verifies runAnonEmployabilityCheck() end to end (quota RPC +
// deterministic scoring + AI narrative) without needing a real browser
// session. Remove after confirming.
export const Route = createFileRoute("/api/public/hooks/anon-check-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }
        const { runAnonEmployabilityCheck } = await import("@/lib/ai.functions");
        const deviceId = crypto.randomUUID();
        try {
          const result = await runAnonEmployabilityCheck({
            data: {
              device_id: deviceId,
              target_role: "Junior Software Engineer",
              industry: "Software Engineering",
              experience_level: "entry",
              skills: ["JavaScript", "React", "SQL"],
            },
          });
          // Also confirm the quota actually blocks a 3rd call for the same device.
          await runAnonEmployabilityCheck({
            data: {
              device_id: deviceId,
              target_role: "Junior Software Engineer",
              industry: "Software Engineering",
              experience_level: "entry",
              skills: ["JavaScript"],
            },
          });
          let thirdCallBlocked = false;
          let thirdCallError = "";
          try {
            await runAnonEmployabilityCheck({
              data: {
                device_id: deviceId,
                target_role: "Junior Software Engineer",
                industry: "Software Engineering",
                experience_level: "entry",
                skills: ["JavaScript"],
              },
            });
          } catch (e: any) {
            thirdCallBlocked = true;
            thirdCallError = e?.message ?? String(e);
          }
          return Response.json({ ok: true, firstCallResult: result, thirdCallBlocked, thirdCallError });
        } catch (err: any) {
          return Response.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
        }
      },
    },
  },
});
