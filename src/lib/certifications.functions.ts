import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCertifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const [{ data: certs }, { data: profile }] = await Promise.all([
      supabase.from("certifications").select("*").order("field", { ascending: true }),
      supabase.from("career_profiles").select("industry, target_role").eq("user_id", userId).maybeSingle(),
    ]);
    return { certifications: certs ?? [], userField: profile?.industry ?? null };
  });
