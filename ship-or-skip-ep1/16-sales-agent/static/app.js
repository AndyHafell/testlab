// Pinned to major v1 (latest 1.11.1 as of 2026-06) to avoid a breaking major bump in prod.
import { Conversation } from "https://esm.sh/@elevenlabs/client@1";

const sessionId = (crypto.randomUUID && crypto.randomUUID()) ||
  String(Date.now()) + Math.random().toString(16).slice(2);

const micBtn = document.getElementById("mic");
const statusEl = document.getElementById("status");
const transcript = document.getElementById("transcript");
const emptyEl = document.getElementById("empty");
const cta = document.getElementById("cta");

let conversation = null;
let chatStartLogged = false;

function setStatus(text, live) {
  statusEl.textContent = text;
  statusEl.classList.toggle("live", !!live);
}

function postEvent(type) {
  const body = JSON.stringify({ type, session_id: sessionId });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon("/api/event", blob)) throw new Error("beacon failed");
  } catch (e) {
    fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  }
}

function addBubble(text, who) {
  if (emptyEl) emptyEl.remove();
  const div = document.createElement("div");
  div.className = "bubble " + (who === "user" ? "user" : "ai");
  div.textContent = text;
  transcript.appendChild(div);
  transcript.scrollTop = transcript.scrollHeight;
}

async function startConversation() {
  setStatus("Connecting…");
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    setStatus("Microphone permission needed");
    return;
  }
  const resp = await fetch("/api/signed-url");
  if (!resp.ok) { setStatus("Voice agent unavailable"); return; }
  const { signedUrl } = await resp.json();

  conversation = await Conversation.startSession({
    signedUrl,
    onConnect: () => {
      micBtn.classList.add("live");
      setStatus("Listening…", true);
      if (!chatStartLogged) { postEvent("chat_start"); chatStartLogged = true; }
    },
    onDisconnect: () => {
      micBtn.classList.remove("live");
      setStatus("Tap the mic to talk again");
      conversation = null;
    },
    onModeChange: ({ mode }) => {
      setStatus(mode === "speaking" ? "Mira is speaking…" : "Listening…", true);
    },
    onMessage: ({ message, source }) => {
      if (message) addBubble(message, source === "user" ? "user" : "ai");
    },
    onError: (err) => {
      console.error(err);
      setStatus("Something went wrong — tap to retry");
    },
  });
}

async function stopConversation() {
  if (conversation) { await conversation.endSession(); conversation = null; }
  micBtn.classList.remove("live");
  setStatus("Tap the mic to talk");
}

micBtn.addEventListener("click", () => {
  if (conversation) stopConversation(); else startConversation();
});

cta.addEventListener("click", () => { postEvent("conversion"); });
