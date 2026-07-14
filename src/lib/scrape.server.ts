// Server-only Firecrawl helper. Never import from client code.
import Firecrawl from "@mendable/firecrawl-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getFirecrawl() {
  // Prefer the key set at /admin/settings (Vault-backed), fall back to an
  // env var for local dev if someone sets one directly.
  const { data, error } = await supabaseAdmin.rpc("get_provider_key", { _provider: "firecrawl" });
  const apiKey = (!error && data) ? data : process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("No Firecrawl key configured. Add one at /admin/settings.");
  return new Firecrawl({ apiKey });
}

export type ScrapedJob = {
  title: string;
  company?: string;
  location?: string;
  url?: string;
  description?: string;
  employment_type?: string;
  work_mode?: "remote" | "hybrid" | "onsite";
};

const EXTRACTION_PROMPT =
  "Extract every distinct job posting listed on this page. Return an array 'jobs'. " +
  "For each: title (role), company (hiring org), location, url (absolute link to the posting), " +
  "a short description (<=280 chars), employment_type (full_time|part_time|contract|internship if visible), " +
  "and work_mode (remote|hybrid|onsite if visible). Skip navigation, ads, and unrelated links.";

const jobsSchema = {
  type: "object",
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          url: { type: "string" },
          description: { type: "string" },
          employment_type: { type: "string" },
          work_mode: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  required: ["jobs"],
} as const;

export async function scrapeJobsFromUrl(url: string): Promise<ScrapedJob[]> {
  const fc = await getFirecrawl();
  try {
    const res: any = await fc.scrape(url, {
      formats: [{ type: "json", schema: jobsSchema, prompt: EXTRACTION_PROMPT } as any],
      onlyMainContent: true,
    } as any);
    await supabaseAdmin.rpc("report_ai_key_result", { _provider: "firecrawl", _success: true });
    const json = res?.json ?? res?.data?.json ?? {};
    const jobs: ScrapedJob[] = Array.isArray(json.jobs) ? json.jobs : [];
    return jobs
      .filter((j) => j && typeof j.title === "string" && j.title.trim().length > 2)
      .slice(0, 40);
  } catch (e: any) {
    await supabaseAdmin.rpc("report_ai_key_result", {
      _provider: "firecrawl", _success: false, _error_message: (e?.message ?? String(e)).slice(0, 500),
    });
    throw e;
  }
}