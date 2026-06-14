import Wordmark from "@/components/Wordmark";
import { GithubIcon } from "@/components/icons";
import { GITHUB_URL, NAV_LINKS } from "@/components/site";

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a
          href="#top"
          aria-label="ScreenPost home"
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
        >
          <Wordmark />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="ScreenPost on GitHub"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            <GithubIcon className="h-[18px] w-[18px]" />
          </a>
          <a
            href="#waitlist"
            className="inline-flex h-9 items-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black shadow-[0_0_24px_-8px_rgba(245,158,11,0.7)] transition hover:bg-amber-400"
          >
            Join waitlist
          </a>
        </div>
      </nav>
    </header>
  );
}
