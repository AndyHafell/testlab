export interface SecretStore {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  has(name: string): boolean;
  /** Presence-only map (never values) — safe to send to a UI. */
  status(): Record<string, boolean>;
}

export class InMemorySecretStore implements SecretStore {
  private readonly map = new Map<string, string>();

  get(name: string): string | undefined {
    return this.map.get(name);
  }
  set(name: string, value: string): void {
    this.map.set(name, value);
  }
  has(name: string): boolean {
    return this.map.has(name);
  }
  status(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const k of this.map.keys()) out[k] = true;
    return out;
  }
}
