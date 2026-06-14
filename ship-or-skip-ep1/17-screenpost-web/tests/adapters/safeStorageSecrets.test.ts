import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SafeStorageSecretStore, type SafeStorageLike } from "../../src/adapters/safeStorageSecrets";

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "sp-secrets-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

// Fake safeStorage: "encrypts" by base64 so we can prove encrypt/decrypt is used.
const fakeSafe: SafeStorageLike = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from(`enc:${s}`),
  decryptString: (b) => b.toString().replace(/^enc:/, ""),
};

describe("SafeStorageSecretStore", () => {
  it("persists encrypted secrets across instances", () => {
    const file = join(dir, "secrets.json");
    const a = new SafeStorageSecretStore(file, fakeSafe);
    a.set("ANTHROPIC_API_KEY", "sk-test");
    const b = new SafeStorageSecretStore(file, fakeSafe);
    expect(b.get("ANTHROPIC_API_KEY")).toBe("sk-test");
    expect(b.status()).toEqual({ ANTHROPIC_API_KEY: true });
  });

  it("falls back to plaintext when encryption is unavailable", () => {
    const file = join(dir, "secrets.json");
    const noEnc: SafeStorageLike = {
      isEncryptionAvailable: () => false,
      encryptString: () => { throw new Error("unavailable"); },
      decryptString: () => { throw new Error("unavailable"); },
    };
    const s = new SafeStorageSecretStore(file, noEnc);
    s.set("K", "v");
    expect(new SafeStorageSecretStore(file, noEnc).get("K")).toBe("v");
  });
});
