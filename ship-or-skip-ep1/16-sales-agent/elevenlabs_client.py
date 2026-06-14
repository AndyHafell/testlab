import requests

API_BASE = "https://api.elevenlabs.io/v1/convai"
DEFAULT_TTS_MODEL = "eleven_turbo_v2"  # English ConvAI agents require turbo/flash v2 (not multilingual v2_5)


def build_agent_config(name, system_prompt, first_message, voice_id, llm,
                       tts_model=DEFAULT_TTS_MODEL):
    return {
        "name": name,
        "conversation_config": {
            "agent": {
                "prompt": {"prompt": system_prompt, "llm": llm, "temperature": 0.3},
                "first_message": first_message,
                "language": "en",
            },
            "tts": {"voice_id": voice_id, "model_id": tts_model},
        },
    }


def create_agent(api_key, config):
    resp = requests.post(
        f"{API_BASE}/agents/create",
        json=config,
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["agent_id"]


def get_signed_url(api_key, agent_id):
    resp = requests.get(
        f"{API_BASE}/conversation/get-signed-url",
        headers={"xi-api-key": api_key},
        params={"agent_id": agent_id},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["signed_url"]
