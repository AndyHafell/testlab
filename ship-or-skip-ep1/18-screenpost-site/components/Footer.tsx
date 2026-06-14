import Wordmark from "@/components/Wordmark";
import { XIcon, GithubIcon } from "@/components/icons";
import { GITHUB_URL, TWITTER_URL, NAV_LINKS } from "@/components/site";

export default function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Wordmark />
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              Your build, tweeted every hour. The always-on bot for shipping in
              public.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                <GithubIcon className="h-[18px] w-[18px]" />
              </a>
              <a
                href={TWITTER_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                <XIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="flex gap-16">
            <nav className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Product
              </p>
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm text-zinc-400 transition hover:text-white"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#waitlist"
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                Join waitlist
              </a>
            </nav>

            <nav className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Resources
              </p>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                GitHub repo
              </a>
              <a
                href={TWITTER_URL}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                @andyhafell
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-zinc-600 sm:flex-row">
          <p>© {new Date().getFullYear()} ScreenPost. All rights reserved.</p>
          <p>
            Built by{" "}
            <a
              href={TWITTER_URL}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 transition hover:text-white"
            >
              @andyhafell
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
