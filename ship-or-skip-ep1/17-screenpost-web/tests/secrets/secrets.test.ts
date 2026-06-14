import { describe, it, expect } from "vitest";
import { InMemorySecretStore } from "../../src/secrets/secrets";

describe("InMemorySecretStore", () => {
  it("stores and retrieves a secret and reports presence without leaking it", () => {
    const s = new InMemorySecretStore();
    expect(s.has("ANTHROPIC_API_KEY")).toBe(false);
    s.set("ANTHROPIC_API_KEY", "sk-test");
    expect(s.get("ANTHROPIC_API_KEY")).toBe("sk-test");
    expect(s.has("ANTHROPIC_API_KEY")).toBe(true);
    expect(s.status()).toEqual({ ANTHROPIC_API_KEY: true });
  });
});
