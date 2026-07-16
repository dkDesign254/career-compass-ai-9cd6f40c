import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { RegionLanguageSwitcher } from "@/components/region-language-switcher";
import { ArrowRight, MapPin, Compass, Search, Star, TrendingUp, Users, Sparkles, Building2, Linkedin, Instagram, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getPublicJobsPreview } from "@/lib/public-jobs.functions";
import heroImg from "@/assets/hero-handshake.jpg";
import catTech from "@/assets/cat-tech.jpg";
import catMarketing from "@/assets/cat-marketing.jpg";
import catFinance from "@/assets/cat-finance.jpg";
import catDesign from "@/assets/cat-design.jpg";
import t1 from "@/assets/testimonial-1.jpg";
import t2 from "@/assets/testimonial-2.jpg";
import t3 from "@/assets/testimonial-3.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CareerPilot, where Africa's next generation launches their career" },
      { name: "description", content: "Discover thousands of jobs, internships, and employers. AI resume review, employability scoring, and personal matching built for students and graduates across Africa." },
      { property: "og:title", content: "CareerPilot, launch your career" },
      { property: "og:description", content: "Thousands of live jobs and internships, AI resume review, and matched employers. Free for students and grads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const CATEGORIES = [
  { label: "Software & Data", image: catTech, count: "1,240+ roles", tint: "bg-sky" },
  { label: "Design & Product", image: catDesign, count: "480+ roles", tint: "bg-butter" },
  { label: "Marketing & Growth", image: catMarketing, count: "820+ roles", tint: "bg-peach" },
  { label: "Finance & Ops", image: catFinance, count: "610+ roles", tint: "bg-mint" },
] as const;

const EMPLOYERS = ["Safaricom", "M-KOPA", "Copia", "Andela", "Flutterwave", "Twiga Foods", "Kenya Airways", "Cellulant", "Jumia", "The Lucrebag"] as const;

const TESTIMONIALS = [
  { name: "Kwame O.", role: "Software Engineer · Andela", quote: "The ATS score alone got my resume through three companies that had rejected me before. Landed my first remote role in six weeks.", img: t2 },
  { name: "Amina H.", role: "Product Marketing · Safaricom", quote: "I stopped guessing what recruiters wanted. CareerPilot showed me the skills to add and the roles that actually matched.", img: t3 },
  { name: "Brian M.", role: "Data Analyst · M-KOPA", quote: "Every morning I open one tab and see three roles I could apply to. It replaced five job boards and a spreadsheet.", img: t1 },
] as const;

function Landing() {
  const previewFn = useServerFn(getPublicJobsPreview);
  const { data: jobs } = useQuery({
    queryKey: ["public-jobs-preview"],
    queryFn: () => previewFn(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav, Handshake style */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Compass className="h-5 w-5" />
            </span>
            <span className="font-display text-xl">CareerPilot</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-foreground/80 md:flex">
            <a href="#jobs" className="transition-colors hover:text-accent">Jobs</a>
            <a href="#categories" className="transition-colors hover:text-accent">Explore</a>
            <a href="#employers" className="transition-colors hover:text-accent">Employers</a>
            <a href="#pillars" className="transition-colors hover:text-accent">For students</a>
            <Link to="/auth" className="transition-colors hover:text-accent">Sign in</Link>
          </nav>
          <div className="flex items-center gap-2">
            <RegionLanguageSwitcher className="hidden lg:flex" />
            <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex"><Link to="/auth">Log in</Link></Button>
            <Button asChild size="sm" className="rounded-full bg-accent px-5 text-accent-foreground hover:bg-accent/90"><Link to="/auth">Sign up free</Link></Button>
          </div>
        </div>
      </header>

      {/* HERO, Handshake style, image right, search left */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-secondary/60 via-background to-background">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.1fr_1fr] md:gap-16 md:py-24 lg:py-28">
          <div className="flex flex-col justify-center">
            <Badge className="mb-6 w-fit rounded-full border-none bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              <Sparkles className="mr-1 h-3 w-3" /> Free for students & graduates
            </Badge>
            <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight text-primary sm:text-6xl md:text-7xl">
              The career<br />network built for <span className="text-accent">you.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Thousands of jobs and internships across Africa and remote. AI resume review, employability scoring, and personal matching, all in one home for everything after graduation.
            </p>

            {/* Search bar (Handshake vibe) */}
            <div className="mt-9 flex items-center gap-2 rounded-full border border-border bg-card p-2 shadow-sm ring-soft max-w-xl">
              <Search className="ml-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="border-none bg-transparent shadow-none focus-visible:ring-0"
                placeholder="Search 3,000+ jobs, e.g. 'product designer, Nairobi'"
                readOnly
                onClick={() => (window.location.href = "/browse")}
              />
              <Button asChild size="sm" className="rounded-full bg-primary px-5 hover:bg-primary/90">
                <Link to="/browse">Search</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><span><b className="text-foreground">42,000+</b> students</span></div>
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-accent" /><span><b className="text-foreground">1,200+</b> employers</span></div>
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /><span><b className="text-foreground">6 weeks</b> avg. to hire</span></div>
            </div>
          </div>

          <figure className="relative overflow-hidden rounded-3xl border border-border/60 shadow-xl ring-soft">
            <img
              src={heroImg}
              alt="Diverse young African students collaborating on laptops in a sunlit coworking space."
              width={1600}
              height={1100}
              className="h-full w-full object-cover"
            />
            {/* floating stat card */}
            <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-border bg-card p-4 shadow-lg md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent"><TrendingUp className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Your employability</p>
                  <p className="font-display text-lg font-semibold text-primary">72 <span className="text-xs text-accent">+8 this week</span></p>
                </div>
              </div>
            </div>
            <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-primary shadow backdrop-blur">
              3 new roles for you today
            </div>
          </figure>
        </div>
      </section>

      {/* Employer trust strip */}
      <section id="employers" className="border-b border-border/60 bg-secondary/40 py-10">
        <div className="mx-auto max-w-7xl px-5">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Trusted by teams hiring across Africa
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {EMPLOYERS.map((e, i) => (
              <motion.span
                key={e}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileHover={{ scale: 1.06 }}
                className="cursor-default font-display text-lg font-semibold tracking-tight text-foreground/40 transition-colors hover:text-accent"
              >
                {e}
              </motion.span>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Job listings sourced live from BrighterMonday, Fuzu, MyJobMag, RemoteOK, and We Work Remotely — refreshed every 12 hours.
          </p>
        </div>
      </section>

      {/* CATEGORY GRID, Fuzu-density imagery */}
      <section id="categories" className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Explore</p>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-primary">Find your path.</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">Browse thousands of roles by field, from software to marketing, finance to design.</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <Link key={c.label} to="/browse" className="group relative block overflow-hidden rounded-2xl border border-border/60 ring-soft transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <div className={`aspect-[4/5] w-full ${c.tint}`}>
                  <img src={c.image} alt={c.label} loading="lazy" width={900} height={700} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent transition-opacity duration-300 group-hover:from-accent/95" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent transition-colors group-hover:text-white">{c.count}</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold text-white">{c.label}</h3>
                  <p className="mt-2 max-h-0 overflow-hidden text-sm text-white/85 opacity-0 transition-all duration-300 group-hover:mt-2 group-hover:max-h-12 group-hover:opacity-100">
                    See your roadmap: skills to build, roles to target, next steps →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE JOBS, dense grid */}
      <section id="jobs" className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Today's board</p>
              <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-primary">Real jobs, updated every 12 hours.</h2>
            </div>
            <Button asChild variant="outline" className="hidden rounded-full md:inline-flex"><Link to="/browse">See all jobs <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
          {jobs && jobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((j) => (
                <Link key={j.id} to="/browse/$jobId" params={{ jobId: j.id }} className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-semibold leading-tight text-primary group-hover:text-accent">{j.title}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{j.source ?? "Verified employer"}</p>
                    </div>
                  </div>
                  {j.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{j.description}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {j.location && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                    {j.source && <span className="rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent">{j.source}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 p-10 text-center">
              <p className="font-display text-xl text-primary">The full board opens the moment you sign in.</p>
              <p className="mt-2 text-sm text-muted-foreground">Indexing BrighterMonday, Fuzu, MyJobMag, RemoteOK, WeWorkRemotely and company career pages every 12 hours.</p>
              <Button asChild className="mt-6 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/auth">Sign up free →</Link></Button>
            </div>
          )}
        </div>
      </section>

      {/* PILLARS, split image + copy */}
      <section id="pillars" className="border-b border-border/60 py-24">
        <div className="mx-auto max-w-7xl space-y-24 px-5">
          {[
            { kicker: "Employability score", title: "Know exactly where you stand.", body: "A weekly AI read across your skills, experience, and evidence, with clear next steps to raise it. No vanity metrics, no guessing.", image: catTech, reverse: false },
            { kicker: "ATS resume review", title: "Get past the robots. Land the interview.", body: "Upload your resume in PDF or DOCX and get keyword-tuned rewrites in your voice. Built to pass the real ATS filters used by Safaricom, Andela, and 1,200+ employers.", image: catDesign, reverse: true },
            { kicker: "Personal job matching", title: "Three great roles a day. Not three hundred.", body: "We match you to jobs by skill, location, and fit, then track every application in one pipeline. Shortlisted, interviewing, offered.", image: catMarketing, reverse: false },
          ].map((p) => (
            <div key={p.kicker} className={`grid gap-10 md:grid-cols-2 md:items-center md:gap-16 ${p.reverse ? "md:[&>figure]:order-2" : ""}`}>
              <figure className="overflow-hidden rounded-3xl border border-border/60 ring-soft">
                <img src={p.image} alt="" loading="lazy" width={900} height={700} className="h-full w-full object-cover" />
              </figure>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{p.kicker}</p>
                <h3 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight text-primary">{p.title}</h3>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{p.body}</p>
                <Button asChild className="mt-6 rounded-full bg-primary hover:bg-primary/90"><Link to="/auth">Try it free <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-b border-border/60 bg-secondary/50 py-24">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">From our members</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-primary">Careers, actually launched.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-3xl border border-border bg-card p-6 ring-soft">
                <div className="mb-4 flex text-accent">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <blockquote className="flex-1 text-base leading-relaxed text-foreground">"{t.quote}"</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <img src={t.img} alt={t.name} loading="lazy" width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-primary">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING CTA, bold */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center", mixBlendMode: "overlay" }} />
        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <h2 className="font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Your next chapter <span className="text-accent">starts here.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">Free forever for students and graduates. 2 free AI runs each month. No card required.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full bg-accent px-8 text-accent-foreground hover:bg-accent/90">
              <Link to="/auth">Sign up free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-white/40 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white">
              <Link to="/auth">I'm an employer</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Compass className="h-4 w-4" /></span>
              <span className="font-display text-lg">CareerPilot</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">Where Africa's next generation launches their career.</p>
            <div className="mt-5 flex items-center gap-3">
              {[
                { Icon: Linkedin, href: "https://www.linkedin.com/company/the-lucrebag", label: "LinkedIn" },
                { Icon: Instagram, href: "https://instagram.com", label: "Instagram" },
                { Icon: Globe, href: "https://lucrebag.com", label: "Website" },
              ].map(({ Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ scale: 1.12, y: -2 }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon className="h-4 w-4" />
                </motion.a>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Students</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-accent">Sign up free</Link></li>
              <li><Link to="/browse" className="hover:text-accent">Browse jobs</Link></li>
              <li><a href="#pillars" className="hover:text-accent">Resume review</a></li>
              <li><a href="#categories" className="hover:text-accent">Explore fields</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Employers</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-accent">Post a job</Link></li>
              <li><a href="#employers" className="hover:text-accent">Talent network</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#pillars" className="hover:text-accent">About</a></li>
              <li><Link to="/auth" className="hover:text-accent">Sign in</Link></li>
              <li><a href="https://lucrebag.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent">The Lucrebag</a></li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-7xl px-5 text-xs text-muted-foreground">&copy; {new Date().getFullYear()} CareerPilot. Made for Africa's next generation of professionals.</p>
      </footer>
    </div>
  );
}
