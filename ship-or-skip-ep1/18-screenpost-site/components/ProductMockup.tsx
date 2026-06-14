import { Sparkles, Heart, Repeat2, MessageCircle, BarChart3 } from "lucide-react";
import { XIcon } from "@/components/icons";

// The hero centerpiece: a stylized ScreenPost window showing a screen capture
// being turned into a generated, ready-to-post tweet. Pure markup — no image.
export default function ProductMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-2xl shadow-black/60 backdrop-blur">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-zinc-500">
          screenpost — live
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          watching
        </span>
      </div>

      {/* body */}
      <div className="space-y-4 p-4 sm:p-5">
        {/* capture row */}
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 p-3">
          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0f] p-2">
            <div className="space-y-1.5">
              <div className="h-1.5 w-10 rounded bg-amber-500/60" />
              <div className="h-1.5 w-14 rounded bg-zinc-700" />
              <div className="h-1.5 w-8 rounded bg-zinc-700" />
              <div className="h-1.5 w-12 rounded bg-zinc-700" />
            </div>
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">Captured your screen</p>
            <p className="truncate text-sm font-medium text-zinc-200">
              Wiring up the waitlist API route…
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
              2:00 PM · route.ts
            </p>
          </div>
        </div>

        {/* generated divider */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500">
          <span className="h-px flex-1 bg-white/5" />
          <span className="inline-flex items-center gap-1.5 text-amber-400/90">
            <Sparkles className="h-3.5 w-3.5" />
            ScreenPost wrote a tweet
          </span>
          <span className="h-px flex-1 bg-white/5" />
        </div>

        {/* tweet card */}
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-bold text-black">
              A
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-zinc-100">Andy Hafell</p>
              <p className="text-xs text-zinc-500">@andyhafell</p>
            </div>
            <XIcon className="ml-auto h-4 w-4 text-zinc-600" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            Spent the morning standing up the ScreenPost waitlist — clean little
            API route, amber everything. Building in public, one commit at a
            time. 🚀
          </p>
          <div className="mt-4 flex items-center gap-6 text-zinc-600">
            <span className="flex items-center gap-1.5 text-xs">
              <MessageCircle className="h-3.5 w-3.5" /> 12
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <Repeat2 className="h-4 w-4" /> 38
            </span>
            <span className="flex items-center gap-1.5 text-xs text-amber-400/80">
              <Heart className="h-3.5 w-3.5 fill-current" /> 214
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> 9.1K
            </span>
          </div>
        </div>

        {/* status bar */}
        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-medium text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Auto-posting in 00:42
          </span>
          <div className="flex items-center gap-2">
            <button className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:text-white">
              Edit
            </button>
            <button className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-black">
              Post now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
