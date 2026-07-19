import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getJobAlertPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data } = await supabase
      .from("job_alert_preferences")
      .select("keywords, work_modes, enabled")
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? { keywords: [], work_modes: [], enabled: true };
  });

const SavePrefsSchema = z.object({
  keywords: z.array(z.string().min(1).max(40)).max(15),
  work_modes: z.array(z.enum(["remote", "hybrid", "onsite"])).max(3),
  enabled: z.boolean(),
});

export const saveJobAlertPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SavePrefsSchema.parse(i))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("job_alert_preferences")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
