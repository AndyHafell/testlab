import {
  Radio,
  Sparkles,
  SlidersHorizontal,
  Check,
  ArrowDown,
} from "lucide-react";
import type { ReactNode } from "react";

/* ---------- per-feature visuals ---------- */

function AlwaysOnVisual() {
  const rows = [
    { time: "9:00", label: "Drafted + posted", active: false },
    { time: "10:00", label: "Drafted + posted", active: false },
    { time: "11:00", label: "Drafted + posted", active: false },
    { time: "12:00", label: "Capturing…", active: true },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-xl shadow-black/40">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">Today&rsquo;s captures</p>
        <span className="font-mono text-xs text-zinc-500">auto</span>
      </div>
      <div className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div
            key={r.time}
            className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5"
          >
            <span className="w-12 font-mono text-xs text-zinc-500">{r.time}</span>
            <span className="flex-1 text-sm text-zinc-300">{r.label}</span>
            {r.active ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
                now
              </span>
            ) : (
              <Check className="h-4 w-4 text-amber-400" strokeWidth={2.5} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TweetsVisual() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3.5 opacity-70">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600">
          Generic bot
        </p>
        <p className="mt-1 text-sm text-zinc-500 line-through decoration-zinc-700">
          Updated some files in my project today.
        </p>
      </div>
      <div className="flex justify-center">
        <ArrowDown className="h-4 w-4 text-amber-400" />
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-bold text-black">
            A
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-zinc-100">Andy Hafell</p>
            <p className="text-[11px] text-zinc-500">@andyhafell</p>
          </div>
          <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
            ScreenPost
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-200">
          Refactored the capture pipeline so ScreenPost only fires on meaningful
          diffs — 60% fewer noisy posts, way sharper signal. Small change, big
          quality jump.
        </p>
      </div>
    </div>
  );
}

function ControlVisual() {
  const drafts = [
    "Shipped a dark-mode pass on the dashboard — every chart now readable at 2am.",
    "Added keyboard shortcuts for the whole review queue. Tiny detail, huge feel.",
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-xl shadow-black/40">
      <div className="flex w-fit items-center gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
        <span className="rounded-md px-3 py-1 text-xs font-medium text-zinc-400">
          Autopilot
        </span>
        <span className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-black">
          Review
        </span>
      </div>
      <p className="mt-4 text-xs text-zinc-500">2 drafts waiting</p>
      <div className="mt-2 space-y-2.5">
        {drafts.map((d) => (
          <div
            key={d}
            className="rounded-lg border border-white/5 bg-black/20 p-3"
          >
            <p className="text-sm text-zinc-300">{d}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <button className="rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-black">
                Approve
              </button>
              <button className="rounded-md px-3 py-1 text-xs font-medium text-zinc-400 transition hover:text-white">
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- feature rows ---------- */

type Feature = {
  eyebrow: string;
  Icon: typeof Radio;
  title: string;
  body: string;
  bullets: string[];
  visual: ReactNode;
};

const FEATURES: Feature[] = [
  {
    eyebrow: "Zero effort",
    Icon: Radio,
    title: "Always on. Runs while you build.",
    body: "ScreenPost sits quietly in the background and captures the story of your work — so you never have to stop and write.",
    bullets: [
      "Hourly, automatic captures",
      "Nothing to remember or trigger",
      "Stays out of your way",
    ],
    visual: <AlwaysOnVisual />,
  },
  {
    eyebrow: "Actually good",
    Icon: Sparkles,
    title: "Insightful tweets, in your voice.",
    body: "Not “I changed a file.” ScreenPost understands what you shipped and why it matters, then writes a post that sounds like you.",
    bullets: [
      "Context-aware, never robotic",
      "Learns your tone over time",
      "Threads, one-liners, or screenshots",
    ],
    visual: <TweetsVisual />,
  },
  {
    eyebrow: "You're in control",
    Icon: SlidersHorizontal,
    title: "Autopilot — or approve every post.",
    body: "Let ScreenPost publish on a schedule, or hold everything in a review queue and ship with one tap. Your call, always.",
    bullets: [
      "Full autopilot or approval queue",
      "Edit before anything goes out",
      "Pause anytime",
    ],
    visual: <ControlVisual />,
  },
];

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:py-28">
      <div className="reveal mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Build in public, without the busywork
        </h2>
        <p className="mt-4 text-zinc-400">
          The work you&rsquo;re already doing becomes the content. ScreenPost
          handles the watching, writing, and posting.
        </p>
      </div>

      <div className="mt-16 space-y-20 sm:space-y-28">
        {FEATURES.map((f, i) => {
          const reverse = i % 2 === 1;
          return (
            <div
              key={f.title}
              className="reveal grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
            >
              <div className={reverse ? "lg:order-2" : ""}>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.07] px-3 py-1 text-xs font-medium text-amber-300">
                  <f.Icon className="h-3.5 w-3.5" />
                  {f.eyebrow}
                </span>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {f.title}
                </h3>
                <p className="mt-3 text-zinc-400">{f.body}</p>
                <ul className="mt-6 space-y-3">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-sm text-zinc-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={reverse ? "lg:order-1" : ""}>{f.visual}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
