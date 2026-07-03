import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, MapPin, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicJobsPreview } from "@/lib/public-jobs.functions";
import heroImg from "@/assets/hero-landing.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot — Careers, clarified for Africa's next generation" },
      { name: "description", content: "An editorial career platform for students and early-career professionals: live jobs from across Africa and remote, ATS-ready resumes, employability scoring, and mentorship — one calm home for your working life." },
      { property: "og:title", content: "CareerPilot — Careers, clarified" },
      { property: "og:description", content: "Live jobs, ATS resumes, employability scoring, and mentorship in one editorial home." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const previewFn = useServerFn(getPublicJobsPreview);
  const { data: jobs } = useQuery({
    queryKey: ["public-jobs-preview"],
    queryFn: () => previewFn(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 text-base font-medium tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              <Compass className="h-4 w-4" />
            </span>
            <span className="font-display text-lg">CareerPilot</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#jobs" className="transition-colors hover:text-foreground">Jobs</a>
            <a href="#pillars" className="transition-colors hover:text-foreground">What we do</a>
            <a href="#story" className="transition-colors hover:text-foreground">The journey</a>
            <Link to="/auth" className="transition-colors hover:text-foreground">Sign in</Link>
          </nav>
          <Button asChild size="sm" className="rounded-full px-4">
            <Link to="/auth">Join CareerPilot</Link>
          </Button>
        </div>
      </header>

      {/* Editorial hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:gap-14 md:py-24 lg:py-28">
          <div className="flex flex-col justify-center">
            <p className="mb-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Issue 01 · Careers, clarified
            </p>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
              A quieter place<br />to build your<br />
              <span className="italic text-accent">working life.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              CareerPilot is a calm, editorial home for the messy middle of a career — real jobs from across Africa and remote, an ATS-ready resume, and a straight answer to <em>what do I do next</em>.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/auth">Create your profile <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <a href="#jobs" className="text-sm font-medium underline-offset-4 hover:underline">
                Browse today's jobs →
              </a>
            </div>
          </div>
          <figure className="relative overflow-hidden rounded-2xl border border-border/60 bg-secondary shadow-sm">
            <img
              src={heroImg}
              alt="A young professional stands with a suitcase looking out over the Nairobi skyline at sunrise."
              width={1600}
              height={1152}
              className="h-full w-full object-cover"
            />
            <figcaption className="absolute bottom-3 left-3 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              Photograph — Aisha, product designer, Nairobi
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Live jobs strip */}
      <section id="jobs" className="border-b border-border/60 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Today's board</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                Real jobs, updated every 12 hours.
              </h2>
            </div>
            <Link to="/jobs" className="hidden text-sm font-medium underline-offset-4 hover:underline md:inline">
              See all →
            </Link>
          </div>
          {jobs && jobs.length > 0 ? (
            <ul className="divide-y divide-border/60 border-y border-border/60">
              {jobs.map((j) => (
                <li key={j.id} className="group grid grid-cols-1 gap-2 py-5 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
                  <div>
                    <p className="font-display text-lg leading-snug group-hover:text-accent">
                      <Link to="/jobs">{j.title}</Link>
                    </p>
                    {j.description && (
                      <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{j.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-muted-foreground">
                    {j.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {j.location}
                      </span>
                    )}
                    {j.source && <span className="rounded-full border border-border px-2 py-0.5">{j.source}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/50 p-10 text-center">
              <p className="font-display text-xl">The board opens the moment you sign in.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We're indexing across BrighterMonday, Fuzu, MyJobMag, RemoteOK, WeWorkRemotely and company career pages. Your first list will be waiting.
              </p>
              <Button asChild className="mt-6 rounded-full">
                <Link to="/auth">Sign in to unlock →</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Pillars */}
      <section id="pillars" className="border-b border-border/60 py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 md:grid-cols-3">
          {[
            { kicker: "01 — Signal", title: "An honest employability read", body: "A weekly score across skills, experience and evidence. No vanity metrics." },
            { kicker: "02 — Craft", title: "A resume ATS actually reads", body: "Upload PDF or DOCX and get keyword-tuned rewrites in your voice — not the internet's." },
            { kicker: "03 — Motion", title: "Applications that move", body: "Track every application in one pipeline. Shortlisted, interviewing, offered — all in one place." },
          ].map((p) => (
            <div key={p.kicker}>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{p.kicker}</p>
              <h3 className="mt-3 font-display text-2xl leading-snug tracking-tight">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story teaser */}
      <section id="story" className="border-b border-border/60 bg-secondary/50 py-20 md:py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">A guided journey</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            From your door to the runway.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Every new member is walked through CareerPilot as if you were leaving home for the airport — house, cab, highway, terminal, gate, cockpit. Seven quiet scenes. Seven clear things to do.
          </p>
          <Button asChild variant="outline" className="mt-8 rounded-full">
            <Link to="/auth">Start the walkthrough</Link>
          </Button>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            The next chapter is <span className="italic text-accent">yours to write.</span>
          </h2>
          <Button asChild size="lg" className="mt-8 rounded-full px-8">
            <Link to="/auth">Join CareerPilot — it's free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">2 free AI runs each month · no card required</p>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted-foreground md:flex-row">
          <p>&copy; {new Date().getFullYear()} CareerPilot. Made for Africa's next generation of professionals.</p>
          <div className="flex items-center gap-5">
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <a href="#pillars" className="hover:text-foreground">What we do</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
