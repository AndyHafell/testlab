import { contextBridge, ipcRenderer } from "electron";
import { API_METHODS } from "../ipc/contract";

const api: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
for (const method of API_METHODS) {
  api[method] = (...args: unknown[]) => ipcRenderer.invoke(method, ...args);
}

contextBridge.exposeInMainWorld("api", api);

const ALLOWED_EVENTS = ["draft:new", "scheduler:tick", "publish:result"] as const;
contextBridge.exposeInMainWorld("appEvents", {
  on: (channel: string, cb: () => void) => {
    if ((ALLOWED_EVENTS as readonly string[]).includes(channel)) {
      ipcRenderer.on(channel, () => cb());
    }
  },
});
