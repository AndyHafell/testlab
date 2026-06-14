# AI Voice Sales Agent (Ship or Skip #16)

The brainstorm-first prompt, as given to Claude Opus 4.8 — it asked clarifying questions, then built:

```
Build an AI voice sales agent: a talkable web page where visitors have a real-time voice conversation (ElevenLabs) with an agent that pitches and sells my products, plus a live dashboard of chats, conversions, and conversion rate. Brainstorm the spec with me first, then build.
```

**What you get:** a Flask app + an ElevenLabs Conversational-AI agent ("Mira") that sells a product over a real voice call on a web page, with a live conversion dashboard (chats, conversions, rate). SQLite-backed, tests included.

**Run it:**
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your own ELEVENLABS_API_KEY
python app.py
```
