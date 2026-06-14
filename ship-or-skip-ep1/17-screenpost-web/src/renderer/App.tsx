import React, { useEffect, useState } from "react";
import { api } from "./api";
import { Queue } from "./screens/Queue";
import { History } from "./screens/History";
import { Swipe } from "./screens/Swipe";
import { Clips } from "./screens/Clips";
import { Settings } from "./screens/Settings";
import type { SchedulerStatus } from "../ipc/contract";

type Tab = "queue" | "history" | "swipe" | "clips" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "queue", label: "Queue" },
  { id: "history", label: "History" },
  { id: "swipe", label: "Swipe File" },
  { id: "clips", label: "Clipboard" },
  { id: "settings", label: "Settings" },
];

export function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("queue");
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    window.appEvents.on("draft:new", () => setRefreshNonce((n) => n + 1));
    window.appEvents.on("scheduler:tick", () => setRefreshNonce((n) => n + 1));
    window.appEvents.on("publish:result", () => setRefreshNonce((n) => n + 1));
  }, []);

  useEffect(() => {
    void api.schedulerStatus().then(setStatus);
  }, [tab, refreshNonce]);

  return (
    <div className="app">
      <header>
        <strong>ScreenPost</strong>
        {status && <span className="status">next run in {status.minutesUntilNext}m · {status.postsToday}/{status.dailyCap} today</span>}
      </header>
      <nav>
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        <div key={`${tab}-${refreshNonce}`}>
          {tab === "queue" && <Queue />}
          {tab === "history" && <History />}
          {tab === "swipe" && <Swipe />}
          {tab === "clips" && <Clips />}
          {tab === "settings" && <Settings />}
        </div>
      </main>
    </div>
  );
}
