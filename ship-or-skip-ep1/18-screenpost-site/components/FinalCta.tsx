import WaitlistForm from "@/components/WaitlistForm";
import { GithubIcon } from "@/components/icons";
import { GITHUB_URL } from "@/components/site";

export default function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
      <div className="reveal relative isolate overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.12] to-amber-500/[0.02] px-6 py-14 text-center sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-[600px] -translate-x-1/2 rounded-full bg-amber-500/20 blur-[110px]"
        />
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Start building in public, <span className="highlight">on autopilot</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-zinc-300">
          Join the waitlist and be first in line when ScreenPost opens up. No
          credit card, no commitment.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <WaitlistForm source="final" />
        </div>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <GithubIcon className="h-4 w-4" />
          Prefer to self-host? It&rsquo;s open source.
        </a>
      </div>
    </section>
  );
}
