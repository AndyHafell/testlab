# Feedback Lab — Picture Mode (Ship or Skip #19)

The brainstorm-first prompt, as given to Claude Opus 4.8 — it asked clarifying questions, then built:

```
Add picture mode to my feedback tool: let it accept a screenshot/image and return vision-based feedback, not just text. Brainstorm the UX first, then build.
```

**What you get:** image/screenshot input added to an in-app Feedback Lab — upload a picture, a vision model reads it and returns written feedback, results render alongside the text flow.

**Built into a private production SaaS (CreatorGrowth).** Unlike the standalone builds, this one isn't shipped as full source — point the same prompt at your own app. (The full scrubbed patch is available on request; it's held back here because it spans several core subsystems of the app.)
