import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Detects which import strategy fits the URL.
function classify(url: string): "linkedin" | "github" | "generic" {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com/in/")) return "linkedin";
  if (u.includes("github.com/")) return "github";
  return "generic";
}

const importedSchema = z.object({
  target_role: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  experience_level: z.string().nullable().optional(),
  target_locations: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  work_history: z
    .array(
      z.object({
        company: z.string().optional(),
        title: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        summary: z.string().optional(),
      }),
    )
    .optional(),
  education: z
    .array(z.object({ school: z.string().optional(), degree: z.string().optional(), year: z.string().optional() }))
    .optional(),
  certifications: z.array(z.string()).optional(),
  career_goals: z.string().nullable().optional(),
  projects: z
    .array(z.object({ name: z.string(), description: z.string().optional(), url: z.string().optional() }))
    .optional(),
});
export type ImportedProfile = z.infer<typeof importedSchema>;

// Preview: scrape + parse, DO NOT write to DB.
export const previewProfileImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ url: z.string().url() }).parse(i))
  .handler(async ({ data }) => {
    const kind = classify(data.url);

    // GitHub → public API only, no scraping/AI cost.
    if (kind === "github") {
      const username = data.url.split("github.com/")[1]?.split("/")[0]?.trim();
      if (!username) throw new Error("Couldn't read GitHub username from that URL.");
      const [userRes, repoRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`, { headers: { Accept: "application/vnd.github+json" } }),
        fetch(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated`, {
          headers: { Accept: "application/vnd.github+json" },
        }),
      ]);
      if (!userRes.ok) throw new Error(`GitHub user not found (${userRes.status}).`);
      const user: any = await userRes.json();
      const repos: any[] = repoRes.ok ? await repoRes.json() : [];
      const languages = new Set<string>();
      const projects = repos
        .filter((r: any) => !r.fork)
        .slice(0, 10)
        .map((r: any) => {
          if (r.language) languages.add(r.language);
          return { name: r.name as string, description: r.description ?? "", url: r.html_url as string };
        });
      const parsed: ImportedProfile = {
        target_role: user.bio ?? undefined,
        target_locations: user.location ? [user.location] : [],
        skills: [...languages],
        career_goals: user.bio ?? undefined,
        projects,
      };
      return { source: "github" as const, parsed };
    }

    // LinkedIn + generic → Firecrawl scrape + AI structure.
    const { getFirecrawl } = await import("./scrape.server");
    const fc = await getFirecrawl();
    let markdown = "";
    try {
      const res: any = await fc.scrape(data.url, { formats: ["markdown"], onlyMainContent: true } as any);
      markdown = res?.markdown ?? res?.data?.markdown ?? "";
    } catch (e: any) {
      throw new Error(
        kind === "linkedin"
          ? "LinkedIn blocks scrapers. Paste your CV instead, or import a public portfolio URL."
          : e?.message ?? "Couldn't fetch that page.",
      );
    }
    if (!markdown || markdown.length < 40) throw new Error("The page didn't return usable content.");

    const { getAiModel, reportAiResult, mapAiError, generateStructured } = await import("./ai-model.server");
    const { provider, model } = await getAiModel();

    try {
      const object = await generateStructured({
        model,
        schema: importedSchema,
        system: "You extract structured career profile data from web page content. Only include fields clearly present. Skills = concrete tools/languages. Keep summaries under 200 chars. If a section is missing, omit it.",
        prompt:
          "Read this professional profile / portfolio page and extract a structured career profile.\n\nPAGE MARKDOWN:\n" +
          markdown.slice(0, 12000),
      });
      await reportAiResult(provider, true);
      return { source: kind, parsed: object };
    } catch (err) {
      await reportAiResult(provider, false, err instanceof Error ? err.message : String(err));
      throw mapAiError(err);
    }
  });

// Apply: merge parsed fields into current user's career_profiles row.
// Non-destructive — only fills fields the parsed object provides.
export const applyProfileImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ parsed: importedSchema, mode: z.enum(["merge", "replace"]).default("merge") }).parse(i),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { data: existing } = await supabase
      .from("career_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const parsed = data.parsed;

    const pickList = (a?: unknown[], b?: unknown[]) => {
      if (data.mode === "replace") return (b as any[]) ?? (a as any[]) ?? [];
      const merged = [...((a as any[]) ?? []), ...((b as any[]) ?? [])];
      // de-dupe primitive lists
      if (merged.every((x) => typeof x === "string")) return Array.from(new Set(merged as string[]));
      return merged;
    };
    const pickScalar = <T,>(a: T | null | undefined, b: T | null | undefined) =>
      data.mode === "replace" ? (b ?? a ?? null) : (a ?? b ?? null);

    const row = {
      user_id: userId,
      target_role: pickScalar(existing?.target_role, parsed.target_role ?? null),
      industry: pickScalar(existing?.industry, parsed.industry ?? null),
      experience_level: pickScalar(existing?.experience_level, parsed.experience_level ?? null),
      target_locations: pickList(existing?.target_locations, parsed.target_locations),
      skills: pickList(existing?.skills, parsed.skills),
      work_history: pickList(existing?.work_history, parsed.work_history),
      education: pickList(existing?.education, parsed.education),
      certifications: pickList(existing?.certifications, parsed.certifications),
      career_goals: pickScalar(existing?.career_goals, parsed.career_goals ?? null),
    };

    const { error } = existing
      ? await supabase.from("career_profiles").update(row).eq("user_id", userId)
      : await supabase.from("career_profiles").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });