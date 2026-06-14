# ScreenPost — Landing Page

Marketing site for **ScreenPost**: an always-on bot that watches what you're
building and posts insightful tweets about it, automatically, every hour.

> Your build, tweeted every hour.

Built with **Next.js 16 (App Router) + Tailwind CSS v4**, in the clean dark
ShipFast style. Repo: https://github.com/andyhafell/screenpost

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build && npm run start   # production build
```

## Structure

```
app/
  layout.tsx            Fonts, SEO metadata, OG/Twitter cards
  page.tsx              Page composition
  globals.css           Design system: dark/amber theme, animations
  opengraph-image.tsx   Dynamic 1200×630 social card
  api/waitlist/route.ts Waitlist endpoint (validates email; storage stubbed)
components/
  Nav, Hero, ProductMockup, LogoCluster, Features, HowItWorks,
  Faq, FinalCta, Footer, WaitlistForm, Wordmark, RevealOnScroll, icons, site
```

## Waitlist

The form posts to `app/api/waitlist/route.ts`, which validates the email and
returns success. **Persistence is intentionally stubbed** so the site runs with
zero credentials — see the `TODO` in that file to wire up Resend, ConvertKit,
Supabase, or your provider of choice.

## Customizing

- **Headline / copy** — `components/Hero.tsx`, `components/FinalCta.tsx`
- **Brand color** — the amber accent uses Tailwind's `amber-400/500`; swap those
  classes (and the highlight color in `globals.css`) to re-skin.
- **Social-proof count** — `WAITLIST_COUNT` in `components/site.ts` (placeholder).
- **Links** — `GITHUB_URL` / `TWITTER_URL` in `components/site.ts`.

Design spec: `docs/superpowers/specs/2026-06-14-screenpost-landing-design.md`.
