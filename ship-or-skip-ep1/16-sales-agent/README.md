# AI Voice Sales Agent

A talkable web page where visitors have a real-time voice conversation with an
ElevenLabs Conversational-AI agent ("Mira") that sells AI Mate (Skool), plus a
conversion dashboard.

## Setup (local)

1. `python3 -m venv venv && source venv/bin/activate`
2. `pip install -r requirements.txt`
3. `cp .env.example .env`, then fill in:
   - `ELEVENLABS_API_KEY` — the same key the creatorgrowth app uses. It lives in
     that container's environment, not a file:
     `add your own ELEVENLABS_API_KEY`
   - `SKOOL_JOIN_URL` — the real Skool community trial link the CTA points to
   - `DASHBOARD_TOKEN` — any secret string
   - `ELEVENLABS_VOICE_ID` — Mira's voice (default = Sarah, a warm female stock voice). Swap any time and re-run `setup_agent.py`.
4. `python setup_agent.py` — provisions/creates the ElevenLabs agent, writes `ELEVENLABS_AGENT_ID` to `.env`
5. `python app.py` — open http://localhost:5057
6. Dashboard: http://localhost:5057/dashboard?token=YOUR_TOKEN

## Tests

`python -m pytest -v`

## Deploy (VPS, mirrors creatorgrowth)

scp the app to the VPS under `/opt/sales_agent/`, install requirements in a venv
there, set `.env`, run `setup_agent.py` once, and serve with gunicorn behind the
existing reverse proxy. Notes:

- **HTTPS is required** for microphone access in the browser.
- The reverse proxy must **preserve the `Host` header** (e.g. `proxy_set_header Host $host;`)
  so the same-origin guard on `/api/event` accepts the page's own events.
- `/api/event` and `/api/signed-url` are intentionally public (the visitor has no
  token). The same-origin guard + size caps stop casual abuse; for a high-traffic
  public link, add **rate limiting at the proxy** so the dashboard numbers stay
  trustworthy. Verified-signup attribution (vs. click) is the planned next step.
