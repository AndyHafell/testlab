import { ipcMain } from "electron";
import { API_METHODS, type RendererApi } from "./contract";

/** Wires each RendererApi method onto ipcMain.handle under its own channel. */
export function registerIpc(api: RendererApi): void {
  for (const method of API_METHODS) {
    ipcMain.handle(method, (_event, ...args: unknown[]) =>
      (api[method] as (...a: unknown[]) => unknown)(...args),
    );
  }
}
