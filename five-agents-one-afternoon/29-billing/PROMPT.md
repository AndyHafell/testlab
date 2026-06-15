# Token Budget + Tiers + Access Gate (#29)

A patch-style build: one agent in its own worktree, one-shot brief against a
private production SaaS. Point this prompt at **your own** app.

The one-shot prompt:

```
My app calls paid AI providers (image gen, an LLM review pass, TTS voiceover,
thumbnails) on server-side keys, and I'm eating the cost. Add real usage metering
and a monthly budget so I can run a paid tier without getting wrecked:

- Meter every paid endpoint — charge a per-call cost in cents into a per-user
  monthly ledger. The charge must be leak-safe: if a provider call fails, don't
  bill it, and don't double-bill on retries.
- A budget-enforcement wrapper on those endpoints: when a user is over their cap,
  return 402 with an upgrade flag in the body. Admins are exempt.
- Tiers: free tier with a low cap, paid tier with a $100/mo cap.
- Drop the bring-your-own-key fallback — AI providers run on server keys only.
- Replace the 7-day trial with an allowlist gate: membership in my community
  (synced from Skool + Airtable) is what unlocks access. Add an admin endpoint to
  reconcile members from Airtable into the allowlist (additive by default — never
  silently revoke on a partial sync), and a webhook that flips a paying member to
  the paid tier.

Derive the new DB schema from PRAGMA so a fresh database migrates cleanly without
drift. Write tests for the budget enforcement, the metering, the membership
reconcile, and the access activation.
```

**What you get:** `billing.patch` — a `git diff` of **only** this feature against
the app's main branch: the metering + `require_budget` enforcement wrapper in
`app.py`, the `usage_budget.py` change, the allowlist/Skool-gate access logic, and
the full new test suite (`tests/test_budget_enforcement.py`,
`test_skool_membership.py`, plus updates to the email-activation / migration /
open-signup / skool-gate tests). Private SaaS → ships as a patch, not full source.

> Every email in the patch (`*@x.com`, `*@example.com`) is a test fixture — there
> are no real credentials or keys in here.
