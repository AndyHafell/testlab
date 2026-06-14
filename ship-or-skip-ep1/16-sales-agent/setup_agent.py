"""Provision (or re-provision) the ElevenLabs sales agent.

Reads the system prompt from prompts/agent_prompt.md, creates an agent via the
ElevenLabs API, and writes ELEVENLABS_AGENT_ID back into .env.

Usage: python setup_agent.py
"""
import os
import sys
from dotenv import load_dotenv

import elevenlabs_client as ec

load_dotenv()

PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompts", "agent_prompt.md")
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
FIRST_MESSAGE = ("Hey! I'm Mira — I help people figure out if AI Andy's community "
                 "is right for them. What are you working on, or hoping AI could "
                 "take off your plate?")


def _write_env_var(key, value):
    lines, found = [], False
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH) as f:
            for line in f:
                if line.startswith(key + "="):
                    lines.append(f"{key}={value}\n")
                    found = True
                else:
                    lines.append(line)
    if not found:
        lines.append(f"{key}={value}\n")
    with open(ENV_PATH, "w") as f:
        f.writelines(lines)


def main():
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.exit("ELEVENLABS_API_KEY not set. Copy it from the VPS /opt/idea_dashboard/.env into .env")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
    llm = os.environ.get("ELEVENLABS_LLM", "gemini-2.5-flash")

    with open(PROMPT_PATH) as f:
        system_prompt = f.read()

    config = ec.build_agent_config(
        name="Mira — AI Mate Sales",
        system_prompt=system_prompt,
        first_message=FIRST_MESSAGE,
        voice_id=voice_id,
        llm=llm,
    )
    agent_id = ec.create_agent(api_key, config)
    _write_env_var("ELEVENLABS_AGENT_ID", agent_id)
    print(f"Created agent {agent_id} and wrote ELEVENLABS_AGENT_ID to .env")


if __name__ == "__main__":
    main()
