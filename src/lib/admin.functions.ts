import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { supabase, userId } = ctx;
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admin access required.");
}

const RoleEnum = z.enum(["student", "recruiter", "company_admin", "admin", "cms_editor"]);

/* ---------------- Users & Roles ---------------- */
export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().optional() }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    let q = supabase.from("profiles").select("id, full_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(200);
    if (data.q) q = q.ilike("full_name", `%${data.q}%`);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p: any) => p.id);
    let rolesMap: Record<string, string[]> = {};
    if (ids.length) {
      const { data: rs } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      for (const r of rs ?? []) (rolesMap[r.user_id] ||= []).push(r.role);
    }
    return (profiles ?? []).map((p: any) => ({ ...p, roles: rolesMap[p.id] ?? [] }));
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid(), role: RoleEnum }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { error } = await supabase.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error && !`${error.message}`.includes("duplicate")) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "grant_role", _entity_type: "user", _entity_id: data.user_id, _metadata: { role: data.role } });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid(), role: RoleEnum }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "revoke_role", _entity_type: "user", _entity_id: data.user_id, _metadata: { role: data.role } });
    return { ok: true };
  });

/* ---------------- Jobs ---------------- */
export const listAllJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().optional(), source: z.string().optional() }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    let q = supabase.from("jobs").select("id, title, location, status, source, is_scraped, application_count, application_cap, created_at, source_url, companies(name)").order("created_at", { ascending: false }).limit(200);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.source) q = q.eq("source", data.source);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    location: z.string().nullable().optional(),
    status: z.enum(["open", "closed", "draft"]).optional(),
    application_cap: z.number().int().min(0).nullable().optional(),
  }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { id, ...patch } = data;
    const { error } = await supabase.from("jobs").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "update", _entity_type: "job", _entity_id: id, _metadata: patch });
    return { ok: true };
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { error } = await supabase.from("jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "delete", _entity_type: "job", _entity_id: data.id, _metadata: {} });
    return { ok: true };
  });

/* ---------------- Blog / CMS ---------------- */
const BlogInput = z.object({
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, "lowercase, digits and dashes only"),
  excerpt: z.string().max(400).optional(),
  body_md: z.string().min(1),
  cover_image_url: z.string().url().nullable().optional(),
  tags: z.array(z.string()).max(20).optional(),
  published: z.boolean().default(false),
});

export const listBlogPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { data, error } = await supabase.from("blog_posts").select("id, title, slug, published, created_at, updated_at").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid().optional() }).merge(BlogInput).parse(i))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isCms } = await supabase.rpc("has_role", { _user_id: userId, _role: "cms_editor" });
    if (!isAdmin && !isCms) throw new Error("Editor access required.");
    const { id, ...post } = data;
    const payload: any = { ...post, author_id: userId };
    if (post.published && !id) payload.published_at = new Date().toISOString();
    if (id) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await supabase.rpc("log_admin_action", { _action: "update", _entity_type: "blog_post", _entity_id: id, _metadata: {} });
      return { id };
    }
    const { data: row, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "create", _entity_type: "blog_post", _entity_id: row.id, _metadata: {} });
    return { id: row.id };
  });

export const deleteBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { error } = await supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "delete", _entity_type: "blog_post", _entity_id: data.id, _metadata: {} });
    return { ok: true };
  });

/* ---------------- Subscriptions ---------------- */
export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { data, error } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const grantSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    user_id: z.string().uuid(),
    tier: z.enum(["free", "pro", "team"]),
    months: z.number().int().min(1).max(60).default(1),
  }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const now = new Date();
    const ends = new Date(now.getTime() + data.months * 30 * 24 * 3600 * 1000).toISOString();
    const { data: existing } = await supabase.from("subscriptions").select("id").eq("user_id", data.user_id).maybeSingle();
    const payload = { user_id: data.user_id, tier: data.tier, status: "active", current_period_end: ends };
    if (existing) {
      await supabase.from("subscriptions").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert(payload);
    }
    await supabase.rpc("log_admin_action", { _action: "grant_subscription", _entity_type: "subscription", _entity_id: data.user_id, _metadata: { tier: data.tier, months: data.months } });
    return { ok: true };
  });

export const revokeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    await supabase.from("subscriptions").update({ status: "canceled", tier: "free" }).eq("user_id", data.user_id);
    await supabase.rpc("log_admin_action", { _action: "revoke_subscription", _entity_type: "subscription", _entity_id: data.user_id, _metadata: {} });
    return { ok: true };
  });

/* ---------------- Audit ---------------- */
export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/* ---------------- Cron status ---------------- */
export const getScrapeSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("job_sources").select("name, enabled, last_scraped_at, last_status");
    return { schedule: "Every 12 hours (00:00 & 12:00 UTC)", sources: data ?? [] };
  });
