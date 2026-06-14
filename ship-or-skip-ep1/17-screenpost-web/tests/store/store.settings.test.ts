import { describe, it, expect } from "vitest";
import { Store } from "../../src/store/store";
import { DEFAULT_SETTINGS } from "../../src/domain/types";

describe("Store settings", () => {
  it("returns defaults when nothing is saved", () => {
    const s = new Store(":memory:");
    expect(s.getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("merges a patch over the defaults and persists it", () => {
    const s = new Store(":memory:");
    s.setSettings({ intervalMinutes: 30, dailyCap: 10 });
    const got = s.getSettings();
    expect(got.intervalMinutes).toBe(30);
    expect(got.dailyCap).toBe(10);
    expect(got.persona).toBe(DEFAULT_SETTINGS.persona);
  });

  it("deep-merges nested objects so a partial persisted blob keeps default keys", () => {
    const s = new Store(":memory:");
    // Persist a settings blob whose nested object omits some keys.
    s.setMeta("settings", JSON.stringify({ enabledSignals: { screenshot: false } }));
    const got = s.getSettings();
    expect(got.enabledSignals.screenshot).toBe(false); // the stored override wins
    expect(got.enabledSignals.transcript).toBe(true); // default key is preserved
    expect(got.enabledSignals.gitFiles).toBe(true);
    expect(got.enabledPlatforms.twitter).toBe(true); // untouched nested default intact
  });
});
