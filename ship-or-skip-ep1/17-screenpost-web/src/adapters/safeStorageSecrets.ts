import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SecretStore } from "../secrets/secrets";

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(encrypted: Buffer): string;
}

interface Entry {
  enc: boolean;
  value: string; // base64 ciphertext when enc, plaintext otherwise
}

/** SecretStore persisting to a JSON file, encrypting with Electron safeStorage when available. */
export class SafeStorageSecretStore implements SecretStore {
  private data: Record<string, Entry> = {};

  constructor(
    private readonly file: string,
    private readonly safe: SafeStorageLike,
  ) {
    if (existsSync(file)) {
      this.data = JSON.parse(readFileSync(file, "utf8"));
    }
  }

  get(name: string): string | undefined {
    const e = this.data[name];
    if (!e) return undefined;
    if (!e.enc) return e.value;
    return this.safe.decryptString(Buffer.from(e.value, "base64"));
  }

  set(name: string, value: string): void {
    if (this.safe.isEncryptionAvailable()) {
      this.data[name] = { enc: true, value: this.safe.encryptString(value).toString("base64") };
    } else {
      this.data[name] = { enc: false, value };
    }
    this.persist();
  }

  has(name: string): boolean {
    return name in this.data;
  }

  status(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const k of Object.keys(this.data)) out[k] = true;
    return out;
  }

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.data));
  }
}
