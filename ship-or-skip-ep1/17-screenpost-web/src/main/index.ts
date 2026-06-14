import { app, BrowserWindow, Tray, Menu, Notification, clipboard, safeStorage, protocol } from "electron";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

import { Store } from "../store/store";
import { Scheduler } from "../schedule/scheduler";
import { TranscriptCollector } from "../collectors/transcript";
import { GitFilesCollector } from "../collectors/gitFiles";
import { ScreenshotCollector } from "../collectors/screenshot";
import { ClipboardCollector } from "../collectors/clipboard";
import { ClaudeGenerator, type Generator } from "../generate/generator";
import { BlotatoPublisher } from "../publish/publisher";
import { SafeStorageSecretStore } from "../adapters/safeStorageSecrets";
import { ElectronClipboardSource } from "../adapters/electronClipboard";
import { makeUploader } from "../adapters/imageUpload";
import { createOperations } from "../daemon/operations";
import { SchedulerDriver } from "../daemon/schedulerDriver";
import { createApi } from "../ipc/api";
import { registerIpc } from "../ipc/register";
import { parseEnv, parseFeedback } from "../migrate/migrate";

const DATA_DIR = join(homedir(), ".screenpost");

// Custom scheme so the renderer can display local screenshot files. Electron
// blocks file:// resources from an http(s)/app origin; `spfile://<abs-path>`
// is served by the handler below from the local filesystem.
protocol.registerSchemesAsPrivileged([
  { scheme: "spfile", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

let tray: Tray | null = null;
let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: { preload: join(__dirname, "../preload/index.mjs"), sandbox: false },
  });
  win.webContents.on("console-message", (_e, _level, message, line, sourceId) => {
    console.log(`[renderer] ${message} (${sourceId}:${line})`);
  });
  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.log(`[renderer] did-fail-load ${code} ${desc} ${url}`);
  });
  win.webContents.on("render-process-gone", (_e, details) => {
    console.log(`[renderer] render-process-gone ${JSON.stringify(details)}`);
  });
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else win.loadFile(join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  mkdirSync(DATA_DIR, { recursive: true });

  // Serve local image files to the renderer via the spfile:// scheme.
  protocol.handle("spfile", (request) => {
    const filePath = decodeURIComponent(new URL(request.url).pathname);
    try {
      return new Response(readFileSync(filePath), {
        headers: { "content-type": "image/png" },
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  });

  const store = new Store(join(DATA_DIR, "screenpost.db"));
  const secrets = new SafeStorageSecretStore(
    join(DATA_DIR, "secrets.json"),
    safeStorage as unknown as import("../adapters/safeStorageSecrets").SafeStorageLike,
  );

  // One-time migration from the legacy Python pipeline.
  const legacyDir = join(homedir(), "Documents", "Claude Folder", "pipeline");
  const migratedFlag = store.getMeta("migrated");
  if (!migratedFlag) {
    const envPath = join(legacyDir, ".env");
    if (existsSync(envPath)) {
      const parsed = parseEnv(readFileSync(envPath, "utf8"));
      if (parsed.secrets["Blotato_API_KEY"]) secrets.set("Blotato_API_KEY", parsed.secrets["Blotato_API_KEY"]);
      if (parsed.secrets["ANTHROPIC_API_KEY"]) secrets.set("ANTHROPIC_API_KEY", parsed.secrets["ANTHROPIC_API_KEY"]);
      store.setSettings({ blotatoAccountIds: parsed.accountIds });
    }
    const feedbackPath = join(legacyDir, "screenpost_feedback.json");
    if (existsSync(feedbackPath)) {
      const entries = parseFeedback(readFileSync(feedbackPath, "utf8"), (i) => randomUUID() + i);
      for (const e of entries) store.addSwipe(e);
    }
    store.setMeta("migrated", "1");
  }

  const settings = store.getSettings();

  // Generator
  let generator: Generator;
  const anthropicKey = secrets.get("ANTHROPIC_API_KEY") ?? process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    generator = new ClaudeGenerator(new Anthropic({ apiKey: anthropicKey }) as any);
  } else {
    generator = {
      generate: async (ctx) => ({
        interesting: false, x_thread: [], linkedin: "", threads: "",
        instagram: "", facebook: "", context: ctx.text.slice(0, 60), why: "no ANTHROPIC_API_KEY",
      }),
    };
  }

  // Publisher
  const publisher = new BlotatoPublisher({
    apiKey: secrets.get("Blotato_API_KEY") ?? "",
    accountIds: settings.blotatoAccountIds,
    facebookPageId: settings.facebookPageId || undefined,
    uploadImage: makeUploader(),
  });

  // Collectors
  const collectors = [
    new ScreenshotCollector(),
    new TranscriptCollector(join(homedir(), ".claude")),
    new GitFilesCollector(settings.watchedFolders),
    new ClipboardCollector(
      store,
      new ElectronClipboardSource(
        clipboard as unknown as import("../adapters/electronClipboard").ClipboardLike,
      ),
      () => new Date().toISOString(),
    ),
  ];

  const scheduler = new Scheduler(settings.intervalMinutes, settings.dailyCap);
  const ops = createOperations({ store, generator, publisher, scheduler, collectors });

  function notifyNewDraft(): void {
    if (Notification.isSupported()) {
      new Notification({ title: "ScreenPost", body: "A new draft is ready to review." }).show();
    }
    win?.webContents.send("draft:new");
  }

  const driver = new SchedulerDriver(store, scheduler, () => Date.now(), async () => {
    const draft = await ops.runPassNow();
    if (draft) notifyNewDraft();
    return draft;
  });

  const api = createApi({
    store,
    secrets,
    newId: () => randomUUID(),
    nowIso: () => new Date().toISOString(),
    runPassNow: async () => {
      const d = await ops.runPassNow();
      if (d) notifyNewDraft();
      return d;
    },
    regenerate: ops.regenerate,
    publishDraft: async (d) => { const r = await ops.publishDraft(d); win?.webContents.send("publish:result"); return r; },
    generateFromClip: ops.generateFromClip,
    scheduler: {
      status: () => driver.status(),
      pause: () => driver.pause(),
      resume: () => driver.resume(),
    },
  });
  registerIpc(api);

  // Hourly tick (checks "is it due?" each minute; the driver enforces the interval).
  setInterval(() => { void driver.tick().then(() => win?.webContents.send("scheduler:tick")); }, 60 * 1000);

  // Tray
  try {
    tray = new Tray(join(__dirname, "../renderer/trayTemplate.png"));
    tray.setToolTip("ScreenPost");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open", click: () => (win ? win.show() : createWindow()) },
        { label: "Generate now", click: () => void api.generateNow() },
        { label: "Pause", click: () => driver.pause() },
        { label: "Resume", click: () => driver.resume() },
        { type: "separator" },
        { label: "Quit", click: () => app.quit() },
      ]),
    );
  } catch (e) {
    console.error("tray init failed", e);
  }

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
