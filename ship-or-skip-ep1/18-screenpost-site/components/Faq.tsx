import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "What exactly does ScreenPost watch?",
    a: "It captures your screen and dev activity on a schedule so it understands what you’re working on. You decide what’s in scope, and you can pause it any time.",
  },
  {
    q: "Does it post automatically?",
    a: "Your choice. Run it on full autopilot to publish hourly, or keep everything in a review queue and approve posts with one tap before they go out.",
  },
  {
    q: "Is my screen data private?",
    a: "Captures are used only to draft your posts. Nothing is published without matching your settings, and you stay in control of what ScreenPost can see.",
  },
  {
    q: "Which platforms does it support?",
    a: "ScreenPost posts to X (Twitter) to start, and runs on macOS today — with a web app and more integrations on the way.",
  },
  {
    q: "Will the tweets sound like a bot?",
    a: "No. ScreenPost writes contextual posts in your voice and learns your tone over time — closer to a ghostwriter who watched you work than an autoposter.",
  },
  {
    q: "Is it open source?",
    a: "Yes — the project lives on GitHub. Join the waitlist for the hosted version, or clone the repo and run it yourself.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20 sm:py-28">
      <div className="reveal text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Frequently asked questions
        </h2>
        <p className="mt-4 text-zinc-400">
          Everything else you might be wondering before you join.
        </p>
      </div>

      <div className="reveal mt-12 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
        {FAQS.map((item) => (
          <details key={item.q} className="group px-5 py-1.5 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-medium text-zinc-100 transition marker:hidden hover:text-white sm:text-base">
              {item.q}
              <Plus className="h-4 w-4 shrink-0 text-amber-400 transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <p className="pb-4 pr-8 text-sm leading-relaxed text-zinc-400">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
