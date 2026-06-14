"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistForm({
  className = "",
  buttonLabel = "Join the waitlist",
  placeholder = "you@example.com",
  source = "hero",
}: {
  className?: string;
  buttonLabel?: string;
  placeholder?: string;
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
      setMessage("You're on the list — we'll be in touch.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 ${className}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-black">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-medium text-amber-100">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={`w-full ${className}`} noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder={placeholder}
          aria-label="Email address"
          className="h-12 w-full flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-amber-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-amber-500/20"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-semibold text-black shadow-[0_0_30px_-6px_rgba(245,158,11,0.6)] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            <>
              {buttonLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
      {status === "error" ? (
        <p className="mt-2 text-sm text-red-400">{message}</p>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">
          No spam. Just a heads-up when ScreenPost opens up.
        </p>
      )}
    </form>
  );
}
