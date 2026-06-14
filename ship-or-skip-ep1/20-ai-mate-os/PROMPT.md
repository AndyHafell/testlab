# AI Mate OS — Everything Dashboard (Ship or Skip #20)

The brainstorm-first prompt, as given to Claude Opus 4.8 — it asked clarifying questions, then built:

```
Build a standalone everything-dashboard for my business — pull every number (YouTube, community, website, socials) into hero tiles and animated time-series, dark and premium. Brainstorm the data sources first, then build.
```

**What you get:** a standalone premium dark dashboard (Flask) that pulls every business number — YouTube, community/MRR, Instagram, Facebook, GitHub stars, website visitors — into animated hero tiles, time-series charts, and a sortable per-video table. Pluggable source modules under `sources/`.

**Run it:**
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your own source API keys
python refresh.py      # pull every source → data/store.json
python app.py          # http://127.0.0.1:5055
```
> The live `data/store.json` (real numbers) is not included — `refresh.py` regenerates it from your own keys.
