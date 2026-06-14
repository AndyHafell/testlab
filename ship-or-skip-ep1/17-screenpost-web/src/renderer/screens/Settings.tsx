import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { Settings as SettingsType, Platform, SignalKind } from "../../domain/types";
import { ALL_PLATFORMS } from "../../domain/types";

const SIGNALS: SignalKind[] = ["screenshot", "transcript", "gitFiles", "clipboard"];

export function Settings(): React.JSX.Element {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    void api.getSettings().then(setSettings);
    void api.secretStatus().then(setSecrets);
  }, []);

  if (!settings) return <div className="screen">Loading…</div>;

  async function save(): Promise<void> {
    if (settings) await api.setSettings(settings);
  }
  async function saveSecret(name: string): Promise<void> {
    const value = secretInputs[name];
    if (!value) return;
    await api.setSecret(name, value);
    setSecrets(await api.secretStatus());
    setSecretInputs({ ...secretInputs, [name]: "" });
  }

  return (
    <div className="screen">
      <div className="card">
        <label htmlFor="interval">Interval (minutes)</label>
        <input
          id="interval"
          type="number"
          value={settings.intervalMinutes}
          onChange={(e) => setSettings({ ...settings, intervalMinutes: Number(e.target.value) })}
        />

        <label htmlFor="cap">Daily cap</label>
        <input
          id="cap"
          type="number"
          value={settings.dailyCap}
          onChange={(e) => setSettings({ ...settings, dailyCap: Number(e.target.value) })}
        />

        <fieldset>
          <legend>Signals</legend>
          {SIGNALS.map((s) => (
            <label key={s}>
              <input
                type="checkbox"
                checked={settings.enabledSignals[s]}
                onChange={(e) => setSettings({ ...settings, enabledSignals: { ...settings.enabledSignals, [s]: e.target.checked } })}
              />
              {s}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Platforms</legend>
          {ALL_PLATFORMS.map((p: Platform) => (
            <label key={p}>
              <input
                type="checkbox"
                checked={settings.enabledPlatforms[p]}
                onChange={(e) => setSettings({ ...settings, enabledPlatforms: { ...settings.enabledPlatforms, [p]: e.target.checked } })}
              />
              {p}
            </label>
          ))}
        </fieldset>

        <label htmlFor="fbpage">Facebook page id</label>
        <input
          id="fbpage"
          type="text"
          value={settings.facebookPageId}
          onChange={(e) => setSettings({ ...settings, facebookPageId: e.target.value })}
        />

        <label htmlFor="persona">Persona</label>
        <textarea
          id="persona"
          value={settings.persona}
          onChange={(e) => setSettings({ ...settings, persona: e.target.value })}
        />

        <button className="primary" onClick={save}>Save settings</button>
      </div>

      <div className="card">
        <label>API keys</label>
        {["ANTHROPIC_API_KEY", "Blotato_API_KEY"].map((name) => (
          <div className="row" key={name}>
            <span>{name}: {secrets[name] ? "set ✓" : "not set"}</span>
            <input
              type="password"
              placeholder={`new ${name}`}
              value={secretInputs[name] ?? ""}
              onChange={(e) => setSecretInputs({ ...secretInputs, [name]: e.target.value })}
            />
            <button onClick={() => saveSecret(name)}>Save</button>
          </div>
        ))}
      </div>
    </div>
  );
}
