import { Star } from "lucide-react";
import WaitlistForm from "@/components/WaitlistForm";
import ProductMockup from "@/components/ProductMockup";
import { GithubIcon } from "@/components/icons";
import { GITHUB_URL, WAITLIST_COUNT } from "@/components/site";

const AVATARS = [
  { initials: "JD", from: "from-rose-400", to: "to-pink-600" },
  { initials: "MK", from: "from-sky-400", to: "to-indigo-600" },
  { initials: "AL", from: "from-emerald-400", to: "to-teal-600" },
  { initials: "SR", from: "from-amber-400", to: "to-orange-600" },
  { initials: "TC", from: "from-violet-400", to: "to-purple-600" },
];

export default function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      {/* ambient amber glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 animate-pulse-glow rounded-full bg-amber-500/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-40 -z-10 h-[360px] w-[360px] rounded-full bg-orange-600/10 blur-[120px]"
      />

      <div className="mx-auto max-w-6xl px-5 pb-12 pt-16 sm:pt-24">
        {/* eyebrow */}
        <div className="reveal flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Always-on · build-in-public on autopilot
          </span>
        </div>

        {/* headline */}
        <h1 className="reveal mx-auto mt-6 max-w-4xl text-center text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
          Your build, tweeted <span className="highlight">every hour</span>
        </h1>

        <p className="reveal mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-zinc-400 sm:text-lg">
          ScreenPost is an always-on bot that watches what you&rsquo;re building
          and posts insightful tweets about it — automatically. No writing, no
          screenshots, no context-switching.
        </p>

        {/* primary CTA */}
        <div id="waitlist" className="reveal mx-auto mt-9 max-w-xl scroll-mt-24">
          <WaitlistForm source="hero" />
        </div>

        {/* secondary row */}
        <div className="reveal mt-7 flex flex-col items-center gap-5">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
          >
            <GithubIcon className="h-4 w-4" />
            View on GitHub
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <Star className="h-3.5 w-3.5" /> Star
            </span>
          </a>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {AVATARS.map((a) => (
                <span
                  key={a.initials}
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${a.from} ${a.to} text-[10px] font-semibold text-black ring-2 ring-ink`}
                >
                  {a.initials}
                </span>
              ))}
            </div>
            <p className="text-sm text-zinc-400">
              Join{" "}
              <span className="font-semibold text-zinc-200">
                {WAITLIST_COUNT} builders
              </span>{" "}
              shipping in public
            </p>
          </div>
        </div>

        {/* product mockup */}
        <div className="reveal mx-auto mt-14 max-w-3xl">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
