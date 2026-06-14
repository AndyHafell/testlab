// Generated ScreenPost wordmark: a rounded "screen" glyph with an amber
// recording/signal dot, next to the text logo.

export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="26"
        height="26"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="3.5"
          y="6.5"
          width="22"
          height="15"
          rx="3.6"
          fill="#0f0f12"
          stroke="#52525b"
          strokeWidth="1.4"
        />
        <rect x="6.6" y="10" width="9" height="1.8" rx="0.9" fill="#f59e0b" />
        <rect x="6.6" y="13.6" width="13" height="1.8" rx="0.9" fill="#52525b" />
        <rect x="13" y="22.5" width="6" height="2.4" rx="1.2" fill="#3f3f46" />
        {/* amber signal dot, masked from the screen edge */}
        <circle cx="25.5" cy="7.5" r="4.6" fill="#09090b" />
        <circle cx="25.5" cy="7.5" r="3" fill="#f59e0b" />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-white">
        Screen<span className="text-amber-400">Post</span>
      </span>
    </span>
  );
}
