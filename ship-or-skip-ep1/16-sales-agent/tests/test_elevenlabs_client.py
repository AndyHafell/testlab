import elevenlabs_client as ec


def test_build_agent_config_nests_prompt_and_voice():
    cfg = ec.build_agent_config(
        name="Mira",
        system_prompt="You are Mira.",
        first_message="Hey!",
        voice_id="VOICE123",
        llm="gemini-2.5-flash",
    )
    assert cfg["name"] == "Mira"
    agent = cfg["conversation_config"]["agent"]
    assert agent["prompt"]["prompt"] == "You are Mira."
    assert agent["prompt"]["llm"] == "gemini-2.5-flash"
    assert agent["first_message"] == "Hey!"
    assert agent["language"] == "en"
    assert cfg["conversation_config"]["tts"]["voice_id"] == "VOICE123"


def test_create_agent_posts_and_returns_id(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"agent_id": "agent_abc"}

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResp()

    monkeypatch.setattr(ec.requests, "post", fake_post)
    agent_id = ec.create_agent("KEY", {"name": "Mira"})
    assert agent_id == "agent_abc"
    assert captured["url"] == "https://api.elevenlabs.io/v1/convai/agents/create"
    assert captured["headers"]["xi-api-key"] == "KEY"


def test_get_signed_url(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 200
        def raise_for_status(self): pass
        def json(self): return {"signed_url": "wss://signed"}

    def fake_get(url, headers, params, timeout):
        captured["url"] = url
        captured["params"] = params
        captured["headers"] = headers
        return FakeResp()

    monkeypatch.setattr(ec.requests, "get", fake_get)
    url = ec.get_signed_url("KEY", "agent_abc")
    assert url == "wss://signed"
    assert captured["params"] == {"agent_id": "agent_abc"}
    assert captured["headers"]["xi-api-key"] == "KEY"
