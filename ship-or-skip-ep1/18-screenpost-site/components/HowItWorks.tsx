import { Link2, Eye, Send } from "lucide-react";

const STEPS = [
  {
    n: "01",
    Icon: Link2,
    title: "Connect",
    body: "Link your X account and let ScreenPost run quietly in the background while you work.",
  },
  {
    n: "02",
    Icon: Eye,
    title: "It watches & drafts",
    body: "Every hour it captures what you’re building and writes an insightful tweet in your voice.",
  },
  {
    n: "03",
    Icon: Send,
    title: "It posts",
    body: "Auto-publish on a schedule, or approve from your queue. Build-in-public, handled.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 border-y border-white/5 bg-white/[0.015] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Up and running in three steps
          </h2>
          <p className="mt-4 text-zinc-400">
            No new workflow to learn. Connect once, then forget it&rsquo;s there.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="reveal group relative rounded-2xl border border-white/10 bg-zinc-900/50 p-6 transition hover:border-amber-500/30 hover:bg-zinc-900/80"
            >
              <span className="font-mono text-sm text-zinc-600">{s.n}</span>
              <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <s.Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
