import type { RendererApi } from "../ipc/contract";

declare global {
  interface Window {
    api: RendererApi;
    appEvents: { on(channel: string, cb: () => void): void };
  }
}

// Lazy proxy: each method reads `window.api` at call time rather than capturing
// it at module-load time. This keeps production behaviour (preload sets
// window.api before any call) and lets tests stub window.api in beforeEach.
export const api: RendererApi = new Proxy({} as RendererApi, {
  get(_target, prop: string) {
    return (...args: unknown[]) =>
      (window.api as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](...args);
  },
});
